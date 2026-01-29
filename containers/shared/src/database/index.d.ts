/**
 * Database utilities
 * @module @coder/shared/database
 */
import { CosmosDBClient, CosmosDBConfig } from './CosmosDBClient';
import { ConnectionPool, ConnectionPoolConfig } from './ConnectionPool';
import { ensureContainer } from './containerManager';
import { Database, Container } from '@azure/cosmos';
/**
 * Initialize database configuration
 * Sets up container mappings and ensures containers exist
 */
export interface InitializeDatabaseConfig {
    endpoint: string;
    key: string;
    database: string;
    containers?: Record<string, string>;
}
/**
 * Initialize database with container configuration
 * This function sets up the database connection and ensures containers exist
 * Note: This is called before connectDatabase() to configure container mappings
 */
export declare function initializeDatabase(config: InitializeDatabaseConfig): void;
/**
 * Initialize database connection
 * Must be called before using getDatabaseClient()
 * Uses config from initializeDatabase() if available, otherwise falls back to environment variables
 */
export declare function connectDatabase(config?: CosmosDBConfig): Promise<void>;
/**
 * Disconnect from database
 */
export declare function disconnectDatabase(): Promise<void>;
/**
 * Get connection pool instance (if connected)
 */
export declare function getConnectionPool(): ConnectionPool | null;
/**
 * Get database client instance
 * Must call connectDatabase() first
 */
export declare function getDatabaseClient(): Database;
/**
 * Get container by name
 */
export declare function getContainer(containerName: string): Container;
/**
 * Get Cosmos DB client (for advanced use cases)
 */
export declare function getCosmosClient(): CosmosDBClient;
/**
 * Health check
 */
export declare function healthCheck(): Promise<boolean>;
export type { CosmosDBConfig, ConnectionPoolConfig };
export { CosmosDBClient, ConnectionPool, ensureContainer };
//# sourceMappingURL=index.d.ts.map