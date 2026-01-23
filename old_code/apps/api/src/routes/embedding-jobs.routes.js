import { EmbeddingJobRepository } from '../repositories/embedding-job.repository.js';
/**
 * Register embedding job routes
 * Provides API endpoints for tracking embedding job status and statistics
 */
export async function registerEmbeddingJobRoutes(server, monitoring) {
    const repo = new EmbeddingJobRepository();
    // Auth decorator (reuse from insights routes pattern)
    const authDecorator = async (request, reply) => {
        const user = request.user;
        if (!user || !user.tenantId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    };
    /**
     * List embedding jobs
     * GET /api/v1/embedding-jobs
     */
    server.get('/api/v1/embedding-jobs', {
        onRequest: [authDecorator],
        schema: {
            description: 'List embedding jobs with optional filters',
            tags: ['embedding-jobs'],
            querystring: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['pending', 'processing', 'completed', 'failed'],
                        description: 'Filter by job status',
                    },
                    limit: {
                        type: 'number',
                        default: 20,
                        maximum: 100,
                        description: 'Maximum number of jobs to return',
                    },
                    offset: {
                        type: 'number',
                        default: 0,
                        description: 'Number of jobs to skip',
                    },
                    shardId: {
                        type: 'string',
                        description: 'Filter by shard ID',
                    },
                    shardTypeId: {
                        type: 'string',
                        description: 'Filter by shard type ID',
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { status, limit = 20, offset = 0, shardId, shardTypeId } = request.query;
        try {
            let jobs;
            // Use list method with filters
            const result = await repo.list(tenantId, {
                status,
                shardId,
                shardTypeId,
                limit,
                offset,
            });
            const hasMore = result.total > offset + limit;
            monitoring.trackEvent('embedding-job.list', {
                tenantId,
                status,
                count: result.jobs.length,
            });
            return reply.send({
                jobs: result.jobs,
                total: result.total,
                limit,
                offset,
                hasMore,
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                component: 'EmbeddingJobRoutes',
                operation: 'list',
                tenantId,
            });
            return reply.status(500).send({
                error: 'Failed to list embedding jobs',
                message: error.message,
            });
        }
    });
    /**
     * Get embedding job by ID
     * GET /api/v1/embedding-jobs/:id
     */
    server.get('/api/v1/embedding-jobs/:id', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get embedding job by ID',
            tags: ['embedding-jobs'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { id } = request.params;
        try {
            const job = await repo.findById(id, tenantId);
            if (!job) {
                return reply.status(404).send({ error: 'Embedding job not found' });
            }
            monitoring.trackEvent('embedding-job.get', {
                tenantId,
                jobId: id,
                status: job.status,
            });
            return reply.send(job);
        }
        catch (error) {
            monitoring.trackException(error, {
                component: 'EmbeddingJobRoutes',
                operation: 'get',
                tenantId,
                jobId: id,
            });
            return reply.status(500).send({
                error: 'Failed to get embedding job',
                message: error.message,
            });
        }
    });
    /**
     * Get embedding job statistics
     * GET /api/v1/embedding-jobs/stats
     */
    server.get('/api/v1/embedding-jobs/stats', {
        onRequest: [authDecorator],
        schema: {
            description: 'Get embedding job statistics for tenant',
            tags: ['embedding-jobs'],
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        try {
            const stats = await repo.getStats(tenantId);
            monitoring.trackEvent('embedding-job.stats', {
                tenantId,
                ...stats,
            });
            return reply.send(stats);
        }
        catch (error) {
            monitoring.trackException(error, {
                component: 'EmbeddingJobRoutes',
                operation: 'stats',
                tenantId,
            });
            return reply.status(500).send({
                error: 'Failed to get embedding job statistics',
                message: error.message,
            });
        }
    });
    /**
     * Retry a failed embedding job
     * POST /api/v1/embedding-jobs/:id/retry
     */
    server.post('/api/v1/embedding-jobs/:id/retry', {
        onRequest: [authDecorator],
        schema: {
            description: 'Retry a failed embedding job',
            tags: ['embedding-jobs'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        jobId: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const { id } = request.params;
        try {
            const job = await repo.findById(id, tenantId);
            if (!job) {
                return reply.status(404).send({ error: 'Embedding job not found' });
            }
            if (job.status !== 'failed') {
                return reply.status(400).send({
                    error: 'Job cannot be retried',
                    message: `Job status is ${job.status}, only failed jobs can be retried`,
                });
            }
            // Update job status to pending for retry
            const updated = await repo.update(id, tenantId, {
                status: 'pending',
                retryCount: (job.retryCount || 0) + 1,
                error: undefined, // Clear previous error
            });
            // If Service Bus is available, enqueue the job again
            const serviceBusService = request.server.serviceBusService;
            if (serviceBusService) {
                const { EmbeddingJobMessage } = await import('../types/embedding-job.types.js');
                const jobMessage = {
                    shardId: job.shardId,
                    tenantId: job.tenantId,
                    shardTypeId: job.shardTypeId,
                    dedupeKey: `retry-${job.id}-${Date.now()}`,
                    revisionNumber: job.revisionNumber,
                    options: { forceRegenerate: true },
                };
                await serviceBusService.sendEmbeddingJob(jobMessage);
            }
            monitoring.trackEvent('embedding-job.retried', {
                tenantId,
                jobId: id,
                retryCount: updated.retryCount,
            });
            return reply.status(200).send({
                success: true,
                jobId: id,
                message: 'Job queued for retry',
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                component: 'EmbeddingJobRoutes',
                operation: 'retry',
                tenantId,
                jobId: id,
            });
            return reply.status(500).send({
                error: 'Failed to retry embedding job',
                message: error.message,
            });
        }
    });
    server.log.info('✅ Embedding job routes registered');
}
//# sourceMappingURL=embedding-jobs.routes.js.map