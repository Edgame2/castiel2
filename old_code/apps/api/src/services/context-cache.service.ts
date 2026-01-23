/**
 * Phase 5.2: Context Cache Service
 * 
 * Centralized service for context caching with comprehensive invalidation,
 * metrics tracking, cache warming, versioning, and intelligent caching decisions.
 * 
 * Handles:
 * - Global context caching (query-based)
 * - Template context caching (shard + template)
 * - Conversation context caching
 * - Cache invalidation strategies (time-based, event-based, dependency tracking)
 * - Cache metrics (hit/miss rates, staleness, performance)
 * - Cache warming (pre-compute, background assembly)
 * - Cache versioning (schema versions, invalidate on changes)
 * - Intelligent caching (frequently accessed, dynamic TTL, prioritize high-value)
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import crypto from 'crypto';

// Cache key prefixes
const CACHE_PREFIX_GLOBAL_CONTEXT = 'global-context:';
const CACHE_PREFIX_TEMPLATE_CONTEXT = 'context:';
const CACHE_PREFIX_CONVERSATION_CONTEXT = 'conversation:';

// Default TTLs (in seconds)
const DEFAULT_GLOBAL_CONTEXT_TTL = 300; // 5 minutes
const DEFAULT_TEMPLATE_CONTEXT_TTL = 600; // 10 minutes
const DEFAULT_CONVERSATION_CONTEXT_TTL = 1800; // 30 minutes

// Staleness thresholds (in milliseconds)
const CONTEXT_STALE_THRESHOLD_MS = 180000; // 3 minutes
const CONTEXT_CRITICAL_STALE_THRESHOLD_MS = 600000; // 10 minutes

// Cache version
const CACHE_VERSION = 1;

export interface ContextCacheEntry<T> {
  data: T;
  metadata: {
    cachedAt: string;
    version: number;
    ttl: number;
    accessCount: number;
    lastAccessed: string;
    tenantId: string;
    contextType: 'global' | 'template' | 'conversation';
    [key: string]: any; // Additional metadata
  };
}

export interface ContextCacheMetrics {
  hits: number;
  misses: number;
  staleHits: number;
  criticalStaleHits: number;
  invalidations: number;
  warmingHits: number;
  errors: number;
  hitRate: number; // Percentage
  averageAgeMs: number; // Average age of cache hits
  totalSize: number; // Estimated total cache size in bytes
}

export interface CacheInvalidationRule {
  type: 'time-based' | 'event-based' | 'dependency' | 'manual';
  pattern?: string; // Key pattern to match
  tenantId?: string;
  shardId?: string;
  projectId?: string;
  conversationId?: string;
  ttl?: number; // Override TTL
  invalidateOn?: string[]; // Event types that trigger invalidation
  dependencies?: string[]; // Dependent cache keys
}

export interface CacheWarmingRequest {
  tenantId: string;
  contextType: 'global' | 'template' | 'conversation';
  queries?: string[]; // For global context
  shardIds?: string[]; // For template context
  templateIds?: string[]; // For template context
  conversationIds?: string[]; // For conversation context
  priority?: number; // 1-10, higher = more important
}

export interface IntelligentCachingDecision {
  shouldCache: boolean;
  ttl: number;
  priority: number; // 1-10, higher = more important
  reason: string;
}

/**
 * Context Cache Service
 */
export class ContextCacheService {
  private metrics: ContextCacheMetrics = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    criticalStaleHits: 0,
    invalidations: 0,
    warmingHits: 0,
    errors: 0,
    hitRate: 0,
    averageAgeMs: 0,
    totalSize: 0,
  };

  private accessPatterns: Map<string, {
    accessCount: number;
    lastAccessed: Date;
    firstAccessed: Date;
    averageInterval: number;
  }> = new Map();

  private invalidationRules: Map<string, CacheInvalidationRule[]> = new Map();

  constructor(
    private redis: Redis,
    private monitoring: IMonitoringProvider
  ) {}

  // ============================================
  // Global Context Caching
  // ============================================

  /**
   * Get cached global context
   */
  async getGlobalContext<T>(
    tenantId: string,
    query: string
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    const cacheKey = this.getGlobalContextKey(tenantId, query);
    return this.getCachedContext<T>(cacheKey, 'global');
  }

  /**
   * Set cached global context
   */
  async setGlobalContext<T>(
    tenantId: string,
    query: string,
    data: T,
    ttl: number = DEFAULT_GLOBAL_CONTEXT_TTL,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cacheKey = this.getGlobalContextKey(tenantId, query);
    await this.setCachedContext(cacheKey, data, ttl, {
      tenantId,
      contextType: 'global',
      query: query.substring(0, 200),
      ...metadata,
    });
  }

  /**
   * Invalidate global context cache
   */
  async invalidateGlobalContext(
    tenantId: string,
    query?: string
  ): Promise<number> {
    if (query) {
      const cacheKey = this.getGlobalContextKey(tenantId, query);
      return this.invalidateCache(cacheKey);
    } else {
      // Invalidate all global context for tenant
      const pattern = `${CACHE_PREFIX_GLOBAL_CONTEXT}${tenantId}:*`;
      return this.invalidatePattern(pattern);
    }
  }

  // ============================================
  // Template Context Caching
  // ============================================

  /**
   * Get cached template context
   */
  async getTemplateContext<T>(
    tenantId: string,
    shardId: string,
    templateId: string
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    const cacheKey = this.getTemplateContextKey(tenantId, shardId, templateId);
    return this.getCachedContext<T>(cacheKey, 'template');
  }

  /**
   * Set cached template context
   */
  async setTemplateContext<T>(
    tenantId: string,
    shardId: string,
    templateId: string,
    data: T,
    ttl: number = DEFAULT_TEMPLATE_CONTEXT_TTL,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cacheKey = this.getTemplateContextKey(tenantId, shardId, templateId);
    await this.setCachedContext(cacheKey, data, ttl, {
      tenantId,
      shardId,
      templateId,
      contextType: 'template',
      ...metadata,
    });
  }

  /**
   * Invalidate template context cache
   */
  async invalidateTemplateContext(
    tenantId: string,
    shardId: string,
    templateId?: string
  ): Promise<number> {
    if (templateId) {
      const cacheKey = this.getTemplateContextKey(tenantId, shardId, templateId);
      return this.invalidateCache(cacheKey);
    } else {
      // Invalidate all templates for shard
      const pattern = `${CACHE_PREFIX_TEMPLATE_CONTEXT}${tenantId}:${shardId}:*`;
      return this.invalidatePattern(pattern);
    }
  }

  // ============================================
  // Conversation Context Caching
  // ============================================

  /**
   * Get cached conversation context
   */
  async getConversationContext<T>(
    tenantId: string,
    conversationId: string
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    const cacheKey = this.getConversationContextKey(tenantId, conversationId);
    return this.getCachedContext<T>(cacheKey, 'conversation');
  }

  /**
   * Set cached conversation context
   */
  async setConversationContext<T>(
    tenantId: string,
    conversationId: string,
    data: T,
    ttl: number = DEFAULT_CONVERSATION_CONTEXT_TTL,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cacheKey = this.getConversationContextKey(tenantId, conversationId);
    await this.setCachedContext(cacheKey, data, ttl, {
      tenantId,
      conversationId,
      contextType: 'conversation',
      ...metadata,
    });
  }

  /**
   * Invalidate conversation context cache
   */
  async invalidateConversationContext(
    tenantId: string,
    conversationId: string
  ): Promise<number> {
    const cacheKey = this.getConversationContextKey(tenantId, conversationId);
    return this.invalidateCache(cacheKey);
  }

  // ============================================
  // Core Cache Operations
  // ============================================

  /**
   * Get cached context with staleness detection
   */
  private async getCachedContext<T>(
    cacheKey: string,
    contextType: 'global' | 'template' | 'conversation'
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) {
        this.recordMiss(cacheKey);
        return null;
      }

      // Parse cache entry
      let entry: ContextCacheEntry<T>;
      try {
        entry = JSON.parse(cached);
      } catch (parseError) {
        // Old format - try to parse as direct data
        try {
          const oldData = JSON.parse(cached);
          if (Array.isArray(oldData) || typeof oldData === 'object') {
            // Legacy format - wrap in new format
            entry = {
              data: oldData as T,
              metadata: {
                cachedAt: new Date().toISOString(),
                version: 0, // Legacy version
                ttl: DEFAULT_GLOBAL_CONTEXT_TTL,
                accessCount: 0,
                lastAccessed: new Date().toISOString(),
                tenantId: '',
                contextType,
              },
            };
          } else {
            this.recordError(cacheKey, 'parse-error');
            return null;
          }
        } catch {
          this.recordError(cacheKey, 'parse-error');
          return null;
        }
      }

      // Check version compatibility
      if (entry.metadata.version !== CACHE_VERSION) {
        // Version mismatch - invalidate and return null
        await this.invalidateCache(cacheKey);
        this.monitoring.trackEvent('context-cache.version-mismatch', {
          cacheKey,
          cachedVersion: entry.metadata.version,
          currentVersion: CACHE_VERSION,
        });
        return null;
      }

      // Calculate age and staleness
      const cachedAt = new Date(entry.metadata.cachedAt);
      const ageMs = Date.now() - cachedAt.getTime();
      const isStale = ageMs > CONTEXT_STALE_THRESHOLD_MS;
      const isCriticallyStale = ageMs > CONTEXT_CRITICAL_STALE_THRESHOLD_MS;

      // Update access tracking
      entry.metadata.accessCount = (entry.metadata.accessCount || 0) + 1;
      entry.metadata.lastAccessed = new Date().toISOString();

      // Record metrics
      this.recordHit(cacheKey, ageMs, isStale, isCriticallyStale);

      // Update access pattern
      this.updateAccessPattern(cacheKey);

      // Save updated metadata (non-blocking)
      this.updateCacheMetadata(cacheKey, entry.metadata).catch((err) => {
        // Non-blocking - log but don't fail
        this.monitoring.trackException(err as Error, {
          operation: 'context-cache.update-metadata',
          cacheKey,
        });
      });

      // Return data with staleness info
      return {
        data: entry.data,
        isStale,
        isCriticallyStale,
        ageMs,
      };
    } catch (error) {
      this.recordError(cacheKey, 'get-error');
      this.monitoring.trackException(error as Error, {
        operation: 'context-cache.get',
        cacheKey,
        contextType,
      });
      return null;
    }
  }

  /**
   * Set cached context with metadata
   */
  private async setCachedContext<T>(
    cacheKey: string,
    data: T,
    ttl: number,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const entry: ContextCacheEntry<T> = {
        data,
        metadata: {
          cachedAt: new Date().toISOString(),
          version: CACHE_VERSION,
          ttl,
          accessCount: 0,
          lastAccessed: new Date().toISOString(),
          tenantId: metadata.tenantId || '',
          contextType: metadata.contextType || 'global',
          ...metadata,
        },
      };

      const serialized = JSON.stringify(entry);
      await this.redis.setex(cacheKey, ttl, serialized);

      this.monitoring.trackEvent('context-cache.set', {
        cacheKey,
        ttl,
        contextType: metadata.contextType,
        sizeBytes: serialized.length,
      });
    } catch (error) {
      this.recordError(cacheKey, 'set-error');
      this.monitoring.trackException(error as Error, {
        operation: 'context-cache.set',
        cacheKey,
      });
    }
  }

  /**
   * Invalidate a specific cache key
   */
  private async invalidateCache(cacheKey: string): Promise<number> {
    try {
      const deleted = await this.redis.del(cacheKey);
      if (deleted > 0) {
        this.metrics.invalidations++;
        this.monitoring.trackEvent('context-cache.invalidated', {
          cacheKey,
        });
      }
      return deleted;
    } catch (error) {
      this.recordError(cacheKey, 'invalidate-error');
      this.monitoring.trackException(error as Error, {
        operation: 'context-cache.invalidate',
        cacheKey,
      });
      return 0;
    }
  }

  /**
   * Invalidate all keys matching a pattern
   */
  private async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      if (deleted > 0) {
        this.metrics.invalidations += deleted;
        this.monitoring.trackEvent('context-cache.invalidated-pattern', {
          pattern,
          keysDeleted: deleted,
        });
      }
      return deleted;
    } catch (error) {
      this.recordError('pattern', 'invalidate-pattern-error');
      this.monitoring.trackException(error as Error, {
        operation: 'context-cache.invalidate-pattern',
        pattern,
      });
      return 0;
    }
  }

  /**
   * Update cache metadata (non-blocking, fire-and-forget)
   */
  private async updateCacheMetadata(
    cacheKey: string,
    metadata: ContextCacheEntry<any>['metadata']
  ): Promise<void> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) {
        return; // Cache already expired
      }

      const entry: ContextCacheEntry<any> = JSON.parse(cached);
      entry.metadata = { ...entry.metadata, ...metadata };

      // Get remaining TTL
      const ttl = await this.redis.ttl(cacheKey);
      if (ttl > 0) {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(entry));
      }
    } catch (error) {
      // Silently fail - this is a non-critical operation
    }
  }

  // ============================================
  // Cache Key Generation
  // ============================================

  private getGlobalContextKey(tenantId: string, query: string): string {
    const queryHash = crypto.createHash('sha256')
      .update(`${tenantId}:${query}`)
      .digest('hex');
    return `${CACHE_PREFIX_GLOBAL_CONTEXT}${tenantId}:${queryHash}`;
  }

  private getTemplateContextKey(tenantId: string, shardId: string, templateId: string): string {
    return `${CACHE_PREFIX_TEMPLATE_CONTEXT}${tenantId}:${shardId}:${templateId}`;
  }

  private getConversationContextKey(tenantId: string, conversationId: string): string {
    return `${CACHE_PREFIX_CONVERSATION_CONTEXT}${tenantId}:${conversationId}`;
  }

  // ============================================
  // Metrics Tracking
  // ============================================

  private recordHit(cacheKey: string, ageMs: number, isStale: boolean, isCriticallyStale: boolean): void {
    this.metrics.hits++;
    if (isStale) {
      this.metrics.staleHits++;
    }
    if (isCriticallyStale) {
      this.metrics.criticalStaleHits++;
    }
    this.updateHitRate();
    this.updateAverageAge(ageMs);
  }

  private recordMiss(cacheKey: string): void {
    this.metrics.misses++;
    this.updateHitRate();
  }

  private recordError(cacheKey: string, errorType: string): void {
    this.metrics.errors++;
    this.monitoring.trackEvent('context-cache.error', {
      cacheKey,
      errorType,
    });
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    if (total > 0) {
      this.metrics.hitRate = (this.metrics.hits / total) * 100;
    }
  }

  private updateAverageAge(ageMs: number): void {
    // Simple moving average
    const totalHits = this.metrics.hits;
    if (totalHits === 1) {
      this.metrics.averageAgeMs = ageMs;
    } else {
      this.metrics.averageAgeMs = (this.metrics.averageAgeMs * (totalHits - 1) + ageMs) / totalHits;
    }
  }

  private updateAccessPattern(cacheKey: string): void {
    const now = new Date();
    const pattern = this.accessPatterns.get(cacheKey);

    if (!pattern) {
      this.accessPatterns.set(cacheKey, {
        accessCount: 1,
        lastAccessed: now,
        firstAccessed: now,
        averageInterval: 0,
      });
    } else {
      const interval = (now.getTime() - pattern.lastAccessed.getTime()) / 1000; // seconds
      const newAverageInterval = pattern.averageInterval === 0
        ? interval
        : (pattern.averageInterval * (pattern.accessCount - 1) + interval) / pattern.accessCount;

      this.accessPatterns.set(cacheKey, {
        accessCount: pattern.accessCount + 1,
        lastAccessed: now,
        firstAccessed: pattern.firstAccessed,
        averageInterval: newAverageInterval,
      });
    }
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): ContextCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      criticalStaleHits: 0,
      invalidations: 0,
      warmingHits: 0,
      errors: 0,
      hitRate: 0,
      averageAgeMs: 0,
      totalSize: 0,
    };
  }

  // ============================================
  // Cache Invalidation Rules
  // ============================================

  /**
   * Register an invalidation rule
   */
  registerInvalidationRule(ruleId: string, rule: CacheInvalidationRule): void {
    const rules = this.invalidationRules.get(ruleId) || [];
    rules.push(rule);
    this.invalidationRules.set(ruleId, rules);
  }

  /**
   * Trigger invalidation based on event
   */
  async triggerInvalidation(eventType: string, context: Record<string, any>): Promise<number> {
    let totalInvalidated = 0;

    for (const [ruleId, rules] of this.invalidationRules.entries()) {
      for (const rule of rules) {
        if (rule.type === 'event-based' && rule.invalidateOn?.includes(eventType)) {
          // Check if context matches rule
          if (this.matchesInvalidationRule(rule, context)) {
            const invalidated = await this.executeInvalidationRule(rule, context);
            totalInvalidated += invalidated;
          }
        }
      }
    }

    if (totalInvalidated > 0) {
      this.monitoring.trackEvent('context-cache.event-invalidation', {
        eventType,
        invalidated: totalInvalidated,
      });
    }

    return totalInvalidated;
  }

  private matchesInvalidationRule(rule: CacheInvalidationRule, context: Record<string, any>): boolean {
    if (rule.tenantId && context.tenantId !== rule.tenantId) {
      return false;
    }
    if (rule.shardId && context.shardId !== rule.shardId) {
      return false;
    }
    if (rule.projectId && context.projectId !== rule.projectId) {
      return false;
    }
    if (rule.conversationId && context.conversationId !== rule.conversationId) {
      return false;
    }
    return true;
  }

  private async executeInvalidationRule(rule: CacheInvalidationRule, context: Record<string, any>): Promise<number> {
    if (rule.pattern) {
      // Replace placeholders in pattern
      let pattern = rule.pattern;
      if (context.tenantId) {
        pattern = pattern.replace('{tenantId}', context.tenantId);
      }
      if (context.shardId) {
        pattern = pattern.replace('{shardId}', context.shardId);
      }
      if (context.projectId) {
        pattern = pattern.replace('{projectId}', context.projectId);
      }
      if (context.conversationId) {
        pattern = pattern.replace('{conversationId}', context.conversationId);
      }
      return this.invalidatePattern(pattern);
    }
    return 0;
  }

  // ============================================
  // Intelligent Caching Decisions
  // ============================================

  /**
   * Make intelligent caching decision based on access patterns
   */
  makeIntelligentCachingDecision(
    cacheKey: string,
    contextType: 'global' | 'template' | 'conversation',
    dataSize: number,
    defaultTTL: number
  ): IntelligentCachingDecision {
    const pattern = this.accessPatterns.get(cacheKey);

    // Check if we should cache based on access pattern
    if (pattern) {
      const accessFrequency = pattern.accessCount / (
        (Date.now() - pattern.firstAccessed.getTime()) / 1000 / 60 // minutes
      );

      // High frequency access (> 1 per minute) - cache with longer TTL
      if (accessFrequency > 1) {
        return {
          shouldCache: true,
          ttl: defaultTTL * 2, // Double TTL for frequently accessed
          priority: 10,
          reason: 'High access frequency',
        };
      }

      // Medium frequency (0.1-1 per minute) - cache with default TTL
      if (accessFrequency > 0.1) {
        return {
          shouldCache: true,
          ttl: defaultTTL,
          priority: 7,
          reason: 'Medium access frequency',
        };
      }

      // Low frequency (< 0.1 per minute) - cache with shorter TTL
      return {
        shouldCache: true,
        ttl: Math.max(defaultTTL / 2, 60), // Half TTL, minimum 1 minute
        priority: 4,
        reason: 'Low access frequency',
      };
    }

    // New cache key - use default TTL
    return {
      shouldCache: true,
      ttl: defaultTTL,
      priority: 5,
      reason: 'New cache key',
    };
  }

  // ============================================
  // Cache Warming (Placeholder for future implementation)
  // ============================================

  /**
   * Warm cache for specified requests
   * This is a placeholder - actual warming logic should be implemented
   * by calling the appropriate context assembly methods
   */
  async warmCache(request: CacheWarmingRequest): Promise<void> {
    // This method is a placeholder
    // Actual implementation should call context assembly services
    // to pre-compute and cache contexts
    this.monitoring.trackEvent('context-cache.warming-requested', {
      tenantId: request.tenantId,
      contextType: request.contextType,
      priority: request.priority || 5,
    });
  }
}
