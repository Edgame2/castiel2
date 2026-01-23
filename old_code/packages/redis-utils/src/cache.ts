import type { RedisConnectionManager } from './connection.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { MetricNames } from '@castiel/monitoring';

/**
 * Cache Service
 * Provides high-level caching operations with automatic TTL management
 */
export class RedisCacheService {
  private connectionManager: RedisConnectionManager;
  private monitoring?: IMonitoringProvider;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(connectionManager: RedisConnectionManager, monitoring?: IMonitoringProvider) {
    this.connectionManager = connectionManager;
    this.monitoring = monitoring;
  }

  /**
   * Get a value from cache
   */
  async get<T = string>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const client = await this.connectionManager.getClient();
      const value = await client.get(key);
      const duration = Date.now() - startTime;

      if (!value) {
        // Cache miss
        this.missCount++;
        this.monitoring?.trackMetric(MetricNames.CACHE_MISS_COUNT, 1, { key });
        this.monitoring?.trackMetric(MetricNames.CACHE_OPERATION_DURATION, duration, { operation: 'get', result: 'miss' });
        return null;
      }

      // Cache hit
      this.hitCount++;
      this.monitoring?.trackMetric(MetricNames.CACHE_HIT_COUNT, 1, { key });
      this.monitoring?.trackMetric(MetricNames.CACHE_OPERATION_DURATION, duration, { operation: 'get', result: 'hit' });
      
      // Update hit rate
      const total = this.hitCount + this.missCount;
      if (total > 0) {
        const hitRate = this.hitCount / total;
        this.monitoring?.trackMetric(MetricNames.CACHE_HIT_RATE, hitRate, {});
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Cache] Error getting key ${key}:`, error);
      this.monitoring?.trackMetric(MetricNames.CACHE_OPERATION_DURATION, duration, { operation: 'get', result: 'error' });
      this.monitoring?.trackException(error as Error, { operation: 'cache.get', key });
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    try {
      const client = await this.connectionManager.getClient();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }

      const duration = Date.now() - startTime;
      this.monitoring?.trackMetric(MetricNames.CACHE_OPERATION_DURATION, duration, { operation: 'set', hasTtl: !!ttl });
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Cache] Error setting key ${key}:`, error);
      this.monitoring?.trackMetric(MetricNames.CACHE_OPERATION_DURATION, duration, { operation: 'set', result: 'error' });
      this.monitoring?.trackException(error as Error, { operation: 'cache.set', key });
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`[Cache] Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(...keys);
      return result;
    } catch (error) {
      console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Cache] Error checking key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = await this.connectionManager.getClient();
      const values = await client.mget(...keys);

      return values.map((value: string | null) => {
        if (!value) {
          return null;
        }

        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      console.error('[Cache] Error getting multiple keys:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once with TTL
   */
  async mset(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      const pipeline = client.pipeline();

      for (const entry of entries) {
        const serialized = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);

        if (entry.ttl) {
          pipeline.setex(entry.key, entry.ttl, serialized);
        } else {
          pipeline.set(entry.key, serialized);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('[Cache] Error setting multiple keys:', error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.incrby(key, by);
    } catch (error) {
      console.error(`[Cache] Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.decrby(key, by);
    } catch (error) {
      console.error(`[Cache] Error decrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiry on a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      const result = await client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`[Cache] Error setting expiry on key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.ttl(key);
    } catch (error) {
      console.error(`[Cache] Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      await client.flushdb();
      return true;
    } catch (error) {
      console.error('[Cache] Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Get cache metrics (hit rate, hit count, miss count)
   */
  getMetrics(): {
    hitCount: number;
    missCount: number;
    hitRate: number;
    totalRequests: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
      totalRequests: total,
    };
  }

  /**
   * Reset cache metrics counters
   */
  resetMetrics(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hits?: number;
    misses?: number;
    hitRate?: number;
    totalRequests?: number;
  }> {
    try {
      const client = await this.connectionManager.getClient();
      const info = await client.info('stats');
      const dbsize = await client.dbsize();

      // Parse info string for stats
      const stats: Record<string, string> = {};
      info.split('\r\n').forEach((line: string) => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      const redisHits = parseInt(stats['keyspace_hits'] || '0', 10);
      const redisMisses = parseInt(stats['keyspace_misses'] || '0', 10);
      const redisTotal = redisHits + redisMisses;
      const redisHitRate = redisTotal > 0 ? redisHits / redisTotal : 0;

      // Combine Redis stats with in-memory metrics
      const metrics = this.getMetrics();

      return {
        keys: dbsize,
        memory: stats['used_memory_human'] || 'unknown',
        hits: redisHits,
        misses: redisMisses,
        hitRate: metrics.totalRequests > 0 ? metrics.hitRate : redisHitRate,
        totalRequests: metrics.totalRequests > 0 ? metrics.totalRequests : redisTotal,
      };
    } catch (error) {
      console.error('[Cache] Error getting stats:', error);
      const metrics = this.getMetrics();
      return {
        keys: 0,
        memory: 'unknown',
        hitRate: metrics.hitRate,
        totalRequests: metrics.totalRequests,
      };
    }
  }
}
