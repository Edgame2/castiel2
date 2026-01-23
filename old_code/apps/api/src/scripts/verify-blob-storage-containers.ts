#!/usr/bin/env tsx
// @ts-nocheck
/**
 * Verify Azure Blob Storage Containers
 * 
 * Verifies that required Azure Blob Storage containers exist and are accessible
 * for document management.
 * 
 * Usage:
 *   pnpm --filter @castiel/api run verify:blob-storage
 * 
 * Prerequisites:
 *   - AZURE_STORAGE_CONNECTION_STRING environment variable set
 *   - Azure Storage account accessible
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { BlobServiceClient } from '@azure/storage-blob';
import { AzureContainerInitService } from '../services/azure-container-init.service.js';

// Load environment variables
const rootEnv = path.resolve(process.cwd(), '../../.env');
const localEnv = path.resolve(process.cwd(), '../../.env.local');
dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv });

interface VerificationResult {
  container: string;
  exists: boolean;
  accessible: boolean;
  properties?: {
    publicAccess: string;
    metadata: Record<string, string>;
  };
  error?: string;
}

interface OverallResult {
  success: boolean;
  containers: VerificationResult[];
  summary: {
    total: number;
    exists: number;
    missing: number;
    errors: number;
  };
}

/**
 * Verify container permissions by attempting to list blobs
 */
async function verifyContainerPermissions(
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Test read access by listing blobs (with limit 1)
    let canRead = false;
    try {
      const iterator = containerClient.listBlobsFlat({ maxPageSize: 1 });
      await iterator.next(); // Try to read first blob
      canRead = true;
    } catch (readError) {
      // Read access test failed
      canRead = false;
    }

    // Test write access by checking container properties
    let canWrite = false;
    try {
      await containerClient.getProperties();
      canWrite = true;
    } catch (writeError) {
      // Write access test failed
      canWrite = false;
    }

    return { canRead, canWrite };
  } catch (error) {
    return {
      canRead: false,
      canWrite: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main verification function
 */
async function verifyBlobStorageContainers(): Promise<OverallResult> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const documentsContainer = process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER || 'documents';
  const quarantineContainer = process.env.AZURE_STORAGE_QUARANTINE_CONTAINER || 'quarantine';

  if (!connectionString) {
    throw new Error(
      'AZURE_STORAGE_CONNECTION_STRING environment variable is not set. ' +
      'Please set it in .env or .env.local file.'
    );
  }

  console.log('🔍 Verifying Azure Blob Storage containers...\n');
  console.log(`Storage Account: ${extractAccountName(connectionString) || 'unknown'}`);
  console.log(`Documents Container: ${documentsContainer}`);
  console.log(`Quarantine Container: ${quarantineContainer}\n`);

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerInitService = new AzureContainerInitService(connectionString);

  const requiredContainers = [documentsContainer, quarantineContainer];
  const results: VerificationResult[] = [];

  // Verify each container
  for (const containerName of requiredContainers) {
    console.log(`Checking container: ${containerName}...`);

    try {
      // Check if container exists
      const exists = await containerInitService.verifyContainer(containerName);
      
      if (!exists) {
        console.log(`  ❌ Container '${containerName}' does not exist`);
        results.push({
          container: containerName,
          exists: false,
          accessible: false,
          error: 'Container does not exist',
        });
        continue;
      }

      // Get container properties
      const properties = await containerInitService.getContainerProperties(containerName);
      
      if (!properties) {
        console.log(`  ⚠️  Container '${containerName}' exists but properties cannot be retrieved`);
        results.push({
          container: containerName,
          exists: true,
          accessible: false,
          error: 'Cannot retrieve container properties',
        });
        continue;
      }

      // Verify permissions
      const permissions = await verifyContainerPermissions(blobServiceClient, containerName);

      if (permissions.error) {
        console.log(`  ❌ Container '${containerName}': ${permissions.error}`);
        results.push({
          container: containerName,
          exists: true,
          accessible: false,
          properties,
          error: permissions.error,
        });
        continue;
      }

      // Success
      const accessible = permissions.canRead && permissions.canWrite;
      const statusIcon = accessible ? '✅' : '⚠️';
      console.log(`  ${statusIcon} Container '${containerName}':`);
      console.log(`     - Exists: Yes`);
      console.log(`     - Public Access: ${properties.publicAccess || 'private'}`);
      console.log(`     - Read Access: ${permissions.canRead ? 'Yes' : 'No'}`);
      console.log(`     - Write Access: ${permissions.canWrite ? 'Yes' : 'No'}`);
      if (properties.metadata && Object.keys(properties.metadata).length > 0) {
        console.log(`     - Metadata: ${JSON.stringify(properties.metadata)}`);
      }

      results.push({
        container: containerName,
        exists: true,
        accessible,
        properties,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Error checking container '${containerName}': ${errorMessage}`);
      results.push({
        container: containerName,
        exists: false,
        accessible: false,
        error: errorMessage,
      });
    }
  }

  // Calculate summary
  const summary = {
    total: results.length,
    exists: results.filter(r => r.exists).length,
    missing: results.filter(r => !r.exists).length,
    errors: results.filter(r => r.error).length,
  };

  const success = summary.exists === summary.total && results.every(r => r.accessible);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Verification Summary');
  console.log('='.repeat(60));
  console.log(`Total Containers: ${summary.total}`);
  console.log(`✅ Existing: ${summary.exists}`);
  console.log(`❌ Missing: ${summary.missing}`);
  console.log(`⚠️  Errors: ${summary.errors}`);
  console.log(`\nOverall Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);

  if (!success) {
    console.log('\n⚠️  Action Required:');
    if (summary.missing > 0) {
      console.log('   - Missing containers will be created automatically on first use');
      console.log('   - Or run: pnpm --filter @castiel/api run migrate:documents');
    }
    if (summary.errors > 0) {
      console.log('   - Check Azure Storage account permissions');
      console.log('   - Verify connection string is correct');
    }
  }

  return {
    success,
    containers: results,
    summary,
  };
}

/**
 * Extract account name from connection string
 */
function extractAccountName(connectionString: string): string | null {
  const match = connectionString.match(/AccountName=([^;]+)/);
  return match ? match[1] : null;
}

// Run verification
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyBlobStorageContainers()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyBlobStorageContainers, VerificationResult, OverallResult };







