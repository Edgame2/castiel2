# Changelog

All notable changes to the Search Service module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-23

### Fixed
- **Routes**: web search catch `error: any` → `error: unknown` with statusCode/msg type guards.
- **SearchService**: `error: any` → `error: unknown` in vectorSearch, hybridSearch, fullTextSearch, webSearch (and inner/ getCachedWebSearch/cacheWebSearch where needed); throw messages use `error instanceof Error ? error.message : String(error)`.

## [1.1.0] - 2026-01-23

### Added

- Field-weighted relevance scoring (MISSING_FEATURES 2.3): rerank vector and hybrid results by keyword overlap in name (1.0), description (0.8), metadata (0.5); config `field_weights`, `field_weight_boost`; optional fetch from shard-manager when `result.shard` is missing
- `applyFieldWeights` on vector and hybrid request bodies (default true)

## [1.0.0] - 2024-01-XX

### Added

- Initial implementation of Search Service
- Vector search using embeddings
- Advanced full-text search with filters
- Search query analytics and insights
- Tenant isolation
- JWT authentication
- OpenAPI documentation

