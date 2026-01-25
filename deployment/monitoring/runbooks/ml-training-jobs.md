# ML Training Jobs Runbook (Plan §5.6, §9.3)

Runbook for **Azure ML training jobs** (risk-scoring, risk-trajectory-lstm, win-probability, revenue-forecasting, anomaly).  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §5.6, §9.3 and [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](../../../documentation/requirements/BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md).

---

## 1. Overview

| Job file | Model | Script | Deploy endpoint key |
|----------|-------|--------|---------------------|
| `azml-job-risk-scoring.yaml` | risk-scoring-global / risk-scoring-{industry} | train_risk_scoring.py | risk_scoring_global, risk_scoring_industry |
| `azml-job-lstm-trajectory.yaml` | risk-trajectory-lstm | train_lstm_trajectory.py | risk_trajectory_lstm |
| `azml-job-win-probability.yaml` | win-probability-model | train_win_probability.py | win_probability |
| `azml-job-prophet.yaml` | revenue-forecasting-model | train_prophet_forecast.py | revenue_forecasting |
| `azml-job-anomaly.yaml` | anomaly-detection-isolation-forest | train_anomaly_isolation_forest.py | anomaly |

**Location:** `containers/ml-service/scripts/`. Submit from that directory.

**Env (required for register/deploy):** `AZURE_ML_SUBSCRIPTION_ID`, `AZURE_ML_RESOURCE_GROUP`, `AZURE_ML_WORKSPACE_NAME`. For `--deploy`: `DEPLOY_INSTANCE_TYPE` (default `Standard_DS2_v2`), `DEPLOY_INSTANCE_COUNT` (default `1`).

---

## 2. Submit commands

```bash
cd containers/ml-service/scripts
```

**Risk-scoring** (Plan §874):

```bash
az ml job create --file azml-job-risk-scoring.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.model_name.value=risk-scoring-global] \
  [--set inputs.industry_id.value=<id>] \
  [--set inputs.deploy_flag.value=--deploy]
```

**LSTM trajectory** (Plan §875):

```bash
az ml job create --file azml-job-lstm-trajectory.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.sequence_length.value=30] \
  [--set inputs.deploy_flag.value=--deploy]
```

**Win-probability** (Plan §876):

```bash
az ml job create --file azml-job-win-probability.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.deploy_flag.value=--deploy]
```

**Revenue-forecasting (Prophet)** (Plan §877):

```bash
az ml job create --file azml-job-prophet.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.deploy_flag.value=--deploy]
```

**Anomaly (Isolation Forest)** (Plan Phase 2):

```bash
az ml job create --file azml-job-anomaly.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.param_contamination.value=0.1] \
  [--set inputs.param_n_estimators.value=100] \
  [--set inputs.deploy_flag.value=--deploy]
```

Paths can be `abfs://` Data Lake or `azureml:<dataset_name>:<version>` when registered.

---

## 3. Input data sources

| Model | Input | Source |
|-------|-------|--------|
| risk-scoring | Parquet: feature columns + target_risk | /risk_evaluations, /ml_training/risk_scoring; synthetic: `generate_synthetic_opportunities.py --output-path <path>` when &lt; 3k |
| lstm-trajectory | Parquet: opportunityId, snapshotDate, risk_score, activity_count_30d, days_since_last_activity, target_risk_30/60/90 (or target_risk) | /risk_snapshots, /risk_evaluations |
| win-probability | Parquet: amount, probability, days_to_close, stage_encoded, industry_encoded, days_since_last_activity, activity_count_30d, stakeholder_count, target_win; is_closed | /ml_training/win_probability, risk_evaluations+outcomes; synthetic: `generate_synthetic_opportunities.py --pct-closed` when &lt; 5k |
| revenue-forecasting | Parquet: (date, revenue) or (ds, y) or (date, pipeline_value) | /ml_training/revenue_forecasting, historical closed-won or pipeline by date |
| anomaly | Parquet: feature columns only; optional is_anomaly | /ml_training/anomaly, /ml_inference_logs, risk_evaluations export |

---

## 4. After training

- **Register:** Model is registered in Azure ML when `AZURE_ML_*` env is set in the job.
- **Deploy:** Set `inputs.deploy_flag.value=--deploy` to create/update a Managed Online Endpoint and deploy (blue). Then set `config.azure_ml.endpoints.<key>` in ml-service to the scoring URL.
- **Rollback:** See [model-monitoring.md](model-monitoring.md) §4. Swap endpoint to a prior model version in Azure ML Studio.

---

## 5. Related

- [containers/ml-service/scripts/README.md](../../../containers/ml-service/scripts/README.md) – Scripts, conda envs, column schemas
- [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](../../../documentation/requirements/BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md) – Targets, I/O, Azure ML contract
- [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md) – Data Lake paths
- [runbooks/model-monitoring.md](model-monitoring.md) – Model monitoring job, drift/performance, rollback
