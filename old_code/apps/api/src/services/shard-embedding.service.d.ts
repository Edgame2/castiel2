/**
 * Shard Embedding Service
 *
 * Connects the embedding template system with actual embedding generation.
 * This service orchestrates:
 * 1. Template retrieval (per shard type)
 * 2. Text extraction with field weighting
 * 3. Preprocessing (chunking, normalization)
 * 4. Embedding generation (Azure OpenAI)
 * 5. Vector normalization
 * 6. Storage in Cosmos DB
 */
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Shard } from '../types/shard.types.js';
import { EmbeddingTemplateService } from './embedding-template.service.js';
import { EmbeddingService } from './ai-insights/embedding.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { EmbeddingContentHashCacheService } from './embedding-content-hash-cache.service.js';
export interface EmbeddingGenerationResult {
    shardId: string;
    vectorsGenerated: number;
    templateUsed: string;
    isDefaultTemplate: boolean;
    processingTimeMs: number;
    tokensUsed?: number;
}
export interface RegenerationResult {
    shardTypeId: string;
    totalShards: number;
    processed: number;
    failed: number;
    skipped: number;
    durationMs: number;
}
/**
 * Service for generating and managing shard embeddings using templates
 */
export declare class ShardEmbeddingService {
    private embeddingTemplateService;
    private embeddingService;
    private shardTypeRepository;
    private shardRepository;
    private monitoring;
    private embeddingCache?;
    constructor(embeddingTemplateService: EmbeddingTemplateService, embeddingService: EmbeddingService, shardTypeRepository: ShardTypeRepository, shardRepository: ShardRepository, monitoring: IMonitoringProvider, embeddingCache?: EmbeddingContentHashCacheService | undefined);
    /**
     * Generate embeddings for a shard using its type's template
     * This is the main entry point for embedding generation
     */
    generateEmbeddingsForShard(shard: Shard, tenantId: string, options?: {
        forceRegenerate?: boolean;
        maxChunks?: number;
    }): Promise<EmbeddingGenerationResult>;
    /**
     * Get embedding status for a shard
     */
    getEmbeddingStatus(shardId: string, tenantId: string): Promise<{
        hasEmbeddings: boolean;
        vectorCount: number;
        latestVectorDate?: Date;
        oldestVectorDate?: Date;
        isRecent: boolean;
        model?: string;
        dimensions?: number;
    }>;
    /**
     * Get embedding generation history for a shard (from embedding jobs)
     */
    getEmbeddingHistory(shardId: string, tenantId: string, limit?: number): Promise<Array<{
        jobId: string;
        status: string;
        createdAt: Date;
        completedAt?: Date;
        error?: string;
        retryCount: number;
    }>>;
    /**
     * Validate embedding quality for a shard
     */
    validateEmbeddingQuality(shardId: string, tenantId: string): Promise<{
        isValid: boolean;
        issues: string[];
        metrics: {
            vectorCount: number;
            dimensions: number | null;
            isNormalized: boolean;
            hasValidModel: boolean;
            averageMagnitude: number | null;
        };
    }>;
    /**
     * Force regenerate embeddings for a single shard
     */
    regenerateEmbeddingsForShard(shardId: string, tenantId: string): Promise<EmbeddingGenerationResult>;
    /**
     * Calculate content hash for extracted text
     * Includes template ID to ensure template changes trigger regeneration
     */
    private calculateContentHash;
    /**
     * Check if shard has matching content hash (content unchanged)
     */
    private hasMatchingContentHash;
    /**
     * Check if shard has recent vectors (less than 7 days old)
     */
    private hasRecentVectors;
    /**
     * Re-generate embeddings for all shards of a specific type
     * Useful after updating a shard type's embedding template
     */
    regenerateEmbeddingsForShardType(shardTypeId: string, tenantId: string, options?: {
        batchSize?: number;
        maxShards?: number;
        forceRegenerate?: boolean;
    }): Promise<RegenerationResult>;
    /**
     * Batch generate embeddings for multiple shards
     * Useful for bulk operations or migrations
     */
    batchGenerateEmbeddings(shardIds: string[], tenantId: string, options?: {
        batchSize?: number;
        forceRegenerate?: boolean;
    }): Promise<{
        total: number;
        processed: number;
        failed: number;
        skipped: number;
    }>;
    /**
     * Get embedding statistics for a tenant
     */
    getEmbeddingStats(tenantId: string): Promise<{
        totalShards: number;
        shardsWithEmbeddings: number;
        totalVectors: number;
        averageVectorsPerShard: number;
        shardTypeStats: Array<{
            shardTypeId: string;
            totalShards: number;
            shardsWithEmbeddings: number;
            coveragePercent: number;
        }>;
    }>;
}
//# sourceMappingURL=shard-embedding.service.d.ts.map