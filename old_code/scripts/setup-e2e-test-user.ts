#!/usr/bin/env tsx
/**
 * E2E Test User Setup Script
 * Creates a test user with known credentials for E2E testing.
 * Run this before running E2E tests.
 */
import { CosmosClient, Container } from '@azure/cosmos';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Test user credentials - used in E2E tests
const TEST_USER = {
  email: 'e2e-test@castiel.local',
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'TestUser',
};

const TENANT_SLUG = 'castiel';

const cosmosConfig = {
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
  database: process.env.COSMOS_DB_DATABASE || 'castiel',
  usersContainer: process.env.COSMOS_DB_USERS_CONTAINER || 'users',
  tenantsContainer: process.env.COSMOS_DB_TENANTS_CONTAINER || 'tenants',
};

interface TenantDocument {
  id: string;
  slug: string;
  name: string;
  partitionKey: string;
}

interface UserDocument {
  id: string;
  tenantId: string;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status: string;
  emailVerified: boolean;
  isDefaultTenant: boolean;
  isSuperAdmin: boolean;
  partitionKey: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hash password using argon2 (matching the auth service)
 */
async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  try {
    if (!cosmosConfig.endpoint || !cosmosConfig.key) {
      throw new Error('Missing COSMOS_DB_ENDPOINT or COSMOS_DB_KEY environment variables.');
    }

    console.log('🧪 Setting up E2E test user...');
    
    const client = new CosmosClient({ endpoint: cosmosConfig.endpoint, key: cosmosConfig.key });
    const database = client.database(cosmosConfig.database);
    const tenantsContainer = database.container(cosmosConfig.tenantsContainer);
    const usersContainer = database.container(cosmosConfig.usersContainer);

    // Find the Castiel tenant
    const tenant = await findTenantBySlug(tenantsContainer, TENANT_SLUG);
    if (!tenant) {
      throw new Error(`Tenant '${TENANT_SLUG}' not found. Run provision-castiel-tenant.ts first.`);
    }

    console.log(`📦 Found tenant: ${tenant.name} (${tenant.id})`);

    // Check if test user already exists
    const existingUser = await findUserByEmail(usersContainer, TEST_USER.email, tenant.id);
    
    if (existingUser) {
      console.log('📝 Test user already exists, updating password...');
      await updateUserPassword(usersContainer, existingUser, TEST_USER.password);
    } else {
      console.log('🆕 Creating test user...');
      await createTestUser(usersContainer, tenant, TEST_USER);
    }

    console.log('\n✅ E2E test user setup complete!');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log(`   Tenant: ${tenant.name}`);
  } catch (error) {
    console.error('❌ Failed to setup E2E test user:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function findTenantBySlug(container: Container, slug: string): Promise<TenantDocument | null> {
  const { resources } = await container.items
    .query<TenantDocument>({
      query: 'SELECT * FROM c WHERE c.slug = @slug',
      parameters: [{ name: '@slug', value: slug }],
    })
    .fetchAll();
  return resources[0] || null;
}

async function findUserByEmail(
  container: Container, 
  email: string, 
  tenantId: string
): Promise<UserDocument | null> {
  const { resources } = await container.items
    .query<UserDocument>({
      query: 'SELECT * FROM c WHERE c.email = @email AND c.tenantId = @tenantId',
      parameters: [
        { name: '@email', value: email.toLowerCase() },
        { name: '@tenantId', value: tenantId },
      ],
    })
    .fetchAll();
  return resources[0] || null;
}

async function updateUserPassword(
  container: Container, 
  user: UserDocument, 
  password: string
): Promise<void> {
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  
  // Remove Cosmos metadata
  const { _rid, _self, _etag, _attachments, _ts, ...cleanUser } = user as any;
  
  const updatedUser: UserDocument = {
    ...cleanUser,
    passwordHash,
    roles: ['super-admin', 'admin', 'owner', 'user'], // Ensure full admin access
    status: 'active',
    emailVerified: true,
    isSuperAdmin: true,
    updatedAt: now,
  };

  await container.item(user.id, user.tenantId).replace(updatedUser);
}

async function createTestUser(
  container: Container, 
  tenant: TenantDocument, 
  userData: typeof TEST_USER
): Promise<void> {
  const now = new Date().toISOString();
  const userId = randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(userData.password);

  const newUser: UserDocument = {
    id: userId,
    tenantId: tenant.id,
    email: userData.email.toLowerCase(),
    passwordHash,
    firstName: userData.firstName,
    lastName: userData.lastName,
    roles: ['super-admin', 'admin', 'owner', 'user'], // Full admin access for E2E testing
    status: 'active',
    emailVerified: true,
    isDefaultTenant: true,
    isSuperAdmin: true, // Super admin for tenant management tests
    partitionKey: tenant.id,
    createdAt: now,
    updatedAt: now,
  };

  await container.items.create(newUser);
}

main();

