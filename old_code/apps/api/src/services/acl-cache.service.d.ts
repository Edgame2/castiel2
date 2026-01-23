/**
 * ACL Cache Service
 *
 * Redis-based caching layer for ACL permission checks.
 * Provides high-performance permission validation with TTL-based expiration.
 */
import { ACLCacheEntry } from '../types/acl.types.js';
import { IMonitoringProvider } from '@castiel/monitoring';
export declare class ACLCacheService {
    private readonly cacheService;
    private readonly cacheSubscriber;
    private readonly monitoring;
    private hits;
    private misses;
    private invalidations;
    constructor(cacheService: any, // CacheService
    cacheSubscriber: any, // CacheSubscriberService
    monitoring: IMonitoringProvider);
    /**
     * Setup Redis pub/sub listener for ACL invalidation events
     */
    private setupInvalidationListener;
    /**
     * Get cached ACL entry
     */
    getCachedPermissions(userId: string, shardId: string, tenantId: string): Promise<ACLCacheEntry | null>;
    /**
     * Cache ACL entry
     */
    cachePermissions(entry: ACLCacheEntry): Promise<void>;
    /**
     * Batch get cached permissions for multiple shards
     */
    batchGetCachedPermissions(userId: string, shardIds: string[], tenantId: string): Promise<Map<string, ACLCacheEntry>>;
    /**
     * Invalidate cache for specific user/shard combination
     */
    invalidateCache(userId: string, shardId: string, tenantId: string, publishEvent?: boolean): Promise<void>;
    /**
     * Invalidate all cache entries for a user
     */
    invalidateUserCache(userId: string, tenantId: string, publishEvent?: boolean): Promise<void>;
    /**
     * Invalidate all cache entries for a shard
     */
    invalidateShardCache(shardId: string, tenantId: string, publishEvent?: boolean): Promise<void>;
    /**
     * Invalidate all cache entries for a tenant
     */
    invalidateTenantCache(tenantId: string, publishEvent?: boolean): Promise<void>;
    /**
     * Invalidate cache entries by pattern
     */
    private invalidateByPattern;
    /**
     * Get cache statistics
     */
    getStats(): {
        hits: number;
        misses: number;
        invalidations: number;
        hitRate: number;
    };
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Clear all ACL cache entries (admin operation)
     */
    clearAll(): Promise<void>;
}
//# sourceMappingURL=acl-cache.service.d.ts.map