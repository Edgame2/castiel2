/**
 * Seed script: add Google Workspace to the integration catalog.
 * Run from integration-manager root: pnpm exec tsx scripts/seed-google-workspace.ts
 * Requires COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, COSMOS_DB_DATABASE_ID (or defaults from config).
 */

import { initializeDatabase, connectDatabase, disconnectDatabase, getContainer } from '@coder/shared';
import { loadConfig } from '../src/config';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_WORKSPACE_CATALOG_ENTRY = {
  integrationId: 'google_workspace',
  name: 'google_workspace',
  displayName: 'Google Workspace',
  description: 'Sync Calendar, Drive, and Gmail with domain-wide delegation (service account).',
  category: 'workspace',
  provider: 'google_workspace',
  icon: 'plug',
  color: '#4285F4',
  visibility: 'public' as const,
  authMethods: ['serviceaccount'],
  supportedEntities: ['Event', 'Calendar', 'Document', 'File', 'Email', 'Message'],
  webhookSupport: false,
  status: 'active' as const,
  createdBy: 'seed-google-workspace',
  shardMappings: [
    { integrationEntity: 'Event', supportedShardTypes: ['calendarevent'], defaultShardType: 'calendarevent', bidirectionalSync: false, description: 'Calendar events' },
    { integrationEntity: 'Calendar', supportedShardTypes: ['calendarevent'], defaultShardType: 'calendarevent', bidirectionalSync: false },
    { integrationEntity: 'Document', supportedShardTypes: ['document'], defaultShardType: 'document', bidirectionalSync: false, description: 'Drive files' },
    { integrationEntity: 'File', supportedShardTypes: ['document'], defaultShardType: 'document', bidirectionalSync: false },
    { integrationEntity: 'Email', supportedShardTypes: ['email'], defaultShardType: 'email', bidirectionalSync: false, description: 'Gmail messages' },
    { integrationEntity: 'Message', supportedShardTypes: ['email'], defaultShardType: 'email', bidirectionalSync: false },
  ],
  rateLimit: { requestsPerMinute: 60, requestsPerHour: 3000 },
};

async function main(): Promise<void> {
  const config = loadConfig();
  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: config.cosmos_db.containers as Record<string, string> | undefined,
  });
  await connectDatabase();

  const container = getContainer('integration_catalog');
  const existing = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.provider = @provider LIMIT 1',
      parameters: [{ name: '@provider', value: 'google_workspace' }],
    })
    .fetchAll();

  if (existing.resources.length > 0) {
    console.log('Google Workspace catalog entry already exists. Skipping.');
    await disconnectDatabase();
    process.exit(0);
  }

  const entry = {
    id: uuidv4(),
    integrationId: GOOGLE_WORKSPACE_CATALOG_ENTRY.integrationId,
    category: GOOGLE_WORKSPACE_CATALOG_ENTRY.category,
    provider: GOOGLE_WORKSPACE_CATALOG_ENTRY.provider,
    name: GOOGLE_WORKSPACE_CATALOG_ENTRY.name,
    description: GOOGLE_WORKSPACE_CATALOG_ENTRY.description,
    icon: GOOGLE_WORKSPACE_CATALOG_ENTRY.icon,
    color: GOOGLE_WORKSPACE_CATALOG_ENTRY.color,
    authMethods: GOOGLE_WORKSPACE_CATALOG_ENTRY.authMethods,
    supportedEntities: GOOGLE_WORKSPACE_CATALOG_ENTRY.supportedEntities,
    requiresUserScoping: false,
    webhookSupport: GOOGLE_WORKSPACE_CATALOG_ENTRY.webhookSupport,
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: GOOGLE_WORKSPACE_CATALOG_ENTRY.createdBy,
    displayName: GOOGLE_WORKSPACE_CATALOG_ENTRY.displayName,
    visibility: GOOGLE_WORKSPACE_CATALOG_ENTRY.visibility,
    requiresApproval: false,
    beta: false,
    deprecated: false,
    rateLimit: GOOGLE_WORKSPACE_CATALOG_ENTRY.rateLimit,
    shardMappings: GOOGLE_WORKSPACE_CATALOG_ENTRY.shardMappings,
    version: '1.0.0',
    status: GOOGLE_WORKSPACE_CATALOG_ENTRY.status,
    updatedBy: GOOGLE_WORKSPACE_CATALOG_ENTRY.createdBy,
  };

  await container.items.create(entry);
  console.log('Created Google Workspace catalog entry. id:', entry.id);
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
