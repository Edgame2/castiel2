# BI Sales Risk – In-Scope User Requirements

**Source:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §10, Phases 1–2 and implemented Phase 3.  
**Scope:** Phases 1–2 (Months 1–6) as initial delivery; selected Phase 3 (industry benchmarks, drill-down) implemented.

---

## Purpose

BI Sales Risk supports **risk evaluation**, **early warning**, **win probability**, **forecasting**, **competitive intelligence**, and **remediation** across opportunities and accounts. Data flows from shards (c_opportunity, c_account, c_contact, activities), risk-analytics, ml-service, forecasting, and recommendations. All with **tenantId**-only isolation and **config-driven** service URLs.

---

## In-Scope Capabilities

### Dashboards

- **Manager** (`/dashboard/manager`): team, pipeline, risk, early warning, “Recommended today” (prioritized by revenue-at-risk × risk × early-warning).
- **Executive** (`/dashboard/executive`): revenue-at-risk, forecast, competitive win/loss, risk heatmap, industry benchmark.
- **Board** (`/dashboard/board`): high-level KPIs.

### Opportunity & Risk

- **Opportunity list/detail** (`/opportunities`, `/opportunities/[id]`): risk score, win probability, early-warning, competitors, anomalies.
- **Risk deep-dive** (`/opportunities/[id]/risk`): risk trajectory (30/60/90-day), velocity, explainability (top drivers), clusters.
- **Win probability**: from ml-service (or heuristic fallback); explain endpoint for drivers.

### Early Warning & Anomalies

- **Early-warning** signals (stage stagnation, activity drop, stakeholder churn, risk acceleration); **quick actions** (create task, log activity, start remediation).
- **Anomaly detection** (statistical; ML Isolation Forest when deployed); quick actions.
- **Risk predictions** (LSTM when deployed; rules fallback).

### Competitive Intelligence

- **Competitors**: CRUD, link to opportunities; **win/loss** from opportunity status and `risk_win_loss_reasons`; **win/loss reasons** (lossReason, winReason, competitorId).
- **Competitive dashboard** (`/analytics/competitive`): win/loss by competitor, mentions.

### Remediation

- **Remediation workflows** (`/opportunities/[id]/remediation`): create from mitigation actions, complete steps, cancel. **Mitigation ranking** (model or stub).

### Account & Portfolio

- **Account health** (`/accounts/[id]`): health score, trend, critical opportunities; **stakeholder graph** (has_contact, reports_to).
- **Portfolio drill-down** (`/analytics/portfolios`): portfolio → account → opportunity → activity. **Summary**, **accounts**, **opportunities per account**, **activities per opportunity** from dashboard-analytics (shard-manager).

### Industry Benchmarks

- **Industry benchmarks** (`/analytics/benchmarks`): deal size and cycle time percentiles (P10–P90), industry avg win rate; **compare to opportunity** (amount vs benchmark).

### Forecasting

- **Scenario forecast** (P10/P50/P90), **risk-adjusted forecast**, **ML forecast** (when Prophet/XGBoost deployed via Azure ML).

### Data & ML

- **Risk snapshots** (from `risk.evaluated`); **Data Lake** Parquet (`/risk_evaluations`, `/ml_outcomes`, `/ml_training`); **outcome feedback** (`opportunity.outcome.recorded`) for retraining.
- **Model selection** (risk-scoring: global vs industry; win-probability). **Model card** (`GET /api/v1/models/:id/card`). **Model monitoring** (drift, performance; runbook).
- **Training** (risk-scoring, LSTM, win-probability, Prophet, anomaly) via Azure ML jobs; see `deployment/monitoring/runbooks/ml-training-jobs.md`.

### Observability & Runbooks

- **Application Insights**, **Prometheus /metrics** (`http_requests_total`, `risk_evaluations_total`, `ml_predictions_total`, `batch_job_duration_seconds`, etc.). **Runbooks:** model-monitoring, ml-training-jobs.

---

## Out of Scope (Current)

- Phases 4–5: 3-tier audit, tamper-proof logging, HITL thresholds, model governance (bias/CI), ONNX/Redis optimization, rollout/validation.
- Phase 3 (optional): DNN/RL/DoWhy; further deep learning.
- Mobile-first; scheduled PDF/PPT; credit/company health DBs; LLM fine-tuning.

---

## References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md)
- [BI_SALES_RISK_SHARD_SCHEMAS.md](./BI_SALES_RISK_SHARD_SCHEMAS.md)
- [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md)
- [deployment/monitoring/runbooks/ml-training-jobs.md](../../deployment/monitoring/runbooks/ml-training-jobs.md)
- [deployment/monitoring/runbooks/model-monitoring.md](../../deployment/monitoring/runbooks/model-monitoring.md)
