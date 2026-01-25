# Audit Event Flow (3-Tier) & Tamper-Proof — Plan §968, §969

Verification that `risk.evaluated`, `risk.prediction.generated`, and `ml.prediction.completed` feed **logging** (ML audit), **Data Collector** (Data Lake), and **usage tracking** for ML calls.  
Tamper-proof: how to make the audit backend **immutable** or append-only.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §968, §969, §3.5, §7.

---

## 1. Event → consumer matrix

| Event | Publisher | Data Collector (Data Lake) | Logging (ML audit) | Usage tracking |
|-------|-----------|----------------------------|--------------------|----------------|
| `risk.evaluated` | risk-analytics | **DataLakeCollector** (logging) → Parquet `/risk_evaluations/...` and `/ml_inference_logs/...` (Plan §940, §2.3) | **MLAuditConsumer** (logging) → Blob `audit_path_prefix` | — |
| `risk.prediction.generated` | risk-analytics | — | **MLAuditConsumer** (logging) → Blob | — |
| `ml.prediction.completed` | ml-service | **DataLakeCollector** (logging) → Parquet `/ml_inference_logs/...` (Plan §940, §2.3) | **MLAuditConsumer** (logging) → Blob | **UsageTrackingConsumer** (analytics-service) → Cosmos `analytics_usage_ml` |
| `hitl.approval.requested`, `hitl.approval.completed` | risk-analytics, workflow-orchestrator | — | **MLAuditConsumer** (logging) → Blob (Plan §972) | — |
| `ml.model.drift.detected`, `ml.model.performance.degraded` | ml-service | — | **MLAuditConsumer** (logging) → Blob (Plan §940) | — |

- **Data Collector** = `containers/logging` `DataLakeCollector`; bindings: `risk.evaluated`, `ml.prediction.completed`. Paths: `/risk_evaluations/...` (§2.1), `/ml_inference_logs/...` (§2.3; Plan §940). Config: `data_lake.path_prefix`, `data_lake.ml_inference_logs_prefix`. [BI_SALES_RISK_DATA_LAKE_LAYOUT](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md).
- **Logging (ML audit)** = `containers/logging` `MLAuditConsumer`; bindings: `risk.evaluated`, `risk.prediction.generated`, `ml.prediction.completed`, `remediation.workflow.completed`, `hitl.approval.requested`, `hitl.approval.completed` (Plan §972), `ml.model.drift.detected`, `ml.model.performance.degraded` (Plan §940). Writes to `data_lake.audit_path_prefix` (Blob).
- **Usage tracking** = `containers/analytics-service` `UsageTrackingConsumer`; bindings: `ml.prediction.completed`, `llm.inference.completed`, `embedding.generated`. Writes to Cosmos `analytics_usage_ml` (or `usage_ml`).

`risk.evaluated` also drives **risk-analytics** `RiskSnapshotService` → Cosmos `risk_snapshots` (separate from 3-tier audit).

---

## 2. Config to verify

- **logging** `config/default.yaml`: `rabbitmq.data_lake.queue`, `rabbitmq.data_lake.bindings` (risk.evaluated, ml.prediction.completed); `rabbitmq.ml_audit.queue`, `rabbitmq.ml_audit.bindings` (risk.evaluated, risk.prediction.generated, ml.prediction.completed, remediation.workflow.completed, hitl.approval.requested, hitl.approval.completed, ml.model.drift.detected, ml.model.performance.degraded). `data_lake.connection_string`, `data_lake.audit_path_prefix`, `data_lake.ml_inference_logs_prefix` (optional, default `/ml_inference_logs`).
- **analytics-service** `config/default.yaml`: `rabbitmq.bindings` including `ml.prediction.completed`; `cosmos_db.containers.usage_ml`.

---

## 3. How to verify at runtime

1. **RabbitMQ:** Confirm queues `logging_data_lake`, `logging_ml_audit` and analytics-service usage queue are bound to `coder_events` with the routing keys above.
2. **Consumers:** Check logging and analytics-service startup logs for DataLakeCollector, MLAuditConsumer, UsageTrackingConsumer “started” and bindings.
3. **Data Lake:** When `data_lake.connection_string` is set: after `risk.evaluated`, ensure Parquet under `/risk_evaluations/year=.../month=.../day=.../`; after `risk.evaluated` or `ml.prediction.completed`, also verify Parquet under `/ml_inference_logs/year=.../month=.../day=.../` (path from `data_lake.ml_inference_logs_prefix`).
4. **Audit Blob:** After any MLAuditConsumer event (risk.evaluated, risk.prediction.generated, ml.prediction.completed, remediation.workflow.completed, hitl.approval.*, ml.model.drift.detected, ml.model.performance.degraded), ensure files under `audit_path_prefix` (when `data_lake.connection_string` is set).
5. **Usage:** After `ml.prediction.completed`, ensure documents in Cosmos `analytics_usage_ml` (when analytics-service RabbitMQ and Cosmos are configured).

---

## 4. Tamper-proof (Plan §969)

**MLAuditConsumer** and **DataLakeCollector** write **one blob per event** (unique path per `routingKey` + `id` + date). No in-place overwrite → **append-only** behavior at the object level.

To enforce **immutability** when required by compliance:

1. **Azure Blob – immutability policy**  
   On the storage account **container** used for `data_lake.container` (audit and/or `audit_path_prefix`), set a **time-based immutability policy** (retention in days) or **legal hold**.  
   - Azure Portal: Container → *Access policy* → *Immutability*  
   - ARM/Bicep: `Microsoft.Storage/storageAccounts/blobServices/containers` with `immutableStorageWithVersioning`  
   - [Azure: Immutable storage for blob data](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)

2. **Separate audit container**  
   Use a dedicated container (e.g. `audit`) for `audit_path_prefix` and apply the immutability policy only there; keep `risk_evaluations` (Parquet) in a different container if retention rules differ.

3. **DataLakeCollector (Parquet)**  
   Writes under `/risk_evaluations/year=.../month=.../day=.../` with unique filenames. Same approach: apply a container-level immutability policy if risk_evaluations must be tamper-proof.

---

## 5. References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §3.5, §7, §968, §969
- [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](../../../documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md)
- [consumer-scaling.md](consumer-scaling.md) – DataLakeCollector, MLAuditConsumer, UsageTrackingConsumer; [batch-jobs.json](../grafana/dashboards/batch-jobs.json) for `rabbitmq_messages_consumed_total`
- [model-monitoring.md](model-monitoring.md) – `ml.model.drift.detected`, `ml.model.performance.degraded` (Plan §940)
- [hitl-approval-flow.md](hitl-approval-flow.md) – `hitl.approval.requested`, `hitl.approval.completed` (Plan §972)
- `containers/logging/README.md` (DataLakeCollector, MLAuditConsumer)
- `containers/analytics-service` (UsageTrackingConsumer)
