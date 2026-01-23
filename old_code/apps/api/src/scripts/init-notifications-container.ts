#!/usr/bin/env tsx
// @ts-nocheck
/**
 * Notifications Container Initialization
 * 
 * Creates and configures the notifications container
 * with hierarchical partition keys (HPK), indexes, and TTL.
 * 
 * Note: Hierarchical Partition Keys (HPK) using MultiHash require
 * Azure Cosmos DB SDK v4.8.0+ and API version 2023-04-01+
 * 
 * Usage:
 *   npx tsx apps/api/src/scripts/init-notifications-container.ts
 */

import { CosmosClient, Database, ContainerDefinition } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
// Try multiple possible locations
const projectRoot = resolve(__dirname, '../../../../');
const possibleEnvPaths = [
  resolve(projectRoot, '.env'),
  resolve(projectRoot, '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '.env.local'),
];

// Load all .env files (dotenv.config() without path loads from cwd by default)
dotenv.config();
for (const envPath of possibleEnvPaths) {
  try {
    const result = dotenv.config({ path: envPath, override: false });
    if (!result.error && result.parsed) {
      console.log(`📄 Loaded env from: ${envPath} (${Object.keys(result.parsed).length} variables)`);
    }
  } catch (err) {
    // Ignore file not found errors
  }
}

// ============================================================================
// Container Definition with HPK
// ============================================================================

interface NotificationsContainerConfig {
  id: string;
  partitionKey: string[]; // Hierarchical PK paths
  description: string;
  defaultTTL: number;
  indexes?: {
    composite?: Array<Array<{ path: string; order: 'ascending' | 'descending' }>>;
  };
}

const NOTIFICATIONS_CONTAINER: NotificationsContainerConfig = {
  id: 'notifications',
  // Hierarchical PK: tenantId/userId/id for user-scoped queries
  partitionKey: ['/tenantId', '/userId', '/id'],
  description: 'User notifications with HPK: [tenantId, userId, id]',
  defaultTTL: 60 * 60 * 24 * 90, // 90 days
  indexes: {
    composite: [
      // Query: Get user's notifications ordered by date
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/userId', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      // Query: Get unread notifications for user
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/userId', order: 'ascending' },
        { path: '/status', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
      // Query: Get notifications by type
      [
        { path: '/tenantId', order: 'ascending' },
        { path: '/userId', order: 'ascending' },
        { path: '/type', order: 'ascending' },
        { path: '/createdAt', order: 'descending' },
      ],
    ],
  },
};

// ============================================================================
// Container Creation
// ============================================================================

async function createNotificationsContainer(
  database: Database,
  config: NotificationsContainerConfig
): Promise<{ created: boolean; name: string }> {
  // Build container definition
  const containerDef: ContainerDefinition = {
    id: config.id,
    partitionKey: {
      paths: config.partitionKey,
      kind: 'MultiHash',
      version: 2,
    },
    defaultTtl: config.defaultTTL,
  };

  // Add composite indexes if specified
  if (config.indexes?.composite) {
    containerDef.indexingPolicy = {
      indexingMode: 'consistent',
      automatic: true,
      includedPaths: [
        {
          path: '/', // Required: root path must be included
        },
        {
          path: '/tenantId/?',
        },
        {
          path: '/userId/?',
        },
        {
          path: '/status/?',
        },
        {
          path: '/type/?',
        },
        {
          path: '/createdAt/?',
        },
        {
          path: '/createdBy/type/?',
        },
      ],
      excludedPaths: [
        {
          path: '/content/?',
        },
        {
          path: '/metadata/*',
        },
      ],
      compositeIndexes: config.indexes.composite,
    };
  }

  try {
    const { container, statusCode } = await database.containers.createIfNotExists(containerDef);

    // 201 = created, 200 = already exists
    const created = statusCode === 201;
    const status = created ? '✅ created' : '⚡ already exists';

    console.log(`   ${status}: "${config.id}"`);
    if (created) {
      console.log(`      Partition Key: ${config.partitionKey.join(', ')}`);
      console.log(`      TTL: ${config.defaultTTL / (60 * 60 * 24)} days`);
      if (config.indexes?.composite) {
        console.log(`      Composite Indexes: ${config.indexes.composite.length}`);
      }
    }

    return { created, name: config.id };
  } catch (error: any) {
    console.error(`   ❌ Error creating container "${config.id}":`, error.message);
    throw error;
  }
}

// ============================================================================
// Main Initialization
// ============================================================================

async function initializeNotificationsContainer(): Promise<void> {
  // Try to use config module first (it handles .env loading)
  let endpoint: string | undefined;
  let key: string | undefined;
  let databaseId: string | undefined;

  try {
    // Import config module which handles .env loading
    const configModule = await import('../config/env.js');
    endpoint = configModule.config.cosmosDb.endpoint;
    key = configModule.config.cosmosDb.key;
    databaseId = configModule.config.cosmosDb.databaseId;
    console.log('✅ Loaded configuration from config module');
  } catch (err: any) {
    // Fallback to direct env vars
    console.log('⚠️  Could not load config module, trying direct env vars...');
    endpoint = process.env.COSMOS_DB_ENDPOINT;
    key = process.env.COSMOS_DB_KEY;
    databaseId = process.env.COSMOS_DB_DATABASE_ID || process.env.COSMOS_DB_DATABASE || 'castiel';
  }

  // Debug: Show what we found
  console.log('🔍 Configuration Check:');
  console.log(`   Endpoint: ${endpoint ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Key: ${key ? '✅ Set (hidden)' : '❌ Not set'}`);
  console.log(`   Database ID: ${databaseId}`);
  
  // Debug: Show all COSMOS-related env vars
  const cosmosVars = Object.keys(process.env).filter(k => k.includes('COSMOS') || k.includes('cosmos'));
  if (cosmosVars.length > 0) {
    console.log(`\n   Found ${cosmosVars.length} COSMOS-related env vars: ${cosmosVars.join(', ')}`);
  }
  console.log('');

  // Validate configuration
  if (!endpoint || !key) {
    console.error('❌ Missing Cosmos DB configuration:');
    if (!endpoint) {console.error('   - COSMOS_DB_ENDPOINT is not set');}
    if (!key) {console.error('   - COSMOS_DB_KEY is not set');}
    console.error('\n📝 Please add these to your .env or .env.local file:');
    console.error('   COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/');
    console.error('   COSMOS_DB_KEY=your-primary-key');
    console.error('   COSMOS_DB_DATABASE_ID=castiel');
    console.error(`\n   Current working directory: ${process.cwd()}`);
    console.error(`   Project root: ${projectRoot}`);
    console.error(`   Checked files: .env, .env.local`);
    process.exit(1);
  }

  console.log('🔔 Notifications Container Initialization');
  console.log('==========================================');
  console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
  console.log(`📁 Database: ${databaseId}`);
  console.log('');

  // Create Cosmos client
  const client = new CosmosClient({ endpoint, key });

  try {
    // Get or create database
    console.log(`📂 Connecting to database "${databaseId}"...`);
    const { database } = await client.databases.createIfNotExists({
      id: databaseId,
    });
    console.log(`   ✅ Connected`);
    console.log('');

    // Create container
    console.log('📋 Creating Notifications container:');
    const { created } = await createNotificationsContainer(database, NOTIFICATIONS_CONTAINER);

    console.log('');
    console.log('✨ Initialization complete!');
    console.log(`   ${created ? 'Container created' : 'Container already exists'}`);
    console.log('');

    // Provide next steps
    console.log('📝 Next steps:');
    console.log('   1. Verify container in Azure Portal');
    console.log('   2. Start the API server');
    console.log('   3. Test notification endpoints');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('init-notifications-container.ts') ||
                     !process.env.NODE_ENV; // Fallback: run if no NODE_ENV (likely direct execution)

if (isMainModule) {
  initializeNotificationsContainer().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { initializeNotificationsContainer, createNotificationsContainer };







