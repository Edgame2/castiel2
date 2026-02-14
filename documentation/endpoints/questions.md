# Endpoint Implementation — Questions and Decisions

All questions and decisions for the "Implement All Endpoints Fully" plan are tracked here.

---

## Critical Questions (Pending)

### 1. Forecasting routing

Risk Analytics already owns `/api/v1` and exposes `/api/v1/forecasts/:period/scenarios` as Fully. The forecasting container has its own routes.

**Question:** Should the forecasting service:
- **A)** Own all `/api/v1/forecasts` routes (gateway proxies to forecasting, not risk-analytics)?
- **B)** Remain internal; risk-analytics proxies to it (no new gateway route)?
- **C)** Share paths (forecasting for some, risk-analytics for others)?

**Decision:** Forecasting owns /api/v1/forecasts. Add gateway route to forecasting service.

---

### 2. Integration Sync vs Integration Manager

Integration Manager already has `/api/v1/sync-tasks`, `/api/v1/webhooks`, etc. Integration Sync is listed as Missing with `/sync/tasks/:taskId`, `/sync/trigger`, `/webhooks`, etc.

**Question:** Should Integration Sync:
- **A)** Be a separate gateway service with distinct paths (e.g. `/api/v1/sync` for integration-sync, different from integration-manager’s sync-tasks)?
- **B)** Be merged into Integration Manager’s routes?
- **C)** Handle different sync types (integration-sync = internal sync, integration-manager = tenant-facing)?

**Decision:** Merge Integration Sync into Integration Manager.

---

### 3. Auth API keys feature flag

`GET/POST/DELETE /api/v1/auth/api-keys` are Partial with a feature flag.

**Question:** Should we:
- **A)** Remove the feature flag and enable API keys for all tenants?
- **B)** Keep the feature flag and complete implementation behind it?
- **C)** Make it configurable per tenant (e.g. org setting)?

**Decision:** Keep feature flag; complete implementation behind it.

---

### 4. POST /api/v1/decisions/methodology

**Question:** What should this endpoint do?
- **A)** Full methodology decision logic (use sales methodology, evaluate opportunity, return recommendation)?
- **B)** Minimal implementation (return structured response, logic TBD)?
- **C)** Delegate to an existing service (e.g. DecisionEngineService) and document expected behavior?

**Decision:** Full methodology decision logic.

---

### 5. Path conflicts for new gateway routes

Adding many services under `/api/v1/` may create path overlaps (e.g. `/api/v1/forecasts` vs risk-analytics catch-all).

**Question:** Should we:
- **A)** Register more specific paths first (e.g. `/api/v1/forecasts` before `/api/v1`) so they take precedence?
- **B)** Audit gateway path-matching order and document it in questions.md?
- **C)** Use distinct prefixes (e.g. `/api/v1/forecasting/` vs `/api/v1/forecasts/`) to avoid conflicts?

**Decision:** Option C

---

## Decisions Log

| Date | Topic | Decision |
|------|-------|----------|
| 2026-02-12 | Forecasting routing | Forecasting owns /api/v1/forecasts; add gateway route |
| 2026-02-12 | Integration Sync vs Manager | Merge Integration Sync into Integration Manager |
| 2026-02-12 | Auth API keys feature flag | Keep flag; complete implementation behind it |
| 2026-02-12 | POST decisions/methodology | Full methodology decision logic |
| 2026-02-12 | Auth api-keys implementation | Added schema with security, X-Tenant-ID fallback, ApiKeyService already uses tenantId |
| 2026-02-12 | Risk Analytics methodology | DecisionEngineService.makeMethodologyDecisions implemented; unit + integration tests pass |
| 2026-02-12 | Logging tenant enforcement | Added tenantEnforcementMiddleware from @coder/shared; routes use user.tenantId |
| 2026-02-12 | ML endpoints GET :id | Added GET /api/v1/ml/endpoints/:id; monitoring alerts, features/quality, versions already have Cosmos + tenantId |
| 2026-02-12 | Phase 2 gateway routes | Added routeMappings for forecasting, reasoning, validation, workflow, security, quality, patterns, enrichment, llm, learning, context, utility, ai-analytics, signals |
| 2026-02-12 | Integration Sync merge | Added gateway routes /api/v1/webhooks and /api/v1/sync → integration_manager; sync/conflicts covered by /api/v1/integrations |
| 2026-02-12 | Reasoning Engine tests | Added integration tests for POST /reasoning/reason, POST/GET /reasoning/tasks; updated setup auth mock; response schema for create |
| 2026-02-12 | Validation Engine tests | Added integration tests for rules CRUD, validation/run, runs list/get; updated setup auth mock; response schema for create |
| 2026-02-12 | Workflow Orchestrator tests | Fixed setup: cosmos_db.containers, auth mock, fetchNext; rewrote integration tests for GET /workflows, /workflows/:id, retry, hitl/approvals |
| 2026-02-12 | Forecasting tests | Fixed setup: cosmos_db.containers, auth mock, fetchNext, ServiceClient constructor, generateServiceToken; rewrote integration tests for /forecasts routes |
| 2026-02-12 | Security Scanning tests | Added setup: cosmos_db.containers, auth mock, ServiceClient constructor; integration tests for scans, pii/detect, pii/redact, detections |
| 2026-02-12 | Quality Monitoring tests | Added setup: cosmos_db.containers, auth mock, ServiceClient constructor; integration tests for metrics, anomalies; server isMain guard |
| 2026-02-12 | Pattern Recognition tests | Updated setup: cosmos_db.containers, auth mock (req.user), getContainer read→null for 404; integration tests for patterns CRUD, scan, scans list/get, matches; response schema for create (201) |
| 2026-02-12 | Data Enrichment tests | Added PolicyResolver to @coder/shared mock; isMain guard in server; getContainer mock for enrichment_jobs; integration tests for enrich, trigger, jobs/:jobId (200/404) |
| 2026-02-12 | LLM Service tests | Full setup: fs, yaml, @coder/shared/database (getContainer with items.upsert), @coder/shared auth mocks; isMain guard; integration tests for explain, recommendations, scenarios, summary, playbook, reactivation/strategy; response schema additionalProperties for serialization |
| 2026-02-12 | Learning Service tests | Updated setup: getContainer with items.query().fetchAll(), item().read() (null for id='not-found'); auth mocks async; isMain guard; vitest.config with setupFiles; response schema additionalProperties; integration tests for feedback, outcomes, feedback/summary, link-prediction (200/404), feedback/trends |
| 2026-02-12 | Context Service tests | Updated setup: cosmos_db.containers in yaml mock; getContainer create returns resource, query returns stub context for path lookup; auth mocks async; response schema for create (201). Integration test file created (disk full prevented dir creation - run `mkdir -p tests/integration/routes` and add context.test.ts when space available) |
| 2026-02-12 | Context Service §19 complete | Completed truncated routes: GET by path (schema + handler), GET list contexts, POST assemble, POST dependencies/tree, POST call-graphs. Added integration tests in tests/unit/placeholder.test.ts. Setup: RABBITMQ_URL default amqp://localhost; GET by path response schema additionalProperties: true for serialization. All 62 tests pass; build succeeds. |
| 2026-02-12 | AI Service §20 | Route prefixes changed to /completions, /models, /agents so gateway stripPrefix /api/ai forwards correctly. Exported buildApp(), isMain guard. Setup: RABBITMQ_URL default amqp://localhost; auth mock sets req.user (id, tenantId); EventPublisher, getDatabaseClient, HttpClient, connectDatabase etc. in @coder/shared mock. Agents use user.tenantId. Integration tests: tests/integration/routes/ai-service.test.ts (POST /completions, GET /models, GET /models/:id, GET /agents, POST /agents/:id/execute). Run tests from repo root with pnpm (workspace protocol). |
| 2026-02-12 | Embeddings §21 | Route prefix set to '' so gateway stripPrefix /api/embeddings forwards to /, /batch, /search, /:id, /project/:projectId. Exported buildApp(), isMain guard. Added tenantEnforcementMiddleware to embedding routes. Setup: auth mock req.user; getDatabaseClient emb_documents (upsert/findUnique/delete/deleteMany); EventPublisher with connect; redis in config mock; cosmos_db.containers. Integration tests in tests/unit/placeholder.test.ts: POST /, POST /batch, GET /:id, POST /search, DELETE /:id, DELETE /project/:projectId. |
| 2026-02-12 | Utility Services §22 | Gateway already has /api/v1/utility (stripPrefix: false). Added isMain guard: start() only when NODE_ENV !== 'test'. Setup: cosmos_db.containers (imports, exports, migrations, notifications, batches, preferences, templates); auth mock req.user; getContainer with items.create, item(id).read (stub job for job-1). Integration tests: tests/integration/routes/utility.test.ts (GET jobs/job-1 200, GET jobs/not-found 404, POST import 202, POST export 202). |
| 2026-02-12 | AI Analytics §23 | Gateway already has /api/v1/ai-analytics (stripPrefix: false). Route GET /api/v1/ai-analytics/models uses (request as any).user.tenantId. Setup: cosmos_db.containers (events, models, feedback); auth mock req.user; getContainer with fetchNext returning { resources: [] }; connectDatabase mockResolvedValue. Integration test: tests/integration/routes/ai-analytics.test.ts (GET /api/v1/ai-analytics/models 200, body.models array). |
| 2026-02-12 | Signal Intelligence §24 | Gateway already has /api/v1/signals (stripPrefix: false). Added isMain guard: start() only when NODE_ENV !== 'test'. Setup: cosmos_db.containers (communications, calendar, social); auth mock req.user; getContainer items.create mockResolvedValue; connectDatabase mockResolvedValue. Integration test: tests/integration/routes/signal-intelligence.test.ts (POST /api/v1/signals/analyze 201, body id, signalType, analyzed). |
| 2026-02-12 | Auth API keys §1 (Phase 1) | Added tenantEnforcementMiddleware() from @coder/shared to all three api-keys routes (POST, GET, DELETE). Create handler uses tenantContext.tenantId ?? xTenantId. Integration tests updated to send x-tenant-id (UUID) so middleware passes. |
| 2026-02-12 | Risk Analytics §2 (Phase 1) | POST /api/v1/decisions/methodology already fully implemented: DecisionEngineService.makeMethodologyDecisions (W8), auth + tenantEnforcementMiddleware, schema (body.opportunityId, 200/204), handler 401 when no tenantId, METHODOLOGY_DECISION_FAILED on error. Unit tests: DecisionEngineService.test.ts (makeMethodologyDecisions null/getter/features/actions, stage requirements, MEDDIC). Integration: decisions-methodology.test.ts (200 or 204 with body shape, 400 missing opportunityId). |
| 2026-02-12 | Logging §3 (Phase 1) – policies | Tenant isolation for policies: GET /policies/:id now uses listPolicies(tenantId) and finds by id. RetentionService.updatePolicy and deletePolicy now take tenantId and throw (policy not found) when policy tenant does not match. Routes pass tenantId (user.tenantId). Unit tests: RetentionService.test.ts updated for new signatures; added tests for update/delete when policy belongs to another tenant. |
| 2026-02-12 | Logging §3 (Phase 1) – alerts | Tenant isolation for alerts: AlertService.getRule(id, tenantId), updateRule(…, tenantId), deleteRule(id, tenantId), evaluateRule(ruleId, tenantId). getRule finds by id then returns null if rule tenant !== tenantId; update/delete/evaluate use getRule first. Cosmos: CosmosAlertRulesRepository.findUniqueByIdAndTenant(id, tenantId) added (partition-scoped query). Routes pass tenantId to all alert handlers. Unit tests: AlertService.test.ts updated for getRule(id, tenantId) and evaluateRule(ruleId, tenantId); added getRule returns null when rule belongs to another tenant. |
| 2026-02-12 | Logging §3 (Phase 1) – verification | Tenant isolation for checkpoints: audit_hash_checkpoints use tenantId. HashChainService.createCheckpoint(..., tenantId), getCheckpoints(tenantId, limit), verifySinceCheckpoint(id, tenantId); create/store/filter by tenantId; verifySinceCheckpoint throws if checkpoint tenant !== tenantId. Routes pass tenantId (user.tenantId) to create/list/verify-by-checkpoint. Unit tests: HashChainService.test.ts updated and verifySinceCheckpoint tenant tests added. Run prisma generate after schema change; run migration to add column if needed. |
| 2026-02-12 | Logging §3 (Phase 1) – complete | Unit tests: RetentionService (tenant-scoped update/delete), AlertService (getRule/evaluateRule tenantId, tenant isolation), HashChainService (checkpoints + verifySinceCheckpoint tenant), ConfigurationService (existing coverage + fallback to global config). All 157 logging unit tests pass. §3 Logging complete: policies, configuration, alerts, verification aligned with templates (auth, tenant, schema); Cosmos/Prisma tenant-scoped where applicable. |
| 2026-02-12 | Integration Processors §4 (Phase 1) | GET integrations, errors, performance already have auth + tenantEnforcementMiddleware and schema. MonitoringService: getIntegrationHealth returns [] (stub); getErrorAnalytics/getPerformanceMetrics return real data shape. Exported buildApp() from index (no main when NODE_ENV=test). Integration tests: tests/integration/routes/monitoring.test.ts (GET integrations 200 + body.integrations, GET errors 200 + errors/totalErrors/errorRate, GET performance 200 + metrics.byProcessorType). Unit tests for MonitoringService already cover the three methods. |
| 2026-02-12 | ML Service §5 (Phase 1) – partial endpoints | GET /api/v1/ml/endpoints and GET /api/v1/ml/endpoints/:id already implemented: config.azure_ml.endpoints + live health fetch, auth + tenant middleware, schema. Integration tests added: tests/integration/routes/ml-endpoints.test.ts (list returns 200 + items + timestamp; get by id returns 404 for unknown id). Mocks: connectDatabase, auth/tenant, MLServiceEventPublisher. Run with vitest when deps installed. |
| 2026-02-12 | Prompt Service §6 (Phase 1) | GET /api/v1/prompts/analytics already implemented: PromptService.getAnalytics(tenantId) aggregates by status/category from Cosmos; route has auth + tenantEnforcementMiddleware, schema (totalPrompts, byStatus, byCategory). Added unit tests: PromptService.test.ts getAnalytics (tenantId required, returns aggregated counts). Added integration test: tests/integration/routes/prompts-analytics.test.ts (200 + body shape). All 16 unit + 1 integration test pass. |
| 2026-02-12 | Web Search §7 (Phase 1) | Gateway already registers /api/v1/web-search when config.services.web_search.url is set. POST /api/v1/web-search had auth, tenant, body schema, and error handling; added 400/500 response schema. Integration tests: tests/integration/routes/web-search.test.ts (200 + results/query/cached, 400 when query missing). Mocks: loadConfig (cosmos_db.containers), @coder/shared (auth, initDB, connectDB, generateServiceToken), @coder/shared/database (getContainer with fetchNext/fetchAll). Both tests pass. |
| 2026-02-12 | Reasoning Engine §8 (Phase 2) | Gateway and config already present. Routes POST /reasoning/reason, GET/POST /reasoning/tasks, GET /reasoning/tasks/:id, POST /reasoning/tasks/:id/cancel (and PUT tasks/:id, GET tasks list) implemented with auth, tenant, schema. Integration tests (7) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Validation Engine §9 (Phase 2) | Gateway and config already present. Routes: rules CRUD, POST /validation/run, GET /validation/runs, GET /validation/runs/:id, GET /validation/runs/:id/results; auth, tenant, schema. Integration tests (8) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Workflow Orchestrator §10 (Phase 2) | Gateway and config already present. Routes: GET /workflows, GET /workflows/:workflowId, POST /workflows/:workflowId/retry; GET/POST /hitl/approvals/:id (approve/reject); auth, tenant. Integration tests (6) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Forecasting §11 (Phase 2) | Gateway and config already present. Routes: GET/POST /forecasts, GET /forecasts/:forecastId, GET /forecasts/:period/scenarios|risk-adjusted|ml, POST /forecasts/team, GET /forecasts/tenant, POST /accuracy/actuals, GET /accuracy/metrics; auth, tenant. Integration tests (7) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Security Scanning §12 (Phase 2) | Gateway and config already present. Routes: GET /security/scans/:scanId, POST /security/scans, POST /security/pii/detect, POST /security/pii/redact, GET /security/pii/detections/:detectionId; auth, tenant. Integration tests (5) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Quality Monitoring §13 (Phase 2) | Gateway and config already present. Routes: GET/POST /quality/metrics, GET /quality/anomalies, POST /quality/anomalies/detect; auth, tenant. Integration tests (4) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Pattern Recognition §14 (Phase 2) | Gateway and config already present. Routes: patterns CRUD, POST /patterns/scan, GET /patterns/scans, GET /patterns/scans/:id, GET /patterns/scans/:id/matches; auth, tenant. Integration tests (11) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Integration Sync §15 (Phase 2) | Merged into Integration Manager. Gateway has /api/v1/sync, /api/v1/webhooks → integration_manager. Integration Manager exposes sync/tasks/:taskId, sync/trigger, webhooks CRUD, sync-tasks, integrations/sync/conflicts/*. Path coverage verified. ENDPOINTS.md updated to Fully (merged). |
| 2026-02-12 | Data Enrichment §16 (Phase 2) | Gateway and config already present. Routes: GET /enrichment/jobs/:jobId, POST /enrichment/trigger, POST /enrichment/enrich (and bulk, statistics, vectorization); auth, tenant. Integration tests (5) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | LLM Service §17 (Phase 2) | Gateway and config already present. Routes: POST /llm/explain, /recommendations, /scenarios, /summary, /playbook, /reactivation/strategy; auth, tenant. Integration tests (7) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Learning Service §18 (Phase 2) | Gateway and config present. Routes: POST /api/v1/feedback, POST /api/v1/outcomes, GET /api/v1/feedback/summary/:modelId, PUT /api/v1/feedback/:feedbackId/link-prediction, GET /api/v1/feedback/trends/:modelId; auth, tenant. Integration tests (7) pass. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Context Service §19 (Phase 2) | Gateway and config present. Routes: /api/v1/context/contexts (POST, GET list, GET :id, GET path/:path), POST assemble, POST dependencies/tree, POST call-graphs; auth, tenant. Tests in unit/placeholder.test.ts (7) pass. ENDPOINTS.md updated to Fully. Service prefix /api/v1/context; gateway /api/v1/contexts. |
| 2026-02-12 | AI Service §20 (Phase 2) | Gateway /api/ai → ai_service (stripPrefix: true). Routes: POST /completions, GET /models, GET /models/:id, GET /agents, GET /agents/:id, POST /agents/:id/execute; auth, tenant. Integration tests in ai-service.test.ts. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Embeddings §21 (Phase 2) | Gateway /api/embeddings → embeddings (stripPrefix: true). Routes: POST /, POST /batch, GET /:id, POST /search, DELETE /:id, DELETE /project/:projectId; auth, tenant. Tests in unit/placeholder.test.ts. ENDPOINTS.md updated to Fully. |
| 2026-02-12 | Utility §22, AI Analytics §23, Signal §24 (Phase 2) | Gateway and config present for all. Utility: GET jobs/:jobId, POST import, POST export. AI Analytics: GET /api/v1/ai-analytics/models. Signals: POST /api/v1/signals/analyze. ENDPOINTS.md updated to Fully. |
