/**
 * Vectorization types for generating embeddings for Shards
 */

/**
 * Supported embedding models
 */
export enum EmbeddingModel {
  // Azure OpenAI models
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',
  
  // OpenAI models (fallback)
  OPENAI_ADA_002 = 'openai-ada-002',
  
  // Future: Other providers
  COHERE_EMBED_MULTILINGUAL = 'cohere-embed-multilingual',
}

/**
 * Embedding model metadata
 */
export interface EmbeddingModelInfo {
  name: EmbeddingModel;
  dimensions: number;
  maxTokens: number;
  costPer1KTokens?: number; // USD
  provider: 'azure-openai' | 'openai' | 'cohere' | 'custom';
}

/**
 * Embedding model configurations
 */
export const EMBEDDING_MODELS: Record<EmbeddingModel, EmbeddingModelInfo> = {
  [EmbeddingModel.TEXT_EMBEDDING_ADA_002]: {
    name: EmbeddingModel.TEXT_EMBEDDING_ADA_002,
    dimensions: 1536,
    maxTokens: 8191,
    costPer1KTokens: 0.0001,
    provider: 'azure-openai',
  },
  [EmbeddingModel.TEXT_EMBEDDING_3_SMALL]: {
    name: EmbeddingModel.TEXT_EMBEDDING_3_SMALL,
    dimensions: 1536,
    maxTokens: 8191,
    costPer1KTokens: 0.00002,
    provider: 'azure-openai',
  },
  [EmbeddingModel.TEXT_EMBEDDING_3_LARGE]: {
    name: EmbeddingModel.TEXT_EMBEDDING_3_LARGE,
    dimensions: 3072,
    maxTokens: 8191,
    costPer1KTokens: 0.00013,
    provider: 'azure-openai',
  },
  [EmbeddingModel.OPENAI_ADA_002]: {
    name: EmbeddingModel.OPENAI_ADA_002,
    dimensions: 1536,
    maxTokens: 8191,
    costPer1KTokens: 0.0001,
    provider: 'openai',
  },
  [EmbeddingModel.COHERE_EMBED_MULTILINGUAL]: {
    name: EmbeddingModel.COHERE_EMBED_MULTILINGUAL,
    dimensions: 768,
    maxTokens: 512,
    provider: 'cohere',
  },
};

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
  FIXED_SIZE = 'fixed_size', // Split by character count
  SENTENCE = 'sentence', // Split by sentences
  PARAGRAPH = 'paragraph', // Split by paragraphs
  SEMANTIC = 'semantic', // Smart semantic chunking
  NONE = 'none', // No chunking
}

/**
 * Text extraction source
 */
export interface TextSource {
  field: string; // Field path (e.g., 'title', 'content', 'structuredData.description')
  weight?: number; // Importance weight (0-1, default: 1)
  prefix?: string; // Prefix to add to text (e.g., 'Title: ')
}

/**
 * Vectorization configuration
 */
export interface VectorizationConfig {
  model: EmbeddingModel;
  chunkingStrategy: ChunkingStrategy;
  chunkSize?: number; // For fixed_size chunking (default: 512 tokens)
  chunkOverlap?: number; // Overlap between chunks (default: 50 tokens)
  textSources: TextSource[]; // Fields to extract text from
  combineChunks?: boolean; // Combine chunks into single embedding (default: false)
  enabled?: boolean; // Auto-vectorize on create/update (default: false)
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
  enabled: false,
};

/**
 * Vectorization job
 */
export interface VectorizationJob {
  id: string;
  tenantId: string;
  shardId: string;
  shardTypeId: string;
  status: VectorizationStatus;
  config: VectorizationConfig;
  priority?: number; // Higher = more urgent (default: 0)
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
  maxRetries?: number; // Default: 3
}

/**
 * Vectorization result
 */
export interface VectorizationResult {
  vectorCount: number; // Number of vectors generated
  totalTokens: number; // Total tokens processed
  chunksProcessed: number; // Number of text chunks
  model: EmbeddingModel;
  dimensions: number;
  executionTimeMs: number;
  cost?: number; // Estimated cost in USD
}

/**
 * Text chunk for vectorization
 */
export interface TextChunk {
  id: string;
  text: string;
  source: string; // Field path
  weight: number;
  startIndex: number; // Position in original text
  endIndex: number;
  tokenCount: number;
}

/**
 * Vectorization request
 */
export interface VectorizeShardRequest {
  shardId: string;
  tenantId: string;
  config?: Partial<VectorizationConfig>; // Override default config
  priority?: number;
  force?: boolean; // Re-vectorize even if already vectorized
}

/**
 * Vectorization status response
 */
export interface VectorizationStatusResponse {
  jobId: string;
  shardId: string;
  status: VectorizationStatus;
  progress?: number; // 0-100 percentage
  result?: VectorizationResult;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionTime?: string; // ISO 8601
}

/**
 * Batch vectorization request
 */
export interface BatchVectorizeRequest {
  tenantId: string;
  shardIds?: string[]; // Specific shards to vectorize
  filter?: {
    shardTypeId?: string;
    status?: string;
    updatedAfter?: Date;
    missingVectors?: boolean; // Only shards without vectors
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
 * Vectorization queue metrics
 */
export interface VectorizationMetrics {
  queueSize: number; // Jobs in queue
  inProgress: number; // Jobs currently processing
  completed24h: number; // Jobs completed in last 24 hours
  failed24h: number; // Jobs failed in last 24 hours
  avgProcessingTimeMs: number;
  totalTokensProcessed24h: number;
  estimatedCost24h?: number; // USD
}

/**
 * Vectorization error codes
 */
export enum VectorizationErrorCode {
  SHARD_NOT_FOUND = 'SHARD_NOT_FOUND',
  INVALID_CONFIG = 'INVALID_CONFIG',
  TEXT_EXTRACTION_FAILED = 'TEXT_EXTRACTION_FAILED',
  CHUNKING_FAILED = 'CHUNKING_FAILED',
  EMBEDDING_API_ERROR = 'EMBEDDING_API_ERROR',
  EMBEDDING_API_RATE_LIMIT = 'EMBEDDING_API_RATE_LIMIT',
  EMBEDDING_API_QUOTA_EXCEEDED = 'EMBEDDING_API_QUOTA_EXCEEDED',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  JOB_CANCELLED = 'JOB_CANCELLED',
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
  }
}

/**
 * Token estimation (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for token count
 */
export function calculateEmbeddingCost(tokenCount: number, model: EmbeddingModel): number {
  const modelInfo = EMBEDDING_MODELS[model];
  if (!modelInfo.costPer1KTokens) {
    return 0;
  }
  return (tokenCount / 1000) * modelInfo.costPer1KTokens;
}

/**
 * Validate vectorization configuration
 */
export function validateVectorizationConfig(config: VectorizationConfig): string[] {
  const errors: string[] = [];

  if (!config.model) {
    errors.push('Embedding model is required');
  }

  if (!config.textSources || config.textSources.length === 0) {
    errors.push('At least one text source is required');
  }

  if (config.chunkingStrategy === ChunkingStrategy.FIXED_SIZE) {
    if (!config.chunkSize || config.chunkSize <= 0) {
      errors.push('Chunk size must be greater than 0 for fixed_size chunking');
    }

    const modelInfo = EMBEDDING_MODELS[config.model];
    if (config.chunkSize && config.chunkSize > modelInfo.maxTokens) {
      errors.push(`Chunk size (${config.chunkSize}) exceeds model max tokens (${modelInfo.maxTokens})`);
    }
  }

  for (const source of config.textSources || []) {
    if (!source.field) {
      errors.push('Text source field is required');
    }
    if (source.weight !== undefined && (source.weight < 0 || source.weight > 1)) {
      errors.push(`Text source weight must be between 0 and 1 (got ${source.weight})`);
    }
  }

  return errors;
}
