# BI Sales Risk Analysis – Additional Questions

**Purpose:** Questions that remain **unanswered** or **need your explicit decision** after reviewing [BI_SALES_RISK_IMPLEMENTATION_ANSWERS.md](./BI_SALES_RISK_IMPLEMENTATION_ANSWERS.md).

**Status legend:**
- ⚠️ **NEEDS INPUT** – Answer document requests your decision
- ❓ **NOT ADDRESSED** – No answer in the ANSWERS document
- 📋 **RECOMMENDATION ONLY** – Answer gives a recommendation; your approval needed

---

## 1. User Requirement & Scope

### 1.1 user requirement.md structure ⚠️ NEEDS INPUT
**From ANSWERS:** A suggested structure (P0/P1/P2, target customers, constraints, non-functionals) was proposed.

**Question:** Do you agree with that structure? Any additions or changes (e.g. different P0/P1/P2, other constraints, different target customers)?

---

### 1.2 Implementation scope ⚠️ NEEDS INPUT
**From ANSWERS:** Options A (full 12‑month), B (Phase 1 only), C (Phases 1–2) were given; Option A was recommended.

**Question:** Which option do you want: **A**, **B**, or **C**? If a custom subset, which phases/workstreams are in scope?

---

### 1.4 MVP / first release 📋 RECOMMENDATION ONLY
**From ANSWERS:** A 3–4 month MVP was proposed (Azure ML, industry models, win probability, early warning, basic competitive intelligence, manager dashboard).

**Question:** Does this MVP scope work as the first release, or should we add/remove items?

---

### 1.5 Out of scope ⚠️ NEEDS INPUT
**From ANSWERS:** A list of suggested out‑of‑scope items was given (real‑time streaming, mobile‑first, scheduled PDF/PPT, i18n initially, credit DBs, LLM fine‑tuning).

**Question:** Anything else explicitly **out of scope**? Any of the suggested items you want **in** scope?
Mobile first not needed

---

## 2. Infrastructure & Azure ML

### 2.3 Azure ML SDK / runtime 📋 RECOMMENDATION ONLY
**From ANSWERS:** REST to Managed Endpoints was recommended (no Python sidecar, no `@azure/ml-inference`).

**Question:** Confirm **REST to Managed Endpoints**, or do you prefer `@azure/ml-inference` or a Python sidecar?

---

### 2.4 GPU 📋 RECOMMENDATION ONLY
**From ANSWERS:** No GPU for Phase 1–2; GPU only for Phase 3.

**Question:** Confirm **no GPU** for Phase 1–2?

---

### 2.5 Model hosting 📋 RECOMMENDATION ONLY
**From ANSWERS:** Azure ML Managed Endpoints as primary; ONNX + Redis only in Phase 4 if needed.

**Question:** Confirm **Azure ML only** for Phase 1–3, with ONNX as a later optimization?
Yes priority to Azure ML
---

## 3. Data & Integrations

### 3.2 Synthetic data 📋 RECOMMENDATION ONLY
**From ANSWERS:** Synthetic data recommended (opportunities, risk evaluations, outcomes, activities) with SMOTE and domain rules.

**Question:** Confirm synthetic data is **in scope**? Any entities or rules to **exclude** or **add**?

---

### 3.3 Shard-manager / opportunity schema ⚠️ NEEDS INPUT
**From ANSWERS:** The required fields and a sample `OpportunityShard` shape were listed; the current schema was not known.

**Question:** Please provide the **current opportunity shard schema** (and account if relevant), especially:
- `structuredData` (or equivalent) field names for: `amount`, `stage`, `closeDate`, `probability`, `status`, `industryId`/`industry`, `accountId`, `ownerId`, `competitorIds`, `createdDate`, `lastActivityDate`.
- Any schema changes you are willing to make for ML.

---

### 3.4 Risk snapshots – implementation choice ❓ NOT ADDRESSED
**From ANSWERS:** Use “data collector” for historical data; a **materialized `risk_snapshots`** approach was recommended for performance.

**Question:** Confirm we should add a **`risk_snapshots` Cosmos container** (updated on each evaluation, partition `tenantId`), and that “leverage data collector” means either:
- (a) we **also** feed/backfill from data collector into `risk_snapshots`, or  
- (b) we use data collector only where `risk_snapshots` does not exist (e.g. backfill)?
Data collector must store the data in Azure Storage data lake, i want to leverage that data for risk snapshot.
---

## 4. Enhancement Area 1: Advanced Risk Analysis

### 4.1.1 LSTM vs EarlyWarningService 📋 RECOMMENDATION ONLY
**From ANSWERS:** Option C: LSTM first, keep rules as fallback when LSTM has low confidence.

**Question:** Confirm **Option C** (LSTM first, rules as fallback)?

---

### 4.1.2 LSTM runtime 📋 RECOMMENDATION ONLY
**From ANSWERS:** Azure ML real‑time endpoint; `risk-analytics` calls it via `ml-service`/AzureMLClient.

**Question:** Confirm **Azure ML real‑time endpoint** called by `risk-analytics` (or via `ml-service`)?

---

### 4.1.3 Leading indicators ⚠️ NEEDS INPUT
**From ANSWERS:** A list of indicators and required data (email, calendar, activities, sentiment, etc.) was given.

**Question:** Which of these **data sources are available today** in shards or integrations?
- Email (response rates, timestamps)
- Calendar (meeting cancellations)
- Stakeholder “ghosting” (Slack, email, Gong, Zoom)
- Days since last activity / `lastActivityDate`
- Activity type diversity
- Executive sponsor engagement
- Sentiment (Phase 2)

**Or:** Should we **start only with the indicators we can support** with existing data and add others in phases?

---

### 4.1.4 Risk velocity 📋 RECOMMENDATION ONLY
**From ANSWERS:** Extend `EarlyWarningService` in place (no separate `RiskVelocityService`).

**Question:** Confirm **extend `EarlyWarningService` in place**?

---

### 4.2.1 Risk clustering ownership 📋 RECOMMENDATION ONLY
**From ANSWERS:** New `RiskClusteringService` inside `risk-analytics` (no new container).

**Question:** Confirm **`RiskClusteringService` in `risk-analytics`**?

---

### 4.2.2 Clustering algorithms 📋 RECOMMENDATION ONLY
**From ANSWERS:** Delegate DBSCAN/K‑Means/Apriori to **Python/Azure ML** (batch).

**Question:** Confirm **Azure ML batch** for clustering (no Node `ml.js` for production)?

---

### 4.2.3 Clustering schedule 📋 RECOMMENDATION ONLY
**From ANSWERS:** Daily batch at 2 AM via `workflow-orchestrator`, with on‑demand option.

**Question:** Confirm **daily batch** via `workflow-orchestrator` and **on‑demand** trigger API?

---

### 4.3.1 Graph data ⚠️ NEEDS INPUT
**From ANSWERS:** Required graph (opportunity–account–contacts–activities, contact roles, etc.) and example queries were described; current support was unknown.

**Question:** Can `shard_manager` (or related services) currently provide:
- Opportunity → Account
- Opportunity → Contacts (and roles: decision maker, influencer, etc.)
- Opportunity → Activities
- Contact → Contact (e.g. reporting)
- “All opportunities for an account”
- “All contacts for an opportunity”

If not, are you willing to **add** the missing relationships/schemas, or should we **limit** propagation to what exists today?

---

### 4.3.2 Propagation algorithm 📋 RECOMMENDATION ONLY
**From ANSWERS:** Python (NetworkX) via **Azure ML batch job** (not a separate Python service).

**Question:** Confirm **Azure ML batch job** for risk propagation (no extra Python microservice)?

---

### 4.3.3 Account health 📋 RECOMMENDATION ONLY
**From ANSWERS:** New `AccountHealthService` and Cosmos container `account_health` in `risk-analytics` (not inside `RevenueAtRiskService`).

**Question:** Confirm **new `AccountHealthService` + `account_health` container** in `risk-analytics`?

---

### 4.4.1 Industry source ⚠️ NEEDS INPUT
**From ANSWERS:** A hierarchy was proposed: opportunity.industryId → account.industryId → tenant.defaultIndustryId → `"general"`.

**Question:** Where does **industry** come from in your system today?
- Account-level field name (e.g. `account.industryId`)?
- Opportunity-level (e.g. `opportunity.industryId`)?
- Org/tenant default?
- Exact field names and shard types.

---

### 4.4.2 Industry list 📋 RECOMMENDATION ONLY
**From ANSWERS:** Use the plan’s 16 industries as a global catalog in `configuration-service`, with tenant enable/disable and optional custom industries.

**Question:** Confirm **global catalog + tenant customization** as proposed?

---

### 4.4.3 Model routing 📋 RECOMMENDATION ONLY
**From ANSWERS:** Model selection (global vs industry, >3000 threshold) in **`ml-service`**.

**Question:** Confirm **`ml-service`** owns model routing (risk-analytics only orchestrates)?

---

### 4.4.4 Shadow evaluation 📋 RECOMMENDATION ONLY
**From ANSWERS:** Run global + industry in parallel, **log only** (no UI for both); promote industry when criteria are met.

**Question:** Confirm **log-only shadow evaluation** (no dual model in UI)?

---

## 5. Enhancement Area 2: Predictive Pipeline Analytics

### 5.1 Win probability ❓ NOT ADDRESSED
- **5.1.1** First “real” model vs rule‑based fallback?
- **5.1.2** Calibration: in Azure ML training vs `ml-service`/`risk-analytics` post‑processing?
- **5.1.3** API: `ml-service` (`POST /predict/win-probability`) vs `risk-analytics` that calls ml-service?

---

### 5.2 Revenue forecasting with ML ❓ NOT ADDRESSED
- **5.2.1** Replace existing ML placeholder with XGBoost/Prophet/quantile, or add as an **additional** “ML forecast”?
- **5.2.2** Prophet: via Azure ML (Python) or a separate Python service? Is Prophet’s license (BSD, with GPL deps in some builds) acceptable?
- **5.2.3** P10/P50/P90: new methods in `ForecastingService` vs new `ScenarioForecastingService`? Expose in existing `forecasting` routes?
- **5.2.4** Risk‑adjusted forecast: use `risk-analytics`/`RevenueAtRiskService`; refresh per request or cached? TTL?

---

## 6. Enhancement Area 3: Competitive Intelligence

**All ❓ NOT ADDRESSED:**
- **6.1** New container `competitive-intelligence` vs extend `analytics-service` or `risk-analytics`?
- **6.2** Competitor master data: `risk-catalog`, `configuration-service`, or dedicated `competitors` collection? Who can create/edit (admin, sales, both)?
- **6.3** Detection: `ai-service` (LLM) vs dedicated NER? Which shard types (email, meeting, Gong, etc.) in scope?
- **6.4** Win/loss: already in pipeline/opportunity data? If not: manual, integration, or LLM from notes?

---

## 7. Enhancement Area 4: External Data, Anomaly, Sentiment, Network

**All ❓ NOT ADDRESSED:**
- **7.1.1** News/market ingestion: new `external-data` container vs jobs in `integration-sync` / `data-enrichment`? Event for “new external data available”?
- **7.2.1** Anomaly: new container vs `ml-service` / `risk-analytics`?
- **7.2.2** Anomaly inputs: per opportunity, per account, or both? Which metrics (risk score, activity, amount, stage duration, etc.)?
- **7.2.3** Anomaly output: `anomaly_alerts` collection and `risk.anomaly.detected`? Who consumes (risk-analytics, notifications, dashboard)?
- **7.3.1** Sentiment: new service vs `ai-conversation` / `ai-insights` / `data-enrichment`?
- **7.3.2** Sentiment model: Azure ML custom vs Azure AI Language (or similar) first?
- **7.3.3** Input shards (email, Slack, Gong, Zoom, etc.) and where to store results (new collection vs shard)?
- **7.4.1** Network: new service vs `context-service` / `risk-analytics`?
- **7.4.2** Graph: only `shard_manager` relationships vs email/calendar “who interacts with whom”? Which integrations?
- **7.4.3** `StakeholderGraph` storage: one doc per opportunity in Cosmos (partition `tenantId` + `opportunityId`) vs centralized graph DB?

---

## 8. Enhancement Area 5: Prescriptive Analytics & Remediation

**All ❓ NOT ADDRESSED:**
- **8.1** Mitigation ranking: in `ml-service` or `recommendations`? Rebuild `recommendations` for this?
- **8.2** Recommendation source: `risk-catalog` mitigations only, new “remediation actions” catalog, or both?
- **8.3** Workflow: reuse `workflow-orchestrator` vs new engine in `risk-analytics`/`recommendations`?
- **8.4** `remediation_workflows` collection and events `remediation.step.completed`, `remediation.workflow.completed`?
- **8.5** Remediation UI: extend existing UI or new? Roles that can start/complete (owner, manager, etc.)?

---

## 9. Enhancement Area 6: Executive Intelligence & Benchmarking

**All ❓ NOT ADDRESSED:**
- **9.1** C‑suite and manager dashboards: new views in `dashboard` + `dashboard-analytics` vs separate “executive” app? Same `dashboard` CRUD and widget model?
- **9.2** Drill‑down: is “portfolio” = tenant or user‑defined? Activity = shard list? New `dashboard-analytics` aggregates or new APIs?
- **9.3** Industry benchmarks: from our tenants (aggregated, anonymized) vs external? If internal only, is volume per industry acceptable?
- **9.4** Benchmark freshness: precomputed (e.g. nightly) vs on‑demand? If on‑demand, acceptable latency?

---

## 10. Enhancement Area 7: Deep Learning, RL, Causal (Phase 3)

**All ❓ NOT ADDRESSED:**
- **10.1** Phase 3 (DNN, LSTM sequences, RL, DoWhy‑style causal): in scope for this implementation or explicitly later?
- **10.2** RL (DQN): is the sales MDP (states, actions, rewards) defined? By whom (product, data science)?
- **10.3** Causal/DoWhy: Azure ML (Python) vs separate Python service? Caller: `reasoning-engine`, `risk-analytics`, or `recommendations`?

---

## 11. Enhancement Area 8: Compliance, Governance, Audit

**All ❓ NOT ADDRESSED:**
- **11.1** Three‑tier audit: do dedicated “Data Collector” and “Usage Tracking” services exist, or are they inside `logging` / `analytics-service`? New services?
- **11.2** ML audit: log at `risk-analytics`/`ml-service` and forward to `logging`, or `logging` subscribes to ML/risk events? Schema for ML audit records?
- **11.3** Tamper‑proof log: new `logging` backend (e.g. immutable Blob) vs separate “audit store”?
- **11.4** HITL: are risk/deal thresholds configurable per tenant? New `approval-service` vs `workflow-orchestrator`? Default approver (manager, risk team, configurable)?
- **11.5** Model governance: where to store model cards, validation, bias (Cosmos `model_cards`, `ml_service`)? Who does “independent validation” (team, tool, both)?

---

## 12. Containers: New vs Extend

**All ❓ NOT ADDRESSED:**
- **12.1** Prefer (a) extend existing, (b) new containers per capability, or (c) hybrid per capability?
- **12.2** `risk-analytics`: accept more services vs split into `risk-analytics` (core) and `risk-intelligence` (EW, clustering, propagation)?
- **12.3** `recommendations`: rebuild as full service (mitigation, remediation) vs keep minimal and put prescriptive in `risk-analytics`?

---

## 13. APIs & Events

**All ❓ NOT ADDRESSED:**
- **13.1** New endpoints: under existing `/api/v1` vs new `/api/v2` or `/api/risk-intelligence/v1`?
- **13.2** New events (`risk.prediction.generated`, `risk.cluster.updated`, `competitor.detected`, `sentiment.analyzed`, `remediation.workflow.completed`, `anomaly.detected`): keep `coder_events` and current conventions?
- **13.3** For `risk.prediction.generated` and similar: full payload in event vs reference + link to storage? Same for large (e.g. `StakeholderGraph`, `IndustryBenchmark`)?

---

## 14. Configuration & Feature Flags

**All ❓ NOT ADDRESSED:**
- **14.1** Feature flags (LSTM, industry models, competitive intel, sentiment, anomaly, prescriptive, executive dashboards, HITL): `configuration-service`, `risk-analytics` config, or both?
- **14.2** ML config (Azure ML endpoints, model IDs, “use placeholder”): `ml-service` `config/default.yaml` + env only, or `configuration-service` for tenant overrides?
- **14.3** Thresholds (early‑warning days, risk velocity, HITL): global only or overridable per tenant/industry?

---

## 15. Multi‑Tenancy & Industries

**All ❓ NOT ADDRESSED:**
- **15.1** All new Cosmos with `tenantId` in partition key? Cross‑tenant aggregations for benchmarks (anonymized)?
- **15.2** Industry: required for risk/forecast or optional (fallback to global)?
- **15.3** New tenants with little history: disable industry models and LSTM until minimum sample, or run with lower confidence and heavy fallback?

---

## 16. UI & Dashboards

**All ❓ NOT ADDRESSED:**
- **16.1** New widgets (early‑warning, risk trajectory, clusters, propagation, heatmap, win‑probability, competitor win/loss, sentiment, remediation, benchmarks): all in `dashboard` + `dashboard-analytics` vs some in a separate “BI” app?
- **16.2** Drill‑down “activity”: list of shards? New `dashboard-analytics` aggregates or new APIs?
- **16.3** Real‑time: WebSocket/SSE vs short polling? Which data must be real‑time (risk score, early‑warning alerts)?

---

## 17. Success Metrics, KPIs & Monitoring

**All ❓ NOT ADDRESSED:**
- **17.1** KPI tracking and dashboards (e.g. early‑warning accuracy >75%, Brier <0.15, MAPE <15%): in this project or a separate ML ops effort?
- **17.2** Where to store model metrics (Cosmos `ml_evaluations`, Application Insights, or both)? Who computes (batch post‑training vs at inference)?
- **17.3** Alerts when e.g. Brier >0.2 or MAPE >20%: who receives (on‑call, ML team, tenant admin)? Via `notification-manager`?

---

## 18. Dependencies & Ordering

**All ❓ NOT ADDRESSED:**
- **18.1** Is Azure ML (Workspace + Endpoints) a **hard** dependency before any real ML work, or can we build pipelines and integrate Azure ML later?
- **18.2** Can we do early‑warning LSTM and risk clustering with only `risk_evaluations` and opportunity/account data, or do we need `risk_snapshots` and sentiment first?
- **18.3** Should `recommendations` be implemented (or stubbed) before prescriptive workflows and mitigation ranking, or can those live in `risk-analytics` initially?

---

## 19. Technology & Implementation Choices

**All ❓ NOT ADDRESSED:**
- **19.1** Python for ML: (a) Python service(s) called by Node, (b) Azure ML only (Node calls endpoints), or (c) mix (e.g. real‑time Azure ML, batch Python)?
- **19.2** For lighter work (e.g. Z‑score anomaly, small graph): is `ml.js` (or similar) acceptable, or should all ML stay in Python/Azure ML?
- **19.3** Prophet: acceptable from a licensing and deployment standpoint (including any GPL deps)?

---

## 20. Security, Performance & Cost

**All ❓ NOT ADDRESSED:**
- **20.1** Secrets (Azure ML, News, Alpha Vantage, etc.): `secret-management` only? Per‑tenant Azure ML or external API credentials?
- **20.2** <500 ms p95 for LSTM/Transformer: is Azure ML real‑time endpoint enough, or do we need ONNX/quantization in scope?
- **20.3** Cost: per‑tenant or global caps, or operational-only?

---

## 21. Documentation & Deliverables

**All ❓ NOT ADDRESSED:**
- **21.1** Every new/updated service: update `openapi.yaml` and `README` per ModuleImplementationGuide? Extra “BI” or “ML” docs?
- **21.2** Runbooks: who produces runbooks for model retraining, endpoint failover, clustering/benchmark jobs, HITL flows?
- **21.3** After answers: backfill `user requirement.md` with a short in‑scope summary and open decisions?

---

## 22. Miscellaneous

**All ❓ NOT ADDRESSED:**
- **22.1** Logging/telemetry: all new services to `logging` and Application Insights? New fields for ML (e.g. `modelId`, `inferenceMs`)?
- **22.2** ML paths: mostly integration tests with mocked Azure ML, or also contract tests against real Azure ML in CI?
- **22.3** i18n: multi‑language from day one for new UIs, or English‑first?
- **22.4** New endpoints: reuse existing RBAC and `X-Tenant-ID`? New roles (e.g. “Risk Analyst,” “Approver”)?

---

## Priority for Implementation

**Highest (blocking for design/Phase 1):**
1. **1.2** – Scope (A/B/C or custom)
2. **3.3** – Opportunity (and account) schema
3. **4.4.1** – Industry source and field names
4. **4.3.1** – Graph/relationship availability
5. **4.1.3** – Leading indicator data availability

**High (needed for Phase 1–2):**
6. **2.3, 2.4, 2.5** – Azure ML runtime, GPU, model hosting
7. **3.4** – Risk snapshots: materialized vs data collector
8. **5.1, 5.2** – Win probability and revenue ML (APIs, calibration, Prophet, risk‑adjusted)
9. **12.1, 12.2, 12.3** – Containers: extend vs new, `risk-analytics` split, `recommendations`

**Medium (needed for Phases 2–3):**
10. **6.x, 7.x, 8.x, 9.x** – Competitive intelligence, anomaly, sentiment, network, prescriptive, executive, benchmarking
11. **11.x** – Audit, HITL, model governance
12. **13.x, 14.x, 15.x** – APIs, events, config, multi‑tenancy

**Lower (can follow standards or be decided later):**
13. **16.x, 17.x, 18.x, 19.x, 20.x, 21.x, 22.x** – UI, KPIs, ordering, tech choices, security, docs, misc.

---

**Next step:** Once the **Highest** and **High** items are decided, an implementation plan with concrete tasks and file changes can be produced. The **Medium** and **Lower** items can be refined in parallel or in later phases.
