# UI → Gateway → Service (page → endpoint table)

Single source of truth for each page/flow: method, gateway path, gateway mapping, backend path.

## New pages (accounts, contacts, user products)

| Page/route | Method | Gateway path | Gateway mapping | Backend path |
|------------|--------|-------------|-----------------|--------------|
| accounts/page | GET | `/api/v1/shards?shardTypeName=c_account&...` | `/api/v1/shards` → shard_manager | GET /api/v1/shards (shard_manager) |
| accounts/[id] | GET | `/api/v1/shards/:id`, `/api/v1/accounts/:id/health` | `/api/v1/shards` → shard_manager; `/api/v1` → risk_analytics | GET /api/v1/shards/:id; GET /api/v1/accounts/:id/health |
| contacts/page | GET | `/api/v1/shards?shardTypeName=c_contact&...` | `/api/v1/shards` → shard_manager | GET /api/v1/shards (shard_manager) |
| contacts/new | GET, POST | `/api/v1/admin/shard-types`, `/api/v1/shards` | `/api/v1/admin/shard-types` → shard_manager; `/api/v1/shards` → shard_manager | GET shard-types; POST /api/v1/shards (shard_manager) |
| contacts/[id] | GET, PUT, DELETE | `/api/v1/shards/:id` | `/api/v1/shards` → shard_manager | GET/PUT/DELETE /api/v1/shards/:id (shard_manager) |
| products/page | GET | `/api/v1/products` | `/api/v1` → risk_analytics | GET /api/v1/products (risk_analytics) |
| products/[id] | GET | `/api/v1/products/:id` | `/api/v1` → risk_analytics | GET /api/v1/products/:id (risk_analytics) |

## Additional gateway routes (this implementation)

| Gateway path | Service | Purpose |
|--------------|---------|---------|
| `/api/v1/shards` | shard_manager | Accounts list, contacts CRUD (list/get/create/update/delete) |
| `/api/v1/remediation-workflows` | recommendations | Opportunity remediation workflows (list, get, complete step, cancel) |

## Opportunity and dashboard

| Page/route | Method | Gateway path | Gateway mapping |
|------------|--------|-------------|------------------|
| opportunities/page | GET | `/api/v1/shards?shardTypeName=c_opportunity&...` | `/api/v1/shards` → shard_manager |
| opportunities/[id] | GET | `/api/v1/opportunities/:id/anomalies`, `/api/v1/remediation-workflows?opportunityId=` | `/api/v1` → risk_analytics; `/api/v1/remediation-workflows` → recommendations |
| dashboard/page | GET | `/api/dashboard/api/v1/dashboards/manager/prioritized` | `/api/dashboard` → dashboard (stripPrefix) |

## Audit note (Phase 3)

Existing admin and settings pages use gateway paths per `.cursor/commands/endpoints.md` (Full endpoints audit). Consistency checklist: list pages use data table pattern; delete uses AlertDialog + toast; loading/empty states; apiFetch/getApiBaseUrl only. i18n and a11y to be completed per requirements.

All above are protected (credentials/include; gateway forwards Authorization when present).
