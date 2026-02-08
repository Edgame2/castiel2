# P3 Gap Coverage — Logging, Secret-Management, Shard-Manager, Risk-Analytics, Recommendations, Shared

**Date:** 2026-02-07  
**Scope:** Focused gap analyses for areas listed in Phase 3.2 of the documentation-gaps implementation plan.  
**Related:** [system-wide-gaps.md](./system-wide-gaps.md) §4 and §6 P3; [logging-data-collection-config-gaps.md](./logging-data-collection-config-gaps.md).

---

## 1. Logging (beyond data collection)

**Already covered:** [logging-data-collection-config-gaps.md](./logging-data-collection-config-gaps.md) — data_collection config (event type, resource type, category, severity) and `isCollectionEnabled()` are implemented. Logging service exposes GET (and optional search) for data_collection config for admin UI.

**Remaining P3 areas:**

| Area | Current state | Gap / note |
|------|----------------|------------|
| **Retention** | Config has retention; behavior may vary by backend | Confirm retention is applied in ingestion/store and documented. |
| **Query API** | Admin UI uses GET config; audit log search may be separate | If audit search is required, confirm logging or another service exposes a tenant-scoped query API. |
| **Tenant in queries** | All audit flows should be tenant-scoped | Verify any log query path includes tenantId (partition or filter). |

No critical gaps identified for Phase 2 scope. Deeper analysis can be added when retention or audit-search requirements are finalized.

---

## 2. Secret-management

**Key files:** `containers/secret-management/` — config, routes, services. Gateway: config-driven URL; route typically `/api/v1/secrets` or similar.

| Area | What to check |
|------|----------------|
| **Tenant isolation** | Every secret read/write must be scoped by tenantId; no cross-tenant access. |
| **Vault semantics** | If multiple backends (e.g. Azure Key Vault vs in-memory), config and behavior per tenant or per key type should be documented. |
| **Audit** | Secret access (read, create, update, delete) should be audit-logged (e.g. via logging service) with tenantId and resource type. |
| **Gateway** | Route and service URL must be in api-gateway config; no hardcoded URLs in other containers. |

**Recommendation:** Audit tenantId in all secret APIs and event payloads; confirm audit events are consumed by logging. No dedicated gap doc yet; add one if secret-management becomes a compliance or multi-tenant focus.

---

## 3. Shard-manager

**Key files:** `containers/shard-manager/` — core to data model; used by risk-catalog, risk-analytics, and others. Gateway: admin routes (e.g. shards, shard-types).

| Area | What to check |
|------|----------------|
| **Tenant and partition keys** | All shard queries must include tenantId (and shardTypeId where applicable). Cosmos or store layer must enforce partition. |
| **Config** | Service URLs for shard-manager (e.g. 3023) are fixed in Phase 1; dependents use config, not hardcoded URLs. |
| **Admin API** | List/create/update/delete shards and shard-types must be tenant-aware and RBAC-aware where applicable. |

**Recommendation:** Validate tenantId in every shard-manager route and in callers (risk-catalog, risk-analytics). No dedicated gap doc yet; add one if shard model or multi-tenancy changes.

---

## 4. Risk-analytics

**Key files:** `containers/risk-analytics/` — decision rules, methodology, conflicts, forecasts, etc. Heavily used; many routes already implemented.

| Area | What to check |
|------|----------------|
| **Tenant isolation** | All routes use tenantEnforcementMiddleware and request.user.tenantId; decision rules, methodology, and analytics are tenant-scoped. |
| **Config** | Service URLs (e.g. shard-manager, ml-service) come from config; no hardcoded ports/URLs. |
| **Events** | Any published events (e.g. model deployed, rule updated) should include tenantId and follow event naming conventions. |

**Recommendation:** Risk-analytics was a major focus of Phase 1 and 2 (gateway, rules, templates, UI). Remaining P3: ensure new routes or event publishers consistently include tenantId and use config for dependencies.

---

## 5. Recommendations

**Key files:** `containers/recommendations/` — recommendation and feedback-type APIs. Gateway: recommendations service URL and routes.

| Area | What to check |
|------|----------------|
| **Tenant isolation** | All recommendation and feedback-type APIs must be tenant-scoped (tenantId in queries and in event payloads). |
| **Config** | Dependencies (user-management, ml-service, etc.) use config-driven URLs. |
| **Admin CRUD** | Feedback types and recommendation config have admin UI (Phase 2.8); APIs exist and are gateway-proxied. |

**Recommendation:** Spot-check recommendations routes for tenantId in DB and events. No dedicated gap doc required unless recommendations become a compliance or scaling focus.

---

## 6. Shared (@coder/shared)

**Key files:** `packages/shared/` or monorepo equivalent — types, errors, auth helpers, ServiceClient, event types.

| Area | What to check |
|------|----------------|
| **Breaking changes** | Changes to shared types or auth/tenant utilities affect all containers. Version shared package and document breaking changes. |
| **Tenant and auth** | tenantId, userId, and RBAC types are used consistently; no drift between containers. |
| **Events** | Event payload and naming conventions (tenantId, type, version, timestamp, source, data) are documented and adhered to. |

**Recommendation:** Treat shared as a dependency; avoid breaking API changes without a short gap note or changelog. No dedicated gap doc unless a major refactor is planned.

---

## 7. Cross-references

- [system-wide-gaps.md](./system-wide-gaps.md) — Config defaults, gateway, stub containers, P3 recommendation
- [logging-data-collection-config-gaps.md](./logging-data-collection-config-gaps.md) — Data collection config (implemented)
- [documentation/CURRENT_STATE.md](../CURRENT_STATE.md) — Container list and ports

---

*End of P3 gap coverage.*
