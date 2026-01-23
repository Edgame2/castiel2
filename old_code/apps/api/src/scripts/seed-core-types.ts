#!/usr/bin/env tsx
/**
 * Core Types Seeder Script
 * 
 * Seeds the database with core ShardTypes and system templates.
 * Run this after init-cosmos-db.ts to set up the initial data.
 * 
 * Usage:
 *   npx tsx apps/api/src/scripts/seed-core-types.ts
 *   
 * Or with pnpm:
 *   pnpm --filter @castiel/api run seed-types
 */

import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { MonitoringService } from '@castiel/monitoring';
import { CoreTypesSeederService } from '../services/core-types-seeder.service.js';
import {
  ShardTypeRepository,
  ShardRepository,
} from '@castiel/api-core';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedCoreTypes(): Promise<void> {
  // Get configuration from environment
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';

  // Validate configuration
  if (!endpoint || !key) {
    console.error('❌ Missing Cosmos DB configuration:');
    if (!endpoint) {console.error('   - COSMOS_DB_ENDPOINT is not set');}
    if (!key) {console.error('   - COSMOS_DB_KEY is not set');}
    console.error('\nPlease set these environment variables in your .env or .env.local file.');
    process.exit(1);
  }

  console.log('🌱 Core Types Seeder Script');
  console.log('===========================');
  console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
  console.log(`📁 Database: ${databaseId}`);
  console.log('');

  // Initialize monitoring (disabled for script)
  const monitoring = MonitoringService.initialize({
    enabled: false,
    provider: 'mock',
  });

  // Create Cosmos client
  const client = new CosmosClient({ endpoint, key });

  try {
    // Initialize repositories
    console.log('📦 Initializing repositories...');
    
    const shardTypeRepo = new ShardTypeRepository(monitoring);
    await shardTypeRepo.ensureContainer();
    console.log('   ✅ ShardType repository initialized');

    const shardRepo = new ShardRepository(monitoring);
    await shardRepo.ensureContainer();
    console.log('   ✅ Shard repository initialized');

    console.log('');

    // Run seeder
    console.log('🌱 Seeding core types...');
    console.log('');

    const seeder = new CoreTypesSeederService(monitoring, shardTypeRepo, shardRepo);
    const results = await seeder.seedAll();

    // Display results
    console.log('📊 ShardTypes:');
    console.log(`   ✅ Seeded:  ${results.shardTypes.seeded}`);
    console.log(`   ℹ️  Skipped: ${results.shardTypes.skipped}`);
    if (results.shardTypes.errors > 0) {
      console.log(`   ❌ Errors:  ${results.shardTypes.errors}`);
    }

    console.log('');
    console.log('📄 Templates:');
    console.log(`   ✅ Seeded:  ${results.templates.seeded}`);
    console.log(`   ℹ️  Skipped: ${results.templates.skipped}`);
    if (results.templates.errors > 0) {
      console.log(`   ❌ Errors:  ${results.templates.errors}`);
    }

    console.log('');
    console.log('===========================');

    const hasErrors = results.shardTypes.errors > 0 || results.templates.errors > 0;
    if (hasErrors) {
      console.log('⚠️  Seeding completed with errors.');
      process.exit(1);
    } else {
      console.log('✅ Core types seeding complete!');
    }

  } catch (error: any) {
    console.error('');
    console.error('❌ Fatal error during seeding:');
    console.error(`   ${error.message}`);
    
    if (error.code === 404) {
      console.error('');
      console.error('   Container not found. Have you run the init-db script?');
      console.error('   Run: pnpm --filter @castiel/api run init-db');
    }
    
    process.exit(1);
  }
}

// ============================================================================
// Run Script
// ============================================================================

seedCoreTypes().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});











