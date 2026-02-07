/**
 * Standalone script: ensure all platform Cosmos DB containers from the central manifest.
 * Use when you want to create containers without starting the full shard-manager server (e.g. CI or one-off env setup).
 * Shard type seeding is not performed by this script; start shard-manager with bootstrap.enabled for that.
 *
 * Usage (from containers/shard-manager):
 *   pnpm exec tsx scripts/ensure-platform-containers-and-shard-types.ts
 *
 * Requires: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY; optional COSMOS_DB_DATABASE_ID (default: castiel).
 * Optional: BOOTSTRAP_COSMOS_MANIFEST_PATH (default: config/cosmos-containers.yaml, relative to shard-manager root).
 */

import { initializeDatabase, connectDatabase, disconnectDatabase } from '@coder/shared';
import { loadConfig } from '../src/config';
import { ensureCosmosContainers } from '../src/startup/ensureCosmosContainers';

async function main(): Promise<void> {
  const config = loadConfig();
  const manifestPath = config.bootstrap?.cosmos_containers_manifest_path ?? 'config/cosmos-containers.yaml';

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: config.cosmos_db.containers ?? {},
  });

  await connectDatabase();
  await ensureCosmosContainers(manifestPath);
  await disconnectDatabase();

  console.log('Platform Cosmos containers ensured from', manifestPath);
}

main().catch((err) => {
  console.error('Failed to ensure platform containers:', err);
  process.exit(1);
});
