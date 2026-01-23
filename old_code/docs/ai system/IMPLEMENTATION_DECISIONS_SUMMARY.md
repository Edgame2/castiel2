# ML Implementation Decisions Summary

**Date:** 2025-01-28  
**Status:** All Critical Decisions Made ✅  
**Ready for Implementation:** Yes

---

## Executive Summary

All critical decisions for ML system implementation have been made. This document summarizes the key decisions that will guide the implementation.

---

## ✅ Critical Decisions Made

### 1. Azure Infrastructure

**Decision**: Create new Azure ML Workspace
- **Subscription**: `main`
- **Resource Group**: `castiel-ml-{environment}-rg` (e.g., `castiel-ml-dev-rg`)
- **Region**: `eastus` (same as Cosmos DB/Redis for latency, matches existing infrastructure)
- **Key Vault**: Separate Key Vault for ML secrets (security best practice)
- **Authentication**: Managed Identity (already used in codebase)
- **Compute**: Azure ML Compute Clusters (managed, auto-scaling, small-team friendly)
- **Networking**: Public endpoints initially (can migrate to private later)

### 2. Training Strategy

**Decision**: Full AutoML + Synthetic Data Augmentation
- **AutoML**: Full Azure ML AutoML (automated model selection, feature engineering, hyperparameter tuning)
- **Rationale**: Small team friendly, accelerates development, minimal manual tuning
- **Synthetic Data**: SMOTE + statistical sampling for initial training (limited historical data)
- **Training Schedule**: Weekly (real-time monitoring)

### 3. Opportunity Schema Enhancement

**Decision**: Add all recommended ML fields
- `daysInStage`: Number of days in current stage (for risk scoring)
- `daysSinceLastActivity`: Days since last activity (for risk scoring)
- `dealVelocity`: Rate of stage progression (for forecasting)
- `competitorCount`: Number of competitors (for risk scoring)
- `stakeholderCount`: Number of stakeholders (for risk scoring)
- `documentCount`: Number of documents (for risk scoring)
- `emailCount`: Email interaction count (for recommendations)
- `meetingCount`: Meeting count (for recommendations)

### 4. Performance Thresholds

**Decision**: Accept recommended thresholds

**Risk Scoring**:
- Calibration Error: < 0.05 (5%)
- Brier Score: < 0.15
- AUC: > 0.70 (minimum), > 0.80 (target)

**Revenue Forecasting**:
- MAPE: < 20% (minimum), < 15% (target)
- Forecast Bias: < 5%
- R²: > 0.60 (minimum), > 0.75 (target)

**Recommendations**:
- NDCG@10: > 0.60 (minimum), > 0.75 (target)
- CTR Uplift: > 10% vs. baseline (minimum), > 20% (target)
- Precision@10: > 0.40 (minimum), > 0.50 (target)

### 5. Historical Data Strategy

**Decision**: Start with ML right now using synthetic/external data
- **Strategy**: Synthetic data augmentation (SMOTE + statistical sampling)
- **Rationale**: Don't wait for data accumulation, start ML immediately
- **Approach**: Use synthetic data for initial training, gradually replace with real data as it accumulates

### 6. Service Integration Priority

**Decision**: Start with RiskEvaluationService first
- **Week 1-4**: RiskEvaluationService integration (highest impact, most critical)
- **Week 5-6**: RevenueForecastService integration
- **Week 7-8**: RecommendationsService integration

### 7. Service Architecture

**Decision**: Integrated services (not separate microservices)
- **Rationale**: Simpler for small team, lower latency, easier debugging
- **Location**: ML services in same API service (`apps/api/src/services/ml/`)
- **Trade-off**: Can extract to separate service later if needed

### 8. Cache Strategy

**Decision**: Event-based cache invalidation
- **Strategy**: Cache invalidated when opportunity changes (no fixed TTL)
- **Rationale**: User stated "As long as the opportunity does not change"
- **Implementation**: Use Cosmos DB change feed or webhooks to invalidate cache on opportunity updates

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [x] Decisions made ✅
- [ ] Create Azure ML Workspace
- [ ] Set up Azure ML Key Vault
- [ ] Configure Azure ML Compute Clusters
- [ ] Add ML config to `apps/api/src/config/env.ts`
- [ ] Add new opportunity schema fields
- [ ] Create `FeatureStoreService`
- [ ] Implement synthetic data augmentation
- [ ] Set up Azure ML Datastore for training data

### Phase 2: Risk Scoring ML (Weeks 3-4) - **START HERE**
- [ ] Implement `MLService` (generic orchestration)
- [ ] Implement `ModelService` (Azure ML client)
- [ ] Implement `TrainingService` (Azure ML orchestration with AutoML)
- [ ] Create training pipeline for Risk Scoring with AutoML
- [ ] Train initial Risk Scoring model (with synthetic data if needed)
- [ ] Integrate ML into `RiskEvaluationService`
- [ ] Add ML endpoints (`/api/v1/ml/risk-scoring`)
- [ ] Implement calibration for risk scores
- [ ] Implement event-based cache invalidation

### Phase 3: Revenue Forecasting ML (Weeks 5-6)
- [ ] Implement feature extraction for Forecasting
- [ ] Create training pipeline for Forecasting with AutoML
- [ ] Train initial Forecasting model
- [ ] Integrate ML into `RevenueForecastService`
- [ ] Add ML endpoints (`/api/v1/ml/forecasting`)
- [ ] Implement uncertainty quantification (P10/P50/P90)

### Phase 4: Recommendations ML (Weeks 7-8)
- [ ] Implement feature extraction for Recommendations
- [ ] Create training pipeline for Recommendations with AutoML
- [ ] Train initial Recommendations model (XGBoost Ranker)
- [ ] Integrate ML into `RecommendationsService`
- [ ] Add ML endpoints (`/api/v1/ml/recommendations`)

### Phase 5: Operations (Weeks 9-10)
- [ ] Set up monitoring and alerts
- [ ] Implement drift detection
- [ ] Create runbooks
- [ ] Set up continuous learning pipeline
- [ ] Performance optimization

---

## 🔍 Remaining Questions (Non-Blocking)

### Q1: Team Azure ML Knowledge
**Question**: Does the team need training on Azure ML?
- [ ] Yes, Azure ML basics
- [ ] Yes, ML model operations
- [ ] No, team is already familiar

**Impact**: Low (can be addressed during implementation)  
**Status**: Non-blocking - Can be handled during Phase 1 setup

### Q2: Opportunity Schema Field Implementation
**Question**: Should new opportunity fields be:
- [ ] Computed on-demand (during feature extraction)
- [ ] Stored in `structuredData` (persisted)
- [x] **Hybrid (computed + cached)** - **RECOMMENDED**

**Recommendation**: Hybrid approach
- Compute on-demand during feature extraction
- Cache computed values in Redis (event-based invalidation)
- Optionally persist frequently-used fields (e.g., `daysInStage`, `daysSinceLastActivity`)

**Impact**: Medium (affects feature extraction performance)  
**Status**: Non-blocking - Recommendation provided, can be refined during implementation

**Implementation Strategy**:
1. **Phase 1**: Compute on-demand + Redis cache (fastest to implement)
2. **Phase 2**: Evaluate which fields to persist based on usage patterns
3. **Fields to Consider Persisting**: `daysInStage`, `daysSinceLastActivity`, `dealVelocity` (frequently used, expensive to compute)

---

## 📊 Decision Impact Summary

| Decision | Impact | Complexity | Timeline Impact |
|----------|--------|------------|-----------------|
| Full AutoML | High (reduces manual work) | Low (Azure ML handles it) | -2 weeks (faster development) |
| Synthetic Data | High (enables immediate start) | Medium (need validation) | +1 week (data generation) |
| Azure ML Compute Clusters | Medium (better than Container Instances) | Low (managed service) | No impact |
| Integrated Services | High (simpler architecture) | Low (follows existing pattern) | -1 week (simpler deployment) |
| Event-based Cache | Medium (better freshness) | Medium (need change feed) | +0.5 weeks (implementation) |
| RiskEvaluationService First | High (highest impact) | Low (clear priority) | No impact |

---

## ✅ All Documentation Updated

The following documents have been updated to reflect these decisions:

1. ✅ `ARCHITECTURE.md` - Updated with AutoML, Compute Clusters, synthetic data, event-based cache
2. ✅ `TRAINING_PIPELINE.md` - Updated with AutoML workflow and synthetic data augmentation
3. ✅ `FEATURE_ENGINEERING.md` - Updated with new opportunity schema fields
4. ✅ `IMPLEMENTATION_STATUS_AND_PLAN.md` - Updated with implementation decisions and priorities
5. ✅ `ML_SYSTEM_OVERVIEW.md` - Updated with final architecture decisions
6. ✅ `MODEL_REGISTRY.md` - Updated cache strategy (event-based invalidation)
7. ✅ `ML_INTEGRATION_ANSWERS_AND_ESSENTIAL_QUESTIONS.md` - All questions answered
8. ✅ `README.md` - Updated with new documents and infrastructure details

---

## 🚀 Ready for Implementation

**Status**: ✅ **All critical decisions made, ready to begin Phase 1**

**Next Steps**:
1. ✅ Review this summary - **COMPLETE**
2. ✅ All critical decisions made - **COMPLETE**
3. ⏳ Begin Phase 1: Foundation (Weeks 1-2) - **READY TO START**
4. ⏳ Start with RiskEvaluationService integration (Weeks 3-4) - **READY TO START**

**Remaining Questions**: 2 non-blocking questions (Q1, Q2) - Can be addressed during implementation

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-28
