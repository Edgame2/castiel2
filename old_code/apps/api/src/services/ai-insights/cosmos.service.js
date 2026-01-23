// @ts-nocheck - Optional AI service, not used by workers
/**
 * AI Insights Cosmos Service
 * Provides unified access to all AI Insights containers with HPK support
 */
import { CosmosClient } from '@azure/cosmos';
import { config } from '../../config/env.js';
/**
 * AI Insights Cosmos Service
 * Manages all AI Insights containers with proper HPK handling
 */
export class AIInsightsCosmosService {
    client;
    database;
    monitoring;
    // Container references
    feedbackContainer;
    learningContainer;
    experimentsContainer;
    mediaContainer;
    searchContainer;
    webPagesContainer;
    collaborationContainer;
    templatesContainer;
    auditContainer;
    graphContainer;
    exportsContainer;
    backupsContainer;
    promptsContainer;
    constructor(monitoring) {
        this.monitoring = monitoring;
        // Initialize Cosmos client with optimized connection policy
        const connectionPolicy = {
            connectionMode: 'Direct', // Best performance
            requestTimeout: 30000, // 30 seconds
            enableEndpointDiscovery: true, // For multi-region
            retryOptions: {
                maxRetryAttemptCount: 9,
                fixedRetryIntervalInMilliseconds: 0, // Exponential backoff
                maxWaitTimeInSeconds: 30,
            },
        };
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
            connectionPolicy,
        });
        this.database = this.client.database(config.cosmosDb.databaseId);
        // Initialize container references
        this.feedbackContainer = this.database.container(config.cosmosDb.containers.feedback);
        this.learningContainer = this.database.container(config.cosmosDb.containers.learning);
        this.experimentsContainer = this.database.container(config.cosmosDb.containers.experiments);
        this.mediaContainer = this.database.container(config.cosmosDb.containers.media);
        this.searchContainer = this.database.container(config.cosmosDb.containers.search);
        this.webPagesContainer = this.database.container(config.cosmosDb.containers.webPages);
        this.collaborationContainer = this.database.container(config.cosmosDb.containers.collaboration);
        this.templatesContainer = this.database.container(config.cosmosDb.containers.templates);
        this.auditContainer = this.database.container(config.cosmosDb.containers.audit);
        this.graphContainer = this.database.container(config.cosmosDb.containers.graph);
        this.exportsContainer = this.database.container(config.cosmosDb.containers.exports);
        this.backupsContainer = this.database.container(config.cosmosDb.containers.backups);
        this.promptsContainer = this.database.container('prompts'); // Hardcoded ID for now to match init script, ideally from config
    }
    // ==========================================================================
    // Container Accessors
    // ==========================================================================
    getFeedbackContainer() {
        return this.feedbackContainer;
    }
    getLearningContainer() {
        return this.learningContainer;
    }
    getExperimentsContainer() {
        return this.experimentsContainer;
    }
    getMediaContainer() {
        return this.mediaContainer;
    }
    getSearchContainer() {
        return this.searchContainer;
    }
    getWebPagesContainer() {
        return this.webPagesContainer;
    }
    getCollaborationContainer() {
        return this.collaborationContainer;
    }
    getTemplatesContainer() {
        return this.templatesContainer;
    }
    getAuditContainer() {
        return this.auditContainer;
    }
    getGraphContainer() {
        return this.graphContainer;
    }
    getExportsContainer() {
        return this.exportsContainer;
    }
    getBackupsContainer() {
        return this.backupsContainer;
    }
    getPromptsContainer() {
        return this.promptsContainer;
    }
    // ==========================================================================
    // Generic CRUD Operations
    // ==========================================================================
    /**
     * Create a document in a container
     */
    async create(container, document) {
        const startTime = Date.now();
        try {
            // Add timestamps
            const now = new Date();
            const docWithTimestamps = {
                ...document,
                createdAt: document.createdAt || now,
                updatedAt: now,
            };
            const { resource } = await container.items.create(docWithTimestamps);
            this.monitoring.trackMetric('ai-insights.cosmos.create.duration', Date.now() - startTime, {
                container: container.id,
                type: document.type,
            });
            return resource;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'ai-insights.cosmos.create',
                container: container.id,
                type: document.type,
            });
            throw error;
        }
    }
    /**
     * Read a document by ID and partition key
     */
    async read(container, id, partitionKey) {
        const startTime = Date.now();
        try {
            const { resource } = await container.item(id, partitionKey).read();
            this.monitoring.trackMetric('ai-insights.cosmos.read.duration', Date.now() - startTime, {
                container: container.id,
            });
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            this.monitoring.trackException(error, {
                operation: 'ai-insights.cosmos.read',
                container: container.id,
                id,
            });
            throw error;
        }
    }
    /**
     * Update a document
     */
    async update(container, id, partitionKey, updates) {
        const startTime = Date.now();
        try {
            // Read existing document
            const existing = await this.read(container, id, partitionKey);
            if (!existing) {
                throw new Error(`Document not found: ${id}`);
            }
            // Merge updates
            const updated = {
                ...existing,
                ...updates,
                updatedAt: new Date(),
            };
            const { resource } = await container.item(id, partitionKey).replace(updated);
            this.monitoring.trackMetric('ai-insights.cosmos.update.duration', Date.now() - startTime, {
                container: container.id,
            });
            return resource;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'ai-insights.cosmos.update',
                container: container.id,
                id,
            });
            throw error;
        }
    }
    /**
     * Delete a document
     */
    async delete(container, id, partitionKey) {
        const startTime = Date.now();
        try {
            await container.item(id, partitionKey).delete();
            this.monitoring.trackMetric('ai-insights.cosmos.delete.duration', Date.now() - startTime, {
                container: container.id,
            });
        }
        catch (error) {
            if (error.code !== 404) {
                this.monitoring.trackException(error, {
                    operation: 'ai-insights.cosmos.delete',
                    container: container.id,
                    id,
                });
                throw error;
            }
        }
    }
    /**
     * Query documents with pagination
     */
    async query(container, querySpec, options = {}) {
        const startTime = Date.now();
        try {
            const iterator = container.items.query(querySpec, {
                maxItemCount: options.maxItems || 100,
                continuationToken: options.continuationToken,
            });
            const { resources, continuationToken, hasMoreResults } = await iterator.fetchNext();
            this.monitoring.trackMetric('ai-insights.cosmos.query.duration', Date.now() - startTime, {
                container: container.id,
                itemCount: resources.length,
            });
            return {
                items: resources,
                continuationToken,
                hasMore: hasMoreResults,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'ai-insights.cosmos.query',
                container: container.id,
            });
            throw error;
        }
    }
    /**
     * Query all documents (auto-pagination)
     */
    async queryAll(container, querySpec, maxItems) {
        const startTime = Date.now();
        const allItems = [];
        let continuationToken;
        try {
            do {
                const result = await this.query(container, querySpec, {
                    maxItems: maxItems || 1000,
                    continuationToken,
                });
                allItems.push(...result.items);
                continuationToken = result.continuationToken;
                // Safety limit
                if (allItems.length >= (maxItems || 10000)) {
                    break;
                }
            } while (continuationToken);
            this.monitoring.trackMetric('ai-insights.cosmos.queryAll.duration', Date.now() - startTime, {
                container: container.id,
                totalItems: allItems.length,
            });
            return allItems;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'ai-insights.cosmos.queryAll',
                container: container.id,
            });
            throw error;
        }
    }
    /**
     * Batch upsert documents
     */
    async batchUpsert(container, documents) {
        const startTime = Date.now();
        try {
            const results = await Promise.all(documents.map(async (doc) => {
                const now = new Date();
                const docWithTimestamps = {
                    ...doc,
                    createdAt: doc.createdAt || now,
                    updatedAt: now,
                };
                const { resource } = await container.items.upsert(docWithTimestamps);
                return resource;
            }));
            this.monitoring.trackMetric('ai-insights.cosmos.batchUpsert.duration', Date.now() - startTime, {
                container: container.id,
                count: documents.length,
            });
            return results;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'ai-insights.cosmos.batchUpsert',
                container: container.id,
                count: documents.length,
            });
            throw error;
        }
    }
    // ==========================================================================
    // Utility Methods
    // ==========================================================================
    /**
     * Build HPK partition key array
     */
    buildPartitionKey(...parts) {
        return parts.filter((p) => p !== undefined && p !== null);
    }
    /**
     * Check if container is healthy
     */
    async healthCheck() {
        try {
            // Test feedback container as representative
            await this.feedbackContainer.read();
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'ai-insights.cosmos.healthCheck',
            });
            return false;
        }
    }
}
//# sourceMappingURL=cosmos.service.js.map