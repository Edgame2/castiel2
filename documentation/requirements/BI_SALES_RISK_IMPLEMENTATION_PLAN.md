# BI Sales Risk Analysis – Implementation Plan

**Version:** 2.0  
**Date:** January 2026  
**Based on:** [BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md](./BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md), [BI_SALES_RISK_FINAL_ANSWERS.md](./BI_SALES_RISK_FINAL_ANSWERS.md), [BI_SALES_RISK_FOLLOW_UP_ANSWERS.md](./BI_SALES_RISK_FOLLOW_UP_ANSWERS.md)  
**Guideline:** [ModuleImplementationGuide.md](../global/ModuleImplementationGuide.md)

---

## Locked Decisions (from Final Answers)

| Decision | Value |
|----------|-------|
| **Scope** | **Option C – Phases 1–2 only** (Months 1–6). Phases 3–5 are **future/out of initial scope**. |
| **Queuing** | **RabbitMQ only.** No Azure Service Bus or other message brokers. |
| **Tenant** | **`tenantId` only.** Remove all `organizationId` in BI/risk. |
| **Salesforce** | Default Salesforce fields (Amount, StageName, CloseDate, Probability, IsClosed, IsWon, AccountId, OwnerId, CreatedDate). Add: LastActivityDate, Industry, IndustryId, CompetitorIds, StageUpdatedAt, StageDates. Account: Name, Industry, IndustryId. See [BI_SALES_RISK_FINAL_ANSWERS.md](./BI_SALES_RISK_FINAL_ANSWERS.md) §1. |
| **Audit** | **Logging exists.** Add **Data Collector** (module in `logging`) and **Usage Tracking** (analytics-service or new). All consume from RabbitMQ. |
| **Data Collector** | **Module inside `containers/logging`.** `events/consumers/DataLakeCollector.ts`; writes to Azure Data Lake (Parquet). Path: `/risk_evaluations/year=.../month=.../day=.../`. |
| **Batch jobs** | **Scheduler + RabbitMQ.** Scheduler (e.g. in `workflow-orchestrator`) publishes `workflow.job.trigger`; workers consume from `bi_batch_jobs` queue. |
| **Shard schemas** | **Separate doc:** [BI_SALES_RISK_SHARD_SCHEMAS.md](./BI_SALES_RISK_SHARD_SCHEMAS.md), linked from this plan. |

---

## Related Documentation

| Doc | Purpose |
|-----|---------|
| [BI_SALES_RISK_SHARD_SCHEMAS.md](./BI_SALES_RISK_SHARD_SCHEMAS.md) | c_opportunity, c_account, c_contact, activity shards; relationship types `has_activity`, `has_contact`, `reports_to`. |
| [BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md) | `buildFeatureVector`, data sources, feature list, ml-service vs risk-analytics. |
| [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md) | Training script I/O, target columns, Azure ML. |
| [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) | Data Lake paths, Parquet schemas, `opportunity.outcome.recorded` publisher/consumer. |
| [BI_SALES_RISK_PLAN_ADDITIONAL_RECOMMENDATIONS.md](./BI_SALES_RISK_PLAN_ADDITIONAL_RECOMMENDATIONS.md) | Best-in-class: outcome feedback, explainability, model monitoring, etc. |
| [BI_SALES_RISK_IMPLEMENTATION_FIRST_STEPS.md](./BI_SALES_RISK_IMPLEMENTATION_FIRST_STEPS.md) | Suggested Week 1–2 order: observability, risk_snapshots, DataLakeCollector, batch jobs, outcome-sync, buildVector, AzureMLClient, Phase 1 APIs. |
| [ModuleImplementationGuide.md](../global/ModuleImplementationGuide.md) | Structure, config, events, observability. |

**Convention:** In all APIs and events, **`opportunityId`** = the **`id` of the `c_opportunity` shard** (shard-manager). Same id is used for Cosmos `risk_snapshots`, `risk_evaluations`, and as the key for features and predictions.

---

## Table of Contents

1. [Executive Summary & Principles](#1-executive-summary--principles)
2. [Phase Overview](#2-phase-overview)
3. [Cosmos DB](#3-cosmos-db)
4. [API Endpoints](#4-api-endpoints)
5. [Machine Learning](#5-machine-learning)
6. [UI Pages & Components](#6-ui-pages--components)
7. [Events](#7-events)
8. [Configuration & Feature Flags](#8-configuration--feature-flags)
9. [Integration & Data Flows](#9-integration--data-flows)
10. [Phase-by-Phase Task Breakdown](#10-phase-by-phase-task-breakdown)
11. [Additional Recommendations (Best-in-Class)](#11-additional-recommendations-best-in-class)

---

## 1. Executive Summary & Principles

### 1.1 Principles

- **ModuleImplementationGuide:** All new and extended containers MUST follow [ModuleImplementationGuide.md](../global/ModuleImplementationGuide.md): §3 structure (`config/`, `src/server.ts`, `events/consumers/`, `jobs/`, `openapi.yaml`, `config/schema.json`), §4 config, §5 no hardcoded URLs, §8 DB (tenantId partition), §9 **RabbitMQ only** for events and job triggers.
- **Leverage current implementation:** Extend `risk-analytics`, `ml-service`, `forecasting`, `dashboard`, `dashboard-analytics`, `recommendations`, `workflow-orchestrator`, `shard-manager`, **logging**; avoid new containers unless necessary.
- **Config-driven:** No hardcoded ports/URLs; use `config/default.yaml` and env.
- **Tenant isolation:** All Cosmos with `tenantId` in partition key; `X-Tenant-ID` on routes; **`tenantId` only** (no `organizationId`).
- **RabbitMQ only:** All queuing (events, batch job triggers) via RabbitMQ. No Azure Service Bus or other brokers.
- **Azure ML first:** Real-time and batch ML via Azure ML Managed Endpoints; REST from Node. ONNX/Redis only as Phase 4 optimization if needed.

### 1.2 Current Containers Used

| Container | Role |
|-----------|------|
| `risk-analytics` | Risk evaluation, early warning, revenue-at-risk, clustering, propagation, account health, competitive intel, anomaly |
| `ml-service` | Azure ML client, model selection, predictions (win probability, risk, forecasting, clustering, anomaly, mitigation ranking) |
| `forecasting` | Decomposition, consensus, commitment, **+ ML forecast, scenarios, risk-adjusted** |
| `recommendations` | Rebuild: mitigation ranking, remediation workflows |
| `dashboard` | Dashboard CRUD, widget cache |
| `dashboard-analytics` | Executive/manager analytics, drill-down aggregates |
| `workflow-orchestrator` | Batch jobs: clustering, benchmarks, risk-snapshot backfill, account-health |
| `shard-manager` | Shards, relationships; `c_opportunity`, `c_account`, `c_contact`, `news_article`, etc. |
| `integration-manager` | News/market adapters (NewsAPI, Alpha Vantage), competitor integrations |
| `logging` | Audit (exists); **+ DataLakeCollector** (risk.evaluated → Data Lake Parquet), **+ MLAuditConsumer** (ML/risk → audit log). All via RabbitMQ. |
| `notification-manager` | Anomaly, early-warning, HITL alerts |

### 1.3 Out of Scope (Confirmed)

- Mobile-first (responsive only)
- Scheduled PDF/PPT reports (on-demand via content-generation only)
- Credit/company health DBs (vendor TBD; integration-manager later)
- LLM fine-tuning in MVP

---

## 2. Phase Overview

| Phase | Months | Focus | In initial scope? |
|-------|--------|-------|-------------------|
| **1** | 1–3 | Azure ML infra, industry models, win probability, early warning (LSTM+rules), risk snapshots (Data Lake + Cosmos), basic competitive intel, manager dashboard | ✅ **Yes** |
| **2** | 4–6 | Clustering, propagation, anomaly, sentiment, network, prescriptive/remediation, competitive dashboard, executive dashboards | ✅ **Yes** |
| **3** | 7–9 | Deep learning, RL (optional), causal (optional), industry benchmarking, drill-down | ❌ **Future** |
| **4** | 10–11 | Compliance, audit (3-tier), HITL, model governance, bias, performance/cost | ❌ **Future** |
| **5** | 12 | Rollout, validation, training, docs | ❌ **Future** |

**This plan details only Phases 1–2.** Phases 3–5 are listed for context; tasks are not expanded. Audit (3-tier) in Phase 1–2: extend **Logging** (exists) with ML/risk handlers; add **Data Collector** (module in logging) and **Usage Tracking** (separate) per [BI_SALES_RISK_FINAL_ANSWERS.md](./BI_SALES_RISK_FINAL_ANSWERS.md).

---

## 3. Cosmos DB

### 3.1 New & Extended Containers

Containers are in the **shared** database `castiel`; partition key `tenantId` unless noted.

#### 3.1.1 risk-analytics

**Existing (keep):** `risk_evaluations`, `risk_revenue_at_risk`, `risk_quotas`, `risk_warnings`, `risk_simulations`.

**New (add to `config/default.yaml` and DB):**

| Logical Name | Physical Container | Partition Key | Purpose |
|--------------|-------------------|---------------|---------|
| `snapshots` | `risk_snapshots` | `tenantId` | Materialized view of risk over time; populated from `risk.evaluated` and backfill from Data Lake |
| `clusters` | `risk_clusters` | `tenantId` | Risk clustering results (batch) |
| `association_rules` | `risk_association_rules` | `tenantId` | Apriori-style rules |
| `account_health` | `risk_account_health` | `tenantId` | Account health scores |
| `competitor_tracking` | `risk_competitor_tracking` | `tenantId` | Competitor–opportunity links |
| `anomaly_alerts` | `risk_anomaly_alerts` | `tenantId` | Anomaly detection results |
| `predictions` | `risk_predictions` | `tenantId` | Early-warning 30/60/90-day risk predictions |

**risk-analytics `config/default.yaml` addition:**
```yaml
cosmos_db:
  containers:
    # existing
    evaluations: risk_evaluations
    revenue_at_risk: risk_revenue_at_risk
    quotas: risk_quotas
    warnings: risk_warnings
    simulations: risk_simulations
    # new
    snapshots: risk_snapshots
    clusters: risk_clusters
    association_rules: risk_association_rules
    account_health: risk_account_health
    competitor_tracking: risk_competitor_tracking
    anomaly_alerts: risk_anomaly_alerts
    predictions: risk_predictions
```

#### 3.1.2 competitors (Catalog)

| Logical Name | Physical Container | Partition Key | Purpose |
|--------------|-------------------|---------------|---------|
| `competitors` | `competitors` | `tenantId` | Competitor master (name, aliases, industry) |

**Ownership:** `risk-analytics` or `configuration-service`. Recommended: `risk-analytics` (or shared `configuration` if you centralize catalogs). For the plan we assume **risk-analytics** reads/writes; config can reference a container in `risk-analytics` or a shared DB container.

#### 3.1.3 ml-service

**Existing:** `ml_models`, `ml_features`, `ml_training_jobs`, `ml_evaluations`, `ml_predictions`, `multimodal_jobs`.

**New:**

| Logical Name | Physical Container | Partition Key | Purpose |
|--------------|-------------------|---------------|---------|
| `win_probability` | `ml_win_probability_predictions` | `tenantId` | Win probability predictions |

**ml-service `config/default.yaml` addition:**
```yaml
containers:
  # ... existing ...
  win_probability: ml_win_probability_predictions
```

#### 3.1.4 recommendations (Rebuild)

**New:**

| Logical Name | Physical Container | Partition Key | Purpose |
|--------------|-------------------|---------------|---------|
| `remediation_workflows` | `recommendation_remediation_workflows` | `tenantId` | Remediation workflow and steps |
| `mitigation_actions` | `recommendation_mitigation_actions` | `tenantId` | Custom mitigation actions (catalog is in risk-catalog) |

#### 3.1.5 analytics-service (or dashboard-analytics)

**New (industry benchmarks):**

| Logical Name | Physical Container | Partition Key | Purpose |
|--------------|-------------------|---------------|---------|
| `industry_benchmarks` | `analytics_industry_benchmarks` | `industryId` | Precomputed benchmarks (p10–p90) |

#### 3.1.6 dashboard

**Existing:** `dashboard_dashboards`, `dashboard_widgets`, `dashboard_admin_data`, `dashboard_widget_cache`.

**New (if aggregates stored in Cosmos):**

| Logical Name | Physical Container | Partition Key | Purpose |
|--------------|-------------------|---------------|---------|
| `portfolio_aggregates` | `dashboard_portfolio_aggregates` | `tenantId` | Precomputed portfolio/segment aggregates for drill-down |

*Alternatively:* `dashboard-analytics` computes on-demand from `risk-analytics`, `shard-manager`, etc. The plan assumes **on-demand first**; add `portfolio_aggregates` only if latency requires it.

### 3.2 Document Schemas (Key)

**risk_snapshots:**
```json
{
  "id": "<opportunityId>_<snapshotDate ISO>",
  "tenantId": "",
  "opportunityId": "",
  "snapshotDate": "",
  "riskScore": 0.0,
  "categoryScores": {},
  "topDrivers": [{"feature": "", "contribution": 0, "direction": "increases|decreases"}],
  "dataQuality": {"score": 0, "completenessPct": 0, "missingCritical": [], "stalenessDays": 0},
  "atRiskReasons": [],
  "source": "evaluation|backfill"
}
```
*(topDrivers, dataQuality, atRiskReasons: see §11.)*

**risk_predictions (early warning):**
```json
{
  "id": "",
  "tenantId": "",
  "opportunityId": "",
  "predictionDate": "",
  "horizons": { "30": {"riskScore": 0.0, "confidence": 0.0}, "60": {}, "90": {} },
  "leadingIndicators": [],
  "modelId": "risk-trajectory-lstm"
}
```

**risk_account_health:**
```json
{
  "id": "<tenantId>_<accountId>",
  "tenantId": "",
  "accountId": "",
  "healthScore": 0.0,
  "riskBreakdown": {},
  "trendDirection": "improving|stable|degrading",
  "criticalOpportunities": [],
  "lastUpdated": ""
}
```

**risk_competitor_tracking:**
```json
{
  "id": "",
  "tenantId": "",
  "opportunityId": "",
  "competitorId": "",
  "competitorName": "",
  "detectedDate": "",
  "mentionCount": 0,
  "lastMentionDate": "",
  "sentiment": 0.0,
  "winLikelihood": 0.0
}
```

**competitors:**
```json
{
  "id": "",
  "tenantId": "",
  "name": "",
  "aliases": [],
  "industry": "",
  "historicalWinRate": 0.0,
  "metadata": {}
}
```

**risk_anomaly_alerts:**
```json
{
  "id": "",
  "tenantId": "",
  "opportunityId": "",
  "anomalyType": "statistical|ml|pattern",
  "subtype": "",
  "severity": "low|medium|high",
  "description": "",
  "detectedAt": "",
  "details": {}
}
```

**recommendation_remediation_workflows:**
```json
{
  "id": "",
  "tenantId": "",
  "opportunityId": "",
  "riskId": "",
  "status": "pending|in_progress|completed|cancelled",
  "assignedTo": "",
  "steps": [{"stepNumber": 1, "actionId": "", "description": "", "status": "pending|current|completed", "estimatedEffort": "", "completedAt": null, "completedBy": null}],
  "completedSteps": 0,
  "totalSteps": 0,
  "createdAt": "",
  "updatedAt": ""
}
```

**analytics_industry_benchmarks:**
```json
{
  "id": "<industryId>_<period>",
  "industryId": "",
  "period": "",
  "periodType": "month|quarter|year",
  "sampleSize": 0,
  "metrics": { "avgWinRate": 0.0, "avgDealSize": 0.0, "avgCycleTime": 0.0, "avgRiskScore": 0.0 },
  "percentiles": { "p10": {}, "p25": {}, "p50": {}, "p75": {}, "p90": {} },
  "computedAt": "",
  "expiresAt": ""
}
```

### 3.3 Shard Types (shard-manager)

**Full specs:** [BI_SALES_RISK_SHARD_SCHEMAS.md](./BI_SALES_RISK_SHARD_SCHEMAS.md). Summary:

| shardTypeId | Name | Category | Purpose |
|-------------|------|----------|---------|
| `c_opportunity` | Opportunity | (existing, extend) | Amount, StageName, CloseDate, Probability, IsClosed, IsWon, AccountId, OwnerId, CreatedDate; **add:** LastActivityDate, Industry, IndustryId, CompetitorIds, StageUpdatedAt, StageDates |
| `c_account` | Account | (existing, extend) | Name; **add:** Industry, IndustryId |
| `c_contact` | Contact | (existing, extend) | **add:** `role` (decision_maker, influencer, executive_sponsor); contact–contact reporting |
| `c_email`, `c_call`, `c_meeting`, `c_note` | Activity | (create if missing) | For leading indicators and sentiment |
| `news_article` | News Article | external_data | News from NewsAPI |
| `market_data` | Market Data | external_data | Alpha Vantage |

Schemas for `news_article`, `market_data`, and **all** `structuredData` + relationships: see BI_SALES_RISK_SHARD_SCHEMAS.md.

### 3.4 Indexing

- **risk_snapshots:** `(tenantId, opportunityId, snapshotDate)` for time-range queries.
- **risk_predictions:** `(tenantId, opportunityId)`.
- **risk_account_health:** `(tenantId, accountId)`; `id` = `tenantId_accountId`.
- **risk_competitor_tracking:** `(tenantId, opportunityId)`, `(tenantId, competitorId)`.
- **risk_anomaly_alerts:** `(tenantId, opportunityId, detectedAt)`.
- **recommendation_remediation_workflows:** `(tenantId, opportunityId)`, `(tenantId, assignedTo)`.
- **analytics_industry_benchmarks:** `(industryId, period)` if `industryId` is partition; if partitioned by `industryId`, `id` = `industryId_period`.

### 3.5 logging Container (Data Collector + ML Audit)

**Per BI_SALES_RISK_FINAL_ANSWERS §2–3 and ModuleImplementationGuide §3.1.** Logging **exists**; add two RabbitMQ consumers inside `containers/logging`:

| Component | Path | Role |
|-----------|------|------|
| **DataLakeCollector** | `src/events/consumers/DataLakeCollector.ts` | Subscribes to `risk.evaluated`, `ml.prediction.*`, `opportunity.updated`, `forecast.generated`. Writes to Azure Data Lake (Parquet). Config: `data_lake.connection_string`, `data_lake.container`, path pattern. |
| **MLAuditConsumer** | `src/events/consumers/MLAuditConsumer.ts` | Subscribes to `risk.evaluated`, `ml.prediction.completed`, `remediation.workflow.completed`. Writes to audit log (Blob/immutable, 7-year retention). |

**Usage Tracking:** New module in **analytics-service** (or new container). Consumes `ml.prediction.completed`, `llm.inference.completed`, `embedding.generated`; aggregates in Cosmos for billing. See FINAL_ANSWERS §2.

**Config (`config/default.yaml`):** Add `data_lake`, `rabbitmq` bindings for `bi_data_collection` (or reuse `coder_events` with queue per consumer). `config/schema.json` and `logs-events.md` per ModuleImplementationGuide §9.5.

---

## 4. API Endpoints

All under `/api/v1`; `authenticateRequest`, `tenantEnforcementMiddleware`, `X-Tenant-ID`. Base URL from config (api-gateway routes to services).

### 4.1 risk-analytics (Extend `containers/risk-analytics/src/routes/index.ts`)

**Existing (keep):** `/api/v1/risk/evaluations/:evaluationId`, `/api/v1/risk/opportunities/:opportunityId/latest-evaluation`, `POST /api/v1/risk/evaluations`, `/api/v1/risk-analysis/opportunities/:opportunityId/revenue-at-risk`, portfolio/team/tenant revenue-at-risk, early-warnings detect/get/ack, risk-catalog, quotas, simulations, benchmarks, data-quality, trust-level, AI validation, explainability.

**New routes:**

| Method | Path | Handler / Service | Purpose |
|--------|------|-------------------|---------|
| GET | `/api/v1/opportunities/:id/risk-predictions` | EarlyWarningService.predictRiskTrajectory | 30/60/90-day risk predictions |
| POST | `/api/v1/opportunities/:id/risk-predictions/generate` | EarlyWarningService.generatePredictions | Trigger LSTM (+ rules) |
| GET | `/api/v1/opportunities/:id/risk-velocity` | EarlyWarningService.calculateRiskVelocity | Velocity and acceleration |
| GET | `/api/v1/opportunities/:id/risk-snapshots` | RiskSnapshotService.getSnapshots | Time series from Cosmos (and optional Data Lake) |
| GET | `/api/v1/risk-clustering/clusters` | RiskClusteringService.identifyRiskClusters | Clusters (cached or on-demand) |
| GET | `/api/v1/risk-clustering/association-rules` | RiskClusteringService.findAssociationRules | Association rules |
| POST | `/api/v1/risk-clustering/trigger` | WorkflowOrchestrator or job | Trigger clustering batch |
| GET | `/api/v1/risk-propagation/opportunities/:id` | RiskPropagationService.analyzeRiskPropagation | Propagation from one opportunity |
| GET | `/api/v1/accounts/:id/health` | AccountHealthService.calculateAccountHealth | Account health |
| GET | `/api/v1/opportunities/:id/competitors` | CompetitiveIntelligenceService.getByOpportunity | Competitors for opportunity |
| POST | `/api/v1/competitors/:id/track` | CompetitiveIntelligenceService.track | Link competitor to opportunity |
| GET | `/api/v1/competitive-intelligence/dashboard` | CompetitiveIntelligenceService.getDashboard | Win/loss, landscape |
| GET | `/api/v1/analytics/competitive-win-loss` | CompetitiveIntelligenceService.analyzeWinLossByCompetitor | Win/loss by competitor |
| GET | `/api/v1/opportunities/:id/anomalies` | AnomalyDetectionService.detectAnomalies | Anomalies for opportunity |
| GET | `/api/v1/opportunities/:id/sentiment-trends` | SentimentService.getTrends *(or ai-insights/data-enrichment)* | Sentiment over time |
| GET | `/api/v1/opportunities/:id/stakeholder-graph` | NetworkAnalysisService.getGraph *(or in risk-analytics)* | Stakeholder graph |
| GET | `/api/v1/opportunities/:id/risk-explainability` | RiskEvaluationService or EarlyWarningService | Top drivers for risk score (topDrivers) |
| POST | `/api/v1/opportunities/:id/quick-actions` | QuickActionsService | create_task, log_activity, start_remediation (Phase 2) |
| GET | `/api/v1/opportunities/:id/similar-won-deals` | IndustryBenchmarkService or PortfolioAnalytics | Peer deal comparison: win rate, median cycle (Phase 2) |

### 4.2 ml-service (Extend `containers/ml-service/src/routes/index.ts`)

**New:**

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/v1/predict/win-probability/:opportunityId` | PredictionService.predictWinProbability | Win probability (or via risk-analytics proxy) |
| GET | `/api/v1/predict/win-probability/:opportunityId/trend` | PredictionService.getProbabilityTrend | Historical trend |
| GET | `/api/v1/predict/win-probability/:opportunityId/explain` | PredictionService.getWinProbabilityExplain | Top drivers for win-probability |
| POST | `/api/v1/predict/batch/win-probability` | PredictionService.batchPredictWinProbability | Batch for many opportunities |
| GET | `/api/v1/models/:id/card` | ModelCardService or ml_models read | Model card (purpose, input, output, limitations) (Phase 2) |

*Note:* ADDITIONAL_ANSWERS suggests exposing win-probability via **risk-analytics** that calls ml-service. We can add `GET /api/v1/opportunities/:id/win-probability` in risk-analytics that proxies to ml-service.

### 4.3 forecasting (Extend `containers/forecasting/src/routes/index.ts`)

**Existing (keep):** `/api/v1/forecasts/:forecastId`, `GET/POST /api/v1/forecasts`, team/tenant aggregates.

**New:**

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/v1/forecasts/:period/scenarios` | ForecastingService.getScenarioForecast | P10/P50/P90 scenarios |
| GET | `/api/v1/forecasts/:period/risk-adjusted` | ForecastingService.getRiskAdjustedForecast | Risk-adjusted forecast |
| GET | `/api/v1/forecasts/:period/ml` | ForecastingService.getMLForecast | ML-only forecast (XGBoost, Prophet, quantile) |

### 4.4 recommendations (Rebuild `containers/recommendations`)

**New:**

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/v1/opportunities/:id/mitigation-actions` | MitigationRankingService.rankMitigationActions | Ranked actions for risks |
| POST | `/api/v1/remediation-workflows` | RemediationWorkflowService.createWorkflow | Create remediation workflow |
| GET | `/api/v1/remediation-workflows` | RemediationWorkflowService.list | List by opportunity/tenant/user |
| GET | `/api/v1/remediation-workflows/:id` | RemediationWorkflowService.get | Get workflow |
| PUT | `/api/v1/remediation-workflows/:id/steps/:stepNumber/complete` | RemediationWorkflowService.completeStep | Complete step |
| PUT | `/api/v1/remediation-workflows/:id/cancel` | RemediationWorkflowService.cancel | Cancel |

### 4.5 dashboard / dashboard-analytics (Extend)

**dashboard (or dashboard-analytics) new:**

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/v1/dashboards/executive` | ExecutiveAnalyticsService.getExecutiveDashboard | C-suite dashboard |
| GET | `/api/v1/dashboards/manager` | ExecutiveAnalyticsService.getManagerDashboard | Manager dashboard |
| GET | `/api/v1/dashboards/manager/prioritized` | ExecutiveAnalyticsService.getPrioritizedOpportunities | Ranked by revenue-at-risk × risk × early-warning; suggestedAction (Phase 2) |
| GET | `/api/v1/dashboards/board` | ExecutiveAnalyticsService.getBoardDashboard | Board |
| GET | `/api/v1/portfolios/:id/summary` | PortfolioAnalytics.getSummary | Portfolio summary |
| GET | `/api/v1/portfolios/:id/accounts` | PortfolioAnalytics.getAccounts | Drill to accounts |
| GET | `/api/v1/accounts/:id/opportunities` | AccountAnalytics.getOpportunities | Drill to opportunities |
| GET | `/api/v1/opportunities/:id/activities` | Shard/relationship service | Drill to activities (shards) |
| GET | `/api/v1/industries/:id/benchmarks` | IndustryBenchmarkService.getBenchmark | Industry benchmark |
| GET | `/api/v1/opportunities/:id/benchmark-comparison` | IndustryBenchmarkService.compareToBenchmark | Compare to industry |

### 4.6 OpenAPI

- **risk-analytics:** Update `containers/risk-analytics/openapi.yaml` with all new paths, request/response schemas, tags.
- **ml-service:** Add win-probability (and any batch) to `containers/ml-service/openapi.yaml`.
- **forecasting:** Add scenarios, risk-adjusted, ml to `containers/forecasting/openapi.yaml`.
- **recommendations:** Create/rewrite `containers/recommendations/openapi.yaml`.
- **dashboard / dashboard-analytics:** Extend OpenAPI for executive, manager, board, portfolios, benchmarks.

---

## 5. Machine Learning

### 5.1 Azure ML Setup (Phase 1)

- **Workspace:** `castiel-ml-prod-rg`, `eastus`; subscription per env.
- **Compute:** CPU clusters (e.g. `Standard_DS3_v2`) for Phase 1–2; GPU in Phase 3 if needed.
- **Endpoints:** Real-time for: risk-trajectory LSTM, win-probability, risk-scoring (industry/global), anomaly Isolation Forest. Batch for: clustering (DBSCAN/K-Means), risk propagation (NetworkX), Prophet, quantile regression, mitigation ranking.

**ml-service:** Add `AzureMLClient` (REST to Managed Endpoints). Config: `azure_ml.workspace_name`, `azure_ml.resource_group`, `azure_ml.subscription_id`, `azure_ml.endpoints` (map modelId → scoring URL). Use `@azure/identity` (DefaultAzureCredential) for auth.

### 5.2 Models and Training

| Model ID | Type | Framework | Inputs | Outputs | Phase | Owner (training) |
|----------|------|-----------|--------|---------|-------|------------------|
| `risk-scoring-global` | XGBoost Regressor | sklearn/xgb | Feature vector from opportunity + history | riskScore 0–1 | 1 | ml-service / Azure ML pipeline |
| `risk-scoring-{industry}` | XGBoost | same | + industry features | riskScore | 1 | same |
| `risk-trajectory-lstm` | LSTM | TensorFlow/Keras | Time series of risk + activity (+ leading indicators) | 30/60/90-day risk, confidence | 1 | Azure ML (Python) |
| `win-probability-model` | XGBoost Classifier + CalibratedClassifierCV | sklearn | Opportunity, stage, risk, activity, competitor | winProbability, CI | 1 | Azure ML |
| `revenue-forecasting-model` | XGBoost + Prophet + Quantile | xgb, Prophet | Historical revenue, pipeline, risk | P10/P50/P90, point | 1 | Azure ML |
| `risk-clustering` | DBSCAN / K-Means | sklearn | Risk feature matrix | labels, rules (Apriori in same or separate) | 2 | Azure ML batch |
| `risk-propagation` | PageRank-like | NetworkX | Graph (opportunities, accounts, contacts) | Propagated risk per node | 2 | Azure ML batch |
| `anomaly-detection-isolation-forest` | Isolation Forest | sklearn | Opportunity feature vector | isAnomaly, anomalyScore, feature_importance | 2 | Azure ML |
| `sentiment-*` | BERT or Azure AI Language | TF / API | Communication text | sentiment, emotions | 2 | Azure ML or API |
| `mitigation-ranking-model` | XGBoost Learning-to-Rank | xgb | risk, opportunity, actions | Ranked list | 2 | Azure ML |

### 5.3 Feature Pipelines

**Spec:** [BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md) — data sources, feature list, `buildFeatureVector` algorithm, shard-manager `/related` and `parentShardId`, ml-service vs risk-analytics ownership.

- **Risk / early warning:** `RiskEvaluationService` + `EarlyWarningService` (and new `RiskSnapshotService`) supply: risk history from `risk_snapshots` (or `risk_evaluations`), opportunity from shard-manager, activity counts, leading indicators (from available data; see follow-up). `FeatureService` in ml-service (or a `FeatureStore` in risk-analytics) builds vectors. Same features used for: risk-scoring, LSTM, win-probability, anomaly.
- **Forecasting:** `ForecastingService` + ml-service: pipeline totals, opportunity-level amounts/stages, risk from risk-analytics. Prophet: time series of historical revenue.
- **Clustering:** Risk vectors per opportunity; batch export from Cosmos → Azure ML.
- **Propagation:** Graph from `shard_manager` (opportunity–account–contact–activity) built in Node; send to Azure ML batch.
- **Sentiment:** Shards (email, Slack, Gong, etc.) → text → model or Azure AI Language API.

### 5.4 ml-service Code (High Level)

- **`AzureMLClient`** (`containers/ml-service/src/clients/AzureMLClient.ts`): `predict(modelId, body)`, `predictBatch(modelId, array)`, `startBatchJob(modelId, input)`, `getBatchJobStatus(jobId)`, `getBatchJobResult(jobId)`. Use `config.services.azure_ml` or `config.azure_ml.endpoints[modelId]`.
- **`PredictionService`:** Replace placeholder with: `predictWinProbability(opportunityId)` → features via `FeatureService`/risk-analytics → `AzureMLClient.predict('win-probability-model', features)`; same for risk-scoring, LSTM (or risk-analytics calls ml-service for LSTM by modelId), anomaly.
- **`ModelSelectionService`** (new): `selectRiskScoringModel(industryId, features)` → global vs industry by >3000 examples and >5% improvement; `selectWinProbabilityModel()`, etc.
- **`MLForecastingService`** (new or in forecasting): `generateMLForecast(tenantId, period)` → XGBoost/Prophet/quantile via Azure ML; `getRiskAdjustedForecast` uses `risk-analytics` risk scores (cached 1h).

### 5.5 risk-analytics Code (ML-Related)

- **`EarlyWarningService`:**  
  - Keep rules (stage stagnation, activity drop, stakeholder churn, risk acceleration).  
  - Add: `predictRiskTrajectory(opportunityId, [30,60,90])` → features from `RiskSnapshotService` + opportunity/activity → call ml-service `predict('risk-trajectory-lstm', ...)` or Azure ML from risk-analytics. If LSTM confidence < threshold, merge with rule-based.  
  - `calculateRiskVelocity` (extend in place): 1st/2nd derivative from `risk_snapshots`.
- **`RiskSnapshotService`** (new): On `risk.evaluated`: upsert `risk_snapshots`. Optional: batch job reading Data Lake (path/format TBD) → upsert `risk_snapshots`. Expose `getSnapshots(opportunityId, from, to)`.
- **`RiskClusteringService`:** Build feature matrix, call ml-service `startBatchJob('risk-clustering', {...})`, persist `risk_clusters`, `risk_association_rules`.
- **`RiskPropagationService`:** Build graph, call Azure ML batch `risk-propagation`, persist or return propagated scores; `AccountHealthService` uses opportunity risks + propagated.
- **`AnomalyDetectionService`:** Statistical (Z-score, IQR) in Node; ML: `AzureMLClient.predict('anomaly-detection-isolation-forest', features)`. Persist `risk_anomaly_alerts`; publish `anomaly.detected`.
- **`CompetitiveIntelligenceService`:** Competitor CRUD (writes `competitors`), NER/LLM via `ai-service` for mentions; track in `risk_competitor_tracking`. Win/loss from opportunity status + `competitorIds` or relationships.

### 5.6 Training and Deployment (Azure ML)

**Spec:** [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md) — input paths, target columns, script templates (risk-scoring, win-prob, LSTM, anomaly, Prophet), synthetic data, Azure ML I/O.

- **Training scripts (Python):** In repo `containers/ml-service/scripts/` or separate `ml-scripts/`: `train_risk_scoring.py`, `train_win_probability.py`, `train_lstm_trajectory.py`, `train_prophet_forecast.py`, `train_clustering.py`, `train_propagation.py`, `train_anomaly.py`, `train_mitigation_ranking.py`. Each: read from Data Lake or from Cosmos export, train, register model, deploy to Managed Endpoint (real-time or batch).
- **Synthetic data (Phase 1):** Script `generate_synthetic_opportunities.py` (SMOTE, domain rules) for risk, win-probability, early-warning when real data < 3k/5k.
- **Calibration:** In `train_win_probability.py` (CalibratedClassifierCV, isotonic or Platt); no runtime post-step.
- **Shadow evaluation:** In `PredictionService` or risk flow: when industry model is used, async call global model and log diff (no UI).

### 5.7 Degraded Behavior (Resilience)

When Azure ML, shard-manager, or upstream data is unavailable, the system MUST still return usable results. **Fallbacks:**

| Scenario | Fallback |
|----------|----------|
| **Azure ML endpoint down / timeout** | **Risk-scoring:** Heuristic from `probability`, `daysSinceUpdated` (as in existing `predictRiskScore`). **Win-probability:** `Probability` from c_opportunity / 100 or rule-based. **LSTM / risk trajectory:** Rules only (stage stagnation, activity drop, risk acceleration). **Anomaly:** Statistical (Z-score, IQR) in Node. **Forecasting:** `Amount * Probability` and simple P10/P90 band. |
| **Shard-manager 404 (opportunity or account)** | `buildFeatureVector`: return `null` or partial vector with defaults; caller returns 404 or heuristic. |
| **Empty risk_snapshots / risk_evaluations** | `risk_score_latest` = 0.5; `risk_velocity` = 0; LSTM uses rules or "insufficient data" with low confidence. |
| **DataLakeCollector / Data Lake write failure** | Log and metric; do not block `risk.evaluated` publish or RiskSnapshotService. Backfill can retry later. |

---

## 6. UI Pages & Components

**Assumption:** Extend `containers/ui` (Next.js); dashboard backend = `dashboard` + `dashboard-analytics`.

### 6.1 UI Stack (Current)

- Next.js (App Router), React, Tailwind. Single `app/page.tsx`. Add routes under `app/` and reuse `layout.tsx`, `globals.css`.

### 6.2 New Pages (Routes)

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard` | Dashboard layout | Layout for manager/executive; widget grid |
| `/dashboard/manager` | ManagerDashboardPage | Manager view (team, pipeline, risk, early warning) |
| `/dashboard/executive` | ExecutiveDashboardPage | C-suite (portfolio, forecasts, heatmap, benchmarks) |
| `/dashboard/board` | BoardDashboardPage | Board (high-level) |
| `/opportunities` | OpportunityListPage | List with risk, win prob, early-warning indicators |
| `/opportunities/[id]` | OpportunityDetailPage | Detail: risk, evaluation, early warning, win prob, competitors, sentiment, anomalies, remediation |
| `/opportunities/[id]/risk` | OpportunityRiskPage | Risk deep-dive: trajectory, velocity, explainability, clusters |
| `/opportunities/[id]/remediation` | RemediationPage | Remediation workflow steps and completion |
| `/accounts/[id]` | AccountDetailPage | Account health, opportunities, propagation |
| `/analytics/competitive` | CompetitiveIntelligencePage | Win/loss by competitor, landscape |
| `/analytics/benchmarks` | IndustryBenchmarksPage | Industry benchmarks and comparison |
| `/analytics/portfolios` | PortfolioDrillDownPage | Portfolio → account → opportunity → activity |
| `/settings/competitors` | CompetitorSettingsPage | Competitor catalog (admin) |
| `/settings/industries` | IndustrySettingsPage | Industry list and tenant enable/disable (if in UI) |

### 6.3 UI Components (Reusable)

**Charts / visualizations:**
- `RiskGauge` – risk score 0–1
- `RiskTrajectoryChart` – 30/60/90-day predictions
- `RiskVelocityChart` – velocity and acceleration
- `WinProbabilityGauge` – win prob + CI
- `WinProbabilityTrendChart` – over time
- `ScenarioForecastChart` – P10/P50/P90
- `RiskHeatmap` – portfolio heatmap (account × risk category or similar)
- `CompetitorWinLossChart` – win/loss by competitor
- `SentimentTrendChart` – sentiment over time
- `StakeholderGraph` – network (D3/vis/Reaflow)
- `ClusterVisualization` – 2D/3D or list of clusters
- `BenchmarkComparison` – bar/radar vs industry percentiles

**Cards / blocks:**
- `EarlyWarningCard` – list of signals, severity, acknowledge; **Quick actions** (create task, start remediation) (§11)
- `AnomalyCard` – anomaly list and severity; **Quick actions** (§11)
- `ExplainabilityCard` – top drivers for risk and win-probability (§11)
- `RemediationWorkflowCard` – steps, progress, complete
- `AccountHealthCard` – health score, trend, critical opportunities
- `CompetitorMentionsCard` – mentions per competitor
- `LeadingIndicatorsCard` – leading indicator status

**Tables / lists:**
- `OpportunityRiskTable` – columns: opportunity, risk, win prob, early warning, anomaly
- `CompetitorTable` – competitors, win rate, revenue at stake
- `ActivityList` – activities (shards) for an opportunity with type, date, summary

**Forms / modals:**
- `CompleteRemediationStepModal` – comment, effectiveness (optional)
- `CreateRemediationWorkflowModal` – select risks and actions
- `CompetitorSelectModal` – link competitor to opportunity

**Layout:**
- `DashboardGrid` – responsive grid of widgets; widget types from backend
- `DrillDownBreadcrumb` – portfolio → account → opportunity → activity

### 6.4 Widget Types (Backend)

Dashboard `widget` entity: `type` + `config`. New `type` values:

- `risk_gauge`, `risk_trajectory`, `risk_velocity`, `win_probability`, `scenario_forecast`, `risk_heatmap`, `competitive_win_loss`, `sentiment_trend`, `early_warning_list`, `anomaly_list`, `remediation_progress`, `account_health`, `portfolio_summary`, `industry_benchmark`, `stakeholder_graph`, `cluster_summary`.

**Widget type → API resolution** (dashboard-analytics resolves `type` to the service and endpoint; `config` holds `opportunityId`, `accountId`, `portfolioId`, `period`, etc. as needed):

| Widget type | Service | Endpoint / source |
|-------------|---------|-------------------|
| `risk_gauge` | risk-analytics | `GET /api/v1/risk/opportunities/:opportunityId/latest-evaluation` or risk from manager/executive aggregate |
| `risk_trajectory` | risk-analytics | `GET /api/v1/opportunities/:id/risk-predictions` |
| `risk_velocity` | risk-analytics | `GET /api/v1/opportunities/:id/risk-velocity` |
| `win_probability` | ml-service or risk-analytics (proxy) | `GET /api/v1/opportunities/:id/win-probability` or `GET /api/v1/predict/win-probability/:id` |
| `scenario_forecast` | forecasting | `GET /api/v1/forecasts/:period/scenarios` |
| `risk_heatmap` | dashboard-analytics / risk-analytics | Aggregate risk by account/segment; `GET /api/v1/dashboards/executive` or risk-analytics portfolio |
| `competitive_win_loss` | risk-analytics | `GET /api/v1/analytics/competitive-win-loss` or `GET /api/v1/competitive-intelligence/dashboard` |
| `sentiment_trend` | risk-analytics / ai-insights | `GET /api/v1/opportunities/:id/sentiment-trends` |
| `early_warning_list` | risk-analytics | `GET /api/v1/early-warnings` or from manager dashboard |
| `anomaly_list` | risk-analytics | `GET /api/v1/opportunities/:id/anomalies` or aggregate |
| `remediation_progress` | recommendations | `GET /api/v1/remediation-workflows` (filter by opportunity/tenant) |
| `account_health` | risk-analytics | `GET /api/v1/accounts/:id/health` |
| `portfolio_summary` | dashboard-analytics | `GET /api/v1/portfolios/:id/summary` or `GET /api/v1/dashboards/manager` |
| `industry_benchmark` | dashboard-analytics / analytics-service | `GET /api/v1/industries/:id/benchmarks` |
| `stakeholder_graph` | risk-analytics | `GET /api/v1/opportunities/:id/stakeholder-graph` |
| `cluster_summary` | risk-analytics | `GET /api/v1/risk-clustering/clusters` |

UI maps `type` to the component in §6.3.

### 6.5 Files to Create / Extend (UI)

**New:**
- `containers/ui/src/app/dashboard/layout.tsx`
- `containers/ui/src/app/dashboard/manager/page.tsx`
- `containers/ui/src/app/dashboard/executive/page.tsx`
- `containers/ui/src/app/dashboard/board/page.tsx`
- `containers/ui/src/app/opportunities/page.tsx`
- `containers/ui/src/app/opportunities/[id]/page.tsx`
- `containers/ui/src/app/opportunities/[id]/risk/page.tsx`
- `containers/ui/src/app/opportunities/[id]/remediation/page.tsx`
- `containers/ui/src/app/accounts/[id]/page.tsx`
- `containers/ui/src/app/analytics/competitive/page.tsx`
- `containers/ui/src/app/analytics/benchmarks/page.tsx`
- `containers/ui/src/app/analytics/portfolios/page.tsx`
- `containers/ui/src/app/settings/competitors/page.tsx`
- `containers/ui/src/components/risk/RiskGauge.tsx`, `RiskTrajectoryChart.tsx`, `RiskVelocityChart.tsx`, `RiskHeatmap.tsx`
- `containers/ui/src/components/forecast/WinProbabilityGauge.tsx`, `WinProbabilityTrendChart.tsx`, `ScenarioForecastChart.tsx`
- `containers/ui/src/components/competitive/CompetitorWinLossChart.tsx`, `CompetitorMentionsCard.tsx`
- `containers/ui/src/components/remediation/RemediationWorkflowCard.tsx`, `CompleteRemediationStepModal.tsx`
- `containers/ui/src/components/account/AccountHealthCard.tsx`
- `containers/ui/src/components/analytics/SentimentTrendChart.tsx`, `StakeholderGraph.tsx`, `ClusterVisualization.tsx`, `BenchmarkComparison.tsx`
- `containers/ui/src/components/dashboard/DashboardGrid.tsx`, `EarlyWarningCard.tsx`, `AnomalyCard.tsx`
- `containers/ui/src/lib/api/risk.ts`, `forecast.ts`, `recommendations.ts`, `dashboard.ts` – API clients (fetch to api-gateway)

**Extend:**
- `containers/ui/src/app/layout.tsx` – nav links to `/dashboard`, `/opportunities`, `/analytics/*`, `/settings/competitors`
- `containers/ui/package.json` – add deps: `recharts` or `victory`, `@xyflow/react` or `d3` (or `vis`) for graphs, `date-fns`

---

## 7. Events

**Transport:** **RabbitMQ only** (exchange `coder_events`). No Azure Service Bus. **Convention:** `{domain}.{entity}.{action}`. All events use `tenantId` (no `organizationId`). See ModuleImplementationGuide §9.

### 7.1 Published (New or Extended)

| Event | Publisher | Payload (min) | Consumers |
|-------|-----------|---------------|-----------|
| `risk.evaluated` | risk-analytics | tenantId, opportunityId, riskScore, categoryScores, **topDrivers** (optional), **dataQuality** (optional), timestamp | logging (ML audit), **Data Collector** (in logging → Data Lake), risk-analytics (RiskSnapshotService → Cosmos `risk_snapshots`) |
| `risk.prediction.generated` | risk-analytics | tenantId, opportunityId, horizons, predictions, modelId | logging, notification (if alert) |
| `risk.cluster.updated` | risk-analytics (batch) | tenantId, clusterIds, ruleCount | logging, cache invalidation |
| `anomaly.detected` | risk-analytics | tenantId, opportunityId, anomalyType, severity, description | notification-manager, logging |
| `competitor.detected` | risk-analytics | tenantId, opportunityId, competitorId, mentionCount | logging |
| `remediation.workflow.created` | recommendations | workflowId, tenantId, opportunityId, assignedTo | notification-manager |
| `remediation.step.completed` | recommendations | workflowId, stepNumber, completedBy, allStepsComplete | notification-manager |
| `remediation.workflow.completed` | recommendations | workflowId, tenantId, duration | logging, analytics |
| `ml.prediction.completed` | ml-service (optional) | modelId, opportunityId, inferenceMs | logging (audit), **Usage Tracking** |
| `workflow.job.trigger` | workflow-orchestrator (scheduler) | job, metadata, triggeredBy, timestamp | Workers bound to `bi_batch_jobs` |
| `workflow.job.completed` | job workers | job, status, completedAt | logging |
| `workflow.job.failed` | job workers | job, error, failedAt | logging, alerting |
| `opportunity.outcome.recorded` | risk-analytics or sync job | tenantId, opportunityId, outcome (won\|lost), competitorId?, closeDate, amount | ml-service / risk-analytics (append to Data Lake or ml_outcomes for retraining) |
| `ml.model.drift.detected` | model-monitoring job | modelId, segment?, metric, delta | logging, alerting |
| `ml.model.performance.degraded` | model-monitoring job | modelId, metric, value, threshold | logging, alerting |

### 7.2 Consumed (New Bindings)

| Event | Consumer | Action |
|-------|----------|--------|
| `risk.evaluated` | risk-analytics (RiskSnapshotService) | Upsert `risk_snapshots` (Cosmos) |
| `risk.evaluated` | **logging** (DataLakeCollector in `events/consumers/`) | Write to Azure Data Lake (Parquet) |
| `risk.evaluated`, `ml.prediction.completed`, etc. | **logging** (MLAuditConsumer in `events/consumers/`) | Audit log (Blob/immutable) |
| `ml.prediction.completed`, `llm.inference.completed`, `embedding.generated` | **Usage Tracking** (analytics-service or new) | Aggregate for billing (Cosmos) |
| `workflow.job.trigger` | risk-analytics, analytics-service, etc. (queue `bi_batch_jobs`) | Run job: risk-clustering, account-health, industry-benchmarks, risk-snapshot-backfill |
| `opportunity.updated` | risk-analytics | Re-eval, refresh snapshots (existing) |
| `shard.updated` | data-enrichment / sentiment | Run sentiment on `c_email`, `c_note`, etc. |
| `anomaly.detected` | notification-manager | Notify owner (high severity) |
| `opportunity.outcome.recorded` | ml-service or risk-analytics | Append to Data Lake `/ml_outcomes/...` (schema and publisher: [BI_SALES_RISK_DATA_LAKE_LAYOUT](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) §2.2, §3); enables retraining. |

### 7.3 Payload Size

- `risk.prediction.generated`, `risk.evaluated`: full small payload in event.
- `risk.cluster.updated`: references; large cluster data in Cosmos, not in event.
- `remediation.workflow.completed`: id + metadata only.

---

## 8. Configuration & Feature Flags

### 8.1 risk-analytics `config/default.yaml`

**Add:**
```yaml
services:
  # ... existing ...

# Data Lake: for risk-snapshot-backfill job (read from Data Lake → Cosmos).
# Writer: logging's DataLakeCollector (consumes risk.evaluated). Reader: risk-analytics BatchJobWorker.
data_lake:
  connection_string: ${DATA_LAKE_CONNECTION_STRING:-}
  container: ${DATA_LAKE_CONTAINER:-risk}
  path_prefix: ${DATA_LAKE_PATH_PREFIX:-/risk_evaluations}

feature_flags:
  early_warning_lstm: ${EARLY_WARNING_LSTM_ENABLED:-true}
  industry_models: ${INDUSTRY_MODELS_ENABLED:-true}
  competitive_intelligence: ${COMPETITIVE_INTELLIGENCE_ENABLED:-true}
  anomaly_detection: ${ANOMALY_DETECTION_ENABLED:-true}
  prescriptive_remediation: ${PRESCRIPTIVE_REMEDIATION_ENABLED:-true}
  executive_dashboards: ${EXECUTIVE_DASHBOARDS_ENABLED:-true}
  hitl_approvals: ${HITL_APPROVALS_ENABLED:-false}

thresholds:
  early_warning_days_inactivity: [7, 14, 21]
  risk_velocity_alert: 0.15
  hitl_risk_min: 0.8
  hitl_deal_min: 1000000
```

### 8.2 ml-service `config/default.yaml`

**Add:**
```yaml
azure_ml:
  workspace_name: ${AZURE_ML_WORKSPACE_NAME:-}
  resource_group: ${AZURE_ML_RESOURCE_GROUP:-castiel-ml-prod-rg}
  subscription_id: ${AZURE_ML_SUBSCRIPTION_ID:-}
  endpoints:
    risk_scoring_global: ${AZURE_ML_ENDPOINT_RISK_GLOBAL:-}
    risk_scoring_industry: ${AZURE_ML_ENDPOINT_RISK_INDUSTRY:-}
    risk_trajectory_lstm: ${AZURE_ML_ENDPOINT_LSTM:-}
    win_probability: ${AZURE_ML_ENDPOINT_WIN_PROB:-}
    revenue_forecasting: ${AZURE_ML_ENDPOINT_FORECAST:-}
    clustering: ${AZURE_ML_BATCH_CLUSTERING:-}
    propagation: ${AZURE_ML_BATCH_PROPAGATION:-}
    anomaly: ${AZURE_ML_ENDPOINT_ANOMALY:-}
    mitigation_ranking: ${AZURE_ML_ENDPOINT_MITIGATION:-}

services:
  # ... existing; add risk_analytics if ml calls risk-analytics for features
  risk_analytics:
    url: ${RISK_ANALYTICS_URL:-http://localhost:3048}
```

### 8.3 forecasting `config/default.yaml`

**Add:**
```yaml
services:
  risk_analytics:
    url: ${RISK_ANALYTICS_URL:-http://localhost:3048}
```

### 8.4 Per-Tenant Overrides (Optional)

If `configuration-service` holds tenant overrides: `feature_flags.*`, `thresholds.hitl_risk_min`, `thresholds.hitl_deal_min`, `azure_ml.endpoints` (e.g. custom model URL). ml-service and risk-analytics read from `configuration-service` when present, else `config/default.yaml`.

### 8.5 Observability & Monitoring (Mandatory)

**All BI/risk containers** must implement:

#### 8.5.1 Azure Application Insights

- **Purpose:** Distributed tracing, dependency tracking (HTTP, Cosmos, RabbitMQ, Azure ML), custom events, performance, and exception logging.
- **Config:** `APPLICATIONINSIGHTS_CONNECTION_STRING` (env) or `application_insights.connection_string` in config. Initialize **as early as possible** (before other imports that make network calls).
- **Implementation:** Use **`@azure/monitor-opentelemetry`** (OTel-based). Best option: OTel standard, modern, supports multiple exporters (App Insights + optional OTLP), better ecosystem alignment, Azure’s recommended path for new Node.js apps. Auto-instrument HTTP, Cosmos, and (where supported) amqplib. Track custom events for business semantics (e.g. `risk.evaluated` count, `ml.prediction` latency by model).
- **Containers:** risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics, notification-manager (and any other used by BI/risk).

#### 8.5.2 Prometheus Metrics Endpoint

- **Purpose:** Scraping by **Prometheus** and dashboards in **Grafana** for real-time and historical metrics.
- **Endpoint:** `GET /metrics` (or `metrics.path` from config, default `/metrics`). **Content-Type:** `text/plain; version=0.0.4` (Prometheus exposition format).
- **Auth (configurable):** When `metrics.require_auth` is true, `/metrics` MUST require `Authorization: Bearer <token>`. The token is validated against `metrics.bearer_token` (or `METRICS_BEARER_TOKEN`). Prometheus scrape config uses `bearer_token` or `bearer_token_file`. When `require_auth` is false (e.g. trusted internal network), no auth.
- **Implementation:** Use **prom-client**: `Counter`, `Histogram`, `Gauge`. Register with default registry; expose via `register.metrics()` on GET /metrics. Include:
  - `http_requests_total` (method, route, status)
  - `http_request_duration_seconds` (method, route)
  - App-specific: e.g. `risk_evaluations_total`, `ml_predictions_total{model=}`, `rabbitmq_messages_consumed_total{queue=}`, `batch_job_duration_seconds{job=}`.
- **Containers:** Every container; for BI/risk: risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics.

#### 8.5.3 Prometheus & Grafana Configuration (in Repo)

- **Repo MUST include** full Prometheus and Grafana configuration for BI/risk:
  - **Prometheus:** `deployment/monitoring/prometheus/scrape-config.yaml` (or equivalent) with scrape jobs for risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics. When `metrics.require_auth` is true, each job uses `bearer_token` or `bearer_token_file`.
  - **Grafana:** `deployment/monitoring/grafana/dashboards/` with dashboard JSON for BI/risk (e.g. `bi-risk-overview.json`, `ml-service.json`, `batch-jobs.json`). Dashboards use Prometheus as data source.

#### 8.5.4 Config (add to each container `config/default.yaml`)

```yaml
# Application Insights (env: APPLICATIONINSIGHTS_CONNECTION_STRING)
application_insights:
  connection_string: ${APPLICATIONINSIGHTS_CONNECTION_STRING:-}
  disable: ${APPLICATIONINSIGHTS_DISABLE:-false}

# Prometheus metrics
metrics:
  path: ${METRICS_PATH:-/metrics}
  require_auth: ${METRICS_REQUIRE_AUTH:-false}
  bearer_token: ${METRICS_BEARER_TOKEN:-}
  # Or bearer_token_file: ${METRICS_BEARER_TOKEN_FILE:-} for file-based secret
```

**Schema:** Add `application_insights.connection_string`, `application_insights.disable`, `metrics.path`, `metrics.require_auth`, `metrics.bearer_token` to `config/schema.json` where applicable.

---

## 9. Integration & Data Flows

### 9.1 Data Lake ↔ risk_snapshots

**Spec:** [BI_SALES_RISK_DATA_LAKE_LAYOUT.md](./BI_SALES_RISK_DATA_LAKE_LAYOUT.md) — paths, Parquet schemas, `opportunity.outcome.recorded` flow.

- **Writer to Data Lake:** **Data Collector** = module inside **`containers/logging`**. Implement as `events/consumers/DataLakeCollector.ts` (per ModuleImplementationGuide §3.1, §9). Subscribes to `risk.evaluated` (and optionally `ml.prediction.completed`, `opportunity.updated`, `forecast.generated`) via RabbitMQ. Writes to Azure Data Lake: path **`/risk_evaluations/year=YYYY/month=MM/day=DD/`**, format **Parquet** (columns: tenantId, opportunityId, riskScore, categoryScores, topDrivers?, dataQuality?, timestamp).
- **Materialized view:** RiskSnapshotService in **risk-analytics** subscribes to `risk.evaluated` via RabbitMQ → upsert `risk_snapshots` (Cosmos).
- **Backfill:** Batch job triggered by **`workflow.job.trigger`** with `job: 'risk-snapshot-backfill'`. Worker reads Data Lake (by date range), upsert into `risk_snapshots`. One-time for history; optionally weekly.

### 9.2 External Data (News, Market)

- **integration-manager:** Adapters for NewsAPI, Alpha Vantage; schedule (e.g. daily). On fetch: create shards `news_article`, `market_data` via shard-manager. Optionally publish `external_data.ingested` and link to opportunities (by company/account).
- **risk-analytics / early-warning:** May consume `news_article` for sentiment or “company in news” as an extra leading indicator (Phase 2).

### 9.3 Batch Jobs: Scheduler + RabbitMQ

**Pattern (per BI_SALES_RISK_FINAL_ANSWERS §4):** Scheduler in **workflow-orchestrator** (node-cron) **publishes** to RabbitMQ `workflow.job.trigger`. Queue **`bi_batch_jobs`** bound to `coder_events`. Workers in risk-analytics, analytics-service consume from `bi_batch_jobs`. **RabbitMQ only**—no Azure Functions or other job queues.

| Job | Schedule (cron) | Worker | Action |
|-----|-----------------|--------|--------|
| `risk-clustering` | `0 2 * * *` | risk-analytics | RiskClusteringService; persist `risk_clusters`, `risk_association_rules` |
| `account-health` | `0 3 * * *` | risk-analytics | AccountHealthService.calculateAccountHealth |
| `industry-benchmarks` | `0 4 * * *` | analytics-service / dashboard-analytics | IndustryBenchmarkService.calculateAndStore |
| `risk-snapshot-backfill` | One-time or `0 1 * * 0` | risk-analytics | Read Data Lake → upsert `risk_snapshots` |
| `propagation` | On-demand or `0 5 * * *` | risk-analytics | RiskPropagationService batch |
| `model-monitoring` | `0 6 * * 0` (weekly) | ml-service or risk-analytics | Drift (PSI) + performance (Brier, MAE); publish `ml.model.drift.detected` / `performance.degraded` (Phase 2) |
| `outcome-sync` | `0 1 * * *` (daily) | risk-analytics or sync | Emit `opportunity.outcome.recorded` for recently closed; enables retraining (Phase 1–2) |

**workflow-orchestrator:** `jobs/BatchJobScheduler.ts` publishes `workflow.job.trigger` via `events/publisher.ts`. **risk-analytics**, etc.: `events/consumers/BatchJobWorker.ts` consuming `bi_batch_jobs` (ModuleImplementationGuide §3.1 `events/consumers/`, `jobs/`).

---

## 10. Phase-by-Phase Task Breakdown

### Phase 1 (Months 1–3)

**Infrastructure & data**
- [x] Azure ML: create Workspace, compute, Key Vault, managed endpoints (stubs ok initially). Stub: optional `azure_ml` in ml-service; empty endpoints → AzureMLClient throws, callers use heuristics (Plan §5.7). Workspace, compute, Key Vault, managed endpoints are infra (Terraform/manual), out of app repo; when provisioned, set azure_ml.endpoints.
- [x] ml-service: add `AzureMLClient`, config `azure_ml.*`. `src/clients/AzureMLClient.ts`: predict(modelId, features), hasEndpoint; config azure_ml.workspace_name, resource_group, subscription_id, endpoints (modelId→scoring URL), api_key; schema.json. /health uses azure_ml.endpoints for per-endpoint ok|unreachable.
- [x] risk-analytics: add `risk_snapshots` container and config; `RiskSnapshotService` consuming `risk.evaluated` via RabbitMQ; backfill job via `workflow.job.trigger` (worker reads Data Lake → Cosmos). cosmos_db.containers.snapshots=risk_snapshots; RiskAnalyticsEventConsumer risk.evaluated→upsertFromEvent; BatchJobWorker job=risk-snapshot-backfill reads /risk_evaluations/year=.../month=.../day=.../*.parquet→upsertFromDataLakeRow; data_lake.* required at run for backfill.
- [x] **logging:** Add `events/consumers/DataLakeCollector.ts` (subscribes `risk.evaluated`, etc. → Azure Data Lake Parquet at `/risk_evaluations/year=.../month=.../day=.../`); `events/consumers/MLAuditConsumer.ts` (subscribes `risk.evaluated`, `ml.prediction.completed`, `remediation.workflow.completed` → audit log). Config: `data_lake.*`, `config/schema.json`. Per ModuleImplementationGuide §3.1, §9. Done: DataLakeCollector (risk.evaluated → Parquet, `data_lake.*`, `rabbitmq.data_lake`); MLAuditConsumer (risk.evaluated, risk.prediction.generated, ml.prediction.completed, remediation.workflow.completed → Blob at `audit_path_prefix`); `data_lake` and `rabbitmq.data_lake`/`ml_audit` in schema.
- [x] **Usage Tracking:** Add to analytics-service (or new): consumer for `ml.prediction.completed`, `llm.inference.completed`, `embedding.generated`; aggregate in Cosmos for billing. analytics-service: UsageTrackingConsumer (events/consumers/UsageTrackingConsumer.ts), RabbitMQ bindings, appends to Cosmos analytics_usage_ml (usage_ml); config cosmos_db.containers.usage_ml, rabbitmq.bindings; server init/close.

**ML models (training + endpoints)**
- [ ] `risk-scoring-global` and `risk-scoring-{industry}`: train (synthetic if needed), calibrate, deploy; `ModelSelectionService` in ml-service. **ModelSelectionService done:** selectRiskScoringModel, selectWinProbabilityModel; `GET /api/v1/ml/model-selection/risk-scoring`, `/win-probability`. train/calibrate/deploy (Python, Azure ML) remain.
- [ ] `risk-trajectory-lstm`: train on `risk_snapshots` (+ leading indicators where available), deploy; `EarlyWarningService.predictRiskTrajectory` calls it; keep rules as fallback.
- [ ] `win-probability-model`: train, CalibratedClassifierCV in script, deploy; `PredictionService.predictWinProbability`; rule-based fallback.
- [ ] `revenue-forecasting-model`: XGBoost + Prophet + quantile script, deploy; `ForecastingService.getMLForecast`, `getScenarioForecast`, `getRiskAdjustedForecast`; risk from risk-analytics (cached).

**APIs**
- [x] risk-analytics: `GET/POST /api/v1/opportunities/:id/risk-predictions`, `GET /api/v1/opportunities/:id/risk-velocity`, `GET /api/v1/opportunities/:id/risk-snapshots`. GET + POST .../risk-predictions/generate, GET .../risk-velocity (EarlyWarningService.calculateRiskVelocity), GET .../risk-snapshots (RiskSnapshotService.getSnapshots).
- [x] risk-analytics: `GET /api/v1/opportunities/:id/win-probability` (proxy to ml-service) or ml-service `GET /api/v1/predict/win-probability/:opportunityId`. risk-analytics: GET .../win-probability proxies to ml-service POST /api/v1/ml/win-probability/predict; returns { probability }. Config services.ml_service.url; 503 when not configured.
- [x] forecasting: `GET /api/v1/forecasts/:period/scenarios`, `.../risk-adjusted`, `.../ml`. ForecastingService.getScenarioForecast, getRiskAdjustedForecast, getMLForecast; OpenAPI and routes in place. scenarios/risk-adjusted: stub from tenant aggregate; ml: stub or ml-service when configured.

**Competitive intelligence (basic)**
- [x] `competitors`, `risk_competitor_tracking` containers; `CompetitiveIntelligenceService` (CRUD, track, basic win/loss from opportunity status + competitor link). Config cosmos_db.containers.competitor_tracking, competitors; CompetitiveIntelligenceService: getCompetitorsForOpportunity, trackCompetitor, getDashboard, analyzeWinLossByCompetitor; risk_win_loss_reasons for win/loss; winLoss stubbed until c_opportunity IsClosed/IsWon.
- [x] risk-analytics: `GET /api/v1/opportunities/:id/competitors`, `POST /api/v1/competitors/:id/track`, `GET /api/v1/competitive-intelligence/dashboard`, `GET /api/v1/analytics/competitive-win-loss`. All four routes and OpenAPI in place.

**UI**
- [x] `containers/ui`: routes `/dashboard`, `/dashboard/manager`, `/opportunities`, `/opportunities/[id]`.
- [x] Components: `RiskGauge`, `RiskTrajectoryChart`, `RiskVelocityChart`, `WinProbabilityGauge`, `ScenarioForecastChart`, `EarlyWarningCard`, `CompetitorMentionsCard`, `DashboardGrid`.
- [x] dashboard-analytics: `GET /api/v1/dashboards/manager` (or equivalent) returning widget data for manager view.

**Events & config**
- [x] `risk.prediction.generated`; `risk.evaluated` binding for RiskSnapshotService, **logging** (DataLakeCollector, MLAuditConsumer), **Usage Tracking**. All via **RabbitMQ** (no Azure Service Bus).
- [x] risk-analytics, ml-service: feature flags and `azure_ml` in config.
- [x] **Batch jobs (RabbitMQ):** workflow-orchestrator `jobs/BatchJobScheduler.ts` (node-cron) publishing `workflow.job.trigger`; queue `bi_batch_jobs` bound to `coder_events`. risk-analytics `events/consumers/BatchJobWorker.ts` consumes `bi_batch_jobs`, implements `risk-snapshot-backfill` in Phase 1 (risk-clustering, account-health, industry-benchmarks in Phase 2).

**Observability (mandatory, §8.5):**
- [x] **Azure Application Insights:** All BI/risk containers instrumented with **`@azure/monitor-opentelemetry`**. Config: `APPLICATIONINSIGHTS_CONNECTION_STRING`; init before other imports. Custom OTel spans for `risk.evaluated`, `ml.prediction`, `workflow.job.trigger`, `batch_job.run`.
- [x] **Prometheus /metrics:** Each BI/risk container exposes `GET /metrics` (prom-client): `http_requests_total`, `http_request_duration_seconds`, app-specific (`risk_evaluations_total`, `ml_predictions_total`, `batch_job_duration_seconds`, `forecasts_generated_total`, `batch_job_triggers_total`). **Auth:** when `metrics.require_auth` is true, require `Authorization: Bearer <token>` validated against `METRICS_BEARER_TOKEN`. notification-manager updated to prom-client, config `metrics.path`/`require_auth`/`bearer_token`, and optional Bearer.
- [x] **Prometheus & Grafana config in repo:** `deployment/monitoring/prometheus/scrape-config.yaml` for risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging, dashboard-analytics, notification-manager (comments for `bearer_token`/`bearer_token_file` when `require_auth`); `deployment/monitoring/grafana/dashboards/` with `bi-risk-overview.json`, `ml-service.json`, `batch-jobs.json` (UIDs, datasource templating, metrics per README). batch-jobs: `batch_job_duration_seconds` scoped to `job="risk-analytics"`.

**Best-in-class (see §11):**
- [x] **Outcome feedback:** Publish `opportunity.outcome.recorded` when opportunity Closed Won/Lost (sync job or on shard update); consumer appends outcome to Data Lake / `ml_outcomes` for retraining. outcome-sync (BatchJobWorker, cron `0 1 * * *`); RiskAnalyticsEventConsumer on `shard.updated` / `integration.opportunity.updated` via tryPublishOutcomeOnShardUpdate (outcome_feedback.publish_on_shard_update); consumer `opportunity.outcome.recorded` → OutcomeDataLakeWriter → /ml_outcomes (DATA_LAKE_LAYOUT §2.2).
- [x] **Explainability:** `topDrivers` in `risk.evaluated` (shape `{ feature, contribution, direction }`), win-probability `GET /opportunities/:id/win-probability/explain`, `GET /opportunities/:id/risk-explainability`; `ExplainabilityCard` in UI with `opportunityId` fetch for both risk and win-prob drivers.
- [x] **Data quality:** `dataQuality: { score, completenessPct, missingCritical, stalenessDays }` in risk evaluation and evaluation API; used by trust-level. RiskEvaluationService + buildAssumptions already produce and store dataQuality; risk.evaluated and evaluation APIs return it. TrustLevelService accepts optional dataQuality from latest evaluation; trust-level route fetches latest and passes it when present.
- [x] **Health:** risk-analytics and ml-service `/health` include: Azure ML endpoints reachable, last successful `risk-snapshot-backfill` timestamp. risk-analytics: `lastRiskSnapshotBackfillAt` (set in BatchJobWorker when risk-snapshot-backfill completes), `mlServiceReachable` (ok|unreachable|not_configured via ml-service /health). ml-service: `azureMl: { status, endpoints }` (ok|degraded|not_configured; per-endpoint ok|unreachable).

---

### Phase 2 (Months 4–6)

**Clustering & propagation**
- [x] `risk_clusters`, `risk_association_rules`; `RiskClusteringService` (identifyRiskClusters, findAssociationRules, computeAndPersistForTenant heuristic from risk_revenue_at_risk; Azure ML DBSCAN/K-Means + Apriori TBD). `GET /api/v1/risk-clustering/clusters`, `.../association-rules`, `POST .../trigger`; BatchJobWorker `risk-clustering`.
- [x] workflow-orchestrator: `BatchJobScheduler` cron for `risk-clustering` (2 AM), `account-health` (3 AM), `industry-benchmarks` (4 AM), `propagation` (5 AM). risk-analytics `BatchJobWorker` handles these (consume `bi_batch_jobs`).
- [x] `RiskPropagationService`; `GET /api/v1/risk-propagation/opportunities/:id`; BatchJobWorker `propagation`. `analyzeRiskPropagation` and `computeAndPersistForTenant` implemented (stub returns propagatedRisk/affectedNodeIds or _stub); Azure ML batch (NetworkX) and optional persistence TBD.
- [x] `AccountHealthService`; `risk_account_health`; `GET /api/v1/accounts/:id/health`; `account-health` job via `workflow.job.trigger`. `calculateAccountHealth` reads from Cosmos (id=tenantId_accountId); `computeAndPersistForTenant` builds account→opportunities from shard-manager c_opportunity, aggregates risk from risk_revenue_at_risk, upserts risk_account_health. BatchJobWorker `account-health`.

**Anomaly & sentiment**
- [x] `AnomalyDetectionService` (statistical Z-score; Isolation Forest TBD); `risk_anomaly_alerts`; `anomaly.detected`; `GET /api/v1/opportunities/:id/anomalies`, `POST .../anomalies/detect`. getAnomalies, runStatisticalDetection (Z-score on risk_snapshots/risk_evaluations; zScore ≥2→high, ≥1.5→medium; upsert + publish).
- [x] Sentiment: `risk_sentiment_trends`; `GET /api/v1/opportunities/:id/sentiment-trends`. SentimentTrendsService.getSentimentTrends; `sentiment.trends.updated` consumer (ai-insights/data-enrichment publish → upsert). Populated when ai-insights or data-enrichment wired.

**Network**
- [x] `GET /api/v1/opportunities/:id/stakeholder-graph`. StakeholderGraphService.getGraph: has_contact, has_stakeholder (opportunity→contact), reports_to (contact→contact) via shard-manager; nodes (id, type, label?), edges (source, target, relationshipType). Azure ML centrality TBD.

**Prescriptive & remediation**
- [x] recommendations: `MitigationRankingService`, `RemediationWorkflowService`; `recommendation_remediation_workflows`, `recommendation_mitigation_actions`. rankMitigationActions (recommendation_mitigation_actions or stub); createWorkflow, getWorkflow, getWorkflowsByOpportunity, completeStep, cancelWorkflow; remediation.workflow.created, remediation.step.completed, remediation.workflow.completed.
- [x] APIs: `GET /api/v1/opportunities/:id/mitigation-actions`; `POST/GET /api/v1/remediation-workflows`, `GET /api/v1/remediation-workflows/:id`, `POST .../steps/:stepNumber/complete`, `PUT .../cancel`.
- [x] `remediation.workflow.created`, `remediation.step.completed`, `remediation.workflow.completed` (RecommendationEventPublisher; logs-events.md). `mitigation-ranking-model` (Azure ML) TBD; MitigationRankingService uses recommendation_mitigation_actions or stub until wired.

**Executive dashboards**
- [x] `GET /api/v1/dashboards/executive`, `.../board`; `DashboardAnalyticsService.getExecutiveDashboard`, `getBoardDashboard` (risk-analytics revenue-at-risk, competitive-intel, forecasting; risk_heatmap, industry_benchmark stubbed). OpenAPI, routes.
- [x] UI: `ExecutiveDashboardPage`, `BoardDashboardPage`; `RiskHeatmap`, `CompetitorWinLossChart`, `AccountHealthCard`. `/dashboard/executive`, `/dashboard/board`; ExecutiveDashboardContent, BoardDashboardContent.

**UI**
- [x] `/opportunities/[id]/risk`, `/opportunities/[id]/remediation`, `/accounts/[id]`, `/analytics/competitive`. Pages: OpportunityRiskPage, RemediationPage, AccountDetailPage, CompetitiveIntelligencePage.
- [x] `RemediationWorkflowCard`, `CompleteRemediationStepModal`, `AnomalyCard`, `StakeholderGraph`. Used in opportunity detail, remediation, analytics.

**Best-in-class (see §11):**
- [x] **Model monitoring:** `model-monitoring` batch job (BatchJobScheduler Sun 6 AM; BatchJobWorker → ml-service `POST /api/v1/ml/model-monitoring/run`; `ModelMonitoringService.runForTenants` stub). Runbook: `deployment/monitoring/runbooks/model-monitoring.md`. Inference logging (Data Lake / `ml_inference_logs`), PSI/Brier/MAE, `ml.model.drift.detected` / `ml.model.performance.degraded` publish TBD.
- [x] **Prioritized manager:** `GET /api/v1/dashboards/manager/prioritized` (dashboard-analytics → risk-analytics `GET /api/v1/risk-analysis/tenant/prioritized-opportunities`). `PrioritizedOpportunitiesService`: rank = revenueAtRisk × riskScore × earlyWarningMultiplier; `suggestedAction` null until mitigation-ranking. `RecommendedTodayCard` on manager dashboard. “Recommended today” block in UI.
- [x] **Quick actions:** `POST /api/v1/opportunities/:id/quick-actions` (`create_task`, `log_activity`, `start_remediation`); buttons on EarlyWarningCard, AnomalyCard. risk-analytics: QuickActionsService.executeQuickAction, publishes `opportunity.quick_action.requested`; 202 Accepted. EarlyWarningCard and AnomalyCard call the API; OpenAPI, logs-events.md.
- [x] **Win/loss reasons:** `lossReason`, `winReason`, `competitorId` in BI_SALES_RISK_SHARD_SCHEMAS (c_opportunity) and `risk_win_loss_reasons`. `CompetitiveIntelligenceService.recordWinLossReasons`, `getWinLossReasons`; `PUT/GET /api/v1/opportunities/:id/win-loss-reasons`. getDashboard and analyzeWinLossByCompetitor use risk_win_loss_reasons for winLoss / byCompetitor.
- [x] **At-risk taxonomy:** `atRiskReasons: string[]` in risk evaluations/snapshots; map to mitigation playbooks; “Top at-risk reasons” in dashboard.
- [x] **Peer deal comparison:** `GET /api/v1/opportunities/:id/similar-won-deals` or extend benchmark-comparison; similar by stage, industry, size; win rate, median cycle time.
- [x] **Model card & segment fairness:** `GET /api/v1/models/:id/card`; segment fairness check in model-monitoring (Brier/calibration by industry, region, size); alert if delta &gt; threshold.

---

### Phase 3 (Months 7–9) — **Future (out of initial scope)**

**Industry benchmarking**
- [ ] `analytics_industry_benchmarks`; `IndustryBenchmarkService.calculateAndStore`; nightly job; `GET /api/v1/industries/:id/benchmarks`, `GET /api/v1/opportunities/:id/benchmark-comparison`.
- [ ] UI: `BenchmarkComparison`, `/analytics/benchmarks`.

**Drill-down**
- [ ] `GET /api/v1/portfolios/:id/summary`, `.../accounts`; `GET /api/v1/accounts/:id/opportunities`; `GET /api/v1/opportunities/:id/activities` (shard-manager or dashboard-analytics).
- [ ] UI: `PortfolioDrillDownPage`, `DrillDownBreadcrumb`, `ActivityList`.

**Deep learning / RL / causal (optional)**
- [ ] If in scope: DNN/LSTM for sequences, RL (DQN) for strategy, DoWhy for causal; new Azure ML training and endpoints; integrate into risk/win-prob/recommendations where specified.

---

### Phase 4 (Months 10–11) — **Future (out of initial scope)**

**Compliance & audit**
- [ ] 3-tier audit: ensure `risk.evaluated`, `risk.prediction.generated`, `ml.prediction.completed` (or equivalent) feed logging and Data Collector; usage tracking for ML calls if needed.
- [ ] Tamper-proof: logging backend to immutable Blob or append-only store if required.

**HITL**
- [ ] Configurable thresholds (risk, deal size); `workflow-orchestrator` or dedicated approval flow; `notification-manager` for approval requests; audit of approve/reject.

**Model governance**
- [ ] Model cards in `ml_models` or `model_cards`; bias checks in training/CI; doc and runbooks.

**Performance**
- [ ] ONNX/Redis for win-prob or risk-scoring if <500ms p95 not met; scale-to-zero and cost tuning for Azure ML.

---

### Phase 5 (Month 12) — **Future (out of initial scope)**

- [ ] Rollout: beta tenants, 25/50/100%; feature flags and monitoring.
- [ ] Validation: KPIs (Brier, MAPE, early-warning accuracy, etc.); UAT.
- [ ] Docs: README, OpenAPI, runbooks; backfill `user requirement.md` with in-scope summary.

---

## Dependencies (Implementation Order)

1. Azure ML Workspace + ml-service `AzureMLClient` (and config).
2. `risk_snapshots` + `RiskSnapshotService` + `risk.evaluated` (and Data Lake if used).
3. `risk-scoring-global` (and industry when schema/industry source known); `ModelSelectionService`.
4. `EarlyWarningService` LSTM + rules; `risk_predictions`; `win-probability-model`; `revenue-forecasting` + scenario/risk-adjusted.
5. Competitive intel containers and services; then clustering, propagation, account-health, anomaly, sentiment, network.
6. recommendations (mitigation + remediation); then executive/board dashboards, benchmarks, drill-down.
7. Compliance, HITL, model governance, performance.

---

## 11. Additional Recommendations (Best-in-Class)

To make the system **the best BI Sales Risk analysis** platform, consider the following. Full detail: [BI_SALES_RISK_PLAN_ADDITIONAL_RECOMMENDATIONS.md](./BI_SALES_RISK_PLAN_ADDITIONAL_RECOMMENDATIONS.md).

### 11.1 Outcome Feedback Loop (Phase 1–2)

When opportunities close (Closed Won/Lost), feed **actual outcome** into ML. Add event `opportunity.outcome.recorded`; consumer that appends outcome to predictions/Data Lake for retraining. Enables continuous improvement of win-probability and risk-scoring.

### 11.2 Explainability (Phase 1)

Expose **top drivers** for risk and win-probability (`topDrivers: { feature, contribution, direction }[]`) in APIs and `risk.evaluated` / win-prob response. Add `ExplainabilityCard` in UI. Use tree feature importance or rule hits in Phase 1; SHAP/LIME for LSTM in Phase 2 if needed.

### 11.3 Model Monitoring & Drift (Phase 2)

Log feature vector at inference (Data Lake or `ml_inference_logs`); weekly `model-monitoring` job: data drift (e.g. PSI) and performance (Brier, MAE). Publish `ml.model.drift.detected` / `ml.model.performance.degraded`; runbook for rollback or retrain.

### 11.4 Sales-Specific Leading Indicators (Phase 1–2)

Add **champion strength**, **buying committee coverage** (from `c_contact.role`), and **stage velocity vs expected** (from benchmarks). Enriches early-warning and feature pipeline.

### 11.5 Prioritized “Recommended Today” (Phase 2)

`GET /api/v1/dashboards/manager/prioritized`: rank opportunities by revenue-at-risk × risk × early-warning; `suggestedAction` from mitigation-ranking. “Recommended for you today” block on manager dashboard.

### 11.6 Data Quality & Model-Ready (Phase 1)

In risk evaluation and APIs: `dataQuality: { score, completenessPct, missingCritical, stalenessDays }`. Use in trust-level and model selection (low completeness → rules or lower confidence).

### 11.7 SLOs, Health, Runbooks (Phase 1–2)

**Health:** `/health` includes Azure ML endpoints and last successful `risk-snapshot-backfill`. **SLOs:** e.g. risk-predictions p95 &lt; 500 ms; document in runbook. **Runbooks:** model rollback, backfill failure, consumer scaling.

### 11.8 Win/Loss Reasons (Phase 2)

Schema: `lossReason`, `winReason`, `competitorId` on opportunity or `win_loss_reasons`. Feed CompetitiveIntelligenceService and, later, ML (e.g. “When we lose to X, top reasons: Price, Product gap”).

### 11.9 Model Cards & Segment Fairness (Phase 1–2)

**Model card (lite):** purpose, input, output, limitations in `ml_models` or `GET /api/v1/models/:id/card`. **Segment fairness (Phase 2):** in model-monitoring, compare Brier/calibration across industry, region, size; alert if delta &gt; threshold.

### 11.10 Quick Actions (Phase 2)

`POST /api/v1/opportunities/:id/quick-actions` with `create_task`, `log_activity`, `start_remediation`. Buttons on EarlyWarningCard and AnomalyCard to reduce friction from “see risk” to “act”.

### 11.11 At-Risk Reason Taxonomy (Phase 2)

Structured `atRiskReasons: string[]` (e.g. “No executive sponsor”, “Competitor mentioned”, “Silence”) in risk docs; map to mitigation playbooks. Enables “Top at-risk reasons” analytics and better recommendations.

### 11.12 Peer Deal Comparison (Phase 2)

`GET /api/v1/opportunities/:id/similar-won-deals` or extend benchmark-comparison: similar by stage, industry, size; return win rate, median cycle time. “Deals like this win 67% of the time.”

---

## Resolved (was Open Points)

All previously open points are decided in [BI_SALES_RISK_FINAL_ANSWERS.md](./BI_SALES_RISK_FINAL_ANSWERS.md) and [BI_SALES_RISK_FOLLOW_UP_ANSWERS.md](./BI_SALES_RISK_FOLLOW_UP_ANSWERS.md):

- **Opportunity/account schema:** Salesforce defaults + added fields (FINAL_ANSWERS §1). Full shard spec: [BI_SALES_RISK_SHARD_SCHEMAS.md](./BI_SALES_RISK_SHARD_SCHEMAS.md).
- **Industry:** Add to opportunity/account; hierarchy opp → account → tenant → "general".
- **Graph:** Contact roles and contact–contact **before** Phase 1; document in BI_SALES_RISK_SHARD_SCHEMAS.md.
- **Leading indicators:** Phase 1: days since activity, activity count, stage stagnation, stakeholder count; **create** if missing.
- **Data Lake / Data Collector:** Data Collector = module in **logging**; Parquet; `/risk_evaluations/year=.../month=.../day=.../`; backfill via `workflow.job.trigger`.
- **UI and tenant:** Extend `containers/ui`; **`tenantId` only** (no `organizationId`).
- **Portfolio and activity:** Tenant-level first; activity = shards via `getRelatedShards`.
- **Audit:** Logging exists; add Data Collector (in logging) + Usage Tracking (analytics-service). All via **RabbitMQ**.
