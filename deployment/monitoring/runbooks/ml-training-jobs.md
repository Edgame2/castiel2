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

**Data prep (optional):** `azml-job-prepare-training.yaml` runs `prepare_training_data.py` ([DATA_LAKE_LAYOUT](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md) §2.4): joins /risk_evaluations + /ml_outcomes → `outputs.training_prep` (uri_folder). Use before train_risk_scoring or train_win_probability when not using synthetic. **Pipeline:** `azml-pipeline-prepare-then-risk-scoring.yaml` chains prepare → train_risk_scoring in one job.

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

When run as an Azure ML Job, the script logs **RMSE**, **MAE**, and **R2** to the run (Plan §874).

**LSTM trajectory** (Plan §875):

```bash
az ml job create --file azml-job-lstm-trajectory.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.sequence_length.value=30] \
  [--set inputs.deploy_flag.value=--deploy]
```

When run as an Azure ML Job, the script logs **loss**, **val_loss**, **mae**, and **val_mae** (final epoch) to the run (Plan §875).

**Win-probability** (Plan §876):

```bash
az ml job create --file azml-job-win-probability.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.deploy_flag.value=--deploy]
```

When run as an Azure ML Job, the script logs **Brier** and **AUC_ROC** to the run (TRAINING_SCRIPTS_SPEC §3.2).

**Revenue-forecasting (Prophet)** (Plan §877):

```bash
az ml job create --file azml-job-prophet.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.deploy_flag.value=--deploy]
```

When run as an Azure ML Job, the script logs **MAPE**, **RMSE**, and **MAE** (in-sample) to the run (Plan §877).

**Anomaly (Isolation Forest)** (Plan Phase 2):

```bash
az ml job create --file azml-job-anomaly.yaml \
  --set inputs.training_data.path=abfs://<container>@<account>.dfs.core.windows.net/<path> \
  [--set inputs.param_contamination.value=0.1] \
  [--set inputs.param_n_estimators.value=100] \
  [--set inputs.deploy_flag.value=--deploy]
```

When run as an Azure ML Job and the input has an `is_anomaly` column, the script logs **F1** (anomaly class) to the run (TRAINING_SCRIPTS_SPEC §3.4).

**Prepare training data** (DATA_LAKE_LAYOUT §2.4; use when not using synthetic):

```bash
az ml job create --file azml-job-prepare-training.yaml \
  --set inputs.risk_evaluations.path=abfs://<container>@<account>.dfs.core.windows.net/<path-to-risk_evaluations> \
  --set inputs.ml_outcomes.path=abfs://<container>@<account>.dfs.core.windows.net/<path-to-ml_outcomes> \
  [--set inputs.model_id.value=win_probability] \
  [--set inputs.tenant_id.value=<id>] \
  [--set inputs.partition_date.value=YYYY-MM-DD]
```

Output: `outputs.training_prep` (uri_folder) contains `prepared.parquet`. Use as `inputs.training_data.path` for train_risk_scoring or train_win_probability in a pipeline, or download and upload to Data Lake for a standalone train job.

**Pipeline: prepare → train_risk_scoring** (`azml-pipeline-prepare-then-risk-scoring.yaml`):

```bash
az ml job create --file azml-pipeline-prepare-then-risk-scoring.yaml \
  --set inputs.risk_evaluations.path=abfs://<container>@<account>.dfs.core.windows.net/<path-to-risk_evaluations> \
  --set inputs.ml_outcomes.path=abfs://<container>@<account>.dfs.core.windows.net/<path-to-ml_outcomes> \
  [--set inputs.model_name.value=risk-scoring-global] \
  [--set inputs.industry_id.value=<id>] \
  [--set inputs.deploy_flag.value=--deploy] \
  [--set settings.default_compute=azureml:<compute>]
```

**Pipeline: prepare → train_win_probability** (`azml-pipeline-prepare-then-win-probability.yaml`):

```bash
az ml job create --file azml-pipeline-prepare-then-win-probability.yaml \
  --set inputs.risk_evaluations.path=abfs://<container>@<account>.dfs.core.windows.net/<path-to-risk_evaluations> \
  --set inputs.ml_outcomes.path=abfs://<container>@<account>.dfs.core.windows.net/<path-to-ml_outcomes> \
  [--set inputs.model_name.value=win-probability-model] \
  [--set inputs.deploy_flag.value=--deploy] \
  [--set settings.default_compute=azureml:<compute>]
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

## 6. Run in Azure (Plan §874–§877)

Checklist for **train, calibrate, deploy** and running jobs in Azure:

1. **Prerequisites**
   - Azure ML Workspace, Compute, Key Vault (Terraform or manual).
   - Data Lake (or compatible store) with Parquet at `/risk_evaluations`, `/ml_outcomes`, `/risk_snapshots`, `/ml_training/*` per [BI_SALES_RISK_DATA_LAKE_LAYOUT](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md). For risk-scoring and win-probability from raw data: run `azml-job-prepare-training` (or `prepare_training_data.py` locally) to join /risk_evaluations + /ml_outcomes; use `outputs.training_prep` or upload to /ml_training/*. When real data &lt; 3k/5k: run `generate_synthetic_opportunities.py` and upload to Data Lake.

2. **Env for jobs**
   - `AZURE_ML_SUBSCRIPTION_ID`, `AZURE_ML_RESOURCE_GROUP`, `AZURE_ML_WORKSPACE_NAME`. For `--deploy`: `DEPLOY_INSTANCE_TYPE`, `DEPLOY_INSTANCE_COUNT`.

3. **Submit**
   - From `containers/ml-service/scripts`, run the `az ml job create` commands in §2. Set `inputs.training_data.path` to `abfs://<container>@<account>.dfs.core.windows.net/<path>` or `azureml:<dataset>:<version>`.

4. **Deploy**
   - Use `--set inputs.deploy_flag.value=--deploy` to create/update Managed Online Endpoints. Each model’s scoring URL is shown in the job or Azure ML Studio.

5. **Configure ml-service**
   - Set `AZURE_ML_ENDPOINT_*` (or `azure_ml.endpoints.<key>` in `config/default.yaml`) to each scoring URL: `risk_scoring_global`, `risk_trajectory_lstm`, `win_probability`, `revenue_forecasting`, `anomaly` (see §1 table).

---

## 7. Related

- [containers/ml-service/scripts/README.md](../../../containers/ml-service/scripts/README.md) – Scripts, conda envs, column schemas
- [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](../../../documentation/requirements/BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md) – Targets, I/O, Azure ML contract
- [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md) – Data Lake paths
- [model-monitoring.md](model-monitoring.md) – Model monitoring job, drift/performance, rollback
- [validation.md](validation.md) – KPIs (Brier, MAPE, etc.) and where training run metrics are viewed
