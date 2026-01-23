#!/usr/bin/env ts-node
/**
 * Database Initialization Script
 * 
 * This script initializes the Cosmos DB database with all required containers,
 * partition keys, and indexing policies for the Castiel API project.
 * 
 * Usage:
 *   npm run db:init
 * 
 * Or directly:
 *   ts-node scripts/init-database.ts
 * 
 * Prerequisites:
 *   - Azure Cosmos DB account created
 *   - Environment variables set (COSMOS_DB_ENDPOINT, COSMOS_DB_KEY)
 *   - Or .env file in project root
 */

import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const ENDPOINT = process.env.COSMOS_DB_ENDPOINT || '';
const KEY = process.env.COSMOS_DB_KEY || '';
const DATABASE_NAME = process.env.COSMOS_DB_DATABASE || 'castiel';

// Container configurations
const CONTAINERS = [
  {
    id: 'users',
    partitionKey: '/tenantId',
    defaultTtl: -1, // No automatic deletion
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/metadata/*' },
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/email', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/createdAt', order: 'descending' as const }
        ]
      ]
    },
    throughput: 400
  },
  {
    id: 'sso-configs',
    partitionKey: '/tenantId',
    defaultTtl: -1,
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/certificate/*' },
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/isActive', order: 'ascending' as const }
        ]
      ]
    },
    throughput: 400
  },
  {
    id: 'oauth2-clients',
    partitionKey: '/tenantId',
    defaultTtl: -1,
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/clientSecret/*' },
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const }
        ]
      ]
    },
    throughput: 400
  },
  {
    id: 'shards',
    partitionKey: '/tenantId',
    defaultTtl: -1,
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/unstructuredData/*' },
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/createdAt', order: 'descending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/shardTypeId', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const },
          { path: '/updatedAt', order: 'descending' as const }
        ]
      ]
    },
    vectorEmbeddingPolicy: {
      vectorEmbeddings: [
        {
          path: '/vectors/embedding',
          dataType: 'float32' as any,
          dimensions: 1536,
          distanceFunction: 'cosine' as any
        }
      ]
    },
    throughput: 400
  },
  {
    id: 'shard-types',
    partitionKey: '/tenantId',
    defaultTtl: -1,
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/schema/*' },
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/isActive', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/name', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/parentShardTypeId', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/isBuiltIn', order: 'ascending' as const }
        ]
      ]
    },
    throughput: 400
  },
  {
    id: 'revisions',
    partitionKey: '/tenantId',
    defaultTtl: 7776000, // 90 days
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/data/*' },
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/shardId', order: 'ascending' as const },
          { path: '/revisionNumber', order: 'descending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/shardId', order: 'ascending' as const },
          { path: '/timestamp', order: 'descending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/changeType', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/isMilestone', order: 'ascending' as const }
        ]
      ]
    },
    throughput: 400
  },
  {
    id: 'prompts',
    partitionKey: '/tenantId',
    defaultTtl: -1,
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/slug', order: 'ascending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const },
          { path: '/version', order: 'descending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/createdAt', order: 'descending' as const }
        ]
      ]
    },
    throughput: 400
  },
  {
    id: 'embedding-jobs',
    partitionKey: '/tenantId',
    defaultTtl: -1,
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/_etag/?' }
      ],
      compositeIndexes: [
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/status', order: 'ascending' as const },
          { path: '/createdAt', order: 'descending' as const }
        ],
        [
          { path: '/tenantId', order: 'ascending' as const },
          { path: '/shardId', order: 'ascending' as const },
          { path: '/updatedAt', order: 'descending' as const }
        ]
      ]
    },
    throughput: 400
  },
  {
    id: 'leases',
    partitionKey: '/id',
    defaultTtl: -1,
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent' as const,
      includedPaths: [
        { path: '/*' }
      ],
      excludedPaths: [
        { path: '/_etag/?' }
      ],
      compositeIndexes: []
    },
    throughput: 400
  }
];

/**
 * Initialize database and containers
 */
async function initializeDatabase() {
  console.log('🚀 Starting database initialization...\n');

  // Validate environment variables
  if (!ENDPOINT || !KEY) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   Please set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY');
    process.exit(1);
  }

  try {
    // Initialize Cosmos DB client
    const client = new CosmosClient({ endpoint: ENDPOINT, key: KEY });
    console.log(`✅ Connected to Cosmos DB: ${ENDPOINT}\n`);

    // Create or get database
    console.log(`📦 Creating database: ${DATABASE_NAME}`);
    const { database } = await client.databases.createIfNotExists({
      id: DATABASE_NAME
    });
    console.log(`✅ Database ready: ${DATABASE_NAME}\n`);

    // Create containers
    for (const containerConfig of CONTAINERS) {
      console.log(`📦 Creating container: ${containerConfig.id}`);
      console.log(`   Partition key: ${containerConfig.partitionKey}`);
      console.log(`   Throughput: ${containerConfig.throughput} RU/s`);

      if (containerConfig.defaultTtl > 0) {
        console.log(`   TTL: ${containerConfig.defaultTtl} seconds (${containerConfig.defaultTtl / 86400} days)`);
      }

      try {
        await database.containers.createIfNotExists({
          id: containerConfig.id,
          partitionKey: containerConfig.partitionKey,
          defaultTtl: containerConfig.defaultTtl,
          indexingPolicy: containerConfig.indexingPolicy as any,
          throughput: containerConfig.throughput
        });

        console.log(`✅ Container ready: ${containerConfig.id}`);

        // Log composite indexes
        if (containerConfig.indexingPolicy.compositeIndexes &&
          containerConfig.indexingPolicy.compositeIndexes.length > 0) {
          console.log(`   Composite indexes: ${containerConfig.indexingPolicy.compositeIndexes.length}`);
        }

        // Log vector indexes
        if ((containerConfig.indexingPolicy as any).vectorIndexes) {
          console.log(`   Vector indexes: Enabled for embeddings`);
        }

        console.log('');
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`ℹ️  Container already exists: ${containerConfig.id}\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Database initialization completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Database: ${DATABASE_NAME}`);
    console.log(`   Containers: ${CONTAINERS.length}`);
    console.log(`   Total provisioned throughput: ${CONTAINERS.reduce((sum, c) => sum + c.throughput, 0)} RU/s\n`);

    console.log('📝 Next steps:');
    console.log('   1. Run seed script: npm run db:seed');
    console.log('   2. Start services: npm run dev\n');

  } catch (error: any) {
    console.error('❌ Error during database initialization:', error.message);
    if (error.body) {
      console.error('   Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { initializeDatabase };
export { CONTAINERS };
