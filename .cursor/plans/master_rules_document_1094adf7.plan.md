---
name: Master Rules Document
overview: Create a single master rules document under `documentation/rules` that consolidates and references API, UI, Cosmos DB, Events, Configuration, dependencies/versions, and security rules for consistency and security, reusing existing API_RULES.md and other docs.
todos: []
isProject: false
---

# Master Rules Document Plan

## Goal

One **master rules document** in [documentation/rules](documentation/rules) that:

- Reuses and references existing [documentation/endpoints/API_RULES.md](documentation/endpoints/API_RULES.md)
- Adds **UI rules** (auth, API usage, components, security)
- Adds **Database (Cosmos DB) rules** (tenant isolation, partition key, naming, security)
- Adds **Dependencies and versions** rules (consistency and version alignment across services)
- Drives **consistency** (paths, tenant model, UI patterns, shared lib, versions) and **security** (tenant isolation, no hardcoded URLs/secrets, validated inputs)

The `documentation/rules` directory does not exist yet; it will be created.

---

## Source material (no content duplication)

| Area | Primary sources |
|------|------------------|
| **API** | [API_RULES.md](documentation/endpoints/API_RULES.md) (path convention, gateway, UI paths, enforcement) |
| **UI** | [ui/requirements.md](documentation/ui/requirements.md) (auth, apiFetch, gateway-only, components, data tables, forms, i18n), [ui/pages.md](documentation/ui/pages.md) (data table/actions), [ModuleImplementationGuide.md](documentation/global/ModuleImplementationGuide.md) §§17–30 (structure, components, styling, DataTable, i18n, a11y) |
| **Cosmos DB** | [COSMOS_DB_CONTAINERS_REFERENCE.md](documentation/database/COSMOS_DB_CONTAINERS_REFERENCE.md) (partition key, containers), [ModuleImplementationGuide.md](documentation/global/ModuleImplementationGuide.md) §8 (naming, columns, indexing), §11 (security), [endpoint_templates.md](documentation/endpoints/endpoint_templates.md) (tenantId in service layer) |
| **Events** | ModuleImplementationGuide §9 (RabbitMQ only, DomainEvent, naming), .cursorrules (Event-Driven Communication) |
| **Configuration** | ModuleImplementationGuide §4, .cursorrules (Configuration Standards) |
| **Security** | ModuleImplementationGuide §11, .cursorrules (Security Requirements) |
| **Errors** | ModuleImplementationGuide §10, .cursorrules (Error Handling) |
| **Dependencies and versions** | Root [package.json](package.json) (engines, overrides), [pnpm-workspace.yaml](pnpm-workspace.yaml), [containers/shared/package.json](containers/shared/package.json), ModuleImplementationGuide §5 (Dependency Rules) |

---

## Current implementation alignment

These choices align the master rules with the current codebase. Use the wording below in MASTER_RULES.md.

| Area | Rule wording (match implementation) |
|------|-------------------------------------|
| **Delete behavior** | Current state: mix of soft delete (deletedAt) and hard delete per service. Prefer soft delete for new APIs where audit trail is needed. Document per endpoint in OpenAPI. |
| **Pagination** | Cosmos-backed lists: use continuationToken. Other/search APIs: offset + limit. Document in OpenAPI per endpoint. |
| **Response shape** | Follow ModuleImplementationGuide §7.3 for response format; existing endpoints may differ until updated. |
| **Folder structure** | Standard layout: ModuleImplementationGuide §3. Common variants: `data/` for Cosmos adapters, `services/providers/` for implementations. |
| **Health and metrics** | All containers MUST expose `/health` and `/ready` at server root (not under `/api/v1`). Metrics: GET `/metrics` (path from config). |

---

## Deliverables

### 1. Create `documentation/rules/` and master document

- **Path:** `documentation/rules/MASTER_RULES.md` (or `RULES.md`).
- **Structure:**

  - **Quick-reference table** (at top of MASTER_RULES.md)  
    One table: Layer (Architecture, API, UI, Database, Events, Config, Dependencies/versions, Health & observability, Security) | Key rule(s) | Link to detail. Makes the doc glanceable.

  - **Purpose and scope**  
    Single place for cross-cutting rules; objectives: consistency (paths, tenant model, UI patterns) and security (tenant isolation, no hardcoded URLs/ports/secrets, validated inputs).

  - **Architecture and folder structure**  
    Standard layout: ModuleImplementationGuide §3. Common variants: `data/` for Cosmos adapters, `services/providers/` for implementations. Reference §3 for full layout.

  - **API rules**  
    - State the single rule: client path = gateway path = `/api/v1/<service-path>`.
    - Summarize: client, gateway, UI, ENDPOINTS.md (table or bullets).
    - **Response shape:** Follow ModuleImplementationGuide §7.3 for response format; existing endpoints may differ until updated.
    - **Reference** [API_RULES.md](documentation/endpoints/API_RULES.md) for full text and **reference** [ENDPOINTS.md](documentation/endpoints/ENDPOINTS.md) for canonical paths.
    - Mention enforcement: `pnpm run check:api-rules` and CI job `api-rules`.

  - **UI rules**  
    - **Authentication:** Use single fetch helper (`apiFetch`), credentials via cookie, 401 → redirect to logout/login; no manual `Authorization: Bearer` for normal calls.
    - **Backend access:** Call API Gateway only (`NEXT_PUBLIC_API_BASE_URL`); only `/api/v1/...` paths; no hardcoded base URLs or ports.
    - **Components:** shadcn (sidebar, DataTable, Sonner toasts); first column clickable → detail; last column Actions (Edit/Delete with confirmation); skeletons for loading; Zod + React Hook Form for forms.
    - **Security/consistency:** No raw `fetch` with manual base URL; error handling (generic user message, no raw stack); route protection (public vs protected); TypeScript types for API/form state.
    - **Reference** [ui/requirements.md](documentation/ui/requirements.md) and ModuleImplementationGuide §§17–30 for full UI standards.

  - **Database (Cosmos DB) rules**  
    - **Tenant isolation:** All containers use partition key `/tenantId`; every query MUST include `tenantId` in the partition key; no cross-tenant reads/writes.
    - **Container naming:** `{service}_{container}` (e.g. `auth_sessions`, `shard_shards`); new containers in [shard-manager config](containers/shard-manager/config/cosmos-containers.yaml) and [COSMOS_DB_CONTAINERS_REFERENCE.md](documentation/database/COSMOS_DB_CONTAINERS_REFERENCE.md).
    - **Service layer:** Use `container.item(id, tenantId).read()` (or equivalent); get `tenantId` from request context (e.g. `request.user.tenantId` / `X-Tenant-ID`); parameterized queries only.
    - **Delete:** Current state: mix of soft delete (deletedAt) and hard delete per service. Prefer soft delete for new APIs where audit trail is needed. Document per endpoint in OpenAPI.
    - **Pagination:** Cosmos-backed lists: continuationToken. Other/search APIs: offset + limit. Document in OpenAPI per endpoint.
    - **Security:** No queries without tenantId; gateway/service middleware must enforce tenant context before DB access.
    - **Reference** [COSMOS_DB_CONTAINERS_REFERENCE.md](documentation/database/COSMOS_DB_CONTAINERS_REFERENCE.md) and ModuleImplementationGuide §8 and §11 for naming, indexing, and security.

  - **Events (RabbitMQ) rules**  
    - Broker: RabbitMQ only (no Azure Service Bus / Event Grid).
    - Payload: DomainEvent shape — id, type, version, timestamp, tenantId, source, data; every event MUST include tenantId.
    - Naming: `{domain}.{entity}.{action}` (e.g. `auth.session.created`, `user.updated`).
    - Reference ModuleImplementationGuide §9 for full event contracts and examples.

  - **Configuration rules**  
    - Use YAML config (e.g. `config/default.yaml`) with schema validation (`config/schema.json`).
    - All service URLs and ports from config/env; no hardcoded values.
    - Support env overrides; type config with TypeScript interfaces.
    - Reference ModuleImplementationGuide §4.

  - **Service-to-service rules**  
    - Use ServiceClient (or equivalent) from @coder/shared; URLs from config.
    - Service-to-service calls use JWT with service identity; include correlation ID in logs.
    - Circuit breakers and retries for resilience.
    - Reference ModuleImplementationGuide §5.3 / transform-service-communication skill.

  - **Dependencies and versions rules**  
    - **Shared library:** All containers use **@coder/shared** only for shared types, DB client, events, auth, errors, ServiceClient. Reference it via workspace (e.g. `"@coder/shared": "file:../shared"` or `workspace:*`); use one convention repo-wide.
    - **No cross-container imports:** Never import from another container’s `src/`; use REST or events and types from @coder/shared.
    - **Version alignment:** Node and pnpm versions come from root `package.json` `engines` (e.g. Node >=20, pnpm >=8). TypeScript and key tooling (e.g. ESLint, Vitest) should use the same major/minor version across containers; align with root or shared where defined.
    - **Root overrides:** Use root `package.json` `overrides` / `pnpm.overrides` for known problematic transitive deps so all services get the same resolved version.
    - **New shared needs:** When multiple services need the same dependency or type, add it to `containers/shared` rather than duplicating per container.
    - Reference root [package.json](package.json), [pnpm-workspace.yaml](pnpm-workspace.yaml), and ModuleImplementationGuide §5.

  - **Error handling rules**  
    - Use AppError from @coder/shared/errors; consistent HTTP status codes.
    - Log with context (tenantId, userId, correlationId); never expose internal errors or stack to clients.
    - UI: generic user-facing message only.
    - Reference ModuleImplementationGuide §10.

  - **Security (summary)**  
    - Secrets in environment variables only; use Secret Management module for app secrets.
    - All routes validate tenant (X-Tenant-ID / tenantEnforcementMiddleware where applicable); RBAC for sensitive operations.
    - Input validation (Zod/schema) on all inputs; no raw user input in queries.
    - Audit log sensitive operations (auth, role changes, etc.).
    - Reference ModuleImplementationGuide §11.

  - **Health and observability**  
    - All containers MUST expose `/health` and `/ready` at server root (not under `/api/v1`). Metrics: GET `/metrics` (path from config). Reference ModuleImplementationGuide §15.

  - **Cross-cutting**  
    - Tenant model: tenantId only (no organizationId) in APIs, events, and DB.
    - No hardcoded ports, URLs, or secrets; config/env only.
  - **Enforcement**  
    - API: `pnpm run check:api-rules` (and CI). Optionally note: future checks for UI path usage and DB tenant-in-query could be added.

### 2. Optional: README in `documentation/rules`

- **Path:** `documentation/rules/README.md`.
- **Content:** Short note that [MASTER_RULES.md](documentation/rules/MASTER_RULES.md) is the single entry point for API, UI, Cosmos DB, Events, Configuration, dependencies/versions, and security rules (consistency and security), with links to API_RULES.md, ui/requirements.md, COSMOS_DB_CONTAINERS_REFERENCE.md, and ModuleImplementationGuide for detail.

### 3. Keep existing docs as single source of detail

- **Do not remove or replace** [API_RULES.md](documentation/endpoints/API_RULES.md); the master doc will reference it and summarize.
- **Do not duplicate** full UI or DB guides; the master doc will state rules and point to [ui/requirements.md](documentation/ui/requirements.md), [COSMOS_DB_CONTAINERS_REFERENCE.md](documentation/database/COSMOS_DB_CONTAINERS_REFERENCE.md), and ModuleImplementationGuide.

---

## File summary

| Action | Path |
|--------|------|
| Create | `documentation/rules/MASTER_RULES.md` – master rules: quick-reference table, API, UI, Cosmos DB, Events (RabbitMQ), Configuration, Service-to-service, **Dependencies and versions**, Error handling, Security summary, cross-cutting, enforcement |
| Optional | `documentation/rules/README.md` – entry point and links to detailed docs |

---

## Out of scope (for this plan)

- Changing or moving [API_RULES.md](documentation/endpoints/API_RULES.md).
- Implementing new check scripts for UI or Cosmos DB (only document possibility in “Enforcement”).
- Modifying ModuleImplementationGuide or COSMOS_DB_CONTAINERS_REFERENCE content.
