/**
 * Cosmos DB Client
 * Singleton client with connection pooling and tenant isolation
 * @module @coder/shared/database
 */
import { CosmosClient, Database, Container } from '@azure/cosmos';
/**
 * Cosmos DB configuration
 */
export interface CosmosDBConfig {
    endpoint: string;
    key: string;
    databaseId: string;
    connectionMode?: 'Direct' | 'Gateway';
    requestTimeout?: number;
    enableEndpointDiscovery?: boolean;
    maxRetryAttempts?: number;
    maxRetryWaitTime?: number;
}
/**
 * Cosmos DB Client Manager
 * Singleton pattern with optimized connection pooling
 */
export declare class CosmosDBClient {
    private static instance;
    private client;
    private database;
    private _config;
    private isConnected;
    private containerCache;
    private constructor();
    /**
     * Get or create singleton instance
     */
    static getInstance(config?: CosmosDBConfig): CosmosDBClient;
    /**
     * Initialize connection (verify database exists)
     */
    connect(): Promise<void>;
    /**
     * Disconnect (close connections)
     */
    disconnect(): Promise<void>;
    /**
     * Get database instance
     */
    getDatabase(): Database;
    /**
     * Get config (for tests / advanced use)
     */
    getConfig(): CosmosDBConfig;
    /**
     * Get container by name (with caching)
     */
    getContainer(containerName: string): Container;
    /**
     * Get underlying CosmosClient (for advanced use cases)
     */
    getClient(): CosmosClient;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Check if connected
     */
    isReady(): boolean;
}
//# sourceMappingURL=CosmosDBClient.d.ts.map