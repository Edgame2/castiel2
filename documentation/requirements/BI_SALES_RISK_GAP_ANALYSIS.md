# BI Sales Risk – Gap Analysis

**Date:** January 2026  
**Source:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md)  
**Scope:** Phases 1–2 (in-scope); Phases 3–5 noted where implemented ahead of scope.

---

## Executive Summary

| Area | Status | Gaps |
|------|--------|------|
| **Cosmos DB** | ✅ Mostly complete | ml-service `win_probability` container optional; `portfolio_aggregates` (Plan: on-demand first, add only if latency requires) — **no gap** |
| **risk-analytics APIs** | ✅ Complete | — |
| **ml-service** | ✅ Complete | — |
| **forecasting** | ✅ Complete | — |
| **recommendations** | ✅ Complete | Plan §4.4: `PUT` steps/complete vs impl `POST` — **minor** |
| **dashboard-analytics** | ✅ Complete | — |
| **logging (DataLakeCollector, MLAuditConsumer)** | ✅ Complete | — |
| **Usage Tracking** | ✅ Complete | In analytics-service |
| **Batch jobs (Scheduler + Worker)** | ✅ Complete | — |
| **Events** | ✅ Complete | — |
| **Observability** | ✅ Complete | Prometheus scrape, Grafana dashboards, App Insights, /metrics |
| **UI pages** | ✅ Complete | — |
| **UI components** | ✅ Complete | 5 components implemented and wired (Plan §14) |
| **Shard-manager (c_opportunity, c_account, c_contact)** | ⚠️ Unverified | Schema in BI_SALES_RISK_SHARD_SCHEMAS; shard-manager code does not explicitly reference NEW fields |
| **Blob immutability (audit)** | ⚠️ Doc only | Runbook §4: enable when compliance requires |

---

## 1. Cosmos DB (Plan §3)

### 1.1 risk-analytics

| Container | Plan | Implemented |
|-----------|------|-------------|
| risk_snapshots | §3.1.1 | ✅ `cosmos_db.containers.snapshots: risk_snapshots` |
| risk_clusters | §3.1.1 | ✅ `clusters: risk_clusters` |
| risk_association_rules | §3.1.1 | ✅ `association_rules: risk_association_rules` |
| risk_account_health | §3.1.1 | ✅ `account_health: risk_account_health` |
| risk_competitor_tracking | §3.1.1 | ✅ `competitor_tracking: risk_competitor_tracking` |
| risk_anomaly_alerts | §3.1.1 | ✅ `anomaly_alerts: risk_anomaly_alerts` |
| risk_predictions | §3.1.1 | ✅ `predictions: risk_predictions` |
| competitors | §3.1.2 | ✅ `competitors: competitors` |
| risk_sentiment_trends | Plan §921 | ✅ `sentiment_trends: risk_sentiment_trends` |
| risk_win_loss_reasons | Plan §11.8 | ✅ `win_loss_reasons: risk_win_loss_reasons` |
| analytics_industry_benchmarks | §3.1.5 | ✅ `industry_benchmarks: analytics_industry_benchmarks` |

**Gap:** None.

### 1.2 ml-service

| Container | Plan | Implemented |
|-----------|------|-------------|
| ml_win_probability_predictions | §3.1.3 | Not present in config; Plan allows win-prob via API only. |

**Gap:** Optional. Plan §3.1.3 adds `win_probability` for storage of win-probability predictions; current design uses on-demand prediction. Add only if history/trend API needs a dedicated store.

### 1.3 recommendations

| Container | Plan | Implemented |
|-----------|------|-------------|
| recommendation_remediation_workflows | §3.1.4 | ✅ `remediation_workflows` |
| recommendation_mitigation_actions | §3.1.4 | ✅ `mitigation_actions` |

**Gap:** None.

### 1.4 dashboard / dashboard-analytics

- **portfolio_aggregates:** Plan §3.1.6: on-demand first; add only if latency requires. **No implementation found; consistent with Plan.**

**Gap:** None.

---

## 2. API Endpoints

### 2.1 risk-analytics (Plan §4.1)

All listed routes are implemented:

- `GET/POST /api/v1/opportunities/:id/risk-predictions`, `.../risk-predictions/generate`
- `GET /api/v1/opportunities/:id/risk-velocity`
- `GET /api/v1/opportunities/:id/risk-snapshots`
- `GET /api/v1/opportunities/:id/win-probability`, `.../win-probability/explain`
- `GET /api/v1/risk-clustering/clusters`, `.../association-rules`, `POST .../trigger`
- `GET /api/v1/risk-propagation/opportunities/:id`
- `GET /api/v1/accounts/:id/health`
- `GET /api/v1/opportunities/:id/competitors`, `POST /api/v1/competitors/:id/track`
- `GET /api/v1/competitive-intelligence/dashboard`, `GET /api/v1/analytics/competitive-win-loss`
- `GET /api/v1/opportunities/:id/anomalies`, `POST .../anomalies/detect`
- `GET /api/v1/opportunities/:id/sentiment-trends`
- `GET /api/v1/opportunities/:id/stakeholder-graph`
- `GET /api/v1/opportunities/:id/risk-explainability`
- `POST /api/v1/opportunities/:id/quick-actions`
- `GET /api/v1/opportunities/:id/similar-won-deals`
- `GET /api/v1/risk-analysis/tenant/top-at-risk-reasons`
- `GET /api/v1/risk-analysis/tenant/prioritized-opportunities`
- `PUT/GET /api/v1/opportunities/:id/win-loss-reasons`

**Gap:** None.

### 2.2 ml-service (Plan §4.2)

- `POST /api/v1/ml/win-probability/predict`, `POST /api/v1/ml/win-probability/explain`
- `POST /api/v1/ml/risk-trajectory/predict`, `POST /api/v1/ml/forecast/period`, `POST /api/v1/ml/anomaly/predict`, etc.
- `GET /api/v1/ml/models/:id/card`

**Gap:** None. risk-analytics proxies win-probability; Plan allows either.

### 2.3 forecasting (Plan §4.3)

- `GET /api/v1/forecasts/:period/scenarios`
- `GET /api/v1/forecasts/:period/risk-adjusted`
- `GET /api/v1/forecasts/:period/ml`

**Gap:** None.

### 2.4 recommendations (Plan §4.4)

- `GET /api/v1/opportunities/:id/mitigation-actions`
- `POST/GET /api/v1/remediation-workflows`, `GET /api/v1/remediation-workflows/:id`
- `POST /api/v1/remediation-workflows/:id/steps/:stepNumber/complete` — **Plan says PUT; implementation uses POST.**
- `PUT /api/v1/remediation-workflows/:id/cancel`

**Gap:** **Minor.** Plan §4.4: `PUT .../steps/:stepNumber/complete`. recommendations: `POST .../steps/:stepNumber/complete`. Functionally equivalent; align doc or code if strict REST alignment is required.

### 2.5 dashboard-analytics (Plan §4.5)

- `GET /api/v1/dashboards/executive`, `/manager`, `/manager/prioritized`, `/board`
- `GET /api/v1/portfolios/:id/summary`, `.../accounts`
- `GET /api/v1/accounts/:id/opportunities`
- `GET /api/v1/opportunities/:id/activities`
- `GET /api/v1/industries/:id/benchmarks` (risk-analytics)
- `GET /api/v1/opportunities/:id/benchmark-comparison` (risk-analytics)

**Gap:** None.

---

## 3. Machine Learning (Plan §5)

- **AzureMLClient,** `azure_ml.*` config, `AzureMLClient.predict`, `predictLstmTrajectory`, `predictAnomaly`, `predictRevenueForecast` — ✅
- **ModelSelectionService** (risk-scoring, win-probability) — ✅
- **PredictionService:** win-probability, risk-scoring, LSTM trajectory, anomaly, forecast — ✅
- **EarlyWarningService:** predictRiskTrajectory, generatePredictions, calculateRiskVelocity; LSTM + rules — ✅
- **RiskSnapshotService:** upsertFromEvent, upsertFromDataLakeRow, getSnapshots — ✅
- **RiskClusteringService:** identifyRiskClusters, findAssociationRules, computeAndPersistForTenant (heuristic; Azure ML DBSCAN/Apriori TBD) — ✅
- **RiskPropagationService:** analyzeRiskPropagation, computeAndPersistForTenant (stub; Azure ML TBD) — ✅
- **AccountHealthService:** calculateAccountHealth, computeAndPersistForTenant — ✅
- **AnomalyDetectionService:** statistical (Z-score); ML via ml-service when endpoint set — ✅
- **CompetitiveIntelligenceService,** CompetitiveIntelligence — ✅
- **Training scripts:** `train_risk_scoring.py`, `train_win_probability.py`, `train_lstm_trajectory.py`, `train_prophet_forecast.py`, `train_anomaly_isolation_forest.py`, `generate_synthetic_opportunities.py`, `prepare_training_data.py` — ✅
- **Degraded behavior (Plan §5.7):** heuristics when Azure ML/shard-manager down — ✅

**Gap:** None. Clustering/propagation use heuristics/stubs until Azure ML batch is wired; Plan allows TBD.

---

## 4. Logging & Data Lake (Plan §3.5, §9)

- **DataLakeCollector:** `risk.evaluated` → Parquet `/risk_evaluations/year=.../`; `ml.prediction.completed` → `/ml_inference_logs/...` — ✅
- **MLAuditConsumer:** `risk.evaluated`, `risk.prediction.generated`, `ml.prediction.completed`, `remediation.workflow.completed`, `hitl.approval.*`, `ml.model.drift.detected`, `ml.model.performance.degraded` → audit Blob — ✅
- **UsageTrackingConsumer** (analytics-service): `ml.prediction.completed`, `llm.inference.completed`, `embedding.generated` → `analytics_usage_ml` — ✅
- **OutcomeDataLakeWriter** (risk-analytics): `opportunity.outcome.recorded` → `/ml_outcomes/...` — ✅

**Gap:** None. Runbook audit-event-flow §4: Blob immutability is “enable when compliance requires” — **documentation/ops, not code.**

---

## 5. Batch Jobs (Plan §9.3)

- **BatchJobScheduler** (workflow-orchestrator): `workflow.job.trigger` for `risk-snapshot-backfill`, `outcome-sync`, `industry-benchmarks`, `risk-clustering`, `account-health`, `propagation`, `model-monitoring` — ✅
- **BatchJobWorker** (risk-analytics, `bi_batch_jobs`): handlers for all above — ✅
- **model-monitoring:** calls ml-service `POST /api/v1/ml/model-monitoring/run`; PSI (Data Lake) + Brier/MAE — ✅

**Gap:** None.

---

## 6. Events (Plan §7)

Published: `risk.evaluated`, `risk.prediction.generated`, `risk.cluster.updated`, `anomaly.detected`, `remediation.workflow.created`, `remediation.step.completed`, `remediation.workflow.completed`, `ml.prediction.completed`, `workflow.job.trigger`, `workflow.job.completed`, `workflow.job.failed`, `opportunity.outcome.recorded`, `ml.model.drift.detected`, `ml.model.performance.degraded`, `opportunity.quick_action.requested` — ✅

Consumed: RiskSnapshotService (`risk.evaluated`), DataLakeCollector, MLAuditConsumer, UsageTrackingConsumer, BatchJobWorker (`workflow.job.trigger`), OutcomeDataLakeWriter (`opportunity.outcome.recorded`), SentimentTrendsService (`sentiment.trends.updated`) — ✅

**Gap:** None.

---

## 7. Configuration & Observability (Plan §8)

- **risk-analytics:** `data_lake`, `feature_flags`, `thresholds`, `outcome_sync`, `outcome_feedback` — ✅
- **ml-service:** `azure_ml`, `feature_flags`, `data_lake` (model-monitoring) — ✅
- **forecasting:** `services.risk_analytics` — ✅
- **application_insights** and **metrics** (path, require_auth, bearer_token) in BI/risk containers — ✅
- **Prometheus:** `deployment/monitoring/prometheus/scrape-config.yaml` for risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics, notification-manager — ✅
- **Grafana:** `bi-risk-overview.json`, `ml-service.json`, `batch-jobs.json` — ✅

**Gap:** None.

---

## 8. UI Pages (Plan §6.2)

| Route | Implemented |
|-------|--------------|
| `/dashboard`, `/dashboard/manager`, `/dashboard/executive`, `/dashboard/board` | ✅ |
| `/opportunities`, `/opportunities/[id]`, `.../risk`, `.../remediation` | ✅ |
| `/accounts/[id]` | ✅ |
| `/analytics/competitive`, `/analytics/benchmarks`, `/analytics/portfolios` | ✅ |
| `/settings/competitors`, `/settings/industries` | ✅ |
| `/models/[id]` (model card) | ✅ |

**Gap:** None.

---

## 9. UI Components (Plan §6.3)

### 9.1 Implemented

- **Charts:** RiskGauge, RiskTrajectoryChart, RiskVelocityChart, WinProbabilityGauge, ScenarioForecastChart, RiskHeatmap, CompetitorWinLossChart, StakeholderGraph, BenchmarkComparison
- **Cards:** EarlyWarningCard, AnomalyCard, ExplainabilityCard, RemediationWorkflowCard, AccountHealthCard, CompetitorMentionsCard, TopAtRiskReasonsCard, RecommendedTodayCard, SimilarWonDealsCard
- **Tables/lists:** ActivityList
- **Modals:** CompleteRemediationStepModal, CreateRemediationWorkflowModal
- **Layout:** DashboardGrid, DrillDownBreadcrumb
- **Model:** ModelCard

### 9.2 Gaps (Plan §6.3)

| Component | Plan | Status |
|-----------|------|--------|
| **WinProbabilityTrendChart** | Win prob over time | **Done** (§14) |
| **SentimentTrendChart** | Sentiment over time | **Done** (§14) |
| **ClusterVisualization** | 2D/3D or list of clusters | **Done** (§14) |
| **CompetitorSelectModal** | Link competitor to opportunity | **Done** (§14) |
| **LeadingIndicatorsCard** | Leading indicator status | **Done** (§14) |

All five have been implemented and wired into pages (Plan §14, §14.1). SentimentTrendChart uses `GET .../sentiment-trends`; WinProbabilityTrendChart uses `GET .../win-probability/trend` (ml-service + risk-analytics proxy); ClusterVisualization uses `GET .../risk-clustering/clusters`; CompetitorSelectModal uses `GET /competitors` and `POST /competitors/:id/track`; LeadingIndicatorsCard uses `GET .../leading-indicators`.

---

## 10. Shard Schemas (Plan §3.3, BI_SALES_RISK_SHARD_SCHEMAS)

**Planned (c_opportunity):** Amount, StageName, CloseDate, Probability, IsClosed, IsWon, AccountId, OwnerId, CreatedDate; **NEW:** LastActivityDate, Industry, IndustryId, CompetitorIds, StageUpdatedAt, StageDates, lossReason, winReason, competitorId.

**Planned (c_account):** Name; **NEW:** Industry, IndustryId.

**Planned (c_contact):** **NEW:** `role` (decision_maker, influencer, executive_sponsor); contact–contact `reports_to`.

**Status:** BI_SALES_RISK_SHARD_SCHEMAS.md defines these. shard-manager code does **not** explicitly reference LastActivityDate, Industry, IndustryId, CompetitorIds, StageUpdatedAt, StageDates, or `role`. Shards are generic `structuredData`; ingestion (e.g. integration-manager, sync) can write these fields. Validation or schema enforcement in shard-manager for c_opportunity/c_account/c_contact is **not** present.

**Gap:** **Partial.** The spec is documented; runtime support depends on writers (integrations, sync jobs) and readers (ml-service `buildVector`, risk-analytics) using these fields. If no pipeline populates them, industry/competitor/activity features will be partial. **Recommendation:** Confirm integration-manager and sync jobs write NEW fields; add shard-manager schema docs or validation only if needed for contracts.

---

## 11. Remediation Step Complete: PUT vs POST

Plan §4.4: `PUT /api/v1/remediation-workflows/:id/steps/:stepNumber/complete`  
Implementation: `POST /api/v1/remediation-workflows/:id/steps/:stepNumber/complete`

**Gap:** **Minor.** Semantics are equivalent. Align Plan or OpenAPI if strict REST is required.

---

## 12. Win-Probability Trend (Plan §4.2)

Plan: `GET /api/v1/predict/win-probability/:opportunityId/trend` (historical trend).  
ml-service: no `/win-probability/trend` or equivalent. risk-analytics: no proxy for it.

**Gap:** **Missing.** Add in ml-service (and optional risk-analytics proxy) if WinProbabilityTrendChart or historical win-prob is in scope.

---

## 13. Blob Immutability (Plan §4 / runbook audit-event-flow §4)

Runbook: enable Azure Blob immutability policy on audit/risk container when compliance requires. Implementation: MLAuditConsumer and DataLakeCollector write to Blob; immutability is a **storage/ops** setting, not app code.

**Gap:** **None for code.** Ops must enable when required.

---

## 14. Summary of Gaps

| # | Item | Severity | Action | Status |
|---|------|----------|--------|--------|
| 1 | **UI: WinProbabilityTrendChart** | Low | Implement when `GET .../win-probability/trend` exists; otherwise treat as out of scope. | **Done** (BI Sales Risk Gaps Plan) |
| 2 | **UI: SentimentTrendChart** | Low | Add component; `GET .../sentiment-trends` exists. | **Done** |
| 3 | **UI: ClusterVisualization** | Low | Add when cluster UX is prioritized. | **Done** |
| 4 | **UI: CompetitorSelectModal** | Low | Add for “link competitor to opportunity” when needed. | **Done** |
| 5 | **UI: LeadingIndicatorsCard** | Low | Add when leading indicators are exposed in API. | **Done** |
| 6 | **API: GET .../win-probability/trend** | Low | Add in ml-service (and risk-analytics proxy) if trend is in scope. | **Done** |
| 7 | **Shard-manager: c_opportunity/c_account/c_contact NEW fields** | Medium | Ensure integrations/sync and feature pipeline use BI_SALES_RISK_SHARD_SCHEMAS; add validation/docs in shard-manager only if needed. | **Done** (docs + integration-manager mapping) |
| 8 | **Remediation: PUT vs POST for steps/complete** | Trivial | Align Plan or implementation. | **Done** (PUT and POST both accepted) |
| 9 | **ml-service: win_probability container** | Optional | Add only if storing win-prob history. | **Done** |
| 10 | **Blob immutability** | Ops | Enable in Azure when compliance requires. | Ops; runbook §4 |

### 14.1 Implementation (BI Sales Risk Gaps Plan)

Gaps 1–9 have been addressed per the **BI Sales Risk Gaps Implementation Plan**: PUT for steps/complete; GET /competitors, GET /leading-indicators, GET /win-probability/trend (ml-service + risk-analytics proxy); ml_win_probability_predictions container and persist in predictWinProbability; shard-manager docs/BI_SALES_RISK_SHARD_FIELDS.md; integration-manager docs/salesforce-to-shard-mapping.md and audit; UI components SentimentTrendChart, WinProbabilityTrendChart, ClusterVisualization, CompetitorSelectModal, LeadingIndicatorsCard.

---

## 15. Conclusion

For **Phases 1–2**, the implementation is **complete** relative to the Plan. Per §14, gaps 1–9 are **Done** (BI Sales Risk Gaps Implementation Plan): UI components (WinProbabilityTrendChart, SentimentTrendChart, ClusterVisualization, CompetitorSelectModal, LeadingIndicatorsCard), win-probability trend API (ml-service + risk-analytics proxy), PUT/POST for steps/complete, win_probability container, shard-manager and integration-manager docs.

**Ongoing / ops:**

- **Medium:** Verify shard writers and readers (integrations, sync, feature pipeline) use and populate the NEW c_opportunity/c_account/c_contact fields from BI_SALES_RISK_SHARD_SCHEMAS.
- **Optional/ops:** ml_win_probability_predictions container (add only if storing win-prob history); Blob immutability (runbook §4, enable when compliance requires).

Phases 3–5 items (benchmarks, drill-down, audit, HITL, model governance, performance, rollout, validation, docs) are either already implemented ahead of scope or documented in runbooks for future use.
