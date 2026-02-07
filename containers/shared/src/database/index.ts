/**
 * Database utilities
 * @module @coder/shared/database
 */

import { CosmosDBClient, CosmosDBConfig } from './CosmosDBClient';
import { ConnectionPool, ConnectionPoolConfig } from './ConnectionPool';
import { ensureContainer } from './containerManager';
import { Database, Container } from '@azure/cosmos';

// Singleton instances
let dbClient: CosmosDBClient | null = null;
let connectionPoolInstance: ConnectionPool | null = null;
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

/** True when COSMOS_DB_OPTIONAL is set (e.g. dev without Cosmos). */
function isCosmosOptional(): boolean {
  const v = process.env.COSMOS_DB_OPTIONAL;
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Initialize database connection
 * Must be called before using getDatabaseClient()
 * Uses config from initializeDatabase() if available, otherwise falls back to environment variables
 * When COSMOS_DB_OPTIONAL=1, connection failures are logged and startup continues without DB.
 */
export async function connectDatabase(config?: CosmosDBConfig): Promise<void> {
  let cosmosConfig: CosmosDBConfig;

  if (config) {
    cosmosConfig = config;
  } else if (dbConfig) {
    cosmosConfig = {
      endpoint: dbConfig.endpoint,
      key: dbConfig.key,
      databaseId: dbConfig.database,
    };
  } else {
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';

    if (!endpoint || !key) {
      if (isCosmosOptional()) {
        console.warn('Cosmos DB optional: COSMOS_DB_ENDPOINT/KEY not set; running without database.');
        return;
      }
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

  const optional = isCosmosOptional();
  try {
    dbClient = CosmosDBClient.getInstance(cosmosConfig);
    await dbClient.connect();

    if (Object.keys(containerMappings).length > 0) {
      for (const logicalName in containerMappings) {
        const physicalName = containerMappings[logicalName];
        if (logicalName === 'suggested_links' || physicalName.includes('suggested_links')) {
          await ensureContainer(physicalName, '/tenantId', {
            defaultTtl: 2592000,
          });
        } else {
          await ensureContainer(physicalName, '/tenantId');
        }
      }
    }

    connectionPoolInstance = ConnectionPool.getInstance({
      maxConnections: parseInt(process.env.COSMOS_DB_MAX_CONNECTIONS || '50', 10),
      perServiceLimit: parseInt(process.env.COSMOS_DB_PER_SERVICE_LIMIT || '10', 10),
    });
  } catch (err) {
    if (optional) {
      console.warn(
        'Cosmos DB optional: connection failed, running without database.',
        err instanceof Error ? err.message : err
      );
      dbClient = null;
      connectionPoolInstance = null;
      return;
    }
    throw err;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
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
export function getConnectionPool(): ConnectionPool | null {
  return connectionPoolInstance;
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
 * @param containerName - Logical container name
 * @param _ - Optional (ignored; for type compatibility with some Cosmos SDK typings)
 */
export function getContainer(containerName: string, _?: unknown): Container {
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
 * Whether the database is connected (e.g. false when COSMOS_DB_OPTIONAL and connect failed).
 */
export function isDatabaseConnected(): boolean {
  return dbClient != null;
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

// Re-export types (omit InitializeDatabaseConfig from type re-export to avoid duplicate with interface above)
export type { CosmosDBConfig, ConnectionPoolConfig };
export { CosmosDBClient, ConnectionPool, ensureContainer };
