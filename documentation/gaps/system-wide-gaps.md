# Gap Analysis: System-Wide (Config, Gateway, Stub Containers)

**Date:** 2026-02-07  
**Scope:** Cross-container config defaults, API Gateway route coverage, stub/incomplete containers, areas not yet gap-analyzed  
**Standards:** ModuleImplementationGuide, .cursorrules, documentation/CURRENT_STATE.md

---

## Executive Summary

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **Config defaults** | Partial | Wrong service URL/port defaults in 8+ containers (user-management 3000, integration-manager 3012, shard-manager 3002) |
| **Gateway coverage** | Partial | context-service and search-service not exposed via gateway (if client-facing, routes missing) |
| **Stub containers** | Partial | compliance-service, security-service, migration-service lack server, README, config — not runnable modules |
| **Coverage** | Partial | Logging, secret-management, shard-manager, risk-analytics, shared not yet gap-analyzed in depth |

---

## 1. Wrong Config Default Ports / URLs

Multiple containers use incorrect default URLs for dependent services. Ports below are per documentation/CURRENT_STATE.md and api-gateway config.

### 1.1 User Management URL (correct: 3022)

| Container | Config key | Wrong default | Correct |
|------------|------------|---------------|---------|
| secret-management | USER_MANAGEMENT_URL | localhost:3000 | 3022 |
| logging | USER_MANAGEMENT_URL | localhost:3000 | 3022 |

### 1.2 Integration Manager URL (correct: 3026)

| Container | Config key | Wrong default | Correct |
|------------|------------|---------------|---------|
| workflow-orchestrator | INTEGRATION_MANAGER_URL | localhost:3012 | 3026 |
| signal-intelligence | INTEGRATION_MANAGER_URL | localhost:3012 | 3026 |
| integration-sync | INTEGRATION_MANAGER_URL | localhost:3012 | 3026 |
| integration-processors | INTEGRATION_MANAGER_URL | localhost:3012 | 3026 |

### 1.3 Shard Manager URL (correct: 3023)

| Container | Config key | Wrong default | Correct |
|------------|------------|---------------|---------|
| security-scanning | SHARD_MANAGER_URL | localhost:3002 | 3023 |
| risk-catalog | SHARD_MANAGER_URL | localhost:3002 | 3023 |

**Note:** ai-conversation wrong SHARD_MANAGER_URL (3002) is already in [ai-integrations-multimodal-prompt-gaps.md](./ai-integrations-multimodal-prompt-gaps.md).

**Detail:** Defaults are used when env vars are unset (e.g. local dev). Wrong defaults cause calls to the wrong service or 3021/gateway instead of the intended service. Fix: set default to the service’s actual default port or omit default and require env in production.

---

## 2. API Gateway Route Coverage

### 2.1 Services Not in Gateway

| Service | Default port (CURRENT_STATE) | In gateway? | Note |
|---------|------------------------------|-------------|------|
| context-service | 3034 | No | No path (e.g. /api/context or /api/v1/context) |
| search-service | 3029 | No | No path (e.g. /api/search or /api/v1/search) |

**Detail:** If UI or external clients should call these services directly, gateway route mappings are missing. If they are backend-only (called by ai-conversation, etc.), this is intentional but could be documented.

---

## 3. Stub / Incomplete Containers

Per documentation/DOCUMENTATION_STATUS.md, some containers are listed as removed or deprecated. The following exist on disk but lack standard module structure.

| Container | Missing | Status |
|-----------|---------|--------|
| compliance-service | README, CHANGELOG, package.json, config/default.yaml, server.ts, routes | Services and types only; no runnable HTTP server |
| security-service | README, CHANGELOG, package.json, config/default.yaml, server.ts, routes | Same |
| migration-service | README, CHANGELOG, package.json, config/default.yaml, server.ts, routes | Same |

**Detail:** Each has Dockerfile, tsconfig.json, and src (config, services, types) but no entrypoint server or config schema. They are not deployable as standalone services per ModuleImplementationGuide. Either complete them or document as deprecated/stub and exclude from container list.

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
| P1 | Config defaults | Fix wrong URL defaults: user-management 3022 (secret-management, logging); integration-manager 3026 (workflow-orchestrator, signal-intelligence, integration-sync, integration-processors); shard-manager 3023 (security-scanning, risk-catalog). |
| P2 | Gateway | If context-service and search-service are client-facing, add gateway route mappings and config entries. Otherwise document as backend-only. |
| P2 | Stub containers | Either complete compliance-service, security-service, migration-service per ModuleImplementationGuide or mark deprecated and exclude from CURRENT_STATE/container list. |
| P3 | Gap coverage | Add focused gap analyses for logging, secret-management, shard-manager, and (as needed) risk-analytics, recommendations, shared. **Done:** see [p3-gap-coverage.md](./p3-gap-coverage.md). |

---

*End of system-wide gap analysis.*
