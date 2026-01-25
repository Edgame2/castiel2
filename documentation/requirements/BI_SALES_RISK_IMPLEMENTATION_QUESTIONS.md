# BI Sales Risk Analysis – Implementation Questions

**Purpose:** Clarifications needed before implementation, based on:
- Current containers (`containers/`)
- [BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md](./BI_SALES_RISK_ANALYSIS_COMPREHENSIVE_PLAN.md)
- [user requirement.md](./user%20requirement.md) (currently empty)

---

## 1. User Requirement & Scope

1.1. **user requirement.md is empty.** What should it contain? (e.g. must-haves, out-of-scope, target customers, constraints, non-functionals?)

1.2. **Scope for this implementation:** Implement full 12‑month plan, or a defined subset? If subset, which phases / workstreams are in scope?

1.3. **Must-have vs nice-to-have:** Which enhancements are P0 (blocking) vs P1/P2? Plan has 10 enhancement areas and 5 phases.

1.4. **First release:** What is the minimum set of capabilities for a first usable release (MVP)?

1.5. **Out of scope:** Anything in the plan that is explicitly out of scope for this implementation?

---

## 2. Infrastructure & Azure ML

2.1. **Azure ML:** Do we have (or will we provision) Azure ML Workspace, Compute Clusters, and Managed Endpoints? Plan assumes `eastus`, `castiel-ml-prod-rg`. Confirm resource group, region, subscription.
yes that is correct, will need to be implemented

2.2. **ML Service today:** `ml-service` uses placeholder predictions and has no Azure ML client code. Should we:
   - (a) Implement full Azure ML integration (Workspace + Managed Endpoints),
Yes option A

2.3. **Azure ML SDK / runtime:** Prefer `@azure/ml-inference`, REST to Managed Endpoints, or Python sidecar/API that `ml-service` calls? Containers are Node/TypeScript.

2.4. **GPU:** Plan mentions GPU for Phase 3 deep learning. Is GPU compute required for any Phase 1–2 work, or only later?

2.5. **Model hosting:** All models on Azure ML Managed Endpoints, or also support ONNX in Node/Redis for latency‑sensitive paths?

---

## 3. Data & Integrations

3.1. **Training data volume:** Per tenant/industry, what is the expected minimum history (opportunities, risk evaluations, outcomes)? Plan uses 3000+ for industry models, 5000 for “data efficiency.” Do we have or expect this?
Expected
3.2. **Synthetic data:** Plan recommends synthetic data for initial training. Is synthetic data generation in scope? If yes, which entities (opportunities, risks, outcomes) and rules?

3.3. **Shard-manager schema:** Do `shard_manager` and related services already expose: industry, deal stage, close date, amount, stakeholder/contact links, activity counts, and risk snapshots in a form we can use for ML? Any schema changes needed?

3.4. **Risk snapshots:** Plan needs historical risk scores (7/14/30‑day windows) for early warning. Is there (or will we add) a `risk_snapshots` or equivalent time‑series store? If not, do we derive from `risk_evaluations`?
Can leverage data collection to get historical data

3.5. **External data (Phase 1.5):** News sentiment, market data, economic indicators. Which providers are approved/preferred (NewsAPI, Alpha Vantage, others)? Budget and rate limits? NewsAPI, Alpha Vantage. 
More can be added by super admin using integration manager service

3.6. **External data storage:** Where do we store ingested news/market data: new Cosmos containers, Blob/Data Lake, or other? Plan mentions Data Lake for “Data Collector.” 
The data must be stored as a shard using the news shard type.

3.7. **Credit/company health:** Plan mentions “credit risk databases” and “company health scores.” Are specific vendors or APIs in scope? If not, is this deferred?
Plan it the vendor will be selected later, integration with vendor will need to be manage using the integration manager. 

---

## 4. Enhancement Area 1: Advanced Risk Analysis

### 4.1 Early Warning (30‑60–90 Day)

4.1.1. **LSTM vs current EarlyWarningService:** `risk-analytics` `EarlyWarningService` is rule‑based (stage stagnation, activity drop, stakeholder churn, risk acceleration). Should we:
   - (a) Replace with LSTM 30/60/90‑day risk forecasts as in the plan,
   - (b) Keep rules and add LSTM as an extra signal,
   - (c) Implement LSTM first and keep rules as fallback when LSTM has low confidence?

4.1.2. **LSTM runtime:** LSTM in plan is Python/TensorFlow. Run where: Azure ML real‑time endpoint, batch Azure ML job, or separate Python service? Who calls it (risk-analytics, ml-service)?

4.1.3. **Leading indicators:** Plan adds engagement (email response rate, meeting cancellations, ghosting), activity (days since activity, diversity), sentiment. Do we have the raw data (email, calendar, etc.) in shards or integrations? Which leading indicators are feasible with current data?

4.1.4. **Risk velocity:** Plan uses “risk score acceleration” (2nd derivative). We have `checkRiskAcceleration` in `EarlyWarningService`. Extend in place or move to a dedicated “RiskVelocityService” used by both rules and LSTM?

### 4.2 Risk Clustering

4.2.1. **Ownership:** New `risk-analytics` services (e.g. `RiskClusteringService`) or new container (e.g. `risk-clustering`)? Plan shows `RiskClusteringService` interface.

4.2.2. **Algorithms:** Plan: DBSCAN, K‑Means, Apriori for association rules. Run in Node (e.g. `ml.js`), or delegate to Python/Azure ML? Preferred library if in Node?

4.2.3. **Schedule:** Clustering batch (daily/weekly) or on‑demand? If batch, which job/orchestrator (e.g. `workflow-orchestrator`, cron, Azure Functions)?

### 4.3 Risk Propagation

4.3.1. **Graph data:** Plan assumes graph of opportunities, accounts, contacts, teams. Is this available from `shard_manager` relationships, or do we need new collections/APIs?

4.3.2. **Propagation algorithm:** Plan suggests PageRank‑style and SIR‑like. Implement in Node (e.g. `graphology`) or Python (NetworkX) as a job/API?

4.3.3. **Account health:** “Account health score” rollup: new `risk-analytics` API and Cosmos documents, or extend `RevenueAtRiskService` / analytics? Partition key: `tenantId` plus `accountId`?

### 4.4 Industry‑Specific Risk Models

4.4.1. **Industry source:** Where does “industry” come from: account, opportunity, or org setting? Field names and shard types?

4.4.2. **Industry list:** Plan lists 16 industries. Use this exact set or a configurable list per tenant? Do we need an `industries` catalog (e.g. in `configuration-service` or `risk-catalog`)?

4.4.3. **Model routing:** “Global vs industry vs hybrid” and >3000 examples threshold: implement in `ml-service` (model selection) or `risk-analytics` (orchestration)?

4.4.4. **Shadow evaluation:** Run global and industry model in parallel and log only, or also surface both to UI for a transition period?

---

## 5. Enhancement Area 2: Predictive Pipeline Analytics

### 5.1 Win Probability

5.1.1. **Placeholder in ml-service:** `PredictionService` uses `generatePlaceholderPrediction`. Should win‑probability be the first “real” model on Azure ML, or do we also need a rule‑based fallback?

5.1.2. **Calibration:** Plan: Platt scaling, isotonic regression, beta. Where: in Azure ML training pipeline, or in `ml-service`/`risk-analytics` as post‑processing?

5.1.3. **API:** New `ml-service` endpoint (e.g. `POST /predict/win-probability`) or `risk-analytics` that calls ml-service? Plan shows `WinProbabilityService` with `predictWinProbability(opportunityId)`.

### 5.2 Revenue Forecasting with ML

5.2.1. **Forecasting today:** `forecasting` uses decomposition, consensus, commitment, and `ml_service` (which is placeholder). Replace ml part with XGBoost/Prophet/quantile models on Azure ML, or add as additional “ML forecast” alongside existing?

5.2.2. **Prophet:** Plan uses Prophet for time‑series. Run via Azure ML (Python) or separate Python service? License (Prophet is BSD) acceptable?

5.2.3. **Scenarios (P10/P50/P90):** New `ForecastingService` methods and types, or new “ScenarioForecastingService”? Expose in existing `forecasting` routes?

5.2.4. **Risk‑adjusted forecast:** Plan: `risk_adjusted_forecast = base_forecast * (1 - mean(risk_scores))`. Use `risk-analytics` / `RevenueAtRiskService` for risk, or does forecasting need its own risk client? How often to refresh risk (per request, or cached)?

---

## 6. Enhancement Area 3: Competitive Intelligence

6.1. **Net new vs extend:** New container `competitive-intelligence` vs extending `analytics-service` or `risk-analytics`? Plan has `CompetitorTracking`, `GET /opportunities/{id}/competitors`, `POST /competitors/{id}/track`, win/loss by competitor.

6.2. **Competitor master data:** Where are competitors defined: `risk-catalog`, `configuration-service`, or dedicated `competitors` collection? Who can create/edit (admin, sales, both)?

6.3. **Detection:** Plan: NER + entity resolution for competitor mentions. Use `ai-service` (LLM) on emails/calls/Shards, or separate NER model? Which shard types (email, meeting, Gong, etc.) are in scope?

6.4. **Win/loss:** Is win/loss (won/lost + competitor) already in pipeline/opportunity data? If not, how do we collect it (manual, integration, LLM from notes)?

---

## 7. Enhancement Area 4: External Data, Anomaly, Sentiment, Network

### 7.1 External Data

7.1.1. **News/market ingestion:** New container (e.g. `external-data`) or jobs inside `integration-sync` / `data-enrichment`? Event contract for “new external data available”?

### 7.2 Anomaly Detection

7.2.1. **Placement:** Plan: Isolation Forest, Autoencoder, Z‑score/IQR. New `anomaly-detection` container or part of `ml-service` / `risk-analytics`?

7.2.2. **Inputs:** Per opportunity, per account, or both? Which metrics (risk score, activity, amount, stage duration, etc.)?

7.2.3. **Output:** New `anomaly_alerts` collection and event `risk.anomaly.detected`? Who consumes (risk-analytics, notifications, dashboard)?

### 7.3 Sentiment Analysis

7.3.1. **Ownership:** New `sentiment-analysis` service or part of `ai-conversation` / `ai-insights` / `data-enrichment`? Plan has `SentimentAnalysis` and `GET /opportunities/{id}/sentiment-trends`.

7.3.2. **Model:** Plan: fine‑tuned BERT. Use Azure ML custom model, or off‑the‑shelf (e.g. Azure AI Language) first?

7.3.3. **Input shards:** Which shard types: email, Slack, Gong transcripts, Zoom summaries? Stored where after analysis (new `sentiment_analyses` collection or embedded in shard)?

### 7.4 Network Analysis

7.4.1. **Ownership:** New service for “stakeholder graph” and influence (PageRank, centrality), or extend `context-service` / `risk-analytics`?

7.4.2. **Graph build:** From `shard_manager` relationships only, or also from email/calendar (who interacts with whom)? If the latter, which integrations are in scope?

7.4.3. **Storage:** Plan’s `StakeholderGraph`: one document per opportunity or a centralized graph DB? If Cosmos, partition by `tenantId` + `opportunityId`?

---

## 8. Enhancement Area 5: Prescriptive Analytics & Remediation

8.1. **Mitigation ranking:** Plan: XGBoost ranking for action effectiveness. Implement in `ml-service` or `recommendations`? `recommendations` is currently a stub; (re)build it for this?

8.2. **Recommendation source:** Actions from `risk-catalog` mitigations, from a new “remediation actions” catalog, or both?

8.3. **Workflow engine:** Plan: “guided remediation workflow engine” and `RemediationWorkflow`. Reuse `workflow-orchestrator` or new lightweight engine in `risk-analytics`/`recommendations`?

8.4. **Steps and state:** `completedSteps`, `totalSteps`, `status`. Persist in new `remediation_workflows` collection; events for `remediation.step.completed`, `remediation.workflow.completed`?

8.5. **UI:** Plan mentions “Remediation UI.” Is there an existing UI module to extend, or net‑new in `ui`? Which roles can start/complete steps (e.g. opportunity owner, manager)?

---

## 9. Enhancement Area 6: Executive Intelligence & Benchmarking

9.1. **C‑suite and manager dashboards:** New views in `dashboard` + `dashboard-analytics`, or separate “executive” app? Same `dashboard` CRUD and widget model?

9.2. **Drill‑down:** “Portfolio → account → opportunity → activity.” Is “portfolio” = tenant, or a user‑defined grouping? Data for “activity” from shard-manager; any new APIs?

9.3. **Industry benchmarking:** Plan: `IndustryBenchmark`, percentiles (p10–p90). Benchmark data: from our tenants only (aggregated, anonymized) or from external providers? If internal only, do we have enough per industry?

9.4. **Benchmark freshness:** Precomputed (nightly) or on‑demand? If on‑demand, latency budget?

---

## 10. Enhancement Area 7: Deep Learning, RL, Causal Inference (Phase 3)

10.1. **Phasing:** Are Phase 3 items (DNN, LSTM for sequences, RL, DoWhy‑style causal) in scope for this implementation, or explicitly later?

10.2. **RL (DQN):** Plan: MDP for sales process, DQN, simulation. Is the “sales process” MDP defined (states, actions, rewards, transitions)? Who defines it (product, data science)?

10.3. **Causal / DoWhy:** Run in Azure ML (Python) or separate Python service? Who calls: `reasoning-engine`, `risk-analytics`, or `recommendations`?

---

## 11. Enhancement Area 8: Compliance, Governance, Audit

11.1. **Three‑tier audit:** Plan: (1) Logging – audit log, (2) Data Collector – analytics, (3) Usage – billing. Do we have dedicated “Data Collector” and “Usage Tracking” services, or are they inside `logging` / `analytics-service`? Any new services to add?

11.2. **Audit scope for ML:** “All risk assessments, predictions, model inference.” Do we log at `risk-analytics`/`ml-service` and forward to `logging`, or does `logging` subscribe to ML/risk events? Schema for ML audit records?

11.3. **Tamper‑proof log:** Plan: append‑only (e.g. immutable Blob). Is this a new `logging` backend or separate “audit store”?

11.4. **Human‑in‑the‑loop:** High‑stakes (e.g. risk &gt; 0.8, deal &gt; $1M). Are thresholds configurable per tenant? Approval: new `approval-service` or inside `workflow-orchestrator`? Who is the default approver (manager, risk team, configurable)?

11.5. **Model governance:** “Model card,” validation, bias monitoring. Stored where (Cosmos `model_cards`, `ml_service`)? Who does “independent validation” (team, tool, both)?

---

## 12. Containers: New vs Extend

12.1. **New containers:** Plan implies many new capabilities. Preferred approach:  
   - (a) Prefer extending existing (`risk-analytics`, `ml-service`, `forecasting`, `analytics-service`, `recommendations`),  
   - (b) Prefer new containers per capability (e.g. `early-warning`, `competitive-intelligence`, `sentiment-analysis`, `anomaly-detection`),  
   - (c) Hybrid (specify per capability)?

12.2. **risk-analytics growth:** It already has many services. Accept more (EarlyWarning LSTM, clustering, propagation, industry routing, win‑probability orchestration) or split e.g. `risk-analytics` (core evaluation + revenue) and `risk-intelligence` (EW, clustering, propagation)?

12.3. **recommendations:** Rebuild as full service (mitigation ranking, remediation workflows, prescriptive) or keep minimal and put prescriptive in `risk-analytics`?

---

## 13. APIs & Events

13.1. **API versioning:** New endpoints under `/api/v1` in existing OpenAPI, or new `/api/v2` (or `/api/risk-intelligence/v1`) for BI plan?

13.2. **Event naming:** Plan and existing use `risk.*`, `forecast.*`, etc. New events: `risk.prediction.generated`, `risk.cluster.updated`, `competitor.detected`, `sentiment.analyzed`, `remediation.workflow.completed`, `anomaly.detected`. Reuse `coder_events` exchange and existing conventions?

13.3. **Event payloads:** For `risk.prediction.generated`, include full `RiskPrediction` or reference + link to storage? Same for large payloads (e.g. `StakeholderGraph`, `IndustryBenchmark`).

---

## 14. Configuration & Feature Flags

14.1. **Feature flags:** Per‑tenant toggles for: early‑warning LSTM, industry models, competitive intelligence, sentiment, anomaly, prescriptive workflows, executive dashboards, HITL. Where: `configuration-service`, `risk-analytics` config, or both?

14.2. **ML config:** Azure ML endpoint URLs, model IDs, and (if we support fallbacks) “use placeholder” flags. In `ml-service` `config/default.yaml` + env, or in `configuration-service` for tenant‑specific overrides?

14.3. **Thresholds:** Early‑warning (e.g. 7/14/21 days inactivity), risk velocity (&gt;0.15 in 7 days), HITL (risk &gt; 0.8, deal &gt; $1M). Global defaults only or overridable per tenant/industry?

---

## 15. Multi‑Tenancy & Industries

15.1. **Tenant isolation:** All new Cosmos containers/collections use `tenantId` in partition key? Any cross‑tenant aggregations for benchmarks (anonymized)?

15.2. **Industry as first‑class:** Is “industry” always required for risk/forecast, or optional? If missing, assume “global” model only?

15.3. **Onboarding:** For new tenants with little history, do we disable industry models and LSTM until a minimum sample size, or run with lower confidence and heavy fallback to global/rules?

---

## 16. UI & Dashboards

16.1. **Dashboard widgets:** New widget types for: early‑warning chart, risk trajectory, cluster visualization, propagation graph, portfolio heatmap, win‑probability trend, competitor win/loss, sentiment trend, remediation checklist, benchmark comparison. All in `dashboard` + `dashboard-analytics`, or some in a separate “BI” app?

16.2. **Drill‑down UX:** Plan: portfolio → account → opportunity → activity. Is “activity” a list of shards (emails, meetings, etc.)? Do we need new `dashboard-analytics` aggregates or new APIs for “activity list”?

16.3. **Real‑time:** Plan: “real‑time data updates.” Prefer WebSocket/SSE from api-gateway or dashboard, or short polling? Which data must be real‑time (e.g. risk score, early‑warning alerts)?

---

## 17. Success Metrics, KPIs & Monitoring

17.1. **Plan KPIs:** e.g. early‑warning accuracy &gt;75% (30d), Brier &lt;0.15, MAPE &lt;15%, etc. Do we need to implement tracking and dashboards for these in this project, or is that a separate “ML ops” effort?

17.2. **Where to store:** Model metrics (accuracy, Brier, MAPE, calibration error): Cosmos (e.g. `ml_evaluations`), Application Insights, or both? Who computes: batch job post‑training, or `ml-service`/`forecasting` at inference?

17.3. **Alerts:** Who receives alerts when e.g. Brier &gt; 0.2 or MAPE &gt; 20%: on‑call, ML team, tenant admin? Via `notification-manager`?

---

## 18. Dependencies & Ordering

18.1. **Blockers:** Is Azure ML (Workspace + Endpoints) a hard dependency before any “real” ML work, or can we build pipelines and integrate later?

18.2. **Data dependencies:** Can we implement early‑warning LSTM and risk clustering with only `risk_evaluations` and opportunity/account data, or do we need risk snapshots and sentiment first?

18.3. **recommendations:** Should `recommendations` be implemented (or stubbed) before prescriptive workflows and mitigation ranking, or can those live in `risk-analytics` initially?

---

## 19. Technology & Implementation Choices

19.1. **Python for ML:** Heavy ML (LSTM, Prophet, XGBoost, clustering, DoWhy) is Python. Prefer:  
   - (a) Python service(s) called by Node containers,  
   - (b) Azure ML only (train + real‑time/batch), Node just calls endpoints,  
   - (c) Mix (e.g. real‑time via Azure ML, batch via Python jobs)?

19.2. **Node ML libs:** For lighter work (e.g. simple anomaly Z‑score, small graph), is `ml.js` or similar acceptable, or should we keep all ML in Python/Azure ML?

19.3. **Prophet:** Prophet has GPL dependencies in some builds. Is a Prophet‑based forecast acceptable from a licensing and deployment standpoint?

---

## 20. Security, Performance & Cost

20.1. **Secrets:** Azure ML keys, external API keys (News, market data). Stored in `secret-management` only? Any need for per‑tenant Azure ML or external API credentials?

20.2. **Inference latency:** Plan: &lt;500 ms p95 for ML. For LSTM/Transformer, is Azure ML real‑time endpoint sufficient, or do we need model optimization (e.g. ONNX, quantization) in scope?

20.3. **Cost controls:** Plan has monthly budgets for Azure ML, endpoints, etc. Do we need per‑tenant or global caps, or is that operational only?

---

## 21. Documentation & Deliverables

21.1. **OpenAPI:** Every new/updated service: update `openapi.yaml` and `README` per ModuleImplementationGuide? Any extra “BI” or “ML” docs?

21.2. **Runbooks:** Who produces runbooks for: model retraining, endpoint failover, clustering/benchmark batch jobs, HITL approval flows?

21.3. **user requirement.md:** After answers, should we backfill `user requirement.md` with a short summary of in‑scope items and open decisions?

---

## 22. Miscellaneous

22.1. **Logging/telemetry:** All new services integrate with existing `logging` and Application Insights as per .cursorrules? Any new log/span schemas for ML (e.g. `modelId`, `inferenceMs`)?

22.2. **Tests:** Plan and .cursorrules: 80% coverage, Vitest. For ML paths: mostly integration tests against mocked Azure ML / Python, or also “contract” tests against real Azure ML in CI?

22.3. **i18n:** Are executive/manager dashboards and new UIs required to support multiple languages from day one, or English‑first?

22.4. **Access control:** New endpoints: reuse existing RBAC (e.g. `user-management`) and `X-Tenant-ID` from api-gateway? Any new roles (e.g. “Risk Analyst,” “Approver”)?

---

**Next step:** Once these are answered, we can produce an implementation plan (phases, tasks, file/container changes) and then implement.
