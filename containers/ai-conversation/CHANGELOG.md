# Changelog

All notable changes to this module will be documented in this file.

## [1.2.0] - 2026-01-23

### Fixed
- **ConversationEventConsumer**: `error: any` → `error: unknown` and `error.message` → type guard in `shard.updated` handler catch; `closeEventConsumer` now calls `await consumer.stop()` before clearing.

## [1.1.0] - 2026-01-23

### Fixed
- **shard.updated consumer**: null-safe `event.data`; resolve `shardId` from `event.data?.shardId ?? event.data?.id`, `tenantId` from `event.tenantId ?? event.data?.tenantId`; skip and log when missing. Cosmos query uses `partitionKey: tenantId`.

## [1.0.0] - 2026-01-23

### Added
- Initial implementation
- Core functionality
