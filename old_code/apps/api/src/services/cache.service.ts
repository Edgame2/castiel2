import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';

/**
 * Cache service with core operations and statistics tracking
 * Implements cache-aside pattern with automatic TTL management
 */
export class CacheService {
  private redis: Redis;
  private monitoring: IMonitoringProvider;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    errors: 0,
  };

  constructor(redis: Redis, monitoring: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;
  }

  /**
   * Get underlying Redis client
   * @returns Redis client instance
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.stats.misses++;
        this.monitoring.trackMetric('cache.miss', 1, { key });
        return null;
      }

      this.stats.hits++;
      this.monitoring.trackMetric('cache.hit', 1, { key });
      
      // Parse JSON if the value is a JSON string
      try {
        return JSON.parse(value) as T;
      } catch {
        // If parsing fails, return as-is (might be a plain string)
        return value as unknown as T;
      }
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.get',
        key,
      });
      // Return null on error (fail gracefully)
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      this.monitoring.trackMetric('cache.set', 1, { key, ttl });
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.set',
        key,
        ttl,
      });
      // Don't throw - fail gracefully
    }
  }

  /**
   * Delete value from cache
   * @param key Cache key
   * @returns Number of keys deleted
   */
  async delete(key: string): Promise<number> {
    try {
      const deleted = await this.redis.del(key);
      
      if (deleted > 0) {
        this.stats.evictions++;
        this.monitoring.trackMetric('cache.evict', deleted, { key });
      }

      return deleted;
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.delete',
        key,
      });
      return 0;
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Redis key pattern (e.g., "tenant:123:*")
   * @returns Number of keys deleted
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      this.stats.evictions += deleted;
      this.monitoring.trackMetric('cache.invalidatePattern', deleted, { pattern });

      return deleted;
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.invalidatePattern',
        pattern,
      });
      return 0;
    }
  }

  /**
   * Cache-aside pattern: Get from cache or fetch from database
   * @param key Cache key
   * @param fetchFn Function to fetch data if not in cache
   * @param ttl Time to live in seconds
   * @returns Cached or freshly fetched value
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from database
    try {
      const value = await fetchFn();
      
      // Cache the result
      await this.set(key, value, ttl);
      
      return value;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'cache.getOrFetch',
        key,
      });
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.exists',
        key,
      });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param key Cache key
   * @returns TTL in seconds, -1 if key has no expiry, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.ttl',
        key,
      });
      return -2;
    }
  }

  /**
   * Publish cache invalidation event to Redis pub/sub
   * @param channel Channel name
   * @param message Message payload
   */
  async publishInvalidation(channel: string, message: any): Promise<void> {
    try {
      const serialized = typeof message === 'string' ? message : JSON.stringify(message);
      await this.redis.publish(channel, serialized);
      this.monitoring.trackEvent('cache.publish', { channel });
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.publish',
        channel,
      });
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      errors: this.stats.errors,
      total,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      errors: 0,
    };
  }

  /**
   * Clear all cache keys (use with caution)
   * @returns Number of keys deleted
   */
  async clear(): Promise<number> {
    try {
      await this.redis.flushdb();
      this.monitoring.trackEvent('cache.clear');
      return 1;
    } catch (error) {
      this.stats.errors++;
      this.monitoring.trackException(error as Error, {
        operation: 'cache.clear',
      });
      return 0;
    }
  }

  /**
   * Check cache health
   * @returns True if cache is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }
}
