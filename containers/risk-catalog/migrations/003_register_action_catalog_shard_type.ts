/**
 * Migration 003: Register action_catalog shard type in shard-manager (Plan §10.7)
 * Idempotent: skips if action_catalog already exists.
 * Run from containers/risk-catalog: pnpm exec tsx migrations/003_register_action_catalog_shard_type.ts
 * Requires: SHARD_MANAGER_URL (or config), MIGRATION_BEARER_TOKEN (valid JWT with tenantId + id). If token unset, skips.
 */

import { loadConfig } from '../src/config/index';

const ACTION_CATALOG_SHARD_TYPE_NAME = 'action_catalog';
const SYSTEM_TENANT_ID = 'system';

const SHARD_TYPE_SCHEMA = {
  type: 'object',
  properties: {
    entryId: { type: 'string' },
    type: { type: 'string', enum: ['risk', 'recommendation'] },
    category: { type: 'string' },
    name: { type: 'string' },
    displayName: { type: 'string' },
    description: { type: 'string' },
    applicableIndustries: { type: 'array', items: { type: 'string' } },
    applicableStages: { type: 'array', items: { type: 'string' } },
    applicableMethodologies: { type: 'array', items: { type: 'string' } },
    riskDetails: { type: 'object' },
    recommendationDetails: { type: 'object' },
    decisionRules: { type: 'object' },
    usage: { type: 'object' },
    status: { type: 'string' },
    version: { type: 'number' },
    createdBy: { type: 'string' },
  },
};

async function run(): Promise<void> {
  const config = loadConfig();
  const baseURL = (config.services?.shard_manager?.url || process.env.SHARD_MANAGER_URL || '').replace(/\/$/, '');
  const token = process.env.MIGRATION_BEARER_TOKEN;

  if (!baseURL) {
    console.error('Migration 003 failed: SHARD_MANAGER_URL or config.services.shard_manager.url required.');
    process.exit(1);
  }

  if (!token) {
    console.log('Migration 003 skipped: set MIGRATION_BEARER_TOKEN to register action_catalog; or run risk-catalog once (ensureShardType on first use).');
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-ID': SYSTEM_TENANT_ID,
  };

  const listRes = await fetch(`${baseURL}/api/v1/shard-types?limit=1000`, { headers });
  if (!listRes.ok) {
    console.error('Migration 003 failed: GET shard-types', listRes.status, await listRes.text());
    process.exit(1);
  }

  const list = (await listRes.json()) as { name?: string }[];
  if (Array.isArray(list) && list.some((s) => s.name === ACTION_CATALOG_SHARD_TYPE_NAME)) {
    console.log('Migration 003 skipped: action_catalog shard type already exists.');
    return;
  }

  const createRes = await fetch(`${baseURL}/api/v1/shard-types`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: ACTION_CATALOG_SHARD_TYPE_NAME,
      description: 'Unified catalog for risks and recommendations',
      schema: SHARD_TYPE_SCHEMA,
      isSystem: true,
    }),
  });

  if (!createRes.ok) {
    console.error('Migration 003 failed: POST shard-types', createRes.status, await createRes.text());
    process.exit(1);
  }

  console.log('Migration 003 complete: action_catalog shard type registered.');
}

run().catch((err) => {
  console.error('Migration 003 failed:', err);
  process.exit(1);
});
