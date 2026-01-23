/**
 * Vectorization Service
 * Manages the vectorization of Shards with queue-based processing
 */
import { Container } from '@azure/cosmos';
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { VectorizeShardRequest, VectorizationStatusResponse, BatchVectorizeRequest, BatchVectorizeResponse } from '../types/vectorization.types.js';
import { AzureOpenAIService } from './azure-openai.service.js';
import { VectorSearchCacheService } from './vector-search-cache.service.js';
import { ShardEmbeddingService } from './shard-embedding.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Vectorization queue configuration
 */
export interface VectorizationQueueConfig {
    redisKeyPrefix: string;
    maxRetries: number;
    retryDelayMs: number;
    jobTimeoutMs: number;
}
/**
 * Vectorization Service
 * Legacy service - now uses ShardEmbeddingService internally for template-based embedding generation
 */
export declare class VectorizationService {
    private readonly container;
    private readonly redis;
    private readonly azureOpenAI;
    private readonly cacheService;
    private readonly monitoring;
    private readonly shardEmbeddingService?;
    private readonly shardRepository?;
    private readonly shardTypeRepository?;
    private queueConfig;
    private processingJobs;
    private retryTimeouts;
    constructor(container: Container, redis: Redis, azureOpenAI: AzureOpenAIService, cacheService: VectorSearchCacheService, monitoring: IMonitoringProvider, queueConfig?: Partial<VectorizationQueueConfig>, shardEmbeddingService?: ShardEmbeddingService | undefined, // Optional - if provided, use template-based embedding
    shardRepository?: ShardRepository | undefined, // Optional - needed for template-based embedding
    shardTypeRepository?: ShardTypeRepository | undefined);
    /**
     * Vectorize a single shard
     */
    vectorizeShard(request: VectorizeShardRequest): Promise<VectorizationStatusResponse>;
    /**
     * Process a vectorization job
     * If ShardEmbeddingService is available, delegate to it for template-based embedding generation
     */
    private processJob;
    /**
     * Get vectorization job status
     */
    getJobStatus(jobId: string): Promise<VectorizationStatusResponse | null>;
    /**
     * Batch vectorize multiple shards
     */
    batchVectorize(request: BatchVectorizeRequest): Promise<BatchVectorizeResponse>;
    /**
     * Calculate job progress (0-100)
     */
    private calculateProgress;
    /**
     * Check if error is retryable
     */
    private isRetryableError;
    /**
     * Get shard from Cosmos DB
     */
    private getShard;
    /**
     * Update shard in Cosmos DB
     */
    private updateShard;
    /**
     * Query shard IDs based on filter
     */
    private queryShardIds;
    /**
     * Save job to Redis
     */
    private saveJob;
    /**
     * Get job from Redis
     */
    private getJob;
    /**
     * Invalidate caches after vectorization
     */
    private invalidateCaches;
    /**
     * Cleanup method for graceful shutdown
     * Clears all pending retry timeouts
     */
    shutdown(): void;
}
//# sourceMappingURL=vectorization.service.d.ts.map