#!/usr/bin/env tsx
/**
 * Adaptive Learning Status Checker
 * 
 * Utility script to check the status of adaptive learning for a tenant
 * 
 * Usage:
 *   pnpm tsx scripts/adaptive-learning/check-learning-status.ts <tenantId> [contextKey] [serviceType]
 * 
 * Examples:
 *   pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123
 *   pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123 "tech:large:proposal" risk
 */

import { CosmosClient } from '@azure/cosmos';
import { config } from '../../apps/api/src/config/env.js';

interface LearningStatus {
  tenantId: string;
  contextKey?: string;
  serviceType?: string;
  weights?: Record<string, number>;
  examples?: number;
  learningStage?: string;
  blendRatio?: number;
  performance?: {
    accuracy: number;
    improvement: number;
  };
  validation?: {
    validated: boolean;
    confidence: number;
  };
}

async function checkLearningStatus(
  tenantId: string,
  contextKey?: string,
  serviceType?: 'risk' | 'forecast' | 'recommendations'
): Promise<void> {
  console.log(`\n🔍 Checking Adaptive Learning Status`);
  console.log(`   Tenant ID: ${tenantId}`);
  if (contextKey) console.log(`   Context Key: ${contextKey}`);
  if (serviceType) console.log(`   Service Type: ${serviceType}`);
  console.log('');

  try {
    // Initialize Cosmos DB client
    const cosmosClient = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });

    const database = cosmosClient.database(config.cosmosDb.database);
    const container = database.container('adaptiveWeights');

    // Query learning records
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (contextKey) {
      query += ' AND c.contextKey = @contextKey';
      parameters.push({ name: '@contextKey', value: contextKey });
    }

    if (serviceType) {
      query += ' AND c.serviceType = @serviceType';
      parameters.push({ name: '@serviceType', value: serviceType });
    }

    query += ' ORDER BY c.updatedAt DESC';

    const { resources } = await container.items
      .query({ query, parameters })
      .fetchAll();

    if (resources.length === 0) {
      console.log('❌ No learning records found');
      console.log('   This tenant has not started learning yet.');
      console.log('   Learning will begin after 100+ examples are collected.');
      return;
    }

    console.log(`✅ Found ${resources.length} learning record(s)\n`);

    // Display each record
    resources.forEach((record, index) => {
      console.log(`📊 Record ${index + 1}:`);
      console.log(`   Context Key: ${record.contextKey}`);
      console.log(`   Service Type: ${record.serviceType}`);
      console.log(`   Examples: ${record.examples || 0}`);
      console.log(`   Learning Stage: ${getLearningStage(record.examples || 0)}`);
      console.log(`   Blend Ratio: ${((record.blendRatio || 0) * 100).toFixed(1)}% learned`);
      console.log(`   Learning Rate: ${(record.learningRate || 0).toFixed(4)}`);
      console.log('');

      if (record.activeWeights) {
        console.log('   Active Weights:');
        Object.entries(record.activeWeights).forEach(([component, weight]) => {
          const defaultWeight = record.defaultWeights?.[component] || 0;
          const learnedWeight = record.learnedWeights?.[component] || 0;
          const diff = weight - defaultWeight;
          const diffSign = diff > 0 ? '+' : '';
          console.log(`     ${component.padEnd(15)} ${weight.toFixed(3)} (default: ${defaultWeight.toFixed(3)}, learned: ${learnedWeight.toFixed(3)}, diff: ${diffSign}${diff.toFixed(3)})`);
        });
        console.log('');
      }

      if (record.performance) {
        console.log('   Performance:');
        console.log(`     Accuracy: ${(record.performance.accuracy * 100).toFixed(1)}%`);
        console.log(`     Baseline: ${(record.performance.baseline * 100).toFixed(1)}%`);
        console.log(`     Improvement: ${(record.performance.improvement * 100).toFixed(1)}%`);
        if (record.performance.confidenceInterval) {
          console.log(`     Confidence: [${(record.performance.confidenceInterval.lower * 100).toFixed(1)}%, ${(record.performance.confidenceInterval.upper * 100).toFixed(1)}%]`);
        }
        console.log('');
      }

      if (record.validated !== undefined) {
        console.log('   Validation:');
        console.log(`     Validated: ${record.validated ? '✅ Yes' : '❌ No'}`);
        if (record.validationResults) {
          console.log(`     Confidence: ${(record.validationResults.confidence * 100).toFixed(1)}%`);
          console.log(`     Improvement: ${(record.validationResults.improvement * 100).toFixed(1)}%`);
        }
        console.log('');
      }

      if (record.rolledBack) {
        console.log('   ⚠️  ROLLED BACK');
        console.log(`     Reason: ${record.rollbackReason || 'Unknown'}`);
        console.log(`     Rolled back at: ${record.rollbackAt || 'Unknown'}`);
        console.log('');
      }

      console.log(`   Last Updated: ${record.updatedAt || 'Unknown'}`);
      console.log('   ' + '─'.repeat(60));
      console.log('');
    });

    // Summary
    const totalExamples = resources.reduce((sum, r) => sum + (r.examples || 0), 0);
    const validatedCount = resources.filter(r => r.validated).length;
    const rolledBackCount = resources.filter(r => r.rolledBack).length;

    console.log('📈 Summary:');
    console.log(`   Total Records: ${resources.length}`);
    console.log(`   Total Examples: ${totalExamples}`);
    console.log(`   Validated: ${validatedCount}/${resources.length}`);
    if (rolledBackCount > 0) {
      console.log(`   ⚠️  Rolled Back: ${rolledBackCount}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error checking learning status:', error);
    process.exit(1);
  }
}

function getLearningStage(examples: number): string {
  if (examples < 100) return 'Bootstrap (0-100)';
  if (examples < 500) return 'Initial (100-500)';
  if (examples < 1000) return 'Transition (500-1000)';
  return 'Mature (1000+)';
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: pnpm tsx scripts/adaptive-learning/check-learning-status.ts <tenantId> [contextKey] [serviceType]');
  process.exit(1);
}

const tenantId = args[0];
const contextKey = args[1];
const serviceType = args[2] as 'risk' | 'forecast' | 'recommendations' | undefined;

checkLearningStatus(tenantId, contextKey, serviceType)
  .then(() => {
    console.log('✅ Status check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
