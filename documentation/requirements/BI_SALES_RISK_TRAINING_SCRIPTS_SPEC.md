# BI Sales Risk – Training Scripts Specification

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Define structure, I/O, and contracts for Python training scripts (Azure ML).  
**Referenced by:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §5.2, §5.6

---

## 1. Overview

- **Location:** `containers/ml-service/scripts/` or repo root `ml-scripts/`. The plan allows either; **lock:** `containers/ml-service/scripts/`.
- **Runtime:** Azure ML Compute (CPU; GPU in Phase 3 if needed). Scripts run as Azure ML Jobs; output = registered model + optional Managed Endpoint deployment.
- **Input:** Data Lake path(s) and/or Cosmos export. Column names must match [BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md) feature names for model-specific tables.
- **Output:** Model in Azure ML Registry; deployment to Real-time or Batch endpoint per model.

---

## 2. Input Data

### 2.1 Data Lake Paths

| Purpose | Path pattern | Format | Columns (min) |
|---------|--------------|--------|---------------|
| Risk evaluations (for risk-scoring, outcome) | `/risk_evaluations/year=YYYY/month=MM/day=DD/*.parquet` | Parquet | tenantId, opportunityId, riskScore, categoryScores, timestamp; **target:** derived from opportunity outcome (IsWon) or riskScore |
| ML outcomes (for target_win, target_risk; join with risk_evaluations) | `/ml_outcomes/year=YYYY/month=MM/day=DD/*.parquet` | Parquet | tenantId, opportunityId, outcome, competitorId?, closeDate, amount, recordedAt ([DATA_LAKE_LAYOUT](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) §2.2). Writer: risk-analytics OutcomeDataLakeWriter. |
| Risk snapshots (for LSTM) | `/risk_snapshots/...` or same as risk_evaluations with snapshotDate | Parquet | opportunityId, snapshotDate, riskScore, (activity_count_30d, days_since_last_activity if present) |
| ML inference logs (for drift) | `/ml_inference_logs/year=.../month=.../*.parquet` | Parquet | feature columns + modelId, timestamp |
| Training-ready (pre-joined) | `/ml_training/risk_scoring/year=.../*.parquet` | Parquet | Feature names from Feature Pipeline Spec + `target_risk` or `target_win` |

**Convention:** Training scripts accept `--input-dataset` (Azure ML Dataset pointing to Data Lake) or `--input-path` (abfs path). Pipeline/feature job (e.g. `prepare_training_data.py`) can precompute `/ml_training/{model_id}/` from `/risk_evaluations` + `/ml_outcomes` (and optionally shard-manager or Node `buildFeatureVector`). See [DATA_LAKE_LAYOUT](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) §2.4.

### 2.2 Target Columns

| Model | Target column | Type | Source |
|-------|---------------|------|--------|
| risk-scoring-global, risk-scoring-{industry} | `target_risk` | float [0,1] | `riskScore` from risk_evaluations; or derived from outcome (e.g. lost ⇒ 1, won ⇒ 0) and time-based rules |
| win-probability-model | `target_win` | int {0,1} | `IsWon` from c_opportunity (only when `IsClosed`=true) |
| risk-trajectory-lstm | `target_risk` (or multi-step) | float [0,1] | `risk_snapshots.riskScore` at t+30, t+60, t+90 |
| revenue-forecasting-model | `target_revenue` | float | Closed won amount; or pipeline value at close |
| anomaly-detection-isolation-forest | (unsupervised) | — | No target; use `is_anomaly` from existing labels if available for validation only |
| mitigation-ranking-model | `target_rank` / `target_relevant` | relevance or order | From remediation outcomes (Phase 2) |

---

## 3. Script Template (Generic)

Each script:

1. **Parse args:** `--input-dataset` or `--input-path`, `--model-name`, `--run-name`, `--tenant-id` (optional filter), `--industry-id` (optional for industry models).
2. **Load data:** `pd.read_parquet` or Azure ML `Input` `DatasetConsumptionConfig`.
3. **Validate columns:** Check required feature columns and target exist; drop or impute missing (document strategy: e.g. drop rows with missing target, impute 0 for missing numeric features).
4. **Train:** sklearn / xgboost / Prophet / Keras. Hyperparameters via `--param-x` or config YAML.
5. **Register:** `model = Model(workspace, ...)` or `run.upload_file()` + `Model.register()`.
6. **Optional deploy:** If `--deploy` then create/update Managed Endpoint. Use Azure ML SDK v2 or CLI.

### 3.1 train_risk_scoring.py

- **Input:** Parquet with columns from Feature Pipeline Spec (at least: amount, probability, days_to_close, days_in_stage, days_since_created, is_closed, is_won, stage_encoded, industry_encoded, competitor_count, days_since_last_activity, activity_count_30d, stage_stagnation_days, stakeholder_count, risk_score_latest, risk_velocity, risk_acceleration) + `target_risk`.
- **Model:** `xgboost.XGBRegressor` (or `XGBClassifier` with binned target). Objective: `reg:squarederror` or `binary:logistic` if target binned.
- **Output:** Registered model `risk-scoring-global` or `risk-scoring-{industryId}`. Signature: input = dict of feature names → float, output = `{"riskScore": float}`.
- **Calibration:** Not required for regressor; if classifier, use `CalibratedClassifierCV` (isotonic or sigmoid) and register calibrated model.

```python
# Pseudocode
import pandas as pd, xgboost as xgb
from azure.ai.ml import MLClient; from azure.identity import DefaultAzureCredential

REQUIRED = ["amount","probability","days_to_close","stage_encoded","industry_encoded",
            "days_since_last_activity","activity_count_30d","stakeholder_count","target_risk"]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-path", required=True)
    parser.add_argument("--model-name", default="risk-scoring-global")
    parser.add_argument("--industry-id", default=None)
    args = parser.parse_args()

    df = pd.read_parquet(args.input_path)
    for c in REQUIRED: assert c in df.columns, f"Missing {c}"
    X = df.drop(columns=["target_risk"]).select_dtypes(include=[np.number]).fillna(0)
    y = df["target_risk"].clip(0, 1)

    model = xgb.XGBRegressor(objective="reg:squarederror", n_estimators=200, max_depth=6)
    model.fit(X, y)

    # Register to Azure ML
    ml_client = MLClient(DefaultAzureCredential(), subscription_id, resource_group, workspace_name)
    # ... register with ml_client.models.create_or_update(...)
```

### 3.2 train_win_probability.py

- **Input:** Parquet with same feature set + `target_win` (0/1). **Filter:** only rows where `is_closed==1` (or equivalent) so target is defined.
- **Model:** `xgboost.XGBClassifier` + `CalibratedClassifierCV` (sklearn, isotonic or sigmoid). Final output: `predict_proba` for class 1.
- **Output:** Registered model `win-probability-model`. Signature: input = feature dict, output = `{"winProbability": float, "confidence": float}`.
- **Metrics:** Log Brier score, AUC-ROC, calibration curve to Azure ML run.

### 3.3 train_lstm_trajectory.py

- **Input:** Parquet or grouped by opportunityId: sequences of `[risk_score, activity_count_30d, days_since_last_activity]` over last 30 (or 60) days + `target_risk` at t+30 (or t+60, t+90). Pad short sequences to fixed length.
- **Model:** Keras/TensorFlow LSTM. Input shape `(sequence_length, n_features)`; output: (risk at t+30, t+60, t+90) or single step.
- **Output:** Registered model `risk-trajectory-lstm`. Signature: input = `{"sequence": [[f1,f2,f3], ...]}`, output = `{"risk_30": float, "risk_60": float, "risk_90": float, "confidence": float}`.

### 3.4 train_anomaly_isolation_forest.py

- **Input:** Feature columns only (no target). Optional `is_anomaly` for labeled validation.
- **Model:** `sklearn.ensemble.IsolationForest`. `contamination` from `--contamination` (default 0.1).
- **Output:** `anomaly-detection-isolation-forest`. Signature: input = feature dict, output = `{"isAnomaly": int (-1/1), "anomalyScore": float}`.

### 3.5 train_prophet_forecast.py / revenue-forecasting

- **Input:** Time series `(date, revenue)` or `(date, pipeline_value, ...)`. Aggregate by day/week from `risk_evaluations` or opportunity amounts.
- **Model:** Prophet + XGBoost/quantile for P10/P50/P90. Details in plan §5.2.
- **Output:** `revenue-forecasting-model`. Signature: input = `{"history": [...]}`, output = `{"p10": [...], "p50": [...], "p90": [...]}`.

### 3.6 Synthetic Data (Phase 1)

- **Script:** `generate_synthetic_opportunities.py`. Use `imblearn.over_sampling.SMOTE` or domain rules (e.g. `amount` log-normal, `probability` beta, `stage` categorical, `target_risk` = f(probability, days_since_activity)).
- **Output:** Parquet to `/ml_training/synthetic/risk_scoring/` or similar. Other scripts use it when real data &lt; 3k/5k.

---

## 4. Azure ML Contract

### 4.1 Real-Time Endpoint Request/Response

- **Request:** `POST /score` JSON: `{"input": [{"feature1": v1, "feature2": v2, ...}]}` or `{"input": [{"opportunityId": "...", "features": {...}}]}` if endpoint does feature lookup (not recommended; keep feature build in Node).
- **Response:** `{"riskScore": 0.72}` or `{"winProbability": 0.65, "confidence": 0.9}` etc., per model.

### 4.2 Batch Endpoint

- **Input:** NDJSON or Parquet with one row per opportunity; columns = feature names.
- **Output:** Parquet with `opportunityId` (or row id) + model outputs.

---

## 5. Config and Env

- **Azure ML:** ` subscription_id`, `resource_group`, `workspace_name` from env or `--workspace`.
- **Data Lake:** `AZURE_STORAGE_*` or `DefaultAzureCredential`; path from `--input-path` or Dataset.
- **Hyperparameters:** Pass as `--param-n_estimators 200` or load from `config/train_risk_scoring.yaml` in the script dir.

---

## 6. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial: input paths, target columns, script templates for risk-scoring, win-prob, LSTM, anomaly, Prophet; synthetic; Azure ML I/O. |
