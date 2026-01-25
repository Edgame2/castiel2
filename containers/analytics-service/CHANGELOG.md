# Changelog

All notable changes to the Analytics Service module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Usage Tracking (Plan §10, §3.5, §871):** `UsageTrackingConsumer` in `src/events/consumers/UsageTrackingConsumer.ts`; subscribes to `ml.prediction.completed`, `llm.inference.completed`, `embedding.generated` via RabbitMQ; appends to Cosmos `analytics_usage_ml` for billing aggregation. Stored doc: `tenantId`, `eventType`, `modelId`, `opportunityId`, `inferenceMs` (when present, e.g. from ml.prediction.completed), `inferredAt`, `source`. Config: `rabbitmq.bindings`, `cosmos_db.containers.usage_ml`. Optional: when `rabbitmq.url` and `rabbitmq.bindings` are set, consumer starts on server init.

### Fixed
- **UsageTrackingConsumer:** `getContainer('analytics_usage_ml')` → `getContainer('usage_ml')` to match `config.cosmos_db.containers.usage_ml` (logical key). Partition key `tenantId`.

## [1.0.0] - 2024-01-XX

### Added

- Initial implementation of Analytics Service
- General analytics and metrics
- Project-specific analytics
- AI usage analytics
- API performance metrics
- Tenant isolation
- JWT authentication
- OpenAPI documentation

