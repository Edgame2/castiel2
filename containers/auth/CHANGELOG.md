# Changelog

All notable changes to the Authentication module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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



