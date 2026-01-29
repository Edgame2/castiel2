/**
 * Migration 002: Seed 25+ feedback types and global feedback config (Plan §10.7)
 * Idempotent: skips if global_feedback_config already exists.
 * Run from containers/recommendations: pnpm exec tsx migrations/002_seed_feedback_types.ts
 * Requires: 001 run first (containers exist); COSMOS_DB_* env.
 */

import { initializeDatabase, connectDatabase, getContainer } from '@coder/shared';
import { loadConfig } from '../src/config/index';
import {
  FEEDBACK_TYPES_SEED,
  toFeedbackTypeDoc,
  GLOBAL_FEEDBACK_CONFIG_SEED,
} from '../src/constants/feedback-types-seed';

const GLOBAL_TENANT_ID = '_global';

async function run(): Promise<void> {
  const config = loadConfig();
  const containerName =
    config.cosmos_db.containers.recommendation_config ?? 'recommendation_config';

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers: {
      feedback: config.cosmos_db.containers.feedback,
      feedback_aggregation:
        config.cosmos_db.containers.feedback_aggregation ?? 'recommendation_feedback_aggregation',
      recommendation_config: containerName,
    },
  });

  await connectDatabase();

  const container = getContainer(containerName);
  const existing = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.tenantId = @tid AND c.id = @id',
      parameters: [
        { name: '@tid', value: GLOBAL_TENANT_ID },
        { name: '@id', value: 'global_feedback_config' },
      ],
    })
    .fetchAll();

  if (existing.resources.length > 0) {
    console.log('Migration 002 skipped: global_feedback_config already exists.');
    return;
  }

  const ts = new Date().toISOString();
  for (const seed of FEEDBACK_TYPES_SEED) {
    const doc = toFeedbackTypeDoc(seed, ts);
    await container.items.create(
      { ...doc, tenantId: GLOBAL_TENANT_ID, partitionKey: GLOBAL_TENANT_ID },
      { partitionKey: GLOBAL_TENANT_ID }
    );
  }
  const globalConfig = {
    ...GLOBAL_FEEDBACK_CONFIG_SEED,
    tenantId: GLOBAL_TENANT_ID,
    partitionKey: GLOBAL_TENANT_ID,
  };
  await container.items.create(globalConfig, { partitionKey: GLOBAL_TENANT_ID });

  console.log('Migration 002 complete: seeded', FEEDBACK_TYPES_SEED.length, 'feedback types and global_feedback_config.');
}

run().catch((err) => {
  console.error('Migration 002 failed:', err);
  process.exit(1);
});
