/**
 * Document Management Migration Script
 * 
 * Production-ready script to:
 * 1. Initialize tenant documentSettings with defaults (from global settings)
 * 2. Create Azure Blob containers programmatically
 * 3. Verify container permissions
 * 4. Migrate existing tenants
 * 
 * Usage:
 *   tsx apps/api/src/scripts/migrate-document-settings.ts
 * 
 * Environment Variables Required:
 *   - AZURE_STORAGE_CONNECTION_STRING
 *   - COSMOS_DB_ENDPOINT
 *   - COSMOS_DB_KEY
 *   - COSMOS_DB_DATABASE
 *   - COSMOS_DB_TENANTS_CONTAINER
 *   - COSMOS_DB_SYSTEM_CONFIG_CONTAINER
 *   - AZURE_STORAGE_DOCUMENTS_CONTAINER
 *   - AZURE_STORAGE_QUARANTINE_CONTAINER
 */

import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import { AzureContainerInitService } from '../services/azure-container-init.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { SystemConfigRepository } from '../repositories/system-config.repository.js';
import { DocumentSettingsService } from '../services/document-settings.service.js';
import type { TenantDocumentSettings } from '../types/document.types.js';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {throw new Error(`Missing required environment variable: ${name}`);}
  return v;
}

function getEnvOptional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

interface MigrationResult {
  tenantsProcessed: number;
  tenantsUpdated: number;
  tenantsSkipped: number;
  containersCreated: number;
  containersExisting: number;
  errors: string[];
}

async function verifyContainerPermissions(
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Test read access
    let canRead = false;
    try {
      await containerClient.getProperties();
      canRead = true;
    } catch (error: any) {
      return { canRead: false, canWrite: false, error: `Read access denied: ${error.message}` };
    }

    // Test write access (create a test blob and delete it)
    let canWrite = false;
    try {
      const testBlobName = `__permission_test_${Date.now()}.txt`;
      const blobClient = containerClient.getBlockBlobClient(testBlobName);
      await blobClient.upload('test', 4);
      await blobClient.delete();
      canWrite = true;
    } catch (error: any) {
      return { canRead: true, canWrite: false, error: `Write access denied: ${error.message}` };
    }

    return { canRead, canWrite };
  } catch (error: any) {
    return { canRead: false, canWrite: false, error: error.message };
  }
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('Document Management Migration Script');
  console.log('========================================\n');

  const result: MigrationResult = {
    tenantsProcessed: 0,
    tenantsUpdated: 0,
    tenantsSkipped: 0,
    containersCreated: 0,
    containersExisting: 0,
    errors: [],
  };

  try {
    // Load environment variables
    const storageConnectionString = getEnv('AZURE_STORAGE_CONNECTION_STRING');
    const cosmosDbEndpoint = getEnv('COSMOS_DB_ENDPOINT');
    const cosmosDbKey = getEnv('COSMOS_DB_KEY');
    const cosmosDbDatabase = getEnv('COSMOS_DB_DATABASE');
    const tenantsContainerName = getEnv('COSMOS_DB_TENANTS_CONTAINER');
    const systemConfigContainerName = getEnvOptional('COSMOS_DB_SYSTEM_CONFIG_CONTAINER', 'systemConfig');
    const documentsContainer = getEnvOptional('AZURE_STORAGE_DOCUMENTS_CONTAINER', 'documents');
    const quarantineContainer = getEnvOptional('AZURE_STORAGE_QUARANTINE_CONTAINER', 'quarantine');

    console.log('Configuration:');
    console.log(`  Cosmos DB Database: ${cosmosDbDatabase}`);
    console.log(`  Tenants Container: ${tenantsContainerName}`);
    console.log(`  System Config Container: ${systemConfigContainerName}`);
    console.log(`  Documents Container: ${documentsContainer}`);
    console.log(`  Quarantine Container: ${quarantineContainer}\n`);

    // Initialize Cosmos DB client
    console.log('Initializing Cosmos DB client...');
    const cosmosClient = new CosmosClient({ endpoint: cosmosDbEndpoint, key: cosmosDbKey });
    const database = cosmosClient.database(cosmosDbDatabase);
    const tenantsContainer = database.container(tenantsContainerName);
    const systemConfigContainer = database.container(systemConfigContainerName);
    
    const tenantRepo = new TenantRepository(tenantsContainer);
    const systemConfigRepo = new SystemConfigRepository(systemConfigContainer);
    const documentSettingsService = new DocumentSettingsService(systemConfigRepo, tenantRepo);

    // Ensure global settings exist
    console.log('\nEnsuring global document settings exist...');
    const globalSettings = await documentSettingsService.getGlobalSettings();
    console.log(`✓ Global settings ready (max file size: ${globalSettings.globalMaxFileSizeBytes / 1024 / 1024}MB)`);

    // Initialize Azure Storage containers
    console.log('\nEnsuring Azure Blob containers exist...');
    const containerInit = new AzureContainerInitService(storageConnectionString);
    const containerResults = await containerInit.ensureContainers([documentsContainer, quarantineContainer]);
    
    for (const r of containerResults) {
      if (r.created) {
        result.containersCreated++;
        console.log(`✓ Container '${r.name}': created`);
      } else {
        result.containersExisting++;
        console.log(`✓ Container '${r.name}': already exists`);
      }
    }

    // Verify container permissions
    console.log('\nVerifying container permissions...');
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
    
    for (const containerName of [documentsContainer, quarantineContainer]) {
      const permissions = await verifyContainerPermissions(blobServiceClient, containerName);
      if (permissions.error) {
        result.errors.push(`Container '${containerName}': ${permissions.error}`);
        console.error(`✗ Container '${containerName}': ${permissions.error}`);
      } else {
        console.log(`✓ Container '${containerName}': read=${permissions.canRead}, write=${permissions.canWrite}`);
      }
    }

    // Migrate tenant settings
    console.log('\nMigrating tenant document settings...');
    const tenants = await tenantRepo.listTenants();
    console.log(`Found ${tenants.length} tenant(s) to process\n`);

    for (const tenant of tenants) {
      result.tenantsProcessed++;
      
      try {
        if (!tenant.documentSettings) {
          // Generate default settings from global configuration
          const defaultSettings = documentSettingsService.generateDefaultTenantSettings(globalSettings);
          defaultSettings.updatedBy = 'migration-script';
          defaultSettings.updatedAt = new Date();
          
          await tenantRepo.updateTenantDocumentSettings(tenant.id, defaultSettings);
          result.tenantsUpdated++;
          console.log(`✓ Tenant '${tenant.id}': initialized document settings`);
        } else {
          result.tenantsSkipped++;
          console.log(`⊘ Tenant '${tenant.id}': already has document settings`);
        }
      } catch (error: any) {
        const errorMsg = `Tenant '${tenant.id}': ${error.message}`;
        result.errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Tenants processed: ${result.tenantsProcessed}`);
    console.log(`Tenants updated: ${result.tenantsUpdated}`);
    console.log(`Tenants skipped: ${result.tenantsSkipped}`);
    console.log(`Containers created: ${result.containersCreated}`);
    console.log(`Containers existing: ${result.containersExisting}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      process.exit(1);
    }

    console.log('\n✓ Migration completed successfully!');
  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
