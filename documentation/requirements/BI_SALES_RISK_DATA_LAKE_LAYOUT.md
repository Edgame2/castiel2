# BI Sales Risk – Data Lake Layout & Parquet Schemas

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Single reference for Azure Data Lake paths, Parquet column names, and outcome/retraining flows.  
**Referenced by:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md), [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md), DataLakeCollector (logging), outcome-sync (BatchJobWorker), risk-analytics OutcomeDataLakeWriter.

---

## 1. Path Layout

Base: `data_lake.path_prefix` (default `/risk_evaluations` applies to the risk-evals area; other areas have their own prefix or subpaths under the same container).  
**Container:** `data_lake.container` (default `risk`). All paths below are relative to container root.  
**risk_evaluations:** Uses `data_lake.path_prefix` (default `/risk_evaluations`). **ml_outcomes:** Use `data_lake.ml_outcomes_prefix` (default `/ml_outcomes`) or equivalent config in the outcome consumer.

| Path pattern | Writer | Reader | Format |
|--------------|--------|--------|--------|
| `/risk_evaluations/year=YYYY/month=MM/day=DD/*.parquet` | DataLakeCollector (logging) | risk-snapshot-backfill, training | Parquet |
| `/ml_outcomes/year=YYYY/month=MM/day=DD/*.parquet` | outcome consumer (risk-analytics OutcomeDataLakeWriter) | training (win-prob, risk-scoring) | Parquet |
| `/ml_inference_logs/year=YYYY/month=MM/day=DD/*.parquet` | DataLakeCollector (logging) | model-monitoring (drift) | Parquet |
| `/ml_training/{model_id}/year=YYYY/month=MM/day=DD/*.parquet` | optional feature/label pipeline | training scripts | Parquet |

---

## 2. Parquet Schemas

### 2.1 `/risk_evaluations/...`

**Source:** `risk.evaluated` (DataLakeCollector in logging). One row per event (or batched).

| Column | Type | Source |
|--------|------|--------|
| `tenantId` | string | event |
| `opportunityId` | string | event |
| `riskScore` | double | event |
| `categoryScores` | string (JSON) or struct | event |
| `topDrivers` | string (JSON) or array | event (optional) |
| `dataQuality` | string (JSON) or struct | event (optional) |
| `timestamp` | string (ISO) | event |
| `evaluationId` | string | event (if present) |

### 2.2 `/ml_outcomes/...`

**Source:** Consumer of `opportunity.outcome.recorded`. **Publisher:** `outcome-sync` batch job (daily, `0 1 * * *`): query c_opportunity where `IsClosed=true` and `CloseDate` or `updatedAt` in last 24h (or since last run); emit event. **Alternative:** on `opportunity.updated` / `shard.updated` when `IsClosed` turns true (optional; can duplicate; prefer job for controllability).  
**Consumer:** risk-analytics `RiskAnalyticsEventConsumer` → `OutcomeDataLakeWriter.appendOutcomeRow`; one Parquet file per outcome under `/ml_outcomes/year=.../month=.../day=DD/`.

| Column | Type | Source |
|--------|------|--------|
| `tenantId` | string | event |
| `opportunityId` | string | event |
| `outcome` | string | `"won"` \| `"lost"` |
| `competitorId` | string | event (optional, null if won) |
| `closeDate` | string (ISO) | event |
| `amount` | double | event |
| `recordedAt` | string (ISO) | ingestion time |

### 2.3 `/ml_inference_logs/...`

**Source:** `risk.evaluated` and `ml.prediction.completed`. **Writer:** DataLakeCollector (logging) consumes both events and writes feature vector (or hash) + metadata to `data_lake.ml_inference_logs_prefix` (default `/ml_inference_logs`).

| Column | Type | Source |
|--------|------|--------|
| `tenantId` | string | — |
| `opportunityId` | string | — |
| `modelId` | string | — |
| `timestamp` | string (ISO) | — |
| `featureVector` | string (JSON) or map | optional; or `featureHash` only for size |
| `prediction` | double / string | riskScore or winProbability etc. |

### 2.4 `/ml_training/{model_id}/...`

Pre-joined training data; optional. **Training prep:** `containers/ml-service/scripts/prepare_training_data.py` joins `/risk_evaluations` + `/ml_outcomes` and writes Parquet to `/ml_training/{model_id}/...` per [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md). Modes: `outcome_joined` (base + target_win, target_risk for downstream enrichment), `risk_scoring` | `win_probability` (+ placeholder feature columns so `train_risk_scoring.py` / `train_win_probability.py` can run; for production, enrich with shard-manager or Node `buildFeatureVector` first). **Alternatives:** For risk-scoring and win-probability when real data &lt; 3k/5k, run `generate_synthetic_opportunities.py` and upload to `/ml_training/synthetic/risk_scoring` or similar. For LSTM, export Cosmos `risk_snapshots` to Parquet. Columns = [BI_SALES_RISK_FEATURE_PIPELINE_SPEC](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md) feature names + `target_risk` or `target_win` (or model-specific targets) per TRAINING_SCRIPTS_SPEC.

---

## 3. opportunity.outcome.recorded (Lock)

- **Event:** `opportunity.outcome.recorded`.
- **Payload (min):** `tenantId`, `opportunityId`, `outcome` (`"won"` \| `"lost"`), `competitorId?`, `closeDate`, `amount`.
- **Publisher:** **`outcome-sync`** batch job in risk-analytics (or dedicated). Schedule: `0 1 * * *`. Logic: query c_opportunity (via shard-manager or local cache) where `structuredData.IsClosed=true` and `updatedAt`/`CloseDate` in last 24h; for each, publish event. Dedupe by `opportunityId` + `closeDate` if re-runs.
- **Consumer:** risk-analytics `RiskAnalyticsEventConsumer` (on `opportunity.outcome.recorded`) → `OutcomeDataLakeWriter.appendOutcomeRow`. **Action:** Append to Data Lake `/ml_outcomes/year=.../month=.../day=.../` with schema §2.2. Requires `data_lake.connection_string`; when unset, handler skipped. Optionally upsert Cosmos for join at retrain.

---

## 4. Config

**logging (DataLakeCollector):** `data_lake.connection_string`, `data_lake.container`, `data_lake.path_prefix` (for risk_evaluations, e.g. `/risk_evaluations` or `""` if container is dedicated), `data_lake.ml_inference_logs_prefix` (for `/ml_inference_logs/...`, default `/ml_inference_logs`).  
**Outcome consumer:** Same `data_lake.*`; path for ml_outcomes = `data_lake.path_prefix` replaced or extended, e.g. `data_lake.ml_outcomes_prefix: /ml_outcomes` or derive from `path_prefix`.  
**Training scripts:** Read via `--input-path` or Azure ML Dataset; paths in [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md).

---

## 5. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Paths for risk_evaluations, ml_outcomes, ml_inference_logs, ml_training; Parquet columns; opportunity.outcome.recorded publisher/consumer lock. |
