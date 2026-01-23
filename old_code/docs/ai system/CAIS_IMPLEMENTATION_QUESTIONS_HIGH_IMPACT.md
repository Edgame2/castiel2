# CAIS Implementation Questions - High Impact

**Date:** January 2025  
**Status:** Pre-Implementation Planning  
**Purpose:** Critical questions that must be answered before implementation - these affect core architecture, integration points, and system behavior

---

## Overview

This document contains **high-impact questions** that directly affect:
- Core architecture decisions
- Service implementation approach
- Integration with existing systems
- CAIS orchestration patterns
- Security and compliance
- Performance requirements
- Error handling and resilience

**These questions must be answered before starting implementation.**

---

## 1. Infrastructure & Azure Setup (Critical)

### 1.1 Azure ML Workspace Setup

**Q1.1.1**: When should we create the Azure ML Workspace?
- [ ] Before Phase 1 implementation starts
- [x] **During Phase 1 (as first task)** ✅ **RECOMMENDED**
- [ ] After Phase 1 services are implemented (test with mock endpoints first)

**Decision**: Create during Phase 1, Week 1  
**Rationale**: Need workspace before training/deploying models. Can set up in parallel with service implementation. Allows testing with real endpoints during development. Small-team friendly (managed service, minimal setup).  
**Notes**: Azure ML Workspace setup is straightforward via Azure Portal or Terraform  
**Status**: ✅ Answered

**Q1.1.2**: Should we create separate workspaces for dev/staging/production, or use a single workspace with environment-based model versions?
- [ ] Separate workspaces per environment
- [x] **Single workspace with environment tags/prefixes** ✅ **RECOMMENDED**
- [ ] Hybrid: Dev/staging shared, production separate

**Decision**: Single workspace with environment tags  
**Rationale**: Small-team friendly (simpler management). Cost-effective (shared compute resources). Easier model promotion (same registry). Use model tags/prefixes for environment: `risk-scoring-dev-v1`, `risk-scoring-prod-v1`. Can split to separate workspaces later if needed.  
**Notes**: Production model promotion via deployment, not workspace migration  
**Status**: ✅ Answered

**Q1.1.3**: What Azure ML Compute Cluster configuration should we use?
- [x] **VM size: Standard_DS3_v2 (CPU, 4 cores, 14GB RAM)** ✅ **RECOMMENDED FOR PHASE 1**
- [x] **Min/max nodes: 0-4 (auto-scaling)**
- [x] **Spot instances: No (for Phase 1, add in Phase 2 for 60-90% savings)**
- [x] **Idle timeout: 120 seconds**

**Decision**: Start with CPU clusters, small auto-scaling range  
**Rationale**: XGBoost/LightGBM don't require GPU. Standard_DS3_v2 sufficient for training jobs (<2 hours target). Min 0 nodes = cost optimization (scale to zero when idle). Max 4 nodes = controlled costs, sufficient for small team. Spot instances in Phase 2 (after stable training pipeline).  
**Notes**: Can add GPU cluster later if NCF (Phase 2) is implemented  
**Status**: ✅ Answered

**Q1.1.4**: Should Azure ML Workspace use the same Key Vault as the main application, or a separate one?
- [ ] Same Key Vault (simpler, shared secrets)
- [x] **Separate Key Vault (better isolation, security)** ✅ **RECOMMENDED**

**Decision**: Separate Key Vault for ML  
**Rationale**: Security best practice (principle of least privilege). Separate access control for ML secrets. Avoid accidental exposure of API keys. Easy to manage ML-specific secrets.  
**Notes**: Create `castiel-ml-kv-{environment}` Key Vault  
**Status**: ✅ Answered

**Q1.1.5**: Do we need to set up Azure ML Datastores immediately, or can we start with direct Cosmos DB queries?
- [ ] Set up Datastores from the start
- [x] **Start with direct Cosmos DB queries, migrate to Datastores later** ✅ **RECOMMENDED**
- [ ] Hybrid: Datastores for large datasets, direct queries for small ones

**Decision**: Direct Cosmos DB queries initially  
**Rationale**: Simpler initial implementation. Fewer dependencies to set up. Export to Datastores when training data grows (>10k examples). Cosmos DB queries sufficient for initial training.  
**Notes**: Plan migration to Datastores in Phase 2 (when data grows)  
**Status**: ✅ Answered

**Q1.1.6**: What networking configuration should we use initially?
- [x] **Public endpoints (simpler, faster to implement)** ✅ **RECOMMENDED FOR PHASE 1**
- [ ] Private endpoints via VNet (more secure, requires VNet setup)
- [ ] Start public, migrate to private later (Phase 2, when security requirements change)

**Decision**: Public endpoints initially, private in Phase 2  
**Rationale**: Faster to implement (no VNet setup). Works from anywhere (dev, CI/CD). Lower initial complexity. Can migrate to private endpoints later (documented migration path). User confirmed: "public for now".  
**Notes**: Document migration path to private endpoints in DEPLOYMENT.md  
**Status**: ✅ Answered

### 1.2 Managed Endpoints Configuration

**Q1.2.1**: How many managed endpoints should we create initially?
- [x] **One endpoint per model (3 endpoints: risk, forecast, recommendations)** ✅ **RECOMMENDED**
- [ ] One endpoint with multiple model versions
- [ ] Hybrid: Separate endpoints for different model types

**Decision**: Separate endpoint per model type  
**Rationale**: Independent scaling per use case. Easier monitoring and debugging. Simpler deployment (update one endpoint without affecting others). Clear separation of concerns.  
**Endpoint Names**: `castiel-risk-scoring-endpoint-{env}`, `castiel-forecasting-endpoint-{env}`, `castiel-recommendations-endpoint-{env}`  
**Notes**: Each endpoint can host multiple versions (A/B testing)  
**Status**: ✅ Answered

**Q1.2.2**: What should be the initial auto-scaling configuration?
- [x] **Min replicas: 0 (cost optimization)** ✅ **MANDATORY DEFAULT** (see ML_OPERATIONAL_STANDARDS.md)
- [ ] Min replicas: 1 (latency optimization)
- [x] **Max replicas: 10**
- [x] **Scale-up threshold: 70% CPU/memory**
- [x] **Scale-down cooldown: 300 seconds (5 minutes)**

**Decision**: Min 0, max 10, 70% threshold, 5min cooldown  
**Rationale**: Min 0 = scale to zero when idle (mandatory cost control). Max 10 = sufficient for small team, controlled costs. 70% threshold = responsive scaling, avoid thrashing. 5min cooldown = prevent rapid scaling oscillations.  
**Notes**: Can adjust max replicas based on actual load  
**Status**: ✅ Answered

**Q1.2.3**: Should we enable A/B testing from the start, or add it later?
- [ ] Enable A/B testing infrastructure from Phase 1
- [x] **Add A/B testing in Phase 2 (after initial models are stable)** ✅ **RECOMMENDED**

**Decision**: Add A/B testing in Phase 2  
**Rationale**: Phase 1 focus: Get initial models working. A/B testing adds complexity (traffic splitting, monitoring). More valuable after initial model validation. Can deploy new versions as 100% traffic initially.  
**Notes**: Plan A/B testing infrastructure in Phase 2  
**Status**: ✅ Answered

**Q1.2.4**: What should be the endpoint timeout settings?
- [x] **Request timeout: 60s (default)** ✅ **RECOMMENDED**
- [x] **Retry policy: 3 retries, exponential backoff (1s, 2s, 4s)**

**Decision**: 60s timeout, 3 retries with backoff  
**Rationale**: 60s sufficient for inference (<500ms target). 3 retries handle transient failures. Exponential backoff prevents thundering herd.  
**Notes**: Monitor actual latency, adjust if needed  
**Status**: ✅ Answered

**Q1.2.5**: Should we implement endpoint health checks and circuit breakers?
- [x] **Yes, from Phase 1** ✅ **RECOMMENDED**
- [ ] Add in Phase 2 (after initial implementation)

**Decision**: Implement from Phase 1  
**Rationale**: High-ROI for reliability. Prevents cascading failures. Simple to implement (standard pattern).  
**Implementation**: Health check endpoint: `/health` (Azure ML provides this). Circuit breaker: After 5 failures in 1 minute, open circuit for 30 seconds. Library: Use `opossum` (Node.js circuit breaker) or similar.  
**Notes**: Essential for production reliability  
**Status**: ✅ Answered

---

## 2. Service Implementation Details (Core Services)

### 2.1 FeatureStoreService

**Q2.1.1**: What should be the initial feature set for each use case?

**Risk Scoring Features** ✅:
```typescript
{
  // Opportunity features
  dealValue: number,
  probability: number,
  daysToClose: number,
  daysInCurrentStage: number,
  daysSinceLastActivity: number,
  stage: string,
  industry: string,
  
  // Risk features
  riskScore: number,
  categoryScores: Record<string, number>,
  competitorCount: number,
  
  // Historical features
  ownerWinRate: number,
  accountHealth: number,
  industryWinRate: number,
  
  // Relationship features
  stakeholderCount: number,
  activityCountLast30Days: number,
  documentCount: number
}
```

**Forecasting Features** ✅:
```typescript
{
  // Opportunity features
  dealValue: number,
  probability: number,
  daysToClose: number,
  dealVelocity: number,
  
  // Temporal features
  month: number,
  quarter: number,
  seasonality: number,
  
  // Risk features
  riskScore: number,
  
  // Historical features
  ownerWinRate: number,
  industryWinRate: number,
  historicalRevenue: number
}
```

**Recommendations Features** ✅:
```typescript
{
  // User features
  userId: string,
  userRole: string,
  historicalEngagement: number,
  
  // Item features
  itemId: string,
  itemType: string,
  itemPopularity: number,
  itemRecency: number,
  
  // Interaction features
  userItemInteractions: number,
  similarUserInteractions: number,
  
  // Context features
  currentProject: string,
  timeOfDay: number,
  dayOfWeek: number
}
```

**Decision**: Start with these core features, expand based on feature importance  
**Status**: ✅ Answered

**Q2.1.2**: How should we handle feature versioning initially?
- [ ] Full versioning system (feature name + version + hash)
- [x] **Simple versioning (feature name + version)** ✅ **RECOMMENDED FOR PHASE 1**
- [ ] Minimal versioning (just track changes, no explicit versions)

**Decision**: Simple versioning for Phase 1  
**Rationale**: Balance between complexity and safety. Feature name + version (e.g., "dealValue_v1"). Computation logic hash for change detection. Pin versions for training jobs. Resolve latest compatible for inference.  
**Structure**:
```typescript
{
  featureName: "dealValue",
  version: "v1",
  source: "opportunity.amount",
  computationLogicHash: "abc123",
  createdAt: Date
}
```
**Notes**: See ML_OPERATIONAL_STANDARDS.md - Feature Versioning is **MANDATORY**  
**Status**: ✅ Answered

**Q2.1.3**: What should be the feature extraction performance requirements?
- [x] **Target latency: <500ms** ✅ **RECOMMENDED**
- [x] **Batch processing: Yes (for training data exports)**

**Decision**: <500ms for real-time, batch for training  
**Rationale**: <500ms allows <5s end-to-end latency. Batch processing for training data exports (1000s of examples). Cache frequently-used features in Redis.  
**Notes**: Monitor actual latency, optimize bottlenecks  
**Status**: ✅ Answered

**Q2.1.4**: Should FeatureStoreService cache computed features?
- [x] **Yes, in Redis (event-based invalidation)** ✅ **RECOMMENDED**
- [ ] No, compute on-demand (simpler, but slower)

**Decision**: Cache in Redis with event-based invalidation  
**Rationale**: User confirmed: "event-based invalidation". Cache key: `features:{tenantId}:{opportunityId}`. No fixed TTL - invalidate when opportunity changes. Reduces feature extraction latency.  
**Implementation**: Use Cosmos DB change feed or webhooks for invalidation  
**Status**: ✅ Answered

**Q2.1.5**: How should we handle missing data/null values in features?
- [x] **Imputation strategies (mean, median, mode)** ✅ **RECOMMENDED**
- [x] **Missing value indicators (boolean flags for critical fields)**
- [ ] Skip features with missing data

**Decision**: Imputation + indicators  
**Rationale**: XGBoost handles missing values, but explicit imputation is better. Use median for numerical features (robust to outliers). Use mode for categorical features. Add boolean indicator for critical missing fields (e.g., "hasBudgetConfirmed").  
**Strategy**: Numerical: Median imputation. Categorical: Mode imputation. Critical fields: Add missing indicator feature.  
**Status**: ✅ Answered

### 2.2 ModelService

**Q2.2.1**: How should ModelService handle model selection logic?
- [x] **Cache model metadata in Cosmos DB (sync from Azure ML Registry)** ✅ **RECOMMENDED**
- [ ] Query Azure ML Registry directly (slower, always up-to-date)
- [ ] Hybrid: Cache with periodic refresh

**Decision**: Cache in Cosmos DB, sync from Azure ML  
**Rationale**: Faster lookups (Cosmos DB query vs Azure ML API call). Reduced dependency on Azure ML availability. Sync metadata when model registered/updated.  
**Sync Strategy**: On model registration: Sync immediately. Periodic refresh: Daily (catch any missed updates). Cache TTL: None (sync-based invalidation).  
**Status**: ✅ Answered

**Q2.2.2**: What should be the model selection fallback strategy?
- [x] **If industry model fails → use global model** ✅ **PRIMARY FALLBACK**
- [x] **If ML model fails → use rule-based fallback**
- [x] **If all fail → return error with graceful message**

**Decision**: Cascading fallbacks  
**Rationale**: Industry model → Global model (best ML available). Global model → Rule-based (existing system). Rule-based → Error (complete failure, alert).  
**Fallback Chain**: `Industry Model → Global Model → Rule-Based → Error`  
**Status**: ✅ Answered

**Q2.2.3**: Should ModelService implement prediction caching?
- [x] **Yes, cache predictions in Redis (event-based invalidation)** ✅ **RECOMMENDED**
- [ ] No, always call Azure ML endpoints

**Decision**: Cache with event-based invalidation  
**Rationale**: User confirmed: "event-based invalidation". Cache key: `prediction:{modelType}:{tenantId}:{opportunityId}`. No fixed TTL - invalidate when opportunity changes. Reduces inference calls to Azure ML.  
**Implementation**: Invalidate on opportunity update events  
**Status**: ✅ Answered

**Q2.2.4**: How should we handle model versioning in ModelService?
- [x] **Always use latest version (for production)** ✅ **RECOMMENDED FOR PHASE 1**
- [ ] Pin to specific version
- [ ] Support A/B testing with traffic splitting (Phase 2)

**Decision**: Latest version for Phase 1, A/B in Phase 2  
**Rationale**: Phase 1: Simpler deployment (always use latest). Phase 2: Add A/B testing (traffic splitting between versions). Model versions tracked in Azure ML Registry.  
**Status**: ✅ Answered

**Q2.2.5**: What should be the prediction request/response format?
- [x] **Request: Feature vector as JSON object** ✅ **RECOMMENDED**
- [x] **Response: Prediction + confidence + metadata**
- [x] **Error: Structured error with code + message**

**Decision**: JSON-based, structured format  
**Request Example**:
```json
{
  "features": {
    "dealValue": 500000,
    "probability": 75,
    "daysToClose": 49
  },
  "modelVersion": "v2.1",
  "options": { "explain": true }
}
```
**Response Example**:
```json
{
  "prediction": 0.82,
  "confidence": "high",
  "modelVersion": "v2.1",
  "featureImportance": [...]
}
```
**Status**: ✅ Answered

**Q2.2.6**: How should we handle model calibration (Platt Scaling, Isotonic Regression)?
- [x] **Implement in ModelService as post-processing** ✅ **RECOMMENDED**
- [ ] Handle in Azure ML training pipeline
- [ ] Calibration params in model metadata

**Decision**: Post-processing in ModelService  
**Rationale**: Lightweight post-processing (Platt Scaling or Isotonic Regression). Calibration parameters stored per model version in Cosmos DB. Applied after Azure ML endpoint call. See ML_OPERATIONAL_STANDARDS.md - Calibration is MANDATORY for production risk scoring.  
**Status**: ✅ Answered

### 2.3 TrainingService

**Q2.3.1**: What should be the training data export strategy?
- [ ] Export all historical opportunities to Azure ML Datastore
- [ ] Incremental exports (only new/updated opportunities)
- [ ] Scheduled exports (daily, weekly)

**Q2.3.2**: How should we handle synthetic data augmentation?
- [ ] SMOTE for imbalanced classes
- [ ] Statistical sampling
- [ ] Both, configurable per use case

**Q2.3.3**: What should be the training job orchestration?
- [ ] Azure ML Pipelines (scheduled, versioned)
- [ ] Manual triggers via API
- [ ] Both (scheduled + on-demand)

**Q2.3.4**: How should we handle training job monitoring?
- [ ] Poll Azure ML for job status
- [ ] Use Azure ML webhooks/events
- [ ] Both (polling + event-driven)

**Q2.3.5**: What should be the model evaluation criteria for promotion?
- [ ] Minimum performance thresholds (R², MAE, etc.)
- [ ] Comparison with previous model version
- [ ] Business metrics (calibration error, bias)

**Q2.3.6**: How should we handle model registration after training?
- [ ] Automatic registration to Azure ML Registry
- [ ] Manual approval workflow
- [ ] Automatic with notification

### 2.4 EvaluationService

**Q2.4.1**: What drift detection methods should we implement?
- [ ] Feature distribution drift (KS test, PSI)
- [ ] Prediction distribution drift (KS test)
- [ ] Outcome drift (performance metrics over time)

**Q2.4.2**: What should be the drift detection thresholds?
- [ ] Feature drift: PSI > 0.2, KS p-value < 0.05?
- [ ] Prediction drift: Similar thresholds?
- [ ] Outcome drift: Performance degradation > 5%?

**Q2.4.3**: How frequently should we run drift detection?
- [ ] Real-time (on every prediction)
- [ ] Daily batch analysis
- [ ] Weekly analysis

**Q2.4.4**: What should trigger automatic retraining?
- [ ] Feature drift detected
- [ ] Prediction drift detected
- [ ] Outcome drift detected (most critical)
- [ ] All of the above (with different priorities)

---

## 3. Integration Points (Critical for CAIS)

### 3.1 RiskEvaluationService Integration

**Q3.1.1**: How should ML predictions integrate with existing risk detection methods?
- [ ] ML as additional detection method (weighted ensemble)
- [ ] ML replaces some methods (which ones?)
- [ ] ML enhances existing methods (how?)

**Q3.1.2**: What should be the confidence weighting for ML predictions vs. rule-based/AI?
- [ ] ML: 0.9, Rule-based: 1.0, AI: 0.7, Historical: 0.8?
- [ ] Configurable per tenant/industry?
- [ ] Dynamic based on model performance?

**Q3.1.3**: Should ML predictions trigger the same risk categories as rule-based detection?
- [ ] Yes, map ML predictions to existing risk categories
- [ ] No, ML introduces new risk categories
- [ ] Hybrid: Map to existing, but allow new categories

**Q3.1.4**: How should ML risk scores combine with rule-based risk scores?
- [ ] Weighted average
- [ ] Maximum (worst-case)
- [ ] Separate scores, combine in decision engine

**Q3.1.5**: Should RiskEvaluationService cache ML predictions?
- [ ] Yes, same cache as rule-based results
- [ ] Separate cache for ML predictions
- [ ] No caching for ML (always fresh)

### 3.2 RecommendationsService Integration

**Q3.2.1**: How should ML recommendations integrate with existing recommendation methods?
- [ ] ML as additional ranking signal
- [ ] ML replaces vector search/collaborative filtering
- [ ] ML enhances existing methods (reranking)

**Q3.2.2**: What should be the recommendation ensemble strategy?
- [ ] Weighted combination of ML + vector search + collaborative filtering
- [ ] ML reranks results from other methods
- [ ] Separate ML recommendations, merge with others

**Q3.2.3**: Should RecommendationsService use ML for all recommendation types, or specific ones?
- [ ] All types (opportunities, accounts, contacts, documents)
- [ ] Specific types only (which ones?)

**Q3.2.4**: How should we handle cold start (new users/items without history)?
- [ ] Fallback to rule-based/popularity
- [ ] Use global model predictions
- [ ] Hybrid: Global model + popularity fallback

### 3.3 ForecastingService Integration

**Q3.3.1**: Should ForecastingService use ML for all forecast levels (opportunity/team/tenant)?
- [ ] Yes, ML for all levels
- [ ] ML for opportunity level, aggregation for team/tenant
- [ ] ML for team/tenant, probability-weighted for opportunity

**Q3.3.2**: How should ML forecasts integrate with existing probability-weighted forecasts?
- [ ] ML replaces probability-weighted method
- [ ] ML enhances probability-weighted (calibration)
- [ ] Both methods available, user chooses

**Q3.3.3**: Should ForecastingService support uncertainty quantification?
- [ ] Yes, P10/P50/P90 quantiles
- [ ] Yes, confidence intervals
- [ ] No, point forecasts only (initially)

**Q3.3.4**: How should we handle forecast scenarios (best/base/worst case)?
- [ ] ML generates scenarios directly (quantile regression)
- [ ] ML point forecast + manual scenario generation
- [ ] Both (ML scenarios + manual overrides)

### 3.4 LLM Services Integration

**Q3.4.1**: How should LLM services use ML predictions for explanations?
- [ ] LLM explains ML predictions (feature importance, SHAP values)
- [ ] LLM generates natural language from ML outputs
- [ ] Both (structured + natural language)

**Q3.4.2**: Should ChainOfThoughtService use ML predictions in reasoning steps?
- [ ] Yes, ML predictions as reasoning inputs
- [ ] No, LLM reasoning independent of ML
- [ ] Hybrid: LLM can query ML predictions when needed

**Q3.4.3**: How should RiskExplainabilityService integrate SHAP values?
- [ ] SHAP values as structured explanation input
- [ ] SHAP values enhance existing explanations
- [ ] Both (SHAP + existing explainability)

### 3.5 FeedbackLearningService Integration

**Q3.5.1**: How should feedback be used for ML model training?
- [ ] Feedback as training labels (supervised learning)
- [ ] Feedback for model evaluation (not training)
- [ ] Both (evaluation + optional training)

**Q3.5.2**: What feedback types should be collected for ML?
- [ ] User corrections to predictions
- [ ] Outcome tracking (actual wins/losses)
- [ ] User ratings of predictions
- [ ] All of the above

**Q3.5.3**: How should we handle feedback quality and validation?
- [ ] Automatic validation (consistency checks)
- [ ] Manual review workflow
- [ ] Both (auto-validation + manual review for edge cases)

---

## 4. Data Flow & Orchestration (Core CAIS)

### 4.1 CAIS Decision Loop

**Q4.1.1**: What should be the execution order in the CAIS decision loop?
- [ ] Sequential: Data → Features → ML → Explanation → LLM → Decision → Action
- [ ] Parallel where possible: Features + Historical patterns in parallel
- [ ] Hybrid: Some sequential, some parallel

**Q4.1.2**: Should the decision loop be synchronous or asynchronous?
- [ ] Synchronous (user waits for complete loop)
- [ ] Asynchronous (queue-based, results returned later)
- [ ] Hybrid: Sync for UI, async for batch/dashboards

**Q4.1.3**: What should be the timeout for the complete decision loop?
- [ ] <500ms (real-time UI)
- [ ] <2s (acceptable for insights)
- [ ] Configurable per use case

**Q4.1.4**: How should we handle partial failures in the decision loop?
- [ ] Graceful degradation (skip failed components, use available ones)
- [ ] Fail fast (return error if any component fails)
- [ ] Hybrid: Degrade for non-critical components, fail for critical ones

### 4.2 Feature Engineering Flow

**Q4.2.1**: Should feature extraction happen on-demand or pre-computed?
- [ ] On-demand (compute when needed)
- [ ] Pre-computed (background jobs, cache results)
- [ ] Hybrid: Pre-compute common features, on-demand for rare ones

**Q4.2.2**: How should we handle feature dependencies?
- [ ] Sequential extraction (features that depend on others)
- [ ] Parallel extraction where possible
- [ ] Dependency graph with parallel execution

**Q4.2.3**: Should feature extraction be incremental or full recomputation?
- [ ] Incremental (only changed features)
- [ ] Full recomputation (simpler, ensures consistency)
- [ ] Hybrid: Incremental with periodic full recomputation

### 4.3 Model Inference Flow

**Q4.3.1**: Should we batch multiple predictions in a single request?
- [ ] Yes, batch for better throughput
- [ ] No, one prediction per request (simpler)
- [ ] Configurable (batch for training, single for real-time)

**Q4.3.2**: How should we handle model inference errors?
- [ ] Retry with exponential backoff
- [ ] Fallback to rule-based/previous model
- [ ] Both (retry, then fallback)

**Q4.3.3**: Should we implement request queuing for high-load scenarios?
- [ ] Yes, queue requests when endpoints are overloaded
- [ ] No, fail fast with error
- [ ] Configurable per endpoint

### 4.4 Feedback & Learning Flow

**Q4.4.1**: How should feedback be collected and stored?
- [ ] Real-time (immediate storage)
- [ ] Batch (periodic collection)
- [ ] Hybrid: Real-time storage, batch processing

**Q4.4.2**: What should trigger model retraining?
- [ ] Scheduled (weekly, monthly)
- [ ] Event-driven (drift detected, feedback threshold reached)
- [ ] Both (scheduled + event-driven)

**Q4.4.3**: How should we handle retraining while models are in production?
- [ ] Blue-green deployment (new model alongside old)
- [ ] Canary deployment (gradual rollout)
- [ ] Direct replacement (downtime acceptable)

---

## 5. Error Handling & Resilience (Critical)

### 5.1 Graceful Degradation

**Q5.1.1**: What should be the fallback strategy when ML models fail?
- [ ] Rule-based fallback (always available)
- [ ] Previous model version fallback
- [ ] Default predictions (neutral scores)
- [ ] Error returned to user

**Q5.1.2**: How should we handle Azure ML endpoint unavailability?
- [ ] Automatic fallback to rule-based
- [ ] Retry with exponential backoff
- [ ] Circuit breaker pattern (stop calling after N failures)

**Q5.1.3**: What should be the circuit breaker configuration?
- [ ] Failure threshold: 5 failures in 1 minute?
- [ ] Recovery timeout: 30 seconds, 1 minute, 5 minutes?
- [ ] Half-open state testing: Yes/No?

**Q5.1.4**: Should we implement health checks for Azure ML endpoints?
- [ ] Yes, periodic health checks
- [ ] Yes, health check before each request
- [ ] No, rely on error handling

### 5.2 Data Quality & Validation

**Q5.2.1**: What data quality checks should we implement before feature extraction?
- [ ] Missing required fields
- [ ] Data type validation
- [ ] Range validation (amounts, dates, etc.)
- [ ] Consistency checks (stage progression, etc.)

**Q5.2.2**: How should we handle low-quality data?
- [ ] Reject and return error
- [ ] Use default values
- [ ] Flag as low quality but proceed
- [ ] Skip low-quality opportunities

**Q5.2.3**: Should we implement data quality scoring?
- [ ] Yes, quality score per opportunity
- [ ] Yes, quality score per feature
- [ ] No, binary pass/fail

### 5.3 Error Recovery

**Q5.3.1**: How should we handle training job failures?
- [ ] Automatic retry (with backoff)
- [ ] Manual intervention required
- [ ] Notification + manual retry

**Q5.3.2**: What should happen if model deployment fails?
- [ ] Rollback to previous version
- [ ] Keep current version, fix and redeploy
- [ ] Alert and manual intervention

**Q5.3.3**: How should we handle prediction errors (invalid responses from Azure ML)?
- [ ] Log error and use fallback
- [ ] Retry request
- [ ] Alert and investigate

---

## 6. Performance & Scalability (Critical Requirements)

### 6.1 Latency Requirements

**Q6.1.1**: What are the latency requirements for each use case?
- [ ] Risk Scoring: <500ms, <1s, <2s?
- [ ] Forecasting: <1s, <2s, <5s?
- [ ] Recommendations: <500ms, <1s, <2s?

**Q6.1.2**: Should we implement prediction caching to meet latency requirements?
- [ ] Yes, cache all predictions
- [ ] Yes, cache only for specific use cases
- [ ] No, always call Azure ML (accept latency)

**Q6.1.3**: What should be the cache TTL for predictions?
- [ ] 5 minutes, 15 minutes, 1 hour?
- [ ] Different TTL per use case?
- [ ] Event-based invalidation (opportunity updated)

### 6.2 Throughput Requirements

**Q6.2.1**: What are the expected request volumes?
- [ ] Risk evaluations per second: 10, 100, 1000?
- [ ] Forecast requests per second: 10, 100, 1000?
- [ ] Recommendation requests per second: 10, 100, 1000?

**Q6.2.2**: Should we implement request rate limiting?
- [ ] Yes, per tenant
- [ ] Yes, per user
- [ ] Yes, global
- [ ] No, rely on Azure ML auto-scaling

**Q6.2.3**: How should we handle traffic spikes?
- [ ] Auto-scaling (Azure ML handles it)
- [ ] Request queuing
- [ ] Throttling with graceful degradation

---

## 7. Security & Compliance (Critical)

### 7.1 Authentication & Authorization

**Q7.1.1**: How should we authenticate requests to Azure ML endpoints?
- [ ] Managed Identity (system-assigned)
- [ ] Key-based authentication
- [ ] Azure AD tokens

**Q7.1.2**: Should we implement request signing/validation?
- [ ] Yes, sign requests to prevent tampering
- [ ] No, rely on network security

**Q7.1.3**: How should we handle tenant isolation in ML predictions?
- [ ] Separate models per tenant
- [ ] Tenant ID as feature (shared models)
- [ ] Data filtering (tenant-scoped queries)

### 7.2 Data Privacy

**Q7.2.1**: Should training data be tenant-isolated?
- [ ] Yes, separate training datasets per tenant
- [ ] No, aggregated training (with tenant ID as feature)
- [ ] Hybrid: Tenant-specific models when data sufficient, global otherwise

**Q7.2.2**: How should we handle PII in training data?
- [ ] Remove PII before training
- [ ] Anonymize PII
- [ ] No PII in training data (use IDs only)

**Q7.2.3**: Should we implement data retention policies for training data?
- [ ] Yes, delete old training data after X months
- [ ] Yes, archive old data
- [ ] No, keep all historical data

### 7.3 Model Security

**Q7.3.1**: Should we implement model versioning and rollback capabilities?
- [ ] Yes, full versioning with rollback
- [ ] Yes, versioning but no rollback
- [ ] No, always use latest version

**Q7.3.2**: How should we protect against model poisoning attacks?
- [ ] Input validation and sanitization
- [ ] Anomaly detection on training data
- [ ] Manual review of training data
- [ ] All of the above

**Q7.3.3**: Should we implement model explainability requirements for compliance?
- [ ] Yes, SHAP values for all predictions
- [ ] Yes, feature importance tracking
- [ ] Yes, audit trail of model decisions
- [ ] All of the above

---

## 8. CAIS-Specific Questions (Core Architecture)

### 8.1 Orchestration Patterns

**Q8.1.1**: Which orchestration patterns should we implement first?
- [ ] Weighted ensemble (risk detection)
- [ ] Sequential pipeline (forecasting)
- [ ] Parallel execution (recommendations)
- [ ] All of the above (prioritize?)

**Q8.1.2**: How should we handle conflicts between different AI components?
- [ ] Weighted voting (confidence-based)
- [ ] Priority rules (ML > LLM > Rules)
- [ ] Human-in-the-loop (escalate conflicts)
- [ ] Configurable per use case

**Q8.1.3**: Should we implement a centralized orchestrator service?
- [ ] Yes, CAISOrchestratorService
- [ ] No, each use case has its own orchestrator
- [ ] Hybrid: Shared orchestration utilities, use-case-specific orchestrators

### 8.2 Decision Engine

**Q8.2.1**: How should the decision engine combine ML predictions with rules?
- [ ] ML predictions override rules (when confidence high)
- [ ] Rules override ML predictions (safety first)
- [ ] Weighted combination
- [ ] Configurable per decision type

**Q8.2.2**: Should the decision engine support action execution?
- [ ] Yes, execute actions automatically (CRM updates, notifications)
- [ ] No, only recommend actions (human approval required)
- [ ] Hybrid: Auto-execute low-risk actions, require approval for high-risk

**Q8.2.3**: How should we handle decision explainability?
- [ ] Structured explanations (which components contributed)
- [ ] Natural language explanations (LLM-generated)
- [ ] Both (structured + natural language)

### 8.3 Feedback Loops

**Q8.3.1**: How should feedback flow back to improve the system?
- [ ] Direct feedback to training pipeline
- [ ] Feedback aggregation and analysis first
- [ ] Hybrid: Immediate feedback for rules, aggregated for ML training

**Q8.3.2**: Should we implement online learning (continuous model updates)?
- [ ] Yes, incremental model updates
- [ ] No, batch retraining only
- [ ] Hybrid: Online learning for rules, batch for ML models

**Q8.3.3**: How should we measure feedback quality?
- [ ] User rating of predictions
- [ ] Outcome tracking (actual vs. predicted)
- [ ] Both (ratings + outcomes)

### 8.4 Memory & Context

**Q8.4.1**: How should the CAIS system use historical memory?
- [ ] Historical patterns as features
- [ ] Historical outcomes for training
- [ ] Historical context for explanations
- [ ] All of the above

**Q8.4.2**: Should we implement a memory service to manage historical data?
- [ ] Yes, dedicated MemoryService
- [ ] No, use existing Cosmos DB queries
- [ ] Hybrid: MemoryService for optimized queries, Cosmos DB for storage

**Q8.4.3**: How should we handle memory staleness?
- [ ] Real-time updates (immediate memory updates)
- [ ] Periodic refresh (hourly, daily)
- [ ] Event-driven updates (on opportunity changes)

---

## 9. Migration & Rollout (Critical Strategy)

### 9.1 Phased Rollout

**Q9.1.1**: What should be the rollout strategy?
- [ ] All tenants at once
- [ ] Gradual rollout (10%, 50%, 100%)
- [ ] Beta program (selected tenants first)

**Q9.1.2**: Should we implement feature flags for ML features?
- [ ] Yes, per-tenant feature flags
- [ ] Yes, global feature flags
- [ ] No, deploy to all

**Q9.1.3**: How should we handle rollback if issues are detected?
- [ ] Automatic rollback on error rate threshold
- [ ] Manual rollback process
- [ ] Both (auto + manual override)

### 9.2 Data Migration

**Q9.2.1**: Do we need to backfill historical predictions?
- [ ] Yes, generate predictions for all historical opportunities
- [ ] No, start fresh with new predictions only
- [ ] Hybrid: Backfill for recent opportunities only

**Q9.2.2**: How should we handle existing risk evaluations when ML is added?
- [ ] Re-evaluate all opportunities with ML
- [ ] Keep existing, add ML for new evaluations
- [ ] Hybrid: Re-evaluate high-value opportunities

**Q9.2.3**: Should we migrate existing training data to Azure ML Datastores?
- [ ] Yes, export all historical data
- [ ] No, start with new data only
- [ ] Incremental migration (recent data first)

---

## Answer Template

For each question, use this template:

```markdown
**Q[X.X.X]**: [Question text]
- [x] Selected answer
- [ ] Alternative answer (not selected)
- [ ] Alternative answer (not selected)

**Decision**: [Brief explanation of decision]
**Rationale**: [Why this decision was made]
**Notes**: [Any additional context, constraints, or follow-up questions]
**Status**: ✅ Answered | ⏳ Pending | ❓ Needs Discussion
```

---

## Next Steps

1. **Answer High-Impact Questions First**: These must be resolved before implementation
2. **Document Decisions**: Use the answer template for each question
3. **Create Architecture Document**: Use answers to finalize CAIS architecture
4. **Proceed to Implementation Plan**: Once high-impact questions are answered

---

**Document Status:** High-Impact Questions Compiled  
**Last Updated:** January 2025  
**Priority:** 🔴 **CRITICAL** - Must answer before implementation
