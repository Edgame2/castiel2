/**
 * Vectorization types for generating embeddings for Shards
 */

/**
 * Supported embedding models
 */
export enum EmbeddingModel {
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
}

/**
 * Vectorization status
 */
export enum VectorizationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Chunking strategy for large content
 */
export enum ChunkingStrategy {
  FIXED_SIZE = 'fixed_size',
  SENTENCE = 'sentence',
  PARAGRAPH = 'paragraph',
  NONE = 'none',
}

/**
 * Text extraction source
 */
export interface TextSource {
  field: string;
  weight?: number;
  prefix?: string;
}

/**
 * Vectorization configuration
 */
export interface VectorizationConfig {
  model: EmbeddingModel;
  chunkingStrategy: ChunkingStrategy;
  chunkSize?: number;
  chunkOverlap?: number;
  textSources: TextSource[];
  combineChunks?: boolean;
}

/**
 * Default vectorization configuration
 */
export const DEFAULT_VECTORIZATION_CONFIG: VectorizationConfig = {
  model: EmbeddingModel.TEXT_EMBEDDING_ADA_002,
  chunkingStrategy: ChunkingStrategy.SENTENCE,
  chunkSize: 512,
  chunkOverlap: 50,
  textSources: [
    { field: 'structuredData', weight: 1.0 },
    { field: 'unstructuredData.text', weight: 0.8 },
  ],
  combineChunks: true,
};

/**
 * Vectorization job
 */
export interface VectorizationJob {
  id: string;
  tenantId: string;
  shardId: string;
  shardTypeId?: string;
  status: VectorizationStatus;
  config: VectorizationConfig;
  priority?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  result?: VectorizationResult;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Vectorization result
 */
export interface VectorizationResult {
  vectorCount: number;
  totalTokens: number;
  chunksProcessed: number;
  model: EmbeddingModel;
  dimensions: number;
  executionTimeMs: number;
  cost?: number;
}

/**
 * Vectorization request
 */
export interface VectorizeShardRequest {
  shardId: string;
  tenantId: string;
  config?: Partial<VectorizationConfig>;
  priority?: number;
  force?: boolean;
}

/**
 * Vectorization status response
 */
export interface VectorizationStatusResponse {
  jobId: string;
  shardId: string;
  status: VectorizationStatus;
  progress?: number;
  result?: VectorizationResult;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Batch vectorization request
 */
export interface BatchVectorizeRequest {
  tenantId: string;
  shardIds?: string[];
  filter?: {
    shardTypeId?: string;
    missingVectors?: boolean;
  };
  config?: Partial<VectorizationConfig>;
  priority?: number;
}

/**
 * Batch vectorization response
 */
export interface BatchVectorizeResponse {
  jobIds: string[];
  totalShards: number;
  estimatedCompletionTime?: string;
}

/**
 * Vectorization error codes
 */
export enum VectorizationErrorCode {
  SHARD_NOT_FOUND = 'SHARD_NOT_FOUND',
  INVALID_CONFIG = 'INVALID_CONFIG',
  TEXT_EXTRACTION_FAILED = 'TEXT_EXTRACTION_FAILED',
  EMBEDDING_API_ERROR = 'EMBEDDING_API_ERROR',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Vectorization error
 */
export class VectorizationError extends Error {
  constructor(
    message: string,
    public code: VectorizationErrorCode,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'VectorizationError';
    Error.captureStackTrace(this, this.constructor);
  }
}
