/**
 * Multi-Layer Cache
 * Implements cache-aside pattern with in-memory + Redis layers
 * @module @coder/shared/cache
 */

import { RedisClient } from './RedisClient';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Multi-Layer Cache
 * Layer 1: In-memory (LRU, per service instance)
 * Layer 2: Redis (shared across instances)
 */
export class MultiLayerCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: RedisClient;
  private maxMemorySize: number;
  private defaultTTL: number;

  constructor(
    redisClient: RedisClient,
    options: {
      maxMemorySize?: number;
      defaultTTL?: number;
    } = {}
  ) {
    this.redisClient = redisClient;
    this.maxMemorySize = options.maxMemorySize || 1000; // Max 1000 entries in memory
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes default
  }

  /**
   * Get value from cache (cache-aside pattern)
   * Checks memory first, then Redis, then calls fetcher
   */
  async get<T>(
    key: string,
    fetcher?: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    // Layer 1: Check memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.value as T;
    }

    // Remove expired entry
    if (memoryEntry) {
      this.memoryCache.delete(key);
    }

    // Layer 2: Check Redis
    try {
      const redis = await this.redisClient.getClient();
      const cached = await redis.get(key);
      if (cached) {
        const value = JSON.parse(cached) as T;
        // Store in memory cache for faster access
        this.setMemory(key, value, ttl || this.defaultTTL);
        return value;
      }
    } catch (error) {
      // Redis error - continue to fetcher
      console.error('[Cache] Redis error:', error);
    }

    // Layer 3: Call fetcher if provided
    if (fetcher) {
      const value = await fetcher();
      // Store in both layers
      await this.set(key, value, ttl);
      return value;
    }

    return null;
  }

  /**
   * Set value in cache (both layers)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const ttlSeconds = ttl || this.defaultTTL;

    // Store in memory
    this.setMemory(key, value, ttlSeconds);

    // Store in Redis
    try {
      const redis = await this.redisClient.getClient();
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      // Redis error - continue (memory cache still works)
      console.error('[Cache] Redis set error:', error);
    }
  }

  /**
   * Delete from cache (both layers)
   */
  async delete(key: string): Promise<void> {
    // Remove from memory
    this.memoryCache.delete(key);

    // Remove from Redis
    try {
      const redis = await this.redisClient.getClient();
      await redis.del(key);
    } catch (error) {
      console.error('[Cache] Redis delete error:', error);
    }
  }

  /**
   * Delete by pattern (Redis only - memory cache doesn't support patterns efficiently)
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const redis = await this.redisClient.getClient();
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      // Also clear matching keys from memory cache
      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('[Cache] Redis deletePattern error:', error);
    }
  }

  /**
   * Clear all cache (both layers)
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    // Note: Redis flush is dangerous in production - only clear memory
    // For Redis, use deletePattern with specific patterns
  }

  /**
   * Set value in memory cache
   */
  private setMemory<T>(key: string, value: T, ttl: number): void {
    // Enforce memory limit (simple LRU - remove oldest entries)
    if (this.memoryCache.size >= this.maxMemorySize) {
      // Remove oldest expired entries first
      const now = Date.now();
      for (const [k, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt <= now) {
          this.memoryCache.delete(k);
          if (this.memoryCache.size < this.maxMemorySize) {
            break;
          }
        }
      }

      // If still at limit, remove oldest entry
      if (this.memoryCache.size >= this.maxMemorySize) {
        const firstKey = this.memoryCache.keys().next().value;
        if (firstKey) {
          this.memoryCache.delete(firstKey);
        }
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }
}

