/**
 * Migration: Cosmos DB documents that have organizationId → ensure tenantId and optionally remove organizationId.
 *
 * Use after tenant-only cutover: all isolation is by tenantId; organizationId is no longer used.
 * This script updates documents that still have organizationId (e.g. legacy data) so tenantId is set
 * from organizationId when missing, and optionally removes the organizationId field.
 *
 * Usage (from repo root or containers/shard-manager):
 *   pnpm --filter @coder/shard-manager exec tsx scripts/migrate-organization-to-tenant.ts [--execute] [--containers=id1,id2]
 *
 * Requires: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY; optional COSMOS_DB_DATABASE_ID (default: castiel).
 * - Default: dry-run (log what would be done). Use --execute to apply updates.
 * - Optional --containers=user_teams,configuration_settings,... (default: list below).
 */

import { connectDatabase, disconnectDatabase, getContainer } from '@coder/shared';

const DRY_RUN = !process.argv.includes('--execute');
const CONTAINERS_ARG = process.argv.find((a) => a.startsWith('--containers='));
const CONTAINER_IDS: string[] = CONTAINERS_ARG
  ? CONTAINERS_ARG.slice('--containers='.length).split(',').filter(Boolean)
  : [
      'user_teams',
      'configuration_settings',
      'template_templates',
      'prompt_prompts',
      'dashboard_dashboards',
    ];

interface DocWithOrg {
  id: string;
  tenantId?: string;
  organizationId?: string;
  [k: string]: unknown;
}

async function migrateContainer(containerId: string): Promise<{ processed: number; updated: number }> {
  const container = getContainer(containerId);
  let processed = 0;
  let updated = 0;

  const query = 'SELECT * FROM c WHERE IS_DEFINED(c.organizationId)';
  const options = { enableCrossPartitionQuery: true };

  let continuation: string | undefined;
  do {
    const response = await container.items
      .query<DocWithOrg>({ query, parameters: [] }, options)
      .fetchNext();
    const items = response.resources ?? [];
    continuation = response.continuationToken;

    for (const doc of items) {
      processed += 1;
      const tenantId = doc.tenantId ?? doc.organizationId;
      if (!tenantId) continue;

      const updatedDoc = { ...doc };
      updatedDoc.tenantId = tenantId;
      delete (updatedDoc as Record<string, unknown>).organizationId;

      if (DRY_RUN) {
        if (processed <= 3) {
          console.log(`  [dry-run] would update ${containerId} id=${doc.id} tenantId=${tenantId} (was org=${doc.organizationId})`);
        }
        updated += 1;
        continue;
      }

      try {
        await container.item(doc.id, tenantId).replace(updatedDoc);
        updated += 1;
      } catch (err) {
        console.error(`  failed to update ${containerId} id=${doc.id}:`, err);
      }
    }
  } while (continuation);

  return { processed, updated };
}

async function main(): Promise<void> {
  if (!process.env.COSMOS_DB_ENDPOINT || !process.env.COSMOS_DB_KEY) {
    console.error('Set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY');
    process.exit(1);
  }

  console.log(DRY_RUN ? 'Running in dry-run mode (use --execute to apply).' : 'Running with --execute (applying updates).');
  console.log('Containers:', CONTAINER_IDS.join(', '));

  await connectDatabase();

  let totalProcessed = 0;
  let totalUpdated = 0;
  for (const containerId of CONTAINER_IDS) {
    try {
      const { processed, updated } = await migrateContainer(containerId);
      totalProcessed += processed;
      totalUpdated += updated;
      if (processed > 0) {
        console.log(`${containerId}: processed=${processed}, updated=${updated}`);
      }
    } catch (err) {
      console.error(`${containerId}:`, err);
    }
  }

  await disconnectDatabase();

  console.log('Done. Total processed:', totalProcessed, 'Total updated:', totalUpdated);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
