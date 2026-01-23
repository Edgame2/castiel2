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
 */
export function getContainer(containerName: string): Container {
  const client = CosmosDBClient.getInstance();
  return client.getContainer(containerName);
}

/**
 * Ensure container exists (create if not exists)
 * Note: In production, containers should be created via infrastructure as code
 * This is mainly for development/testing
 */
export async function ensureContainer(
  containerName: string,
  partitionKey: string = '/id'
): Promise<Container> {
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
      const { container } = await database.containers.create({
        id: containerName,
        partitionKey: {
          paths: [partitionKey],
        },
      });
      return container;
    }
    throw error;
  }
}

