# Changelog

All notable changes to the User Management module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **SSO permissions (RBAC):** System permissions `tenants.sso.manage` (tenant SSO config; used by auth service) and `organizations.sso.manage` (deprecated, for backward compat). Both assigned to Admin role. Re-run seed for existing tenants to grant `tenants.sso.manage` to Admin.
- **Admin update user profile:** `PUT /api/v1/users/:id` allows same-org or Super Admin to update another user's profile (name, firstName, lastName, etc.). Use `PUT /api/v1/users/me` for self. RBAC via existing `ensureCanAccessUser`; publishes `user.profile_updated` with `updatedBy`. README and OpenAPI (openapi.yaml) updated with users routes (list, me, :id get/put).
- **Tenant match middleware:** `requireTenantMatch` ensures X-Tenant-ID (when present from gateway) matches the resource tenant (`params.tenantId`); returns 403 otherwise. Applied to all tenant-scoped routes (`/api/v1/tenants/:tenantId/*`).
- **Unit tests:** UserService (getUserProfile), TeamService (getTeam, createTeam), RoleService (listRoles, getRole), InvitationService (listInvitations), ApiKeyService (listApiKeys, createApiKey).
- **API Keys (Super Admin §10.3):** Cosmos container `user_api_keys` (config `cosmos_db.containers.api_keys`); partition key `/tenantId`. `ApiKeyService`: list (no raw keys), create (SHA-256 hash stored; raw key returned once), revoke (delete), rotate (new key returned once). `GET /api/v1/tenants/:tenantId/api-keys` returns `{ items: ApiKeySummary[] }`. `POST /api/v1/tenants/:tenantId/api-keys` (body: name, scope?, expiresAt?) creates key; 201 with created object including `key` (raw, once). `DELETE /api/v1/tenants/:tenantId/api-keys/:keyId` revokes; 204. `POST /api/v1/tenants/:tenantId/api-keys/:keyId/rotate` rotates; 200 with `{ key, expiresAt?, createdAt }` (raw key once). All require auth and tenant scope; 404 when key not found for revoke/rotate.

## [1.1.0] - 2025-01-22

### Changed
- **BREAKING**: Migrated from PostgreSQL to Azure Cosmos DB NoSQL
- Database connection now uses Cosmos DB endpoint and key
- Container structure: prefixed containers in shared database (`user_users`, `user_teams`, etc.)
- User profiles moved to Cosmos DB `user_users` container
- Teams moved to Cosmos DB `user_teams` container (partition key: tenantId)
- Roles moved to Cosmos DB `user_roles` container (partition key: tenantId)
- Role mappings moved to Cosmos DB `user_role_idp_mappings` container
- Invitations moved to Cosmos DB `user_tenant_invitations` container (TTL: 7 days)
- Join requests moved to Cosmos DB `user_tenant_join_requests` container
- Memberships moved to Cosmos DB `user_memberships` and `user_team_memberships` containers
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
- Team management (CRUD operations, membership; tenant-scoped)
- Role-based access control (RBAC) with custom roles
- Permission management system
- Tenant membership management
- User invitation system with expiration (tenant-scoped)
- Event publishing for audit logging and notifications
- Configuration via YAML files with schema validation
- OpenAPI specification
- Health and readiness endpoints

### Security
- RBAC permission checks on all operations
- Tenant-scoped data isolation
- Audit logging for sensitive operations



