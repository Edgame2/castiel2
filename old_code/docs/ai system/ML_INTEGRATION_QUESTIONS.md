# ML System Integration Questions

## Executive Summary

This document contains an extensive list of questions to ensure the Machine Learning system is **fully integrated** with the current Castiel implementation. These questions cover:

- **Data Integration**: How ML models access and use existing data structures
- **Service Integration**: How ML services integrate with existing services (RiskEvaluationService, RevenueForecastService, RecommendationsService)
- **Infrastructure Integration**: Azure ML Workspace setup, authentication, networking
- **API Integration**: Endpoint design, request/response formats, backward compatibility
- **Monitoring Integration**: Application Insights integration, metrics, alerts
- **Deployment Integration**: CI/CD, environment configuration, feature flags
- **Data Flow Integration**: Feature extraction, training data pipelines, inference workflows
- **Business Logic Integration**: How ML enhances (not replaces) existing rule-based and LLM-powered logic

**Confidence Level**: High (85-90%) for implementation, pending answers to these questions.

---

## 1. Azure Infrastructure & Configuration

### 1.1 Azure ML Workspace Setup

**Q1.1.1**: Do you have an existing Azure ML Workspace, or should we create one?
- [x] **Create new workspace** ✅ ANSWERED
- [ ] Use existing workspace: `_________________`
- [ ] Need guidance on workspace creation

**Q1.1.2**: What Azure subscription and resource group should the ML workspace use?
- Subscription: `main` ✅ ANSWERED
- Resource Group: `castiel-ml-dev-rg` ✅ ANSWERED
- Region: `eastus` ✅ ANSWERED (same region as Cosmos DB/Redis for latency, matches existing infrastructure)

**Q1.1.3**: What authentication method should Azure ML services use?
- [x] **Managed Identity (recommended for production)** ✅ BEST PRACTICE
- [ ] Service Principal
- [ ] Access Keys
- [ ] Current: `_________________`
- **Recommendation**: Use Managed Identity for production. The codebase already uses Managed Identity for Key Vault (`useManagedIdentity: true` in `apps/api/src/index.ts`).

**Q1.1.4**: Should Azure ML Workspace share the same Key Vault as the main application?
- [ ] Yes, use existing Key Vault: `_________________`
- [x] **No, create separate Key Vault for ML secrets** ✅ ANSWERED
- [ ] Current Key Vault URL: `_________________`
- **Recommendation**: Separate Key Vault for ML is a good security practice (principle of least privilege).

**Q1.1.5**: What compute targets should we configure for training?
- [ ] Azure ML Compute (CPU clusters)
- [ ] Azure ML Compute (GPU clusters) - for NCF in Phase 2
- [ ] Azure ML Compute Instances (for development)
- [ ] Current compute setup: `_________________`

### 1.2 Azure ML Managed Endpoints

**Q1.2.1**: What networking configuration should Managed Endpoints use?
- [x] **Public endpoint (default)** ✅ ANSWERED - "public for now"
- [ ] Private endpoint (VNet integration)
- [ ] Current networking setup: `_________________`
- **Note**: Can migrate to private endpoints later if security requirements change.

**Q1.2.2**: Should Managed Endpoints use the same Application Insights instance as the main API?
- [x] **Yes, use existing Application Insights** ✅ BEST PRACTICE
- [ ] No, create separate Application Insights for ML
- [ ] Current Application Insights connection string: `_________________`
- **Finding**: Application Insights is already configured in `packages/monitoring/src/providers/application-insights.ts` and initialized in `apps/api/src/index.ts`. Use the same instance for unified monitoring.

**Q1.2.3**: What authentication should Managed Endpoints require?
- [x] Managed Identity (system-assigned, aligns with existing infrastructure)
- [ ] Key-based authentication (default, simpler but less secure)
- [ ] Token-based authentication (Azure AD)
- [ ] Should match API authentication: `_________________`

### 1.3 Environment Variables & Configuration

**Q1.3.1**: Where should Azure ML configuration be stored?
- [ ] Environment variables (`.env` files)
- [ ] Azure Key Vault (secrets)
- [ ] Cosmos DB (configuration container)
- [ ] Current config pattern: `_________________`

**Q1.3.2**: What environment variables are needed for Azure ML integration?
- Required variables:
  - `AZURE_ML_WORKSPACE_NAME`: `_________________`
  - `AZURE_ML_RESOURCE_GROUP`: `_________________`
  - `AZURE_ML_SUBSCRIPTION_ID`: `_________________`
  - `AZURE_ML_ENDPOINT_URL_*`: `_________________` (per model)
- Optional variables:
  - `AZURE_ML_COMPUTE_NAME`: `_________________`
  - `AZURE_ML_EXPERIMENT_NAME`: `_________________`

**Q1.3.3**: Should ML configuration be added to `apps/api/src/config/env.ts`?
- [ ] Yes, add ML config section
- [ ] No, use separate config file
- [ ] Pattern to follow: `_________________`

---

## 2. Data Integration

### 2.1 Data Models & Schemas

**Q2.1.1**: How should ML models access Opportunity data?
- [ ] Direct Cosmos DB queries (via ShardRepository)
- [ ] Cached data (via Redis)
- [ ] Feature Store service (new)
- [ ] Current pattern: `_________________`

**Q2.1.2**: What is the exact schema of Opportunity shards (`structuredData`)?
- Key fields for Risk Scoring: `_________________`
- Key fields for Revenue Forecasting: `_________________`
- Key fields for Recommendations: `_________________`
- Sample opportunity data structure: `_________________`

**Q2.1.3**: How should we handle related shards (Account, Contact, etc.) for feature extraction?
- [ ] Use `ShardRelationshipService.getRelatedShards()`
- [ ] Cache relationships in Redis
- [ ] Pre-compute relationship features
- [ ] Current relationship access pattern: `_________________`

**Q2.1.4**: What Cosmos DB containers should ML services access?
- Opportunities: Container name `_________________`
- Accounts: Container name `_________________`
- Contacts: Container name `_________________`
- Historical outcomes: Container name `_________________` (if separate)
- Other relevant containers: `_________________`

**Q2.1.5**: How should we handle tenant isolation for ML data access?
- [ ] Use existing `tenantId` filtering in repositories
- [ ] Add ML-specific tenant isolation layer
- [ ] Current tenant isolation pattern: `_________________`

### 2.2 Feature Store Integration

**Q2.2.1**: Should the Feature Store be a new service or integrated into existing services?
- [ ] New `FeatureStoreService`
- [ ] Extend `ShardRepository` with feature methods
- [ ] Integrate into `RiskEvaluationService` / `RevenueForecastService`
- [ ] Current preference: `_________________`

**Q2.2.2**: Where should feature data be stored?
- [ ] Cosmos DB (new container: `features`)
- [ ] Redis (cached features)
- [ ] Azure Blob Storage (for large feature sets)
- [ ] Azure ML Datastore (for training)
- [ ] Hybrid approach: `_________________`

**Q2.2.3**: How should feature versioning be implemented?
- [ ] Store version in feature metadata (Cosmos DB)
- [ ] Use Azure ML Datastore versioning
- [ ] Custom versioning system
- [ ] Minimum viable versioning for Phase 1: `_________________`

**Q2.2.4**: Should feature extraction be synchronous or asynchronous?
- [ ] Synchronous (real-time during inference)
- [ ] Asynchronous (pre-compute and cache)
- [ ] Hybrid (cache common features, compute on-demand for rare features)
- [ ] Current pattern: `_________________`

### 2.3 Training Data Pipeline

**Q2.3.1**: How should we identify historical opportunities with known outcomes?
- [ ] Query opportunities with `stage = 'closed_won' | 'closed_lost'`
- [ ] Use separate outcomes table/container
- [ ] Derive from opportunity `structuredData.status`
- [ ] Current outcome tracking: `_________________`

**Q2.3.2**: What is the minimum historical data required for training?
- Minimum opportunities: `_________________`
- Minimum time range: `_________________`
- Minimum per tenant/industry: `_________________`

**Q2.3.3**: How should we handle data quality for training?
- [ ] Use existing `DataQualityService.validateOpportunityDataQuality()`
- [ ] Add ML-specific data quality checks
- [ ] Filter out low-quality opportunities before training
- [ ] Current data quality thresholds: `_________________`

**Q2.3.4**: Should training data be exported to Azure ML Datastore or queried on-demand?
- [ ] Export to Azure ML Datastore (recommended for large datasets)
- [ ] Query Cosmos DB on-demand during training
- [ ] Hybrid (export for initial training, incremental updates via queries)
- [ ] Current preference: `_________________`

**Q2.3.5**: How should we handle imbalanced data (e.g., more won than lost opportunities)?
- [ ] Use class weights in XGBoost
- [ ] Oversample minority class
- [ ] Undersample majority class
- [ ] Current approach: `_________________`

---

## 3. Service Integration

### 3.1 RiskEvaluationService Integration

**Q3.1.1**: How should ML risk scoring integrate with existing `RiskEvaluationService.evaluateOpportunity()`?
- [ ] Replace `calculateRiskScore()` with ML model
- [ ] Add ML score as additional detection method
- [ ] Combine rule-based + AI + ML scores (weighted ensemble)
- [ ] Current scoring logic: `_________________`

**Q3.1.2**: Should ML risk scores replace or complement existing risk detection methods?
- [ ] Replace rule-based scoring (ML only)
- [ ] Complement (add ML score to existing methods)
- [ ] Use ML for calibration of existing scores
- [ ] Current preference: `_________________`

**Q3.1.3**: How should ML risk scores integrate with `DetectedRisk` objects?
- [ ] Add `mlScore` field to `DetectedRisk`
- [ ] Create separate `MLRiskScore` object
- [ ] Use ML to adjust `confidence` and `contribution` fields
- [ ] Current `DetectedRisk` structure: `_________________`

**Q3.1.4**: Should ML risk scoring use the same cache as `RiskEvaluationService`?
- [ ] Yes, extend existing cache key: `${tenantId}:${opportunityId}`
- [ ] No, separate cache for ML scores
- [ ] Current cache TTL: `_________________` (15 minutes)

**Q3.1.5**: How should probability calibration be applied?
- [ ] In `ModelService` (post-inference calibration)
- [ ] In `RiskEvaluationService` (after ML score retrieval)
- [ ] As part of Azure ML endpoint (pre-deployment calibration)
- [ ] Current preference: `_________________`

**Q3.1.6**: Should ML risk scoring trigger the same async processing as rule-based evaluation?
- [ ] Yes, use `queueRiskEvaluation()` for ML scores
- [ ] No, ML scores are synchronous only
- [ ] Hybrid (sync for real-time, async for batch updates)
- [ ] Current async processing: `_________________`

### 3.2 RevenueForecastService Integration

**Q3.2.1**: How should ML forecasting integrate with existing `RevenueForecastService.generateForecast()`?
- [ ] Replace probability-weighted calculation with ML model
- [ ] Add ML forecast as additional scenario
- [ ] Use ML to adjust probability estimates
- [ ] Current forecasting logic: `_________________`

**Q3.2.2**: Should ML forecasting replace or complement existing scenarios (best/base/worst case)?
- [ ] Replace all scenarios with ML quantiles (P10/P50/P90)
- [ ] Add ML forecast as new scenario type
- [ ] Use ML to improve probability estimates for existing scenarios
- [ ] Current scenario calculation: `_________________`

**Q3.2.3**: How should ML forecasting handle period aggregation (month/quarter/year)?
- [ ] Forecast at opportunity level, then aggregate
- [ ] Forecast directly at period level
- [ ] Hybrid (opportunity-level for accuracy, period-level for speed)
- [ ] Current period calculation: `_________________`

**Q3.2.4**: Should ML forecasting use the same opportunity filtering as `RevenueForecastService`?
- [ ] Yes, use `OpportunityService.listOwnedOpportunities()` filters
- [ ] No, ML should filter opportunities differently
- [ ] Current filters: `_________________`

**Q3.2.5**: How should uncertainty quantification (P10/P50/P90) be exposed in the API?
- [ ] Add `uncertainty` field to `RevenueForecast` interface
- [ ] Replace `scenarios` with `quantiles` (P10/P50/P90)
- [ ] Add both (backward compatible)
- [ ] Current `RevenueForecast` structure: `_________________`

### 3.3 RecommendationsService Integration

**Q3.3.1**: How should ML recommendations integrate with existing `RecommendationsService.getRecommendations()`?
- [ ] Replace vector search + collaborative + temporal with ML ranker
- [ ] Add ML ranker as additional source (merge with existing)
- [ ] Use ML to re-rank existing recommendations
- [ ] Current recommendation sources: `_________________`

**Q3.3.2**: Should ML recommendations replace or complement existing recommendation methods?
- [ ] Replace all methods (ML only)
- [ ] Complement (add ML to existing 50/30/20 weighting)
- [ ] Use ML for final re-ranking of all sources
- [ ] Current weighting: Vector 50%, Collaborative 30%, Temporal 20%

**Q3.3.3**: How should ML recommendations integrate with `Recommendation` interface?
- [ ] Add `mlScore` field to `Recommendation`
- [ ] Replace `score` with ML-generated score
- [ ] Use ML to adjust `explanation` field
- [ ] Current `Recommendation` structure: `_________________`

**Q3.3.4**: Should ML recommendations use the same cache as `RecommendationsService`?
- [ ] Yes, extend existing cache: `recommendations:${projectId}:${userId}`
- [ ] No, separate cache for ML recommendations
- [ ] Current cache TTL: `_________________` (30 minutes)

**Q3.3.5**: How should ML recommendations handle different recommendation types?
- [ ] Single ML model for all types
- [ ] Separate ML models per type (if applicable)
- [ ] Current recommendation types: `_________________`

### 3.4 New ML Services

**Q3.4.1**: Where should `MLService` (generic ML orchestration) be initialized?
- [ ] In `apps/api/src/services/initialization/ai-services.init.ts`
- [ ] In `apps/api/src/services/initialization/analytics-services.init.ts`
- [ ] New file: `apps/api/src/services/initialization/ml-services.init.ts`
- [ ] Current service initialization pattern: `_________________`

**Q3.4.2**: How should `ModelService` (Azure ML client) be initialized?
- [ ] As singleton (shared across requests)
- [ ] Per-request instance
- [ ] Lazy initialization (on first use)
- [ ] Current service lifecycle: `_________________`

**Q3.4.3**: How should `TrainingService` (Azure ML orchestration) be triggered?
- [ ] Scheduled job (Azure Functions / Cron)
- [ ] Manual API endpoint
- [ ] Event-driven (on data changes)
- [ ] Current job scheduling: `_________________`

**Q3.4.4**: Should ML services use the same dependency injection pattern as existing services?
- [ ] Yes, follow existing DI pattern
- [ ] No, use simpler constructor injection
- [ ] Current DI pattern: `_________________`

---

## 4. API Integration

### 4.1 Endpoint Design

**Q4.1.1**: Should ML endpoints be under `/api/v1/ml` or integrated into existing routes?
- [ ] New `/api/v1/ml` routes (recommended)
- [ ] Extend existing `/api/v1/risk-analysis` routes
- [ ] Extend existing `/api/v1/insights` routes
- [ ] Current route structure: `_________________`

**Q4.1.2**: Should ML endpoints require the same authentication as existing API?
- [ ] Yes, use existing JWT/auth middleware
- [ ] No, separate ML API keys
- [ ] Current auth middleware: `_________________`

**Q4.1.3**: How should ML endpoints handle backward compatibility?
- [ ] New endpoints only (no changes to existing)
- [ ] Extend existing endpoints with ML options
- [ ] Feature flag to enable/disable ML
- [ ] Current versioning strategy: `_________________`

**Q4.1.4**: Should ML inference be synchronous or asynchronous by default?
- [ ] Synchronous (<500ms target)
- [ ] Asynchronous (Phase 2)
- [ ] Both (query parameter: `?async=true`)
- [ ] Current API pattern: `_________________`

### 4.2 Request/Response Formats

**Q4.2.1**: Should ML endpoints accept the same request formats as existing services?
- [ ] Yes, use `opportunityId` + `tenantId` (like RiskEvaluationService)
- [ ] No, ML-specific request format (feature vectors)
- [ ] Hybrid (accept both)
- [ ] Current request format: `_________________`

**Q4.2.2**: How should ML responses integrate with existing response types?
- [ ] Extend `RiskEvaluation` with `mlScore` field
- [ ] Extend `RevenueForecast` with `mlForecast` field
- [ ] New ML-specific response types
- [ ] Current response types: `_________________`

**Q4.2.3**: Should ML endpoints return explainability/feature importance?
- [ ] Yes, include in response (SHAP values, feature contributions)
- [ ] No, keep responses simple
- [ ] Optional (query parameter: `?explain=true`)
- [ ] Current explainability: `_________________`

**Q4.2.4**: How should errors from Azure ML endpoints be handled?
- [ ] Return Azure ML error directly
- [ ] Map to application error codes
- [ ] Fallback to rule-based/AI methods
- [ ] Current error handling: `_________________`

### 4.3 Rate Limiting & Quotas

**Q4.3.1**: Should ML endpoints have separate rate limits?
- [ ] Yes, stricter limits (ML is expensive)
- [ ] No, same limits as existing API
- [ ] Per-tenant quotas
- [ ] Current rate limiting: `_________________`

**Q4.3.2**: How should ML inference costs be tracked?
- [ ] Per-tenant usage tracking
- [ ] Per-user usage tracking
- [ ] Application Insights custom metrics
- [ ] Current cost tracking: `_________________`

---

## 5. Monitoring & Observability

### 5.1 Application Insights Integration

**Q5.1.1**: Should ML metrics use the same Application Insights instance?
- [ ] Yes, use existing instance
- [ ] No, separate Application Insights for ML
- [ ] Current Application Insights setup: `_________________`

**Q5.1.2**: What custom metrics should we track for ML?
- [ ] Model inference latency
- [ ] Model prediction distribution
- [ ] Feature extraction time
- [ ] Model version usage
- [ ] Business metrics (calibration error, forecast bias, CTR)
- [ ] Current custom metrics: `_________________`

**Q5.1.3**: How should ML errors be logged?
- [ ] Same logging pattern as existing services
- [ ] ML-specific error categories
- [ ] Current logging pattern: `_________________`

**Q5.1.4**: Should ML inference be traced with distributed tracing?
- [ ] Yes, use existing trace IDs
- [ ] No, separate ML traces
- [ ] Current tracing setup: `_________________`

### 5.2 Drift Detection & Alerts

**Q5.2.1**: How should drift detection alerts be configured?
- [ ] Application Insights alerts
- [ ] Azure Monitor alerts
- [ ] Email/Slack notifications
- [ ] Current alerting: `_________________`

**Q5.2.2**: Who should receive drift detection alerts?
- [ ] ML team
- [ ] DevOps team
- [ ] Product team
- [ ] Current alert recipients: `_________________`

**Q5.2.3**: Should drift detection trigger automatic retraining?
- [ ] Yes, automatic retraining on drift
- [ ] No, manual retraining only
- [ ] Current automation level: `_________________`

### 5.3 Business Metrics Tracking

**Q5.3.1**: How should business metrics (calibration error, forecast bias, CTR) be stored?
- [ ] Cosmos DB (metrics container)
- [ ] Application Insights (custom metrics)
- [ ] Azure ML metrics
- [ ] Current metrics storage: `_________________`

**Q5.3.2**: How often should business metrics be calculated?
- [ ] Real-time (on each prediction)
- [ ] Daily batch job
- [ ] Weekly batch job
- [ ] Current calculation frequency: `_________________`

---

## 6. Deployment & CI/CD

### 6.1 Model Deployment

**Q6.1.1**: How should model deployments be triggered?
- [ ] Manual deployment (API endpoint)
- [ ] Automatic (on model training completion)
- [ ] CI/CD pipeline (on git push)
- [ ] Current deployment process: `_________________`

**Q6.1.2**: Should model deployments use blue-green or canary strategy?
- [ ] Blue-green (instant switch)
- [ ] Canary (gradual traffic shift)
- [ ] Azure ML Managed Endpoints support both
- [ ] Current deployment strategy: `_________________`

**Q6.1.3**: How should model rollbacks be handled?
- [ ] Automatic rollback on error rate increase
- [ ] Manual rollback via API
- [ ] Current rollback process: `_________________`

### 6.2 Feature Flags

**Q6.2.1**: Should ML features be behind feature flags?
- [ ] Yes, per-tenant feature flags
- [ ] Yes, global feature flag
- [ ] No, always enabled
- [ ] Current feature flag system: `_________________`

**Q6.2.2**: How should feature flags be managed?
- [ ] Cosmos DB (feature flags container)
- [ ] Environment variables
- [ ] Azure App Configuration
- [ ] Current feature flag system: `_________________`

### 6.3 Environment Configuration

**Q6.3.1**: Should ML services be enabled in all environments (dev/staging/prod)?
- [ ] Yes, all environments
- [ ] No, production only
- [ ] Staging + production only
- [ ] Current environment setup: `_________________`

**Q6.3.2**: Should training jobs run in all environments?
- [ ] Yes, but with smaller datasets in dev/staging
- [ ] No, production only
- [ ] Current training environment: `_________________`

---

## 7. Data Flow & Workflows

### 7.1 Feature Extraction Workflow

**Q7.1.1**: When should features be extracted?
- [ ] On-demand (during inference)
- [ ] Pre-computed (scheduled job)
- [ ] Hybrid (cache common features, compute rare features on-demand)
- [ ] Current feature extraction: `_________________`

**Q7.1.2**: How should feature extraction handle missing data?
- [ ] Use default values (mean, median, mode)
- [ ] Skip opportunities with missing required features
- [ ] Use data quality service to validate
- [ ] Current missing data handling: `_________________`

**Q7.1.3**: Should feature extraction be cached?
- [ ] Yes, cache in Redis
- [ ] Yes, cache in Cosmos DB
- [ ] No, always compute fresh
- [ ] Current caching strategy: `_________________`

### 7.2 Training Workflow

**Q7.2.1**: How should training jobs be scheduled?
- [ ] Daily (overnight)
- [ ] Weekly
- [ ] On-demand (manual trigger)
- [ ] Event-driven (on data threshold reached)
- [ ] Current job scheduling: `_________________`

**Q7.2.2**: How should training data be refreshed?
- [ ] Full refresh (re-export all data)
- [ ] Incremental (only new/updated opportunities)
- [ ] Hybrid (full weekly, incremental daily)
- [ ] Current data refresh: `_________________`

**Q7.2.3**: Should training jobs be monitored in real-time?
- [ ] Yes, stream logs to Application Insights
- [ ] Yes, poll Azure ML job status
- [ ] No, check on completion only
- [ ] Current job monitoring: `_________________`

### 7.3 Inference Workflow

**Q7.3.1**: How should inference handle model version selection?
- [ ] Always use latest production model
- [ ] Support model version parameter
- [ ] A/B test multiple versions
- [ ] Current version selection: `_________________`

**Q7.3.2**: How should inference handle fallback scenarios?
- [ ] Fallback to rule-based methods
- [ ] Fallback to AI methods
- [ ] Return error
- [ ] Current fallback strategy: `_________________`

**Q7.3.3**: Should inference support batch processing?
- [ ] Yes, batch endpoint for multiple opportunities
- [ ] No, single opportunity only
- [ ] Phase 2 feature
- [ ] Current batch processing: `_________________`

---

## 8. Business Logic Integration

### 8.1 Risk Scoring Integration

**Q8.1.1**: How should ML risk scores be combined with rule-based scores?
- [ ] Replace rule-based scores
- [ ] Weighted average (e.g., 70% ML, 30% rule-based)
- [ ] Use ML to calibrate rule-based scores
- [ ] Current combination logic: `_________________`

**Q8.1.2**: Should ML risk scores respect existing risk catalog ponderations?
- [ ] Yes, apply ponderations to ML scores
- [ ] No, ML scores are independent
- [ ] Use ponderations as features for ML
- [ ] Current ponderations: `_________________`

**Q8.1.3**: How should ML risk scores integrate with category scores?
- [ ] ML provides category scores directly
- [ ] ML provides global score, categories from rules
- [ ] Hybrid (ML + rules for categories)
- [ ] Current category scoring: `_________________`

### 8.2 Revenue Forecasting Integration

**Q8.2.1**: How should ML forecasts integrate with existing probability estimates?
- [ ] Replace probability with ML predictions
- [ ] Use ML to improve probability estimates
- [ ] Use ML for uncertainty quantification only
- [ ] Current probability calculation: `_________________`

**Q8.2.2**: Should ML forecasts respect existing opportunity filters (owner, status, etc.)?
- [ ] Yes, use same filters
- [ ] No, ML should see all opportunities
- [ ] Current filters: `_________________`

**Q8.2.3**: How should ML forecasts handle opportunity stages?
- [ ] Forecast only open opportunities
- [ ] Include all opportunities (ML handles stage)
- [ ] Current stage handling: `_________________`

### 8.3 Recommendations Integration

**Q8.3.1**: How should ML recommendations integrate with existing explanation generation?
- [ ] Replace explanation with ML feature importance
- [ ] Combine ML score with existing explanation
- [ ] Use ML to improve explanation quality
- [ ] Current explanation generation: `_________________`

**Q8.3.2**: Should ML recommendations respect existing recommendation filters?
- [ ] Yes, filter before ML ranking
- [ ] No, ML handles all filtering
- [ ] Current filters: `_________________`

---

## 9. Testing & Validation

### 9.1 Unit Testing

**Q9.1.1**: How should ML services be unit tested?
- [ ] Mock Azure ML endpoints
- [ ] Use local test models
- [ ] Skip ML tests in unit test suite
- [ ] Current testing pattern: `_________________`

**Q9.1.2**: Should feature extraction be unit tested?
- [ ] Yes, test feature extraction logic
- [ ] No, integration test only
- [ ] Current feature testing: `_________________`

### 9.2 Integration Testing

**Q9.2.1**: Should integration tests use real Azure ML endpoints?
- [ ] Yes, use staging Azure ML workspace
- [ ] No, mock Azure ML endpoints
- [ ] Hybrid (mock for CI, real for manual testing)
- [ ] Current integration testing: `_________________`

**Q9.2.2**: How should integration tests handle training data?
- [ ] Use synthetic test data
- [ ] Use anonymized production data
- [ ] Use small real dataset
- [ ] Current test data: `_________________`

### 9.3 Model Validation

**Q9.3.1**: How should model performance be validated before deployment?
- [ ] Automated validation (threshold checks)
- [ ] Manual review
- [ ] A/B test in staging
- [ ] Current validation process: `_________________`

**Q9.3.2**: What are the minimum performance thresholds for production deployment?
- Risk Scoring: Calibration error < `_________________`, Brier score < `_________________`
- Revenue Forecasting: MAPE < `_________________`, Forecast bias < `_________________`
- Recommendations: NDCG > `_________________`, CTR uplift > `_________________`

---

## 10. Security & Compliance

### 10.1 Data Privacy

**Q10.1.1**: Should ML models have access to PII data?
- [ ] Yes, full access (models need it for accuracy)
- [ ] No, anonymize before ML processing
- [ ] Hybrid (anonymize sensitive fields only)
- [ ] Current PII handling: `_________________`

**Q10.1.2**: How should training data be anonymized?
- [ ] Use existing PII redaction service
- [ ] New ML-specific anonymization
- [ ] No anonymization needed
- [ ] Current anonymization: `_________________`

### 10.2 Access Control

**Q10.2.1**: Should ML endpoints require special permissions?
- [ ] Yes, new ML-specific roles
- [ ] No, same permissions as existing API
- [ ] Current role system: `_________________`

**Q10.2.2**: Who should have access to trigger training jobs?
- [ ] ML team only
- [ ] DevOps team
- [ ] Admin users
- [ ] Current admin access: `_________________`

### 10.3 Audit & Compliance

**Q10.3.1**: Should ML predictions be audited?
- [ ] Yes, log all predictions to audit trail
- [ ] No, only log errors
- [ ] Sample logging (1% of predictions)
- [ ] Current audit logging: `_________________`

**Q10.3.2**: How should ML model decisions be explained for compliance?
- [ ] SHAP values for feature importance
- [ ] Rule-based explanations
- [ ] LLM-generated explanations
- [ ] Current explainability: `_________________`

---

## 11. Performance & Scalability

### 11.1 Latency Requirements

**Q11.1.1**: What are the latency requirements for ML inference?
- [ ] < 100ms (real-time UI)
- [ ] < 500ms (acceptable)
- [ ] < 5s (batch processing)
- [ ] Current latency targets: `_________________`

**Q11.1.2**: How should we handle slow feature extraction?
- [ ] Cache features aggressively
- [ ] Pre-compute features
- [ ] Optimize feature extraction code
- [ ] Current optimization: `_________________`

### 11.2 Scalability

**Q11.2.1**: How many concurrent ML inference requests should we support?
- [ ] 10 requests/second
- [ ] 100 requests/second
- [ ] 1000 requests/second
- [ ] Current API capacity: `_________________`

**Q11.2.2**: Should ML endpoints auto-scale?
- [ ] Yes, Azure ML Managed Endpoints auto-scale
- [ ] No, fixed capacity
- [ ] Current scaling: `_________________`

### 11.3 Caching Strategy

**Q11.3.1**: What should be cached for ML inference?
- [ ] Model predictions (opportunity-level)
- [ ] Feature vectors
- [ ] Related shard data
- [ ] Current caching: `_________________`

**Q11.3.2**: How long should ML predictions be cached?
- [ ] 5 minutes
- [ ] 15 minutes (same as RiskEvaluationService)
- [ ] 1 hour
- [ ] Current cache TTL: `_________________`

---

## 12. Cost Management

### 12.1 Azure ML Costs

**Q12.1.1**: What is the budget for Azure ML services?
- [ ] Monthly budget: `$_________________`
- [ ] Per-request cost target: `$_________________`
- [ ] Training cost target: `$_________________` per training run
- [ ] Current cost monitoring: `_________________`

**Q12.1.2**: How should we control Azure ML costs?
- [ ] Min replicas = 0 (scale to zero)
- [ ] Scheduled scaling (off-hours scale down)
- [ ] Per-tenant quotas
- [ ] Current cost control: `_________________`

### 12.2 ROI Tracking

**Q12.2.1**: How should ML ROI be measured?
- [ ] Risk score accuracy improvement
- [ ] Forecast accuracy improvement
- [ ] Recommendation CTR improvement
- [ ] Business impact (revenue, churn reduction)
- [ ] Current ROI tracking: `_________________`

---

## 13. Documentation & Knowledge Transfer

### 13.1 Code Documentation

**Q13.1.1**: What level of code documentation is required?
- [ ] JSDoc comments for all public methods
- [ ] Inline comments for complex logic
- [ ] Architecture diagrams
- [ ] Current documentation standard: `_________________`

### 13.2 Runbooks & Operations

**Q13.2.1**: What runbooks are needed for ML operations?
- [ ] Model deployment runbook
- [ ] Model rollback runbook
- [ ] Training job troubleshooting
- [ ] Drift detection response
- [ ] Current runbooks: `_________________`

### 13.3 Team Training

**Q13.3.1**: Does the team need training on Azure ML?
- [ ] Yes, Azure ML basics
- [ ] Yes, ML model operations
- [ ] No, team is already familiar
- [ ] Current team ML knowledge: `_________________`

---

## Next Steps

1. **Review this document** and provide answers to all questions (or mark "TBD" for items to decide later)
2. **Prioritize questions** - which are blocking vs. can be decided during implementation?
3. **Schedule architecture review** - discuss high-priority questions with the team
4. **Create implementation plan** - based on answers, create detailed implementation tasks

---

## Confidence Assessment

**Overall Confidence**: **85-90%** for full integration, pending answers to these questions.

**High Confidence Areas** (90%+):
- Azure ML Workspace setup and configuration
- Service architecture and integration patterns
- API endpoint design
- Monitoring and observability

**Medium Confidence Areas** (70-85%):
- Feature extraction and data pipeline (depends on data schema clarity)
- Training workflow (depends on historical data availability)
- Business logic integration (depends on exact combination strategy)

**Lower Confidence Areas** (60-70%):
- Cost optimization (depends on usage patterns)
- Performance at scale (depends on load testing)
- Compliance requirements (depends on specific regulations)

**Blockers** (need answers before starting):
- Azure ML Workspace configuration (Q1.1.1 - Q1.1.5)
- Data schema and access patterns (Q2.1.2 - Q2.1.4)
- Service integration strategy (Q3.1.1, Q3.2.1, Q3.3.1)
- API endpoint design (Q4.1.1 - Q4.1.4)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27  
**Next Review**: After answers provided
