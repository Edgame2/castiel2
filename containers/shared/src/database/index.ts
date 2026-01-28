/**
 * Database utilities
 * @module @coder/shared/database
 */

import { CosmosDBClient, CosmosDBConfig } from './CosmosDBClient';
import { ConnectionPool, ConnectionPoolConfig } from './ConnectionPool';
import { getContainer, ensureContainer } from './containerManager';
import { Database, Container } from '@azure/cosmos';

// Singleton instances
let dbClient: CosmosDBClient | null = null;
let connectionPool: ConnectionPool | null = null;
let containerMappings: Record<string, string> = {}; // Store container mappings
let dbConfig: InitializeDatabaseConfig | null = null; // Store database config

/**
 * Initialize database configuration
 * Sets up container mappings and ensures containers exist
 */
export interface InitializeDatabaseConfig {
  endpoint: string;
  key: string;
  database: string;
  containers?: Record<string, string>; // Map of logical names to container names
}

/**
 * Initialize database with container configuration
 * This function sets up the database connection and ensures containers exist
 * Note: This is called before connectDatabase() to configure container mappings
 */
export function initializeDatabase(config: InitializeDatabaseConfig): void {
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
export async function connectDatabase(config?: CosmosDBConfig): Promise<void> {
  let cosmosConfig: CosmosDBConfig;

  if (config) {
    // Use provided config
    cosmosConfig = config;
  } else if (dbConfig) {
    // Use config from initializeDatabase()
    cosmosConfig = {
      endpoint: dbConfig.endpoint,
      key: dbConfig.key,
      databaseId: dbConfig.database,
    };
  } else {
    // Fall back to environment variables
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';

    if (!endpoint || !key) {
      throw new Error(
        'Cosmos DB configuration required. Call initializeDatabase() first, set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY environment variables, or pass config to connectDatabase()'
      );
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
      } else {
        await ensureContainer(physicalName, '/tenantId'); // Default partition key to /tenantId
      }
    }
  }

  // Initialize connection pool
  connectionPool = ConnectionPool.getInstance({
    maxConnections: parseInt(process.env.COSMOS_DB_MAX_CONNECTIONS || '50', 10),
    perServiceLimit: parseInt(process.env.COSMOS_DB_PER_SERVICE_LIMIT || '10', 10),
  });
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  if (dbClient) {
    await dbClient.disconnect();
    dbClient = null;
  }
  connectionPool = null;
  containerMappings = {};
  dbConfig = null;
}

/**
 * Get database client instance
 * Must call connectDatabase() first
 */
export function getDatabaseClient(): Database {
  if (!dbClient) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return dbClient.getDatabase();
}

/**
 * Get container by name
 */
export function getContainer(containerName: string): Container {
  if (!dbClient) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return dbClient.getContainer(containerName);
}

/**
 * Get Cosmos DB client (for advanced use cases)
 */
export function getCosmosClient(): CosmosDBClient {
  if (!dbClient) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return dbClient;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  if (!dbClient) {
    return false;
  }
  return dbClient.healthCheck();
}

// Re-export types
export type { CosmosDBConfig, ConnectionPoolConfig, InitializeDatabaseConfig };
export { CosmosDBClient, ConnectionPool, ensureContainer };
