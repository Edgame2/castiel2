#!/usr/bin/env tsx
/**
 * Seed Proactive Triggers
 *
 * Seeds default proactive triggers for a tenant or all tenants.
 * Uses DEFAULT_PROACTIVE_TRIGGERS from types/proactive-insights.types.ts
 *
 * Usage:
 *   # Seed for a specific tenant
 *   pnpm --filter @castiel/api run seed:triggers -- --tenantId <tenant-id>
 *
 *   # Seed for all tenants (interactive)
 *   pnpm --filter @castiel/api run seed:triggers -- --all
 *
 * Prerequisites:
 *   - COSMOS_DB_ENDPOINT
 *   - COSMOS_DB_KEY
 *   - COSMOS_DB_DATABASE_ID (optional, defaults to castiel)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { MonitoringService } from '@castiel/monitoring';
import { ProactiveTriggersRepository } from '../repositories/proactive-triggers.repository.js';
import {
  DEFAULT_PROACTIVE_TRIGGERS,
  ProactiveTrigger,
} from '../types/proactive-insights.types.js';

// Load env
const rootEnv = path.resolve(process.cwd(), '.env');
const localEnv = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv });

const SYSTEM_USER_ID = 'system';

async function seedTriggersForTenant(
  repository: ProactiveTriggersRepository,
  tenantId: string
): Promise<{ seeded: number; skipped: number; errors: number }> {
  const results = { seeded: 0, skipped: 0, errors: 0 };

  for (const triggerDef of DEFAULT_PROACTIVE_TRIGGERS) {
    try {
      // Check if trigger already exists (by type and tenant)
      const existing = await repository.listTriggers(tenantId, {
        type: triggerDef.type,
        isSystem: true,
        limit: 1,
      });

      if (existing.triggers.length > 0) {
        console.log(`   ⏭️  Skipped: ${triggerDef.name} (already exists)`);
        results.skipped++;
        continue;
      }

      // Create trigger
      const trigger: ProactiveTrigger = {
        id: uuidv4(),
        tenantId,
        name: triggerDef.name,
        description: triggerDef.description,
        type: triggerDef.type,
        shardTypeId: triggerDef.shardTypeId,
        conditions: triggerDef.conditions,
        priority: triggerDef.priority,
        cooldownHours: triggerDef.cooldownHours,
        schedule: triggerDef.schedule,
        eventTriggers: triggerDef.eventTriggers,
        messageTemplate: triggerDef.messageTemplate,
        contextTemplateId: triggerDef.contextTemplateId,
        metadata: triggerDef.metadata,
        isActive: triggerDef.isActive,
        isSystem: true,
        createdBy: SYSTEM_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        triggerCount: 0,
      };

      await repository.upsertTrigger(trigger);
      console.log(`   ✅ Seeded: ${triggerDef.name}`);
      results.seeded++;
    } catch (error: any) {
      console.error(`   ❌ Error seeding ${triggerDef.name}: ${error.message}`);
      results.errors++;
    }
  }

  return results;
}

async function getAllTenants(client: CosmosClient, databaseId: string): Promise<string[]> {
  const database = client.database(databaseId);
  const container = database.container('tenants');

  const { resources } = await container.items
    .query({
      query: 'SELECT c.id FROM c',
    })
    .fetchAll();

  return resources.map((r: any) => r.id);
}

async function main(): Promise<void> {
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';
  const containerId = process.env.COSMOS_DB_PROACTIVE_TRIGGERS_CONTAINER || 'proactive-triggers';

  if (!endpoint || !key) {
    console.error('❌ Missing Cosmos DB configuration:');
    if (!endpoint) {console.error('   - COSMOS_DB_ENDPOINT is not set');}
    if (!key) {console.error('   - COSMOS_DB_KEY is not set');}
    console.error('\nPlease set these environment variables in your .env or .env.local file.');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const tenantIdArg = args.find((arg) => arg.startsWith('--tenantId='))?.split('=')[1];
  const allTenants = args.includes('--all');

  if (!tenantIdArg && !allTenants) {
    console.error('❌ Missing argument:');
    console.error('   Use --tenantId=<tenant-id> to seed for a specific tenant');
    console.error('   Use --all to seed for all tenants (interactive)');
    process.exit(1);
  }

  console.log('🌱 Proactive Triggers Seeder');
  console.log('============================');
  console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
  console.log(`📁 Database: ${databaseId}`);
  console.log(`📦 Container: ${containerId}`);
  console.log(`📋 Default triggers: ${DEFAULT_PROACTIVE_TRIGGERS.length}`);
  console.log('');

  const monitoring = MonitoringService.initialize({
    enabled: false,
    provider: 'mock',
  });

  const client = new CosmosClient({ endpoint, key });
  const repository = new ProactiveTriggersRepository(client, databaseId, containerId);

  let tenantIds: string[] = [];

  if (allTenants) {
    console.log('📋 Fetching all tenants...');
    tenantIds = await getAllTenants(client, databaseId);
    console.log(`   Found ${tenantIds.length} tenants`);
    console.log('');

    if (tenantIds.length === 0) {
      console.log('⚠️  No tenants found. Exiting.');
      process.exit(0);
    }

    // Confirm before proceeding
    console.log('⚠️  This will seed triggers for ALL tenants.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } else if (tenantIdArg) {
    tenantIds = [tenantIdArg];
  }

  let totalSeeded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const tenantId of tenantIds) {
    console.log(`\n🏢 Processing tenant: ${tenantId}`);
    console.log('─'.repeat(50));

    const results = await seedTriggersForTenant(repository, tenantId);

    totalSeeded += results.seeded;
    totalSkipped += results.skipped;
    totalErrors += results.errors;

    console.log(`   Summary: ${results.seeded} seeded, ${results.skipped} skipped, ${results.errors} errors`);
  }

  console.log('');
  console.log('============================');
  console.log('Seeding Summary');
  console.log('============================');
  console.log(`✅ Total Seeded:  ${totalSeeded}`);
  console.log(`⏭️  Total Skipped: ${totalSkipped}`);
  console.log(`❌ Total Errors:  ${totalErrors}`);
  console.log('============================');

  if (totalErrors > 0) {
    console.error('\n⚠️  Some errors occurred during seeding. Review the output above.');
    process.exit(1);
  } else {
    console.log('\n✅ Seeding completed successfully!');
  }
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});









