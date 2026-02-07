/**
 * Storage Provider Factory
 * Per ModuleImplementationGuide Section 6.4
 */

import { PrismaClient } from '.prisma/logging-client';
import { IStorageProvider, StorageProviderConfig } from './IStorageProvider';
import { PostgresProvider } from './PostgresProvider';
import { NoOpStorageProvider } from './NoOpStorageProvider';

/**
 * Create a storage provider based on configuration
 */
export function createStorageProvider(
  config: StorageProviderConfig,
  prisma: PrismaClient
): IStorageProvider {
  switch (config.provider) {
    case 'postgres':
      return new PostgresProvider(prisma, config);
    
    case 'elasticsearch':
      // Future implementation
      throw new Error('Elasticsearch provider not yet implemented');
    
    case 'cosmos':
      return new NoOpStorageProvider();
    
    default:
      throw new Error(`Unknown storage provider: ${config.provider}`);
  }
}

