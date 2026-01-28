# System-Wide Gap Analysis

**Date:** 2026-01-25  
**Scope:** All containers, requirements (BI Sales Risk, feature docs), migration (old_code → containers), standards (ModuleImplementationGuide, .cursorrules)

---

## 1. Executive Summary

| Dimension | Status | Gaps |
|-----------|--------|------|
| **Containers** | 53 in `containers/` | 2 stub-only (bug-detection, code-generation); utility-services may duplicate notification-manager |
| **Migration** | ~15% from old_code | ~208 services remaining; ~85% of legacy not migrated |
| **Features** | ~60% complete per docs | Content generation, document advanced, integrations scheduling, push notifications |
| **BI Sales Risk** | Phases 1–2 mostly in place | Azure ML real models, CAIS wiring, embedding templates, automatic risk triggers |
| **Standards** | Largely compliant | Test coverage &lt;80%; some config/URL verification needed |
| **Observability** | Implemented for BI/risk | Prometheus/Grafana/runbooks present; /metrics in key containers |

**Critical gaps:** CAIS not wired into risk/ml/forecasting; embedding templates not used; automatic risk triggers; Azure ML real training/deployment; sync scheduling and OAuth token refresh; stub containers (bug-detection, code-generation).

---

## 2. Migration Gaps (old_code → containers)

### 2.1 Progress

- **Migrated:** 53 containers (foundation, data, AI, risk, integrations, net-new)
- **Remaining in old_code:** ~208 services; many in `old_code/apps/api/src/services/`

### 2.2 High-Priority Unmigrated

| Service | Priority | Notes |
|---------|----------|-------|
| **enrichment** | High | Overlap with data-enrichment—verify |
| **vectorization** | High | Needed for embeddings/search |
| **shard-embedding** | High | Links shards to embeddings |
| **conversation** | Critical | 5,292 lines; overlap with ai-conversation—verify |
| **ai-context-assembly** | Critical | Overlap with context-service—verify |
| **risk-evaluation** | High | 2,508 lines; overlap with risk-analytics—verify |

### 2.3 Adaptive Learning (22 services)

Documented as part of `adaptive-learning`; needs **verification** that all 22 (adaptive-weight-learning, outcome-collector, meta-learning, causal-inference, etc.) are implemented or stubbed in that container.

### 2.4 Overlaps to Resolve

Before migrating, confirm feature parity:

- **conversation** ↔ ai-conversation  
- **ai-context-assembly** ↔ context-service  
- **grounding, intent-analyzer, conversation-summarization** ↔ ai-conversation  
- **enrichment** ↔ data-enrichment  
- **risk-evaluation, risk-catalog** ↔ risk-analytics, risk-catalog  
- **bidirectional-sync, sync-task** ↔ integration-sync  
- **import-export** ↔ utility-services  

---

## 3. Feature Gaps (Documented vs Implemented)

### 3.1 Integrations

| Feature | Status | Gap |
|---------|--------|-----|
| Sync workers as Azure Functions | Different | Implemented as containers; no Azure Functions |
| Event Grid + Service Bus | Different | RabbitMQ only (per plan) |
| **Automatic sync scheduling** | Missing | No timer-based scheduler; manual triggers only |
| **OAuth token auto-refresh** | Missing | No dedicated token refresh worker |
| Real-time write-back | Partial | Events exist; full write-back flow needs verification |
| Rate limiting / integration limits | Partial | May not be enforced in all sync paths |

### 3.2 Vector Search & Embeddings

| Feature | Status | Gap |
|---------|--------|-----|
| **Embedding template integration** | Missing | Templates exist but **not used** by embedding generation or vector search |
| Per-shard-type model selection | Partial | c_opportunity/c_account/c_contact quality model not clearly applied |
| Field-weighted relevance | Missing | All fields treated equally |
| Embedding processor (Change Feed) | Unclear | Auto-embed on shard change needs verification |
| Re-embedding jobs | Missing | No batch/scheduled re-embed when templates/models change |

### 3.3 CAIS (Adaptive Learning)

| Feature | Status | Gap |
|---------|--------|-----|
| **Service integration** | Critical | CAIS services exist; **not confirmed** called by risk-analytics, ml-service, forecasting |
| **Outcome collection** | High | `recordPrediction`/`recordOutcome` may not be used in prediction paths |
| Adaptive weight usage | High | Services may still use hardcoded weights |
| Model selection integration | Medium | adaptive-learning → ai-service/ml-service not verified |
| Validation & rollout | Medium | Gradual rollout/rollback not clearly active |

### 3.4 Risk Analysis

| Feature | Status | Gap |
|---------|--------|-----|
| **Automatic risk evaluation triggers** | Critical | On opportunity/shard/catalog change — **not automatic**; manual API only |
| ML-based risk scoring | High | ml-service has endpoint; integration with RiskEvaluationService unclear |
| Assumption tracking & display | Partial | Object exists; not consistently populated or shown in UI |
| CAIS in risk evaluation | High | May still use hardcoded weights |

### 3.5 Pipeline Forecasting & ML

| Feature | Status | Gap |
|---------|--------|-----|
| **ML-powered revenue forecasting** | Critical | Forecasting service; ML integration and P10/P50/P90 unclear |
| **Azure ML (training + endpoints)** | Critical | Scripts and jobs exist; **real trained models and Managed Endpoints** need verification |
| Feature store | Partial | FeatureService.buildVectorForOpportunity exists; versioning/reuse unclear |
| Forecast accuracy tracking | Missing | No MAPE/bias/R² over time |
| Continuous learning / retraining | Missing | No automated retraining pipeline |
| SHAP / model explainability | Partial | Top drivers from buildVector; SHAP not integrated |

### 3.6 Content Generation, Document Management, Notifications

| Feature | Status | Gap |
|---------|--------|-----|
| Placeholder extraction, multi-format, chart generation | Missing | Per FEATURE_COMPARISON_REPORT |
| Document: preview, PII redaction, virus scanning | Missing | Deferred per docs |
| Push notifications | Missing | FCM etc. in utility-services; relationship to notification-manager unclear |
| Document chunking (Azure Function) | Different | Not a separate Function; may be in embeddings/doc |

---

## 4. BI Sales Risk Plan Gaps

### 4.1 Implemented (Plan Phases 1–2)

- **DataLakeCollector:** `risk.evaluated` → Parquet `/risk_evaluations/...`; `ml.prediction.completed` → `/ml_inference_logs/...`
- **buildVectorForOpportunity:** ml-service `FeatureService` + shard-manager, risk-analytics (risk-snapshots)
- **Batch jobs:** `workflow.job.trigger` → `bi_batch_jobs`; BatchJobScheduler (workflow-orchestrator), BatchJobWorker (risk-analytics): risk-snapshot-backfill, outcome-sync, industry-benchmarks, risk-clustering, account-health, propagation, model-monitoring
- **risk_snapshots:** Cosmos, RiskSnapshotService, `risk.evaluated`→upsert, backfill from Data Lake
- **outcome-sync, opportunity.outcome.recorded:** BatchJobWorker + RiskAnalyticsEventConsumer → `/ml_outcomes/...`; publish on shard/integration update when IsClosed
- **Training scripts:** prepare_training_data, train/score (risk_scoring, win_probability, lstm, prophet, anomaly); Azure ML job YAMLs
- **Observability:** /metrics (prom-client) in risk-analytics, workflow-orchestrator, etc.; Prometheus scrape-config; Grafana (bi-risk-overview, ml-service, batch-jobs); runbooks (model-monitoring, backfill-failure, consumer-scaling, etc.)

### 4.2 Gaps vs Plan

| Item | Plan Reference | Gap |
|------|----------------|-----|
| **Azure ML real models** | §5, §5.6 | Training scripts/jobs exist; **deployed Managed Endpoints and real inference** need verification |
| **Automatic risk evaluation** | §9.1, §4.1 | risk.evaluated on opportunity create/update — **event-driven trigger not confirmed**; may be manual only |
| **CAIS in risk/ml/forecasting** | Plan, CAIS docs | adaptive-learning exists; **calls from risk-analytics, ml-service, forecasting** not verified |
| **Embedding templates** | FEATURE_PIPELINE, embeddings | Template system **not used** in embedding generation or vector search |
| **outcome.join in Data Lake** | DATA_LAKE_LAYOUT §2.4 | prepare_training_data joins risk_evaluations+ml_outcomes; **ml_outcomes** population via outcome-sync/opportunity.outcome.recorded — confirm writer and paths |
| **Competitors catalog** | Plan §3.1.2 | `competitors` / risk_competitor_tracking — implementation level TBD |
| **HITL, model governance, 3-tier audit** | Plan §4, runbooks | Runbooks exist; **implementation in services** to verify |

---

## 5. Infrastructure & Standards Gaps

### 5.1 Stub-Only Containers

| Container | Gap |
|-----------|-----|
| **bug-detection** | README only; no `src/`, `server.ts`, `config/`, Dockerfile, tests |
| **code-generation** | README only; same |

**Action:** Implement per ModuleImplementationGuide or remove/archive.

### 5.2 Test Coverage

- **Target:** ≥80% (ModuleImplementationGuide §12)
- **Current:** Unit tests in 17/17 “new” containers; integration in 7 critical; **coverage % not at 80%**
- **Gap:** Expand tests (edge cases, errors, tenant isolation, events) and measure coverage.

### 5.3 Config & Compliance

- **Hardcoded ports/URLs:** .cursorrules forbid; need spot-checks across all containers.
- **Tenant isolation:** tenantId in queries, X-Tenant-ID on routes — generally in place; **validate** high-value paths (risk, ml, logging, shard-manager).

### 5.4 utility-services vs notification-manager

- **utility-services** contains: NotificationEngine, EmailService, FCMProvider, Twilio (SMS/Voice/WhatsApp), TemplateEngine, etc.
- **notification-manager** is the documented notification/event-driven alerting.
- **Gap:** Possible duplication or mis-scoping; **clarify** whether utility-services is the implementation of notification-manager or a separate “utility” module.

---

## 6. Summary Matrices

### 6.1 By Severity

| Severity | Count | Examples |
|----------|-------|----------|
| **Critical** | 8 | CAIS not wired; embedding templates unused; auto risk triggers; Azure ML real models; sync scheduling; OAuth token refresh; stub containers |
| **High** | 14 | Vector: per-shard-type, Change Feed; CAIS outcome/weights; ML-risk integration; forecast ML; migration: conversation, risk-evaluation, vectorization, shard-embedding |
| **Medium** | 12+ | Assumption tracking; validation/rollout; re-embedding; forecast accuracy; rate limiting; document advanced (preview, PII, virus); industry seasonality |

### 6.2 By Domain

| Domain | Critical | High | Medium |
|--------|----------|------|--------|
| Migration | 2 | 4 | 6+ |
| Integrations | 2 | 2 | 1 |
| Embeddings/Vector | 1 | 3 | 2 |
| CAIS | 1 | 2 | 1 |
| Risk | 1 | 2 | 1 |
| ML/Forecasting | 2 | 2 | 2 |
| BI Sales Risk | 2 | 2 | 1 |
| Infra/Standards | 2 | 1 | 2 |

---

## 7. Recommended Actions

### 7.1 Immediate (Verification)

1. **CAIS:** Grep/code review: risk-analytics, ml-service, forecasting → adaptive-learning (getWeights, recordOutcome, model selection). Confirm or add calls.
2. **Embedding templates:** In embeddings (and any code that generates vectors): ensure EmbeddingTemplateService and per-shard-type model selection are used.
3. **Automatic risk evaluation:** In risk-analytics and/or workflow: subscribe to `shard.updated` (c_opportunity) and `integration.opportunity.updated`; call evaluate and publish `risk.evaluated`. Confirm or implement.
4. **Azure ML:** In ml-service: confirm `azure_ml.endpoints` and AzureMLClient hit **real** Managed Endpoints; verify training jobs produce registered/deployed models.
5. **Outcome Data Lake:** Confirm `opportunity.outcome.recorded` is consumed and written to `/ml_outcomes/...` (RiskAnalyticsEventConsumer / OutcomeDataLakeWriter or equivalent) and that `outcome_sync.tenant_ids` and `data_lake` are configured where needed.

### 7.2 Short Term (Weeks 1–4)

1. **Integrations:** Implement timer-based sync scheduler (cron or similar) and OAuth token refresh worker; both via existing RabbitMQ/container pattern.
2. **Stub containers:** Implement bug-detection and code-generation to ModuleImplementationGuide minimum, or move to an “archive/optional” area.
3. **Migration overlaps:** For conversation, ai-context-assembly, enrichment, risk-evaluation, sync-task, import-export: compare old_code vs containers; document parity or missing pieces; then migrate only the delta or mark “covered by container.”

### 7.3 Medium Term (Months 1–2)

1. **Migration:** Prioritize vectorization, shard-embedding, shard-relationship, acl, integration-catalog, integration-connection, adapter-manager after overlap resolution.
2. **Tests:** Raise unit/integration coverage toward 80%; add tenant isolation and event publish/consume tests for BI/risk.
3. **Content & document:** Per product priority: placeholder extraction, multi-format, chart generation; document preview, PII redaction, virus scanning.
4. **ML:** Forecast accuracy tracking (MAPE, bias, R²); continuous learning/retraining pipeline; SHAP where useful.

### 7.4 Ongoing

1. **Adaptive-learning:** Audit 22 sub-services; implement or explicitly defer each.
2. **Observability:** Ensure all BI/risk containers expose /metrics and are in scrape-config; keep runbooks aligned with implementation.
3. **Standards:** Periodic checks for hardcoded URLs/ports and tenant isolation.

---

## 8. References

- `IMPLEMENTATION_STATUS.md` – Container implementation status  
- `MIGRATION_REMAINING_REPORT.md` – old_code migration backlog  
- `FEATURE_COMPARISON_REPORT.md` – Documented vs implemented features  
- `MISSING_FEATURES_DETAILED_REPORT.md` – Integrations, vector, CAIS, risk, forecasting, ML  
- `documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md` – Phases 1–2  
- `documentation/requirements/BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md` – buildVector, features  
- `documentation/requirements/BI_SALES_RISK_DATA_LAKE_LAYOUT.md` – Parquet, paths, outcome  
- `documentation/requirements/BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md` – Python, Azure ML  
- `documentation/global/ModuleImplementationGuide.md` – Structure, config, events, tests  
- `deployment/monitoring/README.md` – Prometheus, Grafana, runbooks  

---

*Report generated 2026-01-25. Re-run verification steps and re-scan after implementing recommended actions.*
