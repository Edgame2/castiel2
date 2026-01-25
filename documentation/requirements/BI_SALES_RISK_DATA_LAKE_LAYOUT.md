# BI Sales Risk – Data Lake Layout & Parquet Schemas

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Single reference for Azure Data Lake paths, Parquet column names, and outcome/retraining flows.  
**Referenced by:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md), [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md), DataLakeCollector, outcome-sync, outcome consumer.

---

## 1. Path Layout

Base: `data_lake.path_prefix` (default `/risk_evaluations` applies to the risk-evals area; other areas have their own prefix or subpaths under the same container).  
**Container:** `data_lake.container` (default `risk`). All paths below are relative to container root.  
**risk_evaluations:** Uses `data_lake.path_prefix` (default `/risk_evaluations`). **ml_outcomes:** Use `data_lake.ml_outcomes_prefix` (default `/ml_outcomes`) or equivalent config in the outcome consumer.

| Path pattern | Writer | Reader | Format |
|--------------|--------|--------|--------|
| `/risk_evaluations/year=YYYY/month=MM/day=DD/*.parquet` | DataLakeCollector (logging) | risk-snapshot-backfill, training | Parquet |
| `/ml_outcomes/year=YYYY/month=MM/day=DD/*.parquet` | outcome consumer (ml-service or risk-analytics) | training (win-prob, risk-scoring) | Parquet |
| `/ml_inference_logs/year=YYYY/month=MM/day=DD/*.parquet` | ml-service / risk-analytics at inference | model-monitoring (drift) | Parquet |
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
**Consumer:** ml-service or risk-analytics; appends one row per `opportunity.outcome.recorded` to `/ml_outcomes/year=.../month=.../day=DD/outcomes.parquet` (or hourly file; implementation choice).

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

**Source:** At `risk.evaluated` and `ml.prediction.completed`: log feature vector (or hash) + metadata. Writer: service that performs the prediction (risk-analytics for risk, ml-service for win-prob, etc.).

| Column | Type | Source |
|--------|------|--------|
| `tenantId` | string | — |
| `opportunityId` | string | — |
| `modelId` | string | — |
| `timestamp` | string (ISO) | — |
| `featureVector` | string (JSON) or map | optional; or `featureHash` only for size |
| `prediction` | double / string | riskScore or winProbability etc. |

### 2.4 `/ml_training/{model_id}/...`

Pre-joined training data; optional. If built by a pipeline from `risk_evaluations` + `ml_outcomes` + shard-manager features, columns = [BI_SALES_RISK_FEATURE_PIPELINE_SPEC](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md) feature names + `target_risk` or `target_win` per [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md).

---

## 3. opportunity.outcome.recorded (Lock)

- **Event:** `opportunity.outcome.recorded`.
- **Payload (min):** `tenantId`, `opportunityId`, `outcome` (`"won"` \| `"lost"`), `competitorId?`, `closeDate`, `amount`.
- **Publisher:** **`outcome-sync`** batch job in risk-analytics (or dedicated). Schedule: `0 1 * * *`. Logic: query c_opportunity (via shard-manager or local cache) where `structuredData.IsClosed=true` and `updatedAt`/`CloseDate` in last 24h; for each, publish event. Dedupe by `opportunityId` + `closeDate` if re-runs.
- **Consumer:** ml-service or risk-analytics. **Action:** Append to Data Lake `/ml_outcomes/year=.../month=.../day=.../` with schema §2.2. Optionally upsert Cosmos `ml_outcomes` or `ml_win_probability_predictions` for join at retrain.

---

## 4. Config

**logging (DataLakeCollector):** `data_lake.connection_string`, `data_lake.container`, `data_lake.path_prefix` (for risk_evaluations, e.g. `/risk_evaluations` or `""` if container is dedicated).  
**Outcome consumer:** Same `data_lake.*`; path for ml_outcomes = `data_lake.path_prefix` replaced or extended, e.g. `data_lake.ml_outcomes_prefix: /ml_outcomes` or derive from `path_prefix`.  
**Training scripts:** Read via `--input-path` or Azure ML Dataset; paths in [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md).

---

## 5. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Paths for risk_evaluations, ml_outcomes, ml_inference_logs, ml_training; Parquet columns; opportunity.outcome.recorded publisher/consumer lock. |
