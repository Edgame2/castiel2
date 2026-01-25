# BI Sales Risk – Suggested First Steps

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Ordered “start here” for implementation. Reduces ambiguity in the first 2 weeks.  
**Source:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §10, Dependencies, §8.5.

---

## Week 1

### 1. Observability (Plan §8.5)

- **Containers:** risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics, notification-manager, analytics-service (Plan §8.5.1, §8.5.2).
- **Per container:**  
  - `@azure/monitor-opentelemetry` (init before other imports); config `application_insights.connection_string`, `application_insights.disable`.  
  - `GET /metrics` (prom-client): `http_requests_total`, `http_request_duration_seconds`, plus `risk_evaluations_total` / `ml_predictions_total` / `batch_job_duration_seconds` where relevant. Optional Bearer when `metrics.require_auth`.  
  - Config: `application_insights`, `metrics` (path, require_auth, bearer_token); schema.
- **Reference:** `deployment/monitoring/README.md`; scrape and dashboards already in `deployment/monitoring/`.

### 2. risk_snapshots + RiskSnapshotService + config

- **risk-analytics:** Add Cosmos `risk_snapshots` to config and DB. New `RiskSnapshotService`: on `risk.evaluated` (consumer), upsert `risk_snapshots`. Expose `getSnapshots(opportunityId, from, to)`.
- **Config:** `data_lake` for backfill (path_prefix, connection_string, container). Plan §8.1.

### 3. DataLakeCollector + MLAuditConsumer (logging)

- **DataLakeCollector:** `events/consumers/DataLakeCollector.ts`; subscribe `risk.evaluated`; write Parquet to `/risk_evaluations/year=.../month=.../day=.../` per [BI_SALES_RISK_DATA_LAKE_LAYOUT](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) §2.1.
- **MLAuditConsumer:** `events/consumers/MLAuditConsumer.ts`; subscribe `risk.evaluated`, `risk.prediction.generated`, `ml.prediction.completed`, `remediation.workflow.completed`, `hitl.approval.requested`, `hitl.approval.completed`, `ml.model.drift.detected`, `ml.model.performance.degraded`; write to audit (Blob/immutable). Plan §10, §940, §972.
- **Config:** `data_lake.*`, RabbitMQ queue/bindings, schema. Plan §3.5.

### 4. BatchJobScheduler + BatchJobWorker (risk-snapshot-backfill)

- **workflow-orchestrator:** `jobs/BatchJobScheduler.ts`; node-cron; publish `workflow.job.trigger` for `risk-snapshot-backfill` (and optionally `outcome-sync`). Queue `bi_batch_jobs` bound to `coder_events`.
- **risk-analytics:** `events/consumers/BatchJobWorker.ts`; consume `bi_batch_jobs`; on `job: 'risk-snapshot-backfill'` read Data Lake (date range) → upsert `risk_snapshots`. Publish `workflow.job.completed` / `workflow.job.failed`.
- **Skill:** `setup-batch-job-workers`. Plan §9.3.

---

## Week 2

### 5. outcome-sync + outcome consumer + ml_outcomes

- **outcome-sync (risk-analytics):** Batch job (cron `0 1 * * *`): query c_opportunity where `IsClosed=true` and recently updated; publish `opportunity.outcome.recorded` (tenantId, opportunityId, outcome, competitorId?, closeDate, amount). Add to BatchJobScheduler.
- **Consumer (risk-analytics):** `RiskAnalyticsEventConsumer` subscribes `opportunity.outcome.recorded`; `OutcomeDataLakeWriter.appendOutcomeRow` appends to Data Lake `/ml_outcomes/year=.../month=.../day=.../` per [BI_SALES_RISK_DATA_LAKE_LAYOUT](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) §2.2, §3. Requires `data_lake.connection_string`; when unset, handler is skipped.

### 6. FeatureService.buildVectorForOpportunity (ml-service)

- **Method:** `FeatureService.buildVectorForOpportunity(tenantId, opportunityId, purpose)` per [BI_SALES_RISK_FEATURE_PIPELINE_SPEC](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md). Call shard-manager (`/shards/:id`, `/shards/:id/related`), risk-analytics (risk-snapshots or latest-evaluation). Return `Record<string, number>`.
- **Config:** `services.shard_manager.url`, `services.risk_analytics.url`; optional `feature_pipeline.stage_labels`, `industry_labels`.
- **Implemented:** ml-service `FeatureService`; used by `PredictionService` (predictWinProbability, predictRiskScore, predictAnomaly, predictLstmTrajectory).

### 7. AzureMLClient + predictRiskScore / predictWinProbability wiring

- **ml-service:** `AzureMLClient` (REST to Managed Endpoints); config `azure_ml.endpoints` (modelId → URL); env overrides e.g. `AZURE_ML_ENDPOINT_WIN_PROB`, `AZURE_ML_ENDPOINT_RISK_GLOBAL` (ml-service `config/index.ts`, [ml-training-jobs.md](../../deployment/monitoring/runbooks/ml-training-jobs.md)). `PredictionService.predictWinProbability(opportunityId)`: buildVector → `AzureMLClient.predict('win-probability-model', features)`; fallback to heuristic if ML down. Similarly `predictRiskScore` with `buildVector` or `body.features`.
- **Plan §5.7:** Use degraded behavior (heuristic, rules) when Azure ML unavailable.

### 8. Phase 1 APIs (risk-predictions, risk-snapshots, win-probability, forecasting)

- **risk-analytics:** `GET/POST /api/v1/opportunities/:id/risk-predictions`, `GET /api/v1/opportunities/:id/risk-velocity`, `GET /api/v1/opportunities/:id/risk-snapshots`. Wire to EarlyWarningService, RiskSnapshotService.
- **risk-analytics:** `GET /api/v1/opportunities/:id/win-probability` (proxy to ml-service `POST /api/v1/ml/win-probability/predict`) when `services.ml_service.url` set; 503 when not.
- **forecasting:** `GET /api/v1/forecasts/:period/scenarios`, `.../risk-adjusted`, `.../ml`; ForecastingService (scenarios/risk-adjusted: tenant aggregate or stub; ml: stub or ml-service when configured).
- **Implemented:** risk-analytics, ml-service, forecasting; OpenAPI updated for each.

---

## After Week 2

- Competitive intel: `competitors`, `risk_competitor_tracking`, `CompetitiveIntelligenceService`, routes (Plan §10 Phase 1).
- UI: `/dashboard`, `/dashboard/manager`, `/opportunities`, `/opportunities/[id]` and core components (Plan §6).
- LSTM, win-prob model, risk-scoring model: training scripts and Azure ML deploy (stub endpoints ok until models exist). Plan §5.6, [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md).

---

## Phase 1–2 in-repo status

**As of 2026-01:** All Phase 1 and Phase 2 in-repo tasks in Plan §10 are done. The four Phase 1 items 874–877 (risk-scoring, risk-trajectory-lstm, win-probability-model, revenue-forecasting-model: train / calibrate / deploy) are **operational**: run Azure ML jobs per [deployment/monitoring/runbooks/ml-training-jobs.md](../../deployment/monitoring/runbooks/ml-training-jobs.md), deploy with `--deploy`, set `AZURE_ML_ENDPOINT_*` in ml-service. In-repo support: training scripts, `prepare_training_data.py`, `azml-job-prepare-training.yaml`, `azml-pipeline-prepare-then-risk-scoring.yaml`, `azml-pipeline-prepare-then-win-probability.yaml`, `generate_synthetic_opportunities.py`, conda envs, ml-training-jobs runbook. **Next (operational):** run `az ml job create` for prepare, risk-scoring, win-probability, LSTM, Prophet, anomaly; deploy; configure endpoints. **Phase 3+:** Plan §10 marks as future/out of scope.

---

## References

- **Plan:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §10, Dependencies, §8.5, §9.3.
- **Monitoring:** [deployment/monitoring/README.md](../../deployment/monitoring/README.md) — Prometheus scrape config, Grafana dashboards (bi-risk-overview, ml-service, batch-jobs), SLOs (Plan §11.7), runbooks (model-monitoring, backfill-failure, consumer-scaling, audit-event-flow, etc.); runbooks cross-reference each other and link to dashboards.
- **Data Lake:** [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md)
- **Features:** [BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md)
- **Training:** [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md)
- **Cursor:** `.cursor/commands/bi-risk-step.md`; skills: `add-datalake-consumer`, `setup-batch-job-workers`, `validate-container-compliance`, `setup-container-config`
