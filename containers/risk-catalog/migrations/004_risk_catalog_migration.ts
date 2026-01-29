/**
 * Migration 004: One-time destructive risk catalog migration (Plan §10.7)
 * Soft-deletes all risk_catalog shards in the system tenant. Document breaking changes in 004_BREAKING_CHANGES.md.
 * Run only when CONFIRM_RISK_CATALOG_MIGRATION_DESTRUCTIVE=yes.
 * Run from containers/risk-catalog: pnpm exec tsx migrations/004_risk_catalog_migration.ts
 */

import { loadConfig } from '../src/config/index';

const RISK_CATALOG_SHARD_TYPE_NAME = 'risk_catalog';
const SYSTEM_TENANT_ID = 'system';
const CONFIRM_ENV = 'CONFIRM_RISK_CATALOG_MIGRATION_DESTRUCTIVE';

async function run(): Promise<void> {
  const confirm = process.env[CONFIRM_ENV] === 'yes';

  if (!confirm) {
    console.log(
      'Migration 004 skipped: set CONFIRM_RISK_CATALOG_MIGRATION_DESTRUCTIVE=yes to run. See migrations/004_BREAKING_CHANGES.md.'
    );
    return;
  }

  const config = loadConfig();
  const baseURL = (config.services?.shard_manager?.url || process.env.SHARD_MANAGER_URL || '').replace(/\/$/, '');
  const token = process.env.MIGRATION_BEARER_TOKEN;

  if (!baseURL || !token) {
    console.error('Migration 004 failed: SHARD_MANAGER_URL and MIGRATION_BEARER_TOKEN required when confirmed.');
    process.exit(1);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-ID': SYSTEM_TENANT_ID,
  };

  const listTypesRes = await fetch(`${baseURL}/api/v1/shard-types?limit=1000`, { headers });
  if (!listTypesRes.ok) {
    console.error('Migration 004 failed: GET shard-types', listTypesRes.status, await listTypesRes.text());
    process.exit(1);
  }

  const types = (await listTypesRes.json()) as { id: string; name: string }[];
  const riskCatalogType = Array.isArray(types) ? types.find((t) => t.name === RISK_CATALOG_SHARD_TYPE_NAME) : null;
  if (!riskCatalogType) {
    console.log('Migration 004 skipped: risk_catalog shard type not found (nothing to delete).');
    return;
  }

  const listShardsRes = await fetch(
    `${baseURL}/api/v1/shards?shardTypeId=${riskCatalogType.id}&limit=1000`,
    { headers }
  );
  if (!listShardsRes.ok) {
    console.error('Migration 004 failed: GET shards', listShardsRes.status, await listShardsRes.text());
    process.exit(1);
  }

  const shardsPayload = (await listShardsRes.json()) as { items?: { id: string }[] } | { id: string }[];
  const items = Array.isArray(shardsPayload)
    ? shardsPayload
    : shardsPayload?.items ?? [];
  const ids = items.map((s) => (typeof s === 'object' && s && 'id' in s ? s.id : (s as { id: string }).id));

  let deleted = 0;
  for (const id of ids) {
    const delRes = await fetch(`${baseURL}/api/v1/shards/${id}`, { method: 'DELETE', headers });
    if (delRes.ok) deleted++;
    else console.warn('Migration 004: failed to delete shard', id, delRes.status);
  }

  console.log('Migration 004 complete: soft-deleted', deleted, 'risk_catalog shards (system tenant).');
}

run().catch((err) => {
  console.error('Migration 004 failed:', err);
  process.exit(1);
});
