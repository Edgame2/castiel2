/**
 * Feature Flag Service
 * 
 * Business logic for managing and evaluating feature flags.
 * Supports global and tenant-specific flags with environment, role, and percentage-based rollouts.
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { FeatureFlagRepository } from '../repositories/feature-flag.repository.js';
import {
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  FeatureFlagEvaluationContext,
} from '../types/feature-flag.types.js';

/**
 * Feature Flag Service
 */
export class FeatureFlagService {
  private repository: FeatureFlagRepository;
  private monitoring: IMonitoringProvider;
  private cache: Map<string, { flag: FeatureFlag | null; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private emergencyToggleEnabled: boolean = false; // Emergency kill switch - disables all flags
  private emergencyToggleReason?: string;
  private emergencyToggleActivatedBy?: string;
  private emergencyToggleActivatedAt?: Date;

  constructor(repository: FeatureFlagRepository, monitoring: IMonitoringProvider) {
    this.repository = repository;
    this.monitoring = monitoring;
    
    // Check for emergency toggle environment variable on startup
    if (process.env.FEATURE_FLAGS_EMERGENCY_DISABLE === 'true') {
      this.emergencyToggleEnabled = true;
      this.emergencyToggleReason = 'Emergency toggle enabled via environment variable';
      this.monitoring.trackEvent('feature-flag-emergency-toggle-enabled', {
        reason: this.emergencyToggleReason,
        source: 'environment-variable',
      });
    }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.repository.initialize();
  }

  /**
   * Get current environment from NODE_ENV
   */
  private getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Calculate user rollout percentage (consistent hash)
   */
  private getUserRolloutPercentage(userId?: string): number {
    if (!userId) return 0;
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 100);
  }

  /**
   * Evaluate if a feature flag is enabled for the given context
   */
  async isEnabled(
    flagName: string,
    context?: FeatureFlagEvaluationContext
  ): Promise<boolean> {
    try {
      // Emergency toggle: If enabled, all flags return false (fail closed)
      if (this.emergencyToggleEnabled) {
        this.monitoring.trackEvent('feature-flag-emergency-toggle-hit', {
          flagName,
          tenantId: context?.tenantId,
          reason: this.emergencyToggleReason,
        });
        return false;
      }
      
      const flag = await this.getFlag(flagName, context?.tenantId);
      
      if (!flag) {
        // Flag doesn't exist - default to false
        return false;
      }

      // Check if globally disabled
      if (!flag.enabled) {
        return false;
      }

      // Check environment restrictions
      const currentEnv = context?.environment || this.getCurrentEnvironment();
      if (flag.environments && flag.environments.length > 0) {
        if (!flag.environments.includes(currentEnv)) {
          return false;
        }
      }

      // Check role restrictions
      if (flag.roles && flag.roles.length > 0 && context?.userRole) {
        if (!flag.roles.includes(context.userRole)) {
          return false;
        }
      }

      // Check percentage rollout
      if (flag.percentage !== undefined && context?.userId) {
        const userPercentage = this.getUserRolloutPercentage(context.userId);
        const isEnabled = userPercentage < flag.percentage;
        
        // Track rollout metrics for monitoring
        this.monitoring.trackMetric('feature-flag.rollout-check', isEnabled ? 1 : 0, {
          flagName,
          percentage: flag.percentage,
          userPercentage,
          tenantId: context?.tenantId,
        });
        
        if (!isEnabled) {
          return false;
        }
      }

      // Track successful feature flag evaluation
      this.monitoring.trackEvent('feature-flag-enabled', {
        flagName,
        tenantId: context?.tenantId,
        environment: context?.environment || this.getCurrentEnvironment(),
        userRole: context?.userRole,
      });

      return true;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'isEnabled',
        flagName,
        tenantId: context?.tenantId,
      });
      // On error, default to false (fail closed)
      return false;
    }
  }

  /**
   * Get a feature flag by name (with tenant override support)
   */
  async getFlag(name: string, tenantId?: string | null): Promise<FeatureFlag | null> {
    const cacheKey = `${name}:${tenantId || 'global'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.flag;
    }

    try {
      const flag = await this.repository.getByName(name, tenantId ?? undefined);
      
      // Cache the result
      this.cache.set(cacheKey, {
        flag,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return flag;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'getFlag',
        name,
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * List all feature flags for a tenant
   */
  async list(tenantId?: string | null): Promise<FeatureFlag[]> {
    try {
      return await this.repository.list(tenantId ?? null);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'list',
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * Create a feature flag
   */
  async create(input: CreateFeatureFlagInput, userId: string): Promise<FeatureFlag> {
    try {
      // Check if flag already exists
      const existing = await this.repository.getByName(input.name, input.tenantId);
      if (existing) {
        throw new Error(`Feature flag "${input.name}" already exists`);
      }

      const flag = await this.repository.create(input, userId);
      
      // Invalidate cache
      this.invalidateCache(input.name, input.tenantId ?? undefined);

      this.monitoring.trackEvent('feature-flag-created', {
        name: input.name,
        tenantId: input.tenantId || 'global',
        enabled: input.enabled,
      });

      return flag;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'create',
        name: input.name,
        tenantId: input.tenantId,
      });
      throw error;
    }
  }

  /**
   * Update a feature flag
   */
  async update(
    id: string,
    tenantId: string | null,
    input: UpdateFeatureFlagInput,
    userId: string
  ): Promise<FeatureFlag> {
    try {
      const flag = await this.repository.update(id, tenantId ?? null, input, userId);
      
      if (!flag) {
        throw new Error(`Feature flag not found: ${id}`);
      }

      // Invalidate cache
      this.invalidateCache(flag.name, tenantId ?? undefined);

      this.monitoring.trackEvent('feature-flag-updated', {
        id,
        name: flag.name,
        tenantId: tenantId || 'global',
      });

      return flag;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'update',
        id,
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * Delete a feature flag
   */
  async delete(id: string, tenantId: string | null): Promise<boolean> {
    try {
      // Get flag name before deleting for cache invalidation
      const flag = await this.repository.getById(id, tenantId ?? null);
      
      const deleted = await this.repository.delete(id, tenantId ?? null);
      
      if (deleted && flag) {
        // Invalidate cache
        this.invalidateCache(flag.name, tenantId);
      }

      return deleted;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'delete',
        id,
        tenantId: tenantId ?? 'global',
      });
      throw error;
    }
  }

  /**
   * Invalidate cache for a feature flag
   */
  private invalidateCache(name: string, tenantId?: string | null): void {
    const cacheKey = `${name}:${tenantId || 'global'}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

