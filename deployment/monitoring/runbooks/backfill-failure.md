# Backfill Failure Runbook (Plan §11.7)

When **risk-snapshot-backfill** (or **outcome-sync**) fails: how to inspect, retry, and escalate.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §9.3, §11.7.

---

## 1. Overview

- **risk-snapshot-backfill:** Reads Parquet from Data Lake `/risk_evaluations/year=.../month=.../day=.../` and upserts into Cosmos `risk_snapshots`. Worker: risk-analytics `BatchJobWorker.runRiskSnapshotBackfill`. On failure: `workflow.job.failed` (payload: job, error, failedAt).
- **outcome-sync:** Queries c_opportunity (IsClosed, recently updated), publishes `opportunity.outcome.recorded`. Worker: risk-analytics `BatchJobWorker.runOutcomeSync`. On failure: `workflow.job.failed`.

---

## 2. Common failure causes

### risk-snapshot-backfill

| Cause | Error / symptom | Fix |
|-------|----------------|-----|
| Missing config | `data_lake.connection_string and data_lake.container are required` | Set `data_lake.connection_string`, `data_lake.container` in risk-analytics `config/default.yaml` or env (e.g. `DATA_LAKE_CONNECTION_STRING`, `DATA_LAKE_CONTAINER`). |
| Data Lake / Blob unreachable | Blob list or `downloadToFile` throws (network, auth, 404) | Check storage account connectivity, connection string, firewall, RBAC. Ensure path prefix `data_lake.path_prefix` (default `/risk_evaluations`) and `year=.../month=.../day=...` structure match DataLakeCollector output. |
| Parquet read error | `ParquetReader.openFile` or `cursor.next` throws | Verify Parquet schema matches expected (tenantId, opportunityId, riskScore, categoryScores, topDrivers?, dataQuality?, timestamp, evaluationId?). Corrupt or truncated files: re-export or exclude bad date. |
| Cosmos upsert error | `upsertFromDataLakeRow` / Cosmos `items.upsert` throws | Check Cosmos endpoint, key, `cosmos_db.containers.snapshots` (default `risk_snapshots`), partition key `tenantId`, RUs. |

### outcome-sync

| Cause | Error / symptom | Fix |
|-------|----------------|-----|
| Shard-manager unavailable | HTTP or timeout when listing c_opportunity | Set `services.shard_manager.url`; check shard-manager health and network. |
| RabbitMQ / publish failure | `publishOpportunityOutcomeRecorded` or `workflow.job.trigger` publish fails | Check `rabbitmq.url`, `coder_events` exchange, queue bindings. |
| Tenant list empty | `outcome_sync.tenant_ids` empty and no metadata.tenantIds | Configure `outcome_sync.tenant_ids` in risk-analytics or pass `metadata: { tenantIds: [...] }` when triggering. |

---

## 3. Inspect

1. **Logs:** risk-analytics `BatchJobWorker` logs `risk-snapshot-backfill failed` or `outcome-sync failed` with `{ metadata, service: 'risk-analytics' }` and the error. Search for the `job` and `metadata` (e.g. `from`, `to` for backfill).
2. **Events:** `workflow.job.failed` is published with `{ job, error, failedAt }`. Consumers: logging (MLAuditConsumer if bound). Query audit or log aggregator for `workflow.job.failed` and `job: risk-snapshot-backfill` or `outcome-sync`.
3. **Metrics:** `batch_job_duration_seconds_count{job_name="risk-snapshot-backfill"}` (or `outcome-sync`) increments even on failure (observed in `finally`). No separate failure counter; use logs/events.
4. **Health:** risk-analytics `/health` includes `lastRiskSnapshotBackfillAt`. If backfill keeps failing, this stays stale or null.
5. **Grafana:** [batch-jobs.json](../grafana/dashboards/batch-jobs.json) – `batch_job_duration_seconds` and run counts by `job_name`; filter for `risk-snapshot-backfill` or `outcome-sync`.

---

## 4. Retry

### risk-snapshot-backfill

1. **Fix config or upstream** (Data Lake, Cosmos) as in §2.
2. **Re-trigger:** Publish `workflow.job.trigger` with:
   - `job: 'risk-snapshot-backfill'`
   - `metadata: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }` (optional; default last 7 days).
   - To the `bi_batch_jobs` queue or the exchange that binds to it.
3. **Narrow the window:** If a specific date’s Parquet is corrupt, use `from`/`to` to exclude it and backfill the rest; fix or re-export the bad date separately.

### outcome-sync

1. **Fix** shard-manager, RabbitMQ, or `outcome_sync.tenant_ids` per §2.
2. **Re-trigger:** `workflow.job.trigger` with `job: 'outcome-sync'` and optional `metadata: { tenantIds: [...] }`.

---

## 5. Escalate

- **Repeated failures** after config/connectivity fixes: check Data Lake and Cosmos throttling, RBAC, and schema. Consider splitting date range (multiple `workflow.job.trigger` with smaller `from`/`to`).
- **Data Lake path or schema changes:** Align `data_lake.path_prefix` and Parquet columns with [BI_SALES_RISK_DATA_LAKE_LAYOUT](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md). DataLakeCollector writes `risk.evaluated` → Parquet; backfill reads the same layout.
- **Cosmos `risk_snapshots`:** Ensure container exists, partition key `tenantId`, and `upsertFromDataLakeRow` / `RiskSnapshotService` logic match. On persistent Cosmos errors, review RUs and throttling.

---

## 6. Configuration

- **risk-analytics** `config/default.yaml`: `data_lake.connection_string`, `data_lake.container`, `data_lake.path_prefix`; `cosmos_db.containers.snapshots`; for outcome-sync: `services.shard_manager.url`, `outcome_sync.tenant_ids`, `rabbitmq.url`.
- **workflow-orchestrator:** `batch_jobs.risk_snapshot_backfill_cron` (default `0 1 * * 0`), `batch_jobs.outcome_sync_cron` (default `0 1 * * *`). Env: `RISK_SNAPSHOT_BACKFILL_CRON`, `OUTCOME_SYNC_CRON`.

---

## 7. Related

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §9.3, §11.7
- [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md) – Parquet paths and schema
- [model-monitoring.md](model-monitoring.md), [backfill-failure.md](backfill-failure.md), [consumer-scaling.md](consumer-scaling.md) – Plan §11.7 runbooks
- `containers/risk-analytics` `BatchJobWorker`, `RiskSnapshotService`
