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

/**
 * Initialize database connection
 * Must be called before using getDatabaseClient()
 */
export async function connectDatabase(config?: CosmosDBConfig): Promise<void> {
  if (!config) {
    // Try to get config from environment variables
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';

    if (!endpoint || !key) {
      throw new Error(
        'Cosmos DB configuration required. Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY environment variables, or pass config to connectDatabase()'
      );
    }

    config = {
      endpoint,
      key,
      databaseId,
    };
  }

  dbClient = CosmosDBClient.getInstance(config);
  await dbClient.connect();

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
export type { CosmosDBConfig, ConnectionPoolConfig };
export { CosmosDBClient, ConnectionPool, ensureContainer };
