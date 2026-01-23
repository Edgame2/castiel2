/**
 * Cache Service
 * Handles cache operations using Redis
 */

import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '@coder/shared/cache';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  CacheEntry,
  CacheStats,
  CacheOperation,
  CacheWarmingTask,
  CacheOptimizationReport,
  SetCacheEntryInput,
  GetCacheEntryInput,
  DeleteCacheEntryInput,
  InvalidateCachePatternInput,
  CreateCacheWarmingTaskInput,
  CacheHealthCheck,
} from '../types/cache.types';

export class CacheService {
  private stats: Map<string, CacheStats> = new Map(); // Key: tenantId:namespace

  /**
   * Build cache key with tenant and namespace
   */
  private buildKey(tenantId: string, key: string, namespace?: string): string {
    if (namespace) {
      return `tenant:${tenantId}:${namespace}:${key}`;
    }
    return `tenant:${tenantId}:${key}`;
  }

  /**
   * Get stats key
   */
  private getStatsKey(tenantId: string, namespace?: string): string {
    return namespace ? `${tenantId}:${namespace}` : tenantId;
  }

  /**
   * Update statistics
   */
  private updateStats(tenantId: string, namespace: string | undefined, hit: boolean, error: boolean = false): void {
    const statsKey = this.getStatsKey(tenantId, namespace);
    let stats = this.stats.get(statsKey);

    if (!stats) {
      stats = {
        namespace,
        hits: 0,
        misses: 0,
        evictions: 0,
        errors: 0,
        hitRate: 0,
        totalKeys: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.stats.set(statsKey, stats);
    }

    if (error) {
      stats.errors++;
    } else if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }

    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? stats.hits / total : 0;
    stats.updatedAt = new Date();
  }

  /**
   * Set cache entry
   */
  async set(input: SetCacheEntryInput): Promise<CacheEntry> {
    if (!input.tenantId || !input.key) {
      throw new BadRequestError('tenantId and key are required');
    }

    const redisClient = getRedisClient();
    const redis = await redisClient.getClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    const cacheKey = this.buildKey(input.tenantId, input.key, input.namespace);
    const entry: CacheEntry = {
      key: cacheKey,
      value: input.value,
      ttl: input.ttl,
      createdAt: new Date(),
      tenantId: input.tenantId,
      namespace: input.namespace,
    };

    if (input.ttl) {
      entry.expiresAt = new Date(Date.now() + input.ttl * 1000);
    }

    try {
      const serialized = JSON.stringify(input.value);
      if (input.ttl) {
        await redis.setEx(cacheKey, input.ttl, serialized);
      } else {
        await redis.set(cacheKey, serialized);
      }

      this.updateStats(input.tenantId, input.namespace, true);
      return entry;
    } catch (error: any) {
      this.updateStats(input.tenantId, input.namespace, false, true);
      throw new Error(`Failed to set cache entry: ${error.message}`);
    }
  }

  /**
   * Get cache entry
   */
  async get<T = any>(input: GetCacheEntryInput): Promise<T | null> {
    if (!input.tenantId || !input.key) {
      throw new BadRequestError('tenantId and key are required');
    }

    const redisClient = getRedisClient();
    const redis = await redisClient.getClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    const cacheKey = this.buildKey(input.tenantId, input.key, input.namespace);

    try {
      const value = await redis.get(cacheKey);
      if (value === null) {
        this.updateStats(input.tenantId, input.namespace, false);
        return null;
      }

      this.updateStats(input.tenantId, input.namespace, true);
      return JSON.parse(value) as T;
    } catch (error: any) {
      this.updateStats(input.tenantId, input.namespace, false, true);
      throw new Error(`Failed to get cache entry: ${error.message}`);
    }
  }

  /**
   * Delete cache entry
   */
  async delete(input: DeleteCacheEntryInput): Promise<void> {
    if (!input.tenantId || !input.key) {
      throw new BadRequestError('tenantId and key are required');
    }

    const redisClient = getRedisClient();
    const redis = await redisClient.getClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    const cacheKey = this.buildKey(input.tenantId, input.key, input.namespace);

    try {
      await redis.del(cacheKey);
    } catch (error: any) {
      throw new Error(`Failed to delete cache entry: ${error.message}`);
    }
  }

  /**
   * Invalidate cache pattern
   */
  async invalidatePattern(input: InvalidateCachePatternInput): Promise<number> {
    if (!input.tenantId || !input.pattern) {
      throw new BadRequestError('tenantId and pattern are required');
    }

    const redisClient = getRedisClient();
    const redis = await redisClient.getClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    // Build full pattern with tenant
    const fullPattern = input.namespace
      ? `tenant:${input.tenantId}:${input.namespace}:${input.pattern}`
      : `tenant:${input.tenantId}:${input.pattern}`;

    try {
      const keys = await redis.keys(fullPattern);
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redis.del(...keys);
      return deleted;
    } catch (error: any) {
      throw new Error(`Failed to invalidate cache pattern: ${error.message}`);
    }
  }

  /**
   * Clear all cache for tenant
   */
  async clear(tenantId: string, namespace?: string): Promise<number> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const pattern = namespace
      ? `tenant:${tenantId}:${namespace}:*`
      : `tenant:${tenantId}:*`;

    return this.invalidatePattern({ tenantId, pattern });
  }

  /**
   * Get cache statistics
   */
  async getStats(tenantId: string, namespace?: string): Promise<CacheStats> {
    const statsKey = this.getStatsKey(tenantId, namespace);
    let stats = this.stats.get(statsKey);

    if (!stats) {
      stats = {
        tenantId,
        namespace,
        hits: 0,
        misses: 0,
        evictions: 0,
        errors: 0,
        hitRate: 0,
        totalKeys: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Get actual key count from Redis
    const redisClient = getRedisClient();
    try {
      const redis = await redisClient.getClient();
      if (redis) {
        const pattern = namespace
          ? `tenant:${tenantId}:${namespace}:*`
          : `tenant:${tenantId}:*`;
        const keys = await redis.keys(pattern);
        stats.totalKeys = keys.length;
      }
    } catch (error) {
      // Ignore errors
    }

    return stats;
  }

  /**
   * Reset statistics
   */
  async resetStats(tenantId: string, namespace?: string): Promise<void> {
    const statsKey = this.getStatsKey(tenantId, namespace);
    this.stats.delete(statsKey);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<CacheHealthCheck> {
    const redisClient = getRedisClient();
    const startTime = Date.now();

    let connected = false;
    let latency: number | undefined;
    let error: string | undefined;

    try {
      const redis = await redisClient.getClient();
      if (redis) {
        await redis.ping();
        connected = true;
        latency = Date.now() - startTime;
      } else {
        error = 'Redis client not initialized';
      }
    } catch (err: any) {
      error = err.message;
    }

    // Get memory info
    let memoryUsed = 0;
    let memoryAvailable = 0;
    if (connected) {
      try {
        const redis = await redisClient.getClient();
        if (redis) {
          const info = await redis.info('memory');
        // Parse memory info (simplified)
        const usedMatch = info.match(/used_memory:(\d+)/);
        const maxMatch = info.match(/maxmemory:(\d+)/);
          if (usedMatch) memoryUsed = parseInt(usedMatch[1], 10);
          if (maxMatch) memoryAvailable = parseInt(maxMatch[1], 10);
        }
      } catch (err) {
        // Ignore errors
      }
    }

    // Aggregate stats
    let totalKeys = 0;
    let totalHits = 0;
    let totalMisses = 0;
    let totalErrors = 0;

    for (const stats of this.stats.values()) {
      totalKeys += stats.totalKeys;
      totalHits += stats.hits;
      totalMisses += stats.misses;
      totalErrors += stats.errors;
    }

    const totalRequests = totalHits + totalMisses;
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    const status = connected && !error ? 'healthy' : error ? 'unhealthy' : 'degraded';

    return {
      status,
      redis: {
        connected,
        latency,
        error,
      },
      memory: {
        used: memoryUsed,
        available: memoryAvailable,
        percentage: memoryAvailable > 0 ? (memoryUsed / memoryAvailable) * 100 : 0,
      },
      stats: {
        totalKeys,
        hitRate,
        errors: totalErrors,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Optimize cache (placeholder - would analyze and provide recommendations)
   */
  async optimize(tenantId: string, namespace?: string): Promise<CacheOptimizationReport> {
    const stats = await this.getStats(tenantId, namespace);
    const recommendations: CacheOptimizationReport['recommendations'] = [];

    // Analyze and provide recommendations
    if (stats.hitRate < 0.5) {
      recommendations.push({
        type: 'ttl_adjustment',
        priority: 'high',
        description: 'Low cache hit rate detected',
        impact: 'Increasing TTL for frequently accessed keys may improve hit rate',
        action: 'Review and adjust TTL values for frequently accessed data',
        estimatedSavings: {
          hitRateImprovement: 0.2,
        },
      });
    }

    if (stats.totalKeys > 10000) {
      recommendations.push({
        type: 'key_cleanup',
        priority: 'medium',
        description: 'Large number of cache keys detected',
        impact: 'Cleaning up expired or unused keys may free memory',
        action: 'Run cache cleanup to remove expired keys',
      });
    }

    return {
      id: uuidv4(),
      tenantId,
      namespace,
      recommendations,
      createdAt: new Date(),
      createdBy: 'system',
    };
  }
}

