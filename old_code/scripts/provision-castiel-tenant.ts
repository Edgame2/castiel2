#!/usr/bin/env tsx
import { CosmosClient, Container } from '@azure/cosmos';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_EMAIL = (process.env.CASTIEL_ADMIN_EMAIL || 'admin@admin.com').toLowerCase();
const TENANT_NAME = process.env.CASTIEL_TENANT_NAME || 'Castiel';
const TENANT_SLUG = process.env.CASTIEL_TENANT_SLUG || 'castiel';
const TENANT_DOMAIN = process.env.CASTIEL_TENANT_DOMAIN || 'castiel.local';
const TENANT_REGION = process.env.CASTIEL_TENANT_REGION || 'us-east';
const DEFAULT_ROLES = ['super-admin', 'admin', 'user'];

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

    console.log('🚀 Provisioning Castiel tenant and admin user...');
    const client = new CosmosClient({ endpoint: cosmosConfig.endpoint!, key: cosmosConfig.key! });
    const database = client.database(cosmosConfig.database);
    const tenantsContainer = database.container(cosmosConfig.tenantsContainer);
    const usersContainer = database.container(cosmosConfig.usersContainer);

    const tenant = await ensureTenantDocument(tenantsContainer);
    console.log(`🏢 Tenant ready: ${tenant.name} (${tenant.id})`);

    const memberships = await findMemberships(usersContainer, ADMIN_EMAIL);
    const { user, cloned } = await ensureTenantMembership(usersContainer, tenant, memberships);
    const updatedUser = await promoteUserToSuperAdmin(usersContainer, tenant.id, user, memberships);
    await ensureTenantAdminLink(tenantsContainer, tenant, updatedUser.id);

    console.log('\n✨ Provisioning complete!');
    console.log(`   Tenant ID: ${tenant.id}`);
    console.log(`   Admin user ID: ${updatedUser.id}`);
    console.log(`   Default tenant set to: ${tenant.id}`);
    if (cloned) {
      console.log('   Note: Account was cloned into the Castiel tenant; password matches the source record.');
    }
  } catch (error) {
    console.error('❌ Failed to provision Castiel tenant:', error instanceof Error ? error.message : error);
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

  console.log('🛠️ Creating Castiel tenant...');
  const now = new Date().toISOString();
  const tenantId = randomBytes(16).toString('hex');
  const newTenant: TenantDocument = {
    id: tenantId,
    slug: TENANT_SLUG,
    name: TENANT_NAME,
    domain: TENANT_DOMAIN,
    plan: 'enterprise',
    status: 'active',
    settings: {
      branding: { primaryColor: '#4F46E5' },
      auth: { sessionDuration: 60 * 60 * 12 },
      mfaPolicy: {
        enforcement: 'optional',
        gracePeriodDays: 14,
        allowedMethods: ['totp', 'sms', 'email'],
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
    return { user: existing, cloned: false };
  }

  if (memberships.length === 0) {
    throw new Error(
      `User ${ADMIN_EMAIL} was not found in Cosmos DB. Create the account via /auth/register or activate-admin-user.ts before running this script.`,
    );
  }

  console.log('🔁 Cloning admin user into Castiel tenant...');
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
    roles: Array.from(new Set([...(template.roles || []), ...DEFAULT_ROLES])),
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

async function promoteUserToSuperAdmin(
  usersContainer: Container,
  tenantId: string,
  user: UserDocument,
  memberships: UserDocument[],
): Promise<UserDocument> {
  const { resource } = await usersContainer.item(user.id, tenantId).read<UserDocument>();
  if (!resource) {
    throw new Error('Unable to load admin user record for update.');
  }

  const now = new Date().toISOString();
  const updatedRoles = Array.from(new Set([...(resource.roles || []), ...DEFAULT_ROLES]));
  const tenantIds = Array.from(new Set([...(resource.tenantIds || []), tenantId]));

  const updatedDoc = {
    ...sanitizeCosmosDocument(resource),
    status: 'active',
    emailVerified: true,
    isSuperAdmin: true,
    isDefaultTenant: true,
    activeTenantId: tenantId,
    tenantIds,
    roles: updatedRoles,
    pendingTenantId: undefined,
    updatedAt: now,
  } satisfies UserDocument;

  const { resource: saved } = await usersContainer.item(user.id, tenantId).replace(updatedDoc);
  if (!saved) {
    throw new Error('Failed to persist admin role updates.');
  }

  await ensureDefaultTenantFlag(usersContainer, tenantId, memberships);
  return saved;
}

async function ensureDefaultTenantFlag(
  usersContainer: Container,
  defaultTenantId: string,
  memberships: UserDocument[],
): Promise<void> {
  const now = new Date().toISOString();
  for (const membership of memberships) {
    const shouldBeDefault = membership.tenantId === defaultTenantId;
    if (!!membership.isDefaultTenant === shouldBeDefault) {
      continue;
    }

    const doc = await usersContainer.item(membership.id, membership.tenantId).read<UserDocument>();
    if (!doc.resource) {
      continue;
    }

    const updated = {
      ...sanitizeCosmosDocument(doc.resource),
      isDefaultTenant: shouldBeDefault,
      updatedAt: now,
    } satisfies UserDocument;

    await usersContainer.item(membership.id, membership.tenantId).replace(updated);
  }
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
}

function sanitizeCosmosDocument<T extends Record<string, any>>(doc: T): T {
  // Remove Cosmos-specific metadata fields that cannot be persisted during replace operations.
  const { _rid, _self, _etag, _attachments, _ts, ...rest } = doc as Record<string, any>;
  return rest as T;
}

main();
