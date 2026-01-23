#!/usr/bin/env tsx
/**
 * Seed Proactive Triggers
 *
 * Seeds default proactive triggers for a tenant or all tenants.
 * Uses DEFAULT_PROACTIVE_TRIGGERS from types/proactive-insights.types.ts
 *
 * Usage:
 *   # Seed for a specific tenant
 *   pnpm --filter @castiel/api run seed:triggers -- --tenantId <tenant-id>
 *
 *   # Seed for all tenants (interactive)
 *   pnpm --filter @castiel/api run seed:triggers -- --all
 *
 * Prerequisites:
 *   - COSMOS_DB_ENDPOINT
 *   - COSMOS_DB_KEY
 *   - COSMOS_DB_DATABASE_ID (optional, defaults to castiel)
 */
export {};
//# sourceMappingURL=seed-proactive-triggers.d.ts.map