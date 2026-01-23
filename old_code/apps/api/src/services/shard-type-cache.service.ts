import { IMonitoringProvider } from '@castiel/monitoring';
import { CacheService } from './cache.service.js';
import { CacheSubscriberService } from './cache-subscriber.service.js';
import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';
import { applyTTLJitter } from '../utils/cache-ttl-helpers.js';
import type { ShardType } from '../types/shard-type.types.js';

/**
 * Shard Type cache service
 * Caches shard type definitions with 2-hour TTL
 * Uses cache invalidation via pub/sub for distributed cache consistency
 */
export class ShardTypeCacheService {
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
   * Get cached shard type
   * @param tenantId Tenant ID
   * @param shardTypeId Shard type ID
   * @returns Cached shard type or null
   */
  async getCachedShardType(
    tenantId: string,
    shardTypeId: string
  ): Promise<ShardType | null> {
    try {
      const cacheKey = cacheKeys.shardType(tenantId, shardTypeId);
      const cached = await this.cacheService.get<ShardType>(cacheKey);

      if (cached) {
        this.monitoring.trackEvent('shard-type.cache.hit', {
          tenantId,
          shardTypeId,
        });
      } else {
        this.monitoring.trackEvent('shard-type.cache.miss', {
          tenantId,
          shardTypeId,
        });
      }

      return cached;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-type.cache.get',
        tenantId,
        shardTypeId,
      });
      return null;
    }
  }

  /**
   * Cache shard type
   * @param tenantId Tenant ID
   * @param shardTypeId Shard type ID
   * @param shardType Shard type to cache
   * @param ttl Optional TTL override (default: 2 hours)
   */
  async cacheShardType(
    tenantId: string,
    shardTypeId: string,
    shardType: ShardType,
    ttl: number = CacheTTL.SHARD_TYPE
  ): Promise<void> {
    try {
      const cacheKey = cacheKeys.shardType(tenantId, shardTypeId);
      // Apply jitter to prevent thundering herd
      const ttlWithJitter = applyTTLJitter(ttl);
      await this.cacheService.set(cacheKey, shardType, ttlWithJitter);

      this.monitoring.trackEvent('shard-type.cache.set', {
        tenantId,
        shardTypeId,
        ttl,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-type.cache.set',
        tenantId,
        shardTypeId,
      });
      // Don't throw - caching failures shouldn't break the application
    }
  }

  /**
   * Invalidate cache for a specific shard type
   * @param tenantId Tenant ID
   * @param shardTypeId Shard type ID
   * @param publishEvent Whether to publish invalidation event to other instances
   */
  async invalidateShardTypeCache(
    tenantId: string,
    shardTypeId: string,
    publishEvent: boolean = true
  ): Promise<void> {
    try {
      const cacheKey = cacheKeys.shardType(tenantId, shardTypeId);
      await this.cacheService.delete(cacheKey);

      // Also invalidate system tenant cache if this is a global type
      // Shard types can be accessed from both tenant-specific and system tenant
      const systemCacheKey = cacheKeys.shardType('system', shardTypeId);
      await this.cacheService.delete(systemCacheKey);

      this.monitoring.trackEvent('shard-type.cache.invalidate', {
        tenantId,
        shardTypeId,
        publishEvent,
      });

      // Publish invalidation event to other service instances
      if (publishEvent) {
        await this.cacheSubscriber.publishInvalidation(
          tenantId,
          'shard-type',
          shardTypeId
        );
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-type.cache.invalidate',
        tenantId,
        shardTypeId,
      });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }

  /**
   * Invalidate all shard type caches for a tenant
   * @param tenantId Tenant ID
   */
  async invalidateTenantShardTypes(tenantId: string): Promise<void> {
    try {
      const pattern = `tenant:${tenantId}:shardtype:*`;
      const deleted = await this.cacheService.invalidatePattern(pattern);

      this.monitoring.trackEvent('shard-type.cache.invalidateTenant', {
        tenantId,
        deletedCount: deleted,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shard-type.cache.invalidateTenant',
        tenantId,
      });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }
}
