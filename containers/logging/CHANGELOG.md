# Changelog

All notable changes to the Logging module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **README, docs/logs-events.md:** `ml.model.drift.detected` doc: "when PSI implemented" → "when PSI > psi_threshold"; `ml.model.performance.degraded` doc: add "or MAE > mae_threshold" (ml-service ModelMonitoringService implements both).

### Added
- **Inference logging (Plan §940, §11.3, DATA_LAKE_LAYOUT §2.3):** **DataLakeCollector** writes to `/ml_inference_logs/year=.../month=.../day=.../` for `risk.evaluated` (modelId=risk-evaluation, prediction=riskScore, featureVector from categoryScores/topDrivers) and `ml.prediction.completed` (modelId, opportunityId; prediction/featureVector when present in event). Config: `data_lake.ml_inference_logs_prefix` (default `/ml_inference_logs`); `rabbitmq.data_lake.bindings` adds `ml.prediction.completed`. Enables model-monitoring drift (PSI) when implemented. ml-service may add `prediction` to `ml.prediction.completed` in a follow-up.
- **Observability (Plan §8.5.2):** `rabbitmq_messages_consumed_total` Counter (label `queue`) in `DataLakeCollector` and `MLAuditConsumer` when consuming from `logging_data_lake` and `logging_ml_audit`; feeds deployment/monitoring/README and consumer-scaling runbook.
- **Documentation:** `docs/logs-events.md` — DataLakeCollector (`risk.evaluated` → Parquet) and MLAuditConsumer (`risk.evaluated`, `ml.prediction.completed`, `remediation.workflow.completed` → audit Blob). Plan §3.5, FIRST_STEPS §3, DATA_LAKE_LAYOUT.
- **README:** Configuration reference for `data_lake.*` (connection_string, container, path_prefix, audit_path_prefix) and `rabbitmq.data_lake` / `rabbitmq.ml_audit` (queues, bindings); Consumed Events table for DataLakeCollector and MLAuditConsumer.
- **MLAuditConsumer (Plan §10):** `risk.prediction.generated` added to `rabbitmq.ml_audit.bindings`. 30/60/90-day risk predictions from risk-analytics (EarlyWarningService.generatePredictions) are written to audit Blob.
- **MLAuditConsumer (Plan §940):** `ml.model.drift.detected` and `ml.model.performance.degraded` added to `rabbitmq.ml_audit.bindings`. Model-monitoring events from ml-service are written to audit Blob.

## [1.2.0] - 2025-01-24

### Added
- **Observability (Plan §8.5, FIRST_STEPS §1):** `@azure/monitor-opentelemetry` in `src/instrumentation.ts` (init before other imports; env `APPLICATIONINSIGHTS_CONNECTION_STRING`, `APPLICATIONINSIGHTS_DISABLE`). `GET /metrics` (prom-client): `http_requests_total`, `http_request_duration_seconds`. Config: `application_insights` (connection_string, disable), `metrics` (path, require_auth, bearer_token); schema. Optional Bearer on /metrics when `metrics.require_auth`.

## [1.1.0] - 2025-01-22

### Changed
- **BREAKING**: Migrated from PostgreSQL to Azure Cosmos DB NoSQL
- Database connection now uses Cosmos DB endpoint and key
- Container structure: prefixed containers in shared database (`audit_logs`, `audit_retention_policies`, etc.)
- Audit logs moved to Cosmos DB `audit_logs` container (TTL: 1 year default)
- Retention policies moved to Cosmos DB `audit_retention_policies` container
- Alert rules moved to Cosmos DB `audit_alert_rules` container
- Hash checkpoints moved to Cosmos DB `audit_hash_checkpoints` container
- Configurations moved to Cosmos DB `audit_configurations` container
- Exports moved to Cosmos DB `audit_exports` container
- Storage provider changed from `postgres` to `cosmos`

### Added
- Cosmos DB configuration in `config/default.yaml`
- Container structure documentation
- Partition key strategy documentation (`/tenantId`)
- Indexing strategy for Cosmos DB queries
- TTL support for automatic log expiration

### Migration Notes
- Schema changes documented in `docs/architecture.md`
- No data migration scripts included (handled separately)
- Container naming follows pattern: `{module}_{entity}`

## [1.0.0] - 2026-01-22

### Added
- Core audit logging infrastructure
- Multi-tenant organization isolation
- Hash chain tamper evidence
- Retention policy management
- Log export (CSV/JSON)
- Alert rule management
- Full-text search with advanced filtering
- Organization-specific configuration
- Background jobs (retention, archive, alerts, partitions)
- OpenAPI/Swagger documentation
- JWT authentication middleware
- Health check endpoints
- PostgreSQL storage provider
- Event-driven ingestion via RabbitMQ
- Data redaction utilities
- Hash chain verification

### Configuration
- YAML-based configuration with schema validation
- Environment variable interpolation
- Environment-specific configs (production, test)
- No hardcoded values

### API Endpoints
- POST `/api/v1/logs` - Create log entry
- POST `/api/v1/logs/batch` - Create multiple logs
- GET `/api/v1/logs` - List logs with filters
- GET `/api/v1/logs/:id` - Get specific log
- GET `/api/v1/search` - Full-text search
- POST `/api/v1/export` - Create export job
- GET `/api/v1/export/:id` - Get export status
- GET `/api/v1/policies` - List retention policies
- POST `/api/v1/policies` - Create retention policy
- PUT `/api/v1/policies/:id` - Update retention policy
- DELETE `/api/v1/policies/:id` - Delete retention policy
- GET `/api/v1/configuration` - Get org configuration
- PUT `/api/v1/configuration` - Update org configuration
- DELETE `/api/v1/configuration` - Revert to defaults
- GET `/api/v1/alerts` - List alert rules
- POST `/api/v1/alerts` - Create alert rule
- PUT `/api/v1/alerts/:id` - Update alert rule
- DELETE `/api/v1/alerts/:id` - Delete alert rule
- POST `/api/v1/alerts/:id/evaluate` - Evaluate alert rule
- POST `/api/v1/verification/verify` - Verify hash chain
- POST `/api/v1/verification/checkpoint` - Create checkpoint
- GET `/api/v1/verification/checkpoints` - List checkpoints
- POST `/api/v1/verification/checkpoint/:id/verify` - Verify since checkpoint
- GET `/health` - Health check
- GET `/ready` - Readiness check

### Services
- IngestionService - Log ingestion and batch processing
- RetentionService - Retention policy management
- ExportService - CSV/JSON export functionality
- HashChainService - Tamper evidence verification
- QueryService - Advanced search and filtering
- AlertService - Alert detection and triggering
- ConfigurationService - Organization configuration management

### Jobs
- RetentionJob - Automated log cleanup (placeholder for Phase 3)
- ArchiveJob - Archive logs to cold storage (placeholder for Phase 3)
- AlertJob - Check alert conditions (placeholder for Phase 4)
- PartitionJob - Create database partitions (placeholder for Phase 3)

### Documentation
- OpenAPI specification at `/docs` and `docs/openapi.yaml`
- Comprehensive README
- Implementation plan and status documents

### Security
- JWT authentication on all API endpoints
- Organization isolation
- Data redaction support
- Hash chain tamper evidence

### Compliance
- SOC2, GDPR, PCI-DSS ready
- Configurable retention policies
- Immutable policy support
- Audit trail capabilities
