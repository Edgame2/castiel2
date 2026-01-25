# BI Sales Risk – Suggested First Steps

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Ordered “start here” for implementation. Reduces ambiguity in the first 2 weeks.  
**Source:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §10, Dependencies, §8.5.

---

## Week 1

### 1. Observability (Plan §8.5)

- **Containers:** risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics.
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
- **MLAuditConsumer:** `events/consumers/MLAuditConsumer.ts`; subscribe `risk.evaluated`, `ml.prediction.completed`, `remediation.workflow.completed`; write to audit (Blob/immutable).
- **Config:** `data_lake.*`, RabbitMQ queue/bindings, schema. Plan §3.5.

### 4. BatchJobScheduler + BatchJobWorker (risk-snapshot-backfill)

- **workflow-orchestrator:** `jobs/BatchJobScheduler.ts`; node-cron; publish `workflow.job.trigger` for `risk-snapshot-backfill` (and optionally `outcome-sync`). Queue `bi_batch_jobs` bound to `coder_events`.
- **risk-analytics:** `events/consumers/BatchJobWorker.ts`; consume `bi_batch_jobs`; on `job: 'risk-snapshot-backfill'` read Data Lake (date range) → upsert `risk_snapshots`. Publish `workflow.job.completed` / `workflow.job.failed`.
- **Skill:** `setup-batch-job-workers`. Plan §9.3.

---

## Week 2

### 5. outcome-sync + outcome consumer + ml_outcomes

- **outcome-sync (risk-analytics):** Batch job (cron `0 1 * * *`): query c_opportunity where `IsClosed=true` and recently updated; publish `opportunity.outcome.recorded` (tenantId, opportunityId, outcome, competitorId?, closeDate, amount). Add to BatchJobScheduler.
- **Consumer (ml-service or risk-analytics):** Subscribe `opportunity.outcome.recorded`; append to Data Lake `/ml_outcomes/year=.../month=.../day=.../` per [BI_SALES_RISK_DATA_LAKE_LAYOUT](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) §2.2, §3.

### 6. FeatureService.buildVectorForOpportunity (ml-service)

- **Method:** `FeatureService.buildVectorForOpportunity(tenantId, opportunityId, purpose)` per [BI_SALES_RISK_FEATURE_PIPELINE_SPEC](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md). Call shard-manager (`/shards/:id`, `/shards/:id/related`), risk-analytics (risk-snapshots or latest-evaluation). Return `Record<string, number>`.
- **Config:** `services.shard_manager.url`, `services.risk_analytics.url`; optional `feature_pipeline.stage_labels`, `industry_labels`.

### 7. AzureMLClient + predictRiskScore / predictWinProbability wiring

- **ml-service:** `AzureMLClient` (REST to Managed Endpoints); config `azure_ml.endpoints`. `PredictionService.predictWinProbability(opportunityId)`: buildVector → `AzureMLClient.predict('win-probability-model', features)`; fallback to heuristic if ML down. Similarly `predictRiskScore` with `buildVector` or `body.features`.
- **Plan §5.7:** Use degraded behavior (heuristic, rules) when Azure ML unavailable.

### 8. Phase 1 APIs (risk-predictions, risk-snapshots, win-probability, forecasting)

- **risk-analytics:** `GET/POST /api/v1/opportunities/:id/risk-predictions`, `GET /api/v1/opportunities/:id/risk-velocity`, `GET /api/v1/opportunities/:id/risk-snapshots`. Implement or stub; wire to EarlyWarningService, RiskSnapshotService.
- **risk-analytics:** `GET /api/v1/opportunities/:id/win-probability` (proxy to ml-service) or ml-service `GET /api/v1/predict/win-probability/:opportunityId`.
- **forecasting:** `GET /api/v1/forecasts/:period/scenarios`, `.../risk-adjusted`, `.../ml` (stub or wire to ForecastingService).
- Update `openapi.yaml` for each.

---

## After Week 2

- Competitive intel: `competitors`, `risk_competitor_tracking`, `CompetitiveIntelligenceService`, routes (Plan §10 Phase 1).
- UI: `/dashboard`, `/dashboard/manager`, `/opportunities`, `/opportunities/[id]` and core components (Plan §6).
- LSTM, win-prob model, risk-scoring model: training scripts and Azure ML deploy (stub endpoints ok until models exist). Plan §5.6, [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md).

---

## References

- **Plan:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §10, Dependencies, §8.5, §9.3.
- **Data Lake:** [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md)
- **Features:** [BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md)
- **Training:** [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md)
- **Cursor:** `.cursor/commands/bi-risk-step.md`; skills: `add-datalake-consumer`, `setup-batch-job-workers`, `validate-container-compliance`, `setup-container-config`
