# Changelog

All notable changes to the Shard Manager module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Tenant-only migration script:** `scripts/migrate-organization-to-tenant.ts` to update Cosmos documents that still have `organizationId` (set `tenantId` from `organizationId` when missing, optionally remove `organizationId`). Run with `pnpm run migrate:organization-to-tenant` (dry-run by default; use `--execute` to apply). See `documentation/database/TENANT_ONLY_MIGRATION.md`.
- **BI Sales Risk shard fields (Gap 7):** `docs/BI_SALES_RISK_SHARD_FIELDS.md` summarizing c_opportunity, c_account, c_contact `structuredData` (including NEW optional fields) from BI_SALES_RISK_SHARD_SCHEMAS. States these are optional; shard-manager does not validate or reject documents that omit them. README section and cross-ref.

## [1.0.0] - 2025-01-22

### Added
- Initial module extraction from monolithic API
- Shard CRUD operations
- ShardType management (schema definitions)
- Relationship graph management
- Bulk operations (create, update, delete, restore)
- Shard linking operations
- Revision history and versioning
- Event publishing for shard lifecycle changes
- Cosmos DB NoSQL integration
- Redis caching support
- Configuration via YAML files with schema validation
- OpenAPI specification
- Health and readiness endpoints

### Database
- Cosmos DB containers: `shard_shards`, `shard_types`, `shard_revisions`, `shard_edges`, `shard_relationships`
- Partition key strategy: `/tenantId` for most containers, `/sourceId` for edges
- Composite indexes for common query patterns

### Security
- Tenant isolation via partition keys
- RBAC permission checks
- Audit logging for all operations

