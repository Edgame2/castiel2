// @ts-nocheck
/**
 * Query Performance Analysis Script
 * 
 * Analyzes Cosmos DB query performance and generates optimization recommendations.
 * Run this script periodically to identify slow or expensive queries.
 */

import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';
import { MonitoringService } from '@castiel/monitoring';
import { QueryOptimizationService } from '../services/query-optimization.service.js';
import { config } from '../config/env.js';

async function main() {
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseId = process.env.COSMOS_DB_DATABASE_ID || config.cosmosDb.database;

  if (!endpoint || !key) {
    console.error('❌ Missing Cosmos DB configuration. Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY.');
    process.exit(1);
  }

  console.log('🔍 Starting Query Performance Analysis');
  console.log(`📁 Database: ${databaseId}`);
  console.log('');

  const monitoring = MonitoringService.initialize({ enabled: false, provider: 'mock' });
  const cosmosClient = new CosmosClient({ endpoint, key });
  const database = cosmosClient.database(databaseId);
  const optimizationService = new QueryOptimizationService(monitoring, cosmosClient);

  // Sample queries to analyze (common patterns from repositories)
  const testQueries = [
    {
      container: 'shards',
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@tenantId', value: 'test-tenant' },
        { name: '@status', value: 'active' },
      ],
      partitionKey: 'test-tenant',
      description: 'List active shards for tenant',
    },
    {
      container: 'shards',
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.shardTypeId = @shardTypeId ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@tenantId', value: 'test-tenant' },
        { name: '@shardTypeId', value: 'c_project' },
      ],
      partitionKey: 'test-tenant',
      description: 'List shards by type',
    },
    {
      container: 'shards',
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.lastActivityAt DESC',
      parameters: [
        { name: '@tenantId', value: 'test-tenant' },
      ],
      partitionKey: 'test-tenant',
      description: 'List shards by activity',
    },
    {
      container: 'shard-types',
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
      parameters: [
        { name: '@tenantId', value: 'test-tenant' },
        { name: '@status', value: 'active' },
      ],
      partitionKey: 'test-tenant',
      description: 'List active shard types',
    },
  ];

  console.log('📊 Analyzing sample queries...\n');

  for (const testQuery of testQueries) {
    try {
      const container = database.container(testQuery.container);
      const result = await optimizationService.analyzeQuery(
        container,
        testQuery.query,
        testQuery.parameters,
        testQuery.partitionKey
      );

      console.log(`📝 Query: ${testQuery.description}`);
      console.log(`   Execution Time: ${result.executionTimeMs}ms`);
      console.log(`   Request Charge: ${result.requestCharge} RUs`);
      console.log(`   Items Returned: ${result.itemCount}`);
      console.log(`   Partition Key Used: ${result.partitionKeyUsed ? '✅' : '❌'}`);
      console.log(`   Composite Index: ${result.hasCompositeIndex ? '✅' : '❌'}`);
      console.log(`   Severity: ${result.severity.toUpperCase()}`);

      if (result.recommendations.length > 0) {
        console.log(`   Recommendations:`);
        result.recommendations.forEach(rec => {
          console.log(`     - ${rec}`);
        });
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Error analyzing query "${testQuery.description}":`, error);
      console.log('');
    }
  }

  // Generate overall report
  console.log('📈 Generating Optimization Report...\n');
  const report = optimizationService.generateReport();

  console.log('========================================');
  console.log('📊 Query Optimization Report');
  console.log('========================================');
  console.log(`Total Queries Analyzed: ${report.totalQueries}`);
  console.log(`Slow Queries (>1000ms): ${report.slowQueries}`);
  console.log(`Expensive Queries (>10 RUs): ${report.expensiveQueries}`);
  console.log(`Missing Partition Key: ${report.missingPartitionKey}`);
  console.log(`Missing Index: ${report.missingIndex}`);
  console.log('');

  if (report.recommendations.length > 0) {
    console.log('💡 Top Recommendations:');
    const highPriority = report.recommendations.filter(r => r.priority === 'high');
    const mediumPriority = report.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = report.recommendations.filter(r => r.priority === 'low');

    if (highPriority.length > 0) {
      console.log('\n🔴 High Priority:');
      highPriority.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.issue}`);
        console.log(`      Query: ${rec.query.substring(0, 100)}...`);
        console.log(`      Recommendation: ${rec.recommendation}`);
      });
    }

    if (mediumPriority.length > 0) {
      console.log('\n🟡 Medium Priority:');
      mediumPriority.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.issue}`);
        console.log(`      Query: ${rec.query.substring(0, 100)}...`);
        console.log(`      Recommendation: ${rec.recommendation}`);
      });
    }

    if (lowPriority.length > 0) {
      console.log('\n🟢 Low Priority:');
      lowPriority.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.issue}`);
        console.log(`      Recommendation: ${rec.recommendation}`);
      });
    }
  } else {
    console.log('✅ No optimization recommendations at this time.');
  }

  console.log('\n✅ Analysis complete!');
}

main().catch((err) => {
  console.error('❌ Fatal error during analysis', err);
  process.exit(1);
});








