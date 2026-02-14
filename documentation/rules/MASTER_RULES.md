# Master Rules

**Purpose:** Single source for cross-cutting rules. Objectives: **consistency** (paths, tenant model, UI patterns, shared lib, versions) and **security** (tenant isolation, no hardcoded URLs/ports/secrets, validated inputs).

---

## Quick-reference

| Layer | Key rules | Detail |
|-------|-----------|--------|
| **Architecture & Code** | Layer-based layout (§3); naming (§14); strict mode, ESLint, Prettier; immutability; IO in services only; feature flags; backward compat; deprecation 2 versions | [§1](#1-architecture--code) |
| **API & Contracts** | REST only; `/api/v1/...`; HTTP method table; status codes; response shape §7.3; pagination; OpenAPI; idempotency, correlation ID, rate limit, timeout, retry | [§2](#2-api--contracts) |
| **UI** | apiFetch only; gateway only; shadcn + Tailwind; loading/empty/skeleton; a11y; breakpoints; form UX | [§3](#3-ui--frontend) |
| **Data & Database** | Partition key tenantId; container naming; delete (mix, prefer soft); pagination; migrations; indexing; audit fields; retention | [§4](#4-data--database) |
| **Events (RabbitMQ)** | RabbitMQ only; DomainEvent + tenantId; naming `{domain}.{entity}.{action}` | [§5](#5-events-rabbitmq) |
| **Messaging / Async** | Schema versioning; idempotent consumers; retry; poison/DLQ; at-least-once; message size | [§6](#6-messaging--async) |
| **Configuration** | YAML + schema; env for secrets; service URLs from config | [§7](#7-configuration) |
| **Dependencies & versions** | @coder/shared only; no cross-container imports; Node/pnpm/TS aligned; root overrides | [§8](#8-dependencies-and-versions) |
| **Error handling & Observability** | AppError; no stack to client; log levels; structured log; tracing; metrics; /health, /ready at root; DLQ | [§9](#9-error-handling--observability) |
| **Security** | JWT; RBAC; secrets in env; PII redaction; encryption; token lifetime; audit; rate limit; CORS | [§10](#10-security) |
| **Multi-Tenancy** | tenantId only; cross-tenant prevention; tenant-aware cache; deletion/migration/export strategy | [§11](#11-multi-tenancy) |

---

## 1. Architecture & Code

- **Folder / module structure:** Layer-based layout per [ModuleImplementationGuide §3](documentation/global/ModuleImplementationGuide.md). Standard: `src/` with `config/`, `routes/`, `services/`, `events/`, `jobs/`, `middleware/`, `types/`, `utils/`. Common variants: `data/` for Cosmos adapters, `services/providers/` for implementations. Ref: §3.
- **Naming:** Files kebab-case; service files PascalCase; classes PascalCase; functions/variables camelCase; constants UPPER_SNAKE_CASE. Ref: [ModuleImplementationGuide §14](documentation/global/ModuleImplementationGuide.md), [.cursorrules](.cursorrules).
- **Code style / linting:** TypeScript strict mode, ESLint, Prettier; max cyclomatic complexity 10; JSDoc for public functions. Ref: .cursorrules.
- **Type safety:** Strict mode; no `any` (use unknown and type guards); branded types for IDs; Zod for validation. Ref: .cursorrules.
- **Immutability:** Prefer immutability; do not mutate input or response objects.
- **Side-effect boundaries:** IO (DB, HTTP, events) in services/adapters only; route handlers orchestrate only.
- **Configuration (env vs config):** Env for secrets and deployment-specific; YAML for behavior. Hierarchy: env > YAML > defaults. Ref: [ModuleImplementationGuide §4](documentation/global/ModuleImplementationGuide.md).
- **Feature flags:** Via config/env or admin API; document in README and OpenAPI.
- **Backward compatibility:** Maintain backward compatibility within /v1; breaking changes only in a new major version. Ref: §7.1.
- **Deprecation policy:** Deprecation notice at least 2 versions before removal; document in CHANGELOG. Ref: §7.1.

---

## 2. API & Contracts

- **REST only:** No RPC or GraphQL; URL pattern `/api/v1/<service-path>`. Client path = gateway path. Ref: [API_RULES.md](documentation/endpoints/API_RULES.md), [ModuleImplementationGuide §7](documentation/global/ModuleImplementationGuide.md).
- **HTTP method usage:** GET list/read, POST create, PUT/PATCH update, DELETE delete. Ref: §7.2.
- **Status code mapping:** 200, 201, 204, 400, 401, 403, 404, 409, 500. Use AppError hierarchy; ref [endpoint_templates §7](documentation/endpoints/endpoint_templates.md) and §10.
- **Request/response shape:** Follow [ModuleImplementationGuide §7.3](documentation/global/ModuleImplementationGuide.md) for response format; existing endpoints may differ until updated.
- **Pagination:** Cosmos-backed lists: continuationToken. Other/search APIs: offset + limit. Document in OpenAPI per endpoint.
- **Filtering and search:** Query params; document in OpenAPI; use parameterized queries; avoid arbitrary query injection.
- **Versioning:** URL /api/v1; backward compat within v1. Ref: [API_RULES.md](documentation/endpoints/API_RULES.md).
- **Idempotency:** POST mutations: support idempotency key (header or body) where duplicate submission is a risk. Ref: dataflow docs, endpoint_templates (delete idempotent).
- **Correlation IDs:** Include correlation/request ID in logs and optionally in response header. Ref: .cursorrules, §10.3.
- **Rate limiting:** Gateway applies rate limiting; 429 + Retry-After; config per route/tenant where applicable.
- **Timeout and retry:** Service timeouts from config; retry with backoff for transient failures; document in service config. Ref: §5.3.
- **OpenAPI:** Each service has openapi.yaml in module root; keep in sync with routes. Ref: .cursorrules, §3.
- **Enforcement:** Run `pnpm run check:api-rules`; CI job `api-rules`. Ref: [API_RULES.md](documentation/endpoints/API_RULES.md), [ENDPOINTS.md](documentation/endpoints/ENDPOINTS.md).

---

## 3. UI / Frontend

- **Authentication:** Single fetch helper (`apiFetch`); credentials via cookie; 401 → redirect to logout/login; no manual `Authorization: Bearer` for normal calls. Ref: [ui/requirements.md](documentation/ui/requirements.md).
- **Backend access:** Call API Gateway only (`NEXT_PUBLIC_API_BASE_URL`); only `/api/v1/...` paths; no hardcoded base URLs or ports.
- **Design system:** shadcn/ui mandatory; Tailwind; no custom CSS. Ref: [ModuleImplementationGuide §22](documentation/global/ModuleImplementationGuide.md), [ui/requirements.md](documentation/ui/requirements.md).
- **Component state:** Pages own server state; lift only when shared. Ref: §18.
- **Loading / empty / skeleton:** Skeleton for loading; shared empty-state pattern for zero items. Ref: ui/requirements, §23.
- **Accessibility:** Semantic HTML, keyboard navigation, ARIA, focus, contrast (WCAG AA), screen reader. Ref: §27.
- **Responsive breakpoints:** Tailwind defaults (sm/md/lg/xl/2xl); no modals on mobile (use full-screen or sheet). Ref: §26.
- **Error display:** Generic user message only; never expose stack or internal errors.
- **Notifications:** Sonner toasts; Toaster in root layout. Ref: ui/requirements.
- **Form UX:** Zod + React Hook Form; label/id; required indicator; validate on submit or blur per pattern. Ref: ui/requirements.

---

## 4. Data & Database

- **Tenant isolation:** All containers use partition key `/tenantId`; every query MUST include tenantId in the partition key; no cross-tenant reads/writes. Ref: [COSMOS_DB_CONTAINERS_REFERENCE.md](documentation/database/COSMOS_DB_CONTAINERS_REFERENCE.md), [ModuleImplementationGuide §8](documentation/global/ModuleImplementationGuide.md).
- **Container naming:** `{service}_{container}` (e.g. `auth_sessions`, `shard_shards`). New containers in [shard-manager config](containers/shard-manager/config/cosmos-containers.yaml) and COSMOS_DB_CONTAINERS_REFERENCE.
- **Service layer:** Use `container.item(id, tenantId).read()` (or equivalent); get tenantId from request context (e.g. `request.user.tenantId` / X-Tenant-ID); parameterized queries only.
- **Delete:** Current state: mix of soft delete (deletedAt) and hard delete per service. Prefer soft delete for new APIs where audit trail is needed. Document per endpoint in OpenAPI.
- **Pagination:** Cosmos-backed lists: continuationToken. Other/search APIs: offset + limit. Document in OpenAPI per endpoint.
- **Schema versioning / migrations:** One migration per change; idempotent; reversible when possible; never modify applied migrations. Ref: §8.5.
- **Indexing:** Index partition key and common filter columns; composite indexes for common query patterns. Ref: §8.4.
- **Transactions:** Prefer single-partition operations; document any cross-document patterns.
- **Audit fields:** Required: createdAt, updatedAt; optional: deletedAt, createdBy. Ref: §8.3, [endpoint_templates](documentation/endpoints/endpoint_templates.md).
- **Data ownership:** Data owned by service; access via API or events only; no direct access to another module’s data. Ref: .cursorrules, §5.
- **Referential integrity:** Logical references (e.g. IDs); validate in application layer where required (Cosmos has no FK).
- **ID format:** Use UUID for resource IDs; document in OpenAPI if ULID or other format is used. Ref: endpoint_templates.
- **Data retention / archival:** Retention and TTL per container; document in COSMOS_DB_CONTAINERS_REFERENCE or service README.

---

## 5. Events (RabbitMQ)

- **Broker:** RabbitMQ only; no Azure Service Bus, Event Grid, or other message brokers. Ref: [ModuleImplementationGuide §9](documentation/global/ModuleImplementationGuide.md), .cursorrules.
- **Payload:** DomainEvent shape: id, type, version, timestamp, tenantId, source, data; every event MUST include tenantId.
- **Naming:** `{domain}.{entity}.{action}` (e.g. `auth.session.created`, `user.updated`). Ref: §9.
- **Documentation:** Document all published and consumed events (e.g. logs-events.md, notifications-events.md).

---

## 6. Messaging / Async

- **Message schema versioning:** Event/message version in payload; consumers tolerate unknown fields for backward compatibility.
- **Idempotent consumers:** Consumers must be idempotent or use deduplication (e.g. by event id). Ref: dataflow docs.
- **Retry policy:** Retry with backoff; max attempts in config; document per consumer.
- **Poison message handling:** After N failures, move to DLQ or dead-letter; do not block queue.
- **Ordering:** Document if ordering is required (e.g. single consumer per partition); default at-least-once.
- **Delivery semantics:** Default at-least-once; exactly-once only if documented and implemented.
- **Message size:** Keep payloads within broker limits; avoid large payloads; reference external IDs when needed.
- **Event sourcing:** Document where used if adopted.

---

## 7. Configuration

- Use YAML config (e.g. `config/default.yaml`) with schema validation (`config/schema.json`). Ref: [ModuleImplementationGuide §4](documentation/global/ModuleImplementationGuide.md).
- All service URLs and ports from config or env; no hardcoded values.
- Support env overrides; type config with TypeScript interfaces.
- Service URLs MUST come from config, never hardcoded. Ref: .cursorrules.

---

## 8. Dependencies and Versions

- **Shared library:** All containers use **@coder/shared** only for shared types, DB client, events, auth, errors, ServiceClient. Reference via workspace (`"@coder/shared": "file:../shared"` or `workspace:*`); use one convention repo-wide.
- **No cross-container imports:** Never import from another container’s `src/`; use REST or events and types from @coder/shared.
- **Version alignment:** Node and pnpm from root `package.json` engines (e.g. Node >=20, pnpm >=8). TypeScript and key tooling (ESLint, Vitest) same major/minor across containers; align with root or shared where defined.
- **Root overrides:** Use root `package.json` overrides / pnpm.overrides for known problematic transitive deps so all services get the same resolved version.
- **New shared needs:** When multiple services need the same dependency or type, add it to `containers/shared` rather than duplicating per container. Ref: root [package.json](package.json), [pnpm-workspace.yaml](pnpm-workspace.yaml), [ModuleImplementationGuide §5](documentation/global/ModuleImplementationGuide.md).

---

## 9. Error Handling & Observability

- **Error taxonomy:** Use AppError hierarchy (ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError); map to HTTP status. Ref: [ModuleImplementationGuide §10](documentation/global/ModuleImplementationGuide.md).
- **User-safe vs internal:** Production: generic user-facing message only; never expose internal errors or stack to clients. Log with context (tenantId, userId, correlationId). Ref: §10.3, .cursorrules.
- **Log levels:** ERROR, WARN, INFO, DEBUG (DEBUG off in production). Ref: §15.4.
- **Structured logging:** Use logger with object context; no console.log. Ref: §15.3.
- **Tracing:** Application Insights / OTel; correlation IDs. Ref: §15.1.
- **Metrics:** Prometheus format (prom-client); standard metrics (e.g. http_requests_total, http_request_duration_seconds) plus app-specific; GET /metrics (path from config). Ref: §15.5.
- **Health checks:** All containers MUST expose `/health` (liveness) and `/ready` (readiness) at server root (not under /api/v1). Ref: §15.2.
- **Alert thresholds:** Define in deployment/monitoring; document in service README if service-specific.
- **Dead letter / replay:** Failed messages: DLQ or equivalent; document replay/redrive policy per consumer.

---

## 10. Security

- **Authentication:** JWT; UI uses cookie (apiFetch with credentials); gateway validates. Ref: [ui/requirements](documentation/ui/requirements.md), [ModuleImplementationGuide §11.1](documentation/global/ModuleImplementationGuide.md).
- **Authorization (RBAC):** requirePermission() for sensitive routes; tenant-scoped. Document role names and permissions in auth/user-management docs. Ref: §11.2, [endpoint_templates §8](documentation/endpoints/endpoint_templates.md).
- **Secrets:** Environment variables only; use Secret Management module for app secrets. Ref: .cursorrules, §11.4.
- **PII handling:** Redact PII in logs; configurable collection per resource type. Ref: §11.5.
- **Data encryption:** Encryption at rest (Cosmos/managed); in transit TLS; document key handling if app-level.
- **Token lifetime:** Access/refresh lifetime from config; document in auth README.
- **Audit logging:** All auth operations and sensitive ops (role changes, etc.) must be audit logged. Ref: .cursorrules, §11.
- **Rate limit abuse:** 429 + Retry-After; log repeated abuse.
- **Input sanitization:** Validation (Zod/schema) on all inputs; no raw user input in queries. Ref: §11.3.
- **CORS:** Configured at gateway; allow only required origins.

---

## 11. Multi-Tenancy

- **Tenant model:** tenantId only (no organizationId) in APIs, events, and DB. Ref: .cursorrules, COSMOS_DB_CONTAINERS_REFERENCE.
- **TenantId segregation:** Partition key /tenantId; all queries scoped by tenantId; no cross-tenant reads/writes.
- **Cross-tenant access prevention:** Reject cross-tenant requests; validate X-Tenant-ID against user context. Ref: gap-analysis docs.
- **Tenant-aware caching:** Cache keys MUST include tenantId (or namespace); no cross-tenant cache.
- **Tenant-aware indexing:** Partition key = tenantId; indexing rules in §8.4.
- **Tenant deletion:** Define strategy (soft-disable, data purge) per service; document.
- **Tenant migration:** Document process and tools if supported.
- **Tenant data export:** Document format and endpoint if required (e.g. GDPR).

---

## Cross-cutting

- **Tenant model:** tenantId only in APIs, events, and DB; no organizationId.
- **No hardcoded ports, URLs, or secrets:** Config or env only.
- **Service-to-service:** Use ServiceClient from @coder/shared; URLs from config; JWT with service identity; correlation ID in logs; circuit breakers and retries. Ref: ModuleImplementationGuide §5.3.

---

## Enforcement

- **API:** `pnpm run check:api-rules` (CI job `api-rules`). Ref: [API_RULES.md](documentation/endpoints/API_RULES.md).
- **Compliance audit:** Full compliance is audited per [MASTER_RULES_COMPLIANCE.md](documentation/rules/MASTER_RULES_COMPLIANCE.md); see per-section status and exceptions.
- Future checks for UI path usage and DB tenant-in-query may be added.
