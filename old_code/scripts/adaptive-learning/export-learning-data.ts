#!/usr/bin/env tsx
/**
 * Adaptive Learning Data Export
 * 
 * Utility script to export learning data for analysis
 * 
 * Usage:
 *   pnpm tsx scripts/adaptive-learning/export-learning-data.ts <tenantId> [outputFile]
 * 
 * Example:
 *   pnpm tsx scripts/adaptive-learning/export-learning-data.ts tenant-123 learning-data.json
 */

import { CosmosClient } from '@azure/cosmos';
import { writeFileSync } from 'fs';
import { config } from '../../apps/api/src/config/env.js';

interface ExportData {
  tenantId: string;
  exportedAt: string;
  learningRecords: any[];
  outcomes: any[];
  performance: any[];
}

async function exportLearningData(
  tenantId: string,
  outputFile?: string
): Promise<void> {
  console.log(`\n📤 Exporting Adaptive Learning Data`);
  console.log(`   Tenant ID: ${tenantId}`);
  if (outputFile) console.log(`   Output File: ${outputFile}`);
  console.log('');

  try {
    // Initialize Cosmos DB client
    const cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });

    const database = cosmosClient.database(config.cosmosDb.database);

    // Export learning records
    console.log('📊 Exporting learning records...');
    const weightsContainer = database.container('adaptiveWeights');
    const { resources: learningRecords } = await weightsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.updatedAt DESC',
        parameters: [{ name: '@tenantId', value: tenantId }],
      })
      .fetchAll();
    console.log(`   Found ${learningRecords.length} learning records`);

    // Export outcomes
    console.log('📊 Exporting outcomes...');
    const outcomesContainer = database.container('learningOutcomes');
    const { resources: outcomes } = await outcomesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@tenantId', value: tenantId }],
      })
      .fetchAll();
    console.log(`   Found ${outcomes.length} outcomes`);

    // Compile export data
    const exportData: ExportData = {
      tenantId,
      exportedAt: new Date().toISOString(),
      learningRecords,
      outcomes,
      performance: [], // TODO: Add performance metrics if needed
    };

    // Write to file or stdout
    const json = JSON.stringify(exportData, null, 2);
    
    if (outputFile) {
      writeFileSync(outputFile, json, 'utf-8');
      console.log(`\n✅ Data exported to ${outputFile}`);
      console.log(`   Records: ${learningRecords.length}`);
      console.log(`   Outcomes: ${outcomes.length}`);
    } else {
      console.log('\n📄 Export Data:');
      console.log(json);
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error exporting data:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: pnpm tsx scripts/adaptive-learning/export-learning-data.ts <tenantId> [outputFile]');
  console.error('Example: pnpm tsx scripts/adaptive-learning/export-learning-data.ts tenant-123 learning-data.json');
  process.exit(1);
}

const tenantId = args[0];
const outputFile = args[1];

exportLearningData(tenantId, outputFile)
  .then(() => {
    console.log('✅ Export complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
