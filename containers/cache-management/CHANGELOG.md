# Changelog

All notable changes to this module will be documented in this file.

## [1.1.0] - 2026-01-23

### Fixed
- **Routes**: `error: any` → `error: unknown`; statusCode/message via type guards in get metrics, optimize, upsert strategy.
- **CacheManagementService**: `error: any` → `error: unknown` in getCacheMetrics, upsertCacheStrategy, optimizeCache.

## [1.0.0] - 2026-01-23

### Added
- CacheManagementService with cache metrics tracking
- Cache optimization with automatic strategy adjustment
- Cache strategy management (create, update)
- Integration with cache-service and embeddings
