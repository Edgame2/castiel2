/**
 * Storage Provider Factory
 * Per ModuleImplementationGuide Section 6.4
 */

import { PrismaClient } from '.prisma/logging-client';
import { IStorageProvider, StorageProviderConfig } from './IStorageProvider';
import { PostgresProvider } from './PostgresProvider';
import { CosmosProvider } from './CosmosProvider';

/**
 * Create a storage provider based on configuration.
 * When config.provider is 'cosmos', prisma may be null and cosmosAuditLogsContainer must be set.
 */
export function createStorageProvider(
  config: StorageProviderConfig,
  prisma: PrismaClient | null,
  cosmosAuditLogsContainer?: string
): IStorageProvider {
  switch (config.provider) {
    case 'postgres':
      if (!prisma) throw new Error('Prisma client required for postgres storage provider');
      return new PostgresProvider(prisma, config);

    case 'elasticsearch':
      throw new Error('Elasticsearch provider not yet implemented');

    case 'cosmos':
      if (!cosmosAuditLogsContainer) throw new Error('cosmos_db.containers.audit_logs required for Cosmos storage');
      return new CosmosProvider(cosmosAuditLogsContainer, config);

    default:
      throw new Error(`Unknown storage provider: ${config.provider}`);
  }
}

