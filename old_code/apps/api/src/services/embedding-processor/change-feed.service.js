/**
 * Shard Embedding Change Feed Processor
 *
 * Automatically generates embeddings for shards when they are created or updated.
 * Uses Cosmos DB Change Feed to listen for shard changes and triggers embedding generation.
 */
const DEFAULT_CONFIG = {
    enabled: true,
    leaseContainerId: 'embedding-processor-leases',
    instanceName: 'embedding-processor-1',
    maxBatchSize: 100,
    maxProcessingTimeMs: 300000, // 5 minutes
    startFromBeginning: false,
    pollIntervalMs: 1000, // 1 second
    maxItemCount: 100,
    pollInterval: 5000,
    maxConcurrency: 5,
    mode: 'generate',
};
export class ShardEmbeddingChangeFeedService {
    shardContainer;
    shardEmbeddingService;
    monitoring;
    processor = null; // ChangeFeedProcessor from @azure/cosmos
    isRunning = false;
    config;
    processingQueue = new Map();
    leaseContainer; // Optional - will be created if needed
    serviceBusService; // Optional - for enqueue mode
    constructor(shardContainer, shardEmbeddingService, monitoring, serviceBusService, // Optional - for enqueue mode
    config) {
        this.shardContainer = shardContainer;
        this.shardEmbeddingService = shardEmbeddingService;
        this.monitoring = monitoring;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.serviceBusService = serviceBusService;
        // Use pollInterval from config if provided, otherwise use pollIntervalMs
        if (config?.pollInterval) {
            this.config.pollIntervalMs = config.pollInterval;
        }
    }
    /**
     * Start listening to shard changes
     */
    async start() {
        if (this.isRunning) {
            this.monitoring.trackEvent('embedding-change-feed.already-running', {
                instanceName: this.config.instanceName,
            });
            return;
        }
        if (!this.config.enabled) {
            this.monitoring.trackEvent('embedding-change-feed.disabled', {
                instanceName: this.config.instanceName,
            });
            return;
        }
        try {
            this.monitoring.trackEvent('embedding-change-feed.starting', {
                instanceName: this.config.instanceName,
                leaseContainerId: this.config.leaseContainerId,
            });
            // Note: Cosmos DB Change Feed Processor requires @azure/cosmos SDK
            // This is a simplified implementation - in production, use the official ChangeFeedProcessor
            // For now, we'll use a polling-based approach
            this.isRunning = true;
            this.startPolling();
            this.monitoring.trackEvent('embedding-change-feed.started', {
                instanceName: this.config.instanceName,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'embedding-change-feed.start',
                instanceName: this.config.instanceName,
            });
            this.isRunning = false;
            throw error;
        }
    }
    /**
     * Stop listening to shard changes
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        try {
            this.isRunning = false;
            // Wait for current processing to complete
            await Promise.allSettled(Array.from(this.processingQueue.values()));
            this.monitoring.trackEvent('embedding-change-feed.stopped', {
                instanceName: this.config.instanceName,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'embedding-change-feed.stop',
                instanceName: this.config.instanceName,
            });
        }
    }
    /**
     * Polling-based change feed processor
     * In production, replace with official Cosmos DB Change Feed Processor
     */
    startPolling(pollIntervalMs) {
        const poll = async () => {
            if (!this.isRunning) {
                return;
            }
            try {
                // Query for recently updated shards that need embeddings
                const query = `
          SELECT * FROM c
          WHERE c._ts > @lastProcessedTimestamp
          AND (NOT IS_DEFINED(c.vectors) OR ARRAY_LENGTH(c.vectors) = 0 OR c._ts > c.metadata.embeddingGeneratedAt)
          ORDER BY c._ts ASC
        `;
                const lastProcessedTimestamp = Math.floor((Date.now() - 60000) / 1000); // Last minute
                const { resources: shards } = await this.shardContainer.items
                    .query({
                    query,
                    parameters: [
                        { name: '@lastProcessedTimestamp', value: lastProcessedTimestamp },
                    ],
                })
                    .fetchAll();
                if (shards.length > 0) {
                    this.monitoring.trackEvent('embedding-change-feed.batch-found', {
                        batchSize: shards.length,
                        instanceName: this.config.instanceName,
                    });
                    // Process shards in batches
                    const batchSize = Math.min(shards.length, this.config.maxBatchSize || 100);
                    const batch = shards.slice(0, batchSize);
                    // If Service Bus is available and mode is 'enqueue', enqueue jobs
                    if (this.serviceBusService && this.config.mode === 'enqueue') {
                        // Enqueue jobs to Service Bus for async processing
                        const jobMessages = batch
                            .map((shard) => this.createEmbeddingJobMessage(shard))
                            .filter((msg) => msg !== null);
                        if (jobMessages.length > 0) {
                            try {
                                // Use batch enqueue if available, otherwise enqueue individually
                                if (this.serviceBusService.sendEmbeddingJobBatch) {
                                    const enqueuedCount = await this.serviceBusService.sendEmbeddingJobBatch(jobMessages);
                                    this.monitoring.trackEvent('embedding-change-feed.batch-enqueued', {
                                        batchSize: jobMessages.length,
                                        enqueuedCount,
                                        instanceName: this.config.instanceName,
                                    });
                                }
                                else {
                                    // Fallback: enqueue individually
                                    const enqueueResults = await Promise.allSettled(jobMessages.map((msg) => this.serviceBusService.sendEmbeddingJob(msg)));
                                    const enqueuedCount = enqueueResults.filter((r) => r.status === 'fulfilled' && r.value === true).length;
                                    this.monitoring.trackEvent('embedding-change-feed.batch-enqueued', {
                                        batchSize: jobMessages.length,
                                        enqueuedCount,
                                        instanceName: this.config.instanceName,
                                    });
                                }
                            }
                            catch (error) {
                                this.monitoring.trackException(error, {
                                    operation: 'embedding-change-feed.enqueue',
                                    instanceName: this.config.instanceName,
                                    batchSize: jobMessages.length,
                                });
                                // Fallback to direct processing if enqueue fails
                                this.monitoring.trackEvent('embedding-change-feed.enqueue-failed-fallback', {
                                    instanceName: this.config.instanceName,
                                });
                                await Promise.allSettled(batch.map((shard) => this.processShard(shard)));
                            }
                        }
                    }
                    else {
                        // Process directly
                        await Promise.allSettled(batch.map((shard) => this.processShard(shard)));
                    }
                }
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'embedding-change-feed.poll',
                    instanceName: this.config.instanceName,
                });
            }
            // Schedule next poll
            if (this.isRunning) {
                setTimeout(poll, pollIntervalMs);
            }
        };
        // Start polling
        setTimeout(poll, pollIntervalMs);
    }
    /**
     * Create an embedding job message from a shard
     */
    createEmbeddingJobMessage(shard) {
        try {
            // Get revision number from shard metadata or use timestamp
            const revisionNumber = shard.metadata?.revisionNumber || Math.floor(Date.now() / 1000);
            // Create dedupe key for message deduplication
            const dedupeKey = `embedding-${shard.id}-${revisionNumber}`;
            return {
                shardId: shard.id,
                tenantId: shard.tenantId,
                shardTypeId: shard.shardTypeId,
                revisionNumber,
                dedupeKey,
                enqueuedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'embedding-change-feed.createJobMessage',
                shardId: shard.id,
                tenantId: shard.tenantId,
            });
            return null;
        }
    }
    /**
     * Process a single shard for embedding generation
     */
    async processShard(shard) {
        const shardId = shard.id;
        const tenantId = shard.tenantId;
        // Skip if already processing
        if (this.processingQueue.has(shardId)) {
            return;
        }
        // Check if shard already has recent vectors
        if (this.hasRecentVectors(shard)) {
            return;
        }
        const processPromise = (async () => {
            try {
                const startTime = Date.now();
                await this.shardEmbeddingService.generateEmbeddingsForShard(shard, tenantId, {
                    forceRegenerate: false,
                });
                const duration = Date.now() - startTime;
                this.monitoring.trackEvent('embedding-change-feed.processed', {
                    shardId,
                    tenantId,
                    shardTypeId: shard.shardTypeId,
                    duration,
                    instanceName: this.config.instanceName,
                });
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'embedding-change-feed.processShard',
                    shardId,
                    tenantId,
                    instanceName: this.config.instanceName,
                });
            }
            finally {
                this.processingQueue.delete(shardId);
            }
        })();
        this.processingQueue.set(shardId, processPromise);
        return processPromise;
    }
    /**
     * Check if shard has recent vectors (less than 7 days old)
     */
    hasRecentVectors(shard) {
        if (!shard.vectors || shard.vectors.length === 0) {
            return false;
        }
        // Check metadata for embedding generation timestamp
        if (shard.metadata?.embeddingGeneratedAt) {
            const generatedAt = new Date(shard.metadata.embeddingGeneratedAt);
            const daysSinceGeneration = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceGeneration < 7;
        }
        // Fallback: check vector creation timestamps
        const latestVector = shard.vectors.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))[0];
        if (latestVector?.createdAt) {
            const daysSinceCreation = (Date.now() - latestVector.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCreation < 7;
        }
        return false;
    }
    /**
     * Get processor status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            queueSize: this.processingQueue.size,
            config: this.config,
        };
    }
}
//# sourceMappingURL=change-feed.service.js.map