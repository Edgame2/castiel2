import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
export class EmbeddingJobRepository {
    client;
    container;
    constructor() {
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
        const database = this.client.database(config.cosmosDb.databaseId);
        const containerId = process.env.COSMOS_DB_EMBEDDING_JOBS_CONTAINER || 'embedding-jobs';
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
                ],
            },
            throughput: 400,
        }).catch((error) => {
            // Log error but don't throw - container may already exist
            // Note: This repository doesn't have monitoring injected, so we use console.error as fallback
            // TODO: Inject IMonitoringProvider into EmbeddingJobRepository constructor
            console.error('[EmbeddingJobRepository] Failed to create container:', error);
            return undefined;
        });
        this.container = database.container(containerId);
    }
    async create(job) {
        const { resource } = await this.container.items.create(job);
        return resource;
    }
    async update(jobId, tenantId, updates) {
        const { resource: existing } = await this.container.item(jobId, tenantId).read();
        if (!existing) {
            throw new Error(`EmbeddingJob ${jobId} not found`);
        }
        const merged = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        const { resource } = await this.container.item(jobId, tenantId).replace(merged);
        return resource;
    }
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
    async list(tenantId, options) {
        const conditions = ['c.tenantId = @tenantId'];
        const parameters = [
            { name: '@tenantId', value: tenantId }
        ];
        if (options?.status) {
            conditions.push('c.status = @status');
            parameters.push({ name: '@status', value: options.status });
        }
        if (options?.shardId) {
            conditions.push('c.shardId = @shardId');
            parameters.push({ name: '@shardId', value: options.shardId });
        }
        if (options?.shardTypeId) {
            conditions.push('c.shardTypeId = @shardTypeId');
            parameters.push({ name: '@shardTypeId', value: options.shardTypeId });
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
    async getStats(tenantId) {
        const statuses = ['pending', 'processing', 'completed', 'failed'];
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
        return {
            pending: counts['pending'] || 0,
            processing: counts['processing'] || 0,
            completed: counts['completed'] || 0,
            failed: counts['failed'] || 0,
        };
    }
}
//# sourceMappingURL=embedding-job.repository.js.map