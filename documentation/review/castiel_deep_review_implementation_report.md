# Castiel Deep Review — Implementation Verification Report

**Report Date:** February 3, 2026  
**Source Document:** `documentation/review/castiel_deep_review.md`  
**Scope:** Verify review claims against current codebase

---

## Executive Summary

The deep review document is **largely accurate** but **outdated in several important areas**. The current implementation has added **feature versioning**, **feature quality/drift monitoring**, and **model monitoring (PSI/Brier/MAE)** in ml-service since the review. The review’s critical findings on **SHAP** and **automated retraining** remain valid; **referenced docs** and **port conflicts** have been addressed (see §2.5, §2.6).

| Category | Review Claim | Current Reality |
|----------|--------------|-----------------|
| Feature versioning | ❌ Not implemented | ✅ **Implemented** (FeatureVersionManager, pin/deprecate/resolve, APIs, UI) |
| Feature drift | ❌ Not implemented | ✅ **Implemented** (FeatureQualityMonitor: drift, missing rate, outliers) |
| SHAP explainability | ❌ Missing | ✅ **Still missing** (SHAP-like structure in risk-analytics only; no SHAP library) |
| Automated retraining | ❌ Missing | ✅ **Still missing** (ContinuousLearningService suggests only; no workflow) |
| Referenced docs | Missing | ✅ **Resolved** (index + stubs in documentation/review/) |
| Port conflicts | 3034 conflict | ✅ **Confirmed** (context-service & configuration-service both default 3034; others too) |
| DataLakeCollector / MLAuditConsumer | ✅ Present | ✅ **Confirmed** (logging service) |
| Model-monitoring location | In risk-analytics? | **Clarified:** Trigger in risk-analytics BatchJobWorker; **execution in ml-service** (POST /api/v1/ml/model-monitoring/run) |

---

## 1. Corrections to the Review (Implementation Now Present)

### 1.1 Feature Versioning (Layer 2) — **IMPLEMENTED**

**Review stated:** "No feature versioning visible", "No feature pinning mechanism", "No feature lineage tracking".

**Current implementation:**

- **FeatureVersionManager** (`containers/ml-service/src/services/FeatureVersionManager.ts`): `pinVersion`, `unpinVersion`, `deprecateVersion`, `resolveVersion`, `listMetadata`, `upsertMetadata`.
- **APIs:** `GET/POST /api/v1/ml/features/versions`, `GET /api/v1/ml/features/versions/resolve`, `POST .../versions/pin`, `POST .../versions/deprecate`, `GET /api/v1/ml/features/version-policy`.
- **Config:** `feature_version_policy` in ml-service `config/default.yaml` (versioningStrategy, backwardCompatibility, deprecationPolicy).
- **Feature store:** `FeatureStoreService` uses `featureVersion`; cache key and Cosmos queries include version.
- **UI:** `/admin/feature-engineering/versioning` and features page call these APIs.

**Verdict:** The review’s Layer 2 “no feature versioning” finding is **outdated**. Versioning and pinning exist; lineage is metadata-based (no full lineage graph).

---

### 1.2 Feature Quality / Drift (Layer 2) — **IMPLEMENTED**

**Review stated:** "No feature drift detection", "No feature quality monitoring".

**Current implementation:**

- **FeatureQualityMonitor** (`containers/ml-service/src/services/FeatureQualityMonitor.ts`): `computeStatistics`, `checkQuality`; issues include `missing_rate`, `outlier`, `drift`; thresholds from config (`feature_quality_rules`, `driftThreshold`).
- **APIs:** `GET /api/v1/ml/features/statistics`, `POST /api/v1/ml/features/export`, and quality/drift checks.
- **Config:** `feature_quality_rules` (missingRateThreshold, driftThreshold, outlierMethod, outlierNStd).

**Verdict:** Feature-level drift and quality monitoring **are implemented**. The review’s “no feature drift detection” is **outdated**.

---

### 1.3 Model Monitoring (PSI, Brier, MAE) — **IN ML-SERVICE**

**Review stated:** "Why is model-monitoring in risk-analytics? Should be in ml-service."

**Current implementation:**

- **ml-service:** `ModelMonitoringService` runs PSI (from Data Lake `/ml_inference_logs`), Brier and MAE (from `ml_evaluations`). Publishes `ml.model.drift.detected` and `ml.model.performance.degraded`. `POST /api/v1/ml/model-monitoring/run` (body `{ tenantIds?: string[] }`).
- **risk-analytics:** `BatchJobWorker` consumes `workflow.job.trigger` for job type `model-monitoring` and **calls** ml-service `POST /api/v1/ml/model-monitoring/run`. So risk-analytics only **triggers** the job; **execution is in ml-service**.

**Verdict:** Review’s concern is **partially addressed**: ownership is correct (ml-service); only the trigger lives in risk-analytics, which is consistent with other batch jobs.

---

## 2. Confirmations (Review Correct)

### 2.1 SHAP Explainability

- **risk-analytics:** `ExplainabilityService` builds a `shapValues`-like `Record<string, number>` from factors (positive/negative); no SHAP library.
- **ml-service:** Comments refer to "Phase 2: tree importance or SHAP"; no SHAP library or SHAP value computation.
- **Verdict:** Review correct: **no SHAP library integration**; explainability is factor-based / magnitude-based, not SHAP.

### 2.2 Automated Model Retraining (Layer 8)

- **ContinuousLearningService** in ml-service: stores improvement suggestions (e.g. type `retrain`), publishes `ml.improvement.suggested`; **does not trigger retraining**.
- No workflow or job that consumes feedback/outcomes and runs training.
- **Verdict:** Review correct: **no automated retraining pipeline**.

### 2.3 DataLakeCollector and MLAuditConsumer

- **logging** service: `DataLakeCollector` and `MLAuditConsumer` exist; config `data_lake.connection_string`, queues/bindings; Parquet and audit blob paths documented.
- **Verdict:** Review correct: **BI Risk Data Lake integration is present**.

### 2.4 Azure ML Deployment Status

- ml-service `config/default.yaml`: `azure_ml.endpoints` use empty strings or env vars (e.g. `AZURE_ML_ENDPOINT_*`); no evidence of deployed endpoints in repo.
- **Verdict:** Review correct: **deployment status unclear**; config is placeholder/env-driven.

### 2.5 Referenced Documentation — **RESOLVED**

- Referenced in project/docs: `CAIS_ARCHITECTURE.md`, `ML_OPERATIONAL_STANDARDS.md`, `IMPLEMENTATION_STATUS_AND_PLAN.md`, `COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY.md`.
- **Resolution:** (1) **DOCUMENTATION_STATUS.md** includes a “Referenced Document Names” table mapping each name to the canonical doc (e.g. CAIS_ARCHITECTURE → global/Architecture.md, IMPLEMENTATION_STATUS_AND_PLAN → repo root IMPLEMENTATION_STATUS.md). (2) **Stub files** in `documentation/review/` with these exact names redirect to the canonical locations so links from the deep review resolve.
- **Verdict:** **Referenced docs are linked/resolved** via the index and review stubs; no standalone CAIS_ARCHITECTURE or ML_OPERATIONAL_STANDARDS file existed before; equivalents (Architecture.md, ModuleImplementationGuide.md, etc.) are now discoverable.

### 2.6 Port Default Conflicts — **RESOLVED**

- **Previously:** context-service and configuration-service (3034); reasoning-engine and ai-conversation (3045); validation-engine and prompt-service (3036); template-service and pattern-recognition (3037); api-gateway and notification-manager (3001); integration-processors and ui (3000).
- **Resolution (config defaults):** configuration-service → 3038; reasoning-engine → 3040; prompt-service → 3039; pattern-recognition → 3041; api-gateway → 3002 (UI api.base_url → 3002); integration-processors → 3064. context-service (3034), ai-conversation (3045), validation-engine (3036), template-service (3037), notification-manager (3001), ui (3000) unchanged.
- **Verdict:** **Default port conflicts have been resolved**; each service has a unique default in `config/default.yaml`. Runtime remains correct when `PORT` is set per service (e.g. docker-compose).

### 2.7 Service Count

- **containers/** lists many directories; several are stubs (e.g. cache-management, collaboration-intelligence, compliance-service, dashboard-analytics, migration-service, performance-optimization, security-service with minimal content or only Dockerfile).
- Unique, substantive service containers are on the order of **~45–50**, not "100+".
- **Verdict:** Review’s “~48” and “100+ overstated” remain **reasonable**.

### 2.8 BuildVectorForOpportunity and Feature Store

- **FeatureService.buildVectorForOpportunity** exists; used for win-probability, risk-scoring, anomaly; config `services.shard_manager.url`, `services.risk_analytics.url`, `feature_pipeline`.
- Feature store APIs and Cosmos containers (`ml_feature_snapshots`, `ml_feature_metadata`) exist.
- **Verdict:** Review’s “feature logic in ml-service” and “buildVector exists” are **correct**. “130+ features” and “feature catalog” are still **not verified** in code/docs.

### 2.9 Learning-Service Events

- **FeedbackLearningEventPublisher:** `feedback.recorded`, `outcome.recorded`, `feedback.trend.alert` (from logs-events / code).
- **Verdict:** Review’s Layer 7 description is **accurate**.

### 2.10 Shard Update Consumers

- **data-enrichment,** **risk-analytics,** **recommendations,** **workflow-orchestrator,** **integration-sync,** **ai-conversation** consume `shard.updated` and/or `shard.created` per config.
- **Verdict:** Review’s event flow description is **correct**. No debouncing/rate-limiting found in config or in the checked code.

---

## 3. Configuration and Standards

- **Ports:** All checked services use **config-driven** ports (`server.port: ${PORT:-...}` in YAML); no hardcoded ports in code. Aligns with .cursorrules.
- **Service URLs:** Service-to-service URLs come from config (e.g. `services.shard_manager.url`, env overrides); no hardcoded service URLs in the files checked.

---

## 4. Summary Table

| Topic | Review Said | Verified |
|-------|-------------|----------|
| Feature versioning | Not implemented | **Implemented** (FeatureVersionManager, APIs, UI, config) |
| Feature drift / quality | Not implemented | **Implemented** (FeatureQualityMonitor) |
| SHAP | Missing | **Missing** (SHAP-like only in risk-analytics) |
| Automated retraining | Missing | **Missing** |
| DataLakeCollector / MLAuditConsumer | Present | **Present** (logging) |
| Model-monitoring ownership | Unclear / in risk-analytics | **Trigger** in risk-analytics, **execution** in ml-service |
| Referenced docs | Missing | **Resolved** (index in DOCUMENTATION_STATUS.md + stubs in documentation/review/) |
| Port conflicts | 3034 | **Resolved** (unique defaults: 3038, 3040, 3039, 3041, 3002, 3064) |
| Service count ~48 vs 100+ | Overstated | **Confirmed** (~45–50 substantive containers) |
| buildVectorForOpportunity | Exists in ml-service | **Confirmed** |
| Learning-service events | feedback/outcome/trend | **Confirmed** |

---

## 5. What Is Missing and Should Be Implemented

The following list is derived from the deep review and verification. Items already implemented (e.g. feature versioning, feature quality/drift) are excluded. Effort is indicative.

### 5.1 Critical priority

| # | Item | Description | Owner | Effort |
|---|------|-------------|--------|--------|
| 1 | **SHAP explainability** | Integrate SHAP (or equivalent) in ml-service; compute feature contributions per prediction; expose in APIs (e.g. win-probability/explain, risk-scoring); optionally use LLM to narrate contributions. | ML Engineer | ~2 weeks |
| 2 | **Azure ML deployment validation** | Confirm whether Azure ML endpoints are deployed; document model versions, training dates, performance; if not deployed, mark as “Planned” in project description; if deployed, add monitoring/dashboards. | ML Engineer + DevOps | ~1 week |
| 3 | **Feature catalog** | Document feature set (e.g. 130+ across categories); align with `buildVectorForOpportunity` and feature store; publish in docs or admin. | ML Engineer + Tech Writer | ~1 week |
| 4 | **Model–feature version pinning** | Pin each model (or training run) to a specific feature version so training and serving use the same feature set; reduce training/serving skew risk. | ML Engineer | ~1 week |

### 5.2 High priority

| # | Item | Description | Owner | Effort |
|---|------|-------------|--------|--------|
| 5 | **Automated model retraining (Layer 8)** | Workflow/job that triggers retraining from: learning-service feedback/outcomes, outcome-sync data, model performance degradation (e.g. from model-monitoring). Consume `ml.improvement.suggested` or feedback/outcome events; call training pipeline (e.g. ml-service scripts / Azure ML). | ML Engineer + Backend | ~4 weeks |
| 6 | **A/B testing for models** | Ability to run new model alongside current; traffic split; metrics comparison; promotion/rollback. | ML Engineer + Backend | ~2–3 weeks |
| 7 | **Model rollback** | Safe rollback to a previous model version when performance degrades or drift is detected; integrate with model-monitoring and deployment. | ML Engineer + DevOps | ~1–2 weeks |
| 8 | **Feedback → retraining link** | Explicit flow from learning-service (`feedback.recorded`, `outcome.recorded`) and risk-analytics outcome-sync to model retraining or improvement suggestions; document and/or automate. | Backend + ML Engineer | ~2 weeks |

### 5.3 Medium priority

| # | Item | Description | Owner | Effort |
|---|------|-------------|--------|--------|
| 9 | **Port default conflicts** | ~~Resolve duplicate default ports~~ **Done.** Unique defaults assigned: configuration-service 3038, reasoning-engine 3040, prompt-service 3039, pattern-recognition 3041, api-gateway 3002 (UI→3002), integration-processors 3064. | Backend / DevOps | — |
| 10 | **Shard update debouncing** | Debounce or batch `shard.updated` handling to avoid thundering herd when many services react; optional priority queue for critical vs non-critical updates; add metrics for event volume. | Backend Engineer | ~2 weeks |
| 11 | **Prediction result caching** | Cache ML prediction results (e.g. Redis) by (tenantId, opportunityId, modelId, featureVersion) to reduce latency and Azure ML load; document TTL and invalidation. | Backend / ML Engineer | ~1 week |
| 12 | **Shard-manager read cache** | Read-through or cache layer for shard-manager to reduce hot partition risk and latency for high-read scenarios. | Backend Engineer | ~1–2 weeks |
| 13 | **Data governance** | Data retention policies at data layer (e.g. shard-manager); optional data lineage beyond shards; PII detection integration (e.g. security-scanning on shard write); data quality SLA checks in pipelines. | Backend + Security | ~2–3 weeks |
| 14 | **Missing referenced docs** | ~~Add or link~~ **Done.** DOCUMENTATION_STATUS.md has a “Referenced Document Names” table; stubs in documentation/review/ (CAIS_ARCHITECTURE.md, ML_OPERATIONAL_STANDARDS.md, IMPLEMENTATION_STATUS_AND_PLAN.md, COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY.md) redirect to canonical docs. | Tech Writer + Architect | — |
| 15 | **Service count and docs** | ~~Align project description~~ **Done.** documentation/README.md: service count set to ~45–50 with methodology; API Gateway default port 3002 reflected in documentation/README.md, containers/README.md, containers/api-gateway.md, CONTAINER_PURPOSE_AND_INTEGRATION.md, CURRENT_STATE.md, containers/ui.md, gap-analysis, reorg copy. | Tech Writer | — |

### 5.4 Lower priority / optional

| # | Item | Description |
|---|------|-------------|
| 16 | **AutoML integration** | If “AutoML for small team” is a goal: integrate Azure AutoML or equivalent for training; document where and how it is used. |
| 17 | **Real-time streaming analytics** | If “real-time” must mean streaming (not only event-driven): consider stream processing (e.g. windowing, aggregations) and document scope. |
| 18 | **Job registry pattern** | Decouple workflow-orchestrator from specific workers: registry of job types → handlers; workers register; reduces coupling and eases adding new batch jobs. |
| 19 | **Service consolidation** | **Addressed.** llm-service and reasoning-engine merged into ai-service; ai-analytics into analytics-service; embeddings owns shard-embedding generation, data-enrichment does enrichment only and calls embeddings; architecture docs and diagrams updated. |
| 20 | **Feature computation tests** | Automated tests that assert training and serving use the same feature computation (e.g. same code path or contract) to guard against training/serving skew. |

### 5.5 Summary

- **Critical (4):** SHAP, Azure ML validation, feature catalog, model–feature version pinning.
- **High (4):** Automated retraining, A/B testing, model rollback, feedback→retraining link.
- **Medium (7):** Port conflicts, shard debouncing, prediction cache, shard-manager cache, data governance, missing docs, service count/docs.
- **Lower/optional (5):** AutoML, streaming analytics, job registry, service consolidation (done), feature computation tests.

Estimated order of magnitude to address critical + high: **~12–16 weeks** with focused ownership; medium items add **~8–12 weeks** depending on scope.

---

## 6. Recommendations for the Review Document

1. **Update Part 2 (Layer 2):**  
   - State that **feature versioning** (pin, deprecate, resolve, version-policy) and **feature quality/drift** (FeatureQualityMonitor, statistics, checkQuality) **are implemented**.

2. **Update Section 3.2 (Batch Job / model-monitoring):**  
   - Clarify that **model-monitoring execution** is in **ml-service** (`ModelMonitoringService`, `POST /api/v1/ml/model-monitoring/run`); risk-analytics BatchJobWorker only **triggers** it.

3. **Keep as-is:**  
   - SHAP (missing), automated retraining (missing), service count, Azure ML deployment status, and Data Lake / learning-service / shard flows. (Referenced docs and port conflicts are now resolved.)

4. **Optional:**  
   - Add a short “Implementation changes since review” section listing feature versioning, feature quality/drift, and model-monitoring clarification.

---

**END OF IMPLEMENTATION VERIFICATION REPORT**
