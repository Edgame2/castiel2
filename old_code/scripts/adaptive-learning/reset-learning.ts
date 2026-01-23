#!/usr/bin/env tsx
/**
 * Adaptive Learning Reset Utility
 * 
 * Utility script to reset learned parameters for a tenant/context
 * 
 * Usage:
 *   pnpm tsx scripts/adaptive-learning/reset-learning.ts <tenantId> <contextKey> <serviceType>
 * 
 * Example:
 *   pnpm tsx scripts/adaptive-learning/reset-learning.ts tenant-123 "tech:large:proposal" risk
 * 
 * WARNING: This will reset all learned parameters to defaults!
 */

import { CosmosClient } from '@azure/cosmos';
import { config } from '../../apps/api/src/config/env.js';

async function resetLearning(
  tenantId: string,
  contextKey: string,
  serviceType: 'risk' | 'forecast' | 'recommendations'
): Promise<void> {
  console.log(`\n⚠️  Resetting Adaptive Learning Parameters`);
  console.log(`   Tenant ID: ${tenantId}`);
  console.log(`   Context Key: ${contextKey}`);
  console.log(`   Service Type: ${serviceType}`);
  console.log('');

  try {
    // Initialize Cosmos DB client
    const cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });

    const database = cosmosClient.database(config.cosmosDb.database);
    const container = database.container('adaptiveWeights');

    // Find the learning record
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.contextKey = @contextKey AND c.serviceType = @serviceType',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@contextKey', value: contextKey },
          { name: '@serviceType', value: serviceType },
        ],
      })
      .fetchAll();

    if (resources.length === 0) {
      console.log('❌ No learning record found');
      console.log('   Nothing to reset.');
      return;
    }

    const record = resources[0];
    console.log(`📊 Current Status:`);
    console.log(`   Examples: ${record.examples || 0}`);
    console.log(`   Blend Ratio: ${((record.blendRatio || 0) * 100).toFixed(1)}%`);
    console.log('');

    // Reset to defaults
    const resetRecord = {
      ...record,
      learnedWeights: record.defaultWeights || {},
      activeWeights: record.defaultWeights || {},
      blendRatio: 0.0,
      examples: 0,
      rolledBack: true,
      rollbackReason: 'Manual reset via script',
      rollbackAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: (record.version || 0) + 1,
    };

    await container.item(record.id, tenantId).replace(resetRecord);

    console.log('✅ Learning parameters reset to defaults');
    console.log('   All learned weights have been cleared.');
    console.log('   System will start learning from scratch.');
    console.log('');

  } catch (error) {
    console.error('❌ Error resetting learning:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: pnpm tsx scripts/adaptive-learning/reset-learning.ts <tenantId> <contextKey> <serviceType>');
  console.error('Example: pnpm tsx scripts/adaptive-learning/reset-learning.ts tenant-123 "tech:large:proposal" risk');
  process.exit(1);
}

const tenantId = args[0];
const contextKey = args[1];
const serviceType = args[2] as 'risk' | 'forecast' | 'recommendations';

if (!['risk', 'forecast', 'recommendations'].includes(serviceType)) {
  console.error('❌ Invalid serviceType. Must be: risk, forecast, or recommendations');
  process.exit(1);
}

resetLearning(tenantId, contextKey, serviceType)
  .then(() => {
    console.log('✅ Reset complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
