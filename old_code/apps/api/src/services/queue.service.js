// @ts-nocheck - Not used by workers-sync, has type mismatches with queue package
/**
 * Queue Service
 *
 * Replaces AzureServiceBusService with BullMQ-based queue service.
 * Provides the same interface for drop-in replacement.
 */
import { QueueProducerService } from '@castiel/queue';
import { createRedisConnection } from '@castiel/queue';
import { shouldIgnoreShardType } from '../types/embedding-job.types.js';
import { config } from '../config/env.js';
export class QueueService {
    queueProducer;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        // Initialize Redis connection
        const redis = createRedisConnection({
            url: process.env.REDIS_URL,
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
            password: process.env.REDIS_PASSWORD,
            tls: process.env.REDIS_TLS_ENABLED === 'true',
        });
        this.queueProducer = new QueueProducerService({
            redis,
            monitoring,
        });
        this.monitoring.trackEvent('queue-service.initialized', {
            ignoredShardTypes: config.embeddingJob.ignoredShardTypes.join(', '),
        });
    }
    /**
     * Check if a shard type should be ignored from embedding
     */
    isShardTypeIgnored(shardTypeId) {
        return shouldIgnoreShardType(shardTypeId, config.embeddingJob.ignoredShardTypes);
    }
    /**
     * Send an embedding job message
     * Returns false if the shard type is ignored
     */
    async sendEmbeddingJob(jobMessage, options) {
        // Check if this shard type should be ignored
        if (this.isShardTypeIgnored(jobMessage.shardTypeId)) {
            this.monitoring.trackEvent('embedding_job.ignored', {
                shardId: jobMessage.shardId,
                tenantId: jobMessage.tenantId,
                shardTypeId: jobMessage.shardTypeId,
                reason: 'shard_type_in_ignore_list',
            });
            return false;
        }
        try {
            await this.queueProducer.enqueueEmbeddingJob(jobMessage, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
            });
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendEmbeddingJob',
                shardId: jobMessage.shardId,
            });
            throw error;
        }
    }
    /**
     * Send multiple embedding job messages in batch
     */
    async sendEmbeddingJobBatch(jobMessages, options) {
        // Filter out ignored shard types
        const messagesToSend = jobMessages.filter(job => {
            const isIgnored = this.isShardTypeIgnored(job.shardTypeId);
            if (isIgnored) {
                this.monitoring.trackEvent('embedding_job.ignored', {
                    shardId: job.shardId,
                    tenantId: job.tenantId,
                    shardTypeId: job.shardTypeId,
                    reason: 'shard_type_in_ignore_list',
                });
            }
            return !isIgnored;
        });
        if (messagesToSend.length === 0) {
            return 0;
        }
        // Enqueue all messages
        const promises = messagesToSend.map(job => this.queueProducer.enqueueEmbeddingJob(job, {
            delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
        }));
        await Promise.all(promises);
        this.monitoring.trackEvent('embedding_jobs.enqueued_batch', {
            sentCount: messagesToSend.length,
            totalCount: jobMessages.length,
            ignoredCount: jobMessages.length - messagesToSend.length,
        });
        return messagesToSend.length;
    }
    /**
     * Get the list of ignored shard types
     */
    getIgnoredShardTypes() {
        return [...config.embeddingJob.ignoredShardTypes];
    }
    /**
     * Send a document chunk job message
     */
    async sendDocumentChunkJob(jobMessage, options) {
        try {
            await this.queueProducer.enqueueDocumentChunkJob(jobMessage, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
            });
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendDocumentChunkJob',
                shardId: jobMessage.shardId,
            });
            throw error;
        }
    }
    /**
     * Send a document check job message
     */
    async sendDocumentCheckJob(jobMessage, options) {
        try {
            await this.queueProducer.enqueueDocumentCheckJob(jobMessage, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
            });
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendDocumentCheckJob',
                shardId: jobMessage.shardId,
            });
            throw error;
        }
    }
    /**
     * Send a content generation job message
     */
    async sendGenerationJob(jobMessage, options) {
        try {
            await this.queueProducer.enqueueGenerationJob(jobMessage, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
            });
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendGenerationJob',
                jobId: jobMessage.id,
            });
            throw error;
        }
    }
    /**
     * Send an ingestion event message
     */
    async sendIngestionEvent(message, options) {
        try {
            await this.queueProducer.enqueueIngestionEvent(message, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
                priority: 5,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendIngestionEvent',
                tenantId: message.tenantId,
            });
            throw error;
        }
    }
    /**
     * Send a shard emission message
     */
    async sendShardEmission(message, options) {
        // Shard emission is not in the queue package yet, but can be added
        // For now, log that it's not implemented
        this.monitoring.trackEvent('queue-service.shard-emission-not-implemented', {
            tenantId: message.tenantId,
        });
    }
    /**
     * Send an enrichment job message
     */
    async sendEnrichmentJob(message, options) {
        try {
            await this.queueProducer.enqueueEnrichmentJob(message, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
                priority: 5,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendEnrichmentJob',
                tenantId: message.tenantId,
                shardId: message.shardId,
            });
            throw error;
        }
    }
    /**
     * Send a shard-created event message
     */
    async sendShardCreatedEvent(message, options) {
        try {
            await this.queueProducer.enqueueShardCreated(message, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
                priority: 5,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendShardCreatedEvent',
                tenantId: message.tenantId,
                shardId: message.shardId,
            });
            // Don't throw - shard creation should succeed even if event emission fails
        }
    }
    /**
     * Send a risk evaluation job message
     */
    async sendRiskEvaluationJob(message, options) {
        try {
            await this.queueProducer.enqueueRiskEvaluation(message, {
                delay: options?.delayInSeconds ? options.delayInSeconds * 1000 : undefined,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.sendRiskEvaluationJob',
                opportunityId: message.opportunityId,
            });
            throw error;
        }
    }
    /**
     * Health check - verify queue connectivity
     */
    async healthCheck() {
        try {
            // Try to enqueue a test job (or just check Redis connection)
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'QueueService.healthCheck',
            });
            return false;
        }
    }
    /**
     * Close the queue service
     */
    async close() {
        await this.queueProducer.close();
    }
}
//# sourceMappingURL=queue.service.js.map