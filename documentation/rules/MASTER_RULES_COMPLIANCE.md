# MASTER_RULES Compliance Audit

**Purpose:** Track compliance with [MASTER_RULES.md](MASTER_RULES.md) across the system. Remediate by refactoring; document exceptions and follow-ups without removing features.

**Last audit:** Applied as part of "Apply MASTER_RULES system-wide" plan (endpoint alignment, auth SSO tenantId, full-audit baseline).

---

## Audit summary

| Section | Scope | Status | Notes |
|---------|--------|--------|-------|
| §1 Architecture & Code | Folder layout, naming, strict mode, JSDoc, immutability, deprecation | Baseline | Use validate-container-compliance skill per container; exceptions in container READMEs |
| §2 API & Contracts | REST, /api/v1, methods, status codes, OpenAPI, pagination | Addressed | Phase 1 endpoint alignment; check:api-rules in CI |
| §3 UI | apiFetch only, gateway only, shadcn, loading/empty, a11y | Addressed | UI uses /api/v1 only; apiFetch from single helper |
| §4 Data & Database | Partition key tenantId, container naming, delete, migrations | Baseline | Use write-tenant-isolated-queries and validate-tenant-isolation skills |
| §5 Events | RabbitMQ only, DomainEvent + tenantId, naming | Baseline | Per-service event docs (logs-events.md etc.) |
| §6 Messaging | Schema versioning, idempotent consumers, retry, DLQ | Baseline | Document per consumer |
| §7 Configuration | YAML + schema, env for secrets, no hardcoded URLs | Partial | Test setup files use localhost/ports for test env only; prod from config |
| §8 Dependencies | @coder/shared only, no cross-container imports | Baseline | Grep for cross-container imports when adding features |
| §9 Error & Observability | AppError, /health, /ready, logging, metrics | Addressed | Containers expose /health, /ready at root |
| §10 Security | JWT, RBAC, secrets in env, CORS, rate limit | Baseline | Gateway + auth middleware |
| §11 Multi-Tenancy | tenantId only, cross-tenant prevention | Addressed | Auth SSO migrated to tenant paths; org paths deprecated |

---

## Checks run (systematic)

- **API paths:** `pnpm run check:api-rules` (ENDPOINTS.md, gateway coverage, UI paths) — passing.
- **Hardcoded ports/URLs in src:** Auth has dev-only fallback `http://localhost:3000` when not in production and config unset; test setup files use localhost/ports for test env (acceptable). No hardcoded prod URLs in route or service code.
- **Organization vs tenant in routes:** Auth SSO has tenant-scoped routes; organization SSO deprecated. SAML initiate accepts `tenantId` (preferred) and `organizationId` (deprecated alias).
- **/health, /ready:** Present at server root in auth, api-gateway, user-management, risk-analytics, and other containers.

---

## Exceptions and follow-up

1. **Auth SAML initiate:** Request body now accepts `tenantId` (preferred); `organizationId` remains supported as a deprecated alias (log warning when used). See auth CHANGELOG.
2. **Test setup files:** Localhost URLs and fixed ports in `tests/setup.ts` are for test environment only; no change required per MASTER_RULES (config for behavior, env for secrets/deployment).
3. **Per-container §1 (§4, §5, §6, §8) depth:** Full per-container audit can be run using validate-container-compliance and validate-tenant-isolation skills; exceptions documented in each container README or here as needed.

---

## Enforcement

- **API path rules:** CI runs `pnpm run check:api-rules` (see [API_RULES.md](../endpoints/API_RULES.md)).
- **Full compliance:** Re-run section-specific checks when adding features or before release; update this file and MASTER_RULES as needed.

## Optional future work

- Run validate-container-compliance and validate-tenant-isolation (see [.cursor/skills](../../.cursor/skills)) on each container for deeper §1, §4, §11 checks.
- **Done:** CI job `tenant-in-query` runs `node scripts/check-tenant-in-query.mjs` (auth, user-management, logging). Script: `pnpm run check:tenant-in-query`.
- **Done:** `tenants.sso.manage` permission added (user-management seed); tenant SSO routes use it; auth RBAC supports resourceType `tenant`. Remove `organizations.sso.manage` when organization SSO routes are removed.
