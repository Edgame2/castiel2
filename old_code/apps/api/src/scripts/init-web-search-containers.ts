#!/usr/bin/env tsx
// @ts-nocheck
/**
 * Web Search Container Initialization
 * 
 * Creates and configures the c_search and c_webpages containers
 * with proper partition keys, indexes, and TTL.
 * 
 * Note: Hierarchical Partition Keys (HPK) using MultiHash require
 * Azure Cosmos DB SDK v4.8.0+ and API version 2023-04-01+
 * 
 * Usage:
 *   npx tsx apps/api/src/scripts/init-web-search-containers.ts
 */

import { CosmosClient, Database, ContainerDefinition } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ============================================================================
// Container Definitions with Indexes
// ============================================================================

interface WebSearchContainerConfig {
    id: string;
    partitionKey: string[]; // Hierarchical PK paths
    description: string;
    defaultTTL: number;
    indexes?: {
        composite?: Array<Array<{ path: string; order: 'ascending' | 'descending' }>>;
    };
}

const WEB_SEARCH_CONTAINERS: WebSearchContainerConfig[] = [
    {
        id: 'c_search',
        // Hierarchical PK: tenantId/queryHash/id for dedupe + isolation
        partitionKey: ['/tenantId', '/queryHash', '/id'],
        description: 'Web search results with snippets, rankings, and citations',
        defaultTTL: 60 * 60 * 24 * 30, // 30 days
        indexes: {
            composite: [
                // Query: Get all searches for a tenant, ordered by date
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/metadata/createdAt', order: 'descending' },
                ],
                // Query: Get results for a specific query hash
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/queryHash', order: 'ascending' },
                ],
                // Query: Find fresh results
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/metadata/freshResults', order: 'ascending' },
                    { path: '/metadata/createdAt', order: 'descending' },
                ],
            ],
        },
    },
    {
        id: 'c_webpages',
        // Hierarchical PK: tenantId/projectId/sourceQuery for deep search pages
        partitionKey: ['/tenantId', '/projectId', '/sourceQuery'],
        description: 'Scraped web pages with semantic chunks and embeddings',
        defaultTTL: 60 * 60 * 24 * 30, // 30 days
        indexes: {
            composite: [
                // Query: Get all pages for a project, ordered by date
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/projectId', order: 'ascending' },
                    { path: '/metadata/scrapedAt', order: 'descending' },
                ],
                // Query: Get pages by recurring search
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/recurringSearchId', order: 'ascending' },
                    { path: '/audit/accessCount', order: 'descending' },
                ],
                // Query: Get pages by conversation, ordered by relevance
                [
                    { path: '/tenantId', order: 'ascending' },
                    { path: '/conversationId', order: 'ascending' },
                    { path: '/metadata/scrapedAt', order: 'descending' },
                ],
            ],
        },
    },
];

// ============================================================================
// Container Creation
// ============================================================================

async function createWebSearchContainer(
    database: Database,
    config: WebSearchContainerConfig
): Promise<{ created: boolean; name: string }> {
    // Build container definition
    const containerDef: ContainerDefinition = {
        id: config.id,
        partitionKey: {
            paths: config.partitionKey,
            kind: 'MultiHash',
            version: 2,
        },
        defaultTtl: config.defaultTTL,
    };

    // Add composite indexes if specified
    if (config.indexes?.composite) {
        containerDef.indexingPolicy = {
            indexingMode: 'consistent',
            automatic: true,
            includedPaths: [
                {
                    path: '/*',
                },
            ],
            excludedPaths: [
                {
                    path: '/structuredData/content/?',
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
            console.log(`      Partition Key: ${config.partitionKey.join(', ')}`);
            console.log(`      TTL: ${config.defaultTTL / (60 * 60 * 24)} days`);
            if (config.indexes?.composite) {
                console.log(`      Composite Indexes: ${config.indexes.composite.length}`);
            }
        }

        return { created, name: config.id };
    } catch (error: any) {
        console.error(`   ❌ Error creating container "${config.id}":`, error.message);
        throw error;
    }
}

// ============================================================================
// Vector Index Configuration (Post-Creation Setup)
// ============================================================================

async function setupVectorIndexes(database: Database): Promise<void> {
    try {
        const container = database.container('c_webpages');

        // Note: Vector indexes require manual configuration through Azure Portal
        // or REST API calls at this time. The SDK support is limited.
        // This is a helper function for future use when full SDK support is available.

        console.log('');
        console.log('📊 Vector Index Configuration (Manual Setup Required):');
        console.log('   ℹ️  Vector indexes for semantic search require manual configuration');
        console.log('   ℹ️  Complete these steps in Azure Portal or via REST API:');
        console.log('');
        console.log('   1. Navigate to: Data Explorer → c_webpages → Settings → Indexing Policy');
        console.log('   2. Add vector index for: /embedding/chunks/*/embedding');
        console.log('   3. Set dimensions: 1536 (for OpenAI text-embedding-3-small)');
        console.log('   4. Set similarity metric: Cosine');
        console.log('');
        console.log('   REST API Example:');
        console.log('   POST /dbs/{database-id}/colls/{collection-id}');
        console.log('   Content-Type: application/json');
        console.log('');
        console.log('   {');
        console.log('     "indexingPolicy": {');
        console.log('       "vectorIndexes": [');
        console.log('         {');
        console.log('           "path": "/embedding/chunks/*/embedding",');
        console.log('           "dimensions": 1536,');
        console.log('           "similarity": "cosine"');
        console.log('         }');
        console.log('       ]');
        console.log('     }');
        console.log('   }');
        console.log('');
    } catch (error: any) {
        console.warn('⚠️  Vector index setup skipped:', error.message);
    }
}

// ============================================================================
// Main Initialization
// ============================================================================

async function initializeWebSearchContainers(): Promise<void> {
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

    console.log('🔍 Web Search Containers Initialization');
    console.log('========================================');
    console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
    console.log(`📁 Database: ${databaseId}`);
    console.log(`📦 Containers to create: ${WEB_SEARCH_CONTAINERS.length}`);
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

        // Create containers
        console.log('📋 Creating Web Search containers:');
        const results: { created: number; existing: number } = { created: 0, existing: 0 };

        for (const containerConfig of WEB_SEARCH_CONTAINERS) {
            const { created } = await createWebSearchContainer(database, containerConfig);
            if (created) {
                results.created++;
            } else {
                results.existing++;
            }
        }

        console.log('');
        console.log('✨ Initialization complete!');
        console.log(`   ${results.created} new containers created`);
        console.log(`   ${results.existing} containers already existed`);
        console.log('');

        // Setup vector indexes
        await setupVectorIndexes(database);

        // Provide next steps
        console.log('📝 Next steps:');
        console.log('   1. Verify containers in Azure Portal');
        console.log('   2. Configure vector indexes (see instructions above)');
        console.log('   3. Start implementing WebSearchService');
        console.log('   4. Build WebScraperService for deep search');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}

// Run initialization
if (require.main === module) {
    initializeWebSearchContainers().catch((error) => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

export { initializeWebSearchContainers, createWebSearchContainer };