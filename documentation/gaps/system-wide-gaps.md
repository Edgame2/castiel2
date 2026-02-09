# Gap Analysis: System-Wide (Config, Gateway, Stub Containers)

**Date:** 2026-02-07  
**Scope:** Cross-container config defaults, API Gateway route coverage, stub/incomplete containers, areas not yet gap-analyzed  
**Standards:** ModuleImplementationGuide, .cursorrules, documentation/CURRENT_STATE.md

---

## Executive Summary

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **Config defaults** | Resolved | Defaults use correct ports: user-management 3022, integration-manager 3026, shard-manager 3023 (secret-management, logging, workflow-orchestrator, signal-intelligence, integration-sync, integration-processors, security-scanning, risk-catalog, ai-conversation). |
| **Gateway coverage** | Partial | search-service exposed at /api/v1/search when configured; context-service still not in gateway (backend-only unless route added) |
| **Stub containers** | Resolved | compliance-service and migration-service deprecated (README + CURRENT_STATE); security-service retained as stub for future completion (README + CURRENT_STATE). None are runnable; decision documented. |
| **Coverage** | Partial | Logging, secret-management, shard-manager, risk-analytics, shared not yet gap-analyzed in depth |

---

## 1. Wrong Config Default Ports / URLs

Multiple containers use incorrect default URLs for dependent services. Ports below are per documentation/CURRENT_STATE.md and api-gateway config.

### 1.1 User Management URL (correct: 3022) — Resolved

| Container | Config key | Status |
|------------|------------|--------|
| secret-management | USER_MANAGEMENT_URL | Default `localhost:3022` in config |
| logging | USER_MANAGEMENT_URL | Default `localhost:3022` in config |

### 1.2 Integration Manager URL (correct: 3026) — Resolved

| Container | Config key | Status |
|------------|------------|--------|
| workflow-orchestrator | INTEGRATION_MANAGER_URL | Default `localhost:3026` in config |
| signal-intelligence | INTEGRATION_MANAGER_URL | Default `localhost:3026` in config |
| integration-sync | INTEGRATION_MANAGER_URL | Default `localhost:3026` in config |
| integration-processors | INTEGRATION_MANAGER_URL | Default `localhost:3026` in config |

### 1.3 Shard Manager URL (correct: 3023) — Resolved

| Container | Config key | Status |
|------------|------------|--------|
| security-scanning | SHARD_MANAGER_URL | Default `localhost:3023` in config |
| risk-catalog | SHARD_MANAGER_URL | Default `localhost:3023` in config |
| ai-conversation | SHARD_MANAGER_URL | Default `localhost:3023` in config |

**Detail:** Config defaults now use the service ports from CURRENT_STATE.md; when env vars are unset, calls go to the intended service.

---

## 2. API Gateway Route Coverage

### 2.1 Services in Gateway

| Service | Default port (CURRENT_STATE) | In gateway? | Note |
|---------|------------------------------|-------------|------|
| context-service | 3034 | No | No path (e.g. /api/context or /api/v1/context); backend-only unless route added |
| search-service | 3029 | Yes | Route `/api/v1/search` → search_service when config.services.search_service.url is set |

**Detail:** search-service is exposed for UI and clients when configured. context-service remains backend-only (called by multi-modal, ai-conversation, etc.) unless a gateway route is added.

---

## 3. Stub / Incomplete Containers

**Resolution (Plan Phase 3.1):** Decision completed. **compliance-service** and **migration-service** are deprecated: README states status and points to CURRENT_STATE.md; compliance is covered by logging, secret-management, security-service; migration logic lives in configuration-service. **security-service** is retained as a stub for future completion (README and CURRENT_STATE document; port 3042 reserved; not run in default stack). See `containers/*/README.md` and documentation/CURRENT_STATE.md.

| Container | Missing (for full module) | Status |
|-----------|---------------------------|--------|
| compliance-service | server.ts, routes, config/default.yaml | Deprecated; README exists and states coverage elsewhere |
| security-service | server.ts, routes, config/default.yaml | Stub retained; README exists and states intended role |
| migration-service | server.ts, routes, config/default.yaml | Deprecated; README exists; migration in configuration-service |

**Detail:** Each has Dockerfile, tsconfig.json, src (config, services, types), and a README. They are not deployable as standalone HTTP services. The decision (deprecate vs complete) is documented in README and CURRENT_STATE.

---

## 4. Areas Not Yet Gap-Analyzed

The following had no dedicated gap document; a **focused P3 coverage** doc now exists: [p3-gap-coverage.md](./p3-gap-coverage.md) (logging beyond data collection, secret-management, shard-manager, risk-analytics, recommendations, shared). They may still have config, tenant, or compliance gaps to address as needed.

| Area | Why it matters |
|------|-----------------|
| **logging** | In gateway; audit and retention; tenant in events and queries |
| **secret-management** | In gateway; vault semantics; tenant isolation; audit |
| **shard-manager** | In gateway (admin); central to data model; tenant and partition keys |
| **risk-analytics** | In gateway; heavy usage; tenant isolation and config |
| **recommendations** | In gateway; tenant and config |
| **forecasting** | Event-driven; tenant and config |
| **data-enrichment** | Event-driven; tenant and config |
| **workflow-orchestrator** | Orchestration; service URLs (see §1.2) and tenant |
| **shared (@coder/shared)** | Used by all containers; types, DB, auth, events — breaking changes are system-wide |

---

## 5. Cross-References

- [p3-gap-coverage.md](./p3-gap-coverage.md) — Focused P3 analyses: logging, secret-management, shard-manager, risk-analytics, recommendations, shared
- [documentation/CURRENT_STATE.md](../CURRENT_STATE.md) — Container list and default ports
- [documentation/DOCUMENTATION_STATUS.md](../DOCUMENTATION_STATUS.md) — Deprecated/stub container list
- [documentation/gaps/auth-user-management-gaps.md](./auth-user-management-gaps.md)
- [documentation/gaps/api-gateway-gaps.md](./api-gateway-gaps.md)
- [documentation/gaps/ai-integrations-multimodal-prompt-gaps.md](./ai-integrations-multimodal-prompt-gaps.md)
- [documentation/gap-analysis-ui-auth-usermgmt-gateway.md](../gap-analysis-ui-auth-usermgmt-gateway.md)

---

## 6. Recommendations (Priority)

| Priority | Area | Action |
|----------|------|--------|
| P1 | Config defaults | Resolved: URL defaults are 3022/3026/3023 in secret-management, logging, workflow-orchestrator, signal-intelligence, integration-sync, integration-processors, security-scanning, risk-catalog, ai-conversation. |
| P2 | Gateway | If context-service and search-service are client-facing, add gateway route mappings and config entries. Otherwise document as backend-only. |
| P2 | Stub containers | Either complete compliance-service, security-service, migration-service per ModuleImplementationGuide or mark deprecated and exclude from CURRENT_STATE/container list. |
| P3 | Gap coverage | Add focused gap analyses for logging, secret-management, shard-manager, and (as needed) risk-analytics, recommendations, shared. **Done:** see [p3-gap-coverage.md](./p3-gap-coverage.md). |

---

*End of system-wide gap analysis.*
