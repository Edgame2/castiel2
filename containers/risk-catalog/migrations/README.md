# Risk-catalog migrations (Plan §10.7)

Run from `containers/risk-catalog` with env set.

- **003_register_action_catalog_shard_type.ts** – Register `action_catalog` shard type in shard-manager (idempotent). Optional: set `MIGRATION_BEARER_TOKEN`; if unset, script skips.
- **004_risk_catalog_migration.ts** – One-time **destructive** migration: soft-deletes all `risk_catalog` shards in the system tenant. Requires `CONFIRM_RISK_CATALOG_MIGRATION_DESTRUCTIVE=yes` and `MIGRATION_BEARER_TOKEN`. See **004_BREAKING_CHANGES.md** before running.

```bash
export MIGRATION_BEARER_TOKEN="<jwt>"
pnpm run migrate:003

# Destructive (read 004_BREAKING_CHANGES.md first):
export CONFIRM_RISK_CATALOG_MIGRATION_DESTRUCTIVE=yes
pnpm run migrate:004
```

Requires: `SHARD_MANAGER_URL` or config `services.shard_manager.url`.
