#!/usr/bin/env tsx
/**
 * Widget Catalog Seeder Script
 * 
 * Seeds the widget catalog with default system widgets
 * 
 * Usage:
 *   npx tsx apps/api/src/scripts/seed-widget-catalog.ts
 *   
 * Or with pnpm:
 *   pnpm --filter @castiel/api run seed-widgets
 */

import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { MonitoringService } from '@castiel/monitoring';
import { WidgetCatalogService } from '../services/widget-catalog.service.js';
import { DEFAULT_WIDGET_CATALOG } from '../seed/widget-catalog.seed.js';
import type { CreateWidgetCatalogEntryInput } from '../types/widget-catalog.types.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SYSTEM_USER_ID = 'system';

async function seedWidgetCatalog(): Promise<void> {
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

  console.log('🎨 Widget Catalog Seeder Script');
  console.log('================================');
  console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
  console.log(`📁 Database: ${databaseId}`);
  console.log('');

  // Initialize monitoring (disabled for script)
  const monitoring = MonitoringService.initialize({
    enabled: false,
    provider: 'mock',
  });

  // Initialize service
  const widgetCatalogService = new WidgetCatalogService(monitoring);

  // Seed widget catalog entries
  console.log(`📦 Seeding ${DEFAULT_WIDGET_CATALOG.length} widget catalog entries...`);
  console.log('');

  let seeded = 0;
  let skipped = 0;
  let errors = 0;

  for (const widgetTemplate of DEFAULT_WIDGET_CATALOG) {
    try {
      console.log(`   Processing: ${widgetTemplate.name} (${widgetTemplate.displayName})`);

      // Try to create - if it already exists, it will fail
      const input: CreateWidgetCatalogEntryInput = {
        widgetType: widgetTemplate.widgetType,
        name: widgetTemplate.name,
        displayName: widgetTemplate.displayName,
        description: widgetTemplate.description,
        category: widgetTemplate.category,
        icon: widgetTemplate.icon,
        thumbnail: widgetTemplate.thumbnail,
        status: widgetTemplate.status,
        isDefault: widgetTemplate.isDefault,
        isFeatured: widgetTemplate.isFeatured,
        visibilityLevel: widgetTemplate.visibilityLevel,
        allowedRoles: widgetTemplate.allowedRoles,
        defaultSize: widgetTemplate.defaultSize,
        defaultConfig: widgetTemplate.defaultConfig,
      };

      await widgetCatalogService.createCatalogEntry(input, SYSTEM_USER_ID);
      console.log(`   ✅ Seeded successfully`);
      seeded++;
    } catch (error: any) {
      // Check if it's a duplicate error
      if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
        console.log(`   ⏭️  Skipped (already exists)`);
        skipped++;
      } else {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    console.log('');
  }

  // Print summary
  console.log('================================');
  console.log('Seeding Summary');
  console.log('================================');
  console.log(`✅ Seeded:  ${seeded}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors:  ${errors}`);
  console.log('================================');

  if (errors > 0) {
    console.error('\n❌ Widget catalog seeding completed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ Widget catalog seeding completed successfully!');
    console.log(`\n📊 Total widgets in catalog: ${seeded + skipped}`);
  }
}

// Run the seeder
seedWidgetCatalog()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  });
