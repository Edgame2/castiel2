# Consumer Scaling Runbook (Plan §11.7)

When and how to scale **RabbitMQ consumers** for BI/risk queues: `bi_batch_jobs`, `logging_data_lake`, `logging_ml_audit`, and analytics-service usage.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §9.3, §11.7.

---

## 1. BI/risk queues and consumers

| Queue | Consumer | Container | Bindings / routing | Notes |
|-------|----------|-----------|--------------------|-------|
| `bi_batch_jobs` | BatchJobWorker | risk-analytics | `workflow.job.trigger` | risk-snapshot-backfill, outcome-sync, risk-clustering, account-health, industry-benchmarks, propagation, model-monitoring. One job per message; long-running. |
| `logging_data_lake` | DataLakeCollector | logging | `risk.evaluated` | Parquet write per event. Prefetch 10. |
| `logging_ml_audit` | MLAuditConsumer | logging | `risk.evaluated`, `risk.prediction.generated`, `ml.prediction.completed`, `remediation.workflow.completed`, `hitl.approval.requested`, `hitl.approval.completed`, `ml.model.drift.detected`, `ml.model.performance.degraded` | Blob write per event. Prefetch 10. |
| (analytics-service usage queue) | UsageTrackingConsumer | analytics-service | `ml.prediction.completed`, `llm.inference.completed`, `embedding.generated` | Cosmos append. |

---

## 2. When to scale

- **bi_batch_jobs:** Backlog (queue depth) grows; `batch_job_duration_seconds` p99 or time-to-complete increases; `workflow.job.trigger` published faster than jobs finish. Scale **risk-analytics** (more BatchJobWorker instances).
- **logging_data_lake / logging_ml_audit:** Lag vs. `risk.evaluated` and ML/audit publish rate; queue depth grows. Scale **logging** (more DataLakeCollector and MLAuditConsumer instances; one process typically runs both, so more logging pods).
- **analytics-service usage:** Queue depth or lag for `ml.prediction.completed` etc. Scale **analytics-service**.

---

## 3. How to scale

### Horizontal (replicas)

- **Kubernetes:** Increase `replicas` for risk-analytics, logging, analytics-service. RabbitMQ delivers each message to one consumer; more consumers = more throughput. Competing consumers are safe for these queues (batch jobs are independent; Data Lake/audit writes are append-only per event).
- **Recommendation:** Start with 1–2 for risk-analytics (batch jobs are cron-led; burst only if many triggers). Logging: 1–2; scale up if `risk.evaluated` rate is high. analytics-service: per ML call volume.

### Prefetch

- **DataLakeCollector, MLAuditConsumer:** `prefetch(10)`. Lower = fairer across consumers, fewer in-flight; higher = more throughput per consumer. Tune only if one consumer is starved or overloaded; 10 is a reasonable default.
- **BatchJobWorker:** Uses EventConsumer; prefetch is in the client or default. For long-running jobs, keep prefetch low (e.g. 1–5) so one slow job does not block others.

### RabbitMQ and network

- Ensure enough connections, channels, and broker resources. Monitor RabbitMQ queue depth, publish/deliver rates. Scale the broker or add nodes if it becomes the bottleneck.

---

## 4. Metrics to watch

- `rabbitmq_messages_consumed_total{queue="bi_batch_jobs"}` (and `logging_data_lake`, `logging_ml_audit`, `analytics_service`) – consumption rate. Compare to publish rate; lag = backlog.
- **Grafana:** [batch-jobs.json](../grafana/dashboards/batch-jobs.json) – `bi_batch_jobs` and logging/analytics queue consumption; `batch_job_duration_seconds` p99. If consumption lags behind `batch_job_triggers_total` and duration is high, scale risk-analytics.
- **RabbitMQ management / Prometheus:** `queue_depth` or `messages_ready` for each queue. Growing depth = need more consumers or faster processing.

---

## 5. Ordering and idempotency

- **bi_batch_jobs:** Jobs are independent; order does not matter. Retries: `workflow.job.failed`; manual re-trigger via `workflow.job.trigger`.
- **Data Lake / audit:** Append-only, one blob per event. Duplicate delivery can cause duplicate files (unique path by routingKey+id+date); idempotent at read if app de-duplicates by id. For strict once-only, use idempotency keys or accept rare duplicates on nack/requeue.
- **usage_ml:** Cosmos append; duplicates can be handled by upsert on a composite key if implemented.

---

## 6. Configuration

- **risk-analytics:** `rabbitmq.batch_jobs.queue` (default `bi_batch_jobs`), `rabbitmq.batch_jobs.routing_keys` (e.g. `workflow.job.trigger`). Queue must be bound to `coder_events` with that routing key.
- **logging:** `rabbitmq.data_lake.queue`, `rabbitmq.data_lake.bindings`; `rabbitmq.ml_audit.queue`, `rabbitmq.ml_audit.bindings`. `data_lake.connection_string` required for both DataLakeCollector and MLAuditConsumer.
- **analytics-service:** `rabbitmq.bindings` for usage; `cosmos_db.containers.usage_ml`.

---

## 7. Related

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §9.3, §11.7
- [model-monitoring.md](model-monitoring.md), [backfill-failure.md](backfill-failure.md) – Plan §11.7 runbooks
- [audit-event-flow.md](audit-event-flow.md) – DataLakeCollector, MLAuditConsumer, UsageTrackingConsumer
- [deployment/monitoring/README.md](../README.md) – `rabbitmq_messages_consumed_total`, batch-jobs dashboard
- `containers/risk-analytics` BatchJobWorker; `containers/logging` DataLakeCollector, MLAuditConsumer; `containers/analytics-service` UsageTrackingConsumer
