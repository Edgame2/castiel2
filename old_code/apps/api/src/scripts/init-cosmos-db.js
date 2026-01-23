#!/usr/bin/env tsx
/**
 * Cosmos DB Initialization Script
 *
 * Creates all required containers for the Castiel application.
 * Run this script to set up a fresh Cosmos DB database.
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/init-cosmos-db.ts
 *
 * Or with pnpm:
 *   pnpm --filter @castiel/api run init-db
 */
import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const CONTAINERS = [
    // ==========================================================================
    // Core Data Containers
    // ==========================================================================
    {
        id: 'shards',
        partitionKey: '/tenantId',
        description: 'Main container for all shard documents (business data)',
    },
    {
        id: 'shard-types',
        partitionKey: '/tenantId',
        description: 'ShardType definitions (schemas for shards)',
        uniqueKeys: [['/tenantId', '/name']],
    },
    {
        id: 'revisions',
        partitionKey: '/tenantId',
        description: 'Shard revision history for versioning',
    },
    {
        id: 'shard-edges',
        partitionKey: '/sourceId',
        description: 'Relationship graph edges between shards',
    },
    {
        id: 'shard-relationships',
        partitionKey: '/tenantId',
        description: 'Shard relationship metadata',
    },
    // ==========================================================================
    // Authentication & User Management
    // ==========================================================================
    {
        id: 'users',
        partitionKey: '/partitionKey',
        description: 'User accounts and profiles',
        uniqueKeys: [['/email']],
    },
    {
        id: 'roles',
        partitionKey: '/tenantId',
        description: 'User roles and permissions',
        uniqueKeys: [['/tenantId', '/name']],
    },
    {
        id: 'RoleIdPMappings',
        partitionKey: '/tenantId',
        description: 'Role to Identity Provider group mappings',
    },
    // ==========================================================================
    // Multi-Tenancy
    // ==========================================================================
    {
        id: 'tenants',
        partitionKey: '/partitionKey',
        description: 'Tenant definitions and settings',
    },
    {
        id: 'tenant-join-requests',
        partitionKey: '/tenantId',
        description: 'Requests to join tenants',
    },
    {
        id: 'tenant-invitations',
        partitionKey: '/tenantId',
        description: 'Invitations to join tenants',
        defaultTTL: 60 * 60 * 24 * 7, // 7 days
    },
    // ==========================================================================
    // SSO & OAuth
    // ==========================================================================
    {
        id: 'sso-configs',
        partitionKey: '/tenantId',
        description: 'SSO provider configurations per tenant',
    },
    {
        id: 'oauth2-clients',
        partitionKey: '/tenantId',
        description: 'OAuth2 client applications',
    },
    // ==========================================================================
    // MFA & Security
    // ==========================================================================
    {
        id: 'mfa-audit',
        partitionKey: '/tenantId',
        description: 'MFA audit logs',
        defaultTTL: 60 * 60 * 24 * 90, // 90 days
    },
    // ==========================================================================
    // Integrations (Container Architecture)
    // ==========================================================================
    {
        id: 'integration_providers',
        partitionKey: '/category',
        description: 'Integration provider definitions (system-level catalog)',
        uniqueKeys: [['/category', '/provider']],
    },
    {
        id: 'integrations',
        partitionKey: '/tenantId',
        description: 'Tenant integration instances with configuration',
        uniqueKeys: [['/tenantId', '/providerName', '/name']],
    },
    {
        id: 'integration-connections',
        partitionKey: '/integrationId',
        description: 'Integration connection credentials (system/tenant/user-scoped)',
    },
    {
        id: 'conversion-schemas',
        partitionKey: '/tenantId',
        description: 'Data conversion schemas for integrations',
    },
    {
        id: 'sync-tasks',
        partitionKey: '/tenantId',
        description: 'Sync task configurations',
    },
    {
        id: 'sync-executions',
        partitionKey: '/tenantId',
        description: 'Sync execution history and logs',
        defaultTTL: 60 * 60 * 24 * 30, // 30 days
    },
    {
        id: 'sync-conflicts',
        partitionKey: '/tenantId',
        description: 'Sync conflict records for resolution',
    },
    {
        id: 'custom-integrations',
        partitionKey: '/tenantId',
        description: 'User-defined custom API integrations',
    },
    // ==========================================================================
    // Webhooks & Events
    // ==========================================================================
    {
        id: 'webhooks',
        partitionKey: '/tenantId',
        description: 'Webhook endpoint configurations',
    },
    {
        id: 'webhook-deliveries',
        partitionKey: '/tenantId',
        description: 'Webhook delivery attempts and logs',
        defaultTTL: 60 * 60 * 24 * 7, // 7 days
    },
    // ==========================================================================
    // Schema Management
    // ==========================================================================
    {
        id: 'schema-migrations',
        partitionKey: '/tenantId',
        description: 'Schema migration history',
    },
    // ==========================================================================
    // Option Lists (for dropdowns)
    // ==========================================================================
    {
        id: 'optionLists',
        partitionKey: '/tenantId',
        description: 'Reusable dropdown option lists',
    },
    // ==========================================================================
    // Widget Catalog
    // ==========================================================================
    {
        id: 'widgetCatalog',
        partitionKey: '/catalogType',
        description: 'System-wide widget catalog definitions',
    },
    {
        id: 'tenantWidgetOverrides',
        partitionKey: '/tenantId',
        description: 'Tenant-specific widget visibility overrides',
    },
    {
        id: 'tenantWidgetConfigs',
        partitionKey: '/tenantId',
        description: 'Tenant-specific widget catalog configuration',
    },
    // ==========================================================================
    // AI & Insights
    // ==========================================================================
    {
        id: 'aimodel',
        partitionKey: '/provider',
        description: 'AI model catalog (LLM, Embedding, etc.)',
    },
    {
        id: 'aiconnexion',
        partitionKey: '/tenantId',
        description: 'AI connection configurations with credentials',
    },
    {
        id: 'systemConfig',
        partitionKey: '/configType',
        description: 'System-wide AI and app configuration',
    },
    {
        id: 'tenantAIConfig',
        partitionKey: '/tenantId',
        description: 'Tenant-specific AI configuration',
    },
    {
        id: 'aiUsage',
        partitionKey: '/tenantId',
        description: 'AI usage tracking and billing',
    },
    {
        id: 'semantic-cache',
        partitionKey: '/tenantId',
        description: 'Semantic cache for AI responses',
        defaultTTL: 60 * 60 * 24, // 24 hours
    },
    {
        id: 'insight-templates',
        partitionKey: '/tenantId',
        description: 'Pre-built and custom insight templates',
    },
    {
        id: 'scheduled-insights',
        partitionKey: '/tenantId',
        description: 'Scheduled insight configurations',
    },
    {
        id: 'insight-feedback',
        partitionKey: '/tenantId',
        description: 'User feedback on AI insights',
    },
    {
        id: 'entity-memory',
        partitionKey: '/tenantId',
        description: 'Long-term memory for entities',
    },
    {
        id: 'user-preferences',
        partitionKey: '/tenantId',
        description: 'User AI preferences and learned facts',
    },
    {
        id: 'shared-insights',
        partitionKey: '/tenantId',
        description: 'Shared insights and collaborative features',
    },
    // ==========================================================================
    // AI Insights Advanced Features (Dedicated Containers with HPK)
    // ==========================================================================
    {
        id: 'feedback',
        partitionKey: '/partitionKey',
        description: 'User feedback and quality metrics for AI insights (HPK: [tenantId, insightId, userId])',
    },
    {
        id: 'prompts',
        partitionKey: '/tenantId',
        description: 'System, Tenant, and User prompts for AI Insights',
        uniqueKeys: [['/tenantId', '/slug', '/version']],
    },
    {
        id: 'learning',
        partitionKey: '/tenantId',
        description: 'Pattern detection and improvement suggestions',
    },
    {
        id: 'experiments',
        partitionKey: '/partitionKey',
        description: 'A/B testing experiments, assignments, and events (HPK: [tenantId, experimentId, userId])',
    },
    {
        id: 'media',
        partitionKey: '/partitionKey',
        description: 'Multi-modal assets: images, audio, video, documents (HPK: [tenantId, insightId, assetId])',
        defaultTTL: 60 * 60 * 24 * 365, // 1 year (COLD tier)
    },
    {
        id: 'templates',
        partitionKey: '/tenantId',
        description: 'Insight templates and template executions',
    },
    {
        id: 'proactive-insights',
        partitionKey: '/tenantId',
        description: 'Proactive insights generated from trigger conditions',
    },
    {
        id: 'proactive-triggers',
        partitionKey: '/tenantId',
        description: 'Proactive trigger configurations for automated insight generation',
    },
    {
        id: 'audit',
        partitionKey: '/partitionKey',
        description: 'Audit trail for insight generation and modifications (HPK: [tenantId, insightId, auditEntryId])',
        defaultTTL: 60 * 60 * 24 * 7, // 7 days
    },
    {
        id: 'graph',
        partitionKey: '/partitionKey',
        description: 'Insight dependencies and relationships (HPK: [tenantId, sourceInsightId, targetInsightId])',
        defaultTTL: 60 * 60 * 24 * 180, // 6 months (COLD tier)
    },
    {
        id: 'exports',
        partitionKey: '/partitionKey',
        description: 'Export jobs, integrations, and webhook deliveries (HPK: [tenantId, exportJobId, integrationId])',
        defaultTTL: 60 * 60 * 24 * 90, // 90 days (COLD tier)
    },
    {
        id: 'backups',
        partitionKey: '/partitionKey',
        description: 'Backup jobs and recovery points (HPK: [tenantId, backupJobId, recoveryPointId])',
        defaultTTL: 60 * 60 * 24 * 30, // 30 days (COLD tier)
    },
    // ==========================================================================
    // Web Search Containers (initialized separately with HPK)
    // See: init-web-search-containers.ts
    // ==========================================================================
    // {
    //   id: 'c_search',
    //   partitionKey: '/partitionKey',
    //   description: 'Web search results with caching and citations (HPK: [tenantId, queryHash, id])',
    //   defaultTTL: 60 * 60 * 24 * 30, // 30 days
    // },
    // {
    //   id: 'c_webpages',
    //   partitionKey: '/partitionKey',
    //   description: 'Scraped web pages with embeddings for deep search (HPK: [tenantId, projectId, sourceQuery])',
    //   defaultTTL: 60 * 60 * 24 * 30, // 30 days
    // },
    // ==========================================================================
    // Audit & Monitoring
    // ==========================================================================
    {
        id: 'AuditLogs',
        partitionKey: '/tenantId',
        description: 'Audit log entries for compliance',
        defaultTTL: 60 * 60 * 24 * 365, // 1 year
    },
    // ==========================================================================
    // Change Feed & Processing
    // ==========================================================================
    {
        id: 'leases',
        partitionKey: '/id',
        description: 'Change Feed Processor leases for distributed processing (embedding generation, etc.)',
        // No TTL - leases are managed by Change Feed Processor
    },
    // ==========================================================================
    // Content Generation
    // ==========================================================================
    {
        id: 'document-templates',
        partitionKey: '/tenantId',
        description: 'Document templates for Content Generation system',
        // Note: id is already unique system-wide, so no unique key constraint needed
        indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent',
            includedPaths: [
                { path: '/' },
                { path: '/tenantId/?' },
                { path: '/status/?' },
                { path: '/documentFormat/?' },
                { path: '/name/?' },
                { path: '/createdAt/?' },
                { path: '/updatedAt/?' },
            ],
            excludedPaths: [
                { path: '/_etag/?' },
                { path: '/placeholders/*' }, // Exclude placeholder arrays from indexing
                { path: '/placeholderConfigs/*' }, // Exclude config arrays from indexing
                { path: '/versions/*' }, // Exclude version arrays from indexing
            ],
            compositeIndexes: [
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/status', order: 'ascending' },
                    { path: '/updatedAt', order: 'descending' },
                ],
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/documentFormat', order: 'ascending' },
                    { path: '/name', order: 'ascending' },
                ],
            ],
        },
    },
    // ==========================================================================
    // Missing Containers (Added per plan)
    // ==========================================================================
    {
        id: 'bulk-jobs',
        partitionKey: '/tenantId',
        description: 'Bulk document operation jobs',
    },
    {
        id: 'tenant-integrations',
        partitionKey: '/tenantId',
        description: 'Tenant-specific integration configurations (if needed)',
    },
    {
        id: 'notifications',
        partitionKey: ['/tenantId', '/userId', '/id'],
        useMultiHash: true,
        description: 'User notifications with HPK: [tenantId, userId, id]',
        defaultTTL: 60 * 60 * 24 * 90, // 90 days
        indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent',
            includedPaths: [
                { path: '/' },
                { path: '/tenantId/?' },
                { path: '/userId/?' },
                { path: '/status/?' },
                { path: '/type/?' },
                { path: '/createdAt/?' },
                { path: '/createdBy/type/?' },
            ],
            excludedPaths: [
                { path: '/content/?' },
                { path: '/metadata/*' },
            ],
            compositeIndexes: [
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/userId', order: 'ascending' },
                    { path: '/createdAt', order: 'descending' },
                ],
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/userId', order: 'ascending' },
                    { path: '/status', order: 'ascending' },
                    { path: '/createdAt', order: 'descending' },
                ],
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/userId', order: 'ascending' },
                    { path: '/type', order: 'ascending' },
                    { path: '/createdAt', order: 'descending' },
                ],
            ],
        },
    },
    {
        id: 'notification-preferences',
        partitionKey: ['/tenantId', '/userId'],
        useMultiHash: true,
        description: 'User notification preferences with HPK: [tenantId, userId]',
        indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent',
            includedPaths: [
                { path: '/' },
                { path: '/tenantId/?' },
                { path: '/userId/?' },
                { path: '/updatedAt/?' },
            ],
        },
    },
    {
        id: 'notification-digests',
        partitionKey: ['/tenantId', '/userId', '/id'],
        useMultiHash: true,
        description: 'Notification digests with HPK: [tenantId, userId, id]',
        defaultTTL: 60 * 60 * 24 * 30, // 30 days
        indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent',
            includedPaths: [
                { path: '/' },
                { path: '/tenantId/?' },
                { path: '/userId/?' },
                { path: '/channel/?' },
                { path: '/status/?' },
                { path: '/schedule/?' },
                { path: '/periodEnd/?' },
                { path: '/createdAt/?' },
            ],
            excludedPaths: [
                { path: '/notificationIds/*' },
            ],
            compositeIndexes: [
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/userId', order: 'ascending' },
                    { path: '/status', order: 'ascending' },
                    { path: '/periodEnd', order: 'ascending' },
                ],
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/userId', order: 'ascending' },
                    { path: '/channel', order: 'ascending' },
                    { path: '/periodEnd', order: 'ascending' },
                ],
            ],
        },
    },
    {
        id: 'collaborative-insights',
        partitionKey: ['/tenantId', '/id'],
        useMultiHash: true,
        description: 'Collaborative insights with HPK: [tenantId, id]',
        indexingPolicy: {
            automatic: true,
            indexingMode: 'consistent',
            includedPaths: [
                { path: '/' },
                { path: '/tenantId/?' },
                { path: '/sharedBy/?' },
                { path: '/visibility/?' },
                { path: '/sharedAt/?' },
                { path: '/isArchived/?' },
                { path: '/isPinned/?' },
                { path: '/tags/[]/?' },
                { path: '/sourceType/?' },
                { path: '/sourceId/?' },
            ],
            excludedPaths: [
                { path: '/content/?' },
                { path: '/comments/*' },
            ],
            compositeIndexes: [
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/sharedAt', order: 'descending' },
                ],
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/sharedBy', order: 'ascending' },
                    { path: '/sharedAt', order: 'descending' },
                ],
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/visibility', order: 'ascending' },
                    { path: '/sharedAt', order: 'descending' },
                ],
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/isArchived', order: 'ascending' },
                    { path: '/isPinned', order: 'descending' },
                    { path: '/sharedAt', order: 'descending' },
                ],
            ],
        },
    },
];
// ============================================================================
// Initialization Functions
// ============================================================================
async function createContainer(database, config) {
    const containerDef = {
        id: config.id,
    };
    // Handle partition key - support both single and MultiHash
    if (Array.isArray(config.partitionKey) || config.useMultiHash) {
        // MultiHash partition key
        const paths = Array.isArray(config.partitionKey) ? config.partitionKey : [config.partitionKey];
        containerDef.partitionKey = {
            paths,
            kind: 'MultiHash', // Cosmos DB SDK type may not include MultiHash
            version: 2,
        };
    }
    else {
        // Single partition key
        containerDef.partitionKey = {
            paths: [config.partitionKey],
        };
    }
    // Add unique keys if specified
    if (config.uniqueKeys && config.uniqueKeys.length > 0) {
        containerDef.uniqueKeyPolicy = {
            uniqueKeys: config.uniqueKeys.map((paths) => ({ paths })),
        };
    }
    // Add default TTL if specified
    if (config.defaultTTL) {
        containerDef.defaultTtl = config.defaultTTL;
    }
    // Add indexing policy if specified
    if (config.indexingPolicy) {
        containerDef.indexingPolicy = config.indexingPolicy;
    }
    try {
        const { container, statusCode } = await database.containers.createIfNotExists(containerDef);
        // 201 = created, 200 = already exists
        const created = statusCode === 201;
        return { created, name: config.id };
    }
    catch (error) {
        console.error(`❌ Error creating container "${config.id}":`, error.message);
        throw error;
    }
}
async function initializeDatabase() {
    // Get configuration from environment
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel';
    // Validate configuration
    if (!endpoint || !key) {
        console.error('❌ Missing Cosmos DB configuration:');
        if (!endpoint) {
            console.error('   - COSMOS_DB_ENDPOINT is not set');
        }
        if (!key) {
            console.error('   - COSMOS_DB_KEY is not set');
        }
        console.error('\nPlease set these environment variables in your .env or .env.local file.');
        process.exit(1);
    }
    console.log('🚀 Cosmos DB Initialization Script');
    console.log('===================================');
    console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
    console.log(`📁 Database: ${databaseId}`);
    console.log(`📦 Containers to create: ${CONTAINERS.length}`);
    console.log('');
    // Create Cosmos client
    const client = new CosmosClient({ endpoint, key });
    try {
        // Create or get database
        console.log(`📂 Ensuring database "${databaseId}" exists...`);
        const { database, statusCode } = await client.databases.createIfNotExists({
            id: databaseId,
        });
        if (statusCode === 201) {
            console.log(`   ✅ Database "${databaseId}" created`);
        }
        else {
            console.log(`   ℹ️  Database "${databaseId}" already exists`);
        }
        console.log('');
        // Create containers
        console.log('📦 Creating containers...');
        console.log('');
        let created = 0;
        let existing = 0;
        let failed = 0;
        for (const containerConfig of CONTAINERS) {
            try {
                const result = await createContainer(database, containerConfig);
                if (result.created) {
                    console.log(`   ✅ Created: ${containerConfig.id}`);
                    console.log(`      └─ ${containerConfig.description}`);
                    created++;
                }
                else {
                    console.log(`   ℹ️  Exists:  ${containerConfig.id}`);
                    existing++;
                }
            }
            catch (error) {
                console.log(`   ❌ Failed:  ${containerConfig.id}`);
                failed++;
            }
        }
        // Summary
        console.log('');
        console.log('===================================');
        console.log('📊 Summary:');
        console.log(`   ✅ Created:  ${created}`);
        console.log(`   ℹ️  Existing: ${existing}`);
        if (failed > 0) {
            console.log(`   ❌ Failed:   ${failed}`);
        }
        console.log('');
        if (failed === 0) {
            console.log('✅ Database initialization complete!');
        }
        else {
            console.log('⚠️  Database initialization completed with errors.');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('');
        console.error('❌ Fatal error during initialization:');
        console.error(`   ${error.message}`);
        if (error.code === 'Unauthorized') {
            console.error('');
            console.error('   This error usually means the COSMOS_DB_KEY is invalid.');
            console.error('   Please check your Azure portal for the correct key.');
        }
        process.exit(1);
    }
}
// ============================================================================
// Run Script
// ============================================================================
initializeDatabase().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
//# sourceMappingURL=init-cosmos-db.js.map