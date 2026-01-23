import { IMonitoringProvider } from '@castiel/monitoring';
import { CacheService } from './cache.service.js';
import { CacheSubscriberService } from './cache-subscriber.service.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';
import { applyTTLJitter } from '../utils/cache-ttl-helpers.js';
import { StructuredData } from '../types/shard.types.js';

/**
 * Shard cache service
 * Caches ONLY the structuredData field of shards (not full documents)
 * Uses 15-30 minute TTL with cache invalidation via pub/sub
 */
export class ShardCacheService {
  private cacheService: CacheService;
  private cacheSubscriber: CacheSubscriberService;
  private monitoring: IMonitoringProvider;

  constructor(
    cacheService: CacheService,
    cacheSubscriber: CacheSubscriberService,
    monitoring: IMonitoringProvider
  ) {
    this.cacheService = cacheService;
    this.cacheSubscriber = cacheSubscriber;
    this.monitoring = monitoring;
  }

  /**
   * Get cached structured data for a shard
   * @param tenantId Tenant ID
   * @param shardId Shard ID
   * @returns Cached structured data or null
   */
  async getCachedStructuredData(
    tenantId: string,
    shardId: string
  ): Promise<StructuredData | null> {
    try {
      const cacheKey = cacheKeys.shardStructured(tenantId, shardId);
      const cached = await this.cacheService.get<StructuredData>(cacheKey);

      if (cached) {
        this.monitoring.trackEvent('shard.cache.hit', {
          tenantId,
          shardId,
        });
      } else {
        this.monitoring.trackEvent('shard.cache.miss', {
          tenantId,
          shardId,
        });
      }

      return cached;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.get',
        tenantId,
        shardId,
      });
      return null;
    }
  }

  /**
   * Cache structured data for a shard
   * @param tenantId Tenant ID
   * @param shardId Shard ID
   * @param structuredData Structured data to cache
   * @param ttl Optional TTL override (default: 15 minutes)
   */
  async cacheStructuredData(
    tenantId: string,
    shardId: string,
    structuredData: StructuredData,
    ttl: number = CacheTTL.SHARD_STRUCTURED
  ): Promise<void> {
    try {
      const cacheKey = cacheKeys.shardStructured(tenantId, shardId);
      // Apply jitter to prevent thundering herd
      const ttlWithJitter = applyTTLJitter(ttl);
      await this.cacheService.set(cacheKey, structuredData, ttlWithJitter);

      this.monitoring.trackEvent('shard.cache.set', {
        tenantId,
        shardId,
        ttl,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.set',
        tenantId,
        shardId,
      });
      // Don't throw - caching failures shouldn't break the application
    }
  }

  /**
   * Invalidate cache for a specific shard
   * @param tenantId Tenant ID
   * @param shardId Shard ID
   * @param publishEvent Whether to publish invalidation event to other instances
   */
  async invalidateShardCache(
    tenantId: string,
    shardId: string,
    publishEvent: boolean = true
  ): Promise<void> {
    try {
      const cacheKey = cacheKeys.shardStructured(tenantId, shardId);
      await this.cacheService.delete(cacheKey);

      this.monitoring.trackEvent('shard.cache.invalidate', {
        tenantId,
        shardId,
        publishEvent,
      });

      // Publish invalidation event to other service instances
      if (publishEvent) {
        await this.cacheSubscriber.publishInvalidation(
          tenantId,
          'shard',
          shardId
        );
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.invalidate',
        tenantId,
        shardId,
      });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }

  /**
   * Invalidate all shard caches for a tenant
   * @param tenantId Tenant ID
   */
  async invalidateTenantShards(tenantId: string): Promise<void> {
    try {
      const pattern = cacheKeys.shardPattern(tenantId, '*');
      const deleted = await this.cacheService.invalidatePattern(pattern);

      this.monitoring.trackEvent('shard.cache.invalidateTenant', {
        tenantId,
        deleted,
      });

      // Publish invalidation event to other service instances
      await this.cacheSubscriber.publishInvalidation(tenantId, 'shard');
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.invalidateTenant',
        tenantId,
      });
    }
  }

  /**
   * Invalidate caches for multiple shards
   * @param tenantId Tenant ID
   * @param shardIds Array of shard IDs
   */
  async invalidateMultipleShards(
    tenantId: string,
    shardIds: string[]
  ): Promise<void> {
    try {
      const invalidations = shardIds.map((shardId) =>
        this.invalidateShardCache(tenantId, shardId, false)
      );

      await Promise.all(invalidations);

      this.monitoring.trackEvent('shard.cache.invalidateMultiple', {
        tenantId,
        count: shardIds.length,
      });

      // Publish single invalidation event for all shards
      await this.cacheSubscriber.publishInvalidation(tenantId, 'shard');
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.invalidateMultiple',
        tenantId,
        count: shardIds.length,
      });
    }
  }

  /**
   * Get or fetch structured data with cache-aside pattern
   * @param tenantId Tenant ID
   * @param shardId Shard ID
   * @param fetchFn Function to fetch from database if not in cache
   * @param ttl Optional TTL override
   * @returns Structured data
   */
  async getOrFetch(
    tenantId: string,
    shardId: string,
    fetchFn: () => Promise<StructuredData | null>,
    ttl: number = CacheTTL.SHARD_STRUCTURED
  ): Promise<StructuredData | null> {
    // Try cache first
    const cached = await this.getCachedStructuredData(tenantId, shardId);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from database
    try {
      const data = await fetchFn();
      
      if (data !== null) {
        // Cache the result
        await this.cacheStructuredData(tenantId, shardId, data, ttl);
      }

      return data;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.getOrFetch',
        tenantId,
        shardId,
      });
      throw error;
    }
  }

  /**
   * Warm cache for multiple shards
   * @param tenantId Tenant ID
   * @param shards Array of shards with structured data
   */
  async warmCache(
    tenantId: string,
    shards: Array<{ shardId: string; structuredData: StructuredData }>
  ): Promise<void> {
    try {
      const cacheOps = shards.map((shard) =>
        this.cacheStructuredData(tenantId, shard.shardId, shard.structuredData)
      );

      await Promise.all(cacheOps);

      this.monitoring.trackEvent('shard.cache.warm', {
        tenantId,
        count: shards.length,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.warm',
        tenantId,
        count: shards.length,
      });
    }
  }

  /**
   * Get cache statistics for shards
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Get cached list query result
   * @param tenantId Tenant ID
   * @param queryHash Hash of query parameters
   * @returns Cached list result or null
   */
  async getCachedListResult<T>(tenantId: string, queryHash: string): Promise<T | null> {
    try {
      const cacheKey = `tenant:${tenantId}:shard:list:${queryHash}`;
      return await this.cacheService.get<T>(cacheKey);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.getCachedListResult',
        tenantId,
        queryHash,
      });
      return null;
    }
  }

  /**
   * Cache list query result
   * @param tenantId Tenant ID
   * @param queryHash Hash of query parameters
   * @param result List result to cache
   * @param ttl Time to live in seconds (default: 1-5 minutes)
   */
  async cacheListResult<T>(
    tenantId: string,
    queryHash: string,
    result: T,
    ttl: number = 2 * 60 // 2 minutes default
  ): Promise<void> {
    try {
      const cacheKey = `tenant:${tenantId}:shard:list:${queryHash}`;
      await this.cacheService.set(cacheKey, result, ttl);

      this.monitoring.trackEvent('shard.cache.listResult.cached', {
        tenantId,
        queryHash,
        ttl,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.cacheListResult',
        tenantId,
        queryHash,
      });
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Invalidate all list query caches for a tenant
   * Called when shards are created/updated/deleted
   * @param tenantId Tenant ID
   */
  async invalidateListCaches(tenantId: string): Promise<void> {
    try {
      const pattern = `tenant:${tenantId}:shard:list:*`;
      const deleted = await this.cacheService.invalidatePattern(pattern);

      this.monitoring.trackEvent('shard.cache.listResult.invalidated', {
        tenantId,
        deleted,
      });

      // Publish invalidation event to other service instances
      await this.cacheSubscriber.publishInvalidation(tenantId, 'shard-list');
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard.cache.invalidateListCaches',
        tenantId,
      });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }
}
