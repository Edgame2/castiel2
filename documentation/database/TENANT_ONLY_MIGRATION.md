# Tenant-Only Migration Note

**Platform isolation:** All users and data are scoped by tenant. The partition key for isolation is `tenantId`. There is no separate organization concept.

## Database

- **Cosmos DB only.** No Prisma or Postgres for platform data; Cosmos DB is the only database.
- All Cosmos containers use partition key `/tenantId`. APIs, events, and application code use `tenantId` only (no `organizationId`).

## JWT and request context

- JWTs and request context expose **tenantId only** (e.g. `X-Tenant-ID` from the gateway). There is no `organizationId` in tokens or headers.

## Migrating existing Cosmos data

If documents in Cosmos still contain `organizationId` (legacy data), run the migration script to set `tenantId` from `organizationId` where missing and optionally remove `organizationId`:

```bash
# Dry-run (default): only logs what would be updated
pnpm --filter @coder/shard-manager exec tsx scripts/migrate-organization-to-tenant.ts

# Apply updates
pnpm --filter @coder/shard-manager exec tsx scripts/migrate-organization-to-tenant.ts --execute
```

Requires: `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`; optional `COSMOS_DB_DATABASE_ID` (default: `castiel`).

Script location: [containers/shard-manager/scripts/migrate-organization-to-tenant.ts](../../containers/shard-manager/scripts/migrate-organization-to-tenant.ts).
