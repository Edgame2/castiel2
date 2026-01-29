/**
 * Multi-Layer Cache
 * Implements cache-aside pattern with in-memory + Redis layers
 * @module @coder/shared/cache
 */
import { RedisClient } from './RedisClient';
/**
 * Multi-Layer Cache
 * Layer 1: In-memory (LRU, per service instance)
 * Layer 2: Redis (shared across instances)
 */
export declare class MultiLayerCache {
    private memoryCache;
    private redisClient;
    private maxMemorySize;
    private defaultTTL;
    constructor(redisClient: RedisClient, options?: {
        maxMemorySize?: number;
        defaultTTL?: number;
    });
    /**
     * Get value from cache (cache-aside pattern)
     * Checks memory first, then Redis, then calls fetcher
     */
    get<T>(key: string, fetcher?: () => Promise<T>, ttl?: number): Promise<T | null>;
    /**
     * Set value in cache (both layers)
     */
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    /**
     * Delete from cache (both layers)
     */
    delete(key: string): Promise<void>;
    /**
     * Delete by pattern (Redis only - memory cache doesn't support patterns efficiently)
     */
    deletePattern(pattern: string): Promise<void>;
    /**
     * Clear all cache (both layers)
     */
    clear(): Promise<void>;
    /**
     * Set value in memory cache
     */
    private setMemory;
    /**
     * Simple pattern matching (supports * wildcard)
     */
    private matchPattern;
}
//# sourceMappingURL=MultiLayerCache.d.ts.map