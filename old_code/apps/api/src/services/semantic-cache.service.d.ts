/**
 * Semantic Cache Service
 * Caches AI responses based on semantic similarity of queries
 * Achieves 70-90% cost savings by reusing similar query results
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
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
    similarityThreshold: number;
    ttlSeconds: number;
    maxEntries: number;
    minQueryLength: number;
    excludePatterns?: RegExp[];
}
export declare class SemanticCacheService {
    private readonly redis;
    private readonly monitoring;
    private readonly embeddingService;
    private config;
    private readonly CACHE_PREFIX;
    private readonly INDEX_PREFIX;
    private readonly STATS_PREFIX;
    constructor(redis: Redis, monitoring: IMonitoringProvider, embeddingService: {
        embed: (text: string) => Promise<number[]>;
    }, config?: Partial<CacheConfig>);
    /**
     * Look up a cached response for a query
     */
    lookup(query: string, tenantId: string, context?: {
        insightType?: string;
        contextHash?: string;
    }): Promise<SemanticSearchResult | null>;
    /**
     * Store a response in the cache
     */
    store(query: string, response: string, metadata: CacheMetadata): Promise<string | null>;
    /**
     * Invalidate cache entries
     */
    invalidate(tenantId: string, options?: {
        entryId?: string;
        insightType?: string;
        contextHash?: string;
        olderThan?: Date;
    }): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(tenantId: string): Promise<CacheStats>;
    /**
     * Clear all cache for a tenant
     */
    clearAll(tenantId: string): Promise<void>;
    private shouldCache;
    private semanticSearch;
    private cosineSimilarity;
    private addToIndex;
    private removeFromIndex;
    private recordHit;
    private updateStats;
    private enforceMaxEntries;
    private generateId;
    private getCacheKey;
    private getIndexKey;
    private getStatsKey;
}
export declare function createSemanticCacheService(redis: Redis, monitoring: IMonitoringProvider, embeddingService: {
    embed: (text: string) => Promise<number[]>;
}, config?: Partial<CacheConfig>): SemanticCacheService;
//# sourceMappingURL=semantic-cache.service.d.ts.map