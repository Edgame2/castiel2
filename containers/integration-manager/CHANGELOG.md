# Changelog

## [Unreleased]

### Added
- **BI Sales Risk – Salesforce-to-shard mapping (Gap 7):** `docs/salesforce-to-shard-mapping.md` and README section. Audit of BidirectionalSyncService (uses fieldMappings for conflict detection; does not build structuredData). Recommended `entityMappings[].fieldMappings` for c_opportunity, c_account, c_contact NEW fields when upstream (e.g. Salesforce) provides them. Adapters/sync layer can add these mappings when wired.

## [1.1.0] - 2026-01-23

### Fixed
- **IntegrationManagerEventConsumer**: null-safe `event.data` for `integration.sync.check-due` and `integration.token.check-expiring`; use `event?.data ?? {}`, `data.timestamp`, `data.thresholdTime` with `Date.now()` fallbacks; typed catch as `unknown`; `updateIntegrationNextSyncAt` catch `error: any` → `error: unknown`.
- **IntegrationManagerEventConsumer**: Cosmos queries for `integration_integrations` and `integration_connections` now pass `{ enableCrossPartitionQuery: true }` for cross-tenant queries.

## [1.0.0] - 2025-01-22

### Added
- Initial module extraction from monolithic API
- Integration CRUD operations
- Webhook management
- Sync task management
- Integration catalog
- Custom integrations
- Event publishing
- Cosmos DB NoSQL integration

