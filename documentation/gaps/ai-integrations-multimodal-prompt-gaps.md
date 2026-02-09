# Gap Analysis: AI Service, AI Conversation, Integrations, Multi-Modal, Prompt

**Date:** 2026-02-07  
**Scope:** containers/ai-service, containers/ai-conversation, containers/integration-manager, containers/integration-sync, containers/integration-processors, containers/multi-modal-service, containers/prompt-service  
**Standards:** ModuleImplementationGuide, .cursorrules

---

## Executive Summary

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **ai-service** | Partial | README (PostgreSQL vs Cosmos); JWT default 'change-me'; Agent getAgent no tenant; executeAgent not implemented |
| **ai-conversation** | Partial | Wrong default SHARD_MANAGER_URL (3002); not in API Gateway |
| **integration-manager** | Good | No major gaps identified |
| **integration-sync** | Good | No major gaps identified |
| **integration-processors** | Partial | No openapi.yaml; no architecture.md |
| **multi-modal-service** | Partial | CODE_GENERATION_URL in README not in config; processJob placeholder; not in Gateway |
| **prompt-service** | Partial | GET /api/v1/prompts/analytics implemented; prompt_service in Gateway at /api/v1/prompts |

---

## 1. AI Service (containers/ai-service)

### 1.1 README vs Configuration

| Item | README | Actual |
|------|--------|--------|
| Database | `DATABASE_URL` (PostgreSQL) | Cosmos DB (`cosmos_db`, containers) |

**Detail:** README lists PostgreSQL and `DATABASE_URL`. The service uses Cosmos DB via `config/default.yaml` (`cosmos_db.endpoint`, `containers`). README is outdated.

### 1.2 JWT Fallback

| Item | Status |
|------|--------|
| server.ts | JWT fallback chain ends with default 'change-me' when env/config missing |

**Detail:** A default `'change-me'` is unsafe if env and config are missing. Production should require JWT secret from config/env.

### 1.3 Agent Service

| Item | Status |
|------|--------|
| getAgent(id) | No tenantId; lookup by id only — risk of cross-tenant if agents are tenant-scoped |
| executeAgent | Documented stub: returns pending execution only; JSDoc and README state persistence/execution logic deferred |

**Detail:** `AgentService.getAgent(id)` does not scope by tenant or organization. `executeAgent` is documented as out-of-scope for actual run; no TODO in code.

---

## 2. AI Conversation (containers/ai-conversation)

### 2.1 Wrong Default for Shard Manager URL

| Item | Value |
|------|--------|
| config/default.yaml `shard_manager.url` | `${SHARD_MANAGER_URL:-http://localhost:3002}` |
| Shard Manager actual port | 3023 (per shard-manager config/README) |

**Detail:** Default 3002 is typically the API Gateway. Shard-manager runs on 3023. The default should be 3023 or omitted so env is required.

### 2.2 Not in API Gateway

| Item | Status |
|------|--------|
| api-gateway route mappings | No path for ai-conversation (e.g. /api/conversations or /api/v1/conversations) |

**Detail:** If clients (e.g. UI) should call ai-conversation via the gateway, a route mapping is missing.

---

## 3. Integration Processors (containers/integration-processors)

### 3.1 Missing Module Artifacts

| Item | Status |
|------|--------|
| openapi.yaml | **Missing** — ModuleImplementationGuide expects OpenAPI spec |
| architecture.md | **Missing** — Other containers have it |

**Detail:** The module has health, monitoring, processing, and other HTTP routes but no openapi.yaml. No architecture.md for design and data flow.

---

## 4. Multi-Modal Service (containers/multi-modal-service)

### 4.1 README vs Config

| Item | README | config/default.yaml |
|------|--------|---------------------|
| Code Generation | `CODE_GENERATION_URL=http://localhost:3040` in env list | No `code_generation` (or similar) service URL |

**Detail:** README lists Code Generation Service as a dependency and env var; config has no corresponding service entry.

### 4.2 Processing Implementation

| Item | Status |
|------|--------|
| MultiModalService.processJob() | Placeholder; comment: "actual processing would use AI services" |
| Image/diagram/audio/video handling | Not implemented (stub only) |

**Detail:** Job CRUD and status updates exist; the actual multi-modal processing (image, diagram, audio, video) is not implemented.

### 4.3 Not in API Gateway

| Item | Status |
|------|--------|
| api-gateway route mappings | No path for multi-modal (e.g. /api/v1/multimodal) |

**Detail:** If clients should call multi-modal via the gateway, a route mapping is missing.

---

## 5. Prompt Service (containers/prompt-service)

### 5.1 Analytics Endpoint

| Item | Status |
|------|--------|
| README "Key Endpoints" | Lists `GET /api/v1/prompts/analytics` — "Get prompt analytics" |
| src/routes/index.ts | `GET /api/v1/prompts/analytics` implemented; calls PromptService.getAnalytics(tenantId); returns totalPrompts, byStatus, byCategory |

**Detail:** Prompt analytics is implemented. Gateway exposes prompt_service at /api/v1/prompts when configured.

### 5.2 Not in API Gateway

| Item | Status |
|------|--------|
| api-gateway route mappings | No path for prompt-service (e.g. /api/v1/prompts) |

**Detail:** If clients should call prompt-service via the gateway, a route mapping is missing.

---

## 6. Cross-Cutting

### 6.1 Gateway Exposure

| Service | In API Gateway | Note |
|---------|----------------|------|
| ai-service | Yes (`/api/ai`) | Exposed |
| ai-conversation | No | Missing if UI/external clients need it |
| multi-modal-service | No | Missing if UI/external clients need it |
| prompt-service | No | Missing if UI/external clients need it |

### 6.2 Tenant Isolation and URLs

- No hardcoded localhost URLs in `src/` for these containers; config/env fallbacks only.
- ai-service (completions, merged routes), ai-conversation, multi-modal, prompt-service use tenant enforcement and/or tenantId in queries; ai-service Agent getAgent(id) is the only tenant-scope gap noted.

---

## 7. Cross-References

- [containers/ai-service/README.md](../../containers/ai-service/README.md)
- [containers/ai-conversation/README.md](../../containers/ai-conversation/README.md)
- [containers/integration-manager/README.md](../../containers/integration-manager/README.md)
- [containers/integration-sync/README.md](../../containers/integration-sync/README.md)
- [containers/integration-processors/README.md](../../containers/integration-processors/README.md)
- [containers/multi-modal-service/README.md](../../containers/multi-modal-service/README.md)
- [containers/prompt-service/README.md](../../containers/prompt-service/README.md)

---

## 8. Recommendations (Priority)

| Priority | Area | Action |
|----------|------|--------|
| P1 | ai-service | Update README to describe Cosmos DB and config; remove or restrict JWT fallback to dev-only; add tenant scope to getAgent(id) if agents are tenant-scoped. |
| P1 | ai-conversation | Fix default SHARD_MANAGER_URL to 3023 (or remove default and require env). |
| P1 | prompt-service | Resolved: GET /api/v1/prompts/analytics implemented; gateway route /api/v1/prompts when configured. |
| P2 | ai-service | Resolved: executeAgent documented as stub in AgentService JSDoc and README; execution logic deferred. |
| P2 | integration-processors | Add openapi.yaml and architecture.md per ModuleImplementationGuide. |
| P2 | multi-modal-service | Add code_generation (or equivalent) to config if used; align README with config. |
| P2 | Gateway | Add route mappings for ai-conversation, multi-modal-service, and prompt-service if they are intended to be client-facing. |
| P3 | multi-modal-service | Implement actual multi-modal processing (image/diagram/audio/video) or document as future work. |

---

*End of AI / integrations / multi-modal / prompt gap analysis.*
