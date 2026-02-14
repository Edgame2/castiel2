# Rules

This folder holds the **master rules** for the Castiel platform.

## Entry point

**[MASTER_RULES.md](MASTER_RULES.md)** is the single entry point for:

- Architecture & Code (folder structure, naming, linting, type safety, feature flags, backward compatibility, deprecation)
- API & Contracts (REST, paths, HTTP methods, status codes, pagination, idempotency, rate limit, OpenAPI)
- UI / Frontend (auth, apiFetch, design system, a11y, responsive, forms)
- Data & Database (Cosmos DB, tenant isolation, delete/pagination, migrations, indexing, retention)
- Events (RabbitMQ, DomainEvent, naming)
- Messaging / Async (schema versioning, idempotent consumers, retry, DLQ, ordering)
- Configuration (YAML, env, schema)
- Dependencies and versions (@coder/shared, version alignment)
- Error handling & Observability (AppError, logging, tracing, metrics, health, DLQ)
- Security (auth, RBAC, secrets, PII, encryption, CORS)
- Multi-Tenancy (tenantId, cross-tenant prevention, cache, deletion, migration, export)

Objectives: **consistency** and **security** across services and UI.

## Detailed documentation

The master rules summarize and link to:

| Topic | Where to look |
|-------|----------------|
| API paths and gateway | [documentation/endpoints/API_RULES.md](../endpoints/API_RULES.md), [ENDPOINTS.md](../endpoints/ENDPOINTS.md) |
| UI requirements | [documentation/ui/requirements.md](../ui/requirements.md), [ui/pages.md](../ui/pages.md) |
| Cosmos DB containers | [documentation/database/COSMOS_DB_CONTAINERS_REFERENCE.md](../database/COSMOS_DB_CONTAINERS_REFERENCE.md) |
| Endpoint templates | [documentation/endpoints/endpoint_templates.md](../endpoints/endpoint_templates.md) |
| Module structure, config, API, DB, events, errors, security, naming, observability, UI | [documentation/global/ModuleImplementationGuide.md](../global/ModuleImplementationGuide.md) |
| Repo-wide conventions | [.cursorrules](../../.cursorrules) |

## Enforcement

- **API path rules:** Run `pnpm run check:api-rules` (CI job `api-rules`).
- **Full compliance:** Audited per [MASTER_RULES_COMPLIANCE.md](MASTER_RULES_COMPLIANCE.md) and per-section checklists; re-run when adding features or before release.
- Other checks (UI paths, DB tenant-in-query) may be added later.
