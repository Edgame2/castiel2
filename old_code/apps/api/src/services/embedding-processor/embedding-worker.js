export class EmbeddingWorker {
    client;
    shardRepository;
    shardEmbeddingService;
    monitoring;
    jobRepository;
    maxDeliveries;
    maxConcurrentCalls;
    queueDepthCheckIntervalMs;
    receiver = null;
    queueName;
    processingStats = {
        totalProcessed: 0,
        totalCompleted: 0,
        totalFailed: 0,
        totalSkipped: 0,
        startTime: Date.now(),
        lastProcessedAt: Date.now(),
    };
    queueDepthCheckInterval = null;
    constructor(client, shardRepository, shardEmbeddingService, monitoring, jobRepository, queueName = 'embedding-jobs', maxDeliveries = 5, maxConcurrentCalls = 10, // Increased from 5 for better throughput
    queueDepthCheckIntervalMs = 30000 // Check queue depth every 30 seconds
    ) {
        this.client = client;
        this.shardRepository = shardRepository;
        this.shardEmbeddingService = shardEmbeddingService;
        this.monitoring = monitoring;
        this.jobRepository = jobRepository;
        this.maxDeliveries = maxDeliveries;
        this.maxConcurrentCalls = maxConcurrentCalls;
        this.queueDepthCheckIntervalMs = queueDepthCheckIntervalMs;
        this.queueName = queueName;
    }
    async start() {
        this.receiver = this.client.createReceiver(this.queueName, {
            maxConcurrentCalls: this.maxConcurrentCalls,
            autoCompleteMessages: false,
        });
        this.receiver.subscribe({
            processMessage: async (message) => {
                await this.processMessage(message);
            },
            processError: async (args) => {
                this.monitoring.trackException(args.error, {
                    context: 'embedding-worker.processError',
                    entityPath: args.entityPath,
                    namespace: args.fullyQualifiedNamespace,
                });
            },
        });
        // Start queue depth monitoring
        this.startQueueDepthMonitoring();
        // Start processing rate monitoring
        this.startProcessingRateMonitoring();
        this.monitoring.trackEvent('embedding-worker.started', {
            queue: this.queueName,
            maxConcurrentCalls: this.maxConcurrentCalls,
        });
    }
    async stop() {
        // Stop queue depth monitoring
        if (this.queueDepthCheckInterval) {
            clearInterval(this.queueDepthCheckInterval);
            this.queueDepthCheckInterval = null;
        }
        if (this.receiver) {
            await this.receiver.close();
        }
        await this.client.close();
        // Report final stats
        this.reportFinalStats();
        this.monitoring.trackEvent('embedding-worker.stopped', { queue: this.queueName });
    }
    /**
     * Start monitoring queue depth periodically
     */
    startQueueDepthMonitoring() {
        this.queueDepthCheckInterval = setInterval(async () => {
            try {
                // Note: Service Bus doesn't provide direct queue depth API in SDK
                // We track active message count via processing stats
                const activeMessages = this.processingStats.totalProcessed -
                    (this.processingStats.totalCompleted +
                        this.processingStats.totalFailed +
                        this.processingStats.totalSkipped);
                this.monitoring.trackMetric('embedding-worker.queue-depth', activeMessages, {
                    queue: this.queueName,
                });
                this.monitoring.trackEvent('embedding-worker.queue-depth-check', {
                    queue: this.queueName,
                    activeMessages,
                    totalProcessed: this.processingStats.totalProcessed,
                    totalCompleted: this.processingStats.totalCompleted,
                    totalFailed: this.processingStats.totalFailed,
                    totalSkipped: this.processingStats.totalSkipped,
                });
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    context: 'embedding-worker.queue-depth-monitoring',
                });
            }
        }, this.queueDepthCheckIntervalMs);
    }
    /**
     * Start monitoring processing rate
     */
    startProcessingRateMonitoring() {
        setInterval(() => {
            const elapsedSeconds = (Date.now() - this.processingStats.startTime) / 1000;
            const processingRate = elapsedSeconds > 0
                ? this.processingStats.totalCompleted / elapsedSeconds
                : 0;
            this.monitoring.trackMetric('embedding-worker.processing-rate', processingRate, {
                queue: this.queueName,
                unit: 'jobs-per-second',
            });
            this.monitoring.trackEvent('embedding-worker.processing-rate-check', {
                queue: this.queueName,
                processingRate: processingRate.toFixed(2),
                totalCompleted: this.processingStats.totalCompleted,
                elapsedSeconds: Math.floor(elapsedSeconds),
            });
        }, 60000); // Report every minute
    }
    /**
     * Report final statistics when worker stops
     */
    reportFinalStats() {
        const elapsedSeconds = (Date.now() - this.processingStats.startTime) / 1000;
        const avgProcessingRate = elapsedSeconds > 0
            ? this.processingStats.totalCompleted / elapsedSeconds
            : 0;
        this.monitoring.trackEvent('embedding-worker.final-stats', {
            queue: this.queueName,
            totalProcessed: this.processingStats.totalProcessed,
            totalCompleted: this.processingStats.totalCompleted,
            totalFailed: this.processingStats.totalFailed,
            totalSkipped: this.processingStats.totalSkipped,
            avgProcessingRate: avgProcessingRate.toFixed(2),
            elapsedSeconds: Math.floor(elapsedSeconds),
        });
    }
    // Exposed for testing and manual invocation
    async processMessage(message) {
        const startTime = Date.now();
        const body = message.body;
        this.processingStats.totalProcessed++;
        this.processingStats.lastProcessedAt = Date.now();
        if (!body?.shardId || !body?.tenantId) {
            this.processingStats.totalSkipped++;
            await this.safeComplete(message);
            return;
        }
        // Create job record if repository is available
        const jobId = `job-${body.shardId}-${Date.now()}`;
        let job;
        if (this.jobRepository) {
            const pending = {
                id: jobId,
                tenantId: body.tenantId,
                shardId: body.shardId,
                shardTypeId: body.shardTypeId,
                status: 'processing',
                retryCount: message.deliveryCount ?? 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            try {
                job = await this.jobRepository.create(pending);
            }
            catch (e) {
                this.monitoring.trackException(e, { context: 'embedding-worker.job-create' });
            }
        }
        try {
            const shard = await this.shardRepository.findById(body.shardId, body.tenantId);
            if (!shard) {
                this.monitoring.trackEvent('embedding-worker.shard-not-found', {
                    shardId: body.shardId,
                    tenantId: body.tenantId,
                });
                this.processingStats.totalSkipped++;
                await this.safeComplete(message);
                if (this.jobRepository && job) {
                    await this.jobRepository.update(job.id, body.tenantId, { status: 'failed', error: 'shard-not-found' });
                }
                return;
            }
            const result = await this.shardEmbeddingService.generateEmbeddingsForShard(shard, body.tenantId, {
                forceRegenerate: false,
            });
            const processingTime = Date.now() - startTime;
            this.processingStats.totalCompleted++;
            await this.receiver?.completeMessage(message);
            this.monitoring.trackEvent('embedding-worker.completed', {
                shardId: body.shardId,
                tenantId: body.tenantId,
                processingTimeMs: processingTime,
                vectorsGenerated: result.vectorsGenerated,
            });
            // Track processing time metric
            this.monitoring.trackMetric('embedding-worker.processing-time', processingTime, {
                queue: this.queueName,
                status: 'completed',
            });
            if (this.jobRepository && job) {
                await this.jobRepository.update(job.id, body.tenantId, {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    metadata: {
                        vectorCount: result.vectorsGenerated,
                        processingTimeMs: result.processingTimeMs,
                    },
                });
            }
        }
        catch (error) {
            const attempts = (message.deliveryCount ?? 0) + 1;
            const processingTime = Date.now() - startTime;
            this.monitoring.trackException(error, {
                context: 'embedding-worker.processMessage',
                shardId: body.shardId,
                tenantId: body.tenantId,
                attempts,
                processingTimeMs: processingTime,
            });
            // Track processing time for failed jobs
            this.monitoring.trackMetric('embedding-worker.processing-time', processingTime, {
                queue: this.queueName,
                status: 'failed',
                attempts,
            });
            if (this.jobRepository && job) {
                await this.jobRepository.update(job.id, body.tenantId, {
                    status: attempts >= this.maxDeliveries ? 'failed' : 'processing',
                    retryCount: attempts,
                    error: error?.message || 'unknown-error',
                });
            }
            if (attempts >= this.maxDeliveries) {
                // Max retries exceeded - send to dead letter queue
                this.processingStats.totalFailed++;
                await this.receiver?.deadLetterMessage(message, {
                    deadLetterReason: 'embedding-processing-failed',
                    deadLetterErrorDescription: `Failed after ${attempts} attempts: ${error?.message || 'unknown-error'}`,
                });
                this.monitoring.trackEvent('embedding-worker.dead-lettered', {
                    shardId: body.shardId,
                    tenantId: body.tenantId,
                    attempts,
                    error: error?.message || 'unknown-error',
                    processingTimeMs: processingTime,
                });
                return;
            }
            // Calculate exponential backoff delay: 2^attempts seconds (capped at 5 minutes)
            const backoffSeconds = Math.min(Math.pow(2, attempts), 300); // Max 5 minutes
            const backoffMs = backoffSeconds * 1000;
            this.monitoring.trackEvent('embedding-worker.retry-scheduled', {
                shardId: body.shardId,
                tenantId: body.tenantId,
                attempts,
                backoffSeconds,
            });
            // Wait for exponential backoff before abandoning message
            // This allows Service Bus to redeliver the message after the delay
            await this.sleep(backoffMs);
            // Abandon message to trigger retry (Service Bus will redeliver after lock expiration)
            await this.receiver?.abandonMessage(message);
        }
    }
    async safeComplete(message) {
        try {
            await this.receiver?.completeMessage(message);
        }
        catch (err) {
            this.monitoring.trackException(err, {
                context: 'embedding-worker.safe-complete',
            });
        }
    }
    /**
     * Sleep utility for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=embedding-worker.js.map