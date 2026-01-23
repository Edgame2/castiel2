/**
 * Intent Pattern Repository
 * Manages intent classification patterns in Cosmos DB
 */
import { v4 as uuidv4 } from 'uuid';
export class IntentPatternRepository {
    container;
    constructor(client, databaseId, containerId = 'intent-patterns') {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Ensure container exists
     */
    static async ensureContainer(client, databaseId, containerId = 'intent-patterns') {
        const database = client.database(databaseId);
        try {
            await database.containers.createIfNotExists({
                id: containerId,
                partitionKey: '/partitionKey',
                indexingPolicy: {
                    automatic: true,
                    indexingMode: 'consistent',
                    includedPaths: [{ path: '/*' }],
                    excludedPaths: [{ path: '/_etag/?' }],
                    compositeIndexes: [
                        [
                            { path: '/partitionKey', order: 'ascending' },
                            { path: '/isActive', order: 'ascending' },
                            { path: '/intentType', order: 'ascending' },
                            { path: '/metrics.accuracyRate', order: 'descending' },
                        ],
                        [
                            { path: '/partitionKey', order: 'ascending' },
                            { path: '/priority', order: 'descending' },
                        ],
                    ],
                },
                throughput: 400,
            });
        }
        catch (error) {
            // Container might already exist, ignore
        }
        return database.container(containerId);
    }
    /**
     * Create a new intent pattern
     */
    async create(input, createdBy) {
        const now = new Date();
        const pattern = {
            id: uuidv4(),
            name: input.name,
            description: input.description,
            intentType: input.intentType,
            subtype: input.subtype,
            patterns: input.patterns,
            keywords: input.keywords || [],
            phrases: input.phrases || [],
            priority: input.priority ?? 5,
            confidenceWeight: input.confidenceWeight ?? 1.0,
            requiresContext: input.requiresContext,
            excludePatterns: input.excludePatterns,
            metrics: {
                totalMatches: 0,
                accuracyRate: 0,
                avgConfidence: 0,
            },
            source: 'manual',
            createdBy,
            createdAt: now,
            updatedAt: now,
            version: 1,
            isActive: input.isActive ?? true,
            tenantId: 'SYSTEM',
            partitionKey: 'SYSTEM',
            type: 'intent-pattern',
        };
        const { resource } = await this.container.items.create(pattern);
        return resource;
    }
    /**
     * Get pattern by ID
     */
    async findById(id) {
        try {
            const { resource } = await this.container.item(id, 'SYSTEM').read();
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
     * List patterns with filters
     */
    async list(options = {}) {
        const conditions = ['c.partitionKey = @partitionKey'];
        const parameters = [
            { name: '@partitionKey', value: 'SYSTEM' },
        ];
        if (options.intentType) {
            conditions.push('c.intentType = @intentType');
            parameters.push({ name: '@intentType', value: options.intentType });
        }
        if (options.isActive !== undefined) {
            conditions.push('c.isActive = @isActive');
            parameters.push({ name: '@isActive', value: options.isActive });
        }
        if (options.minAccuracy !== undefined) {
            conditions.push('c.metrics.accuracyRate >= @minAccuracy');
            parameters.push({ name: '@minAccuracy', value: options.minAccuracy });
        }
        const whereClause = conditions.join(' AND ');
        // Determine sort order
        let orderBy = 'c.priority DESC, c.createdAt DESC';
        if (options.sortBy === 'accuracy') {
            orderBy = 'c.metrics.accuracyRate DESC';
        }
        else if (options.sortBy === 'coverage') {
            orderBy = 'c.metrics.totalMatches DESC';
        }
        else if (options.sortBy === 'createdAt') {
            orderBy = 'c.createdAt DESC';
        }
        else if (options.sortBy === 'priority') {
            orderBy = 'c.priority DESC';
        }
        const querySpec = {
            query: `SELECT * FROM c WHERE ${whereClause} ORDER BY ${orderBy}`,
            parameters,
        };
        const { resources } = await this.container.items.query(querySpec).fetchAll();
        const patterns = resources;
        // Get total count
        const countQuerySpec = {
            query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
            parameters,
        };
        const { resources: countResources } = await this.container.items.query(countQuerySpec).fetchAll();
        const total = (countResources)[0] || 0;
        // Apply pagination
        const limit = options.limit || 100;
        const offset = options.offset || 0;
        const paginatedPatterns = patterns.slice(offset, offset + limit);
        return {
            patterns: paginatedPatterns,
            total,
        };
    }
    /**
     * Update pattern
     */
    async update(id, input, updatedBy) {
        const existing = await this.findById(id);
        if (!existing) {
            throw new Error(`Intent pattern ${id} not found`);
        }
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date(),
            version: existing.version + 1,
        };
        const { resource } = await this.container.item(id, 'SYSTEM').replace(updated);
        return resource;
    }
    /**
     * Delete pattern
     */
    async delete(id) {
        await this.container.item(id, 'SYSTEM').delete();
    }
    /**
     * Get active patterns for a specific intent type
     */
    async findActiveByIntentType(intentType) {
        const querySpec = {
            query: `
        SELECT * FROM c 
        WHERE c.partitionKey = @partitionKey 
          AND c.intentType = @intentType 
          AND c.isActive = @isActive
        ORDER BY c.priority DESC
      `,
            parameters: [
                { name: '@partitionKey', value: 'SYSTEM' },
                { name: '@intentType', value: intentType },
                { name: '@isActive', value: true },
            ],
        };
        const { resources } = await this.container.items.query(querySpec).fetchAll();
        return resources;
    }
    /**
     * Update pattern metrics
     */
    async updateMetrics(id, metrics) {
        const existing = await this.findById(id);
        if (!existing) {
            throw new Error(`Intent pattern ${id} not found`);
        }
        const updated = {
            ...existing,
            metrics: {
                ...existing.metrics,
                ...metrics,
            },
            updatedAt: new Date(),
        };
        const { resource } = await this.container.item(id, 'SYSTEM').replace(updated);
        return resource;
    }
}
//# sourceMappingURL=intent-pattern.repository.js.map