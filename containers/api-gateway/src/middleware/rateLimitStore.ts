/**
 * Rate limit store abstraction
 * In-memory (default) or Redis for multi-instance gateway
 */

import { getRedisClient } from '@coder/shared/cache';

export interface RateLimitStoreResult {
  count: number;
  resetTime: number;
}

/**
 * Store interface for rate limit counters (in-memory or Redis)
 */
export interface IRateLimitStore {
  increment(key: string, timeWindowMs: number): Promise<RateLimitStoreResult>;
}

const inMemoryStore: Record<string, { count: number; resetTime: number }> = {};

/**
 * In-memory store (single instance). Used when Redis is not configured.
 */
export function createInMemoryStore(): IRateLimitStore {
  return {
    async increment(key: string, timeWindowMs: number): Promise<RateLimitStoreResult> {
      const now = Date.now();
      let entry = inMemoryStore[key];
      if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + timeWindowMs };
        inMemoryStore[key] = entry;
      }
      entry.count++;
      return { count: entry.count, resetTime: entry.resetTime };
    },
  };
}

const KEY_PREFIX = 'gateway_rl:';

/**
 * Redis store for shared rate limits across gateway instances.
 * Uses INCR + PEXPIRE; window is fixed from first request in the window.
 */
export function createRedisStore(redisUrl: string): IRateLimitStore {
  const redisClient = getRedisClient({ url: redisUrl });
  return {
    async increment(key: string, timeWindowMs: number): Promise<RateLimitStoreResult> {
      const redis = await redisClient.getClient();
      const fullKey = KEY_PREFIX + key;
      const count = await redis.incr(fullKey);
      const ttlMs = await redis.pttl(fullKey);
      if (ttlMs < 0) {
        await redis.pexpire(fullKey, timeWindowMs);
      }
      const resetTime = Date.now() + (ttlMs > 0 ? ttlMs : timeWindowMs);
      return { count, resetTime };
    },
  };
}
