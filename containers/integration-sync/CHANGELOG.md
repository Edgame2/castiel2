# Changelog

All notable changes to this module will be documented in this file.

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
