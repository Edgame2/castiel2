# Feedbacks and Recommendations Implementation - Questions

**Date:** January 2025  
**Purpose:** Gather all necessary information before creating detailed implementation plans  
**Status:** Questions to be answered

---

## Quick Status Summary

### ✅ What Exists (Can Build Upon)

1. **Risk Catalog Service** (`containers/risk-catalog/`)
   - Fully functional with CRUD operations
   - Global, industry, tenant-specific risks
   - Events and REST API working

2. **Recommendations Service** (`containers/recommendations/`)
   - Multi-factor recommendation engine working
   - Basic feedback (3 types: accept/ignore/irrelevant)
   - CAIS integration for learned weights
   - Event-driven architecture

3. **ML Service** (`containers/ml-service/`)
   - Basic feature extraction (~20 features)
   - AzureMLClient exists
   - Model management structure
   - Placeholder predictions (needs real model integration)

4. **Data Lake Integration** (`containers/logging/`)
   - DataLakeCollector for risk.evaluated and ml.prediction.completed
   - Parquet format support
   - Event-based sync working
   - Path structure: `/risk_evaluations/`, `/ml_inference_logs/`

### ❌ What Needs to Be Built

1. **Unified Action Catalog** - Extend Risk Catalog to include recommendations
2. **Enhanced Feedback System** - Expand from 3 to 25+ types, add analytics
3. **Feature Engineering Layer 2** - Versioning, caching, quality monitoring, more features
4. **ML Prediction Layer 3** - Real Azure ML integration, caching, A/B testing
5. **Explanation Layer 4** - SHAP integration, factor generation
6. **LLM Reasoning Layer 5** - Natural language, recommendations, scenarios
7. **Decision Engine Layer 6** - Rule evaluation, action execution
8. **Feedback Loop Layer 7** - Outcome tracking, satisfaction metrics
9. **Learning Loop Layer 8** - Retraining, drift detection
10. **Gap Items** - Sales Methodology, Opportunity Reactivation

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Priority and Scope](#priority-and-scope)
3. [Unified Action Catalog](#unified-action-catalog)
4. [Recommendation Feedback System](#recommendation-feedback-system)
5. [Feature Engineering Layer (Layer 2)](#feature-engineering-layer-layer-2)
6. [ML Prediction Layer (Layer 3)](#ml-prediction-layer-layer-3)
7. [Explanation Layer (Layer 4)](#explanation-layer-layer-4)
8. [LLM Reasoning Layer (Layer 5)](#llm-reasoning-layer-layer-5)
9. [Decision Engine Layer (Layer 6)](#decision-engine-layer-layer-6)
10. [Feedback Loop Layer (Layer 7)](#feedback-loop-layer-layer-7)
11. [Learning Loop Layer (Layer 8)](#learning-loop-layer-layer-8)
12. [Gap Analysis Items](#gap-analysis-items)
13. [Data Lake Integration](#data-lake-integration)
14. [UI/UX Requirements](#uiux-requirements)
15. [Performance and Scalability](#performance-and-scalability)
16. [Deployment and Operations](#deployment-and-operations)
17. [Testing and Quality](#testing-and-quality)
18. [Timeline and Resources](#timeline-and-resources)

---

## Current State Assessment

### Q1.1: Existing Risk Catalog
**Status:** ✅ **FULLY IMPLEMENTED** - `containers/risk-catalog/`

**What exists:**
- ✅ RiskCatalogService with full CRUD operations
- ✅ Global, industry, and tenant-specific risk catalogs
- ✅ Risk ponderation (weighting) management
- ✅ Enable/disable risks per tenant
- ✅ Duplicate risks (global/industry → tenant-specific)
- ✅ Events: `risk.catalog.created`, `risk.catalog.updated`, `risk.catalog.deleted`
- ✅ Uses shard-manager for storage (shardTypeId = 'risk_catalog')

**What's missing for Unified Action Catalog:**
- [ ] Recommendation entries in catalog (currently only risks)
- [ ] Unified schema for risks + recommendations
- [ ] Template rendering for recommendations
- [ ] Relationship management (risks ↔ recommendations)
- [ ] Catalog-driven recommendation generation

**Question:** Should we extend the existing Risk Catalog service or create a new unified Action Catalog service?

- [X ] Extend existing Risk Catalog (add recommendation support)
- [ ] Create new unified Action Catalog service
- [ ] Hybrid: Keep separate but add unified API layer

### Q1.2: Existing Recommendations Service
**Status:** ✅ **PARTIALLY IMPLEMENTED** - `containers/recommendations/`

**What exists:**
- ✅ Multi-factor recommendation engine (vector search, collaborative, temporal, content, ML)
- ✅ Basic feedback collection (accept/ignore/irrelevant) - `recordFeedback()` method
- ✅ CAIS integration (gets learned weights from adaptive-learning)
- ✅ Event-driven architecture (`recommendation.generation.started`, `recommendation.generation.completed`, `recommendation.feedback.received`)
- ✅ Database containers: `recommendation_recommendations`, `recommendation_feedback`, `recommendation_models`

**Current recommendation types:** `'action' | 'insight' | 'opportunity' | 'risk_mitigation' | 'forecast_adjustment'`

**Current feedback types:** `'accept' | 'ignore' | 'irrelevant'` (only 3 types)

**What's missing:**
- [ ] 25+ feedback types (currently only 3)
- [ ] Configurable feedback types per tenant (up to 5 active)
- [ ] Rich metadata collection (timing, display context, etc.)
- [ ] Per-recommendation-type feedback configuration
- [ ] Feedback analytics and aggregation
- [ ] Action Catalog integration (recommendations not linked to catalog)
- [ ] Data Lake integration for feedback

**Question:** What's the priority for feedback system enhancement?

- [ ] Expand to 25+ feedback types first
- [ ] Add configurable tenant feedback types first
- [ ] Add rich metadata collection first
- [ X] All of the above (comprehensive enhancement)

### Q1.3: Existing ML Service
**Status:** ✅ **BASIC STRUCTURE EXISTS** - `containers/ml-service/`

**What exists:**
- ✅ FeatureService with `buildVectorForOpportunity()` - extracts ~20 basic features
  - Features: amount, probability, days_to_close, days_in_stage, stage_encoded, industry_encoded, risk_score_latest, risk_velocity, risk_acceleration, activity_count_30d, stakeholder_count, etc.
- ✅ PredictionService with placeholder predictions (not calling real models yet)
- ✅ AzureMLClient exists (for calling Azure ML endpoints)
- ✅ MLModelService for model management
- ✅ CAIS integration (adaptive feature weights, outcome collection)
- ✅ Database containers: `ml_models`, `ml_features`, `ml_training_jobs`, `ml_evaluations`, `ml_predictions`

**What's missing for Layer 2 (Feature Engineering):**
- [ ] Feature versioning system
- [ ] Feature caching (Redis)
- [ ] Feature quality monitoring (missing rate, outliers, drift)
- [ ] Feature transformation (categorical encoding, normalization, temporal engineering)
- [ ] Historical features (ownerWinRate, accountWinRate, similarDealsWinRate)
- [ ] Behavioral features (engagementRate, responseTime, activityVelocity)
- [ ] Methodology-aware features (MEDDIC, stage compliance)
- [ ] Risk catalog features (tenant categories, templates)

**What's missing for Layer 3 (ML Prediction):**
- [ ] Real Azure ML endpoint integration (currently placeholder)
- [ ] Model selection (global vs industry-specific)
- [ ] Prediction caching with event-based invalidation
- [ ] Circuit breaker and retry logic
- [ ] A/B testing support
- [ ] Model health monitoring

**Question:** Is Azure ML Workspace configured and ready?

- [ ] Yes, Azure ML Workspace is configured and models can be deployed
- [ ] Partially configured, needs setup
- [ X] Not configured yet, needs to be set up
- [ ] Unknown

**Follow-up:**
- What ML models are currently deployed? (if any)
- Are there any trained models ready to use?

### Q1.4: Existing Data Lake Integration
**Status:** ✅ **IMPLEMENTED** - `containers/logging/src/events/consumers/DataLakeCollector.ts`

**What exists:**
- ✅ DataLakeCollector in logging service
- ✅ Subscribes to: `risk.evaluated`, `ml.prediction.completed`
- ✅ Writes Parquet to: `/risk_evaluations/year=YYYY/month=MM/day=DD/`
- ✅ Writes inference logs to: `/ml_inference_logs/year=YYYY/month=MM/day=DD/`
- ✅ Parquet format support (using parquetjs library)
- ✅ Event-based sync working
- ✅ MLAuditConsumer for audit JSON blobs

**Current path structure:**
- Risk evaluations: `/risk_evaluations/year=YYYY/month=MM/day=DD/*.parquet`
- ML inference logs: `/ml_inference_logs/year=YYYY/month=MM/day=DD/*.parquet`
- ML audit: `/ml_audit/year=YYYY/month=MM/day=DD/{routingKey}-{id}.json`

**What's missing for feedback system:**
- [ ] Feedback DataLakeCollector (subscribe to `recommendation.feedback.received`)
- [ ] Feedback Parquet schema definition
- [ ] Feedback path structure: `/feedback/year=YYYY/month=MM/day=DD/`

**Question:** Should we create a new FeedbackDataLakeCollector or extend the existing DataLakeCollector?

- [ ] Create new FeedbackDataLakeCollector (separate concern)
- [ ] Extend existing DataLakeCollector (add feedback handling)
- [X ] Use existing pattern, create in logging service

---

## Priority and Scope

### Q2.1: Implementation Priority
**Question:** What is the order of priority for implementation? (Rank 1-5, 1 = highest)

- [1 ] Unified Action Catalog (risks + recommendations)
- [ 1] Recommendation Feedback System (25+ types, analytics)
- [2 ] Feature Engineering Layer (Layer 2)
- [ 3] ML Prediction Layer (Layer 3)
- [3 ] Explanation & LLM Reasoning (Layers 4-5)
- [ 3] Decision Engine & Learning Loop (Layers 6-8)
- [ 3] Gap Analysis Items (Risk Catalog integration, Sales Methodology, Reactivation)

**Follow-up:**
- Are there any dependencies that must be implemented first? Use best practice
- Can some items be done in parallel? yes

### Q2.2: MVP vs Full Implementation
**Question:** Should we implement MVP versions first, or go straight to full implementation?

- [ ] MVP first, then enhance (faster delivery, iterative)
- [X ] Full implementation from start (comprehensive, slower)
- [ ] Hybrid: MVP for some components, full for others

**Follow-up:**
- Which components should be MVP vs full?
- What's the definition of "done" for MVP?

### Q2.3: Scope Reduction
**Question:** Are there any requirements we can defer or simplify?

- [ X] All requirements are critical - no reduction
- [ ] Some requirements can be simplified
- [ ] Some requirements can be deferred to later phases

**Follow-up:**
- Which specific requirements can be simplified/deferred? None
- What's the minimum viable feature set?

---

## Unified Action Catalog

### Q3.1: Catalog Structure
**Question:** How should the Unified Action Catalog be structured?

**Current state:** Risk Catalog service exists and is fully functional. Need to add recommendation support.

**Option A:** Extend existing Risk Catalog service
- [ X] Extend `containers/risk-catalog` to include recommendations
- [ ] Add `type: 'risk' | 'recommendation'` field to existing RiskCatalog schema
- [ ] Add recommendation-specific fields (actionTemplate, mitigatesRisks, etc.)
- **Pros:** Reuse existing infrastructure, single service to maintain
- **Cons:** Risk catalog becomes more complex, schema changes needed

**Option B:** New unified service
- [ ] Create new `containers/action-catalog` service
- [ ] Unified schema for both risks and recommendations
- [ ] Migrate risk catalog functionality to new service
- **Pros:** Clean separation, easier to maintain, better naming
- **Cons:** Migration effort, duplicate code initially

**Option C:** Hybrid approach
- [ ] Keep risk-catalog as-is for risks
- [ ] Create recommendation-catalog for recommendations
- [ ] Add unified API layer that queries both
- **Pros:** No migration, clear separation
- **Cons:** More complex queries, two services to maintain

**Recommendation:** Option A (extend existing) - least disruption, fastest implementation

**Your preference:** Option A

### Q3.2: Catalog Entry Schema
**Question:** What fields are required for catalog entries?

**Required fields:**
- [ x] id, type (risk/recommendation), category
- [x ] name, displayName, description
- [x ] applicableIndustries, applicableStages, applicableMethodologies
- [ x] riskDetails (for risks), recommendationDetails (for recommendations)
- [x ] decisionRules, usage analytics
- [ ] Other: _______________

**Follow-up:**
- Should catalog entries be versioned?
- How do we handle catalog entry updates?

### Q3.3: Catalog Management
**Question:** Who can manage the catalog?

- [ ] Super Admin only (global catalog)
- [x ] Super Admin + Tenant Admin (tenant-specific entries)
- [ ] Super Admin + Tenant Admin + Sales Managers (team-specific)
- [ ] All users can suggest, admins approve

**Follow-up:**
- What's the approval workflow?
- Can tenants customize global entries?

### Q3.4: Catalog Integration Points
**Question:** Where should the catalog be integrated?

- [ ] Risk evaluation service (use catalog for risk detection)
- [ ] Recommendations service (use catalog for recommendation templates)
- [ ] Feature engineering (catalog-aware features)
- [ ] ML prediction (catalog context in predictions)
- [ ] Decision engine (catalog-driven decisions)
- [ x] All of the above

---

## Recommendation Feedback System

### Q4.1: Feedback Type Configuration
**Question:** How should feedback types be configured?

**Configuration levels:**
- [x ] Global only (same for all tenants)
- [ x] Global + Tenant override (tenants can customize)
- [x ] Per-recommendation-type configuration (different types for different rec types)
- [x ] All of the above

**Follow-up:**
- Can tenants add custom feedback types? No
- Can feedback types be renamed per tenant? No

### Q4.2: Feedback Collection UI
**Question:** Where should users provide feedback?

- [ ] Inline on opportunity page (next to each recommendation)
- [ ] Dedicated feedback modal/dialog
- [ ] Feedback panel/sidebar
- [ ] Notification-based (when recommendation shown)
- [x ] All of the above (context-dependent)

**Follow-up:**
- Should feedback be required or optional? Optional
- Can users change feedback after submitting? No

### Q4.3: Feedback Metadata
**Question:** What metadata should be captured with feedback?

**Required:**
- [ ] recommendationId, userId, tenantId, timestamp
- [ ] feedbackType, sentiment, comment
- [ ] recommendation context (type, source, confidence)
- [ ] opportunity context (stage, amount, industry)
- [ ] user context (role, team, historical action rate)
- [ ] timing (timeToFeedbackMs, timeVisibleMs)
- [ ] display context (location, position, device)
- [ ] A/B testing info (if applicable)

**Optional:**
- [ x] outcome tracking (filled later)
- [x ] previous feedback history
- [ ] Other: _______________

### Q4.4: Feedback Analytics
**Question:** What analytics are needed?

- [x ] Feedback rate by recommendation type
- [ x] Sentiment distribution
- [ x] Action rate (feedback → action taken)
- [ x] Feedback trends over time
- [ x] User engagement metrics
- [ x] Recommendation effectiveness (feedback → outcome)
- [x ] A/B test results
- [ ] Other: _______________

**Follow-up:**
- Who should see these analytics? (Super Admin, Tenant Admin, Sales Managers, Users) All 
- What's the update frequency? (real-time, daily, weekly) Daily

### Q4.5: Feedback-Driven Improvements
**Question:** How should feedback drive system improvements?

**Immediate (real-time):**
- [x ] Suppress similar recommendations with negative feedback
- [ x] Boost recommendations with positive feedback
- [ x] Personalize recommendations per user based on feedback

**Short-term (weekly):**
- [x ] Update recommendation algorithm weights
- [ x] Adjust recommendation ranking
- [ x] Improve recommendation explanations

**Long-term (monthly/quarterly):**
- [ x] Retrain ML models with feedback as labels
- [x ] Update catalog entries based on feedback patterns
- [ x] Generate new recommendations based on feedback

**All of the above?** [x ]

---

## Feature Engineering Layer (Layer 2)

### Q5.1: Feature Extraction Scope
**Current state:** Basic feature extraction exists (~20 features) in `FeatureService.buildVectorForOpportunity()`

**Already implemented:**
- ✅ Basic opportunity features (amount, probability, stage, industry)
- ✅ Basic risk features (risk_score_latest, risk_velocity, risk_acceleration)
- ✅ Basic temporal features (days_to_close, days_in_stage, days_since_created, days_since_last_activity)
- ✅ Basic relationship features (stakeholder_count, activity_count_30d)

**Missing features (priority order):**
1. [ ] **Feature versioning system** (critical for training/serving consistency)
2. [ ] **Feature caching** (Redis) - currently no caching
3. [ ] **Feature transformation** (categorical encoding, normalization, temporal engineering)
4. [ ] **Historical features** (ownerWinRate, accountWinRate, similarDealsWinRate, averageDealCycle)
5. [ ] **Behavioral features** (engagementRate, responseTime, activityVelocity, budgetConfirmed, competitorPresent)
6. [ ] **Risk category scores** (6 category scores, not just overall risk score)
7. [ ] **Methodology features** (MEDDIC, stage compliance, stage requirements met)
8. [ ] **Risk catalog features** (tenant categories, templates, industry-specific risks)

They are all important

**Question:** What's the priority for missing features?

- [ ] Feature versioning and caching first (foundation)
- [ ] Historical and behavioral features first (most impact on predictions)
- [ ] Methodology and catalog features first (gap analysis items)
- [ X] All features in parallel (comprehensive)

### Q5.2: Feature Versioning Strategy
**Question:** How should feature versioning work?

- [ ] Semantic versioning (major.minor.patch)
- [ ] Timestamp-based versioning
- [ ] Hash-based versioning (content hash)
- [ ] Hybrid approach

**Follow-up:**
- How do we handle breaking changes?
- How do we ensure training/serving consistency?

### Q5.3: Feature Storage
**Question:** Where should features be stored?

- [ ] Cosmos DB only (persistent storage)
- [ ] Redis only (cache)
- [ ] Cosmos DB + Redis (persistent + cache)
- [x ] Cosmos DB + Redis + Azure ML Datastore (training data)

**Follow-up:**
- What's the retention policy for feature snapshots?
- Should we archive old features?

### Q5.4: Feature Quality Monitoring
**Question:** What quality metrics should be tracked?

- [ ] Missing rate per feature
- [ ] Outlier detection
- [ ] Distribution drift (KS test)
- [ ] Feature importance over time
- [x ] All of the above

**Follow-up:**
- What are the alert thresholds?
- Who should be notified of quality issues?

---

## ML Prediction Layer (Layer 3)

### Q6.1: Model Deployment Strategy
**Current state:** AzureMLClient exists but PredictionService uses placeholder predictions

**Question:** How should models be deployed?

**Option A:** Azure ML Managed Endpoints only (RECOMMENDED)
- [ x] All models via Azure ML Managed Endpoints
- [ x] Use existing AzureMLClient
- **Pros:** Managed infrastructure, auto-scaling, already have client
- **Cons:** Vendor lock-in, cost

**Option B:** Hybrid (Azure ML + local)
- [ ] Critical models via Azure ML, simple models locally
- **Pros:** Flexibility, cost optimization
- **Cons:** More complex architecture, need local model serving

**Option C:** All local initially
- [ ] Start local, migrate to Azure ML later
- **Pros:** Faster initial development, no Azure dependency
- **Cons:** Need to migrate later, manage infrastructure

**Recommendation:** Option A - AzureMLClient already exists, aligns with existing architecture

**Your preference:** Option A

**Follow-up:**
- Are Azure ML Managed Endpoints already set up?
- Do we have trained models ready to deploy?

### Q6.2: Model Selection Logic
**Question:** How should model selection work?

- [ ] Global model only (simplest)
- [x ] Global + Industry-specific (when data available)
- [ ] Global + Industry + Tenant-specific (full customization)
- [ ] A/B testing support (champion/challenger)

**Follow-up:**
- What's the threshold for industry-specific models? (>3000 examples?)
- How do we handle new industries?

### Q6.3: Prediction Caching Strategy
**Question:** How should predictions be cached?

- [ ] Event-based invalidation only (no TTL)
- [ ] TTL-based (fixed expiration time)
- [ ] Hybrid (TTL + event-based invalidation)
- [ ] No caching (always fresh)

**Follow-up:**
- What's the cache key structure?
- How do we handle cache warming?

### Q6.4: Fallback Strategy
**Question:** What should happen when ML is unavailable?

- [ ] Rule-based predictions (stage-based probability, etc.)
- [ ] Historical averages
- [ ] Return error (fail fast)
- [ ] Cached predictions only
- [ ] Combination of above

**Follow-up:**
- What's the fallback priority order?
- How do we notify users of fallback usage?

---

## Explanation Layer (Layer 4)

### Q7.1: SHAP Integration
**Question:** How should SHAP be integrated?

**Option A:** Python service wrapper
- [ ] Separate Python microservice for SHAP calculations
- [ ] REST API calls from TypeScript service
- **Pros:** Native Python libraries, easier integration
- **Cons:** Additional service to maintain

**Option B:** TypeScript implementation
- [ ] Use JavaScript SHAP library (if available)
- [ ] Or implement simplified version
- **Pros:** Single language stack
- **Cons:** May not have full SHAP support

**Option C:** Azure ML endpoint
- [ ] SHAP calculated in Azure ML, returned with predictions
- **Pros:** No additional service
- **Cons:** Tied to Azure ML

**Your preference:** Option C

### Q7.2: Explanation Detail Levels
**Question:** What explanation detail levels are needed?

- [ ] Simple (top 3 factors only)
- [ ] Standard (top 5-10 factors)
- [ ] Detailed (all factors, SHAP waterfall)
- [X ] All levels (user-selectable)

**Follow-up:**
- Should explanation detail be configurable per tenant? yes
- What's the performance impact of detailed explanations?

### Q7.3: Explanation Caching
**Question:** Should explanations be cached?

- [ ] Yes, same as predictions (event-based invalidation)
- [ ] Yes, with shorter TTL than predictions
- [ ] No, always calculate fresh
- [ ] Depends on detail level

---

## LLM Reasoning Layer (Layer 5)

### Q8.1: LLM Provider
**Question:** Which LLM provider should be used?

- [ ] OpenAI (GPT-4, GPT-3.5)
- [ ] Azure OpenAI
- [ ] Anthropic (Claude)
- [x ] Multiple providers (fallback support)
- [x ] Configurable per tenant

**Follow-up:**
- What's the cost consideration?
- What's the latency requirement?

### Q8.2: LLM Use Cases
**Question:** Which LLM use cases are priority?

**Priority order:**
1. [ x] Natural language explanation generation
2. [x ] Recommendation generation
3. [ ] Scenario analysis (best/base/worst)
4. [ ] Playbook generation
5. [ ] Email/message draft generation
6. [ ] Other: _______________

**Follow-up:**
- Can some use cases be deferred?
- Are there use cases not in the requirements?

### Q8.3: LLM Response Caching
**Question:** Should LLM responses be cached?

- [ ] Yes, cache by input hash (same context = same response)
- [ ] Yes, but short TTL (responses may improve over time)
- [ ] No, always fresh (most up-to-date)
- [ ] Depends on use case

**Follow-up:**
- What's the cache key structure?
- How do we handle prompt template updates?

---

## Decision Engine Layer (Layer 6)

### Q9.1: Rule Engine
**Question:** What rule engine should be used?

- [ ] Custom rule evaluator (TypeScript)
- [ ] Existing rule engine library
- [ ] Azure Logic Apps integration
- [ ] Other: _______________

**Follow-up:**
- What's the rule complexity requirement?
- Do rules need to be versioned?

### Q9.2: Action Execution
**Question:** What actions should be supported?

- [ ] CRM updates (mark as hot, change stage)
- [ ] Notifications (email, Slack, in-app)
- [ ] Task creation
- [ ] Email draft generation
- [ ] Calendar events
- [ ] Playbook assignment
- [x ] All of the above

**Follow-up:**
- What's the priority order?
- Are there custom actions needed?

### Q9.3: Conflict Resolution
**Question:** How should conflicts be resolved?

**When ML and rules disagree:**
- [ ] Always trust ML
- [ ] Always trust rules
- [ ] Weighted combination
- [ ] Escalate to human
- [x ] Configurable per tenant

**Follow-up:**
- What's the default strategy? Escalate to human
- How do we log conflicts? Use Looging Service

---

## Feedback Loop Layer (Layer 7)

### Q10.1: Outcome Tracking
**Question:** How should outcomes be tracked?

- [ ] Manual entry by users
- [x ] Automatic from opportunity close (won/lost)
- [x ] Hybrid (auto-detect, manual override)
- [ x] Integration with CRM (sync outcomes)

**Follow-up:**
- What outcome data is needed? (won/lost, revenue, close date, etc.)
- How do we handle partial outcomes?

### Q10.2: Feedback Analysis
**Question:** What feedback analysis is needed?

- [ ] Aggregate by model, feature, industry
- [ ] Identify prediction errors
- [ ] Calculate user satisfaction
- [ ] Generate feedback reports
- [ x] All of the above

**Follow-up:**
- What's the analysis frequency? (real-time, daily, weekly)
- Who should see the analysis?

---

## Learning Loop Layer (Layer 8)

### Q11.1: Retraining Strategy
**Question:** How should model retraining work?

- [ ] Scheduled (monthly, quarterly)
- [ ] Trigger-based (drift detection, performance degradation)
- [ ] Manual (on-demand)
- [x ] All of the above

**Follow-up:**
- What's the retraining frequency?
- What triggers retraining?

### Q11.2: Drift Detection
**Question:** What drift detection is needed?

- [ ] Feature distribution drift (KS test)
- [ ] Prediction distribution drift
- [ ] Outcome drift (concept drift)
- [ ] All of the above

**Follow-up:**
- What are the drift thresholds?
- How do we handle false positives?

### Q11.3: Model Evaluation
**Question:** How should models be evaluated?

- [ ] Holdout set evaluation
- [ ] Cross-validation
- [ ] Online evaluation (A/B testing)
- [ ] All of the above

**Follow-up:**
- What metrics are most important? (accuracy, precision, recall, F1, etc.)
- What's the evaluation frequency?

---

## Gap Analysis Items

### Q12.1: Risk Catalog Integration
**Current state:** ✅ **Risk Catalog service exists** - `containers/risk-catalog/`

**What exists:**
- ✅ RiskCatalogService with full CRUD
- ✅ REST API for querying catalog
- ✅ Events for catalog changes

**Question:** How should Risk Catalog integrate with ML layers?

**Integration points:**
- [ ] **Feature Engineering (Layer 2):** Extract catalog-aware features (tenant categories, templates, industry-specific risks)
- [ ] **ML Prediction (Layer 3):** Use catalog context in predictions (dynamic category output based on tenant catalog)
- [ ] **Decision Engine (Layer 6):** Catalog-driven decisions (map detected risks to catalog entries, get decision rules)
- [ ] **All of the above**

**Follow-up:**
- Should catalog be required or optional? (Currently: optional, risk evaluation works without it)
- How do we handle catalog updates? (Currently: events published, but no cache invalidation)
- Should we cache catalog data? (Currently: queries shard-manager each time)

### Q12.2: Sales Methodology Integration
**Current state:** ❌ **NOT IMPLEMENTED** - No methodology service exists

**Question:** Which sales methodologies should be supported?

- [ ] MEDDIC (highest priority - most common)
- [ ] MEDDPICC (MEDDIC extension)
- [ ] Challenger
- [ ] Sandler
- [ ] SPIN
- [ ] Custom (tenant-defined)
- [ ] All of the above

**Follow-up:**
- What's the priority order? (Recommend: MEDDIC first, then others)
- Can tenants have multiple methodologies? (Recommend: One per tenant initially)
- Where should methodology configuration be stored?
  - [ ] New `containers/methodology` service
  - [ ] Part of tenant configuration
  - [ ] Part of risk-catalog service
  - [ ] Other: _______________

### Q12.3: Opportunity Reactivation
**Current state:** ❌ **NOT IMPLEMENTED** - No reactivation service exists

**Question:** How should reactivation work?

- [ ] Automated detection and recommendations (full automation)
- [ ] Manual review and approval (human in the loop)
- [ ] Hybrid (auto-detect, manual initiate) - **RECOMMENDED**
- [ ] User-initiated only (no automation)

**Follow-up:**
- What's the reactivation probability threshold? (Recommend: 0.3 minimum)
- How do we measure reactivation success? (Recommend: Track reactivation → outcome correlation)
- Should reactivation be a scheduled job or event-driven?
  - [ ] Scheduled (daily batch job to find dormant opportunities)
  - [ ] Event-driven (triggered when opportunity becomes dormant)
  - [ ] Both (event-driven for immediate, scheduled for comprehensive scan)

---

## Data Lake Integration

### Q13.1: Data Lake Structure
**Current structure:** ✅ **EXISTS** - `containers/logging/`

**Existing paths:**
- `/risk_evaluations/year=YYYY/month=MM/day=DD/*.parquet`
- `/ml_inference_logs/year=YYYY/month=MM/day=DD/*.parquet`
- `/ml_audit/year=YYYY/month=MM/day=DD/{routingKey}-{id}.json`

**Proposed structure for feedback:**
- [ ] `/feedback/year=YYYY/month=MM/day=DD/*.parquet` (follows existing pattern)
- [ ] `/recommendation_feedback/year=YYYY/month=MM/day=DD/*.parquet` (more specific)
- [ ] Other: _______________

**Question:** Should we partition by tenant in the path?

- [ ] Yes: `/feedback/tenantId={tenantId}/year=YYYY/month=MM/day=DD/`
- [ ] No: Tenant ID in Parquet row, not in path (current pattern)
- [ ] Hybrid: Partition by tenant for large tenants only

**Follow-up:**
- What's the file naming convention? (Currently: auto-generated UUIDs)
- Should we batch multiple feedback records per file?

### Q13.2: Data Lake Sync
**Current state:** ✅ **Event-based sync exists** - DataLakeCollector subscribes to RabbitMQ events

**Existing pattern:**
- Real-time event-based sync (RabbitMQ consumer)
- Writes Parquet immediately when event received
- Batches writes (up to 10 messages) for efficiency

**Question:** Should feedback follow the same pattern?

- [ ] Yes, use same event-based pattern (subscribe to `recommendation.feedback.received`)
- [ ] Batch sync (scheduled, hourly/daily) - more efficient but delayed
- [ ] Hybrid (real-time for critical feedback, batch for others)

**Recommendation:** Event-based (same as existing) - consistent with architecture, real-time analytics

**Follow-up:**
- Should we batch multiple feedback records per Parquet file? (Currently: one file per event)
- How do we handle sync failures? (Currently: logs error, message stays in queue for retry)

### Q13.3: Data Lake Format
**Question:** What format should be used?

- [ ] Parquet (columnar, compressed)
- [ ] JSON (readable, larger)
- [ ] CSV (simple, limited)
- [ ] Multiple formats (Parquet for analytics, JSON for debugging)

**Follow-up:**
- What's the schema versioning strategy?
- How do we handle schema evolution?

---

## UI/UX Requirements

### Q14.1: Feedback UI Location
**Question:** Where should feedback UI be placed?

- [ ] Opportunity detail page (inline with recommendations)
- [ ] Dedicated recommendations page
- [ ] Notification popup/modal
- [ ] Sidebar panel
- [ ] All of the above (context-dependent)

**Follow-up:**
- Should feedback be one-click or multi-step?
- Should feedback be required or optional?

### Q14.2: Explanation UI
**Question:** How should explanations be displayed?

- [ ] Simple list (top factors)
- [ ] Waterfall chart (SHAP visualization)
- [ ] Bar chart (feature importance)
- [ ] Expandable sections (simple → detailed)
- [ ] All of the above (user-selectable)

**Follow-up:**
- What's the default view?
- Should explanations be interactive?

### Q14.3: Analytics Dashboard
**Question:** What analytics dashboards are needed?

- [ ] Feedback analytics (by type, sentiment, trends)
- [ ] Model performance (accuracy, latency, errors)
- [ ] Recommendation effectiveness
- [ ] User engagement metrics
- [ ] All of the above

**Follow-up:**
- Who should have access to which dashboards?
- What's the update frequency? (real-time, daily, weekly)

---

## Performance and Scalability

### Q15.1: Performance Targets
**Question:** What are the performance targets?

**Latency (p95):**
- Feature extraction: _______________ ms
- ML prediction: _______________ ms
- Explanation: _______________ ms
- LLM reasoning: _______________ ms
- Decision evaluation: _______________ ms

**Throughput:**
- Predictions per second: _______________
- Batch size: _______________ opportunities
- Concurrent requests: _______________

**Follow-up:**
- Are these targets realistic?
- What's the acceptable degradation under load?

### Q15.2: Scalability Requirements
**Question:** What are the scalability requirements?

- [ ] Number of tenants: _______________
- [ ] Opportunities per tenant: _______________
- [ ] Predictions per day: _______________
- [ ] Feedback submissions per day: _______________

**Follow-up:**
- What's the growth projection?
- How do we handle peak loads?

### Q15.3: Caching Strategy
**Question:** What should be cached?

- [ ] Feature vectors (Redis)
- [ ] Predictions (Redis)
- [ ] Explanations (Redis)
- [ ] LLM responses (Redis)
- [ ] Model metadata (Redis)
- [ ] All of the above

**Follow-up:**
- What's the cache TTL strategy?
- How do we handle cache invalidation?

---

## Deployment and Operations

### Q16.1: Deployment Environment
**Question:** What's the deployment environment?

- [ ] Azure Container Apps
- [ ] Azure Kubernetes Service (AKS)
- [ ] Azure App Service
- [ ] Other: _______________

**Follow-up:**
- What's the current deployment setup?
- Are there any constraints?

### Q16.2: Monitoring and Alerting
**Question:** What monitoring is needed?

- [ ] Application Insights (Azure)
- [ ] Custom metrics (Prometheus)
- [ ] Log aggregation (Log Analytics)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] All of the above

**Follow-up:**
- What are the critical alerts?
- Who should be notified?

### Q16.3: Rollback Strategy
**Question:** How should rollbacks work?

- [ ] Automatic (on error rate threshold)
- [ ] Manual (on-demand)
- [ ] Gradual (canary deployment)
- [ ] All of the above

**Follow-up:**
- What's the rollback trigger?
- How do we test rollback procedures?

---

## Testing and Quality

### Q17.1: Testing Strategy
**Question:** What testing is required?

- [ ] Unit tests (>80% coverage)
- [ ] Integration tests (all layers)
- [ ] Performance tests (load testing)
- [ ] Security tests
- [ ] End-to-end tests
- [ ] All of the above

**Follow-up:**
- What's the testing priority?
- What's the acceptable coverage?

### Q17.2: Quality Metrics
**Question:** What quality metrics should be tracked?

- [ ] Code coverage
- [ ] Test pass rate
- [ ] Bug density
- [ ] Performance regression
- [ ] All of the above

**Follow-up:**
- What are the quality gates?
- What blocks deployment?

---

## Timeline and Resources

### Q18.1: Team Composition
**Question:** What's the actual team composition?

- [ ] Backend engineers: _______________
- [ ] ML engineers: _______________
- [ ] Frontend engineers: _______________
- [ ] DevOps engineers: _______________
- [ ] QA engineers: _______________
- [ ] Other: _______________

**Follow-up:**
- Are team members full-time or part-time?
- Are there any skill gaps?

### Q18.2: Timeline Expectations
**Question:** What's the timeline expectation?

- [ ] Aggressive (12 weeks - parallel work, reduced scope)
- [ ] Realistic (22 weeks as estimated)
- [ ] Flexible (deliver value incrementally)
- [ ] Custom: _______________ weeks

**Follow-up:**
- What's the deadline pressure?
- Can we deliver in phases?

### Q18.3: Dependencies
**Question:** What are the external dependencies?

- [ ] Azure ML Workspace setup
- [ ] Azure Data Lake setup
- [ ] Model training completion
- [ ] Infrastructure provisioning
- [ ] Other: _______________

**Follow-up:**
- What's the dependency timeline?
- What blocks can we start?

---

## Additional Questions

### Q19.1: Open Questions
**Question:** Are there any other questions or concerns?

**Your questions:**
1. _______________
2. _______________
3. _______________
4. _______________
5. _______________

### Q19.2: Constraints
**Question:** Are there any constraints we should be aware of?

- [ ] Budget constraints
- [ ] Time constraints
- [ ] Technical constraints
- [ ] Resource constraints
- [ ] Other: _______________

**Details:** _______________

### Q19.3: Success Criteria
**Question:** What defines success for this implementation?

**Success metrics:**
1. _______________
2. _______________
3. _______________
4. _______________
5. _______________

---

## Next Steps

Once these questions are answered, we will:

1. **Create detailed implementation plans** for each major component
2. **Define clear acceptance criteria** for each plan
3. **Establish dependencies** between plans
4. **Set up tracking** for implementation progress
5. **Schedule review sessions** to ensure alignment

**Please answer these questions in a separate file or provide answers directly. We can iterate on the questions if needed.**
