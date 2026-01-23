/**
 * Queue Service
 *
 * Replaces AzureServiceBusService with BullMQ-based queue service.
 * Provides the same interface for drop-in replacement.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import type { EmbeddingJobMessage } from '../types/embedding-job.types.js';
import type { DocumentChunkJobMessage } from '../types/document-chunk-job.types.js';
import type { GenerationJob } from './content-generation/types/generation.types.js';
import type { EnrichmentJob } from '../types/enrichment.types.js';
export declare class QueueService {
    private queueProducer;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Check if a shard type should be ignored from embedding
     */
    isShardTypeIgnored(shardTypeId: string): boolean;
    /**
     * Send an embedding job message
     * Returns false if the shard type is ignored
     */
    sendEmbeddingJob(jobMessage: EmbeddingJobMessage, options?: {
        delayInSeconds?: number;
    }): Promise<boolean>;
    /**
     * Send multiple embedding job messages in batch
     */
    sendEmbeddingJobBatch(jobMessages: EmbeddingJobMessage[], options?: {
        delayInSeconds?: number;
    }): Promise<number>;
    /**
     * Get the list of ignored shard types
     */
    getIgnoredShardTypes(): string[];
    /**
     * Send a document chunk job message
     */
    sendDocumentChunkJob(jobMessage: DocumentChunkJobMessage, options?: {
        delayInSeconds?: number;
    }): Promise<boolean>;
    /**
     * Send a document check job message
     */
    sendDocumentCheckJob(jobMessage: any, options?: {
        delayInSeconds?: number;
    }): Promise<boolean>;
    /**
     * Send a content generation job message
     */
    sendGenerationJob(jobMessage: GenerationJob & {
        template?: any;
        userToken?: string;
    }, options?: {
        delayInSeconds?: number;
    }): Promise<boolean>;
    /**
     * Send an ingestion event message
     */
    sendIngestionEvent(message: any, options?: {
        delayInSeconds?: number;
        sessionId?: string;
    }): Promise<void>;
    /**
     * Send a shard emission message
     */
    sendShardEmission(message: any, options?: {
        delayInSeconds?: number;
        sessionId?: string;
    }): Promise<void>;
    /**
     * Send an enrichment job message
     */
    sendEnrichmentJob(message: EnrichmentJob | {
        jobId: string;
        tenantId: string;
        shardId: string;
        configId: string;
        processors?: string[];
    }, options?: {
        delayInSeconds?: number;
        sessionId?: string;
    }): Promise<void>;
    /**
     * Send a shard-created event message
     */
    sendShardCreatedEvent(message: {
        shardId: string;
        tenantId: string;
        shardTypeId: string;
        shard: any;
    }, options?: {
        delayInSeconds?: number;
        sessionId?: string;
    }): Promise<void>;
    /**
     * Send a risk evaluation job message
     */
    sendRiskEvaluationJob(message: {
        opportunityId: string;
        tenantId: string;
        userId: string;
        trigger: 'scheduled' | 'opportunity_updated' | 'shard_created' | 'manual';
        priority: 'high' | 'normal' | 'low';
        options: {
            includeHistorical?: boolean;
            includeAI?: boolean;
            includeSemanticDiscovery?: boolean;
        };
        timestamp: Date;
    }, options?: {
        delayInSeconds?: number;
    }): Promise<void>;
    /**
     * Health check - verify queue connectivity
     */
    healthCheck(): Promise<boolean>;
    /**
     * Close the queue service
     */
    close(): Promise<void>;
}
//# sourceMappingURL=queue.service.d.ts.map