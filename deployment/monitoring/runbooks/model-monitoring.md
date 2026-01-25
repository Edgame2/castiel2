# Model Monitoring Runbook (Plan §940, §11.7)

Runbook for the **model-monitoring** batch job, drift/performance alerts, and model rollback.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §940, §9.3, §11.7.

---

## 1. Overview

- **Job:** `model-monitoring`
- **Schedule:** `0 6 * * 0` (Sunday 6 AM) via workflow-orchestrator `BatchJobScheduler`. Overridable with `MODEL_MONITORING_CRON` / `batch_jobs.model_monitoring_cron`.
- **Trigger:** `workflow.job.trigger` to queue `bi_batch_jobs`.
- **Worker:** risk-analytics `BatchJobWorker` calls ml-service `POST /api/v1/ml/model-monitoring/run` with `{ tenantIds?: string[] }`.
- **ml-service:** `ModelMonitoringService.runForTenants` – drift (PSI) and performance (Brier, MAE). Currently a **stub** (`driftChecked: 0`, `performanceChecked: 0`). Full impl: log feature vector at inference (Data Lake or `ml_inference_logs`); compute PSI vs baseline, Brier/MAE vs outcomes; publish `ml.model.drift.detected` / `ml.model.performance.degraded`.

---

## 2. Events (when implemented)

| Event | When | Payload (min) | Action |
|-------|------|---------------|--------|
| `ml.model.drift.detected` | PSI (or other drift metric) exceeds threshold | modelId, segment?, metric, delta | Investigate; consider retrain or rollback. |
| `ml.model.performance.degraded` | Brier/MAE degrades vs baseline | modelId, metric, value, threshold | Investigate; consider rollback. |

Consumers: logging, alerting. See risk-analytics `logs-events.md`.

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
- **ml-service:** `azure_ml.*` for endpoints; future: `ml_inference_logs` or Data Lake paths for feature logging.

---

## 6. Monitoring and dashboards

- **Grafana:** `batch-jobs.json` – `batch_job_duration_seconds{job_name="model-monitoring"}`, `batch_job_triggers_total{job="model-monitoring"}`.
- **ml-service:** `ml-service.json` – prediction rate and latency by model.
- **Logs:** risk-analytics `BatchJobWorker` logs `model-monitoring completed` or `model-monitoring failed` with `tenants`, `driftChecked`, `performanceChecked`.

---

## 7. Related

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §940, §9.3, §11.7
- [deployment/monitoring/README.md](../README.md) – Prometheus, Grafana, metrics
- risk-analytics `logs-events.md` – `ml.model.drift.detected`, `ml.model.performance.degraded`
- Plan §11.7: runbooks for **backfill failure**, **consumer scaling** – see main operations runbooks where present.
