/**
 * Vector search types and interfaces
 * Supports semantic and hybrid search with caching
 */
import type { Shard } from './shard.types.js';
/**
 * Vector search type
 */
export declare enum VectorSearchType {
    SEMANTIC = "semantic",// Pure vector similarity search
    HYBRID = "hybrid"
}
/**
 * Vector search similarity metric
 */
export declare enum SimilarityMetric {
    COSINE = "cosine",// Cosine similarity (default)
    DOT_PRODUCT = "dotProduct",// Dot product
    EUCLIDEAN = "euclidean"
}
/**
 * Vector search filter options
 */
export interface VectorSearchFilter {
    tenantId: string;
    projectId?: string;
    shardTypeId?: string;
    shardTypeIds?: string[];
    userId?: string;
    status?: string;
    tags?: string[];
    category?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    metadata?: Record<string, any>;
}
/**
 * Vector search request for semantic search
 */
export interface VectorSearchRequest {
    query: string;
    filter?: VectorSearchFilter;
    topK?: number;
    minScore?: number;
    similarityMetric?: SimilarityMetric;
    includeEmbedding?: boolean;
    fields?: string[];
}
/**
 * Hybrid search request (keyword + vector)
 */
export interface HybridSearchRequest extends VectorSearchRequest {
    keywordWeight?: number;
    vectorWeight?: number;
    keywordFields?: string[];
}
/**
 * Citation information for a search result (Phase 2)
 */
export interface Citation {
    shardId: string;
    shardTypeId: string;
    shardTypeName?: string;
    shardName: string;
    excerpt?: string;
    field?: string;
    pageNumber?: number;
    url?: string;
}
/**
 * Vector search result item
 * Phase 2: Enhanced with citations and freshness
 */
export interface VectorSearchResult {
    shard: Shard;
    score: number;
    distance?: number;
    embedding?: number[];
    highlights?: Record<string, string[]>;
    explanation?: string;
    citation?: Citation;
    freshness?: {
        createdAt: Date;
        updatedAt: Date;
        lastActivityAt?: Date;
        ageDays: number;
    };
}
/**
 * Vector search response
 */
export interface VectorSearchResponse {
    results: VectorSearchResult[];
    totalCount: number;
    query: string;
    queryEmbedding?: number[];
    searchType: VectorSearchType;
    fromCache: boolean;
    cacheKey?: string;
    executionTimeMs: number;
    metadata?: {
        topK: number;
        minScore?: number;
        similarityMetric: SimilarityMetric;
        filtersApplied: string[];
    };
}
/**
 * Query hash input for cache key generation
 */
export interface QueryHashInput {
    query: string;
    filter?: VectorSearchFilter;
    topK?: number;
    minScore?: number;
    similarityMetric?: SimilarityMetric;
    searchType: VectorSearchType;
    keywordWeight?: number;
    vectorWeight?: number;
    keywordFields?: string[];
}
/**
 * Cached vector search result
 */
export interface CachedVectorSearchResult {
    response: VectorSearchResponse;
    cachedAt: Date;
    ttl: number;
    queryHash: string;
}
/**
 * Vector search cache entry
 */
export interface VectorSearchCacheEntry {
    results: VectorSearchResult[];
    totalCount: number;
    queryEmbedding?: number[];
    metadata: {
        topK: number;
        minScore?: number;
        similarityMetric: SimilarityMetric;
        filtersApplied: string[];
    };
    cachedAt: string;
    expiresAt: string;
}
/**
 * Vector search statistics
 */
export interface VectorSearchStats {
    totalSearches: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
    averageExecutionTimeMs: number;
    averageResultCount: number;
    totalCacheKeys: number;
    cacheMemoryBytes?: number;
}
/**
 * Embedding generation request
 */
export interface EmbeddingRequest {
    text: string;
    model?: string;
    dimensions?: number;
}
/**
 * Embedding generation response
 */
export interface EmbeddingResponse {
    embedding: number[];
    model: string;
    dimensions: number;
    tokenCount?: number;
}
/**
 * Cosmos DB vector search query
 * For direct Cosmos DB integration
 */
export interface CosmosVectorQuery {
    embedding: number[];
    path: string;
    k: number;
    similarityMetric?: 'cosine' | 'dotProduct' | 'euclidean';
}
/**
 * Vector search cache invalidation options
 */
export interface VectorSearchCacheInvalidation {
    tenantId: string;
    shardId?: string;
    shardTypeId?: string;
    invalidateAll?: boolean;
}
/**
 * Vector search error
 */
export declare class VectorSearchError extends Error {
    code: string;
    statusCode: number;
    details?: any | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: any | undefined);
}
/**
 * Embedding generation error
 */
export declare class EmbeddingError extends Error {
    code: string;
    statusCode: number;
    details?: any | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: any | undefined);
}
/**
 * Helper function to generate consistent query hash
 */
export declare function generateQueryHash(input: QueryHashInput): string;
/**
 * Helper function to build cache key for vector search
 */
export declare function buildVectorSearchCacheKey(tenantId: string, queryHash: string): string;
/**
 * Helper function to build invalidation pattern for tenant's vector searches
 */
export declare function buildVectorSearchInvalidationPattern(tenantId: string): string;
//# sourceMappingURL=vector-search.types.d.ts.map