# Gap Analysis: UI, User Management, Auth, API Gateway

**Date:** 2026-02-01  
**Scope:** ui, containers/user-management, containers/auth, containers/api-gateway  
**Standards:** ModuleImplementationGuide, .cursorrules

---

## Executive Summary

| Container       | Compliance | Critical Gaps |
|----------------|------------|---------------|
| **UI**         | Good       | Config schema optional; README mentions hardcoded port |
| **user-management** | Partial | No X-Tenant-ID validation on routes; test coverage sparse |
| **auth**       | Partial    | Runtime URL fallbacks; gateway blocks public auth routes |
| **api-gateway**| Partial    | Tenant middleware applied to /api/v1/auth (blocks login); no tests |

---

## 1. UI

### 1.1 Structure

| Item           | Status |
|----------------|--------|
| Dockerfile     | Present |
| README.md      | Present |
| CHANGELOG.md   | Present |
| config/default.yaml | Present |
| config/schema.json   | **Missing** (optional for frontend) |
| openapi.yaml   | N/A (frontend) |

### 1.2 Configuration

- **API base URL:** From `NEXT_PUBLIC_API_BASE_URL`; default in config `http://localhost:3002` is env override only (acceptable for dev).
- **Runtime:** All API calls use `process.env.NEXT_PUBLIC_API_BASE_URL || ''`; no hardcoded production URLs. Placeholders (e.g. `https://app.example.com`) are UI placeholders only.

### 1.3 Gaps

- README says "API Gateway running on port 3002" (default); API Gateway URL configurable via NEXT_PUBLIC_API_BASE_URL.
- No config/schema.json for UI config (optional; other containers have it).

---

## 2. User Management

### 2.1 Structure

| Item           | Status |
|----------------|--------|
| Dockerfile, README, CHANGELOG | Present |
| config/default.yaml, schema.json | Present |
| openapi.yaml   | Present |
| docs/ (events) | Present |
| src/server.ts  | Present |

### 2.2 Configuration

- Service URLs from config/env with localhost fallbacks (dev only). No hardcoded production URLs in code.

### 2.3 Tenant Isolation

- **X-Tenant-ID:** Not validated or used on routes. Routes rely on `authenticateRequest` and `(request as any).user`; no check that the request’s tenant (from gateway) matches the resource.
- **Data:** ApiKeyService and user-management use tenantId as partition key; data is tenant-scoped.
- **Gap:** When called via gateway with X-Tenant-ID, user-management does not enforce that the user’s context (e.g. current tenant) matches X-Tenant-ID. Risk: cross-tenant access if gateway is bypassed or misconfigured.

### 2.4 Tests

- Unit: OrganizationService.test.ts only. Other services (UserService, TeamService, RoleService, InvitationService, ApiKeyService) have no unit tests.
- Integration: None found for routes.
- **Gap:** Below 80% coverage; many services untested.

---

## 3. Auth

### 3.1 Structure

| Item           | Status |
|----------------|--------|
| Dockerfile, README, CHANGELOG | Present |
| config/default.yaml, schema.json | Present |
| openapi.yaml, docs/ (events) | Present |
| Tests (unit + integration) | Present |

### 3.2 Configuration

- Service URLs and server base_url from config/env. JWT, Redis, RabbitMQ from config.

### 3.3 Runtime URL Fallbacks (Gaps)

- **LoggingService.ts:** `this.baseUrl = config.services?.logging?.url || 'http://localhost:3014'`. If logging URL is not set, uses localhost instead of failing.
- **auth.ts (routes):** `frontendUrl = config.frontend_url || 'http://localhost:3000'` (lines ~309, ~602). Redirects after login use this fallback.
- **SAMLHandler.ts:** `acsUrl = config.server.base_url || 'http://localhost:3000'`. Wrong default port (auth is 3021); should be config-only or fail when missing.
- **server.ts / auth.ts:** OAuth callback URLs use `http://localhost:${config.server.port}/api/v1/auth/.../callback` when provider redirect_uri env vars are unset (dev fallback acceptable if documented).

**Recommendation:** For production, require config/env for logging URL, frontend URL, and SAML base URL; remove or restrict localhost fallbacks (e.g. only when NODE_ENV=development).

### 3.4 Tenant

- tenantId appears in events and SSO/SecretManagement; no route-level X-Tenant-ID enforcement (auth is pre-login for many routes). Acceptable if gateway is sole entry and auth public routes are excluded from tenant check.

### 3.5 Tests

- Unit tests for AuthProviderService, EmailVerificationService, PasswordResetService, SAMLHandler, SecretManagementClient, SessionService, passwordUtils.
- Integration test for auth routes.
- Test setup uses localhost URLs for mocks — acceptable.

---

## 4. API Gateway

### 4.1 Structure

| Item           | Status |
|----------------|--------|
| Dockerfile, README, CHANGELOG | Present |
| config/default.yaml, schema.json | Present |
| openapi.yaml   | Present |
| architecture.md | Present |
| docs/ (events) | N/A (gateway does not publish domain events) |

### 4.2 Configuration

- All service URLs from config/env with localhost defaults. No hardcoded production URLs.

### 4.3 Tenant Validation

- **Behavior:** tenantValidationMiddleware extracts tenantId from JWT, validates UUID, injects X-Tenant-ID. Applied to all `/api/*` in `routes/index.ts` (single catch-all with preHandler).
- **Critical gap:** Public auth routes are under `/api/*` and do not send a Bearer token. So:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/register`
  - `GET /api/v1/auth/google/callback`, `/api/v1/auth/oauth/github/callback`
  - `GET /api/v1/auth/sso/saml/callback`
  - Password reset, etc.  
  All get **401 Unauthorized** from the gateway before reaching the auth service.
- **Recommendation:** Skip tenant validation for public auth paths (e.g. `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/*/callback`, `/api/v1/auth/sso/*`, password-reset). Allow unauthenticated access only for these paths; keep tenant validation for all other `/api/*`.

### 4.4 Rate Limiting / Proxy

- Rate limit: per user/tenant; health/ready excluded.
- ProxyService forwards X-Tenant-ID when present. Route list is config-driven.

### 4.5 Tests

- **Gap:** Only tests/setup.ts and tests/README.md. No unit tests for ProxyService, tenantValidationMiddleware, or rateLimitMiddleware; no integration tests for routes. Fails "minimum 80% test coverage" and "unit tests for all services and utilities".

---

## 5. Cross-Cutting

### 5.1 Hardcoded Ports/URLs

- **Config defaults:** localhost URLs in default.yaml are env fallbacks (e.g. `AUTH_URL:-http://localhost:3021`). Acceptable for local dev; production must set env vars.
- **Code:** Auth has runtime fallbacks in LoggingService, frontendUrl, and SAMLHandler (see §3.3). No hardcoded production URLs in UI, user-management, or api-gateway code.

### 5.2 Security

- **Gateway:** JWT validation and tenant injection are central. Fix public auth path exclusion so login/register work.
- **user-management:** Add optional X-Tenant-ID validation on routes that return tenant-scoped data (when called via gateway).
- **auth:** Audit logging and event publishing present; fix URL fallbacks for production.

---

## 6. Recommendations (Priority)

| Priority | Container       | Action |
|----------|-----------------|--------|
| P0       | api-gateway     | Exclude public auth paths from tenant validation (login, register, OAuth/SAML callbacks, password-reset) so unauthenticated auth flows work. |
| P1       | auth            | Remove or gate runtime URL fallbacks (LoggingService, frontendUrl, SAMLHandler); require config/env in production. Fix SAML acsUrl default (port 3021, not 3000). |
| P2       | api-gateway     | Add unit tests for ProxyService, tenantValidation, rateLimit; add route integration tests. |
| P2       | user-management | Add X-Tenant-ID validation (or explicit "no tenant" for org-list) on routes; add unit tests for UserService, TeamService, RoleService, InvitationService, ApiKeyService. |
| P3       | UI              | Update README to describe API URL via env; add config/schema.json if config grows. |

---

## 7. Automated verification

- **P0 (api-gateway public auth):** Implemented. Public auth path prefixes are excluded from tenant validation in `containers/api-gateway/src/middleware/tenantValidation.ts`.
- **P2 (api-gateway tests):** Implemented. Unit tests for ProxyService, tenantValidation, rateLimit and integration tests for routes exist in `containers/api-gateway/tests/`.
- **Smoke test:** Run `node scripts/smoke-test-auth-gateway.mjs` (or `GATEWAY_URL=<url> node scripts/smoke-test-auth-gateway.mjs`). Requires the API Gateway to be running; optionally run auth and user-management for full flow. The script checks that public auth paths are not blocked (non-401) and that protected paths return 401 without a token.

---

*End of gap analysis.*
