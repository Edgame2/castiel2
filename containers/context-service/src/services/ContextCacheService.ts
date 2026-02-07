/**
 * Context Cache Service
 * Handles context caching with staleness detection, metrics, and invalidation
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '@coder/shared/utils/logger';
import crypto from 'crypto';
import {
  ContextCacheEntry,
  ContextCacheMetrics,
  CacheWarmingRequest,
} from '../types/context-cache.types';

const CACHE_PREFIX_GLOBAL_CONTEXT = 'global-context:';
const CACHE_PREFIX_TEMPLATE_CONTEXT = 'context:';
const CACHE_PREFIX_CONVERSATION_CONTEXT = 'conversation:';
const CACHE_NAMESPACE = 'context-cache';

const DEFAULT_GLOBAL_CONTEXT_TTL = 300; // 5 minutes
const DEFAULT_TEMPLATE_CONTEXT_TTL = 600; // 10 minutes
const DEFAULT_CONVERSATION_CONTEXT_TTL = 1800; // 30 minutes

const CONTEXT_STALE_THRESHOLD_MS = 180000; // 3 minutes
const CONTEXT_CRITICAL_STALE_THRESHOLD_MS = 600000; // 10 minutes

const CACHE_VERSION = 1;

export class ContextCacheService {
  private config: ReturnType<typeof loadConfig>;
  private cacheServiceClient: ServiceClient;
  private app: FastifyInstance | null = null;
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

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();

    this.cacheServiceClient = new ServiceClient({
      baseURL: this.config.services.cache_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'context-service',
      serviceName: 'context-service',
      tenantId,
    });
  }

  /**
   * Get cached global context
   */
  async getGlobalContext<T>(
    tenantId: string,
    query: string
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    const cacheKey = this.getGlobalContextKey(tenantId, query);
    return this.getCachedContext<T>(cacheKey, 'global', tenantId);
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
    await this.setCachedContext(cacheKey, data, ttl, tenantId, {
      tenantId,
      contextType: 'global',
      query: query.substring(0, 200),
      ...metadata,
    });
  }

  /**
   * Invalidate global context cache
   */
  async invalidateGlobalContext(tenantId: string, query?: string): Promise<number> {
    if (query) {
      const cacheKey = this.getGlobalContextKey(tenantId, query);
      return this.invalidateCache(cacheKey, tenantId);
    } else {
      // Invalidate all global context for tenant
      const pattern = `${CACHE_PREFIX_GLOBAL_CONTEXT}${tenantId}:*`;
      return this.invalidatePattern(pattern, tenantId);
    }
  }

  /**
   * Get cached template context
   */
  async getTemplateContext<T>(
    tenantId: string,
    shardId: string,
    templateId: string
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    const cacheKey = this.getTemplateContextKey(tenantId, shardId, templateId);
    return this.getCachedContext<T>(cacheKey, 'template', tenantId);
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
    await this.setCachedContext(cacheKey, data, ttl, tenantId, {
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
      return this.invalidateCache(cacheKey, tenantId);
    } else {
      // Invalidate all templates for shard
      const pattern = `${CACHE_PREFIX_TEMPLATE_CONTEXT}${tenantId}:${shardId}:*`;
      return this.invalidatePattern(pattern, tenantId);
    }
  }

  /**
   * Get cached conversation context
   */
  async getConversationContext<T>(
    tenantId: string,
    conversationId: string
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    const cacheKey = this.getConversationContextKey(tenantId, conversationId);
    return this.getCachedContext<T>(cacheKey, 'conversation', tenantId);
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
    await this.setCachedContext(cacheKey, data, ttl, tenantId, {
      tenantId,
      conversationId,
      contextType: 'conversation',
      ...metadata,
    });
  }

  /**
   * Invalidate conversation context cache
   */
  async invalidateConversationContext(tenantId: string, conversationId: string): Promise<number> {
    const cacheKey = this.getConversationContextKey(tenantId, conversationId);
    return this.invalidateCache(cacheKey, tenantId);
  }

  /**
   * Get cached context with staleness detection
   */
  private async getCachedContext<T>(
    cacheKey: string,
    contextType: 'global' | 'template' | 'conversation',
    tenantId: string
  ): Promise<{ data: T; isStale: boolean; isCriticallyStale: boolean; ageMs: number } | null> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.cacheServiceClient.get<{ key: string; value: any }>(
        `/api/v1/cache/entries/${encodeURIComponent(cacheKey)}?namespace=${CACHE_NAMESPACE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!response || !response.value) {
        this.recordMiss(cacheKey);
        return null;
      }

      // Parse cache entry
      let entry: ContextCacheEntry<T>;
      try {
        entry = response.value as ContextCacheEntry<T>;
      } catch (parseError) {
        // Legacy format - wrap in new format
        entry = {
          data: response.value as T,
          metadata: {
            cachedAt: new Date().toISOString(),
            version: 0,
            ttl: DEFAULT_GLOBAL_CONTEXT_TTL,
            accessCount: 0,
            lastAccessed: new Date().toISOString(),
            tenantId,
            contextType,
          },
        };
      }

      // Check version compatibility
      if (entry.metadata.version !== CACHE_VERSION) {
        await this.invalidateCache(cacheKey, tenantId);
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

      // Update cache metadata (non-blocking)
      this.updateCacheMetadata(cacheKey, entry, tenantId).catch((err) => {
        log.warn('Failed to update cache metadata', {
          error: err.message,
          cacheKey,
          service: 'context-service',
        });
      });

      return {
        data: entry.data,
        isStale,
        isCriticallyStale,
        ageMs,
      };
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        this.recordMiss(cacheKey);
        return null;
      }
      this.recordError(cacheKey, 'get-error');
      log.warn('Failed to get cached context', {
        error: error.message,
        cacheKey,
        contextType,
        service: 'context-service',
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
    tenantId: string,
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
          tenantId,
          contextType: metadata.contextType || 'global',
          ...metadata,
        },
      };

      const token = this.getServiceToken(tenantId);
      await this.cacheServiceClient.post(
        '/api/v1/cache/entries',
        {
          key: cacheKey,
          value: entry,
          ttl,
          namespace: CACHE_NAMESPACE,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      log.debug('Cached context', {
        cacheKey,
        ttl,
        contextType: metadata.contextType,
        service: 'context-service',
      });
    } catch (error: any) {
      this.recordError(cacheKey, 'set-error');
      log.warn('Failed to set cached context', {
        error: error.message,
        cacheKey,
        service: 'context-service',
      });
    }
  }

  /**
   * Invalidate a specific cache key
   */
  private async invalidateCache(cacheKey: string, tenantId: string): Promise<number> {
    try {
      const token = this.getServiceToken(tenantId);
      await this.cacheServiceClient.delete(
        `/api/v1/cache/entries/${encodeURIComponent(cacheKey)}?namespace=${CACHE_NAMESPACE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      this.metrics.invalidations++;
      return 1;
    } catch (error: any) {
      this.recordError(cacheKey, 'invalidate-error');
      return 0;
    }
  }

  /**
   * Invalidate all keys matching a pattern
   */
  private async invalidatePattern(pattern: string, tenantId: string): Promise<number> {
    try {
      const token = this.getServiceToken(tenantId);
      await this.cacheServiceClient.post(
        '/api/v1/cache/invalidate-pattern',
        {
          pattern,
          namespace: CACHE_NAMESPACE,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      this.metrics.invalidations++;
      return 1;
    } catch (error: any) {
      this.recordError('pattern', 'invalidate-pattern-error');
      return 0;
    }
  }

  /**
   * Update cache metadata (non-blocking)
   */
  private async updateCacheMetadata<T>(
    cacheKey: string,
    entry: ContextCacheEntry<T>,
    tenantId: string
  ): Promise<void> {
    try {
      // Get current TTL from cache service
      const token = this.getServiceToken(tenantId);
      const response = await this.cacheServiceClient.get<{ key: string; value: any }>(
        `/api/v1/cache/entries/${encodeURIComponent(cacheKey)}?namespace=${CACHE_NAMESPACE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (response && response.value) {
        const currentEntry = response.value as ContextCacheEntry<T>;
        currentEntry.metadata = { ...currentEntry.metadata, ...entry.metadata };

        // Update with same TTL
        await this.cacheServiceClient.post(
          '/api/v1/cache/entries',
          {
            key: cacheKey,
            value: currentEntry,
            ttl: entry.metadata.ttl,
            namespace: CACHE_NAMESPACE,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );
      }
    } catch (error) {
      // Silently fail - this is a non-critical operation
    }
  }

  /**
   * Cache key generation
   */
  private getGlobalContextKey(tenantId: string, query: string): string {
    const queryHash = crypto
      .createHash('sha256')
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

  /**
   * Metrics tracking
   */
  private recordHit(
    _cacheKey: string,
    ageMs: number,
    isStale: boolean,
    isCriticallyStale: boolean
  ): void {
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

  private recordMiss(_cacheKey: string): void {
    this.metrics.misses++;
    this.updateHitRate();
  }

  private recordError(_cacheKey: string, errorType: string): void {
    this.metrics.errors++;
    log.warn('Context cache error', {
      cacheKey: _cacheKey,
      errorType,
      service: 'context-service',
    });
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    if (total > 0) {
      this.metrics.hitRate = (this.metrics.hits / total) * 100;
    }
  }

  private updateAverageAge(ageMs: number): void {
    const totalHits = this.metrics.hits;
    if (totalHits === 1) {
      this.metrics.averageAgeMs = ageMs;
    } else {
      this.metrics.averageAgeMs =
        (this.metrics.averageAgeMs * (totalHits - 1) + ageMs) / totalHits;
    }
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): ContextCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
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

  /**
   * Warm cache (placeholder)
   */
  async warmCache(request: CacheWarmingRequest): Promise<void> {
    log.info('Cache warming requested', {
      tenantId: request.tenantId,
      contextType: request.contextType,
      priority: request.priority || 5,
      service: 'context-service',
    });
    // Actual warming logic should be implemented by calling context assembly services
  }
}
