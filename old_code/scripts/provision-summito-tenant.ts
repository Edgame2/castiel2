#!/usr/bin/env tsx
import { CosmosClient, Container } from '@azure/cosmos';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_EMAIL = 'admin@admin.com';
const TENANT_NAME = 'Summito';
const TENANT_SLUG = 'summito';
const TENANT_DOMAIN = 'summito.com';
const TENANT_REGION = 'us-east';
const DEFAULT_ROLES = ['admin', 'user'];

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
  domain?: string;
  status: string;
  plan?: string;
  settings?: Record<string, any>;
  adminUserIds?: string[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    activatedAt?: string;
    adminContactEmail?: string;
    region?: string;
  };
  partitionKey: string;
}

type UserDocument = {
  id: string;
  tenantId: string;
  email: string;
  roles?: string[];
  status: string;
  emailVerified?: boolean;
  isDefaultTenant?: boolean;
  isSuperAdmin?: boolean;
  activeTenantId?: string;
  tenantIds?: string[];
  linkedTenantIds?: string[];
  pendingTenantId?: string;
  metadata?: Record<string, any>;
  partitionKey: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
} & Record<string, any>;

async function main() {
  try {
    validateCosmosConfig();

    console.log('🚀 Provisioning Summito tenant...');
    const client = new CosmosClient({ endpoint: cosmosConfig.endpoint!, key: cosmosConfig.key! });
    const database = client.database(cosmosConfig.database);
    const tenantsContainer = database.container(cosmosConfig.tenantsContainer);
    const usersContainer = database.container(cosmosConfig.usersContainer);

    // Step 1: Verify admin@admin.com is a super admin
    console.log('\n📋 Checking admin user status...');
    const memberships = await findMemberships(usersContainer, ADMIN_EMAIL);
    
    if (memberships.length === 0) {
      throw new Error(`User ${ADMIN_EMAIL} not found in the database.`);
    }

    const superAdminMembership = memberships.find(m => m.isSuperAdmin === true);
    if (superAdminMembership) {
      console.log(`✅ ${ADMIN_EMAIL} is a Super Admin (tenant: ${superAdminMembership.tenantId})`);
      console.log(`   Roles: ${superAdminMembership.roles?.join(', ') || 'none'}`);
    } else {
      console.log(`⚠️  ${ADMIN_EMAIL} is NOT marked as Super Admin in any tenant`);
      console.log('   Checking roles across memberships:');
      memberships.forEach(m => {
        console.log(`   - Tenant ${m.tenantId}: roles = ${m.roles?.join(', ') || 'none'}, isSuperAdmin = ${m.isSuperAdmin}`);
      });
    }

    // Step 2: Create Summito tenant
    const tenant = await ensureTenantDocument(tenantsContainer);
    console.log(`\n🏢 Tenant ready: ${tenant.name} (${tenant.id})`);

    // Step 3: Create membership for admin in Summito tenant
    const { user, cloned } = await ensureTenantMembership(usersContainer, tenant, memberships);
    
    // Step 4: Make user an admin of Summito
    const updatedUser = await makeUserTenantAdmin(usersContainer, tenant.id, user);
    
    // Step 5: Link user to tenant's adminUserIds
    await ensureTenantAdminLink(tenantsContainer, tenant, updatedUser.id);

    console.log('\n✨ Provisioning complete!');
    console.log(`   Tenant Name: ${tenant.name}`);
    console.log(`   Tenant ID: ${tenant.id}`);
    console.log(`   Tenant Slug: ${tenant.slug}`);
    console.log(`   Admin user ID: ${updatedUser.id}`);
    console.log(`   Admin roles in Summito: ${updatedUser.roles?.join(', ')}`);
    if (cloned) {
      console.log('   Note: Account was cloned into the Summito tenant.');
    }

    // Final verification
    console.log('\n📊 Final verification:');
    const finalMemberships = await findMemberships(usersContainer, ADMIN_EMAIL);
    const summitoMembership = finalMemberships.find(m => m.tenantId === tenant.id);
    const superAdmin = finalMemberships.find(m => m.isSuperAdmin === true);
    
    console.log(`   Total memberships for ${ADMIN_EMAIL}: ${finalMemberships.length}`);
    console.log(`   Is Super Admin: ${superAdmin ? 'YES' : 'NO'}`);
    console.log(`   Is Summito Admin: ${summitoMembership?.roles?.includes('admin') ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Failed to provision Summito tenant:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function validateCosmosConfig() {
  if (!cosmosConfig.endpoint || !cosmosConfig.key) {
    throw new Error('Missing COSMOS_DB_ENDPOINT or COSMOS_DB_KEY environment variables.');
  }
}

async function ensureTenantDocument(tenantsContainer: Container): Promise<TenantDocument> {
  const existing = await findTenantBySlug(tenantsContainer, TENANT_SLUG);
  if (existing) {
    console.log('ℹ️  Summito tenant already exists, updating if needed...');
    let requiresUpdate = false;
    if (existing.status !== 'active') {
      existing.status = 'active';
      requiresUpdate = true;
    }
    if (!existing.partitionKey) {
      existing.partitionKey = existing.id;
      requiresUpdate = true;
    }
    if (!existing.metadata) {
      existing.metadata = {};
      requiresUpdate = true;
    }

    if (requiresUpdate) {
      existing.metadata!.updatedAt = new Date().toISOString();
      await tenantsContainer.item(existing.id, existing.partitionKey).replace(existing);
    }

    return existing;
  }

  console.log('🛠️ Creating Summito tenant...');
  const now = new Date().toISOString();
  const tenantId = randomBytes(16).toString('hex');
  const newTenant: TenantDocument = {
    id: tenantId,
    slug: TENANT_SLUG,
    name: TENANT_NAME,
    domain: TENANT_DOMAIN,
    plan: 'professional',
    status: 'active',
    settings: {
      branding: { primaryColor: '#10B981' },
      auth: { sessionDuration: 60 * 60 * 8 },
      features: {
        advancedSearch: true,
        aiEnrichment: true,
      },
    },
    adminUserIds: [],
    metadata: {
      createdAt: now,
      updatedAt: now,
      activatedAt: now,
      adminContactEmail: ADMIN_EMAIL,
      region: TENANT_REGION,
    },
    partitionKey: tenantId,
  };

  await tenantsContainer.items.create(newTenant);
  return newTenant;
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

async function findMemberships(usersContainer: Container, email: string): Promise<UserDocument[]> {
  const { resources } = await usersContainer.items
    .query<UserDocument>({
      query: 'SELECT * FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: email.toLowerCase() }],
    })
    .fetchAll();

  return resources || [];
}

async function ensureTenantMembership(
  usersContainer: Container,
  tenant: TenantDocument,
  memberships: UserDocument[],
): Promise<{ user: UserDocument; cloned: boolean }> {
  const existing = memberships.find((membership) => membership.tenantId === tenant.id);
  if (existing) {
    console.log('ℹ️  User already has membership in Summito tenant');
    return { user: existing, cloned: false };
  }

  if (memberships.length === 0) {
    throw new Error(
      `User ${ADMIN_EMAIL} was not found in Cosmos DB. Create the account first.`,
    );
  }

  console.log('🔁 Creating membership for admin user in Summito tenant...');
  const template = sanitizeCosmosDocument(memberships[0]);
  const now = new Date().toISOString();
  const cloned: UserDocument = {
    ...template,
    id: randomBytes(16).toString('hex'),
    tenantId: tenant.id,
    partitionKey: tenant.id,
    activeTenantId: tenant.id,
    isDefaultTenant: false,
    isSuperAdmin: template.isSuperAdmin ?? false,
    status: template.emailVerified ? 'active' : 'pending_verification',
    roles: [...DEFAULT_ROLES],
    tenantIds: [tenant.id],
    linkedTenantIds: Array.from(new Set([...(template.linkedTenantIds || []), template.tenantId])),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: undefined,
    pendingTenantId: undefined,
  };

  await usersContainer.items.create(cloned);
  memberships.push(cloned);
  return { user: cloned, cloned: true };
}

async function makeUserTenantAdmin(
  usersContainer: Container,
  tenantId: string,
  user: UserDocument,
): Promise<UserDocument> {
  const { resource } = await usersContainer.item(user.id, tenantId).read<UserDocument>();
  if (!resource) {
    throw new Error('Unable to load user record for update.');
  }

  const now = new Date().toISOString();
  const updatedRoles = Array.from(new Set([...(resource.roles || []), ...DEFAULT_ROLES]));
  const tenantIds = Array.from(new Set([...(resource.tenantIds || []), tenantId]));

  const updatedDoc = {
    ...sanitizeCosmosDocument(resource),
    status: 'active',
    emailVerified: true,
    tenantIds,
    roles: updatedRoles,
    updatedAt: now,
  } satisfies UserDocument;

  const { resource: saved } = await usersContainer.item(user.id, tenantId).replace(updatedDoc);
  if (!saved) {
    throw new Error('Failed to persist admin role updates.');
  }

  return saved;
}

async function ensureTenantAdminLink(
  tenantsContainer: Container,
  tenant: TenantDocument,
  userId: string,
): Promise<void> {
  const { resource } = await tenantsContainer.item(tenant.id, tenant.partitionKey).read<TenantDocument>();
  if (!resource) {
    throw new Error('Unable to load tenant document for admin update.');
  }

  const adminUserIds = resource.adminUserIds || [];
  if (adminUserIds.includes(userId)) {
    console.log('ℹ️  User already linked as tenant admin');
    return;
  }

  adminUserIds.push(userId);
  const updatedTenant: TenantDocument = {
    ...resource,
    adminUserIds,
    metadata: {
      ...(resource.metadata || {}),
      updatedAt: new Date().toISOString(),
      activatedAt: resource.metadata?.activatedAt || new Date().toISOString(),
    },
  };

  await tenantsContainer.item(resource.id, resource.partitionKey).replace(updatedTenant);
  console.log('✅ User linked as Summito tenant admin');
}

function sanitizeCosmosDocument<T extends Record<string, any>>(doc: T): T {
  const { _rid, _self, _etag, _attachments, _ts, ...rest } = doc as Record<string, any>;
  return rest as T;
}

main();











