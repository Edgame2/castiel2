#!/usr/bin/env tsx
/**
 * Seed Cosmos DB with test data for User Management testing
 */

import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomBytes } from 'crypto';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const config = {
  endpoint: process.env.COSMOS_DB_ENDPOINT!,
  key: process.env.COSMOS_DB_KEY!,
  database: process.env.COSMOS_DB_DATABASE || 'castiel',
  usersContainer: process.env.COSMOS_DB_USERS_CONTAINER || 'users',
  tenantsContainer: 'tenants',
};

// Test tenant ID (use this in frontend localStorage)
const TEST_TENANT_ID = 'test-tenant-123';

async function seedCosmosDb() {
  console.log('🌱 Seeding Cosmos DB with test data...\n');

  const client = new CosmosClient({
    endpoint: config.endpoint,
    key: config.key,
  });

  const database = client.database(config.database);
  const usersContainer = database.container(config.usersContainer);
  const tenantsContainer = database.container(config.tenantsContainer);

  try {
    // Create test tenant
    console.log('Creating test tenant...');
    const tenant = {
      id: TEST_TENANT_ID,
      name: 'Test Organization',
      domain: 'test.example.com',
      status: 'active',
      settings: {
        allowSignup: true,
        requireEmailVerification: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await tenantsContainer.items.upsert(tenant);
    console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})\n`);

    // Create test users with different statuses
    console.log('Creating test users...');

    const testUsers = [
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        roles: ['admin', 'user'],
        status: 'active',
        emailVerified: true,
        isEmailVerified: true,
        metadata: {
          department: 'IT',
          jobTitle: 'System Administrator',
        },
        createdAt: new Date('2025-01-01').toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'john.doe@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['user', 'developer'],
        status: 'active',
        emailVerified: true,
        isEmailVerified: true,
        metadata: {
          department: 'Engineering',
          jobTitle: 'Senior Developer',
        },
        createdAt: new Date('2025-01-15').toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date('2025-11-18').toISOString(),
      },
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'jane.smith@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: ['user'],
        status: 'inactive',
        emailVerified: true,
        isEmailVerified: true,
        metadata: {
          department: 'Sales',
          jobTitle: 'Account Manager',
        },
        createdAt: new Date('2025-02-01').toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date('2025-10-15').toISOString(),
      },
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'suspended@test.com',
        firstName: 'Suspended',
        lastName: 'User',
        roles: ['user'],
        status: 'suspended',
        emailVerified: true,
        isEmailVerified: true,
        metadata: {
          department: 'Operations',
          suspensionReason: 'Policy violation',
        },
        createdAt: new Date('2025-03-01').toISOString(),
        updatedAt: new Date().toISOString(),
        suspendedAt: new Date('2025-11-01').toISOString(),
      },
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'pending@test.com',
        firstName: 'Pending',
        lastName: 'Invite',
        roles: ['user'],
        status: 'pending',
        emailVerified: false,
        isEmailVerified: false,
        invitationToken: randomUUID(),
        invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'deleted@test.com',
        firstName: 'Deleted',
        lastName: 'User',
        roles: ['user'],
        status: 'deleted',
        emailVerified: true,
        isEmailVerified: true,
        deletedAt: new Date('2025-10-01').toISOString(),
        createdAt: new Date('2025-05-01').toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Additional active users for pagination testing
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'alice@test.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        roles: ['user', 'manager'],
        status: 'active',
        emailVerified: true,
        isEmailVerified: true,
        metadata: {
          department: 'Marketing',
          jobTitle: 'Marketing Manager',
        },
        createdAt: new Date('2025-04-10').toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date('2025-11-19').toISOString(),
      },
      {
        id: randomUUID(),
        tenantId: TEST_TENANT_ID,
        email: 'bob@test.com',
        firstName: 'Bob',
        lastName: 'Williams',
        roles: ['user'],
        status: 'active',
        emailVerified: true,
        isEmailVerified: true,
        metadata: {
          department: 'HR',
          jobTitle: 'HR Specialist',
        },
        createdAt: new Date('2025-06-01').toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date('2025-11-17').toISOString(),
      },
    ];

    for (const user of testUsers) {
      await usersContainer.items.upsert(user);
      console.log(`✅ User created: ${user.email} (${user.status})`);
    }

    console.log('\n✨ Seeding complete!\n');
    console.log('Test data summary:');
    console.log(`  Tenant ID: ${TEST_TENANT_ID}`);
    console.log(`  Total users: ${testUsers.length}`);
    console.log(`  Active: ${testUsers.filter(u => u.status === 'active').length}`);
    console.log(`  Inactive: ${testUsers.filter(u => u.status === 'inactive').length}`);
    console.log(`  Suspended: ${testUsers.filter(u => u.status === 'suspended').length}`);
    console.log(`  Pending: ${testUsers.filter(u => u.status === 'pending').length}`);
    console.log(`  Deleted: ${testUsers.filter(u => u.status === 'deleted').length}`);

    console.log('\n🔑 Set tenant ID in browser:');
    console.log(`  localStorage.setItem('tenantId', '${TEST_TENANT_ID}')`);
    console.log('\n📝 Test credentials:');
    console.log('  admin@test.com - Admin user');
    console.log('  john.doe@test.com - Developer');
    console.log('  jane.smith@test.com - Inactive user');

  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run seeding
seedCosmosDb();
