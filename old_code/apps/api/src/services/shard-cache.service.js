import { cacheKeys, CacheTTL } from '../utils/cache-keys.js';
/**
 * Shard cache service
 * Caches ONLY the structuredData field of shards (not full documents)
 * Uses 15-30 minute TTL with cache invalidation via pub/sub
 */
export class ShardCacheService {
    cacheService;
    cacheSubscriber;
    monitoring;
    constructor(cacheService, cacheSubscriber, monitoring) {
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
    async getCachedStructuredData(tenantId, shardId) {
        try {
            const cacheKey = cacheKeys.shardStructured(tenantId, shardId);
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                this.monitoring.trackEvent('shard.cache.hit', {
                    tenantId,
                    shardId,
                });
            }
            else {
                this.monitoring.trackEvent('shard.cache.miss', {
                    tenantId,
                    shardId,
                });
            }
            return cached;
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async cacheStructuredData(tenantId, shardId, structuredData, ttl = CacheTTL.SHARD_STRUCTURED) {
        try {
            const cacheKey = cacheKeys.shardStructured(tenantId, shardId);
            await this.cacheService.set(cacheKey, structuredData, ttl);
            this.monitoring.trackEvent('shard.cache.set', {
                tenantId,
                shardId,
                ttl,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async invalidateShardCache(tenantId, shardId, publishEvent = true) {
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
                await this.cacheSubscriber.publishInvalidation(tenantId, 'shard', shardId);
            }
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async invalidateTenantShards(tenantId) {
        try {
            const pattern = cacheKeys.shardPattern(tenantId, '*');
            const deleted = await this.cacheService.invalidatePattern(pattern);
            this.monitoring.trackEvent('shard.cache.invalidateTenant', {
                tenantId,
                deleted,
            });
            // Publish invalidation event to other service instances
            await this.cacheSubscriber.publishInvalidation(tenantId, 'shard');
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async invalidateMultipleShards(tenantId, shardIds) {
        try {
            const invalidations = shardIds.map((shardId) => this.invalidateShardCache(tenantId, shardId, false));
            await Promise.all(invalidations);
            this.monitoring.trackEvent('shard.cache.invalidateMultiple', {
                tenantId,
                count: shardIds.length,
            });
            // Publish single invalidation event for all shards
            await this.cacheSubscriber.publishInvalidation(tenantId, 'shard');
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async getOrFetch(tenantId, shardId, fetchFn, ttl = CacheTTL.SHARD_STRUCTURED) {
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
    async warmCache(tenantId, shards) {
        try {
            const cacheOps = shards.map((shard) => this.cacheStructuredData(tenantId, shard.shardId, shard.structuredData));
            await Promise.all(cacheOps);
            this.monitoring.trackEvent('shard.cache.warm', {
                tenantId,
                count: shards.length,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
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
}
//# sourceMappingURL=shard-cache.service.js.map