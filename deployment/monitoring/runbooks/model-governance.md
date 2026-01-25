# Model Governance — Plan §975

Model cards (purpose, input, output, limitations) and bias checks (segment fairness, training/CI).  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §11.9, §946, §975.

---

## 1. Model cards

### 1.1 Storage

- **Primary:** Cosmos `ml_models` (ml-service). Model card fields are part of the MLModel document: `description`, `features`, `type`, `limitations` (optional).
- **Optional `model_cards` container:** Not used; `ml_models` suffices. If a separate `model_cards` container is added later, it can key by `modelId` and override or extend the inline card.

### 1.2 API

- **`GET /api/v1/ml/models/:id/card`** (ml-service)  
  Returns `ModelCard`: `{ modelId, name, type, version, purpose, input, output, limitations }`.  
  - **purpose:** from `ml_models.description` or `"Model for {type}"`.  
  - **input:** `ml_models.features` (feature IDs/names).  
  - **output:** by `ModelType` (e.g. classification → probability; regression → numeric; see ml-service `MLModelService.getModelCard`).  
  - **limitations:** `ml_models.limitations` (optional); writable via `PUT /api/v1/ml/models/:id` (UpdateMLModelInput).

### 1.3 Maintenance

- **Creating/updating:** Create/update `ml_models` via ml-service CRUD. Set `limitations` when known (e.g. “Not validated for industry X”, “Trained on data through YYYY-MM”).
- **UI:** `/models/[id]` (Plan §946) and “View model card” in ExplainabilityCard link to this API.

---

## 2. Bias checks

### 2.1 In model-monitoring (production)

**Segment fairness (Plan §11.9, §946):** In the **model-monitoring** batch job (see [model-monitoring.md](model-monitoring.md)), compare performance (Brier, calibration) **by segment**: industry, region, deal size. Alert if delta between segments exceeds a threshold (e.g. `ml.model.segment_fairness.alert` or extend `ml.model.performance.degraded` with `segment`).

- **When implemented:** ModelMonitoringService computes Brier/MAE per segment from `ml_inference_logs` or Data Lake; baseline vs segment deltas; publish event and/or block deploy when over threshold.
- **Runbook:** [model-monitoring.md](model-monitoring.md) for the job; this runbook defines the *governance* (what to check, where).

### 2.2 In training / CI

**Placement (TBD):**

- **Post-training in Azure ML:** After the train job, run an “EvaluateBias” or “SegmentFairness” step in the pipeline (e.g. in `train_risk_scoring.py` or a separate Azure ML job). Input: trained model + validation data with segment columns (industry, region, size). Output: metrics per segment; fail the pipeline or publish `ml.model.bias.check.failed` if delta > threshold.
- **CI when training pipeline runs:** If training is triggered from CI (e.g. on `main` or schedule), add a CI step that (a) runs the training pipeline, (b) runs the bias evaluation job, (c) gates merge/deploy on passing.

**What to check (examples):**

- Calibration by segment (industry, region, deal-size bucket): calibration error or Brier per segment; max delta vs overall.
- Demographic parity / equalized odds: only if protected attributes (e.g. from c_contact or c_account) are in the feature set and policy allows; tooling TBD (e.g. FairLearn, custom).

**TBD:** Exact placement in Azure ML pipelines (see [ml-training-jobs.md](ml-training-jobs.md)), threshold values, and tooling.

---

## 3. Doc and references

- **Model card API:** ml-service `README.md`, `openapi.yaml` — `GET /api/v1/ml/models/:id/card`.
- **Types:** `containers/ml-service/src/types/ml.types.ts` — `ModelCard`, `MLModel.limitations`.
- **Runbooks:** [model-monitoring.md](model-monitoring.md) (drift, performance; segment fairness when added, §2.1); [ml-training-jobs.md](ml-training-jobs.md) (training; bias step TBD §2.2).

---

## 4. References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §11.9, §946, §975
- [BI_SALES_RISK_PLAN_ADDITIONAL_RECOMMENDATIONS.md](../../../documentation/requirements/BI_SALES_RISK_PLAN_ADDITIONAL_RECOMMENDATIONS.md) §9
- [deployment/monitoring/README.md](../README.md), [ml-service.json](../grafana/dashboards/ml-service.json) – production metrics and model card API
- [validation.md](validation.md) – KPIs, segment-fairness targets, UAT
