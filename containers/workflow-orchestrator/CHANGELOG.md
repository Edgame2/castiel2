# Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Changed
- **batch_job_triggers_total:** Label `job` renamed to `batch_job` to avoid clashing with Prometheus scrape `job`. Grafana batch-jobs.json and model-monitoring runbook §6 use `batch_job`.
- **BatchJobScheduler, config/default.yaml:** model-monitoring comments aligned: worker is risk-analytics (calls ml-service); ml-service publishes `ml.model.drift.detected`, `ml.model.performance.degraded` when thresholds exceeded.

### Added
- **Observability (Plan §8.5, FIRST_STEPS §1):** `@azure/monitor-opentelemetry` in `src/instrumentation.ts` (init before other imports; env `APPLICATIONINSIGHTS_CONNECTION_STRING`, `APPLICATIONINSIGHTS_DISABLE`). `GET /metrics` (prom-client): `http_requests_total`, `http_request_duration_seconds`, `batch_job_triggers_total` (label `batch_job`). Config: `application_insights` (connection_string, disable), `metrics` (path, require_auth, bearer_token); schema. Optional Bearer on /metrics when `metrics.require_auth`. `batch_job_triggers_total.inc({ batch_job })` in BatchJobScheduler on publishJobTrigger for risk-snapshot-backfill and outcome-sync.
- **industry-benchmarks cron (Plan §915, §953):** `batch_jobs.industry_benchmarks_cron` (default `0 4 * * *` = 4 AM daily). BatchJobScheduler publishes `workflow.job.trigger` with job `industry-benchmarks`; risk-analytics BatchJobWorker consumes and runs `IndustryBenchmarkService.calculateAndStore`. Env `INDUSTRY_BENCHMARKS_CRON`.
- **risk-clustering, account-health, propagation crons (Plan §915):** `batch_jobs.risk_clustering_cron` (default `0 2 * * *` = 2 AM), `account_health_cron` (`0 3 * * *` = 3 AM), `propagation_cron` (`0 5 * * *` = 5 AM). BatchJobScheduler publishes `workflow.job.trigger` with jobs `risk-clustering`, `account-health`, `propagation`; worker is risk-analytics (handlers TBD). Env overrides: `RISK_CLUSTERING_CRON`, `ACCOUNT_HEALTH_CRON`, `PROPAGATION_CRON`.
- **model-monitoring cron (Plan §9.3, §940):** `batch_jobs.model_monitoring_cron` (default `0 6 * * 0` = Sunday 6 AM). BatchJobScheduler publishes `workflow.job.trigger` with job `model-monitoring`; worker: risk-analytics (calls ml-service `POST /api/v1/ml/model-monitoring/run`). ml-service `ModelMonitoringService` implements PSI (Data Lake), Brier and MAE (ml_evaluations); publishes `ml.model.drift.detected` and `ml.model.performance.degraded` when thresholds are exceeded. Env `MODEL_MONITORING_CRON`.

## [1.2.0] - 2026-01-23

### Fixed
- **WorkflowOrchestratorEventConsumer**: `error: any` → `error: unknown` and type guards in `integration.opportunity.updated` and `shard.updated` handler catches; `closeEventConsumer` now calls `await consumer.stop()` before clearing. `integration.opportunity.updated` handler log uses `error instanceof Error ? error : new Error(String(error))`.

## [1.1.0] - 2026-01-23

### Fixed
- **Event consumer null-safety**: All handlers use `event.data?.` and `event.tenantId ?? event.data?.tenantId`; skip when required fields (opportunityId, shardId, workflowId, tenantId) are missing. `shard.updated` guards `event.data` and `shardId`/`tenantId` before processing opportunity-type shards. Step completion/failure handlers require `workflowId` and `tenantId`.

## [1.0.0] - 2026-01-23

### Added
- Initial implementation
- Core functionality
