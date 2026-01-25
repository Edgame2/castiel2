# Model Monitoring Runbook (Plan §940, §11.7)

Runbook for the **model-monitoring** batch job, drift/performance alerts, and model rollback.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §940, §9.3, §11.7.

---

## 1. Overview

- **Job:** `model-monitoring`
- **Schedule:** `0 6 * * 0` (Sunday 6 AM) via workflow-orchestrator `BatchJobScheduler`. Overridable with `MODEL_MONITORING_CRON` / `batch_jobs.model_monitoring_cron`.
- **Trigger:** `workflow.job.trigger` to queue `bi_batch_jobs`.
- **Worker:** risk-analytics `BatchJobWorker` calls ml-service `POST /api/v1/ml/model-monitoring/run` with `{ tenantIds?: string[] }`.
- **ml-service:** `ModelMonitoringService.runForTenants` – **performance (Brier, MAE):** queries `ml_evaluations` (TOP 100 per tenant); reads Brier from `doc.brier` or `doc.metrics.brier`/`Brier`—when Brier > `model_monitoring.brier_threshold` (default 0.2) publishes `ml.model.performance.degraded`; reads MAE from `doc.mae` or `doc.metrics.mae`/`MAE`—when MAE > `model_monitoring.mae_threshold` (default 0.2) publishes `ml.model.performance.degraded`. **Drift (PSI):** reads `/ml_inference_logs` from Data Lake (when `data_lake.connection_string` set); baseline = 30–60 days ago, current = last 7 days; PSI on `prediction` per (tenantId, modelId); when PSI > `model_monitoring.psi_threshold` (default 0.2) publishes `ml.model.drift.detected`. Min 30 samples in each window.

---

## 2. Events

| Event | When | Payload (min) | Action |
|-------|------|---------------|--------|
| `ml.model.drift.detected` | PSI on `prediction` from `/ml_inference_logs` exceeds `model_monitoring.psi_threshold`. | modelId, segment?, metric, delta | Investigate; consider retrain or rollback. |
| `ml.model.performance.degraded` | Brier or MAE (from ml_evaluations) > `model_monitoring.brier_threshold` or `model_monitoring.mae_threshold` (default 0.2). | modelId, metric, value, threshold | Investigate; consider rollback. |

Consumers: logging (MLAuditConsumer → Blob; [audit-event-flow.md](audit-event-flow.md)), alerting. See risk-analytics `logs-events.md`.

---

## 3. Run model-monitoring manually

1. **Via workflow-orchestrator (preferred):** Publish `workflow.job.trigger` with `job: 'model-monitoring'`, `metadata: { tenantIds?: string[] }` to the `bi_batch_jobs` queue (or the exchange that binds to it). risk-analytics `BatchJobWorker` will consume and call ml-service.
2. **Direct call to ml-service (internal):**  
   `POST /api/v1/ml/model-monitoring/run`  
   Body: `{ "tenantIds": ["tenant-1","tenant-2"] }` or `{}` for all.  
   **Note:** This route is internal; no auth in stub. Use service-to-service JWT when implemented. risk-analytics uses `services.ml_service.url` from config; no hardcoded URLs.

---

## 4. Model rollback (Plan §11.7)

When `ml.model.drift.detected` or `ml.model.performance.degraded` fires:

1. **Confirm:** Check logs and metrics (e.g. `ml_prediction_duration_seconds`, `ml_predictions_total` by model). Correlate with event payload (modelId, metric, delta).
2. **Decide:** Rollback to previous model version or switch to rule-based fallback if configured (e.g. risk-scoring, win-probability).
3. **Rollback steps:**
   - **Azure ML:** In Azure ML Studio, set the managed endpoint to the previous model version (re-deploy or update endpoint). ml-service `config.azure_ml.endpoints` points to the endpoint URL; no code change if the endpoint serves the new version after swap.
   - **Config:** If model version is explicitly in config, update `config.azure_ml.endpoints` or per-tenant overrides in configuration-service and restart/refresh the service.
   - **Fallback:** If a rule-based or cached fallback exists (e.g. `industry_models: false`), enable it via feature flags or config to reduce reliance on the degraded model until retrain.
4. **Retrain:** Schedule retrain with fresh outcomes (Data Lake / `ml_outcomes`). Use existing training pipelines (see BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md) and Azure ML. After deploy, re-run model-monitoring to confirm metrics.

---

## 5. Configuration

- **risk-analytics `config`:** `services.ml_service.url` must be set for the model-monitoring job to call ml-service. If unset, the worker logs an error and publishes `workflow.job.failed`.
- **workflow-orchestrator:** `batch_jobs.model_monitoring_cron` (default `0 6 * * 0`).
- **ml-service:** `azure_ml.*` for endpoints; `model_monitoring.brier_threshold` (default 0.2), `model_monitoring.mae_threshold` (default 0.2), `model_monitoring.psi_threshold` (default 0.2). **Inference logs:** DataLakeCollector (logging) writes to `/ml_inference_logs`; ml-service reads from same path: `data_lake.connection_string`, `data_lake.container`, `data_lake.ml_inference_logs_prefix` (default `/ml_inference_logs`). When `data_lake.connection_string` is empty, model-monitoring skips PSI. PSI: baseline 30–60 days ago, current last 7 days; min 30 samples per window.

---

## 6. Monitoring and dashboards

- **Grafana:** [batch-jobs.json](../grafana/dashboards/batch-jobs.json) – `batch_job_duration_seconds{job_name="model-monitoring"}`, `batch_job_triggers_total{batch_job="model-monitoring"}`. [ml-service.json](../grafana/dashboards/ml-service.json) – prediction rate/latency; `ml_drift_checks_total`, `ml_drift_detections_total`, `ml_performance_degraded_total` (labels `model`, `metric`) for model-monitoring (Plan §8.5.2).
- **Logs:** risk-analytics `BatchJobWorker` logs `model-monitoring completed` or `model-monitoring failed` with `tenants`, `driftChecked`, `performanceChecked`. ml-service `ModelMonitoringService` returns `driftChecked` = number of (tenantId, modelId) PSI checks with enough data; `performanceChecked` = Brier evaluations checked.

---

## 7. Related

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §940, §9.3, §11.7
- [deployment/monitoring/README.md](../README.md) – Prometheus, Grafana, metrics
- [model-governance.md](model-governance.md) – segment fairness (Plan §975 §2.1; when added to model-monitoring: Brier/calibration by industry, region, deal size)
- risk-analytics `logs-events.md` – `ml.model.drift.detected`, `ml.model.performance.degraded`
- [audit-event-flow.md](audit-event-flow.md) – `ml.model.drift.detected`, `ml.model.performance.degraded` → MLAuditConsumer
- [backfill-failure.md](backfill-failure.md) – risk-snapshot-backfill and outcome-sync failure (Plan §11.7).
- [consumer-scaling.md](consumer-scaling.md) – RabbitMQ consumer scaling (Plan §11.7).
