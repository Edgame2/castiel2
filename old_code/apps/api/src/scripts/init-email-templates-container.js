#!/usr/bin/env tsx
/**
 * Email Templates Container Initialization
 *
 * Creates and configures the EmailTemplates container
 * with partition key, unique keys, and indexing policies.
 *
 * Usage:
 *   npx tsx apps/api/src/scripts/init-email-templates-container.ts
 */
import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load environment variables from project root
const projectRoot = resolve(__dirname, '../../../../');
const possibleEnvPaths = [
    resolve(projectRoot, '.env'),
    resolve(projectRoot, '.env.local'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
];
// Load all .env files
dotenv.config();
for (const envPath of possibleEnvPaths) {
    try {
        const result = dotenv.config({ path: envPath, override: false });
        if (!result.error && result.parsed) {
            console.log(`📄 Loaded env from: ${envPath} (${Object.keys(result.parsed).length} variables)`);
        }
    }
    catch (err) {
        // Ignore file not found errors
    }
}
const EMAIL_TEMPLATES_CONTAINER = {
    id: 'EmailTemplates',
    partitionKey: '/tenantId',
    description: 'Email templates with multi-language support',
    uniqueKeys: [['/tenantId', '/name', '/language']],
    indexes: {
        composite: [
            // Query: List templates by tenant and category
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/category', order: 'ascending' },
                { path: '/createdAt', order: 'descending' },
            ],
            // Query: List templates by tenant and language
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/language', order: 'ascending' },
                { path: '/name', order: 'ascending' },
            ],
            // Query: List templates by tenant and status
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/isActive', order: 'ascending' },
                { path: '/updatedAt', order: 'descending' },
            ],
            // Query: Search templates by name
            [
                { path: '/tenantId', order: 'ascending' },
                { path: '/name', order: 'ascending' },
                { path: '/language', order: 'ascending' },
            ],
        ],
    },
};
// ============================================================================
// Container Creation
// ============================================================================
async function createEmailTemplatesContainer(database, config) {
    // Build container definition
    const containerDef = {
        id: config.id,
        partitionKey: {
            paths: [config.partitionKey],
            version: 2,
        },
        uniqueKeyPolicy: {
            uniqueKeys: config.uniqueKeys.map(keys => ({
                paths: keys,
            })),
        },
    };
    // Add composite indexes if specified
    if (config.indexes?.composite) {
        containerDef.indexingPolicy = {
            indexingMode: 'consistent',
            automatic: true,
            includedPaths: [
                {
                    path: '/',
                },
                {
                    path: '/tenantId/?',
                },
                {
                    path: '/name/?',
                },
                {
                    path: '/language/?',
                },
                {
                    path: '/category/?',
                },
                {
                    path: '/isActive/?',
                },
                {
                    path: '/createdAt/?',
                },
                {
                    path: '/updatedAt/?',
                },
                {
                    path: '/createdBy/type/?',
                },
            ],
            excludedPaths: [
                {
                    path: '/htmlBody/?',
                },
                {
                    path: '/textBody/?',
                },
                {
                    path: '/description/?',
                },
                {
                    path: '/placeholders/*',
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
            console.log(`      Partition Key: ${config.partitionKey}`);
            console.log(`      Unique Keys: ${config.uniqueKeys.map(k => k.join(', ')).join('; ')}`);
            if (config.indexes?.composite) {
                console.log(`      Composite Indexes: ${config.indexes.composite.length}`);
            }
        }
        return { created, name: config.id };
    }
    catch (error) {
        console.error(`   ❌ Error creating container "${config.id}":`, error.message);
        throw error;
    }
}
// ============================================================================
// Main Initialization
// ============================================================================
async function initializeEmailTemplatesContainer() {
    // Try to use config module first (it handles .env loading)
    let endpoint;
    let key;
    let databaseId;
    try {
        // Import config module which handles .env loading
        const configModule = await import('../config/env.js');
        endpoint = configModule.config.cosmosDb.endpoint;
        key = configModule.config.cosmosDb.key;
        databaseId = configModule.config.cosmosDb.databaseId;
        console.log('✅ Loaded configuration from config module');
    }
    catch (err) {
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
        if (!endpoint) {
            console.error('   - COSMOS_DB_ENDPOINT is not set');
        }
        if (!key) {
            console.error('   - COSMOS_DB_KEY is not set');
        }
        console.error('\n📝 Please add these to your .env or .env.local file:');
        console.error('   COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/');
        console.error('   COSMOS_DB_KEY=your-primary-key');
        console.error('   COSMOS_DB_DATABASE_ID=castiel');
        console.error(`\n   Current working directory: ${process.cwd()}`);
        console.error(`   Project root: ${projectRoot}`);
        console.error(`   Checked files: .env, .env.local`);
        process.exit(1);
    }
    console.log('📧 Email Templates Container Initialization');
    console.log('===========================================');
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
        console.log('📋 Creating EmailTemplates container:');
        const { created } = await createEmailTemplatesContainer(database, EMAIL_TEMPLATES_CONTAINER);
        console.log('');
        console.log('✨ Initialization complete!');
        console.log(`   ${created ? 'Container created' : 'Container already exists'}`);
        console.log('');
        // Provide next steps
        console.log('📝 Next steps:');
        console.log('   1. Verify container in Azure Portal');
        console.log('   2. Start the API server');
        console.log('   3. Test email template endpoints');
        console.log('');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}
// Run initialization if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.includes('init-email-templates-container.ts') ||
    !process.env.NODE_ENV;
if (isMainModule) {
    initializeEmailTemplatesContainer().catch((error) => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}
export { initializeEmailTemplatesContainer, createEmailTemplatesContainer };
//# sourceMappingURL=init-email-templates-container.js.map