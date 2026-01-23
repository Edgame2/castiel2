/**
 * Azure Service Bus Service
 *
 * @deprecated This service is deprecated and replaced by QueueService (BullMQ).
 * This file is kept temporarily for legacy Azure Functions compatibility only.
 * New code should use QueueService from @castiel/queue instead.
 *
 * Handles messaging to Azure Service Bus for distributed processing
 * Used for embedding jobs, webhooks, and other asynchronous tasks
 */
import { ServiceBusClient } from '@azure/service-bus';
import { config } from '../config/env.js';
import { shouldIgnoreShardType } from '../types/embedding-job.types.js';
export class AzureServiceBusService {
    client;
    senders = new Map();
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        // Initialize Service Bus client
        const connectionString = config.serviceBus?.connectionString;
        if (!connectionString) {
            const errorMsg = 'AZURE_SERVICE_BUS_CONNECTION_STRING is required';
            this.monitoring?.trackException(new Error(errorMsg), { operation: 'azure-service-bus.initialization' });
            throw new Error(errorMsg);
        }
        try {
            this.client = new ServiceBusClient(connectionString);
            this.monitoring.trackEvent('azure-service-bus.initialized', {
                queueName: config.serviceBus?.embeddingQueueName || 'embedding-jobs',
                ignoredShardTypes: config.embeddingJob.ignoredShardTypes.join(', '),
            });
        }
        catch (error) {
            const errorMsg = `Failed to initialize Service Bus client: ${error instanceof Error ? error.message : String(error)}`;
            this.monitoring.trackException(error, { operation: 'azure-service-bus.initialization' });
            throw new Error(errorMsg);
        }
    }
    /**
     * Get or create a sender for a queue
     */
    getSender(queueName) {
        if (!this.senders.has(queueName)) {
            const sender = this.client.createSender(queueName);
            this.senders.set(queueName, sender);
        }
        return this.senders.get(queueName);
    }
    /**
     * Check if a shard type should be ignored from embedding
     */
    isShardTypeIgnored(shardTypeId) {
        return shouldIgnoreShardType(shardTypeId, config.embeddingJob.ignoredShardTypes);
    }
    /**
     * Send an embedding job message to Service Bus
     * Returns false if the shard type is ignored
     */
    async sendEmbeddingJob(jobMessage, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.embeddingQueueName || 'embedding-jobs';
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
            const sender = this.getSender(queueName);
            const sbMessage = {
                body: jobMessage,
                contentType: 'application/json',
                // Use dedupeKey as message ID for deduplication
                messageId: jobMessage.dedupeKey,
                // Session ID for ordered processing per tenant
                sessionId: jobMessage.tenantId,
                // Custom properties for filtering
                userProperties: {
                    shardId: jobMessage.shardId,
                    tenantId: jobMessage.tenantId,
                    shardTypeId: jobMessage.shardTypeId,
                    revisionNumber: jobMessage.revisionNumber.toString(),
                },
            };
            // Set scheduled enqueue time if delay is specified
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                const scheduledTime = new Date(Date.now() + options.delayInSeconds * 1000);
                sbMessage.scheduledEnqueueTimeUtc = scheduledTime;
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('embedding_job.enqueued', {
                shardId: jobMessage.shardId,
                tenantId: jobMessage.tenantId,
                shardTypeId: jobMessage.shardTypeId,
                dedupeKey: jobMessage.dedupeKey,
            });
            return true;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.monitoring.trackDependency('azure-service-bus.send', 'ServiceBus', queueName, duration, false, errorMsg);
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendEmbeddingJob',
                shardId: jobMessage.shardId,
            });
            throw error;
        }
    }
    /**
     * Send multiple embedding job messages in batch
     * Returns count of messages actually sent (excluding ignored types)
     */
    async sendEmbeddingJobBatch(jobMessages, options) {
        const queueName = config.serviceBus?.embeddingQueueName || 'embedding-jobs';
        try {
            const sender = this.getSender(queueName);
            const startTime = Date.now();
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
            // If all messages were filtered out, return early
            if (messagesToSend.length === 0) {
                this.monitoring.trackEvent('embedding_jobs.batch_all_ignored', {
                    totalCount: jobMessages.length,
                    ignoredCount: jobMessages.length,
                });
                return 0;
            }
            const sbMessages = messagesToSend.map((job) => ({
                body: job,
                contentType: 'application/json',
                messageId: job.dedupeKey,
                sessionId: job.tenantId,
                userProperties: {
                    shardId: job.shardId,
                    tenantId: job.tenantId,
                    shardTypeId: job.shardTypeId,
                    revisionNumber: job.revisionNumber.toString(),
                },
                scheduledEnqueueTimeUtc: options?.delayInSeconds
                    ? new Date(Date.now() + options.delayInSeconds * 1000)
                    : undefined,
            }));
            await sender.sendMessages(sbMessages);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-batch', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('embedding_jobs.enqueued_batch', {
                sentCount: messagesToSend.length,
                totalCount: jobMessages.length,
                ignoredCount: jobMessages.length - messagesToSend.length,
            });
            return messagesToSend.length;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendEmbeddingJobBatch',
                count: jobMessages.length,
            });
            throw error;
        }
    }
    /**
     * Get the list of ignored shard types
     */
    getIgnoredShardTypes() {
        return [...config.embeddingJob.ignoredShardTypes];
    }
    /**
     * Send a document chunk job message to Service Bus
     */
    async sendDocumentChunkJob(jobMessage, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.documentChunkQueueName || 'documents-to-chunk';
        try {
            const sender = this.getSender(queueName);
            // Generate a unique message ID for deduplication
            const messageId = `doc-chunk-${jobMessage.shardId}-${Date.now()}`;
            const sbMessage = {
                body: jobMessage,
                contentType: 'application/json',
                messageId,
                // Session ID for ordered processing per tenant
                sessionId: jobMessage.tenantId,
                // Custom properties for filtering
                userProperties: {
                    shardId: jobMessage.shardId,
                    tenantId: jobMessage.tenantId,
                    documentFileName: jobMessage.documentFileName,
                },
            };
            // Set scheduled enqueue time if delay is specified
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                const scheduledTime = new Date(Date.now() + options.delayInSeconds * 1000);
                sbMessage.scheduledEnqueueTimeUtc = scheduledTime;
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-document-chunk', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('document_chunk_job.enqueued', {
                shardId: jobMessage.shardId,
                tenantId: jobMessage.tenantId,
                documentFileName: jobMessage.documentFileName,
            });
            return true;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.monitoring.trackDependency('azure-service-bus.send-document-chunk', 'ServiceBus', queueName, duration, false, errorMsg);
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendDocumentChunkJob',
                shardId: jobMessage.shardId,
            });
            throw error;
        }
    }
    /**
     * Send a document check job message to Service Bus (for virus scanning)
     */
    async sendDocumentCheckJob(jobMessage, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.documentToChecksQueueName || 'documents-to-check';
        try {
            const sender = this.getSender(queueName);
            // Generate a unique message ID for deduplication
            const messageId = `doc-check-${jobMessage.shardId}-${Date.now()}`;
            const sbMessage = {
                body: jobMessage,
                contentType: 'application/json',
                messageId,
                // Session ID for ordered processing per tenant
                sessionId: jobMessage.tenantId,
                // Custom properties for filtering
                userProperties: {
                    shardId: jobMessage.shardId,
                    tenantId: jobMessage.tenantId,
                    documentFileName: jobMessage.documentFileName,
                },
            };
            // Set scheduled enqueue time if delay is specified
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                const scheduledTime = new Date(Date.now() + options.delayInSeconds * 1000);
                sbMessage.scheduledEnqueueTimeUtc = scheduledTime;
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-document-check', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('document_check_job.enqueued', {
                shardId: jobMessage.shardId,
                tenantId: jobMessage.tenantId,
                documentFileName: jobMessage.documentFileName,
            });
            return true;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.monitoring.trackDependency('azure-service-bus.send-document-check', 'ServiceBus', queueName, duration, false, errorMsg);
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendDocumentCheckJob',
                shardId: jobMessage.shardId,
            });
            throw error;
        }
    }
    /**
     * Send a content generation job message to Service Bus
     */
    async sendGenerationJob(jobMessage, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.contentGenerationQueueName || 'content-generation-jobs';
        try {
            const sender = this.getSender(queueName);
            // Generate a unique message ID for deduplication
            const messageId = `gen-${jobMessage.id}`;
            const sbMessage = {
                body: jobMessage,
                contentType: 'application/json',
                messageId,
                // Session ID for ordered processing per tenant
                sessionId: jobMessage.tenantId,
                // Custom properties for filtering
                userProperties: {
                    jobId: jobMessage.id,
                    templateId: jobMessage.templateId,
                    tenantId: jobMessage.tenantId,
                    userId: jobMessage.userId,
                    status: jobMessage.status,
                    provider: jobMessage.destinationProvider,
                },
            };
            // Set scheduled enqueue time if delay is specified
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                const scheduledTime = new Date(Date.now() + options.delayInSeconds * 1000);
                sbMessage.scheduledEnqueueTimeUtc = scheduledTime;
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-generation-job', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('content_generation_job.enqueued', {
                jobId: jobMessage.id,
                templateId: jobMessage.templateId,
                tenantId: jobMessage.tenantId,
                userId: jobMessage.userId,
                provider: jobMessage.destinationProvider,
            });
            return true;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.monitoring.trackDependency('azure-service-bus.send-generation-job', 'ServiceBus', queueName, duration, false, errorMsg);
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendGenerationJob',
                jobId: jobMessage.id,
                templateId: jobMessage.templateId,
            });
            throw error;
        }
    }
    /**
     * Send an ingestion event message to Service Bus (Phase 2)
     */
    async sendIngestionEvent(message, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.ingestionEventsQueueName || 'ingestion-events';
        try {
            const sender = this.getSender(queueName);
            const messageId = `ingestion-${message.tenantId}-${message.sourceId}-${Date.now()}`;
            const sbMessage = {
                body: message,
                contentType: 'application/json',
                messageId,
                sessionId: options?.sessionId || message.tenantId,
                userProperties: {
                    tenantId: message.tenantId,
                    source: message.source,
                    eventType: message.eventType,
                },
            };
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                sbMessage.scheduledEnqueueTimeUtc = new Date(Date.now() + options.delayInSeconds * 1000);
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-ingestion-event', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('ingestion_event.enqueued', {
                tenantId: message.tenantId,
                source: message.source,
                eventType: message.eventType,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendIngestionEvent',
                tenantId: message.tenantId,
                source: message.source,
            });
            throw error;
        }
    }
    /**
     * Send a shard emission message to Service Bus (Phase 2)
     */
    async sendShardEmission(message, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.shardEmissionQueueName || 'shard-emission';
        try {
            const sender = this.getSender(queueName);
            const messageId = `shard-emission-${message.shardId || message.tenantId}-${Date.now()}`;
            const sbMessage = {
                body: message,
                contentType: 'application/json',
                messageId,
                sessionId: options?.sessionId || message.tenantId,
                userProperties: {
                    tenantId: message.tenantId,
                    shardId: message.shardId,
                    shardTypeId: message.shardTypeId,
                },
            };
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                sbMessage.scheduledEnqueueTimeUtc = new Date(Date.now() + options.delayInSeconds * 1000);
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-shard-emission', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('shard_emission.enqueued', {
                tenantId: message.tenantId,
                shardId: message.shardId,
                shardTypeId: message.shardTypeId,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendShardEmission',
                tenantId: message.tenantId,
                shardId: message.shardId,
            });
            throw error;
        }
    }
    /**
     * Send an enrichment job message to Service Bus
     */
    async sendEnrichmentJob(message, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.enrichmentJobsQueueName || 'enrichment-jobs';
        try {
            const sender = this.getSender(queueName);
            const messageId = `enrichment-${message.shardId || message.tenantId}-${Date.now()}`;
            const sbMessage = {
                body: message,
                contentType: 'application/json',
                messageId,
                sessionId: options?.sessionId || message.tenantId,
                userProperties: {
                    tenantId: message.tenantId,
                    shardId: message.shardId,
                    shardTypeId: message.shardTypeId,
                },
            };
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                sbMessage.scheduledEnqueueTimeUtc = new Date(Date.now() + options.delayInSeconds * 1000);
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-enrichment-job', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('enrichment_job.enqueued', {
                tenantId: message.tenantId,
                shardId: message.shardId,
                shardTypeId: message.shardTypeId,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendEnrichmentJob',
                tenantId: message.tenantId,
                shardId: message.shardId,
            });
            throw error;
        }
    }
    /**
     * Send a shard-created event message to Service Bus (Phase 2)
     * Used for project auto-attachment and other post-creation processing
     */
    async sendShardCreatedEvent(message, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.shardCreatedQueueName || 'shard-created';
        try {
            const sender = this.getSender(queueName);
            const messageId = `shard-created-${message.shardId}-${Date.now()}`;
            const sbMessage = {
                body: message,
                contentType: 'application/json',
                messageId,
                sessionId: options?.sessionId || message.tenantId,
                userProperties: {
                    tenantId: message.tenantId,
                    shardId: message.shardId,
                    shardTypeId: message.shardTypeId,
                },
            };
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                sbMessage.scheduledEnqueueTimeUtc = new Date(Date.now() + options.delayInSeconds * 1000);
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-shard-created', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('shard_created_event.enqueued', {
                tenantId: message.tenantId,
                shardId: message.shardId,
                shardTypeId: message.shardTypeId,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendShardCreatedEvent',
                tenantId: message.tenantId,
                shardId: message.shardId,
            });
            // Don't throw - shard creation should succeed even if event emission fails
            // Error already tracked by monitoring.trackException above
        }
    }
    /**
     * Send a risk evaluation job message to Service Bus
     */
    async sendRiskEvaluationJob(message, options) {
        const startTime = Date.now();
        const queueName = config.serviceBus?.riskEvaluationsQueueName || 'risk-evaluations';
        try {
            const sender = this.getSender(queueName);
            const messageId = `risk-eval-${message.opportunityId}-${Date.now()}`;
            const sbMessage = {
                body: message,
                contentType: 'application/json',
                messageId,
                sessionId: message.tenantId, // Session for ordered processing per tenant
                userProperties: {
                    opportunityId: message.opportunityId,
                    tenantId: message.tenantId,
                    userId: message.userId,
                    trigger: message.trigger,
                    priority: message.priority,
                },
            };
            // Set priority (high = 1, normal/low = 0)
            if (message.priority === 'high') {
                sbMessage.priority = 1;
            }
            // Set scheduled enqueue time if delay is specified
            if (options?.delayInSeconds && options.delayInSeconds > 0) {
                sbMessage.scheduledEnqueueTimeUtc = new Date(Date.now() + options.delayInSeconds * 1000);
            }
            await sender.sendMessages(sbMessage);
            const duration = Date.now() - startTime;
            this.monitoring.trackDependency('azure-service-bus.send-risk-evaluation-job', 'ServiceBus', queueName, duration, true);
            this.monitoring.trackEvent('risk_evaluation_job.enqueued', {
                opportunityId: message.opportunityId,
                tenantId: message.tenantId,
                trigger: message.trigger,
                priority: message.priority,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.sendRiskEvaluationJob',
                opportunityId: message.opportunityId,
                tenantId: message.tenantId,
            });
            throw error;
        }
    }
    /**
     * Get the Service Bus client (for creating receivers in workers)
     */
    getClient() {
        return this.client;
    }
    /**
     * Health check - verify Service Bus connectivity
     */
    async healthCheck() {
        try {
            // Try to get a sender for a test queue (this verifies connection)
            // We'll use the embedding queue as a test since it's always available
            const testQueueName = config.serviceBus?.embeddingQueueName || 'embedding-jobs';
            const sender = this.getSender(testQueueName);
            // If we can get a sender without error, connection is healthy
            return sender !== null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.healthCheck',
            });
            return false;
        }
    }
    /**
     * Close all senders and the client
     */
    async close() {
        try {
            // Close all senders
            for (const sender of this.senders.values()) {
                await sender.close();
            }
            this.senders.clear();
            // Close client
            await this.client.close();
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'AzureServiceBusService.close',
            });
        }
    }
}
//# sourceMappingURL=azure-service-bus.service.js.map