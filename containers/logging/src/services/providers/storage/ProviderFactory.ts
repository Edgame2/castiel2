/**
 * Storage Provider Factory
 * Per ModuleImplementationGuide Section 6.4
 * Logging module uses Cosmos DB only (no Postgres).
 */

import { IStorageProvider, StorageProviderConfig } from './IStorageProvider';
import { CosmosProvider } from './CosmosProvider';

/**
 * Create a storage provider. Only Cosmos is supported.
 */
export function createStorageProvider(
  config: StorageProviderConfig,
  cosmosAuditLogsContainer: string
): IStorageProvider {
  if (config.provider !== 'cosmos') {
    throw new Error(`Logging module requires Cosmos DB; set storage.provider to 'cosmos'. Got: ${config.provider}`);
  }
  return new CosmosProvider(cosmosAuditLogsContainer, config);
}

