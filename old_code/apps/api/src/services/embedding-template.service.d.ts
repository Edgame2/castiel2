/**
 * Embedding Template Service
 *
 * Responsible for:
 * - Retrieving embedding templates for shard types
 * - Preprocessing shard data before embedding generation
 * - Applying field weighting and text extraction
 * - Normalizing embeddings post-generation
 * - Providing fallback to default template
 */
import type { Shard } from '../types/shard.types.js';
import type { ShardType } from '../types/shard-type.types.js';
import type { EmbeddingTemplate, EmbeddingPreprocessingConfig, EmbeddingNormalizationConfig, EmbeddingResult, ApplyTemplateOptions } from '../types/embedding-template.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
export declare class EmbeddingTemplateService {
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Get embedding template for a shard type
     * Falls back to default if not defined
     */
    getTemplate(shardType: ShardType): EmbeddingTemplate;
    /**
     * Extract text from shard data using template field configuration
     */
    extractText(shard: Shard, template: EmbeddingTemplate, options?: ApplyTemplateOptions): string;
    /**
     * Extract text from a specific field in structured data
     * Handles nested fields
     */
    private extractFieldText;
    /**
     * Convert any value to string representation
     */
    private valueToString;
    /**
     * Apply field-specific preprocessing
     */
    private preprocessFieldText;
    /**
     * Apply preprocessing to text before embedding
     * This includes chunking, normalization, etc.
     */
    preprocessText(text: string, config: EmbeddingPreprocessingConfig, options?: {
        contextPrefix?: string;
        applyPrefixToEachChunk?: boolean;
        separatorOverride?: string;
    }): {
        text: string;
        chunks: string[];
    };
    /**
     * Create chunks from text for embedding
     */
    private createChunks;
    /**
     * Apply L2 normalization to embedding vector
     */
    normalizeVector(embedding: number[]): number[];
    /**
     * Apply normalization config to embeddings
     */
    normalizeEmbedding(embedding: number[], config: EmbeddingNormalizationConfig): number[];
    /**
     * Create embedding result metadata
     */
    createEmbeddingResult(embedding: number[], template: EmbeddingTemplate, embeddedText: string, metadata: {
        model: string;
        tokenCount: number;
        processingTime?: number;
    }, chunks?: string[]): EmbeddingResult;
    /**
     * Validate template configuration
     */
    validateTemplate(template: EmbeddingTemplate): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get effective model ID for template
     */
    getModelId(template: EmbeddingTemplate, options?: ApplyTemplateOptions): string;
}
//# sourceMappingURL=embedding-template.service.d.ts.map