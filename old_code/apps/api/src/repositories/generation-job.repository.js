/**
 * Generation Job Repository
 *
 * Manages generation job status in Cosmos DB
 */
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
export class GenerationJobRepository {
    client;
    container;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
        const database = this.client.database(config.cosmosDb.databaseId);
        const containerId = process.env.COSMOS_DB_GENERATION_JOBS_CONTAINER || 'generation-jobs';
        // Ensure container exists
        database.containers.createIfNotExists({
            id: containerId,
            partitionKey: '/tenantId',
            defaultTtl: -1,
            indexingPolicy: {
                automatic: true,
                indexingMode: 'consistent',
                includedPaths: [{ path: '/*' }],
                excludedPaths: [{ path: '/_etag/?' }],
                compositeIndexes: [
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/status', order: 'ascending' },
                        { path: '/createdAt', order: 'descending' },
                    ],
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/userId', order: 'ascending' },
                        { path: '/createdAt', order: 'descending' },
                    ],
                ],
            },
            throughput: 400,
        }).catch((error) => {
            this.monitoring?.trackException(error, { operation: 'generationJobRepository.containerInit' });
            return undefined;
        });
        this.container = database.container(containerId);
    }
    /**
     * Health check - verify Cosmos DB connectivity
     */
    async healthCheck() {
        try {
            // Try to read the database to verify connectivity
            const database = this.client.database(config.cosmosDb.databaseId);
            await database.read();
            return true;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'generation-job.repository.health-check' });
            return false;
        }
    }
    /**
     * Create a new generation job
     */
    async create(job) {
        const { resource } = await this.container.items.create(job);
        return resource;
    }
    /**
     * Update job status and metadata
     */
    async update(jobId, tenantId, updates) {
        const { resource: existing } = await this.container.item(jobId, tenantId).read();
        if (!existing) {
            throw new Error(`GenerationJob ${jobId} not found`);
        }
        const merged = {
            ...existing,
            ...updates,
        };
        const { resource } = await this.container.item(jobId, tenantId).replace(merged);
        return resource;
    }
    /**
     * Find job by ID
     */
    async findById(jobId, tenantId) {
        try {
            const { resource } = await this.container.item(jobId, tenantId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Delete a generation job
     */
    async delete(jobId, tenantId) {
        try {
            await this.container.item(jobId, tenantId).delete();
        }
        catch (error) {
            // If job doesn't exist, that's okay - it's already deleted
            if (error.code === 404) {
                return;
            }
            throw error;
        }
    }
    /**
     * Find jobs by status
     */
    async findByStatus(status, tenantId) {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.createdAt DESC',
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@status', value: status },
            ],
        };
        const { resources } = await this.container.items.query(querySpec).fetchAll();
        return resources;
    }
    /**
     * List jobs with filters
     */
    async list(tenantId, options) {
        const conditions = ['c.tenantId = @tenantId'];
        const parameters = [
            { name: '@tenantId', value: tenantId },
        ];
        if (options?.status) {
            conditions.push('c.status = @status');
            parameters.push({ name: '@status', value: options.status });
        }
        if (options?.userId) {
            conditions.push('c.userId = @userId');
            parameters.push({ name: '@userId', value: options.userId });
        }
        if (options?.templateId) {
            conditions.push('c.templateId = @templateId');
            parameters.push({ name: '@templateId', value: options.templateId });
        }
        if (options?.createdAfter) {
            conditions.push('c.createdAt >= @createdAfter');
            parameters.push({ name: '@createdAfter', value: options.createdAfter.toISOString() });
        }
        if (options?.createdBefore) {
            conditions.push('c.createdAt <= @createdBefore');
            parameters.push({ name: '@createdBefore', value: options.createdBefore.toISOString() });
        }
        const whereClause = conditions.join(' AND ');
        const querySpec = {
            query: `SELECT * FROM c WHERE ${whereClause} ORDER BY c.createdAt DESC`,
            parameters,
        };
        const { resources } = await this.container.items.query(querySpec).fetchAll();
        // Get total count
        const countQuerySpec = {
            query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
            parameters,
        };
        const { resources: countResources } = await this.container.items.query(countQuerySpec).fetchAll();
        const total = (countResources)[0] || 0;
        // Apply pagination
        const limit = options?.limit || 100;
        const offset = options?.offset || 0;
        const jobs = resources.slice(offset, offset + limit);
        return { jobs, total };
    }
    /**
     * Get job statistics for a tenant
     */
    async getStats(tenantId) {
        const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
        const counts = {};
        for (const status of statuses) {
            const querySpec = {
                query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@status', value: status },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            counts[status] = (resources)[0] || 0;
        }
        const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const completed = counts['completed'] || 0;
        const failed = counts['failed'] || 0;
        const cancelled = counts['cancelled'] || 0;
        const finished = completed + failed + cancelled;
        // Compute basic analytics from completed jobs (limit to recent 1000 for performance)
        let analytics = undefined;
        if (completed > 0) {
            try {
                const analyticsQuery = {
                    query: `
            SELECT TOP 1000 
              c.resultMetadata.duration,
              c.resultMetadata.tokensUsed,
              c.placeholdersFilled,
              c.error.code as errorCode,
              c.status
            FROM c 
            WHERE c.tenantId = @tenantId 
            AND (c.status = @completed OR c.status = @failed)
            ORDER BY c.completedAt DESC
          `,
                    parameters: [
                        { name: '@tenantId', value: tenantId },
                        { name: '@completed', value: 'completed' },
                        { name: '@failed', value: 'failed' },
                    ],
                };
                const { resources: analyticsData } = await this.container.items.query(analyticsQuery).fetchAll();
                if (analyticsData && analyticsData.length > 0) {
                    const completedJobs = analyticsData.filter((j) => j.duration !== undefined);
                    const failedJobs = analyticsData.filter((j) => j.errorCode);
                    // Calculate averages from completed jobs
                    const durations = completedJobs.map((j) => j.duration).filter((d) => typeof d === 'number');
                    const tokens = completedJobs.map((j) => j.tokensUsed).filter((t) => typeof t === 'number');
                    const placeholders = completedJobs.map((j) => j.placeholdersFilled).filter((p) => typeof p === 'number');
                    // Count error codes
                    const errorCounts = {};
                    failedJobs.forEach((j) => {
                        if (j.errorCode) {
                            errorCounts[j.errorCode] = (errorCounts[j.errorCode] || 0) + 1;
                        }
                    });
                    analytics = {
                        averageDuration: durations.length > 0
                            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                            : undefined,
                        successRate: finished > 0 ? Math.round((completed / finished) * 100) : undefined,
                        averagePlaceholdersFilled: placeholders.length > 0
                            ? Math.round(placeholders.reduce((a, b) => a + b, 0) / placeholders.length * 10) / 10
                            : undefined,
                        averageTokensUsed: tokens.length > 0
                            ? Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length)
                            : undefined,
                        mostCommonErrors: Object.entries(errorCounts)
                            .map(([errorCode, count]) => ({ errorCode, count }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 5), // Top 5 errors
                    };
                }
            }
            catch (error) {
                // If analytics computation fails, just return counts
                this.monitoring?.trackException(error, { operation: 'generation-job.repository.compute-analytics' });
            }
        }
        return {
            pending: counts['pending'] || 0,
            processing: counts['processing'] || 0,
            completed,
            failed,
            cancelled,
            total,
            ...(analytics ? { analytics } : {}),
        };
    }
    /**
     * Cancel all pending/processing jobs for a template
     * Used when template is deleted or archived
     */
    async cancelJobsForTemplate(templateId, tenantId) {
        try {
            // Find all pending or processing jobs for this template
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.templateId = @templateId AND c.status IN (@pending, @processing)',
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@templateId', value: templateId },
                    { name: '@pending', value: 'pending' },
                    { name: '@processing', value: 'processing' },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            const jobs = resources;
            // Cancel each job
            let cancelled = 0;
            for (const job of jobs) {
                try {
                    await this.update(job.id, job.tenantId, {
                        status: 'cancelled',
                        completedAt: new Date().toISOString(),
                        error: {
                            message: 'Template was deleted or archived',
                            code: 'TEMPLATE_DELETED',
                        },
                    });
                    cancelled++;
                }
                catch (error) {
                    // Log but continue with other jobs
                    this.monitoring?.trackException(error, { operation: 'generation-job.repository.cancel-job', jobId: job.id });
                }
            }
            return cancelled;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Delete old completed/failed/cancelled jobs (cleanup)
     */
    async deleteOldJobs(tenantId, olderThanDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const querySpec = {
                query: `
          SELECT c.id 
          FROM c 
          WHERE c.tenantId = @tenantId 
          AND c.status IN (@completed, @failed, @cancelled)
          AND (c.completedAt < @cutoffDate OR (c.completedAt IS NULL AND c.createdAt < @cutoffDate))
        `,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@completed', value: 'completed' },
                    { name: '@failed', value: 'failed' },
                    { name: '@cancelled', value: 'cancelled' },
                    { name: '@cutoffDate', value: cutoffDate.toISOString() },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            let deleted = 0;
            for (const item of resources) {
                try {
                    await this.container.item(item.id, tenantId).delete();
                    deleted++;
                }
                catch (error) {
                    // Log but continue with other deletions
                    this.monitoring?.trackException(error, { operation: 'generation-job.repository.delete-job', jobId: item.id });
                }
            }
            return deleted;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'generationJobRepository.deleteOldJobs',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Find stuck jobs (processing jobs that have exceeded timeout)
     */
    async findStuckJobs(tenantId, timeoutMs) {
        try {
            const cutoffTime = new Date(Date.now() - timeoutMs);
            const querySpec = {
                query: `
          SELECT * FROM c 
          WHERE c.tenantId = @tenantId 
          AND c.status = @status
          AND c.startedAt < @cutoffTime
        `,
                parameters: [
                    { name: '@tenantId', value: tenantId },
                    { name: '@status', value: 'processing' },
                    { name: '@cutoffTime', value: cutoffTime.toISOString() },
                ],
            };
            const { resources } = await this.container.items.query(querySpec).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'generationJobRepository.findStuckJobs',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Mark stuck jobs as failed
     */
    async markStuckJobsAsFailed(tenantId, timeoutMs) {
        try {
            const stuckJobs = await this.findStuckJobs(tenantId, timeoutMs);
            let marked = 0;
            for (const job of stuckJobs) {
                try {
                    await this.update(job.id, job.tenantId, {
                        status: 'failed',
                        completedAt: new Date().toISOString(),
                        error: {
                            message: `Job exceeded timeout of ${timeoutMs}ms and was marked as failed`,
                            code: 'JOB_TIMEOUT',
                            details: {
                                startedAt: job.startedAt,
                                timeoutMs,
                            },
                        },
                    });
                    marked++;
                }
                catch (error) {
                    // Log but continue with other jobs
                    this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
                        operation: 'generation-job.repository.mark-stuck-job-failed',
                        jobId: job.id,
                    });
                }
            }
            return marked;
        }
        catch (error) {
            throw error;
        }
    }
}
//# sourceMappingURL=generation-job.repository.js.map