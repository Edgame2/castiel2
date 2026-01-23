#!/usr/bin/env tsx
/**
 * Check if Notifications Container Exists
 * 
 * Verifies if the notifications container exists in Cosmos DB
 * 
 * Usage:
 *   npx tsx apps/api/src/scripts/check-notifications-container.ts
 */

import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';

async function checkNotificationsContainer(): Promise<void> {
  console.log('🔍 Checking Notifications Container');
  console.log('==================================');
  console.log(`📍 Endpoint: ${config.cosmosDb.endpoint.substring(0, 50)}...`);
  console.log(`📁 Database: ${config.cosmosDb.databaseId}`);
  console.log('');

  const client = new CosmosClient({
    endpoint: config.cosmosDb.endpoint,
    key: config.cosmosDb.key,
  });

  try {
    const database = client.database(config.cosmosDb.databaseId);
    const container = database.container('notifications');

    // Try to read the container
    const { resource, statusCode } = await container.read();

    if (resource && statusCode === 200) {
      console.log('✅ Notifications container EXISTS');
      console.log('');
      console.log('📋 Container Details:');
      console.log(`   ID: ${resource.id}`);
      console.log(`   Partition Key: ${JSON.stringify(resource.partitionKey)}`);
      console.log(`   Default TTL: ${resource.defaultTtl ? `${resource.defaultTtl / (60 * 60 * 24)} days` : 'Not set'}`);
      console.log(`   Indexing Mode: ${resource.indexingPolicy?.indexingMode || 'Not set'}`);
      console.log('');
      console.log('✨ Container is ready to use!');
      process.exit(0);
    } else {
      console.log('❌ Container not found or inaccessible');
      console.log(`   Status Code: ${statusCode}`);
      process.exit(1);
    }
  } catch (error: any) {
    if (error.code === 404) {
      console.log('❌ Notifications container DOES NOT EXIST');
      console.log('');
      console.log('📝 To create it, run:');
      console.log('   npx tsx apps/api/src/scripts/init-notifications-container.ts');
      console.log('');
      process.exit(1);
    } else {
      console.error('❌ Error checking container:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error);
      process.exit(1);
    }
  }
}

// Run check
checkNotificationsContainer().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});







