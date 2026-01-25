# BI Sales Risk Validation — Plan §985

KPIs (Brier, MAPE, early-warning accuracy, etc.) and UAT.  
Per [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §985 and [BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md) Success Metrics & KPIs.

---

## 1. KPIs and targets

### 1.1 ML model performance

| Model | Metric | Target | Where computed |
|-------|--------|--------|----------------|
| Win probability | Brier | &lt; 0.15 | Training script (Azure ML run); model-monitoring (production) |
| Win probability | AUC-ROC | &gt; 0.80 | Training; model-monitoring |
| Risk scoring | Calibration error | &lt; 0.05 | Training; model-monitoring |
| Risk scoring | R² | &gt; 0.85 | Training (if regression) |
| Revenue forecasting | MAPE (30-day) | &lt; 15% | Forecasting; model-monitoring |
| Revenue forecasting | MAPE (60/90-day) | &lt; 20% / &lt; 25% | Forecasting |
| Revenue forecasting | Bias | ± 5% | Forecasting |
| Early warning (30-day) | Accuracy | &gt; 75% | model-monitoring or validation job vs outcomes |
| Early warning (60/90-day) | Accuracy | &gt; 65% / &gt; 55% | Same |
| Anomaly | Precision / Recall | &gt; 70% / &gt; 60% | model-monitoring (labeled subset) |

### 1.2 Where computed and stored

- **Training:** Azure ML runs log Brier, AUC, calibration to the run; see [ml-training-jobs.md](ml-training-jobs.md). Training scripts (e.g. `train_win_probability.py`) emit these.
- **Production:** model-monitoring job ([model-monitoring.md](model-monitoring.md)) – Brier, MAE (from `ml_evaluations`), PSI (from `/ml_inference_logs`). `ModelMonitoringService.runForTenants` implemented; publishes `ml.model.performance.degraded`, `ml.model.drift.detected`. See model-monitoring.md.
- **Forecasting:** `ForecastingService` / forecasting container; MAPE and bias from actuals when available. Store in `ml_evaluations` or reporting DB if present.

### 1.3 How to view

- **Azure ML:** Run metrics in Studio for each training job.
- **Grafana:** [README](../README.md) – [ml-service.json](../grafana/dashboards/ml-service.json), [bi-risk-overview.json](../grafana/dashboards/bi-risk-overview.json), [batch-jobs.json](../grafana/dashboards/batch-jobs.json). **ml-service.json** includes model-monitoring panels: `ml_drift_checks_total`, `ml_drift_detections_total`, `ml_performance_degraded_total` (Brier/MAE from `ml_evaluations`). model-monitoring **reads** `ml_evaluations`; it does not write. For raw Brier/MAPE trends, use `ml_evaluations` queries below.
- **Cosmos `ml_evaluations`:** Query by `modelId`, `tenantId`, `evaluationDate` for Brier, MAE, and other evaluation metrics.

---

## 2. UAT (User Acceptance Testing)

### 2.1 Scope

- **Risk:** Evaluation, risk snapshots, risk velocity, revenue-at-risk, early-warning cards, explainability.
- **Win probability:** Per-opportunity and batch; explainability.
- **Dashboards:** Manager, executive, board; risk heatmap, benchmarks, drill-down.
- **Remediation:** Quick actions, mitigation actions, remediation workflows (create, complete step, cancel).
- **Competitive intel:** Track competitor, dashboard, win/loss.

### 2.2 Scenarios (checklist)

- [ ] Run risk evaluation for an opportunity; view risk score, top drivers, data quality, trust level.
- [ ] View risk snapshots and risk velocity; confirm early-warning appears when thresholds met.
- [ ] Request win-probability; view gauge and explainability.
- [ ] Open manager dashboard; see prioritized opportunities, recommended today.
- [ ] Open executive/board dashboard; see revenue-at-risk, heatmap, benchmarks.
- [ ] Drill down: portfolio → accounts → opportunities → activities.
- [ ] Run quick action (e.g. create task) from early-warning or anomaly card.
- [ ] Start remediation workflow; complete a step; cancel.
- [ ] Track competitor for an opportunity; view competitive dashboard.

### 2.3 Pass criteria

- **Pass rate:** &gt; 95% of scenarios pass (or as agreed with product/ops).
- **Blockers:** No P0/P1 defects open for BI/risk flows. Non-blocking issues logged for follow-up.

### 2.4 Who runs UAT

- Product, ops, or designated UAT testers. Use beta tenants from [rollout.md](rollout.md) where possible.

### 2.5 Where to log results

- Test management tool (e.g. Azure DevOps, Jira), or a shared sheet. Link to runbook and plan §985.

---

## 3. References

- [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §985
- [BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md](../../../documentation/requirements/BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md) – Success Metrics & KPIs
- [model-governance.md](model-governance.md) – model cards, segment fairness, bias checks
- [model-monitoring.md](model-monitoring.md) – Brier, MAE, drift
- [ml-training-jobs.md](ml-training-jobs.md) – training metrics
- [performance-optimization.md](performance-optimization.md) – SLO p95 &lt; 500 ms, ONNX/Redis when breached
- [rollout.md](rollout.md) – beta tenants for UAT
