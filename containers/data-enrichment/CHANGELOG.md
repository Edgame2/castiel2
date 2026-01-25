# Changelog

All notable changes to this module will be documented in this file.

## [1.3.0] - 2026-01-23

### Fixed
- **server**: `unhandledRejection` handler uses `reason: unknown`, `Promise<unknown>`, and type guard for logging.
- **Routes**: `error: any` → `error: unknown` with statusCode/msg type guards in all enrichment, vectorization, and shard-embedding routes (get job, enrich, trigger, bulk, statistics, vectorize, get vectorization job, batch vectorize, generate embeddings, batch generate, regenerate-type, embedding statistics).

## [1.2.0] - 2026-01-23

### Fixed
- **shard.created / shard.updated consumer (2.4)**: null-safe `event.data`; resolve `shardId` from `event.data?.shardId ?? event.data?.id`, `tenantId` from `event.tenantId ?? event.data?.tenantId`; skip and log when missing.

## [1.1.0] - 2026-01-23

### Fixed
- Database init: register `enrichment_configurations` and `enrichment_history` containers (used by EnrichmentService.getDefaultConfig). Config schema: optional `enrichment_configurations`, `enrichment_history` in `cosmos_db.containers`.

## [1.0.0] - 2026-01-23

### Added
- EnrichmentService with AI-powered enrichment pipeline
- VectorizationService for shard vectorization
- ShardEmbeddingService for embedding management
- Enrichment processors (entity extraction, classification, summarization, sentiment, key phrases)
- Batch enrichment and vectorization support
- Event-driven enrichment triggered by shard events
