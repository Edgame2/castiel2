/**
 * Audit Logging Verification Script
 * Tests document upload and verifies audit log entries in Cosmos DB
 */

import 'dotenv/config';
import { CosmosClient } from '@azure/cosmos';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) {throw new Error(`Missing env: ${name}`);}
  return v;
}

async function verifyAuditLogs() {
  const cosmosDbEndpoint = getEnv('COSMOS_DB_ENDPOINT');
  const cosmosDbKey = getEnv('COSMOS_DB_KEY');
  const cosmosDbDatabase = getEnv('COSMOS_DB_DATABASE');

  // Initialize Cosmos DB client
  const cosmosClient = new CosmosClient({ endpoint: cosmosDbEndpoint, key: cosmosDbKey });
  const database = cosmosClient.database(cosmosDbDatabase);
  const auditLogsContainer = database.container('audit-logs');

  console.log('Verifying audit logging setup...\n');
  console.log(`✓ Connected to Cosmos DB: ${cosmosDbDatabase}`);
  console.log(`✓ Audit logs container: audit-logs\n`);

  try {
    // Query recent audit logs
    const query = `
      SELECT TOP 10 c.id, c.action, c.resourceType, c.resourceId, c.timestamp, c.metadata
      FROM c
      WHERE c.action IN ('document.uploaded', 'document.downloaded', 'document.deleted', 'document.viewed', 'document.updated')
      ORDER BY c.timestamp DESC
    `;

    console.log('Querying recent audit logs...\n');
    const { resources } = await auditLogsContainer.items.query(query).fetchAll();

    if (resources.length === 0) {
      console.log('⚠️  No audit logs found yet.');
      console.log('\n📝 Next Steps:');
      console.log('1. Start the API server: pnpm dev');
      console.log('2. Upload a document via: POST /api/v1/documents/upload');
      console.log('3. Run this script again to see the audit log\n');
      return;
    }

    console.log(`✅ Found ${resources.length} audit log entries:\n`);
    resources.forEach((log: any, i: number) => {
      console.log(`${i + 1}. ${log.action}`);
      console.log(`   Resource: ${log.resourceType}/${log.resourceId}`);
      console.log(`   Timestamp: ${log.timestamp}`);
      if (log.metadata?.fileName) {console.log(`   File: ${log.metadata.fileName}`);}
      if (log.metadata?.fileSize) {console.log(`   Size: ${(log.metadata.fileSize / 1024).toFixed(2)} KB`);}
      if (log.metadata?.ipAddress) {console.log(`   IP: ${log.metadata.ipAddress}`);}
      console.log();
    });

    // Show most recent audit entry in detail
    if (resources.length > 0) {
      const latest = resources[0];
      console.log('📊 Most Recent Audit Entry (Full Details):');
      console.log(JSON.stringify(latest, null, 2));
    }
  } catch (err: any) {
    console.error('❌ Error querying audit logs:', err.message);
    if (err.message.includes('404')) {
      console.log('\n⚠️  The audit-logs container may not exist yet.');
      console.log('   This is expected if no documents have been uploaded.\n');
    }
  }
}

verifyAuditLogs().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
