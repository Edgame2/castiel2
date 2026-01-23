/**
 * Cache utilities
 * @module @coder/shared/cache
 */

import { RedisClient, RedisConfig } from './RedisClient';
import { MultiLayerCache } from './MultiLayerCache';

// Singleton instances
let redisClient: RedisClient | null = null;
let multiLayerCache: MultiLayerCache | null = null;

/**
 * Get or create Redis client
 */
export function getRedisClient(config?: RedisConfig): RedisClient {
  if (!redisClient) {
    redisClient = RedisClient.getInstance(config);
  }
  return redisClient;
}

/**
 * Get or create multi-layer cache
 */
export function getCache(options?: {
  maxMemorySize?: number;
  defaultTTL?: number;
}): MultiLayerCache {
  if (!multiLayerCache) {
    const client = getRedisClient();
    multiLayerCache = new MultiLayerCache(client, options);
  }
  return multiLayerCache;
}

/**
 * Initialize cache connection
 */
export async function connectCache(config?: RedisConfig): Promise<void> {
  const client = getRedisClient(config);
  await client.getClient();
}

/**
 * Disconnect from cache
 */
export async function disconnectCache(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
    multiLayerCache = null;
  }
}

// Re-export types and classes
export type { RedisConfig };
export { RedisClient, MultiLayerCache };
