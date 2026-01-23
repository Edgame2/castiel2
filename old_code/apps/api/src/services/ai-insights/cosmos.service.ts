// @ts-nocheck - Optional AI service, not used by workers
/**
 * AI Insights Cosmos Service
 * Provides unified access to all AI Insights containers with HPK support
 */

import { Container, CosmosClient, Database, SqlQuerySpec, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../../config/env.js';

/**
 * Base document interface for AI Insights containers
 */
export interface BaseDocument {
    id: string;
    tenantId: string;
    partitionKey: string[] | string; // HPK array or simple string
    type: string;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Query options for Cosmos DB
 */
export interface QueryOptions {
    maxItems?: number;
    continuationToken?: string;
}

/**
 * Query result with continuation support
 */
export interface QueryResult<T> {
    items: T[];
    continuationToken?: string;
    hasMore: boolean;
}

/**
 * AI Insights Cosmos Service
 * Manages all AI Insights containers with proper HPK handling
 */
export class AIInsightsCosmosService {
    private client: CosmosClient;
    private database: Database;
    private monitoring: IMonitoringProvider;

    // Container references
    private feedbackContainer: Container;
    private learningContainer: Container;
    private experimentsContainer: Container;
    private mediaContainer: Container;
    private searchContainer: Container;
    private webPagesContainer: Container;
    private collaborationContainer: Container;
    private templatesContainer: Container;
    private auditContainer: Container;
    private graphContainer: Container;
    private exportsContainer: Container;
    private backupsContainer: Container;
    private promptsContainer: Container;

    constructor(monitoring: IMonitoringProvider) {
        this.monitoring = monitoring;

        // Initialize Cosmos client with optimized connection policy
        const connectionPolicy: ConnectionPolicy = {
            connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
            requestTimeout: 30000, // 30 seconds
            enableEndpointDiscovery: true, // For multi-region
            retryOptions: {
                maxRetryAttemptCount: 9,
                fixedRetryIntervalInMilliseconds: 0, // Exponential backoff
                maxWaitTimeInSeconds: 30,
            } as RetryOptions,
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

    getFeedbackContainer(): Container {
        return this.feedbackContainer;
    }

    getLearningContainer(): Container {
        return this.learningContainer;
    }

    getExperimentsContainer(): Container {
        return this.experimentsContainer;
    }

    getMediaContainer(): Container {
        return this.mediaContainer;
    }

    getSearchContainer(): Container {
        return this.searchContainer;
    }

    getWebPagesContainer(): Container {
        return this.webPagesContainer;
    }

    getCollaborationContainer(): Container {
        return this.collaborationContainer;
    }

    getTemplatesContainer(): Container {
        return this.templatesContainer;
    }

    getAuditContainer(): Container {
        return this.auditContainer;
    }

    getGraphContainer(): Container {
        return this.graphContainer;
    }

    getExportsContainer(): Container {
        return this.exportsContainer;
    }

    getBackupsContainer(): Container {
        return this.backupsContainer;
    }

    getPromptsContainer(): Container {
        return this.promptsContainer;
    }

    // ==========================================================================
    // Generic CRUD Operations
    // ==========================================================================

    /**
     * Create a document in a container
     */
    async create<T extends BaseDocument>(
        container: Container,
        document: T
    ): Promise<T> {
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

            return resource as T;
        } catch (error) {
            this.monitoring.trackException(error as Error, {
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
    async read<T extends BaseDocument>(
        container: Container,
        id: string,
        partitionKey: string | string[]
    ): Promise<T | null> {
        const startTime = Date.now();

        try {
            const { resource } = await container.item(id, partitionKey as any).read<T>();

            this.monitoring.trackMetric('ai-insights.cosmos.read.duration', Date.now() - startTime, {
                container: container.id,
            });

            return resource || null;
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }

            this.monitoring.trackException(error as Error, {
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
    async update<T extends BaseDocument>(
        container: Container,
        id: string,
        partitionKey: string | string[],
        updates: Partial<T>
    ): Promise<T> {
        const startTime = Date.now();

        try {
            // Read existing document
            const existing = await this.read<T>(container, id, partitionKey);
            if (!existing) {
                throw new Error(`Document not found: ${id}`);
            }

            // Merge updates
            const updated = {
                ...existing,
                ...updates,
                updatedAt: new Date(),
            };

            const { resource } = await container.item(id, partitionKey as any).replace(updated);

            this.monitoring.trackMetric('ai-insights.cosmos.update.duration', Date.now() - startTime, {
                container: container.id,
            });

            return resource as T;
        } catch (error) {
            this.monitoring.trackException(error as Error, {
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
    async delete(
        container: Container,
        id: string,
        partitionKey: string | string[]
    ): Promise<void> {
        const startTime = Date.now();

        try {
            await container.item(id, partitionKey as any).delete();

            this.monitoring.trackMetric('ai-insights.cosmos.delete.duration', Date.now() - startTime, {
                container: container.id,
            });
        } catch (error: any) {
            if (error.code !== 404) {
                this.monitoring.trackException(error as Error, {
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
    async query<T extends BaseDocument>(
        container: Container,
        querySpec: SqlQuerySpec,
        options: QueryOptions = {}
    ): Promise<QueryResult<T>> {
        const startTime = Date.now();

        try {
            const iterator = container.items.query<T>(querySpec, {
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
        } catch (error) {
            this.monitoring.trackException(error as Error, {
                operation: 'ai-insights.cosmos.query',
                container: container.id,
            });
            throw error;
        }
    }

    /**
     * Query all documents (auto-pagination)
     */
    async queryAll<T extends BaseDocument>(
        container: Container,
        querySpec: SqlQuerySpec,
        maxItems?: number
    ): Promise<T[]> {
        const startTime = Date.now();
        const allItems: T[] = [];
        let continuationToken: string | undefined;

        try {
            do {
                const result = await this.query<T>(container, querySpec, {
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
        } catch (error) {
            this.monitoring.trackException(error as Error, {
                operation: 'ai-insights.cosmos.queryAll',
                container: container.id,
            });
            throw error;
        }
    }

    /**
     * Batch upsert documents
     */
    async batchUpsert<T extends BaseDocument>(
        container: Container,
        documents: T[]
    ): Promise<T[]> {
        const startTime = Date.now();

        try {
            const results = await Promise.all(
                documents.map(async (doc) => {
                    const now = new Date();
                    const docWithTimestamps = {
                        ...doc,
                        createdAt: doc.createdAt || now,
                        updatedAt: now,
                    };

                    const { resource } = await container.items.upsert(docWithTimestamps);
                    return resource as T;
                })
            );

            this.monitoring.trackMetric('ai-insights.cosmos.batchUpsert.duration', Date.now() - startTime, {
                container: container.id,
                count: documents.length,
            });

            return results;
        } catch (error) {
            this.monitoring.trackException(error as Error, {
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
    buildPartitionKey(...parts: string[]): string[] {
        return parts.filter((p) => p !== undefined && p !== null);
    }

    /**
     * Check if container is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Test feedback container as representative
            await this.feedbackContainer.read();
            return true;
        } catch (error) {
            this.monitoring.trackException(error as Error, {
                operation: 'ai-insights.cosmos.healthCheck',
            });
            return false;
        }
    }
}
