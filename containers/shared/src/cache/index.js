/**
 * Cache utilities
 * @module @coder/shared/cache
 */
import { RedisClient } from './RedisClient';
import { MultiLayerCache } from './MultiLayerCache';
// Singleton instances
let redisClient = null;
let multiLayerCache = null;
/**
 * Get or create Redis client
 */
export function getRedisClient(config) {
    if (!redisClient) {
        redisClient = RedisClient.getInstance(config);
    }
    return redisClient;
}
/**
 * Get or create multi-layer cache
 */
export function getCache(options) {
    if (!multiLayerCache) {
        const client = getRedisClient();
        multiLayerCache = new MultiLayerCache(client, options);
    }
    return multiLayerCache;
}
/**
 * Initialize cache connection
 */
export async function connectCache(config) {
    const client = getRedisClient(config);
    await client.getClient();
}
/**
 * Disconnect from cache
 */
export async function disconnectCache() {
    if (redisClient) {
        await redisClient.disconnect();
        redisClient = null;
        multiLayerCache = null;
    }
}
export { RedisClient, MultiLayerCache };
//# sourceMappingURL=index.js.map