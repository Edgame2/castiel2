/**
 * Shard Embedding Change Feed Processor
 *
 * Automatically generates embeddings for shards when they are created or updated.
 * Uses Cosmos DB Change Feed to listen for shard changes and triggers embedding generation.
 */
import { Container } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { ShardEmbeddingService } from '../shard-embedding.service.js';
export interface ChangeFeedProcessorConfig {
    enabled?: boolean;
    leaseContainerId?: string;
    instanceName?: string;
    maxBatchSize?: number;
    maxProcessingTimeMs?: number;
    startFromBeginning?: boolean;
    pollIntervalMs?: number;
    maxItemCount?: number;
    pollInterval?: number;
    maxConcurrency?: number;
    mode?: 'enqueue' | 'generate';
}
export declare class ShardEmbeddingChangeFeedService {
    private readonly shardContainer;
    private readonly shardEmbeddingService;
    private readonly monitoring;
    private processor;
    private isRunning;
    private config;
    private processingQueue;
    private leaseContainer?;
    private serviceBusService?;
    constructor(shardContainer: Container, shardEmbeddingService: ShardEmbeddingService, monitoring: IMonitoringProvider, serviceBusService?: any, // Optional - for enqueue mode
    config?: Partial<ChangeFeedProcessorConfig>);
    /**
     * Start listening to shard changes
     */
    start(): Promise<void>;
    /**
     * Stop listening to shard changes
     */
    stop(): Promise<void>;
    /**
     * Polling-based change feed processor
     * In production, replace with official Cosmos DB Change Feed Processor
     */
    private startPolling;
    /**
     * Create an embedding job message from a shard
     */
    private createEmbeddingJobMessage;
    /**
     * Process a single shard for embedding generation
     */
    private processShard;
    /**
     * Check if shard has recent vectors (less than 7 days old)
     */
    private hasRecentVectors;
    /**
     * Get processor status
     */
    getStatus(): {
        isRunning: boolean;
        queueSize: number;
        config: ChangeFeedProcessorConfig;
    };
}
//# sourceMappingURL=change-feed.service.d.ts.map