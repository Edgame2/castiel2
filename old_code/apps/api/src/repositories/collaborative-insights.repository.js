/**
 * Collaborative Insights Repository
 * Handles Cosmos DB operations for shared insights, comments, and reactions
 */
/**
 * Collaborative Insights Repository
 */
export class CollaborativeInsightsRepository {
    container;
    monitoring;
    constructor(client, databaseId, containerId, monitoring) {
        this.container = client.database(databaseId).container(containerId);
        this.monitoring = monitoring;
    }
    /**
     * Ensure container exists with HPK
     */
    static async ensureContainer(client, databaseId, containerId) {
        const database = client.database(databaseId);
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: {
                paths: ['/tenantId'],
            },
            defaultTtl: -1, // No default TTL, manage manually
            indexingPolicy: {
                indexingMode: 'consistent',
                automatic: true,
                includedPaths: [
                    { path: '/' },
                    { path: '/tenantId/?' },
                    // Note: '/id' is a system property and cannot be indexed
                    { path: '/sharedBy/?' },
                    { path: '/visibility/?' },
                    { path: '/sharedAt/?' },
                    { path: '/isArchived/?' },
                    { path: '/isPinned/?' },
                    { path: '/tags/[]/?' },
                    { path: '/sourceType/?' },
                    { path: '/sourceId/?' },
                ],
                excludedPaths: [
                    { path: '/content/?' }, // Large content field
                    { path: '/comments/*/content/?' }, // Comment content
                ],
                compositeIndexes: [
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/sharedAt', order: 'descending' },
                    ],
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/sharedBy', order: 'ascending' },
                        { path: '/sharedAt', order: 'descending' },
                    ],
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/visibility', order: 'ascending' },
                        { path: '/sharedAt', order: 'descending' },
                    ],
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/isArchived', order: 'ascending' },
                        { path: '/isPinned', order: 'descending' },
                        { path: '/sharedAt', order: 'descending' },
                    ],
                ],
            },
        });
        return container;
    }
    /**
     * Create or update a shared insight
     */
    async upsertInsight(insight) {
        // Convert Date objects to ISO strings for Cosmos DB
        const doc = {
            ...insight,
            sharedAt: insight.sharedAt instanceof Date ? insight.sharedAt.toISOString() : insight.sharedAt,
            updatedAt: insight.updatedAt instanceof Date ? insight.updatedAt.toISOString() : insight.updatedAt,
            expiresAt: insight.expiresAt instanceof Date ? insight.expiresAt.toISOString() : insight.expiresAt,
            reactions: insight.reactions.map(r => ({
                ...r,
                createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
            })),
            comments: insight.comments.map(c => ({
                ...c,
                createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
                updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
            })),
        };
        const partitionKey = [insight.tenantId, insight.id];
        const { resource } = await this.container.item(insight.id, partitionKey).replace(doc);
        if (!resource) {
            throw new Error('Failed to upsert insight');
        }
        // Convert back to Date objects
        return this.deserializeInsight(resource);
    }
    /**
     * Get insight by ID
     */
    async getInsight(insightId, tenantId) {
        try {
            const partitionKey = [tenantId, insightId];
            const { resource } = await this.container.item(insightId, partitionKey).read();
            if (!resource) {
                return null;
            }
            return this.deserializeInsight(resource);
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * List insights for a tenant with filters
     */
    async listInsights(tenantId, options) {
        const queryParts = ['SELECT * FROM c WHERE c.tenantId = @tenantId'];
        const parameters = [{ name: '@tenantId', value: tenantId }];
        if (options?.visibility) {
            queryParts.push('AND c.visibility = @visibility');
            parameters.push({ name: '@visibility', value: options.visibility });
        }
        if (options?.sharedBy) {
            queryParts.push('AND c.sharedBy = @sharedBy');
            parameters.push({ name: '@sharedBy', value: options.sharedBy });
        }
        if (options?.isArchived !== undefined) {
            queryParts.push('AND c.isArchived = @isArchived');
            parameters.push({ name: '@isArchived', value: options.isArchived });
        }
        if (options?.isPinned !== undefined) {
            queryParts.push('AND c.isPinned = @isPinned');
            parameters.push({ name: '@isPinned', value: options.isPinned });
        }
        if (options?.tags && options.tags.length > 0) {
            queryParts.push('AND ARRAY_CONTAINS(c.tags, @tag)');
            parameters.push({ name: '@tag', value: options.tags[0] }); // Cosmos DB limitation: one tag at a time
        }
        queryParts.push('ORDER BY c.sharedAt DESC');
        const query = {
            query: queryParts.join(' '),
            parameters,
        };
        try {
            const { resources } = await this.container.items.query(query, {
                partitionKey: [tenantId], // Query across tenant partition
                maxItemCount: options?.limit || 100,
            }).fetchAll();
            // Apply offset manually (Cosmos DB OFFSET requires ORDER BY with LIMIT)
            const offset = options?.offset || 0;
            const limit = options?.limit || 100;
            const paginated = resources.slice(offset, offset + limit);
            return paginated.map(r => this.deserializeInsight(r));
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'collaborative-insights-repository.list' });
            throw error;
        }
    }
    /**
     * Delete insight
     */
    async deleteInsight(insightId, tenantId) {
        try {
            const partitionKey = [tenantId, insightId];
            await this.container.item(insightId, partitionKey).delete();
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Update insight (partial update)
     */
    async updateInsight(insightId, tenantId, updates) {
        const existing = await this.getInsight(insightId, tenantId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
        };
        return this.upsertInsight(updated);
    }
    /**
     * Deserialize insight from Cosmos DB format (convert ISO strings back to Dates)
     */
    deserializeInsight(doc) {
        return {
            ...doc,
            sharedAt: new Date(doc.sharedAt),
            updatedAt: new Date(doc.updatedAt),
            expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : undefined,
            reactions: doc.reactions?.map((r) => ({
                ...r,
                createdAt: new Date(r.createdAt),
            })) || [],
            comments: doc.comments?.map((c) => ({
                ...c,
                createdAt: new Date(c.createdAt),
                updatedAt: new Date(c.updatedAt),
            })) || [],
        };
    }
}
//# sourceMappingURL=collaborative-insights.repository.js.map