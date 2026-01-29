/**
 * Migration 001: Create feedback Cosmos containers (Plan §10.7)
 * Ensures recommendation_feedback, recommendation_feedback_aggregation, recommendation_config exist.
 * Run from containers/recommendations: pnpm exec tsx migrations/001_create_feedback_containers.ts
 * Requires: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, COSMOS_DB_DATABASE_ID (or default castiel)
 */

import { initializeDatabase, connectDatabase } from '@coder/shared';
import { loadConfig } from '../src/config/index';

async function run(): Promise<void> {
  const config = loadConfig();
  const containers = {
    feedback: config.cosmos_db.containers.feedback,
    feedback_aggregation: config.cosmos_db.containers.feedback_aggregation ?? 'recommendation_feedback_aggregation',
    recommendation_config: config.cosmos_db.containers.recommendation_config ?? 'recommendation_config',
  };

  initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    database: config.cosmos_db.database_id,
    containers,
  });

  await connectDatabase();
  console.log('Migration 001 complete: feedback containers ensured.', containers);
}

run().catch((err) => {
  console.error('Migration 001 failed:', err);
  process.exit(1);
});
