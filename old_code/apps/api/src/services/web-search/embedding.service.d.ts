/**
 * Embedding Service
 *
 * Handles generating embeddings for text chunks using OpenAI's
 * text-embedding-3-small model for semantic search capabilities.
 */
import { SemanticChunk, EmbeddingResult } from './types.js';
/**
 * Embedding service configuration
 */
export interface EmbeddingConfig {
    apiKey: string;
    model?: string;
    batchSize?: number;
}
/**
 * Embedding model information
 */
interface ModelInfo {
    name: string;
    dimensions: number;
    costPer1mTokens: number;
}
export declare class EmbeddingService {
    private client;
    private config;
    private modelInfo;
    constructor(config: EmbeddingConfig);
    /**
     * Generate embedding for a single text string
     */
    embed(text: string): Promise<EmbeddingResult>;
    /**
     * Generate embeddings for a single chunk and update it
     */
    embedChunk(chunk: SemanticChunk): Promise<SemanticChunk>;
    /**
     * Generate embeddings for multiple texts (more efficient)
     */
    embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
    /**
     * Internal batch embedding with API call
     */
    private embedBatchInternal;
    /**
     * Embed multiple chunks (batch operation)
     */
    embedChunks(chunks: SemanticChunk[]): Promise<SemanticChunk[]>;
    /**
     * Distribute tokens across multiple texts
     * Simple heuristic: proportional to character count
     */
    private distributeTokens;
    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(embA: number[], embB: number[]): number;
    /**
     * Find most similar chunks given a query embedding
     */
    findSimilarChunks(queryEmbedding: number[], chunks: SemanticChunk[], limit?: number, threshold?: number): {
        chunk: SemanticChunk;
        similarity: number;
    }[];
    /**
     * Calculate cost in USD for embedding
     */
    private calculateCost;
    /**
     * Get estimated cost for embedding text
     * This is a rough estimate based on character count (~4 chars per token)
     */
    estimateCost(text: string | string[]): number;
    /**
     * Get embedding model information
     */
    getModelInfo(): ModelInfo;
    /**
     * List available models
     */
    static getAvailableModels(): string[];
    /**
     * Get model dimensions
     */
    static getModelDimensions(modelName: string): number;
}
export default EmbeddingService;
//# sourceMappingURL=embedding.service.d.ts.map