/**
 * Vector Search Cache Service
 * Caches expensive vector query results in Redis
 * TTL: 30 minutes
 */
import type { Redis } from 'ioredis';
import type { VectorSearchResult, VectorSearchCacheInvalidation, VectorSearchStats } from '../types/vector-search.types.js';
import { SimilarityMetric } from '../types/vector-search.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Vector search cache service with Redis
 */
export declare class VectorSearchCacheService {
    private readonly redis;
    private readonly monitoring?;
    private cacheHits;
    private cacheMisses;
    private totalSearches;
    private totalInvalidations;
    constructor(redis: Redis, monitoring?: IMonitoringProvider | undefined);
    /**
     * Get cached vector search results
     */
    getCached(tenantId: string, queryHash: string): Promise<VectorSearchResult[] | null>;
    /**
     * Cache vector search results
     */
    setCached(tenantId: string, queryHash: string, results: VectorSearchResult[], metadata: {
        topK: number;
        minScore?: number;
        similarityMetric: SimilarityMetric;
        filtersApplied: string[];
    }, queryEmbedding?: number[]): Promise<void>;
    /**
     * Invalidate cache for a single query
     */
    invalidateQuery(tenantId: string, queryHash: string): Promise<void>;
    /**
     * Invalidate all vector search cache for a tenant
     */
    invalidateTenant(tenantId: string): Promise<number>;
    /**
     * Publish cache invalidation event to other instances
     */
    publishInvalidation(invalidation: VectorSearchCacheInvalidation): Promise<void>;
    /**
     * Handle invalidation event from pub/sub
     */
    private handleInvalidationEvent;
    /**
     * Get cache statistics
     */
    getStats(): Promise<VectorSearchStats>;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Check if cache is healthy
     */
    isHealthy(): Promise<boolean>;
    /**
     * Clear all vector search cache (use with caution!)
     */
    clearAll(): Promise<number>;
}
//# sourceMappingURL=vector-search-cache.service.d.ts.map