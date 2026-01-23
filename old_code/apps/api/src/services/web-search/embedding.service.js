/**
 * Embedding Service
 *
 * Handles generating embeddings for text chunks using OpenAI's
 * text-embedding-3-small model for semantic search capabilities.
 */
import { OpenAI } from 'openai';
// Model information (pricing as of 2024)
const MODELS = {
    'text-embedding-3-small': {
        name: 'text-embedding-3-small',
        dimensions: 1536,
        costPer1mTokens: 0.02, // $0.02 per 1M tokens
    },
    'text-embedding-3-large': {
        name: 'text-embedding-3-large',
        dimensions: 3072,
        costPer1mTokens: 0.13, // $0.13 per 1M tokens
    },
};
export class EmbeddingService {
    client;
    config;
    modelInfo;
    constructor(config) {
        this.client = new OpenAI({ apiKey: config.apiKey });
        this.config = {
            model: config.model || 'text-embedding-3-small',
            batchSize: config.batchSize || 100,
            ...config,
        };
        this.modelInfo = MODELS[this.config.model];
        if (!this.modelInfo) {
            throw new Error(`Unknown embedding model: ${this.config.model}`);
        }
    }
    // ========================================================================
    // Single Embedding
    // ========================================================================
    /**
     * Generate embedding for a single text string
     */
    async embed(text) {
        try {
            const response = await this.client.embeddings.create({
                model: this.config.model,
                input: text,
                encoding_format: 'float',
            });
            const embedding = response.data[0].embedding;
            const tokenCount = response.usage.prompt_tokens;
            const cost = this.calculateCost(tokenCount);
            return {
                text,
                embedding,
                model: this.config.model,
                tokenCount,
                cost,
                createdAt: new Date().toISOString(),
            };
        }
        catch (error) {
            throw new Error(`Failed to generate embedding: ${error}`);
        }
    }
    /**
     * Generate embeddings for a single chunk and update it
     */
    async embedChunk(chunk) {
        const result = await this.embed(chunk.content);
        return {
            ...chunk,
            embedding: result.embedding,
            embeddedAt: result.createdAt,
            embeddingCost: result.cost,
            tokenCount: result.tokenCount,
        };
    }
    // ========================================================================
    // Batch Embeddings
    // ========================================================================
    /**
     * Generate embeddings for multiple texts (more efficient)
     */
    async embedBatch(texts) {
        if (texts.length === 0) {
            return [];
        }
        // OpenAI API limits batch requests to 2048 by default
        const batchSize = Math.min(this.config.batchSize, 2048);
        const results = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchResults = await this.embedBatchInternal(batch);
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Internal batch embedding with API call
     */
    async embedBatchInternal(texts) {
        try {
            const response = await this.client.embeddings.create({
                model: this.config.model,
                input: texts,
                encoding_format: 'float',
            });
            const totalTokens = response.usage.prompt_tokens;
            const tokenCosts = this.distributeTokens(totalTokens, texts.length);
            return response.data.map((item, index) => ({
                text: texts[index],
                embedding: item.embedding,
                model: this.config.model,
                tokenCount: tokenCosts[index],
                cost: this.calculateCost(tokenCosts[index]),
                createdAt: new Date().toISOString(),
            }));
        }
        catch (error) {
            throw new Error(`Failed to generate batch embeddings: ${error}`);
        }
    }
    /**
     * Embed multiple chunks (batch operation)
     */
    async embedChunks(chunks) {
        if (chunks.length === 0) {
            return [];
        }
        // Extract text content
        const texts = chunks.map((c) => c.content);
        // Get embeddings
        const results = await this.embedBatch(texts);
        // Merge results back with chunks
        return chunks.map((chunk, index) => ({
            ...chunk,
            embedding: results[index].embedding,
            embeddedAt: results[index].createdAt,
            embeddingCost: results[index].cost,
            tokenCount: results[index].tokenCount,
        }));
    }
    /**
     * Distribute tokens across multiple texts
     * Simple heuristic: proportional to character count
     */
    distributeTokens(totalTokens, textCount) {
        // Simple distribution: divide evenly
        // In reality, should calculate per text length
        const baseTokens = Math.floor(totalTokens / textCount);
        const remainder = totalTokens % textCount;
        return Array(textCount)
            .fill(baseTokens)
            .map((val, i) => val + (i < remainder ? 1 : 0));
    }
    // ========================================================================
    // Similarity Search
    // ========================================================================
    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(embA, embB) {
        if (embA.length !== embB.length) {
            throw new Error('Embeddings must have the same dimension');
        }
        const dotProduct = embA.reduce((sum, a, i) => sum + a * embB[i], 0);
        const magnitudeA = Math.sqrt(embA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(embB.reduce((sum, b) => sum + b * b, 0));
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }
        return dotProduct / (magnitudeA * magnitudeB);
    }
    /**
     * Find most similar chunks given a query embedding
     */
    findSimilarChunks(queryEmbedding, chunks, limit = 5, threshold = 0.7) {
        const similarities = chunks
            .map((chunk) => ({
            chunk,
            similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
        }))
            .filter((item) => item.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        return similarities;
    }
    // ========================================================================
    // Cost Calculation
    // ========================================================================
    /**
     * Calculate cost in USD for embedding
     */
    calculateCost(tokenCount) {
        const costPer1mTokens = this.modelInfo.costPer1mTokens;
        return (tokenCount / 1_000_000) * costPer1mTokens;
    }
    /**
     * Get estimated cost for embedding text
     * This is a rough estimate based on character count (~4 chars per token)
     */
    estimateCost(text) {
        const totalChars = Array.isArray(text) ? text.reduce((sum, t) => sum + t.length, 0) : text.length;
        const estimatedTokens = Math.ceil(totalChars / 4); // Rough approximation
        return this.calculateCost(estimatedTokens);
    }
    /**
     * Get embedding model information
     */
    getModelInfo() {
        return this.modelInfo;
    }
    /**
     * List available models
     */
    static getAvailableModels() {
        return Object.keys(MODELS);
    }
    /**
     * Get model dimensions
     */
    static getModelDimensions(modelName) {
        const model = MODELS[modelName];
        if (!model) {
            throw new Error(`Unknown model: ${modelName}`);
        }
        return model.dimensions;
    }
}
export default EmbeddingService;
//# sourceMappingURL=embedding.service.js.map