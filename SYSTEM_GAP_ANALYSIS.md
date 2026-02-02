# System-Wide Gap Analysis

**Date:** 2026-02-01  
**Scope:** All containers, requirements (BI Sales Risk, feature docs), standards (ModuleImplementationGuide, .cursorrules)

---

## 0. Verification Scan (2026-02-01)

Findings from system-wide code/config scan:

| Check | Result |
|-------|--------|
| **CAIS wiring** | **Verified.** risk-analytics, ml-service, forecasting all call adaptive-learning (getWeights, recordPrediction, recordOutcome, model-selection). |
| **Automatic risk evaluation** | **Verified.** RiskAnalyticsEventConsumer subscribes to `shard.updated`; when config allows, triggers evaluation and publishes `risk.evaluated`. |
| **Sync scheduler** | **Verified.** integration-sync has SyncSchedulerService (nextSyncAt, interval_ms); started from server.ts. |
| **Stub containers** | **Removed.** bug-detection container removed from the system. |
| **Hardcoded URL (production)** | **Resolved.** Auth SecretManagementClient and SAMLHandler no longer use a code fallback; require config or SECRET_MANAGEMENT_SERVICE_URL; fail fast when missing. |
| **Embedding templates** | **Resolved (Option B).** data-enrichment owns template-based shard embeddings (ShardEmbeddingService + EmbeddingTemplateService); embeddings container remains for code/document embeddings. |
| **Tenant isolation** | **Present.** 481 files reference X-Tenant-ID/tenantId/tenantEnforcement across containers. |
| **Containers with openapi.yaml** | 53. integration-processors has no openapi.yaml (worker-style; has index.ts not server.ts). ui has no openapi.yaml (frontend). |
| **Containers with Dockerfile** | 55. All service/worker/frontend containers have Dockerfile. |
| **Tests** | **llm-service** has no tests/ directory. learning-service has tests (FeedbackLearningService.test.ts). 53 containers have tests/setup.ts. Test mocks using localhost/example in test files are acceptable. |
| **Placeholder URLs in runtime code** | search-service SearchService.ts and web-search WebSearchService.ts use `https://example.com/...` for fallback when no AI results; consider config-driven base URL. auth uses localhost:3000 only when NODE_ENV !== 'production'. utility-services and notification-manager use config.app?.url with localhost:3000 fallback for appUrl. |

---

## 1. Executive Summary

| Dimension | Status | Gaps |
|-----------|--------|------|
| **Containers** | 55 with Dockerfile, 53 with openapi | utility-services may duplicate notification-manager; integration-processors, ui no openapi (worker/frontend). |
| **Features** | ~60% complete per docs | Content/doc advanced, push notifications; sync scheduling **implemented** |
| **BI Sales Risk** | Phases 1–2 in place | Azure ML real models; embedding templates |
| **CAIS** | **Wired** | risk-analytics, ml-service, forecasting call adaptive-learning |
| **Auto risk evaluation** | **Implemented** | shard.updated → RiskAnalyticsEventConsumer → evaluate → risk.evaluated |
| **OAuth token refresh** | **Resolved** | Dedicated worker/timer in integration-sync (TokenRefreshService); integration-manager handles check-expiring and publishes refresh-requested; integration-sync handles refresh-requested and calls refresh API. |
| **Standards** | Largely compliant | Test coverage &lt;80%; **llm-service** only container without tests |
| **Observability** | Implemented for BI/risk | Prometheus/Grafana/runbooks; /metrics in key containers |

**Remaining critical gaps:** Azure ML real training/deployment verification.

---

## 2. Feature Gaps (Documented vs Implemented)

### 2.1 Integrations

| Feature | Status | Gap |
|---------|--------|-----|
| Sync workers as Azure Functions | Different | Implemented as containers; no Azure Functions |
| Event Grid + Service Bus | Different | RabbitMQ only (per plan) |
| **Automatic sync scheduling** | **Implemented** | SyncSchedulerService in integration-sync (nextSyncAt, interval_ms) |
| **OAuth token auto-refresh** | **Resolved** | Dedicated worker/timer in integration-sync (TokenRefreshService.start); integration-manager handles check-expiring and publishes refresh-requested; integration-sync handles refresh-requested and calls refresh API. Documented in integration-sync README. |
| Real-time write-back | Partial | Events exist; full write-back flow needs verification |
| Rate limiting / integration limits | Partial | May not be enforced in all sync paths |

### 2.2 Vector Search & Embeddings

| Feature | Status | Gap |
|---------|--------|-----|
| **Embedding template integration** | **Resolved (Option B)** | data-enrichment owns template-based shard embeddings (ShardEmbeddingService + EmbeddingTemplateService); embeddings container remains for code/document embeddings. |
| Per-shard-type model selection | Partial | c_opportunity/c_account/c_contact quality model not clearly applied |
| Field-weighted relevance | Missing | All fields treated equally |
| Embedding processor (Change Feed) | Unclear | Auto-embed on shard change needs verification |
| Re-embedding jobs | Missing | No batch/scheduled re-embed when templates/models change |

### 2.3 CAIS (Adaptive Learning)

| Feature | Status | Gap |
|---------|--------|-----|
| **Service integration** | **Verified** | risk-analytics, ml-service, forecasting call adaptive-learning (weights, recordPrediction, recordOutcome, model-selection) |
| **Outcome collection** | Implemented | recordPrediction/recordOutcome used in RiskEvaluationService, PredictionService, ForecastingService |
| Adaptive weight usage | Implemented | getWeights used before evaluation/prediction/forecast |
| Model selection integration | Implemented | model-selection API called by risk, ml, forecasting |
| Validation & rollout | Medium | Gradual rollout/rollback not clearly active |

### 2.4 Risk Analysis

| Feature | Status | Gap |
|---------|--------|-----|
| **Automatic risk evaluation triggers** | **Implemented** | RiskAnalyticsEventConsumer subscribes to shard.updated; evaluates and publishes risk.evaluated (when config enabled) |
| ML-based risk scoring | High | ml-service has endpoint; integration with RiskEvaluationService in place |
| Assumption tracking & display | Partial | Object exists; not consistently populated or shown in UI |
| CAIS in risk evaluation | Implemented | RiskEvaluationService uses adaptive-learning weights and recordPrediction |

### 2.5 Pipeline Forecasting & ML

| Feature | Status | Gap |
|---------|--------|-----|
| **ML-powered revenue forecasting** | Critical | Forecasting service; ML integration and P10/P50/P90 unclear |
| **Azure ML (training + endpoints)** | Critical | Scripts and jobs exist; **real trained models and Managed Endpoints** need verification |
| Feature store | Partial | FeatureService.buildVectorForOpportunity exists; versioning/reuse unclear |
| Forecast accuracy tracking | Missing | No MAPE/bias/R² over time |
| Continuous learning / retraining | Missing | No automated retraining pipeline |
| SHAP / model explainability | Partial | Top drivers from buildVector; SHAP not integrated |

### 2.6 Content Generation, Document Management, Notifications

| Feature | Status | Gap |
|---------|--------|-----|
| Placeholder extraction, multi-format, chart generation | Missing | Per feature documentation |
| Document: preview, PII redaction, virus scanning | Missing | Deferred per docs |
| Push notifications | Missing | FCM etc. in utility-services; relationship to notification-manager unclear |
| Document chunking (Azure Function) | Different | Not a separate Function; may be in embeddings/doc |

---

## 3. BI Sales Risk Plan Gaps

### 3.1 Implemented (Plan Phases 1–2)

- **DataLakeCollector:** `risk.evaluated` → Parquet `/risk_evaluations/...`; `ml.prediction.completed` → `/ml_inference_logs/...`
- **buildVectorForOpportunity:** ml-service FeatureService + shard-manager, risk-analytics (risk-snapshots)
- **Batch jobs:** workflow.job.trigger → bi_batch_jobs; BatchJobScheduler (workflow-orchestrator), BatchJobWorker (risk-analytics)
- **risk_snapshots:** Cosmos, RiskSnapshotService, risk.evaluated→upsert, backfill from Data Lake
- **outcome-sync, opportunity.outcome.recorded:** BatchJobWorker + RiskAnalyticsEventConsumer → `/ml_outcomes/...`
- **Training scripts:** prepare_training_data, train/score; Azure ML job YAMLs
- **CAIS:** risk-analytics, ml-service, forecasting call adaptive-learning (weights, recordPrediction, recordOutcome)
- **Automatic risk evaluation:** shard.updated → RiskAnalyticsEventConsumer → evaluate → risk.evaluated
- **Observability:** /metrics (prom-client), Prometheus scrape-config, Grafana dashboards, runbooks

### 3.2 Gaps vs Plan

| Item | Plan Reference | Gap |
|------|----------------|-----|
| **Azure ML real models** | §5, §5.6 | Training scripts/jobs exist; **deployed Managed Endpoints and real inference** need verification |
| **Embedding templates** | FEATURE_PIPELINE, embeddings | Resolved (Option B): data-enrichment owns template-based shard embeddings; embeddings container for code/document only. |
| **outcome.join in Data Lake** | DATA_LAKE_LAYOUT §2.4 | prepare_training_data joins risk_evaluations+ml_outcomes; **ml_outcomes** population — confirm writer and paths |
| **Competitors catalog** | Plan §3.1.2 | `competitors` / risk_competitor_tracking — implementation level TBD |
| **HITL, model governance, 3-tier audit** | Plan §4, runbooks | Runbooks exist; **implementation in services** to verify |

---

## 4. Infrastructure & Standards Gaps

### 4.1 Stub-Only Containers

**Removed.** bug-detection container has been removed from the system.

### 4.2 Test Coverage

- **Target:** ≥80% (ModuleImplementationGuide §12)
- **Current:** 53 containers have tests/setup.ts; **llm-service** is the only container with no tests/ directory. learning-service has unit tests (FeedbackLearningService.test.ts). Coverage % not measured at 80%.
- **Gap:** Add tests for llm-service; expand coverage and measure 80% target.

### 4.3 Config & Compliance

- **Hardcoded URL (production):** **Resolved.** Auth SecretManagementClient and SAMLHandler no longer use a code fallback; require config or SECRET_MANAGEMENT_SERVICE_URL; fail fast when missing.
- **Test mocks:** localhost/example.com in test files (e.g. RecommendationsService.test.ts, integration-processors consumers) are acceptable.
- **Placeholder URLs:** search-service and web-search use `https://example.com/...` for fallback result URLs; auth/utility-services/notification-manager use config-first with localhost:3000 fallback for app/frontend URL. Consider config-driven base URL for search fallbacks in production.
- **Tenant isolation:** tenantId in queries, X-Tenant-ID on routes — in place across 481 files; continue to validate high-value paths.

### 4.4 Module Structure

- **integration-processors:** No openapi.yaml; entry is src/index.ts (worker). Acceptable for worker pattern; document in README.
- **ui:** No openapi.yaml (frontend). Acceptable.

### 4.5 utility-services vs notification-manager

- **utility-services:** NotificationEngine, EmailService, FCMProvider, Twilio, TemplateEngine, etc.
- **notification-manager:** Documented notification/event-driven alerting.
- **Gap:** Clarify whether utility-services implements notification-manager or is a separate “utility” module.

---

## 5. Summary Matrices

### 5.1 By Severity

| Severity | Count | Examples |
|----------|-------|----------|
| **Critical** | 1 | Azure ML real models verification |
| **High** | 12+ | Vector: per-shard-type, Change Feed; ML-risk/forecast; migration: conversation, risk-evaluation, vectorization, shard-embedding; llm-service tests |
| **Medium** | 12+ | Assumption tracking; validation/rollout; re-embedding; forecast accuracy; rate limiting; document advanced; search-service placeholder URL |

### 5.2 By Domain

| Domain | Critical | High | Medium |
|--------|----------|------|--------|
| Migration | 2 | 4 | 6+ |
| Integrations | 1 | 1 | 1 |
| Embeddings/Vector | 0 | 3 | 2 |
| CAIS | 0 | 0 | 1 |
| Risk | 0 | 1 | 1 |
| ML/Forecasting | 1 | 2 | 2 |
| BI Sales Risk | 1 | 1 | 1 |
| Infra/Standards | 1 | 2 | 2 |

---

## 6. Recommended Actions

### 6.1 Immediate

1. **Auth:** Resolved — hardcoded fallback removed; SecretManagementClient and SAMLHandler require config or SECRET_MANAGEMENT_SERVICE_URL and fail fast when missing.
2. **Embedding templates:** Resolved (Option B) — data-enrichment documented as owner; embeddings and data-enrichment READMEs updated.
3. **Azure ML:** In ml-service: verify azure_ml.endpoints and AzureMLClient use **real** Managed Endpoints; verify training jobs produce registered/deployed models.
4. **Outcome Data Lake:** Confirm opportunity.outcome.recorded is consumed and written to `/ml_outcomes/...` and that outcome_sync/data_lake config is correct.

### 6.2 Short Term (Weeks 1–4)

1. **OAuth token refresh:** Resolved — worker/timer implemented and documented in integration-sync README and SYSTEM_GAP_ANALYSIS.
2. **Stub containers:** Resolved — bug-detection removed from the system.
3. **Tests:** Add tests for llm-service (only container without tests); run coverage and aim for 80%.

### 6.3 Medium Term (Months 1–2)

1. **Migration:** Prioritize vectorization, shard-embedding, shard-relationship, acl, integration-catalog, adapter-manager after overlap resolution.
2. **Tests:** Raise coverage toward 80%; add tenant isolation and event tests for BI/risk.
3. **Content & document:** Placeholder extraction, multi-format, chart generation; document preview, PII redaction, virus scanning (per product priority).
4. **ML:** Forecast accuracy tracking (MAPE, bias, R²); continuous learning/retraining pipeline; SHAP where useful.

### 6.4 Ongoing

1. **Adaptive-learning:** Audit 22 sub-services; implement or explicitly defer each.
2. **Observability:** All BI/risk containers in scrape-config; runbooks aligned with implementation.
3. **Standards:** Periodic checks for hardcoded URLs/ports and tenant isolation.

---

## 7. References

- `IMPLEMENTATION_STATUS.md` – Container implementation status  
- `MISSING_FEATURES_DETAILED_REPORT.md` – Integrations, vector, CAIS, risk, forecasting, ML  
- `documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md` – Phases 1–2  
- `documentation/requirements/BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md` – buildVector, features  
- `documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md` – Parquet, paths, outcome  
- `documentation/requirements/BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md` – Python, Azure ML  
- `documentation/global/ModuleImplementationGuide.md` – Structure, config, events, tests  
- `deployment/monitoring/README.md` – Prometheus, Grafana, runbooks  

---

*Report generated 2026-02-01. Scan: 55 Dockerfiles, 53 openapi, 53 containers with tests; llm-service only container without tests. Auth, OAuth token refresh, embedding templates (Option B), and stub containers (removed) resolved.*
