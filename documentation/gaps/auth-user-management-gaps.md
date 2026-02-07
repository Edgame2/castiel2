# Gap Analysis: Authentication & User Management

**Date:** 2026-02-07  
**Scope:** containers/auth, containers/user-management  
**Standards:** ModuleImplementationGuide, .cursorrules

---

## Executive Summary

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **Auth** | Partial | MFA not implemented; API keys / machine auth missing |
| **User Management** | Partial | List/Get user routes missing; auth event consumers not implemented; README vs routes mismatch |

---

## 1. Authentication Gaps

### 1.1 Multi-Factor Authentication (MFA)

| Item | Status |
|------|--------|
| Config flag `features.multi_factor_auth` | Present (default: false) |
| Container `auth_mfa_secrets` | Defined in config/architecture |
| MFA routes (enroll, verify TOTP, backup codes) | **Missing** |
| MFA services (TOTP, backup codes) | **Missing** |

**Detail:** Architecture lists “MFA support (TOTP, SMS, authenticator apps)” under Future Enhancements. No enrollment or verification flows exist. README lists `auth_mfa_secrets` in database setup but no code uses it.

### 1.2 API Keys / Machine Authentication

| Item | Status |
|------|--------|
| API key issuance or validation | **Missing** |
| Service / machine-to-machine auth | **Missing** |

**Detail:** Only user JWT flows are implemented. No support for API keys or service-account style tokens for programmatic or service-to-service access.

### 1.3 Rate Limiting

| Item | Status |
|------|--------|
| Password reset rate limit (Redis) | Implemented |
| Login attempt tracking & account lockout | Implemented |
| General rate limiting on auth routes (e.g. per-IP on /login) | **Missing** |

**Detail:** LoginAttemptService and PasswordResetService handle their own limits. No middleware for broad per-IP or per-endpoint rate limiting on auth routes.

---

## 2. User Management Gaps

### 2.1 Missing User API Endpoints

README and container docs document:

| Documented Endpoint | Implemented | Notes |
|--------------------|-------------|--------|
| `GET /api/v1/users` | **No** | List users — no route in `src/routes/users.ts` |
| `GET /api/v1/users/:id` | **No** | Get user profile — `UserService.getUserProfile()` exists but no route exposes it |
| `PUT /api/v1/users/:id` | **No** | Update user profile — only `PUT /api/v1/users/me` exists (current user only) |

**Detail:** `containers/user-management/src/routes/users.ts` only implements: `PUT /api/v1/users/me`, `GET/DELETE/POST` for `/users/me/sessions`, `POST /users/me/deactivate`, `POST /users/:userId/deactivate`, `POST /users/:userId/reactivate`, `DELETE /users/:userId`. List and get-by-id are missing; admin “update another user” is missing if intended.

### 2.2 Auth Event Consumers Not Implemented

Config and README state that user-management consumes:

| Event | Documented behavior | Implementation |
|-------|---------------------|----------------|
| `auth.login.success` | Update user’s last login timestamp | **Missing** — no consumer code |
| `auth.login.failed` | Track failed login attempts | **Missing** — no consumer code |
| `user.registered` | Create/initialize user profile on registration | **Missing** — no consumer code |

**Detail:** `config/default.yaml` has RabbitMQ bindings for these events. There is no `events/consumers` (or equivalent) in user-management; only event publishers exist. Server startup does not register any consumer. So last-login updates and post-registration profile initialization are not performed.

### 2.3 Documentation vs Implementation

- **README** lists `GET /api/v1/users`, `GET /api/v1/users/:id`, `PUT /api/v1/users/:id` as key endpoints.
- **Actual routes** do not provide list users, get user by id, or update user by id (only update self via `/me`).
- **Action:** Either implement the missing endpoints (with tenant isolation and RBAC) or update README and OpenAPI to match current behavior.

---

## 3. Cross-References

- **Auth:** [containers/auth/README.md](../../containers/auth/README.md), [containers/auth/architecture.md](../../containers/auth/architecture.md)
- **User Management:** [containers/user-management/README.md](../../containers/user-management/README.md), [containers/user-management/architecture.md](../../containers/user-management/architecture.md)
- **Broader gap analysis:** [gap-analysis-ui-auth-usermgmt-gateway.md](../gap-analysis-ui-auth-usermgmt-gateway.md) (gateway tenant validation, auth URL fallbacks, user-management tenant and tests).

---

## 4. Recommendations (Priority)

| Priority | Area | Action |
|----------|------|--------|
| P1 | User Management | Implement `GET /api/v1/users` (list) and `GET /api/v1/users/:id` (get profile) with tenant isolation and RBAC; add `PUT /api/v1/users/:id` for admin if required. |
| P1 | User Management | Implement RabbitMQ consumers for `auth.login.success`, `auth.login.failed`, `user.registered` (last-login update, optional failed-login tracking, create profile on registration). |
| P2 | User Management | Align README and OpenAPI with implemented routes (or complete missing endpoints). |
| P2 | Auth | Implement MFA (TOTP, backup codes) using `auth_mfa_secrets` and document in README/OpenAPI. |
| P3 | Auth | Add API key or machine-auth mechanism if required for service-to-service or programmatic access. |
| P3 | Auth | Consider general rate-limiting middleware for auth routes (e.g. per-IP on /login). |

---

*End of auth–user-management gap analysis.*
