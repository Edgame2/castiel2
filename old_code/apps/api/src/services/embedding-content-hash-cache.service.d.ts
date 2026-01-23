/**
 * Embedding Content Hash Cache Service
 *
 * Caches embeddings by content hash to avoid regenerating the same content.
 * This saves costs and improves performance when the same content appears
 * in multiple shards or is regenerated.
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface CachedEmbedding {
    embedding: number[];
    model: string;
    dimensions: number;
    contentHash: string;
    cachedAt: Date;
}
/**
 * Embedding Content Hash Cache Service
 */
export declare class EmbeddingContentHashCacheService {
    private redis;
    private monitoring;
    private ttl;
    constructor(redis: Redis | null, monitoring: IMonitoringProvider, ttl?: number);
    /**
     * Calculate content hash for a text string
     */
    calculateContentHash(text: string, templateId?: string): string;
    /**
     * Get cached embedding by content hash
     */
    getCached(contentHash: string): Promise<CachedEmbedding | null>;
    /**
     * Get multiple cached embeddings by content hashes
     * Returns a map of contentHash -> CachedEmbedding
     */
    getCachedBatch(contentHashes: string[]): Promise<Map<string, CachedEmbedding>>;
    /**
     * Store embedding in cache by content hash
     */
    setCached(contentHash: string, embedding: number[], model: string, dimensions: number): Promise<void>;
    /**
     * Store multiple embeddings in cache
     */
    setCachedBatch(entries: Array<{
        contentHash: string;
        embedding: number[];
        model: string;
        dimensions: number;
    }>): Promise<void>;
    /**
     * Invalidate cached embedding by content hash
     */
    invalidate(contentHash: string): Promise<void>;
    /**
     * Clear all cached embeddings (use with caution)
     */
    clearAll(): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        totalKeys: number;
        estimatedSizeMB: number;
        hits: number;
        misses: number;
        hitRate: number;
    }>;
    /**
     * Record a cache hit
     */
    private recordHit;
    /**
     * Record multiple cache hits
     */
    private recordHits;
    /**
     * Record a cache miss
     */
    private recordMiss;
    /**
     * Record multiple cache misses
     */
    private recordMisses;
}
//# sourceMappingURL=embedding-content-hash-cache.service.d.ts.map