/**
 * Vector Search Cache Service
 * Caches expensive vector query results in Redis
 * TTL: 30 minutes
 */
import { buildVectorSearchCacheKey, buildVectorSearchInvalidationPattern } from '../types/vector-search.types.js';
import { CacheTTL } from '../utils/cache-keys.js';
/**
 * Redis pub/sub channel for vector search cache invalidation
 */
const VECTOR_SEARCH_INVALIDATION_CHANNEL = 'cache:invalidate:vsearch';
/**
 * Vector search cache service with Redis
 */
export class VectorSearchCacheService {
    redis;
    monitoring;
    cacheHits = 0;
    cacheMisses = 0;
    totalSearches = 0;
    totalInvalidations = 0;
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
        // Subscribe to cache invalidation events
        const subscriber = redis.duplicate();
        subscriber.subscribe(VECTOR_SEARCH_INVALIDATION_CHANNEL, (err) => {
            if (err) {
                monitoring?.trackException(err, {
                    component: 'VectorSearchCacheService',
                    operation: 'subscribe',
                });
            }
            else {
                monitoring?.trackEvent('VectorSearchCache.Subscribed', {
                    channel: VECTOR_SEARCH_INVALIDATION_CHANNEL,
                });
            }
        });
        subscriber.on('message', async (channel, message) => {
            if (channel === VECTOR_SEARCH_INVALIDATION_CHANNEL) {
                try {
                    const invalidation = JSON.parse(message);
                    await this.handleInvalidationEvent(invalidation);
                }
                catch (error) {
                    monitoring?.trackException(error, {
                        component: 'VectorSearchCacheService',
                        operation: 'handleInvalidationMessage',
                    });
                }
            }
        });
    }
    /**
     * Get cached vector search results
     */
    async getCached(tenantId, queryHash) {
        const startTime = Date.now();
        const cacheKey = buildVectorSearchCacheKey(tenantId, queryHash);
        try {
            const cached = await this.redis.get(cacheKey);
            if (!cached) {
                this.cacheMisses++;
                this.totalSearches++;
                this.monitoring?.trackMetric('vsearch-cache-miss', 1, {
                    tenantId,
                    duration: Date.now() - startTime,
                });
                return null;
            }
            // Parse cached entry
            const entry = JSON.parse(cached);
            // Check if expired (additional safety check)
            const now = new Date();
            const expiresAt = new Date(entry.expiresAt);
            if (now > expiresAt) {
                // Expired, delete and return null
                await this.redis.del(cacheKey);
                this.cacheMisses++;
                this.totalSearches++;
                return null;
            }
            this.cacheHits++;
            this.totalSearches++;
            const duration = Date.now() - startTime;
            this.monitoring?.trackMetric('vsearch-cache-hit', 1, {
                tenantId,
                queryHash,
                duration,
            });
            return entry.results;
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'getCached',
                tenantId,
                queryHash,
            });
            return null;
        }
    }
    /**
     * Cache vector search results
     */
    async setCached(tenantId, queryHash, results, metadata, queryEmbedding) {
        const startTime = Date.now();
        const cacheKey = buildVectorSearchCacheKey(tenantId, queryHash);
        // Optimize TTL: Use longer TTL for common queries (topK <= 10, no complex filters)
        // This improves cache hit rate for frequently accessed queries
        const isCommonQuery = metadata.topK <= 10 &&
            metadata.filtersApplied.length <= 2 &&
            !metadata.filtersApplied.some(f => f.includes('projectId') || f.includes('metadata'));
        const ttl = isCommonQuery
            ? CacheTTL.VECTOR_SEARCH * 2 // 1 hour for common queries
            : CacheTTL.VECTOR_SEARCH; // 30 minutes for complex queries
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttl * 1000);
            const entry = {
                results,
                totalCount: results.length,
                queryEmbedding,
                metadata,
                cachedAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
            };
            await this.redis.setex(cacheKey, ttl, JSON.stringify(entry));
            const duration = Date.now() - startTime;
            this.monitoring?.trackMetric('vsearch-cache-set', 1, {
                tenantId,
                queryHash,
                ttl,
                resultCount: results.length,
                duration,
            });
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'setCached',
                tenantId,
                queryHash,
            });
        }
    }
    /**
     * Invalidate cache for a single query
     */
    async invalidateQuery(tenantId, queryHash) {
        const cacheKey = buildVectorSearchCacheKey(tenantId, queryHash);
        try {
            await this.redis.del(cacheKey);
            this.totalInvalidations++;
            this.monitoring?.trackEvent('VectorSearchCache.InvalidateQuery', {
                tenantId,
                queryHash,
            });
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'invalidateQuery',
                tenantId,
                queryHash,
            });
        }
    }
    /**
     * Invalidate all vector search cache for a tenant
     */
    async invalidateTenant(tenantId) {
        const pattern = buildVectorSearchInvalidationPattern(tenantId);
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }
            await this.redis.del(...keys);
            this.totalInvalidations += keys.length;
            this.monitoring?.trackEvent('VectorSearchCache.InvalidateTenant', {
                tenantId,
                keysInvalidated: keys.length,
            });
            return keys.length;
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'invalidateTenant',
                tenantId,
            });
            return 0;
        }
    }
    /**
     * Publish cache invalidation event to other instances
     */
    async publishInvalidation(invalidation) {
        try {
            await this.redis.publish(VECTOR_SEARCH_INVALIDATION_CHANNEL, JSON.stringify(invalidation));
            this.monitoring?.trackEvent('vsearch-cache-invalidation-publish', {
                tenantId: invalidation.tenantId,
                shardId: invalidation.shardId || 'none',
                invalidateAll: invalidation.invalidateAll || false,
            });
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'publishInvalidation',
            });
        }
    }
    /**
     * Handle invalidation event from pub/sub
     */
    async handleInvalidationEvent(invalidation) {
        try {
            if (invalidation.invalidateAll) {
                await this.invalidateTenant(invalidation.tenantId);
            }
            else {
                // For now, invalidate entire tenant cache
                // Future: implement more granular invalidation by shardTypeId
                await this.invalidateTenant(invalidation.tenantId);
            }
            this.monitoring?.trackEvent('vsearch-cache-invalidation-handle', {
                tenantId: invalidation.tenantId,
                shardId: invalidation.shardId || 'none',
                shardTypeId: invalidation.shardTypeId || 'none',
            });
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'handleInvalidationEvent',
            });
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        const cacheHitRate = this.totalSearches > 0 ? (this.cacheHits / this.totalSearches) * 100 : 0;
        try {
            // Count total cache keys
            const pattern = 'tenant:*:vsearch:*';
            const keys = await this.redis.keys(pattern);
            const totalCacheKeys = keys.length;
            // Get memory usage (approximate)
            let cacheMemoryBytes = 0;
            if (keys.length > 0) {
                const memoryPromises = keys.slice(0, 100).map((key) => this.redis.memory('USAGE', key));
                const memories = await Promise.all(memoryPromises);
                const validMemories = memories.filter((mem) => mem !== null && mem !== undefined);
                if (validMemories.length > 0) {
                    const avgMemory = validMemories.reduce((sum, mem) => sum + mem, 0) / validMemories.length;
                    cacheMemoryBytes = Math.round(avgMemory * keys.length);
                }
            }
            return {
                totalSearches: this.totalSearches,
                cacheHits: this.cacheHits,
                cacheMisses: this.cacheMisses,
                cacheHitRate: Math.round(cacheHitRate * 100) / 100,
                averageExecutionTimeMs: 0, // Tracked by VectorSearchService
                averageResultCount: 0, // Tracked by VectorSearchService
                totalCacheKeys,
                cacheMemoryBytes,
            };
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'getStats',
            });
            return {
                totalSearches: this.totalSearches,
                cacheHits: this.cacheHits,
                cacheMisses: this.cacheMisses,
                cacheHitRate: Math.round(cacheHitRate * 100) / 100,
                averageExecutionTimeMs: 0,
                averageResultCount: 0,
                totalCacheKeys: 0,
            };
        }
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.totalSearches = 0;
        this.totalInvalidations = 0;
    }
    /**
     * Check if cache is healthy
     */
    async isHealthy() {
        try {
            await this.redis.ping();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Clear all vector search cache (use with caution!)
     */
    async clearAll() {
        try {
            const pattern = 'tenant:*:vsearch:*';
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }
            await this.redis.del(...keys);
            this.monitoring?.trackEvent('VectorSearchCache.ClearAll', {
                keysCleared: keys.length,
            });
            return keys.length;
        }
        catch (error) {
            this.monitoring?.trackException(error, {
                component: 'VectorSearchCacheService',
                operation: 'clearAll',
            });
            return 0;
        }
    }
}
//# sourceMappingURL=vector-search-cache.service.js.map