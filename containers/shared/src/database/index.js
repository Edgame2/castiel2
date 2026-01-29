/**
 * Database utilities
 * @module @coder/shared/database
 */
import { CosmosDBClient } from './CosmosDBClient';
import { ConnectionPool } from './ConnectionPool';
import { ensureContainer } from './containerManager';
// Singleton instances
let dbClient = null;
let connectionPoolInstance = null;
let containerMappings = {}; // Store container mappings
let dbConfig = null; // Store database config
/**
 * Initialize database with container configuration
 * This function sets up the database connection and ensures containers exist
 * Note: This is called before connectDatabase() to configure container mappings
 */
export function initializeDatabase(config) {
    // Validate configuration
    if (!config.endpoint || !config.key || !config.database) {
        throw new Error('Database configuration requires endpoint, key, and database');
    }
    // Store configuration and container mappings for later use
    dbConfig = config;
    containerMappings = config.containers || {};
}
/**
 * Initialize database connection
 * Must be called before using getDatabaseClient()
 * Uses config from initializeDatabase() if available, otherwise falls back to environment variables
 */
export async function connectDatabase(config) {
    let cosmosConfig;
    if (config) {
        // Use provided config
        cosmosConfig = config;
    }
    else if (dbConfig) {
        // Use config from initializeDatabase()
        cosmosConfig = {
            endpoint: dbConfig.endpoint,
            key: dbConfig.key,
            databaseId: dbConfig.database,
        };
    }
    else {
        // Fall back to environment variables
        const endpoint = process.env.COSMOS_DB_ENDPOINT;
        const key = process.env.COSMOS_DB_KEY;
        const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';
        if (!endpoint || !key) {
            throw new Error('Cosmos DB configuration required. Call initializeDatabase() first, set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY environment variables, or pass config to connectDatabase()');
        }
        cosmosConfig = {
            endpoint,
            key,
            databaseId,
        };
    }
    dbClient = CosmosDBClient.getInstance(cosmosConfig);
    await dbClient.connect();
    // Ensure all configured containers exist
    // Note: Special handling for containers that need TTL or other options
    if (Object.keys(containerMappings).length > 0) {
        for (const logicalName in containerMappings) {
            const physicalName = containerMappings[logicalName];
            // Special handling for suggested_links container (30 days TTL)
            if (logicalName === 'suggested_links' || physicalName.includes('suggested_links')) {
                await ensureContainer(physicalName, '/tenantId', {
                    defaultTtl: 2592000, // 30 days in seconds
                });
            }
            else {
                await ensureContainer(physicalName, '/tenantId'); // Default partition key to /tenantId
            }
        }
    }
    // Initialize connection pool
    connectionPoolInstance = ConnectionPool.getInstance({
        maxConnections: parseInt(process.env.COSMOS_DB_MAX_CONNECTIONS || '50', 10),
        perServiceLimit: parseInt(process.env.COSMOS_DB_PER_SERVICE_LIMIT || '10', 10),
    });
}
/**
 * Disconnect from database
 */
export async function disconnectDatabase() {
    if (dbClient) {
        await dbClient.disconnect();
        dbClient = null;
    }
    connectionPoolInstance = null;
    containerMappings = {};
    dbConfig = null;
}
/**
 * Get connection pool instance (if connected)
 */
export function getConnectionPool() {
    return connectionPoolInstance;
}
/**
 * Get database client instance
 * Must call connectDatabase() first
 */
export function getDatabaseClient() {
    if (!dbClient) {
        throw new Error('Database not connected. Call connectDatabase() first.');
    }
    return dbClient.getDatabase();
}
/**
 * Get container by name
 */
export function getContainer(containerName) {
    if (!dbClient) {
        throw new Error('Database not connected. Call connectDatabase() first.');
    }
    return dbClient.getContainer(containerName);
}
/**
 * Get Cosmos DB client (for advanced use cases)
 */
export function getCosmosClient() {
    if (!dbClient) {
        throw new Error('Database not connected. Call connectDatabase() first.');
    }
    return dbClient;
}
/**
 * Health check
 */
export async function healthCheck() {
    if (!dbClient) {
        return false;
    }
    return dbClient.healthCheck();
}
export { CosmosDBClient, ConnectionPool, ensureContainer };
//# sourceMappingURL=index.js.map