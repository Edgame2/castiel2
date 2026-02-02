# Monitoring – Prometheus & Grafana

Prometheus scrape config and Grafana dashboards for **BI/risk** containers.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §8.5.3 and [ModuleImplementationGuide.md](../../documentation/global/ModuleImplementationGuide.md) §15.5.

## Layout

```
deployment/monitoring/
├── README.md
├── prometheus/
│   └── scrape-config.yaml   # Scrape jobs for BI/risk services
├── grafana/
│   └── dashboards/
│       ├── bi-risk-overview.json
│       ├── ml-service.json
│       └── batch-jobs.json
└── runbooks/
    ├── audit-event-flow.md   # 3-tier audit (§968) and tamper-proof (§969): event flow, verification, Azure Blob immutability
    ├── hitl-approval-flow.md  # HITL (Plan §972): config, trigger, flow; notification-manager (eventMapper), workflow-orchestrator approval API
    ├── model-governance.md    # Model cards (ml_models, GET /models/:id/card), bias: segment fairness in model-monitoring (§2.1 when added), training/CI TBD (§2.2) (Plan §975)
    ├── model-monitoring.md   # Model monitoring job, drift/performance, rollback (Plan §940, §11.7)
    ├── backfill-failure.md   # risk-snapshot-backfill, outcome-sync: inspect, retry, escalate (Plan §11.7)
    ├── consumer-scaling.md   # RabbitMQ consumer scaling for BI/risk queues (Plan §11.7)
    ├── performance-optimization.md  # ONNX/Redis if p95≥500ms; scale-to-zero, cost tuning for Azure ML (Plan §978)
    ├── rollout.md            # Beta tenants, 25/50/100%, feature flags, monitoring (Plan §984)
    ├── validation.md         # KPIs (Brier, MAPE, early-warning accuracy), UAT scenarios and pass criteria (Plan §985)
    ├── deep-learning-rl-causal.md  # Optional (§961): DNN/LSTM, RL (DQN), DoWhy; when in scope, Azure ML jobs and integration
    ├── ml-training-jobs.md   # Azure ML training jobs (risk-scoring, lstm, win-prob, prophet, anomaly); submit, data sources (Plan §5.6)
    ├── feedback-recommendation-flow.md  # Feedback recording, aggregation, recommendation.feedback.received, Data Lake /feedback sync (Plan W1)
    ├── tenant-list-admin.md  # Super Admin tenant list: recommendations → user-management admin/organizations (Plan Feedbacks Remaining §1)
    └── verification.md
```

## Success criteria checkpoints (Plan §10)

- **Test coverage:** ≥80% per key module; run Vitest with coverage (e.g. `pnpm test --coverage` in each container).
- **Performance:** Feedback &lt;100ms p95, catalog &lt;200ms p95, feature &lt;500ms, ML &lt;2s, end-to-end &lt;5s p95; verify via load tests and Prometheus/Grafana dashboards.
- **Recommendation accuracy:** &gt;85% measured from feedback aggregation or evaluation pipeline; tune models/config as needed.
- **Runbooks:** feedback-recommendation-flow, tenant-list-admin, model-monitoring, ml-training-jobs for ops verification.

## Prometheus

### `prometheus/scrape-config.yaml`

- **Jobs:** risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics, notification-manager, analytics-service (Plan §8.5.1, §8.5.2).
- **Targets:** `service:port` (e.g. `risk-analytics:3048`). Defaults match in-repo `config/default.yaml` ports.
- **Override:** In Kubernetes use e.g. `risk-analytics.<namespace>.svc.cluster.local:3048`. Replace `static_configs[].targets` via Helm/Kustomize/envsubst per environment.
- **Auth:** When `metrics.require_auth` is true, add to each job:
  - `bearer_token: <secret>`, or
  - `bearer_token_file: /path/to/file`
  Use the same value as `METRICS_BEARER_TOKEN` / `metrics.bearer_token` in the app.

### Use in Prometheus

Copy the `scrape_configs` from `scrape-config.yaml` into your main `prometheus.yml`, or use YAML include if your Prometheus supports it (path depends on your deployment layout).

## Grafana

### Dashboards

| File | UID | Description |
|------|-----|--------------|
| [bi-risk-overview.json](grafana/dashboards/bi-risk-overview.json) | `bi-risk-overview` | HTTP rate/latency, risk_evaluations, ml_predictions, BI/risk targets up |
| [ml-service.json](grafana/dashboards/ml-service.json) | `bi-risk-ml-service` | ML prediction rate/latency (p99, p95 SLO &lt; 500 ms) by model, ml-service HTTP; model-monitoring `ml_drift_checks_total`, `ml_drift_detections_total`, `ml_performance_degraded_total` (7d, Plan §940). |
| [batch-jobs.json](grafana/dashboards/batch-jobs.json) | `bi-risk-batch-jobs` | Batch job duration (p99) and runs by job_name, batch_job_triggers_total by batch_job (Plan §940 runbook §6), bi_batch_jobs consumption, workflow-orchestrator HTTP, rabbitmq_messages_consumed_total for logging_data_lake/logging_ml_audit/analytics_service (consumer-scaling runbook) |

### Data source

- Each dashboard has a `datasource` templating variable (default: Prometheus).
- Ensure a Prometheus data source exists in Grafana (name/UID `prometheus` or adjust the variable).

### Import

- **UI:** Dashboards → Import → Upload JSON (or paste).
- **Provisioning:** Put JSON in Grafana’s `dashboards` provisioning path and set the provider; or use the Grafana API.

## /metrics auth

When `metrics.require_auth` is true in a container:

1. **App:** `GET /metrics` requires `Authorization: Bearer <token>`; token is checked against `metrics.bearer_token` or `METRICS_BEARER_TOKEN`.
2. **Prometheus:** For that job, set `bearer_token` or `bearer_token_file` so scrapes succeed.

## Metric names (for dashboards)

Dashboards assume (Plan §8.5.2):

- `http_requests_total`, `http_request_duration_seconds_bucket`
- `risk_evaluations_total`, `ml_predictions_total`, `ml_prediction_duration_seconds_bucket` (label `model`), `ml_drift_checks_total` (label `model`; model-monitoring PSI), `ml_drift_detections_total` (label `model`; when `ml.model.drift.detected` published), `ml_performance_degraded_total` (label `model`, `metric`; when `ml.model.performance.degraded` published)
- `batch_job_duration_seconds_bucket` (label `job_name`), `batch_job_duration_seconds_count`
- `batch_job_triggers_total` (label `batch_job`; workflow-orchestrator when publishing `workflow.job.trigger`)
- `forecasts_generated_total` (forecasting; when a forecast is generated)
- `rabbitmq_messages_consumed_total` (label `queue`, e.g. `bi_batch_jobs`)

Containers must expose these (or equivalent) per the implementation plan and ModuleImplementationGuide §15.5.

## SLOs (Plan §11.7)

- **Risk-predictions / win-probability / risk-scoring p95:** &lt; 500 ms. **Metric:** `histogram_quantile(0.95, sum(rate(ml_prediction_duration_seconds_bucket{model=~\"win-probability|risk-scoring|...\"}[5m])) by (le, model))`. **Dashboard:** [ml-service.json](grafana/dashboards/ml-service.json). **Trigger for ONNX/Redis:** when p95 ≥ 500 ms over a sustained window; see [runbooks/performance-optimization.md](runbooks/performance-optimization.md). **KPIs and targets:** [runbooks/validation.md](runbooks/validation.md).

## Runbooks

- **[runbooks/audit-event-flow.md](runbooks/audit-event-flow.md)** – 3-tier audit (Plan §968) and tamper-proof (Plan §969): `risk.evaluated`, `risk.prediction.generated`, `ml.prediction.completed` → DataLakeCollector, MLAuditConsumer, UsageTrackingConsumer; verification; enable Azure Blob immutability for audit when required.
- **[runbooks/hitl-approval-flow.md](runbooks/hitl-approval-flow.md)** – HITL (Plan §972): config in risk-analytics (`hitl_approvals`, `hitl_risk_min`, `hitl_deal_min`), trigger condition, flow (`hitl.approval.requested`, `hitl.approval.completed`); notification-manager (eventMapper), workflow-orchestrator approval API (GET/POST hitl/approvals).
- **[runbooks/model-governance.md](runbooks/model-governance.md)** – Model cards (ml_models, `GET /api/v1/ml/models/:id/card`), bias: segment fairness in model-monitoring (§2.1 when added), training/CI placement TBD (§2.2) (Plan §975).
- **[runbooks/model-monitoring.md](runbooks/model-monitoring.md)** – Model monitoring batch job (Plan §940), `ml.model.drift.detected` / `ml.model.performance.degraded`, model rollback.
- **[runbooks/backfill-failure.md](runbooks/backfill-failure.md)** – risk-snapshot-backfill and outcome-sync failure: inspect, retry, escalate (Plan §11.7).
- **[runbooks/consumer-scaling.md](runbooks/consumer-scaling.md)** – RabbitMQ consumer scaling for BI/risk queues (Plan §11.7).
- **[runbooks/performance-optimization.md](runbooks/performance-optimization.md)** – ONNX/Redis for win-prob or risk-scoring if p95 ≥ 500 ms; scale-to-zero and cost tuning for Azure ML (Plan §978).
- **[runbooks/rollout.md](runbooks/rollout.md)** – Beta tenants, 25/50/100% phased rollout, feature flags (config/configuration-service), monitoring during rollout (Plan §984).
- **[runbooks/validation.md](runbooks/validation.md)** – KPIs (Brier, MAPE, early-warning accuracy, etc.), where computed/stored; UAT scope, scenarios, pass criteria &gt;95% (Plan §985).
- **[runbooks/deep-learning-rl-causal.md](runbooks/deep-learning-rl-causal.md)** – Optional (Plan §961): DNN/LSTM for sequences, RL (DQN) for strategy, DoWhy for causal; design for Azure ML jobs and integration into risk/win-prob/recommendations when in scope.
- **[runbooks/ml-training-jobs.md](runbooks/ml-training-jobs.md)** – Azure ML training jobs (risk-scoring, lstm-trajectory, win-probability, prophet, anomaly); submit commands, input data sources, deploy (Plan §5.6).
