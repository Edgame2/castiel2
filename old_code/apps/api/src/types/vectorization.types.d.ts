/**
 * Vectorization types for generating embeddings for Shards
 */
/**
 * Supported embedding models
 */
export declare enum EmbeddingModel {
    TEXT_EMBEDDING_ADA_002 = "text-embedding-ada-002",
    TEXT_EMBEDDING_3_SMALL = "text-embedding-3-small",
    TEXT_EMBEDDING_3_LARGE = "text-embedding-3-large",
    OPENAI_ADA_002 = "openai-ada-002",
    COHERE_EMBED_MULTILINGUAL = "cohere-embed-multilingual"
}
/**
 * Embedding model metadata
 */
export interface EmbeddingModelInfo {
    name: EmbeddingModel;
    dimensions: number;
    maxTokens: number;
    costPer1KTokens?: number;
    provider: 'azure-openai' | 'openai' | 'cohere' | 'custom';
}
/**
 * Embedding model configurations
 */
export declare const EMBEDDING_MODELS: Record<EmbeddingModel, EmbeddingModelInfo>;
/**
 * Vectorization status
 */
export declare enum VectorizationStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
/**
 * Chunking strategy for large content
 */
export declare enum ChunkingStrategy {
    FIXED_SIZE = "fixed_size",// Split by character count
    SENTENCE = "sentence",// Split by sentences
    PARAGRAPH = "paragraph",// Split by paragraphs
    SEMANTIC = "semantic",// Smart semantic chunking
    NONE = "none"
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
    enabled?: boolean;
}
/**
 * Default vectorization configuration
 */
export declare const DEFAULT_VECTORIZATION_CONFIG: VectorizationConfig;
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
 * Text chunk for vectorization
 */
export interface TextChunk {
    id: string;
    text: string;
    source: string;
    weight: number;
    startIndex: number;
    endIndex: number;
    tokenCount: number;
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
    estimatedCompletionTime?: string;
}
/**
 * Batch vectorization request
 */
export interface BatchVectorizeRequest {
    tenantId: string;
    shardIds?: string[];
    filter?: {
        shardTypeId?: string;
        status?: string;
        updatedAfter?: Date;
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
 * Vectorization queue metrics
 */
export interface VectorizationMetrics {
    queueSize: number;
    inProgress: number;
    completed24h: number;
    failed24h: number;
    avgProcessingTimeMs: number;
    totalTokensProcessed24h: number;
    estimatedCost24h?: number;
}
/**
 * Vectorization error codes
 */
export declare enum VectorizationErrorCode {
    SHARD_NOT_FOUND = "SHARD_NOT_FOUND",
    INVALID_CONFIG = "INVALID_CONFIG",
    TEXT_EXTRACTION_FAILED = "TEXT_EXTRACTION_FAILED",
    CHUNKING_FAILED = "CHUNKING_FAILED",
    EMBEDDING_API_ERROR = "EMBEDDING_API_ERROR",
    EMBEDDING_API_RATE_LIMIT = "EMBEDDING_API_RATE_LIMIT",
    EMBEDDING_API_QUOTA_EXCEEDED = "EMBEDDING_API_QUOTA_EXCEEDED",
    MAX_RETRIES_EXCEEDED = "MAX_RETRIES_EXCEEDED",
    JOB_CANCELLED = "JOB_CANCELLED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
/**
 * Vectorization error
 */
export declare class VectorizationError extends Error {
    code: VectorizationErrorCode;
    statusCode: number;
    details?: any | undefined;
    constructor(message: string, code: VectorizationErrorCode, statusCode?: number, details?: any | undefined);
}
/**
 * Token estimation (rough approximation)
 */
export declare function estimateTokenCount(text: string): number;
/**
 * Calculate cost for token count
 */
export declare function calculateEmbeddingCost(tokenCount: number, model: EmbeddingModel): number;
/**
 * Validate vectorization configuration
 */
export declare function validateVectorizationConfig(config: VectorizationConfig): string[];
//# sourceMappingURL=vectorization.types.d.ts.map