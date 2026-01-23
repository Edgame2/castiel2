import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Cache service with core operations and statistics tracking
 * Implements cache-aside pattern with automatic TTL management
 */
export declare class CacheService {
    private redis;
    private monitoring;
    private stats;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Get underlying Redis client
     * @returns Redis client instance
     */
    getClient(): Redis;
    /**
     * Get value from cache
     * @param key Cache key
     * @returns Cached value or null if not found
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache with optional TTL
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Time to live in seconds (optional)
     */
    set(key: string, value: any, ttl?: number): Promise<void>;
    /**
     * Delete value from cache
     * @param key Cache key
     * @returns Number of keys deleted
     */
    delete(key: string): Promise<number>;
    /**
     * Delete all keys matching a pattern
     * @param pattern Redis key pattern (e.g., "tenant:123:*")
     * @returns Number of keys deleted
     */
    invalidatePattern(pattern: string): Promise<number>;
    /**
     * Cache-aside pattern: Get from cache or fetch from database
     * @param key Cache key
     * @param fetchFn Function to fetch data if not in cache
     * @param ttl Time to live in seconds
     * @returns Cached or freshly fetched value
     */
    getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<T>;
    /**
     * Check if key exists in cache
     * @param key Cache key
     * @returns True if key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get remaining TTL for a key
     * @param key Cache key
     * @returns TTL in seconds, -1 if key has no expiry, -2 if key doesn't exist
     */
    ttl(key: string): Promise<number>;
    /**
     * Publish cache invalidation event to Redis pub/sub
     * @param channel Channel name
     * @param message Message payload
     */
    publishInvalidation(channel: string, message: any): Promise<void>;
    /**
     * Get cache statistics
     * @returns Cache statistics object
     */
    getStats(): {
        hits: number;
        misses: number;
        evictions: number;
        errors: number;
        total: number;
        hitRate: string;
    };
    /**
     * Reset cache statistics
     */
    resetStats(): void;
    /**
     * Clear all cache keys (use with caution)
     * @returns Number of keys deleted
     */
    clear(): Promise<number>;
    /**
     * Check cache health
     * @returns True if cache is healthy
     */
    isHealthy(): Promise<boolean>;
}
//# sourceMappingURL=cache.service.d.ts.map