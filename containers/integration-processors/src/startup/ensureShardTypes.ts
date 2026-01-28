/**
 * Ensure all shard types exist
 * Creates/updates shard types on service startup
 * @module integration-processors/startup/ensureShardTypes
 */

import { ServiceClient } from '@coder/shared';
import { shardTypeDefinitions, ShardTypeDefinition } from './shardTypeDefinitions';
import { log } from '../utils/logger';

/**
 * Ensure all shard types exist in shard-manager
 * Idempotent - safe to run multiple times
 */
export async function ensureShardTypes(shardManagerClient: ServiceClient): Promise<void> {
  log.info('Ensuring all shard types exist...', { service: 'integration-processors' });

  for (const shardTypeDef of shardTypeDefinitions) {
    await ensureSingleShardType(shardManagerClient, shardTypeDef);
  }

  log.info('All shard types ensured', { service: 'integration-processors' });
}

/**
 * Ensure a single shard type exists
 * Retries with exponential backoff on failure
 */
async function ensureSingleShardType(
  shardManagerClient: ServiceClient,
  shardTypeDef: ShardTypeDefinition
): Promise<void> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if exists
      let existing: any = null;
      try {
        existing = await shardManagerClient.get(`/api/v1/shard-types/${shardTypeDef.id}`);
      } catch (error: any) {
        if (error.response?.status !== 404) {
          throw error;
        }
        // 404 is expected if shard type doesn't exist
      }

      if (existing) {
        // Update if schema version changed
        if (existing.schemaVersion !== shardTypeDef.schemaVersion) {
          await shardManagerClient.put(`/api/v1/shard-types/${shardTypeDef.id}`, {
            ...shardTypeDef,
            updatedAt: new Date().toISOString(),
          });
          log.info(`Updated shard type ${shardTypeDef.name}`, {
            shardTypeId: shardTypeDef.id,
            oldVersion: existing.schemaVersion,
            newVersion: shardTypeDef.schemaVersion,
            service: 'integration-processors',
          });
        } else {
          log.debug(`Shard type ${shardTypeDef.name} already exists with correct version`, {
            shardTypeId: shardTypeDef.id,
            version: shardTypeDef.schemaVersion,
            service: 'integration-processors',
          });
        }
      } else {
        // Create new
        await shardManagerClient.post('/api/v1/shard-types', {
          ...shardTypeDef,
          createdAt: new Date().toISOString(),
        });
        log.info(`Created shard type ${shardTypeDef.name}`, {
          shardTypeId: shardTypeDef.id,
          version: shardTypeDef.schemaVersion,
          service: 'integration-processors',
        });
      }

      return; // Success
    } catch (error: any) {
      log.error(
        `Failed to ensure shard type ${shardTypeDef.name} (attempt ${attempt + 1}/${maxRetries})`,
        error,
        {
          shardTypeId: shardTypeDef.id,
          attempt: attempt + 1,
          service: 'integration-processors',
        }
      );

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        log.info(`Retrying in ${delay}ms...`, {
          shardTypeId: shardTypeDef.id,
          service: 'integration-processors',
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Final attempt failed
        throw new Error(
          `Failed to ensure shard type ${shardTypeDef.name} after ${maxRetries} attempts: ${error.message}`
        );
      }
    }
  }
}
