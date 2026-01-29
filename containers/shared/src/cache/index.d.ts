/**
 * Cache utilities
 * @module @coder/shared/cache
 */
import { RedisClient, RedisConfig } from './RedisClient';
import { MultiLayerCache } from './MultiLayerCache';
/**
 * Get or create Redis client
 */
export declare function getRedisClient(config?: RedisConfig): RedisClient;
/**
 * Get or create multi-layer cache
 */
export declare function getCache(options?: {
    maxMemorySize?: number;
    defaultTTL?: number;
}): MultiLayerCache;
/**
 * Initialize cache connection
 */
export declare function connectCache(config?: RedisConfig): Promise<void>;
/**
 * Disconnect from cache
 */
export declare function disconnectCache(): Promise<void>;
export type { RedisConfig };
export { RedisClient, MultiLayerCache };
//# sourceMappingURL=index.d.ts.map