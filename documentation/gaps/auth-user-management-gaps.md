# Gap Analysis: Authentication & User Management

**Date:** 2026-02-07  
**Scope:** containers/auth, containers/user-management  
**Standards:** ModuleImplementationGuide, .cursorrules

---

## Executive Summary

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **Auth** | Resolved | MFA (TOTP + backup codes), per-IP rate limiting, API keys (create + validate) implemented |
| **User Management** | Resolved | GET/PUT /api/v1/users, /users/:id, AuthEventConsumer implemented; README/OpenAPI aligned |

---

## 1. Authentication Gaps

### 1.1 Multi-Factor Authentication (MFA)

| Item | Status |
|------|--------|
| Config flag `features.multi_factor_auth` | Present (default: false, env `FEATURE_MFA`) |
| Container `auth_mfa_secrets` | Defined; partition key `/userId`; created at startup via ensureContainer |
| MFA routes | **Implemented** — GET `mfa/status`, POST `mfa/enroll`, POST `mfa/verify`, POST `mfa/verify-backup`, POST `mfa/disable`, POST `mfa/backup-codes/generate` (guarded by feature flag) |
| MFA service (TOTP) | **Implemented** — `MfaService` (enroll, verify, isEnrolled, disable, generateBackupCodes, verifyBackupCode) |
| Backup codes | **Implemented** — generate (TOTP-gated), verify-backup (one-time consume), container `auth_mfa_backup_codes`; UI on security and verify pages |

**Detail:** TOTP and backup codes are implemented. Enroll returns secret and provisioning URI; verify validates TOTP or backup code. Backup codes: generate (returns codes once), verify-backup marks code used. README and OpenAPI document all endpoints.

### 1.2 API Keys / Machine Authentication

| Item | Status |
|------|--------|
| API key issuance or validation | **Implemented** |
| Service / machine-to-machine auth | **Implemented** (user-scoped API keys) |

**Detail:** When `features.api_keys` is enabled (env `FEATURE_API_KEYS`, default false): POST `/api/v1/auth/api-keys` (JWT only, body `{ name, expiresInDays? }`) creates a key; response includes `key` (format `ak_<id>_<secret>`) once. GET `/api/v1/auth/api-keys` lists keys for the current user (id, name, createdAt, expiresAt; no secrets). DELETE `/api/v1/auth/api-keys/:id` revokes a key (own keys only). Keys are validated via `Authorization: Bearer ak_...` or `X-API-Key`; auth middleware sets `request.user.id` and `request.organizationId` (tenantId). Storage: Cosmos container `auth_api_keys` (partition key `/id`).

### 1.3 Rate Limiting

| Item | Status |
|------|--------|
| Password reset rate limit (Redis) | Implemented |
| Login attempt tracking & account lockout | Implemented |
| General rate limiting on auth routes (e.g. per-IP on /login) | **Implemented** |

**Detail:** LoginAttemptService and PasswordResetService handle their own limits. Per-IP rate limiting middleware applies to POST /login, /register, /forgot-password, /reset-password, /login/complete-mfa, /verify-email, /resend-verification. Config: `rate_limit.enabled`, `rate_limit.window_seconds`, `rate_limit.max_per_window`; store in Redis; 429 with Retry-After when exceeded.

---

## 2. User Management Gaps

**Status (per implementation plan):** GET/PUT `/api/v1/users`, `/api/v1/users/:id`, and AuthEventConsumer are implemented; README/OpenAPI aligned. The following tables reflect current state.

### 2.1 User API Endpoints

| Documented Endpoint | Implemented | Notes |
|--------------------|-------------|--------|
| `GET /api/v1/users` | **Yes** | List users (tenant-scoped, RBAC) |
| `GET /api/v1/users/:id` | **Yes** | Get user profile by id |
| `PUT /api/v1/users/:id` | **Yes** | Admin update (tenant + RBAC) |

**Detail:** Routes and AuthEventConsumer are implemented per the implementation plan; README and OpenAPI are aligned.

### 2.2 Auth Event Consumers

| Event | Documented behavior | Implementation |
|-------|---------------------|----------------|
| `auth.login.success` | Update user’s last login timestamp | **Implemented** — AuthEventConsumer in events/consumers |
| `auth.login.failed` | Track failed login attempts | **Implemented** (optional tracking) |
| `user.registered` | Create/initialize user profile on registration | **Implemented** |

**Detail:** AuthEventConsumer is registered on server startup; bindings in config/default.yaml.

### 2.3 Documentation vs Implementation

README and OpenAPI are aligned with implemented routes (list users, get by id, put by id, AuthEventConsumer).

---

## 3. Cross-References

- **Auth:** [containers/auth/README.md](../../containers/auth/README.md), [containers/auth/architecture.md](../../containers/auth/architecture.md)
- **User Management:** [containers/user-management/README.md](../../containers/user-management/README.md), [containers/user-management/architecture.md](../../containers/user-management/architecture.md)
- **Broader gap analysis:** [gap-analysis-ui-auth-usermgmt-gateway.md](../gap-analysis-ui-auth-usermgmt-gateway.md) (gateway tenant validation, auth URL fallbacks, user-management tenant and tests).

---

## 4. Recommendations (Priority)

| Priority | Area | Action |
|----------|------|--------|
| P1 | User Management | Done — GET/PUT /api/v1/users, /users/:id; tenant isolation and RBAC. |
| P1 | User Management | Done — AuthEventConsumer for auth.login.success, auth.login.failed, user.registered. |
| P2 | User Management | Done — README and OpenAPI aligned. |
| P2 | Auth | MFA (TOTP) implemented; backup codes optional. |
| P3 | Auth | Done — API key create (POST /api/v1/auth/api-keys) and validate (Bearer or X-API-Key) when features.api_keys enabled. |
| P3 | Auth | Consider general rate-limiting middleware for auth routes (e.g. per-IP on /login). |

---

*End of auth–user-management gap analysis.*
