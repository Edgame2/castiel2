/**
 * Vector search types and interfaces
 * Supports semantic and hybrid search with caching
 */

import type { Shard } from './shard.types.js';

/**
 * Vector search type
 */
export enum VectorSearchType {
  SEMANTIC = 'semantic', // Pure vector similarity search
  HYBRID = 'hybrid', // Combined keyword + vector search
}

/**
 * Vector search similarity metric
 */
export enum SimilarityMetric {
  COSINE = 'cosine', // Cosine similarity (default)
  DOT_PRODUCT = 'dotProduct', // Dot product
  EUCLIDEAN = 'euclidean', // Euclidean distance
}

/**
 * Vector search filter options
 */
export interface VectorSearchFilter {
  tenantId: string; // Required for multi-tenant isolation
  projectId?: string; // Filter by project (scopes to project-linked shards)
  shardTypeId?: string; // Filter by shard type
  shardTypeIds?: string[]; // Filter by multiple shard types
  userId?: string; // Filter by creator
  status?: string; // Filter by shard status
  tags?: string[]; // Filter by metadata tags
  category?: string; // Filter by metadata category
  createdAfter?: Date;
  createdBefore?: Date;
  metadata?: Record<string, any>; // Additional metadata filters
}

/**
 * Vector search request for semantic search
 */
export interface VectorSearchRequest {
  query: string; // Natural language query
  filter?: VectorSearchFilter; // Filters to apply
  topK?: number; // Number of results to return (default: 10, max: 100)
  minScore?: number; // Minimum similarity score (0-1)
  similarityMetric?: SimilarityMetric; // Similarity calculation method
  includeEmbedding?: boolean; // Include embedding in response (default: false)
  fields?: string[]; // Specific fields to return (default: all)
}

/**
 * Hybrid search request (keyword + vector)
 */
export interface HybridSearchRequest extends VectorSearchRequest {
  keywordWeight?: number; // Weight for keyword search (0-1, default: 0.3)
  vectorWeight?: number; // Weight for vector search (0-1, default: 0.7)
  keywordFields?: string[]; // Fields to search for keywords
}

/**
 * Citation information for a search result (Phase 2)
 */
export interface Citation {
  shardId: string;
  shardTypeId: string;
  shardTypeName?: string;
  shardName: string;
  excerpt?: string; // Relevant excerpt from the shard
  field?: string; // Which field was matched
  pageNumber?: number; // For document chunks
  url?: string; // External URL if applicable
}

/**
 * Vector search result item
 * Phase 2: Enhanced with citations and freshness
 */
export interface VectorSearchResult {
  shard: Shard; // The matching shard
  score: number; // Similarity score (0-1, higher is better)
  distance?: number; // Distance metric (if applicable)
  embedding?: number[]; // Query embedding (if requested)
  highlights?: Record<string, string[]>; // Keyword match highlights (hybrid only)
  explanation?: string; // Score explanation (for debugging)
  // Phase 2 enhancements
  citation?: Citation; // Citation information for LLM context
  freshness?: {
    createdAt: Date; // When the shard was created
    updatedAt: Date; // When the shard was last updated
    lastActivityAt?: Date; // Last significant activity
    ageDays: number; // Age in days (for freshness scoring)
  };
}

/**
 * Vector search response
 */
export interface VectorSearchResponse {
  results: VectorSearchResult[];
  totalCount: number; // Total matching results
  query: string; // Original query
  queryEmbedding?: number[]; // Query embedding (if requested)
  searchType: VectorSearchType;
  fromCache: boolean; // Whether results came from cache
  cacheKey?: string; // Cache key used (for debugging)
  executionTimeMs: number; // Query execution time
  metadata?: {
    topK: number;
    minScore?: number;
    similarityMetric: SimilarityMetric;
    filtersApplied: string[]; // Which filters were applied
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
  // Hybrid-specific
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
  ttl: number; // TTL in seconds
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
  cachedAt: string; // ISO date string
  expiresAt: string; // ISO date string
}

/**
 * Vector search statistics
 */
export interface VectorSearchStats {
  totalSearches: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number; // Percentage (0-100)
  averageExecutionTimeMs: number;
  averageResultCount: number;
  totalCacheKeys: number;
  cacheMemoryBytes?: number;
}

/**
 * Embedding generation request
 */
export interface EmbeddingRequest {
  text: string; // Text to embed
  model?: string; // Embedding model to use (default: text-embedding-ada-002)
  dimensions?: number; // Embedding dimensions (model-specific)
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
  path: string; // Path to vector field (e.g., "/vectors/0/embedding")
  k: number; // Number of results
  similarityMetric?: 'cosine' | 'dotProduct' | 'euclidean';
}

/**
 * Vector search cache invalidation options
 */
export interface VectorSearchCacheInvalidation {
  tenantId: string;
  shardId?: string; // Invalidate for specific shard updates
  shardTypeId?: string; // Invalidate for shard type updates
  invalidateAll?: boolean; // Invalidate all tenant's vector searches
}

/**
 * Vector search error
 */
export class VectorSearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'VectorSearchError';
  }
}

/**
 * Embedding generation error
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/**
 * Helper function to generate consistent query hash
 */
export function generateQueryHash(input: QueryHashInput): string {
  // Create a stable string representation
  const parts: string[] = [
    `type:${input.searchType}`,
    `query:${input.query.toLowerCase().trim()}`,
    `topK:${input.topK || 10}`,
    `metric:${input.similarityMetric || 'cosine'}`,
  ];

  if (input.minScore !== undefined) {
    parts.push(`minScore:${input.minScore}`);
  }

  if (input.filter) {
    if (input.filter.shardTypeId) {parts.push(`typeId:${input.filter.shardTypeId}`);}
    if (input.filter.shardTypeIds) {parts.push(`typeIds:${input.filter.shardTypeIds.sort().join(',')}`);}
    if (input.filter.userId) {parts.push(`userId:${input.filter.userId}`);}
    if (input.filter.status) {parts.push(`status:${input.filter.status}`);}
    if (input.filter.tags) {parts.push(`tags:${input.filter.tags.sort().join(',')}`);}
    if (input.filter.category) {parts.push(`category:${input.filter.category}`);}
  }

  // Hybrid-specific
  if (input.searchType === VectorSearchType.HYBRID) {
    if (input.keywordWeight !== undefined) {parts.push(`kwWeight:${input.keywordWeight}`);}
    if (input.vectorWeight !== undefined) {parts.push(`vWeight:${input.vectorWeight}`);}
    if (input.keywordFields) {parts.push(`kwFields:${input.keywordFields.sort().join(',')}`);}
  }

  // Simple hash: Use base64 of the joined string
  const hashInput = parts.join('|');
  return Buffer.from(hashInput).toString('base64').replace(/[=+/]/g, '');
}

/**
 * Helper function to build cache key for vector search
 */
export function buildVectorSearchCacheKey(tenantId: string, queryHash: string): string {
  return `tenant:${tenantId}:vsearch:${queryHash}`;
}

/**
 * Helper function to build invalidation pattern for tenant's vector searches
 */
export function buildVectorSearchInvalidationPattern(tenantId: string): string {
  return `tenant:${tenantId}:vsearch:*`;
}
