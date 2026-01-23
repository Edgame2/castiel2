/**
 * Feature Flag Service
 *
 * Business logic for managing and evaluating feature flags.
 * Supports global and tenant-specific flags with environment, role, and percentage-based rollouts.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { FeatureFlagRepository } from '../repositories/feature-flag.repository.js';
import { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput, FeatureFlagEvaluationContext } from '../types/feature-flag.types.js';
/**
 * Feature Flag Service
 */
export declare class FeatureFlagService {
    private repository;
    private monitoring;
    private cache;
    private readonly CACHE_TTL_MS;
    constructor(repository: FeatureFlagRepository, monitoring: IMonitoringProvider);
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;
    /**
     * Get current environment from NODE_ENV
     */
    private getCurrentEnvironment;
    /**
     * Calculate user rollout percentage (consistent hash)
     */
    private getUserRolloutPercentage;
    /**
     * Evaluate if a feature flag is enabled for the given context
     */
    isEnabled(flagName: string, context?: FeatureFlagEvaluationContext): Promise<boolean>;
    /**
     * Get a feature flag by name (with tenant override support)
     */
    getFlag(name: string, tenantId?: string | null): Promise<FeatureFlag | null>;
    /**
     * List all feature flags for a tenant
     */
    list(tenantId?: string | null): Promise<FeatureFlag[]>;
    /**
     * Create a feature flag
     */
    create(input: CreateFeatureFlagInput, userId: string): Promise<FeatureFlag>;
    /**
     * Update a feature flag
     */
    update(id: string, tenantId: string | null, input: UpdateFeatureFlagInput, userId: string): Promise<FeatureFlag>;
    /**
     * Delete a feature flag
     */
    delete(id: string, tenantId: string | null): Promise<boolean>;
    /**
     * Invalidate cache for a feature flag
     */
    private invalidateCache;
    /**
     * Clear all cache
     */
    clearCache(): void;
}
//# sourceMappingURL=feature-flag.service.d.ts.map