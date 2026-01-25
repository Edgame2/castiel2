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
    ├── model-monitoring.md   # Model monitoring job, drift/performance, rollback (Plan §940, §11.7)
    └── ml-training-jobs.md   # Azure ML training jobs (risk-scoring, lstm, win-prob, prophet, anomaly); submit, data sources (Plan §5.6)
```

## Prometheus

### `prometheus/scrape-config.yaml`

- **Jobs:** risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics, notification-manager (Plan §8.5.1).
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
| `bi-risk-overview.json` | `bi-risk-overview` | HTTP rate/latency, risk_evaluations, ml_predictions, BI/risk targets up |
| `ml-service.json` | `bi-risk-ml-service` | ML prediction rate/latency by model, ml-service HTTP |
| `batch-jobs.json` | `bi-risk-batch-jobs` | Batch job duration and runs, bi_batch_jobs consumption, workflow-orchestrator HTTP |

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

Dashboards assume:

- `http_requests_total`, `http_request_duration_seconds_bucket`
- `risk_evaluations_total`, `ml_predictions_total`, `ml_prediction_duration_seconds_bucket` (label `model`)
- `batch_job_duration_seconds_bucket` (label `job_name`), `batch_job_duration_seconds_count`
- `rabbitmq_messages_consumed_total` (label `queue`, e.g. `bi_batch_jobs`)

Containers must expose these (or equivalent) per the implementation plan and ModuleImplementationGuide §15.5.

## Runbooks

- **[runbooks/model-monitoring.md](runbooks/model-monitoring.md)** – Model monitoring batch job (Plan §940), `ml.model.drift.detected` / `ml.model.performance.degraded`, model rollback.
- **[runbooks/ml-training-jobs.md](runbooks/ml-training-jobs.md)** – Azure ML training jobs (risk-scoring, lstm-trajectory, win-probability, prophet, anomaly); submit commands, input data sources, deploy (Plan §5.6).
