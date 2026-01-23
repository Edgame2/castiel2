/**
 * Vectorization Service
 * Manages the vectorization of Shards with queue-based processing
 */
import { VectorizationStatus, VectorizationError, VectorizationErrorCode, DEFAULT_VECTORIZATION_CONFIG, validateVectorizationConfig, EMBEDDING_MODELS, calculateEmbeddingCost, } from '../types/vectorization.types.js';
import { v4 as uuidv4 } from 'uuid';
const DEFAULT_QUEUE_CONFIG = {
    redisKeyPrefix: 'vectorization:job',
    maxRetries: 3,
    retryDelayMs: 5000,
    jobTimeoutMs: 300000, // 5 minutes
};
/**
 * Vectorization Service
 * Legacy service - now uses ShardEmbeddingService internally for template-based embedding generation
 */
export class VectorizationService {
    container;
    redis;
    azureOpenAI;
    cacheService;
    monitoring;
    shardEmbeddingService;
    shardRepository;
    shardTypeRepository;
    queueConfig;
    processingJobs = new Map();
    retryTimeouts = new Map(); // Track retry timeouts for cleanup
    constructor(container, redis, azureOpenAI, cacheService, monitoring, queueConfig, shardEmbeddingService, // Optional - if provided, use template-based embedding
    shardRepository, // Optional - needed for template-based embedding
    shardTypeRepository // Optional - needed for template-based embedding
    ) {
        this.container = container;
        this.redis = redis;
        this.azureOpenAI = azureOpenAI;
        this.cacheService = cacheService;
        this.monitoring = monitoring;
        this.shardEmbeddingService = shardEmbeddingService;
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.queueConfig = { ...DEFAULT_QUEUE_CONFIG, ...queueConfig };
    }
    /**
     * Vectorize a single shard
     */
    async vectorizeShard(request) {
        const startTime = Date.now();
        try {
            // Fetch shard
            const shard = await this.getShard(request.shardId, request.tenantId);
            if (!shard) {
                throw new VectorizationError(`Shard not found: ${request.shardId}`, VectorizationErrorCode.SHARD_NOT_FOUND, 404);
            }
            // Check if already vectorized
            if (shard.vectors && shard.vectors.length > 0 && !request.force) {
                this.monitoring.trackEvent('vectorization-skipped-already-vectorized', {
                    shardId: request.shardId,
                    tenantId: request.tenantId,
                });
                return {
                    jobId: 'already-vectorized',
                    shardId: request.shardId,
                    status: VectorizationStatus.COMPLETED,
                    progress: 100,
                    createdAt: shard.createdAt.toISOString(),
                    completedAt: shard.updatedAt.toISOString(),
                };
            }
            // Create vectorization job
            const config = {
                ...DEFAULT_VECTORIZATION_CONFIG,
                ...request.config,
            };
            // Validate config
            const validationErrors = validateVectorizationConfig(config);
            if (validationErrors.length > 0) {
                throw new VectorizationError(`Invalid vectorization config: ${validationErrors.join(', ')}`, VectorizationErrorCode.INVALID_CONFIG, 400, { errors: validationErrors });
            }
            const job = {
                id: uuidv4(),
                tenantId: request.tenantId,
                shardId: request.shardId,
                shardTypeId: shard.shardTypeId,
                status: VectorizationStatus.PENDING,
                config,
                priority: request.priority || 0,
                createdAt: new Date(),
                retryCount: 0,
                maxRetries: this.queueConfig.maxRetries,
            };
            // Save job to Redis
            await this.saveJob(job);
            // Process immediately (for now, can be queued for background processing later)
            this.processJob(job.id).catch((error) => {
                this.monitoring.trackException(error, {
                    component: 'VectorizationService',
                    operation: 'processJob',
                    jobId: job.id,
                });
            });
            const executionTime = Date.now() - startTime;
            this.monitoring.trackMetric('vectorization-job-created', executionTime, {
                shardId: request.shardId,
                tenantId: request.tenantId,
            });
            return {
                jobId: job.id,
                shardId: job.shardId,
                status: job.status,
                progress: 0,
                createdAt: job.createdAt.toISOString(),
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorizationService',
                operation: 'vectorizeShard',
                shardId: request.shardId,
            });
            if (error instanceof VectorizationError) {
                throw error;
            }
            throw new VectorizationError(`Failed to create vectorization job: ${error.message}`, VectorizationErrorCode.UNKNOWN_ERROR, 500, error);
        }
    }
    /**
     * Process a vectorization job
     * If ShardEmbeddingService is available, delegate to it for template-based embedding generation
     */
    async processJob(jobId) {
        const job = await this.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        // If ShardEmbeddingService is available, use it for template-based embedding generation
        if (this.shardEmbeddingService && this.shardRepository) {
            try {
                const shard = await this.shardRepository.findById(job.shardId, job.tenantId);
                if (shard) {
                    // Update job status to processing
                    job.status = VectorizationStatus.IN_PROGRESS;
                    job.startedAt = new Date();
                    await this.saveJob(job);
                    // Use ShardEmbeddingService for template-based embedding generation
                    const result = await this.shardEmbeddingService.generateEmbeddingsForShard(shard, job.tenantId, {
                        forceRegenerate: false,
                    });
                    // Update job status to completed
                    job.status = VectorizationStatus.COMPLETED;
                    job.completedAt = new Date();
                    job.result = {
                        vectorCount: result.vectorsGenerated,
                        totalTokens: result.tokensUsed || 0,
                        chunksProcessed: result.vectorsGenerated,
                        model: job.config.model,
                        dimensions: 1536, // Default for most models
                        processingTimeMs: result.processingTimeMs,
                    };
                    await this.saveJob(job);
                    this.monitoring.trackEvent('vectorization-completed-template-based', {
                        jobId: job.id,
                        shardId: job.shardId,
                        tenantId: job.tenantId,
                        vectorsGenerated: result.vectorsGenerated,
                        templateUsed: result.templateUsed,
                    });
                    return;
                }
            }
            catch (error) {
                // If template-based generation fails, fall through to legacy processing
                this.monitoring.trackException(error, {
                    component: 'VectorizationService',
                    operation: 'processJob-template-based',
                    jobId: job.id,
                });
                // Fall through to legacy processing
            }
        }
        // Legacy processing (original implementation)
        if (!job) {
            throw new VectorizationError(`Job not found: ${jobId}`, VectorizationErrorCode.UNKNOWN_ERROR, 404);
        }
        // Mark as processing
        job.status = VectorizationStatus.IN_PROGRESS;
        job.startedAt = new Date();
        await this.saveJob(job);
        this.processingJobs.set(jobId, job);
        const startTime = Date.now();
        try {
            // Fetch shard
            const shard = await this.getShard(job.shardId, job.tenantId);
            if (!shard) {
                throw new VectorizationError(`Shard not found: ${job.shardId}`, VectorizationErrorCode.SHARD_NOT_FOUND, 404);
            }
            // Use ShardEmbeddingService if available (template-based), otherwise fall back to legacy method
            let vectors;
            let totalTokens = 0;
            let chunksProcessed = 0;
            if (this.shardEmbeddingService && this.shardRepository && this.shardTypeRepository) {
                // Use template-based embedding generation (new way)
                try {
                    this.monitoring.trackEvent('vectorization-using-templates', {
                        jobId: job.id,
                        shardId: job.shardId,
                        shardTypeId: shard.shardTypeId,
                    });
                    const result = await this.shardEmbeddingService.generateEmbeddingsForShard(shard, job.tenantId, {});
                    // Fetch updated shard with vectors
                    const updatedShard = await this.getShard(job.shardId, job.tenantId);
                    if (updatedShard && updatedShard.vectors) {
                        vectors = updatedShard.vectors;
                        totalTokens = result.tokensUsed || 0;
                        chunksProcessed = result.vectorsGenerated;
                    }
                    else {
                        throw new VectorizationError('Failed to retrieve vectors after generation', VectorizationErrorCode.UNKNOWN_ERROR, 500);
                    }
                    this.monitoring.trackEvent('vectorization-template-completed', {
                        jobId: job.id,
                        vectorsGenerated: result.vectorsGenerated,
                        templateUsed: result.templateUsed,
                        isDefaultTemplate: result.isDefaultTemplate,
                    });
                }
                catch (error) {
                    // Fall back to legacy method if template-based generation fails
                    this.monitoring.trackException(error, {
                        component: 'VectorizationService',
                        operation: 'processJob-template-fallback',
                        jobId: job.id,
                    });
                    this.monitoring.trackEvent('vectorization-fallback-to-legacy', {
                        jobId: job.id,
                        reason: error.message,
                    });
                    // Fallback: throw error if template-based fails
                    throw new VectorizationError('Template-based embedding generation failed and no fallback available', VectorizationErrorCode.UNKNOWN_ERROR, 500);
                }
            }
            else {
                // No template service available - throw error
                throw new VectorizationError('ShardEmbeddingService not available', VectorizationErrorCode.UNKNOWN_ERROR, 500);
            }
            // Update shard with vectors (if not already updated by ShardEmbeddingService)
            if (!this.shardEmbeddingService || !shard.vectors || shard.vectors.length === 0) {
                shard.vectors = vectors;
                shard.updatedAt = new Date();
                await this.updateShard(shard);
            }
            // Invalidate caches
            await this.invalidateCaches(job.tenantId, job.shardId);
            // Calculate result
            const executionTime = Date.now() - startTime;
            const modelInfo = EMBEDDING_MODELS[job.config.model];
            const cost = calculateEmbeddingCost(totalTokens, job.config.model);
            const result = {
                vectorCount: vectors.length,
                totalTokens,
                chunksProcessed,
                model: job.config.model,
                dimensions: modelInfo.dimensions,
                executionTimeMs: executionTime,
                cost,
            };
            // Mark job as completed
            job.status = VectorizationStatus.COMPLETED;
            job.completedAt = new Date();
            job.result = result;
            await this.saveJob(job);
            this.processingJobs.delete(jobId);
            this.monitoring.trackEvent('vectorization-job-completed', {
                jobId: job.id,
                shardId: job.shardId,
                vectorCount: result.vectorCount,
                totalTokens: result.totalTokens,
                executionTimeMs: result.executionTimeMs,
                cost: result.cost?.toString() || '0',
            });
            this.monitoring.trackMetric('vectorization-execution-time', executionTime, {
                model: job.config.model,
                chunksProcessed: result.chunksProcessed.toString(),
                usedTemplates: this.shardEmbeddingService ? 'true' : 'false',
            });
            if (cost) {
                this.monitoring.trackMetric('vectorization-cost', cost, {
                    model: job.config.model,
                });
            }
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.monitoring.trackException(error, {
                component: 'VectorizationService',
                operation: 'processJob',
                jobId: job.id,
                executionTime: executionTime.toString(),
            });
            // Check if should retry
            job.retryCount = (job.retryCount || 0) + 1;
            if (job.retryCount < job.maxRetries && this.isRetryableError(error)) {
                job.status = VectorizationStatus.PENDING;
                await this.saveJob(job);
                // Schedule retry with timeout tracking for cleanup
                const retryDelay = this.queueConfig.retryDelayMs * job.retryCount;
                const timeoutId = setTimeout(() => {
                    // Remove timeout reference when executing
                    this.retryTimeouts.delete(jobId);
                    this.processJob(jobId).catch(() => {
                        // Already tracked in processJob
                    });
                }, retryDelay);
                // Track timeout for cleanup on shutdown
                this.retryTimeouts.set(jobId, timeoutId);
                this.monitoring.trackEvent('vectorization-job-retry-scheduled', {
                    jobId: job.id,
                    retryCount: job.retryCount,
                });
            }
            else {
                // Mark as failed
                job.status = VectorizationStatus.FAILED;
                job.completedAt = new Date();
                job.error = {
                    code: error.code || VectorizationErrorCode.UNKNOWN_ERROR,
                    message: error.message,
                    details: error.details,
                };
                await this.saveJob(job);
                this.processingJobs.delete(jobId);
                // Clear any pending retry timeout
                const timeoutId = this.retryTimeouts.get(jobId);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    this.retryTimeouts.delete(jobId);
                }
                this.monitoring.trackEvent('vectorization-job-failed', {
                    jobId: job.id,
                    error: error.message,
                    retryCount: job.retryCount,
                });
            }
        }
    }
    /**
     * Get vectorization job status
     */
    async getJobStatus(jobId) {
        const job = await this.getJob(jobId);
        if (!job) {
            return null;
        }
        const progress = this.calculateProgress(job);
        return {
            jobId: job.id,
            shardId: job.shardId,
            status: job.status,
            progress,
            result: job.result,
            error: job.error,
            createdAt: job.createdAt.toISOString(),
            startedAt: job.startedAt?.toISOString(),
            completedAt: job.completedAt?.toISOString(),
        };
    }
    /**
     * Batch vectorize multiple shards
     */
    async batchVectorize(request) {
        const startTime = Date.now();
        try {
            let shardIds;
            if (request.shardIds) {
                shardIds = request.shardIds;
            }
            else {
                // Query shards based on filter
                shardIds = await this.queryShardIds(request.tenantId, request.filter);
            }
            if (shardIds.length === 0) {
                return {
                    jobIds: [],
                    totalShards: 0,
                };
            }
            // Create jobs for each shard
            const jobIds = [];
            for (const shardId of shardIds) {
                const response = await this.vectorizeShard({
                    shardId,
                    tenantId: request.tenantId,
                    config: request.config,
                    priority: request.priority,
                    force: request.filter?.missingVectors ? false : undefined,
                });
                jobIds.push(response.jobId);
            }
            const executionTime = Date.now() - startTime;
            this.monitoring.trackEvent('batch-vectorization-created', {
                tenantId: request.tenantId,
                totalShards: shardIds.length,
                executionTime: executionTime.toString(),
            });
            return {
                jobIds,
                totalShards: shardIds.length,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorizationService',
                operation: 'batchVectorize',
                tenantId: request.tenantId,
            });
            throw new VectorizationError(`Failed to create batch vectorization: ${error.message}`, VectorizationErrorCode.UNKNOWN_ERROR, 500, error);
        }
    }
    /**
     * Calculate job progress (0-100)
     */
    calculateProgress(job) {
        switch (job.status) {
            case VectorizationStatus.PENDING:
                return 0;
            case VectorizationStatus.IN_PROGRESS:
                return 50; // Could be more granular based on chunks processed
            case VectorizationStatus.COMPLETED:
                return 100;
            case VectorizationStatus.FAILED:
            case VectorizationStatus.CANCELLED:
                return 0;
            default:
                return 0;
        }
    }
    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        if (error instanceof VectorizationError) {
            return (error.code === VectorizationErrorCode.EMBEDDING_API_RATE_LIMIT ||
                error.code === VectorizationErrorCode.EMBEDDING_API_ERROR);
        }
        return false;
    }
    /**
     * Get shard from Cosmos DB
     */
    async getShard(shardId, tenantId) {
        try {
            const query = 'SELECT * FROM c WHERE c.id = @id AND c.tenantId = @tenantId';
            const { resources } = await this.container.items
                .query({
                query,
                parameters: [
                    { name: '@id', value: shardId },
                    { name: '@tenantId', value: tenantId },
                ],
            })
                .fetchAll();
            return resources[0] || null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorizationService',
                operation: 'getShard',
                shardId,
            });
            return null;
        }
    }
    /**
     * Update shard in Cosmos DB
     */
    async updateShard(shard) {
        await this.container.items.upsert(shard);
    }
    /**
     * Query shard IDs based on filter
     */
    async queryShardIds(tenantId, filter) {
        let query = 'SELECT c.id FROM c WHERE c.tenantId = @tenantId';
        const parameters = [{ name: '@tenantId', value: tenantId }];
        if (filter?.shardTypeId) {
            query += ' AND c.shardTypeId = @shardTypeId';
            parameters.push({ name: '@shardTypeId', value: filter.shardTypeId });
        }
        if (filter?.status) {
            query += ' AND c.status = @status';
            parameters.push({ name: '@status', value: filter.status });
        }
        if (filter?.updatedAfter) {
            query += ' AND c.metadata.updatedAt >= @updatedAfter';
            parameters.push({ name: '@updatedAfter', value: filter.updatedAfter.toISOString() });
        }
        if (filter?.missingVectors) {
            query += ' AND (NOT IS_DEFINED(c.vectors) OR ARRAY_LENGTH(c.vectors) = 0)';
        }
        const { resources } = await this.container.items.query({ query, parameters }).fetchAll();
        return resources.map((r) => r.id);
    }
    /**
     * Save job to Redis
     */
    async saveJob(job) {
        const key = `${this.queueConfig.redisKeyPrefix}:${job.id}`;
        await this.redis.setex(key, 86400, JSON.stringify(job)); // 24 hour TTL
    }
    /**
     * Get job from Redis
     */
    async getJob(jobId) {
        const key = `${this.queueConfig.redisKeyPrefix}:${jobId}`;
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    /**
     * Invalidate caches after vectorization
     */
    async invalidateCaches(tenantId, shardId) {
        try {
            // Invalidate vector search cache for this tenant
            await this.cacheService.invalidateTenant(tenantId);
            this.monitoring.trackEvent('vectorization-cache-invalidated', {
                tenantId,
                shardId,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                component: 'VectorizationService',
                operation: 'invalidateCaches',
                tenantId,
                shardId,
            });
        }
    }
    /**
     * Cleanup method for graceful shutdown
     * Clears all pending retry timeouts
     */
    shutdown() {
        for (const [jobId, timeoutId] of this.retryTimeouts) {
            clearTimeout(timeoutId);
        }
        this.retryTimeouts.clear();
    }
}
//# sourceMappingURL=vectorization.service.js.map