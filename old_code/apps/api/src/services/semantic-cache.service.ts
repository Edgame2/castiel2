/**
 * Semantic Cache Service
 * Caches AI responses based on semantic similarity of queries
 * Achieves 70-90% cost savings by reusing similar query results
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface CacheEntry {
  id: string;
  query: string;
  queryEmbedding: number[];
  response: string;
  metadata: CacheMetadata;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastHitAt?: Date;
}

export interface CacheMetadata {
  tenantId: string;
  userId?: string;
  insightType?: string;
  modelId?: string;
  contextHash?: string;
  tokensUsed?: number;
  latencyMs?: number;
  cost?: number;
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  avgLatencySavedMs: number;
  totalCostSaved: number;
  totalTokensSaved: number;
}

export interface SemanticSearchResult {
  entry: CacheEntry;
  similarity: number;
}

export interface CacheConfig {
  enabled: boolean;
  similarityThreshold: number; // 0.0 - 1.0, default 0.92
  ttlSeconds: number; // Default 24 hours
  maxEntries: number; // Per tenant
  minQueryLength: number;
  excludePatterns?: RegExp[];
}

const DEFAULT_CONFIG: CacheConfig = {
  enabled: true,
  similarityThreshold: 0.92, // 92% similarity required for cache hit
  ttlSeconds: 86400, // 24 hours
  maxEntries: 10000,
  minQueryLength: 10,
  excludePatterns: [
    /current time/i,
    /today's date/i,
    /latest news/i,
    /stock price/i,
  ],
};

// ============================================
// Service
// ============================================

export class SemanticCacheService {
  private config: CacheConfig;
  private readonly CACHE_PREFIX = 'ai:semantic:';
  private readonly INDEX_PREFIX = 'ai:semantic:idx:';
  private readonly STATS_PREFIX = 'ai:semantic:stats:';

  constructor(
    private readonly redis: Redis,
    private readonly monitoring: IMonitoringProvider,
    private readonly embeddingService: {
      embed: (text: string) => Promise<number[]>;
    },
    config?: Partial<CacheConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // Core Methods
  // ============================================

  /**
   * Look up a cached response for a query
   */
  async lookup(
    query: string,
    tenantId: string,
    context?: { insightType?: string; contextHash?: string }
  ): Promise<SemanticSearchResult | null> {
    if (!this.config.enabled) {return null;}
    if (!this.shouldCache(query)) {return null;}

    const startTime = Date.now();

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.embed(query);

      // Search for similar entries
      const result = await this.semanticSearch(
        tenantId,
        queryEmbedding,
        context
      );

      const latencyMs = Date.now() - startTime;

      if (result) {
        // Update hit count
        await this.recordHit(result.entry.id, tenantId);
        await this.updateStats(tenantId, 'hit', {
          latencySavedMs: result.entry.metadata.latencyMs || 0,
          costSaved: result.entry.metadata.cost || 0,
          tokensSaved: result.entry.metadata.tokensUsed || 0,
        });

        this.monitoring.trackEvent('semantic-cache.hit', {
          tenantId,
          similarity: result.similarity,
          latencyMs,
        });

        return result;
      }

      await this.updateStats(tenantId, 'miss');

      this.monitoring.trackEvent('semantic-cache.miss', {
        tenantId,
        latencyMs,
      });

      return null;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'semantic-cache.lookup',
        tenantId,
      });
      return null;
    }
  }

  /**
   * Store a response in the cache
   */
  async store(
    query: string,
    response: string,
    metadata: CacheMetadata
  ): Promise<string | null> {
    if (!this.config.enabled) {return null;}
    if (!this.shouldCache(query)) {return null;}

    try {
      // Generate embedding
      const queryEmbedding = await this.embeddingService.embed(query);

      // Create cache entry
      const entry: CacheEntry = {
        id: this.generateId(query, metadata.tenantId),
        query,
        queryEmbedding,
        response,
        metadata,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.ttlSeconds * 1000),
        hitCount: 0,
      };

      // Store in Redis
      const key = this.getCacheKey(entry.id, metadata.tenantId);
      await this.redis.setex(
        key,
        this.config.ttlSeconds,
        JSON.stringify(entry)
      );

      // Add to index for semantic search
      await this.addToIndex(entry, metadata.tenantId);

      // Enforce max entries limit
      await this.enforceMaxEntries(metadata.tenantId);

      this.monitoring.trackEvent('semantic-cache.stored', {
        tenantId: metadata.tenantId,
        entryId: entry.id,
      });

      return entry.id;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'semantic-cache.store',
        tenantId: metadata.tenantId,
      });
      return null;
    }
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(
    tenantId: string,
    options?: {
      entryId?: string;
      insightType?: string;
      contextHash?: string;
      olderThan?: Date;
    }
  ): Promise<number> {
    try {
      if (options?.entryId) {
        // Delete specific entry
        const key = this.getCacheKey(options.entryId, tenantId);
        await this.redis.del(key);
        await this.removeFromIndex(options.entryId, tenantId);
        return 1;
      }

      // Get all entries for tenant
      const indexKey = this.getIndexKey(tenantId);
      const entries = await this.redis.smembers(indexKey);
      let deleted = 0;

      for (const entryId of entries) {
        const key = this.getCacheKey(entryId, tenantId);
        const data = await this.redis.get(key);
        if (!data) {continue;}

        const entry: CacheEntry = JSON.parse(data);

        // Check filters
        if (options?.insightType && entry.metadata.insightType !== options.insightType) {
          continue;
        }
        if (options?.contextHash && entry.metadata.contextHash !== options.contextHash) {
          continue;
        }
        if (options?.olderThan && new Date(entry.createdAt) > options.olderThan) {
          continue;
        }

        await this.redis.del(key);
        await this.removeFromIndex(entryId, tenantId);
        deleted++;
      }

      this.monitoring.trackEvent('semantic-cache.invalidated', {
        tenantId,
        deleted,
      });

      return deleted;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'semantic-cache.invalidate',
        tenantId,
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(tenantId: string): Promise<CacheStats> {
    const statsKey = this.getStatsKey(tenantId);
    const stats = await this.redis.hgetall(statsKey);

    const hitCount = parseInt(stats.hitCount || '0', 10);
    const missCount = parseInt(stats.missCount || '0', 10);
    const total = hitCount + missCount;

    return {
      totalEntries: parseInt(stats.totalEntries || '0', 10),
      hitCount,
      missCount,
      hitRate: total > 0 ? hitCount / total : 0,
      avgLatencySavedMs: hitCount > 0
        ? parseFloat(stats.totalLatencySaved || '0') / hitCount
        : 0,
      totalCostSaved: parseFloat(stats.totalCostSaved || '0'),
      totalTokensSaved: parseInt(stats.totalTokensSaved || '0', 10),
    };
  }

  /**
   * Clear all cache for a tenant
   */
  async clearAll(tenantId: string): Promise<void> {
    const indexKey = this.getIndexKey(tenantId);
    const entries = await this.redis.smembers(indexKey);

    for (const entryId of entries) {
      const key = this.getCacheKey(entryId, tenantId);
      await this.redis.del(key);
    }

    await this.redis.del(indexKey);
    await this.redis.del(this.getStatsKey(tenantId));

    this.monitoring.trackEvent('semantic-cache.cleared', { tenantId });
  }

  // ============================================
  // Private Methods
  // ============================================

  private shouldCache(query: string): boolean {
    // Check minimum length
    if (query.length < this.config.minQueryLength) {return false;}

    // Check exclusion patterns
    for (const pattern of this.config.excludePatterns || []) {
      if (pattern.test(query)) {return false;}
    }

    return true;
  }

  private async semanticSearch(
    tenantId: string,
    queryEmbedding: number[],
    context?: { insightType?: string; contextHash?: string }
  ): Promise<SemanticSearchResult | null> {
    const indexKey = this.getIndexKey(tenantId);
    const entryIds = await this.redis.smembers(indexKey);

    let bestMatch: SemanticSearchResult | null = null;

    for (const entryId of entryIds) {
      const key = this.getCacheKey(entryId, tenantId);
      const data = await this.redis.get(key);
      if (!data) {continue;}

      const entry: CacheEntry = JSON.parse(data);

      // Check context filters if provided
      if (context?.insightType && entry.metadata.insightType !== context.insightType) {
        continue;
      }
      if (context?.contextHash && entry.metadata.contextHash !== context.contextHash) {
        continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, entry.queryEmbedding);

      if (similarity >= this.config.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry, similarity };
        }
      }
    }

    return bestMatch;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {return 0;}

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private async addToIndex(entry: CacheEntry, tenantId: string): Promise<void> {
    const indexKey = this.getIndexKey(tenantId);
    await this.redis.sadd(indexKey, entry.id);
    await this.redis.hincrby(this.getStatsKey(tenantId), 'totalEntries', 1);
  }

  private async removeFromIndex(entryId: string, tenantId: string): Promise<void> {
    const indexKey = this.getIndexKey(tenantId);
    await this.redis.srem(indexKey, entryId);
    await this.redis.hincrby(this.getStatsKey(tenantId), 'totalEntries', -1);
  }

  private async recordHit(entryId: string, tenantId: string): Promise<void> {
    const key = this.getCacheKey(entryId, tenantId);
    const data = await this.redis.get(key);
    if (!data) {return;}

    const entry: CacheEntry = JSON.parse(data);
    entry.hitCount++;
    entry.lastHitAt = new Date();

    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(entry));
    }
  }

  private async updateStats(
    tenantId: string,
    type: 'hit' | 'miss',
    savings?: { latencySavedMs?: number; costSaved?: number; tokensSaved?: number }
  ): Promise<void> {
    const statsKey = this.getStatsKey(tenantId);

    if (type === 'hit') {
      await this.redis.hincrby(statsKey, 'hitCount', 1);
      if (savings?.latencySavedMs) {
        await this.redis.hincrbyfloat(statsKey, 'totalLatencySaved', savings.latencySavedMs);
      }
      if (savings?.costSaved) {
        await this.redis.hincrbyfloat(statsKey, 'totalCostSaved', savings.costSaved);
      }
      if (savings?.tokensSaved) {
        await this.redis.hincrby(statsKey, 'totalTokensSaved', savings.tokensSaved);
      }
    } else {
      await this.redis.hincrby(statsKey, 'missCount', 1);
    }
  }

  private async enforceMaxEntries(tenantId: string): Promise<void> {
    const indexKey = this.getIndexKey(tenantId);
    const count = await this.redis.scard(indexKey);

    if (count <= this.config.maxEntries) {return;}

    // Get all entries and sort by hit count / age
    const entryIds = await this.redis.smembers(indexKey);
    const entries: Array<{ id: string; score: number }> = [];

    for (const entryId of entryIds) {
      const key = this.getCacheKey(entryId, tenantId);
      const data = await this.redis.get(key);
      if (!data) {continue;}

      const entry: CacheEntry = JSON.parse(data);
      // Score: hitCount + recency bonus
      const ageMs = Date.now() - new Date(entry.createdAt).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const score = entry.hitCount + (24 - Math.min(ageHours, 24)) / 24;

      entries.push({ id: entryId, score });
    }

    // Sort by score ascending (lowest scores first = evict these)
    entries.sort((a, b) => a.score - b.score);

    // Remove lowest scoring entries
    const toRemove = count - this.config.maxEntries;
    for (let i = 0; i < toRemove; i++) {
      const entryId = entries[i].id;
      const key = this.getCacheKey(entryId, tenantId);
      await this.redis.del(key);
      await this.redis.srem(indexKey, entryId);
    }
  }

  private generateId(query: string, tenantId: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${tenantId}:${query}`)
      .digest('hex')
      .substring(0, 16);
    return `cache_${hash}`;
  }

  private getCacheKey(entryId: string, tenantId: string): string {
    return `${this.CACHE_PREFIX}${tenantId}:${entryId}`;
  }

  private getIndexKey(tenantId: string): string {
    return `${this.INDEX_PREFIX}${tenantId}`;
  }

  private getStatsKey(tenantId: string): string {
    return `${this.STATS_PREFIX}${tenantId}`;
  }
}

// ============================================
// Factory
// ============================================

export function createSemanticCacheService(
  redis: Redis,
  monitoring: IMonitoringProvider,
  embeddingService: { embed: (text: string) => Promise<number[]> },
  config?: Partial<CacheConfig>
): SemanticCacheService {
  return new SemanticCacheService(redis, monitoring, embeddingService, config);
}











