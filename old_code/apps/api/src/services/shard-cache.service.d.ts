import { IMonitoringProvider } from '@castiel/monitoring';
import { CacheService } from './cache.service.js';
import { CacheSubscriberService } from './cache-subscriber.service.js';
import { StructuredData } from '../types/shard.types.js';
/**
 * Shard cache service
 * Caches ONLY the structuredData field of shards (not full documents)
 * Uses 15-30 minute TTL with cache invalidation via pub/sub
 */
export declare class ShardCacheService {
    private cacheService;
    private cacheSubscriber;
    private monitoring;
    constructor(cacheService: CacheService, cacheSubscriber: CacheSubscriberService, monitoring: IMonitoringProvider);
    /**
     * Get cached structured data for a shard
     * @param tenantId Tenant ID
     * @param shardId Shard ID
     * @returns Cached structured data or null
     */
    getCachedStructuredData(tenantId: string, shardId: string): Promise<StructuredData | null>;
    /**
     * Cache structured data for a shard
     * @param tenantId Tenant ID
     * @param shardId Shard ID
     * @param structuredData Structured data to cache
     * @param ttl Optional TTL override (default: 15 minutes)
     */
    cacheStructuredData(tenantId: string, shardId: string, structuredData: StructuredData, ttl?: number): Promise<void>;
    /**
     * Invalidate cache for a specific shard
     * @param tenantId Tenant ID
     * @param shardId Shard ID
     * @param publishEvent Whether to publish invalidation event to other instances
     */
    invalidateShardCache(tenantId: string, shardId: string, publishEvent?: boolean): Promise<void>;
    /**
     * Invalidate all shard caches for a tenant
     * @param tenantId Tenant ID
     */
    invalidateTenantShards(tenantId: string): Promise<void>;
    /**
     * Invalidate caches for multiple shards
     * @param tenantId Tenant ID
     * @param shardIds Array of shard IDs
     */
    invalidateMultipleShards(tenantId: string, shardIds: string[]): Promise<void>;
    /**
     * Get or fetch structured data with cache-aside pattern
     * @param tenantId Tenant ID
     * @param shardId Shard ID
     * @param fetchFn Function to fetch from database if not in cache
     * @param ttl Optional TTL override
     * @returns Structured data
     */
    getOrFetch(tenantId: string, shardId: string, fetchFn: () => Promise<StructuredData | null>, ttl?: number): Promise<StructuredData | null>;
    /**
     * Warm cache for multiple shards
     * @param tenantId Tenant ID
     * @param shards Array of shards with structured data
     */
    warmCache(tenantId: string, shards: Array<{
        shardId: string;
        structuredData: StructuredData;
    }>): Promise<void>;
    /**
     * Get cache statistics for shards
     */
    getCacheStats(): {
        hits: number;
        misses: number;
        evictions: number;
        errors: number;
        total: number;
        hitRate: string;
    };
}
//# sourceMappingURL=shard-cache.service.d.ts.map