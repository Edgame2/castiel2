/**
 * Archive Provider Factory
 * Per ModuleImplementationGuide Section 6.4: Provider Factories
 */

import { IArchiveProvider, ArchiveProviderConfig } from './IArchiveProvider';
import { LocalArchiveProvider } from './LocalArchiveProvider';
import { S3ArchiveProvider } from './S3ArchiveProvider';
import { AzureArchiveProvider } from './AzureArchiveProvider';
import { log } from '../../../utils/logger';

/**
 * Factory function to create archive providers based on configuration
 */
export function createArchiveProvider(config: ArchiveProviderConfig): IArchiveProvider {
  log.info('Creating archive provider', { provider: config.provider });
  
  switch (config.provider) {
    case 'local':
      if (!config.local?.basePath) {
        throw new Error('Local archive provider requires basePath configuration');
      }
      return new LocalArchiveProvider({
        basePath: config.local.basePath,
        compress: true,
      });
    
    case 's3':
      if (!config.s3?.bucket || !config.s3?.region) {
        throw new Error('S3 archive provider requires bucket and region configuration');
      }
      return new S3ArchiveProvider({
        bucket: config.s3.bucket,
        region: config.s3.region,
        prefix: config.s3.prefix,
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      });
    
    case 'azure':
      if (!config.azure?.containerName || !config.azure?.connectionString) {
        throw new Error('Azure archive provider requires containerName and connectionString configuration');
      }
      return new AzureArchiveProvider({
        containerName: config.azure.containerName,
        connectionString: config.azure.connectionString,
        prefix: config.azure.prefix,
      });
    
    default:
      throw new Error(`Unknown archive provider: ${config.provider}`);
  }
}

