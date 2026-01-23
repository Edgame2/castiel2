# ML Integration: Answers & Essential Questions

**Date:** 2025-01-28  
**Purpose:** Comprehensive answers based on codebase analysis and essential questions for ML implementation

---

## Executive Summary

This document provides:
1. **Answered Questions**: Based on codebase analysis and best practices
2. **Essential Questions**: Critical decisions needed before implementation
3. **Recommendations**: Best practices aligned with small-team, Azure-first architecture

**Confidence Level**: **90%** for implementation after answering essential questions.

---

## Compound AI System (CAIS) Integration

### CAIS Architecture Context

The ML integration is part of a larger **Compound AI System (CAIS)** architecture. The ML models are **components** within the CAIS, not the CAIS itself.

**CAIS Principle**: ML predicts, LLM explains, rules constrain, system learns.

### Integration as CAIS Orchestration

The ML integration follows CAIS orchestration patterns:

1. **ML Models** (CAIS Layer 3: Predictive Model) - Learn patterns, make predictions
2. **LLMs** (CAIS Layer 5: LLM Reasoning) - Explain predictions, generate natural language
3. **Rules** (CAIS Layer 6: Decision Engine) - Enforce business logic, provide guardrails
4. **Feedback Loops** (CAIS Layer 7-8) - Collect feedback, improve system

**Integration Pattern**: ML enhances existing rule-based and LLM systems, doesn't replace them. The orchestration combines all methods using weighted ensemble.

### Service Integration in CAIS Context

**RiskEvaluationService** (CAIS Layer 6: Decision & Action Engine):
- **Current**: Orchestrates rule-based + historical + AI risk detection
- **Planned**: Enhanced with ML predictions
- **Role**: Both orchestrator (combines methods) and decision engine (executes actions)

**RecommendationsService** (CAIS Layer 6: Decision & Action Engine):
- **Current**: Orchestrates vector search + collaborative filtering
- **Planned**: Enhanced with ML ranking
- **Role**: Orchestrates multiple recommendation sources, uses LLM for personalization

**ForecastingService** (CAIS Layer 6: Decision & Action Engine):
- **Current**: Rule-based probability-weighted forecasts
- **Planned**: Enhanced with ML forecasts
- **Role**: Combines ML forecasts with LLM scenario analysis

### CAIS Decision Loop

The integration follows the CAIS decision loop:

```
Signals (Opportunity Data)
    ↓
Feature Engineering (CAIS Layer 2)
    ↓
ML Prediction (CAIS Layer 3)
    ↓
Explanation (CAIS Layer 4: SHAP)
    ↓
LLM Reasoning (CAIS Layer 5)
    ↓
Decision & Action (CAIS Layer 6)
    ↓
Feedback (CAIS Layer 7)
    ↓
Learning (CAIS Layer 8)
```

For detailed CAIS architecture, see [CAIS_ARCHITECTURE.md](CAIS_ARCHITECTURE.md).  
For orchestration patterns, see [CAIS_ORCHESTRATION.md](CAIS_ORCHESTRATION.md).

---

## ✅ ANSWERED QUESTIONS (Based on Codebase Analysis)

### 1. Azure Infrastructure & Configuration

#### Q1.1.1 - Q1.1.4: ✅ ANSWERED
- **Workspace**: Create new Azure ML Workspace
- **Subscription/Resource Group**: `main` / `castiel-ml-dev-rg` / `eastus`
- **Key Vault**: Separate Key Vault for ML (security best practice)
- **Authentication**: Managed Identity (already used in codebase for Key Vault)

#### Q1.2.1 - Q1.2.2: ✅ ANSWERED
- **Networking**: Public endpoints (can migrate to private later)
- **Application Insights**: Use existing instance (already configured in `packages/monitoring/src/providers/application-insights.ts`)

#### Q1.2.3: ✅ RECOMMENDED
- **Managed Endpoint Auth**: Managed Identity (system-assigned, aligns with existing infrastructure pattern)
- **Rationale**: Matches existing infrastructure pattern (Container Apps, Key Vault, Cosmos DB all use Managed Identity). More secure than key-based, no key rotation needed.

#### Q1.3.1 - Q1.3.3: ✅ RECOMMENDED
- **Config Storage**: Hybrid approach
  - Environment variables for workspace config (non-sensitive)
  - Azure Key Vault for secrets (endpoint keys, connection strings)
  - Add ML config section to `apps/api/src/config/env.ts` (follows existing pattern)
- **Pattern**: Follow existing config structure in `apps/api/src/config/env.ts`

### 2. Data Integration

#### Q2.1.1: ✅ RECOMMENDED
- **Data Access**: Direct Cosmos DB queries via `ShardRepository` + Feature Store service
- **Rationale**: 
  - `ShardRepository` already handles tenant isolation
  - Feature Store service provides abstraction and caching
  - Redis caching for frequently-used features

#### Q2.1.2: ✅ ANSWERED (Partial - Need Schema Enhancement)
- **Current Schema**: Opportunity fields documented in `apps/api/src/types/core-shard-types.ts`
- **Key Fields Identified**:
  - **Risk Scoring**: `stage`, `status`, `amount`, `expectedRevenue`, `probability`, `closeDate`, `lostReason`, `accountId`, `ownerId`, `createdDate`, `lastActivityDate`
  - **Forecasting**: `amount`, `expectedRevenue`, `probability`, `closeDate`, `stage`, `status`, `currency`, `fiscalYear`, `fiscalQuarter`
  - **Recommendations**: `accountId`, `ownerId`, `type`, `stage`, `amount`, `createdDate`, `lastActivityDate`, `tags`
- **⚠️ ACTION REQUIRED**: Add recommended ML fields to opportunity schema (see Essential Questions)

#### Q2.1.3: ✅ ANSWERED
- **Related Shards**: Use `ShardRelationshipService.getRelatedShards()` (already exists)
- **Finding**: Service already implemented and used by `RiskEvaluationService`

#### Q2.1.4: ✅ ANSWERED
- **Container**: All data in `shards` container (differentiated by `shardTypeId`)
- **Finding**: `config.cosmosDb.containers.shards = 'shards'` in `apps/api/src/config/env.ts`
- **Historical Outcomes**: Same container, identified by `stage = 'closed_won' | 'closed_lost'` or `status = 'won' | 'lost'`
- **Finding**: `PipelineAnalyticsService` queries using `status: ['won']` and `status: ['lost']`

#### Q2.1.5: ✅ ANSWERED
- **Tenant Isolation**: Use existing `tenantId` filtering in repositories
- **Finding**: All repositories already filter by `tenantId` (partition key)

#### Q2.2.1: ✅ RECOMMENDED
- **Feature Store**: New `FeatureStoreService` (clean separation, reusable)
- **Rationale**: Follows existing service pattern, allows independent evolution

#### Q2.2.2: ✅ RECOMMENDED
- **Feature Storage**: Hybrid approach
  - **Cosmos DB**: Feature snapshots with versioning (new container: `ml_features`)
  - **Redis**: Cached features (15-minute TTL, matches RiskEvaluationService cache)
  - **Azure ML Datastore**: Training data exports (versioned)
- **Rationale**: Cosmos DB for persistence, Redis for speed, Azure ML for training

#### Q2.2.3: ✅ RECOMMENDED
- **Feature Versioning**: Store version in feature metadata (Cosmos DB)
- **Phase 1 Minimum**: Feature name + version string (e.g., `risk_score_v1`, `risk_score_v2`)
- **Rationale**: Simple, sufficient for Phase 1. Can enhance with full lineage later.

#### Q2.2.4: ✅ RECOMMENDED
- **Feature Extraction**: Hybrid (cache common features, compute on-demand for rare features)
- **Rationale**: Balances latency and freshness

#### Q2.3.1: ✅ ANSWERED
- **Historical Outcomes**: Query opportunities with `status = 'won' | 'lost'` or `stage = 'closed_won' | 'closed_lost'`
- **Finding**: `PipelineAnalyticsService.calculateClosedWonLost()` uses `status: ['won']` and `status: ['lost']`

#### Q2.3.2: ⚠️ CRITICAL - See Essential Questions
- **User Stated**: "Very little" historical data
- **Impact**: May need to start with rule-based + LLM, gradually add ML as data accumulates

#### Q2.3.3: ✅ RECOMMENDED
- **Data Quality**: Use existing `DataQualityService.validateOpportunityDataQuality()` + ML-specific checks
- **Finding**: `DataQualityService` already exists and is used by `RiskEvaluationService`

#### Q2.3.4: ✅ RECOMMENDED
- **Training Data**: Export to Azure ML Datastore (recommended for large datasets, versioned)
- **Rationale**: Better for training performance, versioning, and reproducibility

#### Q2.3.5: ✅ RECOMMENDED
- **Imbalanced Data**: Use class weights in XGBoost (simpler, no data manipulation needed)
- **Rationale**: XGBoost handles this well, no need for oversampling/undersampling

### 3. Service Integration

#### Q3.1.1: ✅ RECOMMENDED (CAIS Orchestration)
- **Integration Pattern**: Combine rule-based + AI + ML scores (weighted ensemble)
- **CAIS Context**: This is **CAIS Layer 6: Decision & Action Engine** orchestration
- **Rationale**: 
  - ML enhances, doesn't replace (graceful degradation)
  - Weighted ensemble: 50% ML, 30% rule-based, 20% AI (adjustable per tenant)
  - Follows CAIS principle: ML predicts, rules constrain, LLM explains
- **Implementation**: Add ML score as additional detection method in `RiskEvaluationService`
- **Orchestration**: RiskEvaluationService orchestrates all methods, then combines using weighted ensemble (see [CAIS_ORCHESTRATION.md](CAIS_ORCHESTRATION.md))

#### Q3.1.2: ✅ RECOMMENDED (CAIS Principle)
- **ML Role**: Complement existing methods (add ML score to existing methods)
- **CAIS Context**: ML is a **component** of CAIS, not a replacement. CAIS orchestrates ML + LLM + Rules.
- **Rationale**: Maintains backward compatibility, provides fallback, follows CAIS architecture

#### Q3.1.4: ✅ ANSWERED
- **Cache**: Extend existing cache key: `${tenantId}:${opportunityId}`
- **Finding**: `RiskEvaluationService` uses 15-minute cache TTL

#### Q3.1.5: ✅ RECOMMENDED
- **Calibration**: In `ModelService` (post-inference calibration)
- **Rationale**: Keeps calibration separate from model, easier to update

#### Q3.1.6: ✅ RECOMMENDED
- **Async Processing**: Hybrid (sync for real-time, async for batch updates)
- **Rationale**: Real-time for UI, async for bulk operations

#### Q3.2.1: ✅ RECOMMENDED
- **Forecasting Integration**: Add ML forecast as additional scenario
- **Rationale**: Maintains backward compatibility with existing scenarios

#### Q3.2.2: ✅ RECOMMENDED
- **Scenarios**: Add ML forecast as new scenario type (ML_P10, ML_P50, ML_P90)
- **Rationale**: Users can compare ML vs. rule-based scenarios

#### Q3.2.4: ✅ ANSWERED
- **Filters**: Use same filters as `RevenueForecastService`
- **Finding**: `RevenueForecastService.generateForecast()` uses `OpportunityService.listOwnedOpportunities()` with filters

#### Q3.2.5: ✅ RECOMMENDED
- **Uncertainty**: Add `uncertainty` field to `RevenueForecast` interface (backward compatible)
- **Structure**: `{ quantiles: { p10, p50, p90 }, pointForecast: number }`

#### Q3.3.1: ✅ RECOMMENDED
- **Recommendations Integration**: Use ML to re-rank existing recommendations
- **Rationale**: ML improves ranking, existing methods provide diversity

#### Q3.3.2: ✅ RECOMMENDED
- **Recommendation Methods**: Use ML for final re-ranking of all sources
- **Rationale**: Best of both worlds - diversity from existing methods, accuracy from ML

#### Q3.3.4: ✅ ANSWERED
- **Cache**: Extend existing cache: `recommendations:${projectId}:${userId}`
- **Finding**: `RecommendationsService` uses 30-minute cache TTL

#### Q3.4.1: ✅ RECOMMENDED
- **Service Initialization**: New file: `apps/api/src/services/initialization/ml-services.init.ts`
- **Rationale**: Follows existing pattern (see `apps/api/src/services/initialization/`)

#### Q3.4.2: ✅ RECOMMENDED
- **ModelService**: Singleton (shared across requests)
- **Rationale**: Azure ML client is stateless, singleton reduces overhead

#### Q3.4.3: ✅ RECOMMENDED
- **Training Trigger**: Scheduled job (Azure ML Pipeline) + Manual API endpoint
- **Rationale**: Weekly scheduled training + on-demand for testing

#### Q3.4.4: ✅ ANSWERED
- **DI Pattern**: Follow existing constructor injection pattern
- **Finding**: All services use constructor injection (no framework DI)

### 4. API Integration

#### Q4.1.1: ✅ RECOMMENDED
- **Endpoints**: New `/api/v1/ml` routes (recommended)
- **Rationale**: Clean separation, follows existing route structure (`/api/v1/*`)

#### Q4.1.2: ✅ ANSWERED
- **Authentication**: Use existing JWT/auth middleware
- **Finding**: All routes use `authenticate()` middleware from `apps/api/src/middleware/authenticate.ts`

#### Q4.1.3: ✅ RECOMMENDED
- **Backward Compatibility**: New endpoints only + Feature flag to enable/disable ML
- **Rationale**: No breaking changes, gradual rollout per tenant

#### Q4.1.4: ✅ RECOMMENDED
- **Inference Mode**: Both (query parameter: `?async=true`)
- **Rationale**: Sync for UI (<500ms), async for batch/dashboards

#### Q4.2.1: ✅ RECOMMENDED
- **Request Format**: Accept `opportunityId` + `tenantId` (like RiskEvaluationService)
- **Rationale**: Consistent with existing API patterns

#### Q4.2.2: ✅ RECOMMENDED
- **Response Format**: Extend existing response types with ML fields
- **Rationale**: Backward compatible, gradual enhancement

#### Q4.2.3: ✅ RECOMMENDED
- **Explainability**: Optional (query parameter: `?explain=true`)
- **Rationale**: Reduces response size for normal requests, available when needed

#### Q4.2.4: ✅ RECOMMENDED
- **Error Handling**: Fallback to rule-based/AI methods
- **Rationale**: Graceful degradation, always provide results

#### Q4.3.1: ✅ RECOMMENDED
- **Rate Limiting**: Per-tenant quotas (ML is expensive)
- **Rationale**: Cost control, fair usage

#### Q4.3.2: ✅ RECOMMENDED
- **Cost Tracking**: Application Insights custom metrics + Per-tenant usage tracking
- **Rationale**: Monitoring + billing/quotas

### 5. Monitoring & Observability

#### Q5.1.1 - Q5.1.4: ✅ ANSWERED
- **Application Insights**: Use existing instance (already configured)
- **Metrics**: Model inference latency, prediction distribution, feature extraction time, model version usage, business metrics
- **Logging**: Same logging pattern as existing services
- **Tracing**: Use existing trace IDs (distributed tracing)

#### Q5.2.1: ✅ RECOMMENDED
- **Drift Alerts**: Application Insights alerts + Email/Slack notifications
- **Rationale**: Technical alerts in Application Insights, business alerts via email/Slack

#### Q5.2.2: ✅ RECOMMENDED
- **Alert Recipients**: ML team + DevOps team
- **Rationale**: Technical issues need both teams

#### Q5.2.3: ✅ RECOMMENDED (Best Practice)
- **Auto Retraining**: Manual retraining only (Phase 1), automatic in Phase 2
- **Rationale**: Small team needs control, automatic retraining requires confidence

#### Q5.3.1: ✅ RECOMMENDED
- **Business Metrics Storage**: Application Insights (custom metrics) + Cosmos DB (for dashboards)
- **Rationale**: Real-time in Application Insights, historical in Cosmos DB

#### Q5.3.2: ✅ RECOMMENDED
- **Calculation Frequency**: Daily batch job (Phase 1), real-time in Phase 2
- **Rationale**: Business metrics don't need real-time, daily is sufficient

### 6. Deployment & CI/CD

#### Q6.1.1: ✅ RECOMMENDED
- **Deployment Trigger**: Manual deployment (API endpoint) + Automatic (on training completion, optional)
- **Rationale**: Small team needs control, optional automation for convenience

#### Q6.1.2: ✅ RECOMMENDED
- **Deployment Strategy**: Canary (gradual traffic shift)
- **Rationale**: Safer than blue-green, Azure ML Managed Endpoints support this

#### Q6.1.3: ✅ RECOMMENDED (Best Practice)
- **Rollback**: Automatic rollback on error rate increase (>5%) or latency spike (>1000ms)
- **Rationale**: Best practice for production ML systems

#### Q6.2.1: ✅ ANSWERED
- **Feature Flags**: Per-tenant feature flags
- **Finding**: `FeatureFlagRepository` supports per-tenant flags (`tenantId` partition key)

#### Q6.2.2: ✅ ANSWERED
- **Feature Flag Management**: Cosmos DB (feature flags container)
- **Finding**: `FeatureFlagRepository` uses Cosmos DB container `featureFlags`

#### Q6.3.1: ✅ RECOMMENDED
- **Environments**: Staging + production only (dev can use staging)
- **Rationale**: Reduces cost, dev environment not needed for ML

#### Q6.3.2: ✅ RECOMMENDED
- **Training Environments**: Production only (staging for testing)
- **Rationale**: Training needs real data, staging for validation

### 7. Data Flow & Workflows

#### Q7.1.1: ✅ RECOMMENDED
- **Feature Extraction**: Hybrid (cache common features, compute on-demand for rare features)
- **Rationale**: Balances latency and freshness

#### Q7.1.2: ✅ RECOMMENDED
- **Missing Data**: Use default values (mean, median, mode) + Missing indicator feature
- **Rationale**: XGBoost handles missing values, but explicit handling is better

#### Q7.1.3: ✅ RECOMMENDED
- **Feature Caching**: Yes, cache in Redis (15-minute TTL)
- **Rationale**: Matches existing cache strategy

#### Q7.2.1: ✅ ANSWERED
- **Training Schedule**: Weekly
- **User Stated**: "weekly"

#### Q7.2.2: ✅ RECOMMENDED
- **Data Refresh**: Hybrid (full weekly, incremental daily)
- **Rationale**: Full refresh ensures consistency, incremental reduces cost

#### Q7.2.3: ✅ ANSWERED
- **Training Monitoring**: Real-time
- **User Stated**: "real-time"

#### Q7.3.1: ✅ RECOMMENDED
- **Model Version**: Always use latest production model (with version tracking)
- **Rationale**: Simpler for small team, version tracking for debugging

#### Q7.3.2: ✅ RECOMMENDED
- **Fallback**: Fallback to rule-based methods → AI methods → Error
- **Rationale**: Graceful degradation

#### Q7.3.3: ✅ RECOMMENDED
- **Batch Processing**: Phase 2 feature
- **Rationale**: Start with real-time, add batch later if needed

### 8. Business Logic Integration

#### Q8.1.1: ✅ RECOMMENDED
- **Score Combination**: Weighted average (70% ML, 30% rule-based, adjustable)
- **Rationale**: ML enhances, rule-based provides baseline

#### Q8.1.2: ✅ RECOMMENDED
- **Risk Catalog**: Use ponderations as features for ML
- **Rationale**: ML learns from existing business rules

#### Q8.1.3: ✅ RECOMMENDED
- **Category Scores**: ML provides category scores directly
- **Rationale**: ML can learn category-specific patterns

#### Q8.2.1: ✅ RECOMMENDED
- **Probability Integration**: Use ML to improve probability estimates
- **Rationale**: ML learns from historical patterns

#### Q8.2.2: ✅ ANSWERED
- **Filters**: Use same filters
- **Finding**: `RevenueForecastService` already filters by owner, status, etc.

#### Q8.2.3: ✅ RECOMMENDED
- **Stage Handling**: Forecast only open opportunities (ML handles stage internally)
- **Rationale**: Consistent with existing behavior

#### Q8.3.1: ✅ RECOMMENDED
- **Explanation Integration**: Combine ML score with existing explanation
- **Rationale**: Best of both worlds

#### Q8.3.2: ✅ RECOMMENDED
- **Recommendation Filters**: Filter before ML ranking
- **Rationale**: ML focuses on ranking, not filtering

### 9. Testing & Validation

#### Q9.1.1: ✅ RECOMMENDED
- **Unit Testing**: Mock Azure ML endpoints
- **Rationale**: Fast, reliable unit tests

#### Q9.1.2: ✅ RECOMMENDED
- **Feature Testing**: Yes, test feature extraction logic
- **Rationale**: Critical for ML accuracy

#### Q9.2.1: ✅ RECOMMENDED
- **Integration Testing**: Hybrid (mock for CI, real for manual testing)
- **Rationale**: Fast CI, real testing for validation

#### Q9.2.2: ✅ RECOMMENDED
- **Test Data**: Use synthetic test data
- **Rationale**: No PII concerns, reproducible

#### Q9.3.1: ✅ RECOMMENDED
- **Model Validation**: Automated validation (threshold checks) + Manual review
- **Rationale**: Automated catches issues, manual ensures business alignment

#### Q9.3.2: ⚠️ CRITICAL - See Essential Questions
- **Performance Thresholds**: Need user input (see Essential Questions)

### 10. Security & Compliance

#### Q10.1.1: ✅ ANSWERED
- **PII Access**: Yes, can use PII (models need it for accuracy)
- **User Stated**: "yes can use PII"

#### Q10.1.2: ✅ ANSWERED
- **Anonymization**: Not needed (PII allowed)
- **User Stated**: PII allowed

#### Q10.2.1: ✅ ANSWERED
- **Permissions**: Use existing permissions/roles
- **User Stated**: "use existing ones"

#### Q10.2.2: ✅ ANSWERED
- **Training Access**: Super admin only
- **User Stated**: "super admin only"

#### Q10.3.1: ✅ ANSWERED
- **Audit Logging**: Yes, log all predictions to audit trail
- **User Stated**: "yes"

#### Q10.3.2: ✅ RECOMMENDED
- **Explainability**: SHAP values for feature importance + LLM-generated explanations
- **Rationale**: Technical (SHAP) + Business (LLM) explanations

### 11. Performance & Scalability

#### Q11.1.1: ✅ ANSWERED
- **Latency**: Best effort (<500ms target, but not strict SLA)
- **User Stated**: "best effort"

#### Q11.1.2: ✅ RECOMMENDED
- **Slow Feature Extraction**: Cache features aggressively + Pre-compute common features
- **Rationale**: Reduces latency

#### Q11.2.1: ✅ ANSWERED
- **Concurrent Requests**: 1000 requests/second
- **User Stated**: "1000"

#### Q11.2.2: ✅ ANSWERED
- **Auto-scaling**: Yes, Azure ML Managed Endpoints auto-scale
- **Rationale**: Built-in capability

#### Q11.3.1: ✅ RECOMMENDED
- **Caching**: Model predictions (opportunity-level) + Feature vectors
- **Rationale**: Reduces inference load

#### Q11.3.2: ⚠️ CLARIFICATION NEEDED
- **Cache TTL**: User stated "not sure I understand the question"
- **Recommendation**: 15 minutes (matches RiskEvaluationService)
- **Explanation**: How long can we cache ML predictions before they become stale? 15 minutes is reasonable for risk scores (opportunities don't change that fast)
As long as the opportunity do not change.

### 12. Cost Management

#### Q12.1.1: ✅ ANSWERED
- **Budget**: Medium tolerance
- **User Stated**: "Medium"

#### Q12.1.2: ✅ RECOMMENDED
- **Cost Control**: Min replicas = 0 (scale to zero) + Scheduled scaling (off-hours)
- **Rationale**: Reduces idle costs

#### Q12.2.1: ✅ ANSWERED
- **ROI Measurement**: Accuracy + Revenue impact
- **User Stated**: "Accuracy yes, Revenue impact yes"

### 13. Documentation & Knowledge Transfer

#### Q13.1.1: ✅ RECOMMENDED
- **Code Documentation**: JSDoc comments for all public methods + Inline comments for complex logic
- **Rationale**: Standard practice, helps small team

#### Q13.2.1: ✅ RECOMMENDED
- **Runbooks**: All listed runbooks needed
- **Rationale**: Critical for operations

#### Q13.3.1: ⚠️ QUESTION FOR USER
- **Team Training**: Need to assess team's Azure ML knowledge

---

## ⚠️ ESSENTIAL QUESTIONS (Need Answers Before Implementation)

### Critical Decisions

#### EQ1: Opportunity Schema Enhancement
**Question**: What additional fields should we add to the Opportunity `structuredData` schema for ML?

**Current Fields** (from codebase):
- Risk Scoring: `stage`, `status`, `amount`, `expectedRevenue`, `probability`, `closeDate`, `lostReason`, `accountId`, `ownerId`, `createdDate`, `lastActivityDate`
- Forecasting: `amount`, `expectedRevenue`, `probability`, `closeDate`, `stage`, `status`, `currency`, `fiscalYear`, `fiscalQuarter`
- Recommendations: `accountId`, `ownerId`, `type`, `stage`, `amount`, `createdDate`, `lastActivityDate`, `tags`

**Recommended Additional Fields**:
- `daysInStage`: Number of days in current stage (for risk scoring)
- `daysSinceLastActivity`: Days since last activity (for risk scoring)
- `dealVelocity`: Rate of stage progression (for forecasting)
- `competitorCount`: Number of competitors (for risk scoring)
- `stakeholderCount`: Number of stakeholders (for risk scoring)
- `documentCount`: Number of documents (for risk scoring)
- `emailCount`: Email interaction count (for recommendations)
- `meetingCount`: Meeting count (for recommendations)

**Your Decision**: 
- [ X] Add all recommended fields
- [ ] Add specific fields: `_________________`
- [ ] No additional fields needed

---

#### EQ2: Minimum Performance Thresholds
**Question**: What are the minimum acceptable performance thresholds for production deployment?

**Recommendations** (based on industry best practices):

**Risk Scoring**:
- Calibration Error: < 0.05 (5%)
- Brier Score: < 0.15
- AUC: > 0.70 (minimum), > 0.80 (target)

**Revenue Forecasting**:
- MAPE (Mean Absolute Percentage Error): < 20% (minimum), < 15% (target)
- Forecast Bias: < 5% (over/under forecasting)
- R²: > 0.60 (minimum), > 0.75 (target)

**Recommendations**:
- NDCG@10: > 0.60 (minimum), > 0.75 (target)
- CTR Uplift: > 10% vs. baseline (minimum), > 20% (target)
- Precision@10: > 0.40 (minimum), > 0.50 (target)

**Your Decision**:
- [X ] Accept recommendations
- [ ] Custom thresholds:
  - Risk Scoring: `_________________`
  - Forecasting: `_________________`
  - Recommendations: `_________________`

---

#### EQ3: Historical Data Strategy
**Question**: With "very little" historical data, what's the implementation strategy?

**Current Situation**: Very little historical data available

**Options**:
1. **Start with Rule-Based + LLM Only**: Implement ML later when data accumulates
2. **Start with ML Using Synthetic/External Data**: Use pre-trained models or synthetic data for initial training
3. **Hybrid Approach**: Start with rule-based, gradually add ML as data accumulates (recommended)

No start with ML right now

**Recommendation**: Option 3 (Hybrid Approach)
- Phase 1: Rule-based + LLM (existing)
- Phase 2: Add ML with limited data (use transfer learning, simpler models)
- Phase 3: Full ML as data accumulates

**Your Decision**:
- [ ] Option 1: Rule-based + LLM only
- [ X] Option 2: ML with synthetic/external data
- [ ] Option 3: Hybrid approach (recommended)
- [ ] Other: `_________________`

---

#### EQ4: Model Training Compute
**Question**: What compute should we use for training? (User mentioned "Azure Container Instances but must be easy to manage for a small team")

**Options**:
1. **Azure ML Compute Clusters**: Managed, auto-scaling, best for ML
2. **Azure Container Instances**: Simpler, but less ML-optimized
3. **Azure ML Compute Instances**: For development, then clusters for production

**Recommendation**: Azure ML Compute Clusters (managed, auto-scaling, cost-effective)
- **Why**: Azure ML manages the infrastructure, auto-scales, handles failures
- **Small Team Friendly**: No infrastructure management needed
- **Cost**: Pay only when training (can scale to zero)

**Your Decision**:
- [X ] Azure ML Compute Clusters (recommended)
- [ ] Azure Container Instances
- [ ] Other: `_________________`

---

#### EQ5: AutoML Usage
**Question**: How should we use AutoML? (User said "yes" to AutoML)

**Options**:
1. **Full AutoML**: Let AutoML select model, features, hyperparameters
2. **Hybrid**: Use AutoML for initial model selection, then manual tuning
3. **Selective**: Use AutoML only for specific use cases

**Recommendation**: Option 2 (Hybrid)
- **Phase 1**: Use AutoML to find best model architecture and hyperparameters
- **Phase 2**: Manual fine-tuning based on AutoML results
- **Why**: AutoML accelerates development, manual tuning ensures business alignment

**Your Decision**:
- [X ] Full AutoML
- [ ] Hybrid (recommended)
- [ ] Selective: `_________________`

---

#### EQ6: Training Data Minimums
**Question**: What are the minimum data requirements before we can train useful models?

**Recommendations** (based on ML best practices):

**Risk Scoring** (Binary Classification):
- Minimum: 100 closed opportunities (50 won, 50 lost)
- Recommended: 500+ closed opportunities
- Per category: 20+ examples per risk category

**Revenue Forecasting** (Regression):
- Minimum: 200 opportunities with known outcomes
- Recommended: 1000+ opportunities
- Time span: 6+ months of historical data

**Recommendations** (Ranking):
- Minimum: 500 user-item interactions
- Recommended: 2000+ interactions
- Per user: 5+ interactions minimum

**Your Situation**: "Very little" historical data

**Decision Needed**:
- [ ] Wait until minimum data is available
- [ ] Start with transfer learning / pre-trained models
- [ X] Use synthetic data augmentation
- [ ] Other strategy: `_________________`

---

#### EQ7: Service Integration Priority
**Question**: Which service should we integrate ML with first?

**Options**:
1. **RiskEvaluationService** (highest impact, most data)
2. **RevenueForecastService** (high impact, forecasting is critical)
3. **RecommendationsService** (lower impact, but simpler)

**Recommendation**: Start with RiskEvaluationService
- **Why**: Most critical use case, most data available, highest business impact
- **Then**: RevenueForecastService
- **Finally**: RecommendationsService

**Your Decision**:
- [X ] RiskEvaluationService first (recommended)
- [ ] RevenueForecastService first
- [ ] RecommendationsService first
- [ ] All in parallel

---

#### EQ8: ML Service Architecture
**Question**: Should ML services be separate microservices or integrated into the API service?

**Options**:
1. **Integrated**: ML services in same API service (simpler, lower latency)
2. **Separate**: ML services as separate microservices (better isolation, independent scaling)

**Recommendation**: Integrated (for small team)
- **Why**: Simpler deployment, lower latency, easier debugging
- **Trade-off**: Can extract to separate service later if needed

**Your Decision**:
- [X ] Integrated (recommended for small team)
- [ ] Separate microservices
- [ ] Hybrid: `_________________`

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create Azure ML Workspace
- [ ] Set up Azure ML Key Vault
- [ ] Configure Azure ML Compute Clusters
- [ ] Add ML config to `apps/api/src/config/env.ts`
- [ ] Create `FeatureStoreService`
- [ ] Implement feature extraction for Risk Scoring
- [ ] Set up Azure ML Datastore for training data

### Phase 2: Risk Scoring ML (Weeks 3-4)
- [ ] Implement `MLService` (generic orchestration)
- [ ] Implement `ModelService` (Azure ML client)
- [ ] Implement `TrainingService` (Azure ML orchestration)
- [ ] Create training pipeline for Risk Scoring
- [ ] Train initial Risk Scoring model (if data available)
- [ ] Integrate ML into `RiskEvaluationService`
- [ ] Add ML endpoints (`/api/v1/ml/risk-scoring`)
- [ ] Implement calibration for risk scores

### Phase 3: Revenue Forecasting ML (Weeks 5-6)
- [ ] Implement feature extraction for Forecasting
- [ ] Create training pipeline for Forecasting
- [ ] Train initial Forecasting model (if data available)
- [ ] Integrate ML into `RevenueForecastService`
- [ ] Add ML endpoints (`/api/v1/ml/forecasting`)
- [ ] Implement uncertainty quantification (P10/P50/P90)

### Phase 4: Recommendations ML (Weeks 7-8)
- [ ] Implement feature extraction for Recommendations
- [ ] Create training pipeline for Recommendations
- [ ] Train initial Recommendations model (if data available)
- [ ] Integrate ML into `RecommendationsService`
- [ ] Add ML endpoints (`/api/v1/ml/recommendations`)

### Phase 5: Operations (Weeks 9-10)
- [ ] Set up monitoring and alerts
- [ ] Implement drift detection
- [ ] Create runbooks
- [ ] Set up continuous learning pipeline
- [ ] Performance optimization

---

## 🎯 NEXT STEPS

1. **Answer Essential Questions** (EQ1-EQ8)
2. **Review Recommendations** - Confirm or adjust
3. **Prioritize Implementation** - Which use case first?
4. **Create Detailed Implementation Plan** - Based on answers
5. **Set Up Azure ML Workspace** - Infrastructure setup
6. **Begin Phase 1** - Foundation work

---

**Document Status**: 
- ✅ Codebase analysis complete
- ✅ Best practices documented
- ✅ Recommendations provided
- ⏳ Awaiting answers to Essential Questions (EQ1-EQ8)
- ⏳ Implementation plan to be created after answers
