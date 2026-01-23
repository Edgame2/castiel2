#!/usr/bin/env tsx
/**
 * Initialize Cosmos DB database and containers
 * Run this script before starting the main API service
 */

import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from main API .env file
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const config = {
  endpoint: process.env.COSMOS_DB_ENDPOINT!,
  key: process.env.COSMOS_DB_KEY!,
  database: process.env.COSMOS_DB_DATABASE || 'castiel',
  containers: [
    {
      id: process.env.COSMOS_DB_USERS_CONTAINER || 'users',
      partitionKey: '/tenantId',
    },
    {
      id: process.env.COSMOS_DB_SSO_CONFIGS_CONTAINER || 'sso-configs',
      partitionKey: '/tenantId',
    },
    {
      id: process.env.COSMOS_DB_OAUTH2_CLIENTS_CONTAINER || 'oauth2-clients',
      partitionKey: '/tenantId',
    },
    {
      id: 'tenants',
      partitionKey: '/id',
    },
    {
      id: process.env.COSMOS_DB_AI_MODELS_CONTAINER || 'aimodel',
      partitionKey: '/provider',
    },
    {
      id: process.env.COSMOS_DB_AI_CONNECTIONS_CONTAINER || 'aiconnexion',
      partitionKey: '/tenantId',
    },
  ],
};

async function initializeCosmosDb() {
  console.log('🚀 Initializing Cosmos DB...\n');
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Database: ${config.database}\n`);

  const client = new CosmosClient({
    endpoint: config.endpoint,
    key: config.key,
  });

  try {
    // Create database if it doesn't exist
    console.log(`Creating database: ${config.database}...`);
    const { database } = await client.databases.createIfNotExists({
      id: config.database,
      throughput: 400, // Minimum throughput
    });
    console.log(`✅ Database created/exists: ${database.id}\n`);

    // Create containers
    for (const containerConfig of config.containers) {
      console.log(`Creating container: ${containerConfig.id}...`);
      console.log(`  Partition key: ${containerConfig.partitionKey}`);

      const { container } = await database.containers.createIfNotExists({
        id: containerConfig.id,
        partitionKey: {
          paths: [containerConfig.partitionKey],
          version: 2, // Use partition key version 2 for better performance
        },
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [
            {
              path: '/*',
            },
          ],
          excludedPaths: [
            {
              path: '/"_etag"/?',
            },
          ],
        },
      });

      console.log(`✅ Container created/exists: ${container.id}\n`);
    }

    console.log('✨ Cosmos DB initialization complete!\n');
    console.log('Next steps:');
    console.log('  1. Start main-api: cd services/main-api && pnpm dev');
    console.log('  2. Run seed script (optional): tsx scripts/seed-cosmos-db.ts');

  } catch (error: any) {
    console.error('❌ Error initializing Cosmos DB:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run initialization
initializeCosmosDb();
