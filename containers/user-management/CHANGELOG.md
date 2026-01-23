# Changelog

All notable changes to the User Management module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-22

### Changed
- **BREAKING**: Migrated from PostgreSQL to Azure Cosmos DB NoSQL
- Database connection now uses Cosmos DB endpoint and key
- Container structure: prefixed containers in shared database (`user_users`, `user_organizations`, etc.)
- User profiles moved to Cosmos DB `user_users` container
- Organizations moved to Cosmos DB `user_organizations` container
- Teams moved to Cosmos DB `user_teams` container
- Roles moved to Cosmos DB `user_roles` container
- Role mappings moved to Cosmos DB `user_role_idp_mappings` container
- Invitations moved to Cosmos DB `user_tenant_invitations` container (TTL: 7 days)
- Join requests moved to Cosmos DB `user_tenant_join_requests` container
- Memberships moved to Cosmos DB `user_organization_memberships` and `user_team_memberships` containers
- External IDs moved to Cosmos DB `user_external_ids` container

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
- User profile management
- Organization management (CRUD operations)
- Team management (CRUD operations, membership)
- Role-based access control (RBAC) with custom roles
- Permission management system
- Organization membership management
- User invitation system with expiration
- Event publishing for audit logging and notifications
- Configuration via YAML files with schema validation
- OpenAPI specification
- Health and readiness endpoints

### Security
- RBAC permission checks on all operations
- Organization-scoped data isolation
- Audit logging for sensitive operations



