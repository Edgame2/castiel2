# Changelog

All notable changes to this module will be documented in this file.

## [1.4.0] - 2026-01-28

### Added
- **Async Data Flow**: Integration data now flows through RabbitMQ for asynchronous processing
  - `IntegrationSyncService.executeSyncTask()` publishes `integration.data.raw` events instead of directly storing shards
  - Support for batch events (`integration.data.raw.batch`) for large syncs (>100 records)
  - Idempotency key generation for each record: `${integrationId}-${externalId}-${syncTaskId}`
  - Correlation ID tracking for sync execution
- **Mapping Configuration**: Added mapping configuration options to config schema
  - `mapping.queue_name` - RabbitMQ queue for mapping consumer
  - `mapping.batch_size` - Batch size for batch events (default: 50)
  - `mapping.batch_threshold` - Threshold to use batch events (default: 100)
  - `mapping.retry_attempts`, `mapping.timeout_seconds`, `mapping.prefetch`, etc.
- **Event Tracking**: Sync execution stats updated asynchronously via `integration.data.mapped` and `integration.data.mapping.failed` events
  - `SyncTaskEventConsumer` now consumes mapping completion events
  - Sync execution status changes from `processing` to `completed` when all records mapped
- **Event Schemas**: Added new event schemas to `logs-events.md`
  - `integration.data.raw` - Single raw record event
  - `integration.data.raw.batch` - Batch raw records event
  - `integration.data.mapped` - Mapping success event
  - `integration.data.mapping.failed` - Mapping failure event

### Changed
- **Breaking**: `IntegrationSyncService.executeSyncTask()` no longer directly creates/updates shards
  - Now publishes events to RabbitMQ for async processing
  - Sync execution status is `processing` initially, updated asynchronously
  - Direct shard creation/update code removed
- **Credential Retrieval**: Fixed to use `credentialSecretName` instead of non-existent `credentialSecretId`
  - Falls back to connection-based retrieval if credentialSecretName not available

### Fixed
- **Credential Access**: Fixed field name mismatch in `IntegrationSyncService` (was using `credentialSecretId`, now uses `credentialSecretName`)

## [1.3.0] - 2026-01-23

### Fixed
- **SyncTaskEventConsumer**: null-safe `event.data` for `integration.sync.scheduled`, `integration.webhook.received`, `integration.token.refresh-requested`; resolve `integrationId`/`connectionId` from `event.data?.*`, `tenantId` from `event.tenantId ?? event.data?.tenantId`; skip and log when required ids missing; `integration.webhook.received` null-safe `event?.data`, guard for integrationId/tenantId; replace `error: any` and `connection: any` with `error: unknown` and typed `refreshConnectionTokens` arg.
- **Routes**: `error: any` → `error: unknown` with statusCode/msg type guards in get sync task, trigger sync (and `executeSyncTask.catch`), resolve conflict, create/get/list/update/delete webhooks.
- **SyncSchedulerService**: replace `error: any` with `error: unknown` and type guards for `log.error`/`log.warn`.
- **TokenRefreshService**: replace `error: any`/`updateError: any` with `error: unknown` and type guards; fix `error.message` usage in publish/put; `getExpiringConnections` catch `error: unknown`; `refreshConnectionTokens` accepts `{ id; integrationId; tenantId? }`.
- **IntegrationSyncEventConsumer**: replace `error: any` with `error: unknown` in `shard.updated` handler catch; `closeEventConsumer` now calls `await consumer.stop()` before clearing.
- **server**: `unhandledRejection` handler uses `reason: unknown`, `Promise<unknown>`, and type guard for logging.

## [1.2.0] - 2026-01-23

### Fixed
- **shard.updated consumer (1.4)**: null-safe `event.data`; resolve `shardId` from `event.data?.shardId ?? event.data?.id`, `tenantId` from `event.tenantId ?? event.data?.tenantId`; skip and log when missing.

## [1.1.0] - 2026-01-23

### Changed
- `sync_limits.max_concurrent_syncs_per_tenant`: schema `maximum: 10` (MISSING_FEATURES 1.6).

## [1.0.0] - 2026-01-23

### Added
- IntegrationSyncService with sync task management
- Bidirectional synchronization support
- Webhook management (create, read, update, delete, list)
- Conflict detection and resolution
- Sync execution tracking
- Integration with integration-manager and secret-management
- Event publishing for sync lifecycle events
