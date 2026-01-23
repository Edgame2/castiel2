#!/usr/bin/env tsx
/**
 * Seed System Prompts
 *
 * Production-ready script to load system prompt definitions from
 * data/prompts/system-prompts.json and upsert them into the AI Insights
 * prompts container with tenantId "SYSTEM".
 *
 * Features:
 * - Validates prompt definitions before seeding
 * - Handles versioning automatically
 * - Provides detailed error reporting
 * - Verifies container exists
 * - Idempotent (safe to run multiple times)
 *
 * Usage:
 *   pnpm --filter @castiel/api run seed:prompts
 *
 * Prerequisites:
 *   - COSMOS_DB_ENDPOINT
 *   - COSMOS_DB_KEY
 *   - COSMOS_DB_DATABASE_ID (optional, defaults to castiel)
 *   - Prompts container must exist (run init-db first)
 */
export {};
//# sourceMappingURL=seed-system-prompts.d.ts.map