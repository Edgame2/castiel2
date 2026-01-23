/**
 * Embedding Content Hash Cache Service
 * 
 * Caches embeddings by content hash to avoid regenerating the same content.
 * This saves costs and improves performance when the same content appears
 * in multiple shards or is regenerated.
 */

import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { IMonitoringProvider } from '@castiel/monitoring';

export interface CachedEmbedding {
  embedding: number[];
  model: string;
  dimensions: number;
  contentHash: string;
  cachedAt: Date;
}

const CACHE_KEY_PREFIX = 'embedding:hash:';
const STATS_KEY = 'embedding:cache:stats';
const DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Embedding Content Hash Cache Service
 */
export class EmbeddingContentHashCacheService {
  constructor(
    private redis: Redis | null,
    private monitoring: IMonitoringProvider,
    private ttl: number = DEFAULT_TTL
  ) {}

  /**
   * Calculate content hash for a text string
   */
  calculateContentHash(text: string, templateId?: string): string {
    const content = templateId ? `${templateId}:${text}` : text;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get cached embedding by content hash
   */
  async getCached(contentHash: string): Promise<CachedEmbedding | null> {
    if (!this.redis) {
      return null; // No cache available
    }

    try {
      const key = `${CACHE_KEY_PREFIX}${contentHash}`;
      const cached = await this.redis.get(key);

      if (!cached) {
        // Record cache miss
        await this.recordMiss();
        return null;
      }

      const parsed = JSON.parse(cached) as CachedEmbedding;
      
      // Convert cachedAt string back to Date
      parsed.cachedAt = new Date(parsed.cachedAt);

      // Track cache hit as custom metric for Grafana dashboard
      this.monitoring.trackMetric('ai_insights_cache_hit', 1, {
        cacheType: 'embedding-content-hash',
        contentHash,
      });

      // Update Redis stats
      await this.recordHit();

      this.monitoring.trackEvent('embedding-cache.hit', {
        contentHash,
      });

      return parsed;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.get',
        contentHash,
      });
      return null; // Fail gracefully
    }
  }

  /**
   * Get multiple cached embeddings by content hashes
   * Returns a map of contentHash -> CachedEmbedding
   */
  async getCachedBatch(contentHashes: string[]): Promise<Map<string, CachedEmbedding>> {
    const result = new Map<string, CachedEmbedding>();

    if (!this.redis || contentHashes.length === 0) {
      return result;
    }

    try {
      // Use MGET for batch retrieval
      const keys = contentHashes.map(hash => `${CACHE_KEY_PREFIX}${hash}`);
      const cached = await this.redis.mget(...keys);

      let hitCount = 0;
      for (let i = 0; i < contentHashes.length; i++) {
        const cachedValue = cached[i];
        if (cachedValue) {
          try {
            const parsed = JSON.parse(cachedValue) as CachedEmbedding;
            parsed.cachedAt = new Date(parsed.cachedAt);
            result.set(contentHashes[i], parsed);
            hitCount++;
          } catch (parseError) {
            // Skip invalid cache entries
            this.monitoring.trackException(parseError as Error, {
              operation: 'embedding-cache.parse',
              contentHash: contentHashes[i],
            });
          }
        }
      }

      // Track batch cache metrics for Grafana dashboard
      if (hitCount > 0) {
        this.monitoring.trackMetric('ai_insights_cache_hit', hitCount, {
          cacheType: 'embedding-content-hash',
          batch: true,
        });
        // Update Redis stats
        await this.recordHits(hitCount);
      }
      
      const missCount = contentHashes.length - hitCount;
      if (missCount > 0) {
        this.monitoring.trackMetric('ai_insights_cache_miss', missCount, {
          cacheType: 'embedding-content-hash',
          batch: true,
        });
        // Update Redis stats
        await this.recordMisses(missCount);
      }

      if (hitCount > 0) {
        this.monitoring.trackEvent('embedding-cache.batch-hit', {
          total: contentHashes.length,
          hits: hitCount,
          missRate: missCount / contentHashes.length,
        });
      }

      return result;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.getBatch',
        count: contentHashes.length,
      });
      return result; // Return partial results
    }
  }

  /**
   * Store embedding in cache by content hash
   */
  async setCached(
    contentHash: string,
    embedding: number[],
    model: string,
    dimensions: number
  ): Promise<void> {
    if (!this.redis) {
      return; // No cache available
    }

    try {
      const key = `${CACHE_KEY_PREFIX}${contentHash}`;
      const cached: CachedEmbedding = {
        embedding,
        model,
        dimensions,
        contentHash,
        cachedAt: new Date(),
      };

      await this.redis.setex(key, this.ttl, JSON.stringify(cached));

      this.monitoring.trackEvent('embedding-cache.stored', {
        contentHash,
        model,
        dimensions,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.set',
        contentHash,
      });
      // Fail silently - caching is not critical
    }
  }

  /**
   * Store multiple embeddings in cache
   */
  async setCachedBatch(
    entries: Array<{
      contentHash: string;
      embedding: number[];
      model: string;
      dimensions: number;
    }>
  ): Promise<void> {
    if (!this.redis || entries.length === 0) {
      return;
    }

    try {
      // Use pipeline for batch operations
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const key = `${CACHE_KEY_PREFIX}${entry.contentHash}`;
        const cached: CachedEmbedding = {
          embedding: entry.embedding,
          model: entry.model,
          dimensions: entry.dimensions,
          contentHash: entry.contentHash,
          cachedAt: new Date(),
        };
        pipeline.setex(key, this.ttl, JSON.stringify(cached));
      }

      await pipeline.exec();

      this.monitoring.trackEvent('embedding-cache.batch-stored', {
        count: entries.length,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.setBatch',
        count: entries.length,
      });
      // Fail silently - caching is not critical
    }
  }

  /**
   * Invalidate cached embedding by content hash
   */
  async invalidate(contentHash: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const key = `${CACHE_KEY_PREFIX}${contentHash}`;
      await this.redis.del(key);

      this.monitoring.trackEvent('embedding-cache.invalidated', {
        contentHash,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.invalidate',
        contentHash,
      });
    }
  }

  /**
   * Clear all cached embeddings (use with caution)
   */
  async clearAll(): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const pattern = `${CACHE_KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);

      this.monitoring.trackEvent('embedding-cache.cleared', {
        count: keys.length,
      });

      return keys.length;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.clearAll',
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    estimatedSizeMB: number;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    if (!this.redis) {
      return { totalKeys: 0, estimatedSizeMB: 0, hits: 0, misses: 0, hitRate: 0 };
    }

    try {
      const pattern = `${CACHE_KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      
      // Rough estimate: each embedding is ~6KB (1536 dimensions × 4 bytes + metadata)
      const estimatedSizeMB = (keys.length * 6) / 1024;

      // Get performance stats from Redis
      const stats = await this.redis.hgetall(STATS_KEY);
      const hits = parseInt(stats.hits || '0', 10);
      const misses = parseInt(stats.misses || '0', 10);
      const totalRequests = hits + misses;
      const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

      return {
        totalKeys: keys.length,
        estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
        hits,
        misses,
        hitRate: Math.round(hitRate * 10000) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.getStats',
      });
      return { totalKeys: 0, estimatedSizeMB: 0, hits: 0, misses: 0, hitRate: 0 };
    }
  }

  /**
   * Record a cache hit
   */
  private async recordHit(): Promise<void> {
    if (!this.redis) {return;}
    try {
      await this.redis.hincrby(STATS_KEY, 'hits', 1);
      await this.redis.expire(STATS_KEY, 90 * 24 * 60 * 60); // 90 days TTL
    } catch (error) {
      // Non-blocking - don't fail if stats update fails
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.recordHit',
      });
    }
  }

  /**
   * Record multiple cache hits
   */
  private async recordHits(count: number): Promise<void> {
    if (!this.redis || count === 0) {return;}
    try {
      await this.redis.hincrby(STATS_KEY, 'hits', count);
      await this.redis.expire(STATS_KEY, 90 * 24 * 60 * 60); // 90 days TTL
    } catch (error) {
      // Non-blocking - don't fail if stats update fails
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.recordHits',
      });
    }
  }

  /**
   * Record a cache miss
   */
  private async recordMiss(): Promise<void> {
    if (!this.redis) {return;}
    try {
      await this.redis.hincrby(STATS_KEY, 'misses', 1);
      await this.redis.expire(STATS_KEY, 90 * 24 * 60 * 60); // 90 days TTL
    } catch (error) {
      // Non-blocking - don't fail if stats update fails
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.recordMiss',
      });
    }
  }

  /**
   * Record multiple cache misses
   */
  private async recordMisses(count: number): Promise<void> {
    if (!this.redis || count === 0) {return;}
    try {
      await this.redis.hincrby(STATS_KEY, 'misses', count);
      await this.redis.expire(STATS_KEY, 90 * 24 * 60 * 60); // 90 days TTL
    } catch (error) {
      // Non-blocking - don't fail if stats update fails
      this.monitoring.trackException(error as Error, {
        operation: 'embedding-cache.recordMisses',
      });
    }
  }
}

