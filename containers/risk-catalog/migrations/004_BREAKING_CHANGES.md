# Risk catalog migration – breaking changes (Plan §10.7)

**Migration 004** is a one-time, **destructive** migration. Existing risk catalog data can be lost. Run only when adopting the new schema or intentionally resetting risk catalog.

## Breaking changes for clients

1. **Global risk catalog (system tenant)**  
   If you run 004 with `CONFIRM_RISK_CATALOG_MIGRATION_DESTRUCTIVE=yes`, all `risk_catalog` shards in the **system** tenant are soft-deleted. Global and industry risk definitions stored there will no longer be returned by `GET /api/v1/risk-catalog/catalog/:tenantId`.

2. **Action catalog is separate**  
   The **action_catalog** shard type is new and separate from **risk_catalog**. It is not an in-place schema change of risk_catalog. Risk catalog (risk_catalog) and unified action catalog (action_catalog) coexist. 004 only affects risk_catalog shards when you run the destructive step.

3. **Tenant-specific risk overrides**  
   The 004 script only deletes risk_catalog shards in the **system** tenant. Tenant-specific overrides (tenantId ≠ system) are not deleted by this script. If you need a full reset, you must handle per-tenant deletion separately (e.g. via shard-manager or admin APIs).

4. **Re-seeding**  
   After running 004 (destructive), re-create global risks via risk-catalog APIs (POST /api/v1/risk-catalog/risks) or your own seed process.

## When to run 004

- You are intentionally resetting the global risk catalog.
- You have documented that existing risk catalog data can be lost and clients have been notified.
- You have set `CONFIRM_RISK_CATALOG_MIGRATION_DESTRUCTIVE=yes` and provided `MIGRATION_BEARER_TOKEN` and `SHARD_MANAGER_URL`.

## Rollback

There is no automatic rollback. Shards are soft-deleted (status = deleted, deletedAt set). Restoring would require shard-manager or Cosmos DB restore from backup.
