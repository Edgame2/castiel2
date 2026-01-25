/**
 * Search Service types
 * Core data model for advanced search and vector search
 */

/**
 * Vector Search Result
 */
export interface VectorSearchResult {
  shardId: string;
  shardName?: string;
  shardTypeId: string;
  score: number; // Similarity score (0-1, higher is better)
  distance?: number; // Distance metric (if applicable)
  embedding?: number[]; // Query embedding (if requested)
  highlights?: Record<string, string[]>; // Keyword match highlights (hybrid only)
  explanation?: string; // Score explanation (for debugging)
  citation?: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    field?: string;
    url?: string;
  };
  freshness?: {
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt?: Date;
    ageDays: number;
  };
  // Full shard data (optional, for detailed results)
  shard?: any;
}

/**
 * Vector Search Response
 */
export interface VectorSearchResponse {
  results: VectorSearchResult[];
  query: string;
  queryEmbedding?: number[];
  totalResults: number;
  took: number; // Time in milliseconds
  metadata?: {
    model?: string;
    dimensions?: number;
    minScore?: number;
    maxScore?: number;
  };
}

/**
 * Vector Search Request
 */
export interface VectorSearchRequest {
  tenantId: string;
  userId: string;
  query: string;
  shardTypeIds?: string[];
  limit?: number; // 1-100, default: 10
  minScore?: number; // Minimum similarity score (0-1)
  includeEmbedding?: boolean;
  includeShard?: boolean;
  /** When true (default), apply field-weighted rerank if field_weight_boost > 0 */
  applyFieldWeights?: boolean;
  filters?: {
    shardTypeIds?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    tags?: string[];
  };
}

/**
 * Hybrid Search Request
 */
export interface HybridSearchRequest {
  tenantId: string;
  userId: string;
  query: string;
  shardTypeIds?: string[];
  limit?: number;
  minScore?: number;
  vectorWeight?: number; // 0-1, default: 0.7
  keywordWeight?: number; // 0-1, default: 0.3
  includeEmbedding?: boolean;
  includeShard?: boolean;
  applyFieldWeights?: boolean;
  filters?: VectorSearchRequest['filters'];
}

/**
 * Full-Text Search Request
 */
export interface FullTextSearchRequest {
  tenantId: string;
  userId: string;
  query: string;
  shardTypeIds?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  filters?: VectorSearchRequest['filters'];
}

/**
 * Full-Text Search Result
 */
export interface FullTextSearchResult {
  shardId: string;
  shardName?: string;
  shardTypeId: string;
  relevance: number;
  highlights?: Record<string, string[]>;
  shard?: any;
}

/**
 * Full-Text Search Response
 */
export interface FullTextSearchResponse {
  results: FullTextSearchResult[];
  query: string;
  totalResults: number;
  took: number;
  offset: number;
  limit: number;
}

/**
 * Search Query (for analytics)
 */
export interface SearchQuery {
  id: string;
  tenantId: string; // Partition key
  userId: string;
  query: string;
  searchType: 'vector' | 'hybrid' | 'fulltext';
  resultsCount: number;
  took: number; // milliseconds
  filters?: Record<string, any>;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Search Analytics
 */
export interface SearchAnalytics {
  tenantId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalQueries: number;
  uniqueQueries: number;
  averageResultsCount: number;
  averageResponseTime: number; // milliseconds
  bySearchType: {
    type: 'vector' | 'hybrid' | 'fulltext';
    count: number;
    averageResultsCount: number;
    averageResponseTime: number;
  }[];
  topQueries: {
    query: string;
    count: number;
    averageResultsCount: number;
  }[];
  topShardTypes: {
    shardTypeId: string;
    count: number;
    averageScore?: number;
  }[];
}

