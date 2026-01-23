/**
 * Vectorization types for generating embeddings for Shards
 */
/**
 * Supported embedding models
 */
export var EmbeddingModel;
(function (EmbeddingModel) {
    // Azure OpenAI models
    EmbeddingModel["TEXT_EMBEDDING_ADA_002"] = "text-embedding-ada-002";
    EmbeddingModel["TEXT_EMBEDDING_3_SMALL"] = "text-embedding-3-small";
    EmbeddingModel["TEXT_EMBEDDING_3_LARGE"] = "text-embedding-3-large";
    // OpenAI models (fallback)
    EmbeddingModel["OPENAI_ADA_002"] = "openai-ada-002";
    // Future: Other providers
    EmbeddingModel["COHERE_EMBED_MULTILINGUAL"] = "cohere-embed-multilingual";
})(EmbeddingModel || (EmbeddingModel = {}));
/**
 * Embedding model configurations
 */
export const EMBEDDING_MODELS = {
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
export var VectorizationStatus;
(function (VectorizationStatus) {
    VectorizationStatus["PENDING"] = "pending";
    VectorizationStatus["IN_PROGRESS"] = "in_progress";
    VectorizationStatus["COMPLETED"] = "completed";
    VectorizationStatus["FAILED"] = "failed";
    VectorizationStatus["CANCELLED"] = "cancelled";
})(VectorizationStatus || (VectorizationStatus = {}));
/**
 * Chunking strategy for large content
 */
export var ChunkingStrategy;
(function (ChunkingStrategy) {
    ChunkingStrategy["FIXED_SIZE"] = "fixed_size";
    ChunkingStrategy["SENTENCE"] = "sentence";
    ChunkingStrategy["PARAGRAPH"] = "paragraph";
    ChunkingStrategy["SEMANTIC"] = "semantic";
    ChunkingStrategy["NONE"] = "none";
})(ChunkingStrategy || (ChunkingStrategy = {}));
/**
 * Default vectorization configuration
 */
export const DEFAULT_VECTORIZATION_CONFIG = {
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
 * Vectorization error codes
 */
export var VectorizationErrorCode;
(function (VectorizationErrorCode) {
    VectorizationErrorCode["SHARD_NOT_FOUND"] = "SHARD_NOT_FOUND";
    VectorizationErrorCode["INVALID_CONFIG"] = "INVALID_CONFIG";
    VectorizationErrorCode["TEXT_EXTRACTION_FAILED"] = "TEXT_EXTRACTION_FAILED";
    VectorizationErrorCode["CHUNKING_FAILED"] = "CHUNKING_FAILED";
    VectorizationErrorCode["EMBEDDING_API_ERROR"] = "EMBEDDING_API_ERROR";
    VectorizationErrorCode["EMBEDDING_API_RATE_LIMIT"] = "EMBEDDING_API_RATE_LIMIT";
    VectorizationErrorCode["EMBEDDING_API_QUOTA_EXCEEDED"] = "EMBEDDING_API_QUOTA_EXCEEDED";
    VectorizationErrorCode["MAX_RETRIES_EXCEEDED"] = "MAX_RETRIES_EXCEEDED";
    VectorizationErrorCode["JOB_CANCELLED"] = "JOB_CANCELLED";
    VectorizationErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(VectorizationErrorCode || (VectorizationErrorCode = {}));
/**
 * Vectorization error
 */
export class VectorizationError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'VectorizationError';
    }
}
/**
 * Token estimation (rough approximation)
 */
export function estimateTokenCount(text) {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
}
/**
 * Calculate cost for token count
 */
export function calculateEmbeddingCost(tokenCount, model) {
    const modelInfo = EMBEDDING_MODELS[model];
    if (!modelInfo.costPer1KTokens) {
        return 0;
    }
    return (tokenCount / 1000) * modelInfo.costPer1KTokens;
}
/**
 * Validate vectorization configuration
 */
export function validateVectorizationConfig(config) {
    const errors = [];
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
//# sourceMappingURL=vectorization.types.js.map