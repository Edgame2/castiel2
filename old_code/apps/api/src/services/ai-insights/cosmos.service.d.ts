/**
 * AI Insights Cosmos Service
 * Provides unified access to all AI Insights containers with HPK support
 */
import { Container, SqlQuerySpec } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Base document interface for AI Insights containers
 */
export interface BaseDocument {
    id: string;
    tenantId: string;
    partitionKey: string[] | string;
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
export declare class AIInsightsCosmosService {
    private client;
    private database;
    private monitoring;
    private feedbackContainer;
    private learningContainer;
    private experimentsContainer;
    private mediaContainer;
    private searchContainer;
    private webPagesContainer;
    private collaborationContainer;
    private templatesContainer;
    private auditContainer;
    private graphContainer;
    private exportsContainer;
    private backupsContainer;
    private promptsContainer;
    constructor(monitoring: IMonitoringProvider);
    getFeedbackContainer(): Container;
    getLearningContainer(): Container;
    getExperimentsContainer(): Container;
    getMediaContainer(): Container;
    getSearchContainer(): Container;
    getWebPagesContainer(): Container;
    getCollaborationContainer(): Container;
    getTemplatesContainer(): Container;
    getAuditContainer(): Container;
    getGraphContainer(): Container;
    getExportsContainer(): Container;
    getBackupsContainer(): Container;
    getPromptsContainer(): Container;
    /**
     * Create a document in a container
     */
    create<T extends BaseDocument>(container: Container, document: T): Promise<T>;
    /**
     * Read a document by ID and partition key
     */
    read<T extends BaseDocument>(container: Container, id: string, partitionKey: string | string[]): Promise<T | null>;
    /**
     * Update a document
     */
    update<T extends BaseDocument>(container: Container, id: string, partitionKey: string | string[], updates: Partial<T>): Promise<T>;
    /**
     * Delete a document
     */
    delete(container: Container, id: string, partitionKey: string | string[]): Promise<void>;
    /**
     * Query documents with pagination
     */
    query<T extends BaseDocument>(container: Container, querySpec: SqlQuerySpec, options?: QueryOptions): Promise<QueryResult<T>>;
    /**
     * Query all documents (auto-pagination)
     */
    queryAll<T extends BaseDocument>(container: Container, querySpec: SqlQuerySpec, maxItems?: number): Promise<T[]>;
    /**
     * Batch upsert documents
     */
    batchUpsert<T extends BaseDocument>(container: Container, documents: T[]): Promise<T[]>;
    /**
     * Build HPK partition key array
     */
    buildPartitionKey(...parts: string[]): string[];
    /**
     * Check if container is healthy
     */
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=cosmos.service.d.ts.map