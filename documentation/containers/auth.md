# auth

Full specification for the Authentication container.

## 1. Reference

### Purpose

User authentication and session management: email/password, Google/GitHub OAuth, SAML/SSO, JWT issue/refresh, sessions, MFA, password reset, email verification. Event-driven email notifications via RabbitMQ to notification-manager.

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3021), `host`, `base_url`
- **cosmos_db:** `endpoint`, `key`, `database_id` (castiel), `containers` (sessions, tokens, providers, password_resets, email_verifications, login_attempts, sso_configs, oauth2_clients, mfa_secrets)
- **jwt:** `secret`, `expiration`, `refresh_expiration`
- **oauth:** google/github `enabled`, `client_id`, `client_secret`, `redirect_uri`
- **sso/saml:** `enabled`
- **session:** `max_sessions_per_user`, `session_timeout`, `cleanup_interval`
- **password:** `min_length`, `require_uppercase/lowercase/numbers/symbols`, `history_count`, `max_age_days`
- **security:** `max_login_attempts`, `lockout_duration_ms`, `require_email_verification`
- **services:** `user_management.url`, `logging.url`, `notification.url`, `secret_management.url`

### Environment variables

- `PORT`, `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_ID`, `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`
- `GOOGLE_OAUTH_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GITHUB_*` equivalents
- `REDIS_URL`, `RABBITMQ_URL`, `USER_MANAGEMENT_URL`, `LOGGING_URL`, `NOTIFICATION_MANAGER_URL`, `SECRET_MANAGEMENT_URL`

### API

Auth routes: register, login, logout, refresh, OAuth callbacks, MFA, password reset/change, email verification, provider linking, session management. See [containers/auth/openapi.yaml](../../containers/auth/openapi.yaml) if present.

### Events

Publishes to RabbitMQ (e.g. auth lifecycle, password reset, verification); notification-manager consumes for emails.

### Dependencies

- **Downstream:** user-management (user context), logging (audit), notification-manager (emails), secret-management.
- **Upstream:** api-gateway proxies `/api/auth/*` to auth.

### Cosmos DB containers

- `auth_sessions`, `auth_tokens`, `auth_providers`, `auth_password_resets`, `auth_email_verifications`, `auth_login_attempts`, `auth_sso_configs`, `auth_oauth2_clients`, `auth_mfa_secrets` (partition key: tenantId where applicable).

---

## 2. Architecture

- **Internal structure:** Fastify server; route modules for auth, OAuth, SSO, MFA, password, sessions; services for session/token/password logic; Cosmos DB and Redis clients.
- **Data flow:** Request → JWT/session validation → Auth service logic → Cosmos/Redis → Events to RabbitMQ.
- **Links:** [containers/auth/README.md](../../containers/auth/README.md), [containers/auth/architecture.md](../../containers/auth/architecture.md) if present.

---

## 3. Deployment

- **Port:** 3021 (host and container).
- **Health:** `/health` or similar (see server).
- **Scaling:** Stateless with shared Cosmos/Redis; scale horizontally.
- **Docker Compose service name:** `auth`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Validated from JWT; used for tenant-scoped data.
- **Partition key:** Cosmos containers use tenantId (or session/user-scoped keys as per schema).
- **Auth:** JWT issued/validated; secrets from env; passwords hashed (bcrypt).

---

## 5. Links

- [containers/auth/README.md](../../containers/auth/README.md)
- [containers/auth/config/default.yaml](../../containers/auth/config/default.yaml)
- [containers/auth/openapi.yaml](../../containers/auth/openapi.yaml) (if present)
