#!/usr/bin/env ts-node
/**
 * Database Seed Script
 * 
 * This script populates the Cosmos DB database with sample data for development
 * and testing purposes.
 * 
 * Usage:
 *   npm run db:seed
 * 
 * Or directly:
 *   ts-node scripts/seed-database.ts
 * 
 * Prerequisites:
 *   - Database initialized (run npm run db:init first)
 *   - Environment variables set (COSMOS_DB_ENDPOINT, COSMOS_DB_KEY)
 */

import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const ENDPOINT = process.env.COSMOS_DB_ENDPOINT || '';
const KEY = process.env.COSMOS_DB_KEY || '';
const DATABASE_NAME = process.env.COSMOS_DB_DATABASE || 'castiel';

// Sample tenant ID (for development)
const SAMPLE_TENANT_ID = 'tenant-demo-001';
const SAMPLE_USER_ID = 'user-admin-001';

// Sample data
const SAMPLE_USERS = [
  {
    id: SAMPLE_USER_ID,
    tenantId: SAMPLE_TENANT_ID,
    email: 'admin@demo.castiel.com',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$...',  // Placeholder
    status: 'ACTIVE',
    emailVerified: true,
    roles: ['admin', 'user'],
    organizationId: null,
    providers: [
      {
        provider: 'email',
        providerId: 'admin@demo.castiel.com',
        connectedAt: new Date().toISOString()
      }
    ],
    metadata: {
      firstName: 'Admin',
      lastName: 'User',
      preferences: {
        theme: 'light',
        notifications: true
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-demo-002',
    tenantId: SAMPLE_TENANT_ID,
    email: 'user@demo.castiel.com',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$...',  // Placeholder
    status: 'ACTIVE',
    emailVerified: true,
    roles: ['user'],
    organizationId: null,
    providers: [
      {
        provider: 'email',
        providerId: 'user@demo.castiel.com',
        connectedAt: new Date().toISOString()
      }
    ],
    metadata: {
      firstName: 'Demo',
      lastName: 'User',
      preferences: {
        theme: 'dark',
        notifications: false
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const SAMPLE_SHARD_TYPES = [
  {
    id: 'shardtype-document-001',
    tenantId: SAMPLE_TENANT_ID,
    name: 'document',
    displayName: 'Document',
    description: 'General document type with title, content, and tags',
    version: 1,
    isActive: true,
    isBuiltIn: true,
    parentShardTypeId: null,
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 500
        },
        content: {
          type: 'string'
        },
        author: {
          type: 'string'
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        metadata: {
          type: 'object',
          properties: {
            wordCount: { type: 'number' },
            readingTime: { type: 'number' }
          }
        }
      },
      required: ['title', 'content']
    },
    metadata: {
      createdBy: SAMPLE_USER_ID,
      icon: '📄'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'shardtype-contact-001',
    tenantId: SAMPLE_TENANT_ID,
    name: 'contact',
    displayName: 'Contact',
    description: 'Contact information with name, email, phone',
    version: 1,
    isActive: true,
    isBuiltIn: true,
    parentShardTypeId: null,
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1
        },
        lastName: {
          type: 'string',
          minLength: 1
        },
        email: {
          type: 'string',
          format: 'email'
        },
        phone: {
          type: 'string'
        },
        company: {
          type: 'string'
        },
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            country: { type: 'string' }
          }
        }
      },
      required: ['firstName', 'lastName', 'email']
    },
    metadata: {
      createdBy: SAMPLE_USER_ID,
      icon: '👤'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const SAMPLE_SHARDS = [
  {
    id: 'shard-demo-001',
    tenantId: SAMPLE_TENANT_ID,
    shardTypeId: 'shardtype-document-001',
    status: 'active',
    structuredData: {
      title: 'Welcome to Castiel API',
      content: 'This is a sample document in the Castiel system. Castiel is an enterprise-grade B2B SaaS platform with multi-tenant data management, advanced authentication, vector search, and AI enrichment capabilities.',
      author: 'Admin User',
      tags: ['demo', 'welcome', 'documentation'],
      metadata: {
        wordCount: 35,
        readingTime: 1
      }
    },
    unstructuredData: {
      text: 'Additional unstructured content can be stored here for full-text search and vectorization.',
      files: []
    },
    vectors: [],  // Will be populated by vectorization service
    acl: [
      {
        userId: SAMPLE_USER_ID,
        permissions: ['READ', 'WRITE', 'ADMIN'],
        grantedBy: SAMPLE_USER_ID,
        grantedAt: new Date().toISOString()
      }
    ],
    enrichment: {
      enabled: false,
      lastEnrichedAt: null
    },
    metadata: {
      version: 1,
      tags: ['demo', 'sample'],
      category: 'documentation'
    },
    revisionId: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: SAMPLE_USER_ID,
    updatedBy: SAMPLE_USER_ID
  },
  {
    id: 'shard-demo-002',
    tenantId: SAMPLE_TENANT_ID,
    shardTypeId: 'shardtype-contact-001',
    status: 'active',
    structuredData: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      company: 'Acme Corporation',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'USA'
      }
    },
    unstructuredData: {
      text: 'Senior Software Engineer with 10 years of experience in cloud architecture.',
      files: []
    },
    vectors: [],
    acl: [
      {
        userId: SAMPLE_USER_ID,
        permissions: ['READ', 'WRITE', 'ADMIN'],
        grantedBy: SAMPLE_USER_ID,
        grantedAt: new Date().toISOString()
      }
    ],
    enrichment: {
      enabled: false,
      lastEnrichedAt: null
    },
    metadata: {
      version: 1,
      tags: ['contact', 'sample'],
      category: 'crm'
    },
    revisionId: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: SAMPLE_USER_ID,
    updatedBy: SAMPLE_USER_ID
  }
];

/**
 * Seed database with sample data
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  // Validate environment variables
  if (!ENDPOINT || !KEY) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   Please set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY');
    process.exit(1);
  }

  try {
    // Initialize Cosmos DB client
    const client = new CosmosClient({ endpoint: ENDPOINT, key: KEY });
    const database = client.database(DATABASE_NAME);

    console.log(`✅ Connected to database: ${DATABASE_NAME}\n`);

    // Seed users
    console.log('👤 Seeding users...');
    const usersContainer = database.container('users');
    for (const user of SAMPLE_USERS) {
      try {
        await usersContainer.items.create(user);
        console.log(`   ✅ Created user: ${user.email}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`   ℹ️  User already exists: ${user.email}`);
        } else {
          throw error;
        }
      }
    }
    console.log('');

    // Seed shard types
    console.log('📋 Seeding shard types...');
    const shardTypesContainer = database.container('shard-types');
    for (const shardType of SAMPLE_SHARD_TYPES) {
      try {
        await shardTypesContainer.items.create(shardType);
        console.log(`   ✅ Created shard type: ${shardType.displayName}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`   ℹ️  Shard type already exists: ${shardType.displayName}`);
        } else {
          throw error;
        }
      }
    }
    console.log('');

    // Seed shards
    console.log('📦 Seeding shards...');
    const shardsContainer = database.container('shards');
    for (const shard of SAMPLE_SHARDS) {
      try {
        await shardsContainer.items.create(shard);
        console.log(`   ✅ Created shard: ${shard.structuredData.title || shard.id}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`   ℹ️  Shard already exists: ${shard.id}`);
        } else {
          throw error;
        }
      }
    }
    console.log('');

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Tenant: ${SAMPLE_TENANT_ID}`);
    console.log(`   Users: ${SAMPLE_USERS.length}`);
    console.log(`   Shard Types: ${SAMPLE_SHARD_TYPES.length}`);
    console.log(`   Shards: ${SAMPLE_SHARDS.length}\n`);

    console.log('📝 Sample credentials:');
    console.log(`   Email: admin@demo.castiel.com`);
    console.log(`   Password: (set during registration)\n`);

    console.log('📝 Next steps:');
    console.log('   1. Start main-api: cd services/main-api && pnpm dev');
    console.log('   2. Start frontend: cd services/frontend && pnpm dev');
    console.log('   3. Test the API at http://localhost:3001\n');

  } catch (error: any) {
    console.error('❌ Error during database seeding:', error.message);
    if (error.body) {
      console.error('   Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedDatabase };
