# Changelog

All notable changes to the Notification Manager module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **anomaly.detected consumer (Plan §7.2):** `eventMapper` maps `anomaly.detected` (from risk-analytics) to NotificationInput. Uses `tenantId`, `ownerId` (or `userId`) as recipientId; skips when recipientId is missing. High severity → IN_APP+EMAIL; medium/low → IN_APP. Payload should include `ownerId` (opportunity OwnerId) for notifications to be created; risk-analytics to add when publishing. README: BI/risk event mapping.
- **Observability (Plan §8.5.1, §899, FIRST_STEPS §1):** `@azure/monitor-opentelemetry` in `src/instrumentation.ts` (init before other imports). Config: `application_insights` (connection_string, disable); env `APPLICATIONINSIGHTS_CONNECTION_STRING`, `APPLICATIONINSIGHTS_DISABLE`. Schema: `application_insights`.
- **Prometheus /metrics (Plan §8.5.2, §8.5.4):** `GET /metrics` via prom-client: `http_requests_total`, `http_request_duration_seconds`. Config: `metrics` (path, require_auth, bearer_token); env `METRICS_PATH`, `METRICS_REQUIRE_AUTH`, `METRICS_BEARER_TOKEN`. Optional `Authorization: Bearer` when `metrics.require_auth`. Replaced placeholder metrics route with `register.metrics()`, Content-Type `text/plain; version=0.0.4`.

## [1.0.0] - 2024-01-XX

### Added

- Initial implementation of Notification Manager
- Multi-channel notification service
- Event consumption from RabbitMQ
- User and tenant-scoped notifications
- Mark as read/unread functionality
- Delete notifications
- Tenant isolation
- JWT authentication
- OpenAPI documentation

