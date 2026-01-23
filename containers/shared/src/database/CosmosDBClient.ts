/**
 * Cosmos DB Client
 * Singleton client with connection pooling and tenant isolation
 * @module @coder/shared/database
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';

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
export class CosmosDBClient {
  private static instance: CosmosDBClient | null = null;
  private client: CosmosClient;
  private database: Database;
  private config: CosmosDBConfig;
  private isConnected: boolean = false;
  private containerCache: Map<string, Container> = new Map();

  private constructor(config: CosmosDBConfig) {
    this.config = config;

    // Create optimized connection policy
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: (config.connectionMode || 'Direct') as any,
      requestTimeout: config.requestTimeout || 30000, // 30 seconds
      enableEndpointDiscovery: config.enableEndpointDiscovery !== false,
      retryOptions: {
        maxRetryAttemptCount: config.maxRetryAttempts || 9,
        fixedRetryIntervalInMilliseconds: 0, // Use exponential backoff
        maxWaitTimeInSeconds: (config.maxRetryWaitTime || 30000) / 1000,
      } as RetryOptions,
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
  static getInstance(config?: CosmosDBConfig): CosmosDBClient {
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
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Verify database connection by reading database metadata
      await this.database.read();
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to Cosmos DB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect (close connections)
   */
  async disconnect(): Promise<void> {
    // Cosmos DB SDK manages connections internally
    // We just mark as disconnected
    this.isConnected = false;
    this.containerCache.clear();
  }

  /**
   * Get database instance
   */
  getDatabase(): Database {
    return this.database;
  }

  /**
   * Get container by name (with caching)
   */
  getContainer(containerName: string): Container {
    if (this.containerCache.has(containerName)) {
      return this.containerCache.get(containerName)!;
    }

    const container = this.database.container(containerName);
    this.containerCache.set(containerName, container);
    return container;
  }

  /**
   * Get underlying CosmosClient (for advanced use cases)
   */
  getClient(): CosmosClient {
    return this.client;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.database.read();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

