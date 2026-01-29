/**
 * Cosmos DB Client
 * Singleton client with connection pooling and tenant isolation
 * @module @coder/shared/database
 */
import { CosmosClient } from '@azure/cosmos';
/**
 * Cosmos DB Client Manager
 * Singleton pattern with optimized connection pooling
 */
export class CosmosDBClient {
    static instance = null;
    client;
    database;
    _config;
    isConnected = false;
    containerCache = new Map();
    constructor(config) {
        this._config = config;
        // Create optimized connection policy
        const connectionPolicy = {
            connectionMode: (config.connectionMode || 'Direct'),
            requestTimeout: config.requestTimeout || 30000, // 30 seconds
            enableEndpointDiscovery: config.enableEndpointDiscovery !== false,
            retryOptions: {
                maxRetryAttemptCount: config.maxRetryAttempts || 9,
                fixedRetryIntervalInMilliseconds: 0, // Use exponential backoff
                maxWaitTimeInSeconds: (config.maxRetryWaitTime || 30000) / 1000,
            },
        };
        this.client = new CosmosClient({
            endpoint: config.endpoint,
            key: config.key,
            connectionPolicy,
        });
        this.database = this.client.database(config.databaseId);
    }
    /**
     * Get or create singleton instance
     */
    static getInstance(config) {
        if (!CosmosDBClient.instance) {
            if (!config) {
                throw new Error('CosmosDBClient must be initialized with config on first call');
            }
            CosmosDBClient.instance = new CosmosDBClient(config);
        }
        return CosmosDBClient.instance;
    }
    /**
     * Initialize connection (verify database exists)
     */
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            // Verify database connection by reading database metadata
            await this.database.read();
            this.isConnected = true;
        }
        catch (error) {
            this.isConnected = false;
            throw new Error(`Failed to connect to Cosmos DB: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Disconnect (close connections)
     */
    async disconnect() {
        // Cosmos DB SDK manages connections internally
        // We just mark as disconnected
        this.isConnected = false;
        this.containerCache.clear();
    }
    /**
     * Get database instance
     */
    getDatabase() {
        return this.database;
    }
    /**
     * Get config (for tests / advanced use)
     */
    getConfig() {
        return this._config;
    }
    /**
     * Get container by name (with caching)
     */
    getContainer(containerName) {
        if (this.containerCache.has(containerName)) {
            return this.containerCache.get(containerName);
        }
        const container = this.database.container(containerName);
        this.containerCache.set(containerName, container);
        return container;
    }
    /**
     * Get underlying CosmosClient (for advanced use cases)
     */
    getClient() {
        return this.client;
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            await this.database.read();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if connected
     */
    isReady() {
        return this.isConnected;
    }
}
//# sourceMappingURL=CosmosDBClient.js.map