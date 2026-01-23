/**
 * ACL Cache Service
 *
 * Redis-based caching layer for ACL permission checks.
 * Provides high-performance permission validation with TTL-based expiration.
 */
import { ACL_CACHE_TTL_SECONDS, buildACLCacheKey, buildACLCachePattern, ACL_INVALIDATION_CHANNEL, } from '../types/acl.types.js';
export class ACLCacheService {
    cacheService;
    cacheSubscriber;
    monitoring;
    hits = 0;
    misses = 0;
    invalidations = 0;
    constructor(cacheService, // CacheService
    cacheSubscriber, // CacheSubscriberService
    monitoring) {
        this.cacheService = cacheService;
        this.cacheSubscriber = cacheSubscriber;
        this.monitoring = monitoring;
        this.setupInvalidationListener();
    }
    /**
     * Setup Redis pub/sub listener for ACL invalidation events
     */
    setupInvalidationListener() {
        if (!this.cacheSubscriber) {
            this.monitoring.trackEvent('acl-cache-subscriber-unavailable');
            return;
        }
        // Subscribe to ACL invalidation channel
        this.cacheSubscriber.subscribe(ACL_INVALIDATION_CHANNEL, async (message) => {
            const startTime = Date.now();
            try {
                if (message.pattern) {
                    // Pattern-based invalidation
                    await this.invalidateByPattern(message.pattern);
                }
                else if (message.userId && message.shardId) {
                    // Single entry invalidation
                    const key = buildACLCacheKey(message.tenantId, message.userId, message.shardId);
                    await this.cacheService.delete(key);
                }
                else if (message.userId) {
                    // User-wide invalidation
                    const pattern = buildACLCachePattern(message.tenantId, message.userId);
                    await this.invalidateByPattern(pattern);
                }
                else if (message.shardId) {
                    // Shard-wide invalidation
                    const pattern = buildACLCachePattern(message.tenantId, undefined, message.shardId);
                    await this.invalidateByPattern(pattern);
                }
                this.invalidations++;
                this.monitoring.trackMetric('acl-cache-invalidation', 1, {
                    type: message.pattern ? 'pattern' : message.userId && message.shardId ? 'single' : 'bulk',
                    duration: Date.now() - startTime,
                });
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    context: 'acl-cache-invalidation-listener',
                    message: JSON.stringify(message),
                });
            }
        });
        this.monitoring.trackEvent('acl-cache-invalidation-listener-started');
    }
    /**
     * Get cached ACL entry
     */
    async getCachedPermissions(userId, shardId, tenantId) {
        const startTime = Date.now();
        const key = buildACLCacheKey(tenantId, userId, shardId);
        try {
            const cached = await this.cacheService.get(key);
            if (cached) {
                // Check if entry is expired
                const now = Date.now();
                if (cached.expiresAt < now) {
                    await this.cacheService.delete(key);
                    this.misses++;
                    this.monitoring.trackMetric('acl-cache-get', 1, {
                        hit: false,
                        expired: true,
                        duration: Date.now() - startTime,
                    });
                    return null;
                }
                this.hits++;
                this.monitoring.trackMetric('acl-cache-get', 1, {
                    hit: true,
                    duration: Date.now() - startTime,
                });
                return cached;
            }
            this.misses++;
            this.monitoring.trackMetric('acl-cache-get', 1, {
                hit: false,
                duration: Date.now() - startTime,
            });
            return null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-get',
                key,
            });
            return null;
        }
    }
    /**
     * Cache ACL entry
     */
    async cachePermissions(entry) {
        const startTime = Date.now();
        const key = buildACLCacheKey(entry.tenantId, entry.userId, entry.shardId);
        try {
            await this.cacheService.set(key, entry, ACL_CACHE_TTL_SECONDS);
            this.monitoring.trackMetric('acl-cache-set', 1, {
                duration: Date.now() - startTime,
                ttl: ACL_CACHE_TTL_SECONDS,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-set',
                key,
            });
        }
    }
    /**
     * Batch get cached permissions for multiple shards
     */
    async batchGetCachedPermissions(userId, shardIds, tenantId) {
        const startTime = Date.now();
        const results = new Map();
        try {
            const keys = shardIds.map((shardId) => buildACLCacheKey(tenantId, userId, shardId));
            const cached = await this.cacheService.mget(keys);
            const now = Date.now();
            for (let i = 0; i < shardIds.length; i++) {
                const entry = cached[i];
                if (entry && entry.expiresAt >= now) {
                    results.set(shardIds[i], entry);
                    this.hits++;
                }
                else {
                    this.misses++;
                }
            }
            this.monitoring.trackMetric('acl-cache-batch-get', 1, {
                count: shardIds.length,
                hits: results.size,
                misses: shardIds.length - results.size,
                duration: Date.now() - startTime,
            });
            return results;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-batch-get',
                count: shardIds.length,
            });
            return results;
        }
    }
    /**
     * Invalidate cache for specific user/shard combination
     */
    async invalidateCache(userId, shardId, tenantId, publishEvent = true) {
        const startTime = Date.now();
        const key = buildACLCacheKey(tenantId, userId, shardId);
        try {
            await this.cacheService.delete(key);
            if (publishEvent && this.cacheSubscriber) {
                // Publish invalidation event to other instances
                await this.cacheSubscriber.publish(ACL_INVALIDATION_CHANNEL, {
                    userId,
                    shardId,
                    tenantId,
                });
            }
            this.invalidations++;
            this.monitoring.trackMetric('acl-cache-invalidate', 1, {
                type: 'single',
                duration: Date.now() - startTime,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-invalidate',
                key,
            });
        }
    }
    /**
     * Invalidate all cache entries for a user
     */
    async invalidateUserCache(userId, tenantId, publishEvent = true) {
        const startTime = Date.now();
        const pattern = buildACLCachePattern(tenantId, userId);
        try {
            await this.invalidateByPattern(pattern);
            if (publishEvent && this.cacheSubscriber) {
                // Publish invalidation event to other instances
                await this.cacheSubscriber.publish(ACL_INVALIDATION_CHANNEL, {
                    userId,
                    tenantId,
                });
            }
            this.invalidations++;
            this.monitoring.trackMetric('acl-cache-invalidate', 1, {
                type: 'user',
                duration: Date.now() - startTime,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-invalidate-user',
                pattern,
            });
        }
    }
    /**
     * Invalidate all cache entries for a shard
     */
    async invalidateShardCache(shardId, tenantId, publishEvent = true) {
        const startTime = Date.now();
        const pattern = buildACLCachePattern(tenantId, undefined, shardId);
        try {
            await this.invalidateByPattern(pattern);
            if (publishEvent && this.cacheSubscriber) {
                // Publish invalidation event to other instances
                await this.cacheSubscriber.publish(ACL_INVALIDATION_CHANNEL, {
                    shardId,
                    tenantId,
                });
            }
            this.invalidations++;
            this.monitoring.trackMetric('acl-cache-invalidate', 1, {
                type: 'shard',
                duration: Date.now() - startTime,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-invalidate-shard',
                pattern,
            });
        }
    }
    /**
     * Invalidate all cache entries for a tenant
     */
    async invalidateTenantCache(tenantId, publishEvent = true) {
        const startTime = Date.now();
        const pattern = buildACLCachePattern(tenantId);
        try {
            await this.invalidateByPattern(pattern);
            if (publishEvent && this.cacheSubscriber) {
                // Publish invalidation event to other instances
                await this.cacheSubscriber.publish(ACL_INVALIDATION_CHANNEL, {
                    tenantId,
                });
            }
            this.invalidations++;
            this.monitoring.trackMetric('acl-cache-invalidate', 1, {
                type: 'tenant',
                duration: Date.now() - startTime,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-invalidate-tenant',
                pattern,
            });
        }
    }
    /**
     * Invalidate cache entries by pattern
     */
    async invalidateByPattern(pattern) {
        try {
            await this.cacheService.invalidatePattern(pattern);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-invalidate-pattern',
                pattern,
            });
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? this.hits / total : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            invalidations: this.invalidations,
            hitRate,
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.hits = 0;
        this.misses = 0;
        this.invalidations = 0;
    }
    /**
     * Clear all ACL cache entries (admin operation)
     */
    async clearAll() {
        const startTime = Date.now();
        try {
            await this.cacheService.invalidatePattern('tenant:*:acl:*');
            this.monitoring.trackMetric('acl-cache-clear-all', 1, {
                duration: Date.now() - startTime,
            });
            this.monitoring.trackEvent('acl-cache-cleared');
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'acl-cache-clear-all',
            });
        }
    }
}
//# sourceMappingURL=acl-cache.service.js.map