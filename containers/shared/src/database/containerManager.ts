/**
 * Container Manager
 * Helper utilities for managing Cosmos DB containers
 * @module @coder/shared/database
 */

import { Container } from '@azure/cosmos';
import { CosmosDBClient } from './CosmosDBClient';

/**
 * Get a container by name
 * Uses caching for performance
 * Note: Database must be connected first via connectDatabase()
 */
export function getContainer(containerName: string): Container {
  try {
    const client = CosmosDBClient.getInstance();
    return client.getContainer(containerName);
  } catch (error) {
    throw new Error(
      `Database not initialized. Call connectDatabase() first. Original error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Ensure container exists (create if not exists)
 * Note: In production, containers should be created via infrastructure as code
 * This is mainly for development/testing
 * Note: Database must be connected first via connectDatabase()
 */
export async function ensureContainer(
  containerName: string,
  partitionKey: string = '/tenantId', // Default to tenantId for multi-tenancy
  options?: {
    defaultTtl?: number; // Default TTL in seconds (-1 = never expire, null/undefined = no default TTL)
  }
): Promise<Container> {
  try {
    const client = CosmosDBClient.getInstance();
    const database = client.getDatabase();

    try {
      // Try to read container (will throw if doesn't exist)
      const container = database.container(containerName);
      await container.read();
      return container;
    } catch (error: any) {
      // Container doesn't exist, create it
      if (error.code === 404) {
        const containerDefinition: any = {
          id: containerName,
          partitionKey: {
            paths: [partitionKey],
          },
        };

        // Add defaultTtl if specified
        if (options?.defaultTtl !== undefined) {
          containerDefinition.defaultTtl = options.defaultTtl;
        }

        const { container } = await database.containers.create(containerDefinition);
        return container;
      }
      throw error;
    }
  } catch (error) {
    throw new Error(
      `Database not initialized. Call connectDatabase() first. Original error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

