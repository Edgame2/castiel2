---
name: Production-ready except Azure ML
overview: Complete all production-critical code and integration so the only remaining task is creating the Azure ML Workspace and managed endpoints; no code changes required after that.
todos:
  - id: adaptive-learning-weights-service
    content: Add AdaptiveWeightsService (or CAIS read service) with getWeights and getModelSelection using Cosmos adaptive_weights / adaptive_model_selections and defaults
    status: completed
  - id: adaptive-learning-routes
    content: Register GET /weights/:tenantId and GET /model-selection/:tenantId in adaptive-learning routes with auth and tenant validation
    status: completed
  - id: adaptive-learning-config-tests
    content: Add Cosmos container names to adaptive-learning config; add unit tests for weights/model-selection defaults
    status: completed
  - id: ml-service-cais-methods
    content: Add getLearnedWeights and getModelSelection in PredictionService; use getModelSelection in predictRiskScore and predictForecast
    status: completed
  - id: ml-service-cais-tests
    content: Unit test PredictionService CAIS calls and fallbacks with mocked adaptiveLearningClient
    status: completed
  - id: ml-service-generic-predict
    content: In predict(), route by model type to Azure ML when endpoint configured; use placeholder only when no endpoint
    status: completed
  - id: training-embedding-docs
    content: Add TrainingService comment (job records only; training in Azure ML); resolve Embedding templates in VERIFICATION_RESULTS
    status: completed
  - id: verification-readme
    content: Update VERIFICATION_RESULTS and ml-service README to state only Azure ML creation remains
    status: completed
  - id: recommendations-per-rec-prediction
    content: "Per-recommendation record-prediction (predictionId = rec.id) in RecommendationsService"
    status: completed
  - id: recommendations-record-outcome
    content: "record-outcome on feedback in recordFeedback() -> adaptive-learning POST record-outcome"
    status: completed
  - id: recommendations-feedback-tests
    content: Unit test recommendations record-outcome on feedback with mocked adaptiveLearningClient
    status: completed
  - id: gateway-recommendations-tenant-templates
    content: "API Gateway: add /api/v1/recommendations and /api/v1/admin/tenant-templates -> recommendations"
    status: completed
  - id: ui-recommendations-feedback
    content: "UI: Recommendations card on opportunity page (fetch recommendations, display, feedback buttons -> POST feedback)"
    status: completed
  - id: adaptive-learning-put-routes
    content: "Adaptive-learning: add PUT weights and PUT model-selection; gateway add /api/v1/adaptive-learning"
    status: completed
  - id: ui-admin-cais
    content: "Super Admin UI: CAIS page(s) to view and edit weights and model selection (per tenant, component/context)"
    status: completed
  - id: cais-tenant-config
    content: "Adaptive-learning: per-tenant config (outcomeSyncToCais, automaticLearningEnabled) GET/PUT and Super Admin UI toggles"
    status: completed
  - id: risk-outcome-record
    content: "Risk-analytics: on opportunity.outcome.recorded call record-outcome(evaluationId, won/lost) when tenant outcomeSyncToCais enabled"
    status: completed
  - id: cais-learning-job
    content: "Adaptive-learning: batch job to update weights/model selection from outcomes (tenants with automaticLearningEnabled)"
    status: completed
isProject: false
---

# Production-Ready Except Azure ML Creation

**Success criteria:** After this plan, the only remaining work is to create the Azure ML resource (Workspace + managed endpoints) and set environment variables; all application code is ready to call them.

---

## Current state

- **adaptive-learning:** Exposes `record-prediction` and `record-outcome` only. GET `/weights/:tenantId` and GET `/model-selection/:tenantId` are documented in [containers/adaptive-learning/README.md](containers/adaptive-learning/README.md) but **not implemented** in [containers/adaptive-learning/src/routes/index.ts](containers/adaptive-learning/src/routes/index.ts).
- **ml-service:** [containers/ml-service/src/services/PredictionService.ts](containers/ml-service/src/services/PredictionService.ts) already has `adaptiveLearningClient` and calls `record-prediction` after `predict()`; it does **not** call getLearnedWeights or getModelSelection. Specialized methods (`predictRiskScore`, `predictWinProbability`, etc.) already use [containers/ml-service/src/clients/AzureMLClient.ts](containers/ml-service/src/clients/AzureMLClient.ts) when endpoints are configured; generic `predict()` still uses `generatePlaceholderPrediction()`.
- **risk-analytics** and **forecasting** already call the above GET endpoints and expect them to exist ([containers/risk-analytics/src/services/RiskEvaluationService.ts](containers/risk-analytics/src/services/RiskEvaluationService.ts) lines 128–173).

---

## Deep dive research – confirmation and gaps

Research confirms the following. After this plan (including the additions below), ML, CAIS, Risk Analytics, Feedbacks, and Recommendations will be fully implemented except Azure ML resource creation.

| Area | Current state | Plan coverage | Gap / addition |
|------|----------------|---------------|----------------|
| **CAIS (adaptive-learning)** | Only `record-prediction` and `record-outcome` implemented; GET weights and GET model-selection **not** in routes. | Phase 1 adds GET weights and GET model-selection with backing service and defaults. | None. |
| **Risk analytics** | Full: getLearnedWeights, getModelSelection, ml-service call, record-prediction, adaptive.learning.outcome.recorded. Triggers on shard.updated / integration.opportunity.updated. | No code change. Depends on Phase 1 (GET APIs) so its existing calls succeed. | None. |
| **Forecasting** | Full: getLearnedWeights, getModelSelection, ml-service POST /forecast/predict and /forecast/period, record-prediction, adaptive.learning.outcome.recorded. | No code change. Depends on Phase 1 so GET calls succeed. | None. |
| **ML service** | Has adaptiveLearningClient, record-prediction after predict(), recordOutcome(). Missing getLearnedWeights, getModelSelection; generic predict() is placeholder. | Phase 2 adds getLearnedWeights/getModelSelection and uses them in predictRiskScore/predictForecast. Phase 3 routes generic predict() to Azure ML when endpoint exists. | None. |
| **Recommendations** | getLearnedWeights() is called but endpoint does not exist (404). record-prediction once per **batch** (predictionId = batch recommendationId). recordFeedback() stores feedback and publishes recommendation.feedback.received but **does not** call adaptive-learning record-outcome. | Phase 1 adds GET weights so recommendations get defaults. **Addition below:** per-recommendation record-prediction + record-outcome on feedback so CAIS learns from feedback. | **Gap:** Feedback is not sent to CAIS as outcome; predictionId at generation is batch id while feedback.recommendationId is individual rec id – no link. |
| **Feedback (recommendation)** | recommendation.feedback.received published; consumed by logging (DataLakeCollector) for Parquet. Not consumed by adaptive-learning. | **Addition:** Recommendations calls adaptive-learning record-outcome when feedback is received; and records one prediction per recommendation so predictionId matches. | See Phase 6. |
| **Outcome (opportunity closed)** | risk-analytics publishes opportunity.outcome.recorded on shard close; logging/Data Lake consume. adaptive.learning.outcome.recorded carries “prediction” value, not “actual outcome”. | In scope: “only Azure ML left”. Optional: when publishing opportunity.outcome.recorded, also call adaptive-learning record-outcome(evaluationId, won/lost) so CAIS can learn prediction vs actual. | **In scope:** Phase 10–11 (per-tenant outcomeSyncToCais; risk-analytics calls record-outcome when enabled). |
| **Automatic learning** | Weights/model selection read/write only; no learning from outcomes. | **In scope:** Phase 10 (automaticLearningEnabled) and Phase 12 (batch job). Super Admin toggles per tenant. | Phase 10 (toggles), Phase 12 (learning job). |

---

## Deep dive UI and API – gaps (in-scope after user confirmation)

| Area | Current state | Gap | Plan addition |
|------|----------------|-----|----------------|
| **API Gateway** | Routes: /api/v1/feedback, /api/v1/admin/tenants, /api/v1/admin/feedback-config, /api/v1/admin/feedback-types -> recommendations. No route for /api/v1/recommendations or /api/v1/admin/tenant-templates. | GET /api/v1/recommendations and POST /api/v1/recommendations/:id/feedback would match /api/v1 (risk_analytics) and fail. admin/tenants/templates calls GET/POST /api/v1/admin/tenant-templates which is not registered. | Phase 7: Add /api/v1/recommendations and /api/v1/admin/tenant-templates -> recommendations. |
| **User-facing UI** | Opportunity detail page has risk, explainability, anomaly, win-probability, remediation; no recommendations list or feedback controls. Admin feedback page shows aggregation only. | No UI for end users to see recommendations for an opportunity or submit feedback (accept/ignore/irrelevant). | Phase 8: Recommendations card/section on opportunity detail: fetch GET /api/v1/recommendations?opportunityId=..., display list, feedback buttons -> POST /api/v1/recommendations/:id/feedback. |
| **Tenant admin / Super Admin** | Admin has feedback types, feedback config, tenants list, tenant detail (feedback config), tenant templates page (calls tenant-templates API – currently unreachable via gateway). ML models, feature engineering, risk catalog, etc. exist. | Tenant templates page will work after gateway fix. No admin UI for CAIS weights or model selection. | Phase 7 fixes tenant-templates. Phase 9: Admin UI to view and edit adaptive-learning weights and model selection (per tenant, component/context). |
| **CAIS admin UI** | Backend will expose GET weights and GET model-selection (Phase 1). No write endpoints; no UI. | Super Admin cannot view or override learned weights / model selection. | Phase 9: Adaptive-learning PUT (or POST) for weights and model-selection; admin page(s) to view and edit (Super Admin). |

---

## Phase 1: Adaptive-learning – add weights and model-selection APIs

**1.1 Config**

- In [containers/adaptive-learning/config/default.yaml](containers/adaptive-learning/config/default.yaml), add Cosmos container names under `cosmos_db.containers` (if not present): e.g. `adaptive_weights`, `adaptive_model_selections` (per README). Ensure schema/registration allows these containers.

**1.2 Backing service**

- Add a new service (e.g. `AdaptiveWeightsService.ts` or extend a single “CAIS read” service) that:
- **getWeights(tenantId, component):** Reads from `adaptive_weights` (partitionKey `tenantId`), keyed by component. Returns an object matching `LearnedWeights` (e.g. `{ ruleBased, ml, ai, historical }` with numbers). If no record exists, return **default weights** (e.g. all 0.8–1.0) so callers never depend on learning being populated.
- **getModelSelection(tenantId, context):** Reads from `adaptive_model_selections` (partitionKey `tenantId`), keyed by context. Returns `{ modelId: string, confidence: number }`. If no record exists, return a **default** (e.g. `{ modelId: 'default-risk-model', confidence: 0.8 }` or context-specific defaults).
- Use parameterized Cosmos queries with `tenantId` in partition key; no hardcoded data.

**1.3 Routes**

- In [containers/adaptive-learning/src/routes/index.ts](containers/adaptive-learning/src/routes/index.ts), register:
- **GET** `/api/v1/adaptive-learning/weights/:tenantId` with optional query `component` (default e.g. `risk-evaluation`). Use `tenantEnforcementMiddleware` and ensure the route validates `request.params.tenantId` against the authenticated tenant (or admin). Return JSON matching risk-analytics’ expected shape.
- **GET** `/api/v1/adaptive-learning/model-selection/:tenantId` with optional query `context` (e.g. `risk-scoring`, `forecasting`). Same auth. Return `{ modelId, confidence }`.
- Document both in OpenAPI/README.

**1.4 Tests**

- Unit tests for the new service: default weights and default model selection when Cosmos returns nothing or fails.

---

## Phase 2: Ml-service – CAIS integration (weights + model selection)

**2.1 PredictionService**

- In [containers/ml-service/src/services/PredictionService.ts](containers/ml-service/src/services/PredictionService.ts):
- Add **getLearnedWeights(tenantId, component)** (private or public): `ServiceClient` GET to `adaptive-learning` `/api/v1/adaptive-learning/weights/${tenantId}?component=<component>`, with JWT and `X-Tenant-ID` (same pattern as [containers/risk-analytics/src/services/RiskEvaluationService.ts](containers/risk-analytics/src/services/RiskEvaluationService.ts) lines 126–147). Return typed `LearnedWeights`; on failure return defaults.
- Add **getModelSelection(tenantId, context)** (same as risk-analytics): GET `/api/v1/adaptive-learning/model-selection/${tenantId}?context=${context}`; on failure return default `{ modelId, confidence }`.
- **predictRiskScore:** Before resolving model/endpoint, call `getModelSelection(tenantId, 'risk-scoring')`. Use returned `modelId` when choosing which Azure ML endpoint or heuristic to use (e.g. prefer endpoint named by `modelId` if it exists in config).
- **predictForecast:** Call `getModelSelection(tenantId, 'forecasting')` and use `modelId` when multiple models/endpoints are available.
- Keep existing **record-prediction** after predictions. Ensure **recordOutcome** is invoked where outcomes are known (e.g. document call site from outcome-sync or risk-analytics); no new HTTP contract required in this plan.

**2.2 Config**

- Confirm [containers/ml-service/config/default.yaml](containers/ml-service/config/default.yaml) has `services.adaptive_learning.url` (already present). Ensure deployment uses env override (e.g. `ADAPTIVE_LEARNING_URL`).

**2.3 Tests**

- Unit tests: mock `adaptiveLearningClient`; assert getWeights/getModelSelection are called with correct tenantId/component/context and that defaults are returned on client errors.

---

## Phase 3: Generic predict() – use Azure ML when endpoint exists

**3.1 PredictionService.predict()**

- In `predict()` (around line 133), after resolving the model via `modelService.getById`:
- If the model’s `type` maps to a configured Azure ML endpoint (e.g. `risk-scoring` → `risk-scoring-model`, `forecasting` → revenue/forecast endpoint), and `input.input` can be used as features:
- Prefer calling the existing Azure ML path (e.g. same logic as the specialized methods: build or use features, call `azureMlClient.predict(endpointKey, features)`), then build the `Prediction` object from the result.
- Only call `generatePlaceholderPrediction()` when **no** such endpoint is configured for that model type (or type is unknown). This ensures that once Azure ML endpoints are created and config is set, generic `predict()` uses them without further code change.

**3.2 Documentation**

- Add a one-line comment in `predict()`: e.g. “Uses Azure ML when endpoint is configured for model type; otherwise placeholder.” Update [VERIFICATION_RESULTS.md](VERIFICATION_RESULTS.md) to state that generic predict uses Azure ML when endpoints exist.

---

## Phase 4: TrainingService and embedding templates (document only)

**4.1 TrainingService**

- In [containers/ml-service/src/services/TrainingService.ts](containers/ml-service/src/services/TrainingService.ts), add a short JSDoc or comment: “Creates training job records only; actual training is submitted to Azure ML (see BI_SALES_RISK_TRAINING_SCRIPTS_SPEC / deployment runbooks).” No implementation of Azure ML job submission in this plan.

**4.2 Embedding templates**

- Update [VERIFICATION_RESULTS.md](VERIFICATION_RESULTS.md): Set “Embedding templates” to resolved: “Template-based embeddings are implemented in data-enrichment (ShardEmbeddingService + EmbeddingTemplateService). The embeddings container is for code/document embeddings; no change required for production.” No code change in the embeddings container.

---

## Phase 5: Config and docs – “only Azure ML left”

**5.1 Ml-service config**

- Verify [containers/ml-service/config/default.yaml](containers/ml-service/config/default.yaml) (and env) lists all Azure ML endpoint keys used in code (e.g. `risk-scoring-model`, `win-probability-model`, `anomaly`, `revenue_forecasting`, `risk_trajectory_lstm`) with empty or env-driven values (e.g. `AZURE_ML_ENDPOINT_RISK_SCORING`). No hardcoded URLs.

**5.2 VERIFICATION_RESULTS and README**

- In [VERIFICATION_RESULTS.md](VERIFICATION_RESULTS.md), set:
- CAIS (ML service): Implemented (getWeights, getModelSelection, record-prediction, recordOutcome).
- ML models / predictions: “Code uses Azure ML when endpoints are configured; only remaining step is creating Azure ML Workspace and managed endpoints and setting env.”
- Optionally add one line to [containers/ml-service/README.md](containers/ml-service/README.md): “Production requires Azure ML Workspace and managed endpoints; set endpoint URLs via config/env.”

---

## Phase 6: Recommendations – feedback to CAIS (full implementation)

So that CAIS can learn from recommendation feedback and “ML, CAIS, Risk, Feedbacks, Recommendations” are fully implemented after the plan.

**6.1 Per-recommendation record-prediction**

- In [containers/recommendations/src/services/RecommendationsService.ts](containers/recommendations/src/services/RecommendationsService.ts), in the flow that generates and stores recommendations (after building `withExplanations`), call adaptive-learning `POST record-prediction` **once per recommendation** with `predictionId: rec.id`, `component: 'recommendations'`, `context: { opportunityId, recommendationId: rec.id }`, `predictedValue: rec.score`. This links each recommendation to a prediction in CAIS so later feedback can reference it by `feedback.recommendationId`.
- Keep or remove the single batch-level record-prediction (current `predictionId: recommendationId`) so there is no duplicate semantics; prefer a single source of truth: one prediction per recommendation.

**6.2 record-outcome when feedback is received**

- In `recordFeedback()` (same file), after storing the feedback record and publishing `recommendation.feedback.received`, if `config.services.adaptive_learning?.url` is set, call adaptive-learning `POST /api/v1/adaptive-learning/outcomes/record-outcome` with:
- `predictionId: feedback.recommendationId` (the individual recommendation id, matching the prediction recorded above),
- `outcomeValue`: e.g. 1 for accept, 0.5 for ignore, 0 for irrelevant (or map to your schema),
- `outcomeType`: e.g. success for accept, failure for irrelevant, partial for ignore,
- `context`: optional (e.g. feedbackTypeId, userId).
- Use the same auth pattern (service token, X-Tenant-ID) as in record-prediction. On failure log and continue (non-blocking).

**6.3 Tests**

- Unit test: mock adaptiveLearningClient; assert record-outcome is called with correct predictionId and outcomeValue when recordFeedback is invoked.

---

## Phase 7: API Gateway – recommendations and tenant-templates routes

- In [containers/api-gateway/src/routes/index.ts](containers/api-gateway/src/routes/index.ts), when `config.services.recommendations?.url` is set, add:
- **Route** `/api/v1/recommendations` -> recommendations (stripPrefix: false). Enables GET /api/v1/recommendations?opportunityId=... and POST /api/v1/recommendations/:id/feedback from the UI.
- **Route** `/api/v1/admin/tenant-templates` -> recommendations (stripPrefix: false). Enables [containers/ui/src/app/admin/tenants/templates/page.tsx](containers/ui/src/app/admin/tenants/templates/page.tsx) (GET/POST/PUT/DELETE /api/v1/admin/tenant-templates and apply).
- Ensure longest-path ordering still matches these before /api/v1 (risk_analytics); gateway already sorts by path length.

---

## Phase 8: UI – user-facing recommendations and feedback (opportunity page)

- Add a **Recommendations card or section** on the opportunity detail page ([containers/ui/src/app/opportunities/[id]/page.tsx](containers/ui/src/app/opportunities/[id]/page.tsx)) that:
- Fetches **GET** `/api/v1/recommendations?opportunityId=<id>&limit=20` (with credentials / X-Tenant-ID from auth context).
- Displays the list of recommendations (title, source, score, explanation; match [RECOMMENDATION_FEEDBACK_REQUIREMENTS](documentation/specifications/feedbacks and recommendations/RECOMMENDATION_FEEDBACK_REQUIREMENTS.md) display expectations).
- For each recommendation, provides **feedback actions**: Accept, Ignore, Irrelevant (and optional feedbackTypeId / comment if spec requires). On action, calls **POST** `/api/v1/recommendations/:id/feedback` with body `{ action, comment?, feedbackTypeId?, metadata? }`.
- Reuse or create a small client component (e.g. `RecommendationsCard` or `OpportunityRecommendations`) that uses `NEXT_PUBLIC_API_BASE_URL`, handles loading/error, and refreshes list after feedback (or removes item from list).
- No new API endpoints; backend and gateway (Phase 7) already expose the above.

---

## Phase 9: Adaptive-learning – write APIs and Super Admin UI (CAIS weights and model selection)

**9.1 Backend – write endpoints**

- In adaptive-learning, add **PUT** (or **POST**) endpoints so Super Admin can override weights and model selection:
- **PUT** `/api/v1/adaptive-learning/weights/:tenantId` with query `component` and body e.g. `{ ruleBased?, ml?, ai?, historical?, vectorSearch?, collaborative?, temporal?, content?, decomposition?, consensus?, commitment? }` (per-component shape). Validate tenant (admin or same tenant); upsert into `adaptive_weights` (partitionKey tenantId, keyed by component).
- **PUT** `/api/v1/adaptive-learning/model-selection/:tenantId` with query `context` and body `{ modelId, confidence }`. Validate tenant; upsert into `adaptive_model_selections`.
- Use same auth and tenant enforcement as GET; document in OpenAPI.

**9.2 UI – Super Admin CAIS page(s)**

- Add **admin CAIS page(s)** under e.g. `/admin/cais` or under existing admin (e.g. `/admin/ml-models` or `/admin/settings`) so Super Admin can:
- **View** current learned weights and model selection (per tenant, per component/context): call GET /api/v1/adaptive-learning/weights/:tenantId?component=... and GET /api/v1/adaptive-learning/model-selection/:tenantId?context=... (API gateway must proxy these: add route `/api/v1/adaptive-learning` -> adaptive-learning if not present).
- **Edit** weights: form per component (risk-evaluation, recommendations, forecasting, ml-prediction, etc.) with numeric inputs; submit -> PUT /api/v1/adaptive-learning/weights/:tenantId?component=...
- **Edit** model selection: form per context (risk-scoring, forecasting, recommendations, etc.) with modelId and confidence; submit -> PUT /api/v1/adaptive-learning/model-selection/:tenantId?context=...
- Tenant selector (dropdown or list) for multi-tenant admin; enforce Super Admin role (existing auth).
- **API Gateway:** Ensure `/api/v1/adaptive-learning` is registered -> adaptive-learning so the UI can call GET/PUT weights and model-selection (add in [containers/api-gateway/src/routes/index.ts](containers/api-gateway/src/routes/index.ts) when `config.services.adaptive_learning?.url` is set).

---

## Phase 10: Per-tenant CAIS feature flags (Super Admin toggles)

So that Super Admin can enable/disable outcome sync and automatic learning **per tenant**.

**10.1 Backend – tenant CAIS config**

- In adaptive-learning, add storage for per-tenant CAIS flags (e.g. Cosmos container `adaptive_tenant_config` or reuse an existing config container) with partitionKey `tenantId`. Document shape: e.g. `{ tenantId, outcomeSyncToCais?: boolean, automaticLearningEnabled?: boolean, updatedAt?, updatedBy? }`. Defaults: both false when absent.
- **GET** `/api/v1/adaptive-learning/tenant-config/:tenantId` – return the tenant’s CAIS config (Super Admin or same tenant). Used by risk-analytics (to decide whether to call record-outcome on opportunity close) and by the learning job (to decide which tenants to process).
- **PUT** `/api/v1/adaptive-learning/tenant-config/:tenantId` – body `{ outcomeSyncToCais?: boolean, automaticLearningEnabled?: boolean }`. Super Admin only; upsert config.
- Optionally **GET** `/api/v1/adaptive-learning/tenant-config` – list configs for all tenants (Super Admin) for the admin UI.

**10.2 UI – toggles on CAIS admin page**

- On the Super Admin CAIS page(s) (Phase 9), add **per-tenant toggles**:
- **Outcome sync to CAIS:** when enabled for a tenant, risk-analytics will call adaptive-learning record-outcome when publishing opportunity.outcome.recorded (Phase 11). Label e.g. “Sync opportunity outcomes to CAIS (risk prediction vs won/lost).”
- **Automatic learning:** when enabled for a tenant, the batch learning job (Phase 12) will update weights and model selection for that tenant from recent outcomes. Label e.g. “Automatically learn weights and model selection from outcomes.”
- Persist via PUT /api/v1/adaptive-learning/tenant-config/:tenantId. Show tenant selector then toggles for selected tenant (or a table of tenants with toggle per row).

---

## Phase 11: Risk outcome → record-outcome when opportunity closes

When an opportunity closes, send the actual outcome (won/lost) to CAIS so it can learn prediction vs actual. **Only when the tenant has outcomeSyncToCais enabled** (Phase 10).

**11.1 risk-analytics**

- Where risk-analytics publishes `opportunity.outcome.recorded` (e.g. in [containers/risk-analytics/src/events/consumers/RiskAnalyticsEventConsumer.ts](containers/risk-analytics/src/events/consumers/RiskAnalyticsEventConsumer.ts) `tryPublishOutcomeOnShardUpdate`, or the publisher): before or after publishing the event:
- **Check tenant flag:** call adaptive-learning GET `/api/v1/adaptive-learning/tenant-config/:tenantId` (or use a cached/configurable list). If `outcomeSyncToCais` is not true for this tenant, skip the next step.
- **Resolve evaluationId:** obtain the last risk evaluation id for this opportunity (e.g. query risk_evaluations or call risk-analytics API by opportunityId; ensure partitionKey tenantId).
- **Call record-outcome:** POST to adaptive-learning `/api/v1/adaptive-learning/outcomes/record-outcome` with `predictionId: evaluationId`, `outcomeValue: outcome === 'won' ? 1 : 0`, `outcomeType: outcome === 'won' ? 'success' : 'failure'`, `context: { opportunityId, closeDate, amount }`. Use service token and X-Tenant-ID.
- If evaluationId cannot be resolved or adaptive-learning is unavailable, log and still publish opportunity.outcome.recorded (non-blocking).

**11.2 Config / dependency**

- risk-analytics needs adaptive-learning URL (for GET tenant-config and POST record-outcome). Add `services.adaptive_learning.url` to risk-analytics config if not present.

---

## Phase 12: Automatic learning (batch job) – update weights and model selection from outcomes

Implement logic that **learns** weights and model selection from stored outcomes. Runs as a **scheduled batch job**; only processes tenants that have **automaticLearningEnabled** (Phase 10).

**12.1 Backend – learning job**

- In adaptive-learning (or a worker that has access to adaptive-learning data), add a **batch job** (e.g. triggered by RabbitMQ `workflow.job.trigger` with job name `cais-learning` or a cron in adaptive-learning):
- For each tenant where GET tenant-config returns `automaticLearningEnabled === true`, load recent outcomes from `adaptive_outcomes` (partitionKey tenantId, type = 'outcome', with optional date filter).
- Correlate outcomes with stored predictions (same tenant, predictionId) to get (predictedValue, outcomeValue) pairs per component/context.
- **Update weights:** compute updated weights per component (e.g. simple rule: increase weight for components whose predictions correlated better with outcomes; or gradient step). Upsert into `adaptive_weights` (partitionKey tenantId, keyed by component).
- **Update model selection:** optionally update `adaptive_model_selections` per context (e.g. prefer model/context with better recent accuracy). Upsert into `adaptive_model_selections`.
- Keep the learning algorithm simple and documented (e.g. exponential moving average of accuracy per component, or min/max bounds so weights stay in [0,1]). Log updates for audit.
- Schedule: e.g. daily or configurable via workflow-orchestrator batch_jobs config (e.g. `cais_learning_cron`).

**12.2 Toggle**

- Job only runs for tenants with `automaticLearningEnabled` (from Phase 10). If no tenants have it enabled, job no-ops or skips quickly.

---

## Success criteria (exit condition)

- Adaptive-learning exposes GET weights and GET model-selection; risk-analytics, forecasting, and ml-service call them with fallbacks.
- Ml-service uses getModelSelection in predictRiskScore and predictForecast; records predictions and outcomes for CAIS.
- Generic `predict()` uses Azure ML when an endpoint is configured for the model type; otherwise placeholder.
- TrainingService and embedding templates are documented as above; no open “placeholder” gaps except Azure ML creation.
- All Azure ML endpoint names are config/env-driven; no hardcoded URLs.
- Recommendations: GET weights returns defaults (Phase 1); per-recommendation record-prediction and record-outcome on feedback (Phase 6) so CAIS learns from feedback.
- API Gateway: /api/v1/recommendations and /api/v1/admin/tenant-templates route to recommendations (Phase 7); /api/v1/adaptive-learning routes to adaptive-learning when Phase 9 is done.
- User UI: Opportunity page shows recommendations and feedback actions (Phase 8).
- Super Admin UI: CAIS weights and model selection view/edit (Phase 9); tenant templates page works via gateway (Phase 7).
- Per-tenant CAIS toggles (Phase 10): outcomeSyncToCais and automaticLearningEnabled; Super Admin can enable/disable per tenant in CAIS admin page.
- Risk outcome → CAIS (Phase 11): when opportunity closes, risk-analytics calls record-outcome(evaluationId, won/lost) when tenant has outcomeSyncToCais enabled.
- Automatic learning (Phase 12): batch job updates weights and model selection from outcomes; only for tenants with automaticLearningEnabled.
- **Only remaining task:** Create Azure ML Workspace and managed endpoints, then set the corresponding environment variables.

---

## Out of scope (explicitly left for later)

- Creating or configuring Azure ML Workspace, compute, or managed endpoints.
- Running training jobs inside Azure ML (training pipeline / scripts).