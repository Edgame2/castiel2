# Changelog

All notable changes to the Authentication module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Tenant-scoped SSO (MASTER_RULES §11):** All SSO operations available under `/api/v1/auth/tenants/:tenantId/sso/*`: GET/PUT/POST config, POST test, POST disable, GET credentials, POST certificate/rotate. Use these paths instead of organization-scoped paths.
- **SAML initiate:** POST `/api/v1/auth/sso/saml/initiate` body accepts `tenantId` (preferred); `organizationId` remains as deprecated alias.
- **RBAC:** Tenant SSO routes use permission `tenants.sso.manage` with resourceType `tenant`. Permission is seeded by user-management and assigned to Admin role alongside deprecated `organizations.sso.manage`.

### Deprecated
- **Organization-scoped SSO:** `/api/v1/auth/organizations/:orgId/sso/*` (config, test, disable, credentials, certificate/rotate) is deprecated. Use `/api/v1/auth/tenants/:tenantId/sso/*` instead. Organization routes remain functional; removal scheduled for 2 versions after deprecation (see MASTER_RULES §1).

### Added (existing)
- **MFA (TOTP):** When `features.multi_factor_auth` (env `FEATURE_MFA`) is enabled: GET `/api/v1/auth/mfa/status`, POST `/api/v1/auth/mfa/enroll`, POST `/api/v1/auth/mfa/verify`, POST `/api/v1/auth/mfa/disable` (requires current TOTP code). `MfaService` and Cosmos container `auth_mfa_secrets` (partition key `/userId`). UI: settings enroll, verify, and disable flows; security page shows MFA status.
- **MFA backup codes:** POST `/api/v1/auth/mfa/backup-codes/generate` (TOTP-gated), POST `/api/v1/auth/mfa/verify-backup` (one-time consume). Container `auth_mfa_backup_codes`. UI: security page generate flow; verify page accepts TOTP or backup code.

### Changed
- **Production-safe URLs:** LoggingService uses only `config.services.logging.url` (no localhost fallback). OAuth redirect frontend URL uses `config.services.main_app.url ?? config.frontend_url`; in production with neither set, returns 500 with clear message instead of redirecting to localhost. SAML acsUrl uses only `config.server.base_url`; throws if missing (no localhost fallback). SAML callback path fixed to `/api/v1/auth/sso/saml/callback`.

## [1.1.0] - 2025-01-22

### Changed
- **BREAKING**: Migrated from PostgreSQL to Azure Cosmos DB NoSQL
- Database connection now uses Cosmos DB endpoint and key
- Container structure: prefixed containers in shared database (`auth_sessions`, `auth_tokens`, etc.)
- Session storage moved to Cosmos DB `auth_sessions` container
- Token storage moved to Cosmos DB `auth_tokens` container
- Provider data moved to Cosmos DB `auth_providers` container
- Password reset tokens moved to Cosmos DB `auth_password_resets` container (TTL: 1 hour)
- Email verification tokens moved to Cosmos DB `auth_email_verifications` container (TTL: 24 hours)
- Login attempts moved to Cosmos DB `auth_login_attempts` container (TTL: 15 minutes)
- SSO configs moved to Cosmos DB `auth_sso_configs` container
- OAuth2 clients moved to Cosmos DB `auth_oauth2_clients` container

### Added
- Cosmos DB configuration in `config/default.yaml`
- Architecture documentation for Cosmos DB migration
- Container structure documentation
- Partition key strategy documentation
- Indexing strategy for Cosmos DB queries

### Migration Notes
- Schema changes documented in `architecture.md`
- No data migration scripts included (handled separately)
- Container naming follows pattern: `{module}_{entity}`

## [1.0.0] - 2025-01-22

### Added
- Initial module extraction from main server
- Multi-provider authentication (Google OAuth, GitHub OAuth, email/password)
- JWT token management with refresh support
- Session management with multi-device support
- Password security features (hashing, history, strength validation)
- Account security (login attempt tracking, account lockout)
- Email verification flow
- Password reset flow
- Provider linking/unlinking
- Event publishing for audit logging and notifications
- Configuration via YAML files with schema validation
- OpenAPI specification
- Health and readiness endpoints

### Security
- Bcrypt password hashing
- Account lockout after failed attempts
- Session revocation capabilities
- Secure token storage



