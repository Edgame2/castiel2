# Layer 3: ML Prediction - Detailed Requirements Document

**Document Version:** 1.0  
**Date:** January 2025  
**Status:** Comprehensive Requirements Specification  
**Layer:** CAIS Layer 3 - ML Prediction (Predictive Model Layer)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Service Implementation](#service-implementation)
6. [Data Schemas](#data-schemas)
7. [API Specifications](#api-specifications)
8. [UI Components & Pages](#ui-components--pages)
9. [Integration Points](#integration-points)
10. [Testing Requirements](#testing-requirements)
11. [Deployment Requirements](#deployment-requirements)
12. [Monitoring & Observability](#monitoring--observability)
13. [Security Requirements](#security-requirements)
14. [Error Handling](#error-handling)
15. [Performance Optimization](#performance-optimization)

---

## Executive Summary

### Purpose
The ML Prediction Layer (CAIS Layer 3) orchestrates machine learning model inference via Azure ML Managed Endpoints. This layer transforms feature vectors into numeric predictions (risk scores, win probabilities, revenue forecasts, recommendation rankings) that feed into the Explanation and LLM Reasoning layers.

### Scope
This document specifies requirements for:
- ML model inference orchestration
- Azure ML Managed Endpoint integration
- Model selection and routing (global vs industry-specific)
- Prediction caching with event-based invalidation
- A/B testing and champion/challenger deployment
- Model health monitoring and circuit breaking
- Fallback strategies (graceful degradation)
- Model metadata synchronization

### Key Principles
1. **ML models predict, don't explain** - Generate numeric predictions only
2. **Cache predictions aggressively** - Until opportunity changes
3. **Fail gracefully** - Fallback to rule-based if ML unavailable
4. **Monitor everything** - Latency, accuracy, endpoint health
5. **Version all models** - Semantic versioning with metadata

### Success Metrics
- Inference latency: <2s (p95), <1s (p50)
- Batch inference: 100+ opportunities per request
- Cache hit rate: >70%
- Endpoint availability: 99.9%
- Prediction accuracy: >85% (varies by model type)
- Fallback rate: <5%

---

## Architecture Overview

### Layer Position in CAIS
```
Layer 2: Feature Engineering
    ↓ (Feature vectors)
Layer 3: ML Prediction ← YOU ARE HERE
    ↓ (Numeric predictions)
Layer 4: Explanation (SHAP values)
    ↓ (Structured explanations)
Layer 5: LLM Reasoning (Natural language)
```

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    ML Prediction Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  MLService       │      │  ModelService    │                │
│  │  (Orchestrator)  │◄────►│  (Inference)     │                │
│  └────────┬─────────┘      └────────┬─────────┘                │
│           │                          │                           │
│           ├──► Model Selection       │                           │
│           │    • Global vs Industry  │                           │
│           │    • A/B Testing         │                           │
│           │    • Champion/Challenger │                           │
│           │                          │                           │
│           └──► Inference Pipeline────┼──► Azure ML Endpoints    │
│                • Feature prep        │    • Risk Scoring         │
│                • Cache check         │    • Win Probability      │
│                • Endpoint call       │    • Forecasting          │
│                • Cache store         │    • Recommendations      │
│                • Error handling      │                           │
│                                      │                           │
│  ┌──────────────────────────────────▼───────────────┐          │
│  │           Prediction Cache (Redis)                │          │
│  │  • Event-based invalidation                       │          │
│  │  • Key: prediction:{tenantId}:{opportunityId}    │          │
│  │  • TTL: Until opportunity changes                 │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐          │
│  │      Model Registry Sync (Cosmos DB)              │          │
│  │  • Sync from Azure ML Registry                    │          │
│  │  • Model metadata (version, performance)          │          │
│  │  • Endpoint URLs and status                       │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐          │
│  │          Circuit Breaker & Fallback               │          │
│  │  • Monitor endpoint health                        │          │
│  │  • Open circuit after 5 failures                  │          │
│  │  • Fallback to rule-based                         │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

External Systems:
┌─────────────────────────────────────────────────────────────────┐
│              Azure ML Managed Endpoints                          │
│  • risk-scoring-endpoint                                         │
│  • win-probability-endpoint                                      │
│  • forecasting-endpoint                                          │
│  • recommendations-endpoint                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### MLService (Orchestrator)
**Primary Owner:** High-level ML workflow orchestration  
**Responsibilities:**
- Orchestrate feature extraction → prediction → explanation flow
- Select appropriate model based on opportunity context
- Handle A/B testing traffic routing
- Coordinate fallback strategies
- Track end-to-end pipeline metrics

#### ModelService (Inference Engine)
**Primary Owner:** Direct ML model inference  
**Responsibilities:**
- Call Azure ML Managed Endpoints
- Manage prediction caching
- Implement retry logic and circuit breakers
- Track model-specific metrics (latency, errors)
- Handle model version resolution

#### ModelRegistrySync
**Primary Owner:** Model metadata synchronization  
**Responsibilities:**
- Sync model metadata from Azure ML Registry to Cosmos DB
- Update endpoint URLs and status
- Track model deployment history
- Manage model lifecycle (active, inactive, deprecated)

---

## Functional Requirements

### FR-1: Model Inference

#### FR-1.1: Single Prediction Inference
**Priority:** Critical  
**Description:** Predict for a single opportunity

**Requirements:**
- **FR-1.1.1:** Accept opportunity ID and tenant ID as input
  - Validation: Both must be valid non-empty strings
  - Validation: Tenant ID must match authenticated user's tenant
  
- **FR-1.1.2:** Extract features using FeatureStoreService
  - Integration: Call `featureStoreService.extractFeatures(opportunityId, tenantId, modelVersion)`
  - Timeout: 500ms
  - Error handling: If feature extraction fails, return error (cannot predict without features)
  
- **FR-1.1.3:** Check prediction cache before calling model
  - Cache key: `prediction:{modelId}:{tenantId}:{opportunityId}`
  - If cache hit: Return cached prediction immediately
  - If cache miss: Continue to model inference
  - Track cache hit rate metric
  
- **FR-1.1.4:** Select appropriate model
  - Logic: Call model selection algorithm (see FR-2)
  - Input: Model type, tenant ID, opportunity industry
  - Output: Model ID and endpoint URL
  
- **FR-1.1.5:** Call Azure ML Managed Endpoint
  - Method: POST request to endpoint URL
  - Headers: `Content-Type: application/json`, `Authorization: Bearer {token}`
  - Body: `{ "features": featureVector, "modelVersion": modelVersion }`
  - Timeout: 2000ms (2 seconds)
  - Retry: Max 3 retries with exponential backoff (100ms, 200ms, 400ms)
  
- **FR-1.1.6:** Parse and validate prediction response
  - Expected format: `{ "prediction": number | object, "confidence": string, "modelVersion": string }`
  - Validation: Prediction value must be in expected range (e.g., 0-1 for risk score)
  - Validation: Model version must match requested version
  
- **FR-1.1.7:** Store prediction in database
  - Container: Predictions (Cosmos DB)
  - Document: See Prediction schema
  - Include: Features, prediction, model version, latency
  
- **FR-1.1.8:** Cache prediction result
  - Cache key: `prediction:{modelId}:{tenantId}:{opportunityId}`
  - TTL: Event-based (invalidate on opportunity update)
  - Value: Serialized Prediction document
  
- **FR-1.1.9:** Track inference metrics
  - Metric: `ml_prediction_duration` (latency in ms)
  - Metric: `ml_prediction_success` (boolean)
  - Metric: `ml_prediction_cache_hit_rate` (percentage)
  - Dimensions: modelId, modelType, tenantId

**Acceptance Criteria:**
- Prediction returned within 2s (p95)
- Cache checked before model call
- Metrics tracked for all inferences
- Errors handled gracefully with retries

#### FR-1.2: Batch Prediction Inference
**Priority:** High  
**Description:** Predict for multiple opportunities efficiently

**Requirements:**
- **FR-1.2.1:** Accept array of opportunity IDs (max 100)
  - Validation: Array must not be empty
  - Validation: Array must not exceed 100 items
  - Validation: All IDs must be valid strings
  
- **FR-1.2.2:** Extract features for all opportunities in parallel
  - Call: `featureStoreService.extractFeaturesForBatch(opportunityIds, tenantId)`
  - Parallelization: Use Promise.all with concurrency limit (10)
  - Timeout: 5000ms total
  
- **FR-1.2.3:** Check cache for each opportunity
  - Check all caches in parallel
  - Separate: Cached predictions from uncached
  - Track: Cache hit rate for batch
  
- **FR-1.2.4:** Batch predict for uncached opportunities
  - Azure ML endpoint: POST /batch
  - Body: `{ "features": [featureVector1, featureVector2, ...] }`
  - Timeout: 5000ms
  - Response: Array of predictions in same order
  
- **FR-1.2.5:** Combine cached and new predictions
  - Merge: Cached predictions + new predictions
  - Order: Maintain original opportunity order
  
- **FR-1.2.6:** Store all new predictions
  - Batch write to Cosmos DB
  - Use: Cosmos DB bulk operations for efficiency
  
- **FR-1.2.7:** Cache all new predictions
  - Batch cache write
  - Same cache keys as single prediction

**Acceptance Criteria:**
- Batch of 100 predictions completed in <5s
- Cache hit rate >70%
- Predictions returned in original order
- Failed predictions handled individually (partial success allowed)

#### FR-1.3: Prediction Caching
**Priority:** Critical  
**Description:** Cache predictions to reduce latency and cost

**Requirements:**
- **FR-1.3.1:** Define cache key structure
  - Format: `prediction:{modelId}:{tenantId}:{opportunityId}`
  - Example: `prediction:model_risk_001:tenant_123:opp_456`
  
- **FR-1.3.2:** Implement cache read
  - Redis GET operation
  - Deserialization: Parse JSON to Prediction object
  - Timeout: 10ms
  - Error handling: Log error and continue to model call
  
- **FR-1.3.3:** Implement cache write
  - Redis SET operation
  - Serialization: JSON.stringify(prediction)
  - TTL: No fixed TTL (event-based invalidation)
  - Error handling: Log error but don't fail inference
  
- **FR-1.3.4:** Implement event-based cache invalidation
  - Trigger: Opportunity updated (RabbitMQ event: `opportunity.updated`)
  - Action: Delete cache key `prediction:*:{tenantId}:{opportunityId}`
  - Pattern: Use Redis DEL with pattern matching
  - Immediate: Invalidation must occur before next cache read
  
- **FR-1.3.5:** Implement cache warming
  - Trigger: High-value opportunity created/updated
  - Action: Pre-compute and cache prediction
  - Priority: Opportunities with dealValue > $100K
  - Async: Don't block opportunity creation
  
- **FR-1.3.6:** Monitor cache performance
  - Metric: Cache hit rate (target >70%)
  - Metric: Cache miss latency
  - Metric: Cache invalidation count
  - Alert: If hit rate drops below 50%

**Acceptance Criteria:**
- Cache hit latency <10ms
- Cache write doesn't block inference
- Invalidation immediate on opportunity updates
- Cache hit rate >70%

#### FR-1.4: Retry Logic and Circuit Breaking
**Priority:** Critical  
**Description:** Handle endpoint failures gracefully

**Requirements:**
- **FR-1.4.1:** Implement exponential backoff retry
  - Max retries: 3
  - Backoff: 100ms, 200ms, 400ms
  - Retry conditions: 5xx errors, timeouts, connection errors
  - No retry: 4xx errors (client errors)
  
- **FR-1.4.2:** Implement circuit breaker pattern
  - Closed state: Normal operation, all requests pass through
  - Open state: After 5 consecutive failures, reject all requests immediately
  - Half-open state: After 60s, allow 1 request to test endpoint
  - Transition: Open → Half-open after timeout, Half-open → Closed on success
  
- **FR-1.4.3:** Track endpoint health
  - Metric: Success rate (rolling 1-minute window)
  - Metric: Average latency (rolling 1-minute window)
  - Metric: Error rate by type (timeout, 5xx, connection)
  - State: Store circuit breaker state in Redis
  
- **FR-1.4.4:** Implement fallback strategy
  - Primary: ML model endpoint
  - Fallback 1: Rule-based prediction
  - Fallback 2: Historical average
  - Log: All fallbacks with reason
  
- **FR-1.4.5:** Alert on circuit breaker open
  - Trigger: Circuit breaker opens
  - Action: Send alert to engineering team
  - Include: Model ID, endpoint URL, error rate, recent errors
  - Escalation: If open for >5 minutes, escalate to on-call

**Acceptance Criteria:**
- Retry logic reduces transient error impact
- Circuit breaker prevents cascade failures
- Fallback provides degraded but functional service
- Alerts notify team of issues

### FR-2: Model Selection

#### FR-2.1: Model Routing
**Priority:** Critical  
**Description:** Select appropriate model based on opportunity context

**Requirements:**
- **FR-2.1.1:** Implement global vs industry-specific selection
  - Input: Model type, opportunity industry
  - Logic:
    ```
    IF industry-specific model exists for opportunity.industry THEN
      SELECT industry-specific model
    ELSE
      SELECT global model
    END IF
    ```
  - Validation: Check model status is "active"
  
- **FR-2.1.2:** Implement model metadata lookup
  - Source: Cosmos DB Models container
  - Query: 
    ```sql
    SELECT * FROM models m
    WHERE m.modelType = @modelType
      AND m.status = 'active'
      AND (m.scope = 'global' OR (m.scope = 'industry' AND m.industryId = @industryId))
    ORDER BY m.scope DESC, m.version DESC
    ```
  - Cache: Cache model metadata in Redis (1-hour TTL)
  
- **FR-2.1.3:** Handle model not found
  - Scenario: No active model for requested type
  - Action: Log error, fall back to rule-based
  - Alert: Send alert if model missing for >1 hour
  
- **FR-2.1.4:** Validate model readiness
  - Check: Endpoint URL is not null
  - Check: Model deployment status is "deployed"
  - Check: Endpoint health check passed within last 5 minutes

**Acceptance Criteria:**
- Industry-specific models prioritized when available
- Global models used as fallback
- Model metadata lookup <50ms
- Missing models handled gracefully

#### FR-2.2: A/B Testing
**Priority:** High  
**Description:** Support A/B testing of model versions

**Requirements:**
- **FR-2.2.1:** Implement traffic splitting
  - Configuration: Model has `abTest.enabled = true`
  - Split: Route X% to champion, (100-X)% to challenger
  - Algorithm: Hash(opportunityId) mod 100 < X ? champion : challenger
  - Consistent: Same opportunity always routes to same model
  
- **FR-2.2.2:** Track A/B test metrics
  - Metric: Prediction count per model variant
  - Metric: Average latency per variant
  - Metric: Error rate per variant
  - Metric: Prediction distribution per variant
  
- **FR-2.2.3:** Store A/B test assignment
  - Document: Include `abTestVariant` in Prediction document
  - Value: "champion" | "challenger"
  - Use: For later analysis and comparison
  
- **FR-2.2.4:** Implement gradual rollout
  - Start: 10% traffic to challenger
  - Monitor: Compare metrics for 24 hours
  - Increase: If metrics comparable, increase to 50%
  - Monitor: Compare for another 24 hours
  - Promote: If metrics still comparable, promote challenger to champion
  
- **FR-2.2.5:** Implement emergency rollback
  - Trigger: Challenger error rate >2x champion
  - Trigger: Challenger latency >1.5x champion
  - Action: Immediately route 100% traffic to champion
  - Alert: Send alert to engineering team

**Acceptance Criteria:**
- Traffic split accurately according to configuration
- A/B test metrics tracked for both variants
- Rollback automatic on performance degradation
- Consistent routing for same opportunity

#### FR-2.3: Champion/Challenger Deployment
**Priority:** High  
**Description:** Manage model lifecycle with champion/challenger pattern

**Requirements:**
- **FR-2.3.1:** Define champion model
  - Definition: Current production model serving majority of traffic
  - Status: `status = 'active'`, `abTest = null` or `abTest.enabled = false`
  
- **FR-2.3.2:** Define challenger model
  - Definition: New model being tested against champion
  - Status: `status = 'active'`, `abTest.enabled = true`, `abTest.trafficPercentage < 100`
  - Reference: `abTest.challengerModelId` points to champion
  
- **FR-2.3.3:** Deploy new model as challenger
  - Step 1: Deploy model to Azure ML endpoint
  - Step 2: Register model in Cosmos DB with `status = 'active'`
  - Step 3: Configure A/B test: `abTest = { enabled: true, trafficPercentage: 10, championModelId: '...' }`
  - Step 4: Monitor metrics
  
- **FR-2.3.4:** Promote challenger to champion
  - Condition: Challenger metrics ≥ champion for 48 hours
  - Action 1: Update challenger: `abTest.trafficPercentage = 100`
  - Action 2: Wait 24 hours (verify stability)
  - Action 3: Update challenger: `abTest = null` (now champion)
  - Action 4: Update old champion: `status = 'inactive'`
  
- **FR-2.3.5:** Rollback challenger
  - Trigger: Manual or automatic (performance degradation)
  - Action 1: Update challenger: `abTest.enabled = false`
  - Action 2: Update challenger: `status = 'inactive'`
  - Action 3: Champion continues serving 100% traffic

**Acceptance Criteria:**
- Clear distinction between champion and challenger
- Deployment process well-defined and automated
- Promotion based on metrics, not manual decision
- Rollback immediate and safe

### FR-3: Prediction Types

#### FR-3.1: Risk Scoring Prediction
**Priority:** Critical  
**Description:** Predict risk score for opportunities

**Requirements:**
- **FR-3.1.1:** Define input features
  - Required: dealValue, probability, stage, industry, daysToClose
  - Optional: ownerWinRate, accountHealth, riskFeatures (see Layer 2)
  - Format: FeatureVector from FeatureStoreService
  
- **FR-3.1.2:** Define output format
  - Schema:
    ```typescript
    {
      riskScore: number;        // 0-1 (overall risk)
      categoryScores: {
        commercial: number;     // 0-1
        competitive: number;    // 0-1
        technical: number;      // 0-1
        legal: number;          // 0-1
        resource: number;       // 0-1
        timeline: number;       // 0-1
      };
      confidence: "low" | "medium" | "high";
    }
    ```
  - Validation: All scores must be between 0 and 1
  
- **FR-3.1.3:** Calibrate risk scores
  - Requirement: Risk scores must be well-calibrated (predicted 70% risk = 70% actual failure rate)
  - Method: Isotonic regression or Platt scaling
  - Validation: Test calibration on holdout set (calibration curve)
  
- **FR-3.1.4:** Determine confidence level
  - Logic:
    ```
    IF prediction uncertainty < 0.1 THEN "high"
    ELSE IF prediction uncertainty < 0.2 THEN "medium"
    ELSE "low"
    ```
  - Uncertainty: Standard deviation from ensemble models or quantile regression

**Acceptance Criteria:**
- Risk score between 0 and 1
- Category scores provided
- Scores calibrated (within 5% of actual rate)
- Confidence level accurate

#### FR-3.2: Win Probability Prediction
**Priority:** High  
**Description:** Predict probability of winning opportunity

**Requirements:**
- **FR-3.2.1:** Define input features
  - Same as risk scoring (see FR-3.1.1)
  
- **FR-3.2.2:** Define output format
  - Schema:
    ```typescript
    {
      winProbability: number;   // 0-1
      confidence: "low" | "medium" | "high";
      calibrated: boolean;
    }
    ```
  - Validation: winProbability must be between 0 and 1
  
- **FR-3.2.3:** Calibrate win probabilities
  - Requirement: Predicted probabilities must match actual win rates
  - Method: Temperature scaling or isotonic regression
  - Test: Calibration curve on holdout set (ECE < 0.05)
  
- **FR-3.2.4:** Compare with stage-based probability
  - Compare: ML prediction vs rule-based (stage-based) probability
  - Difference: Track delta between ML and rule-based
  - Alert: If delta > 30% consistently, investigate model

**Acceptance Criteria:**
- Win probability between 0 and 1
- Calibrated to actual win rates
- Confidence level provided
- Compared with baseline

#### FR-3.3: Revenue Forecasting Prediction
**Priority:** High  
**Description:** Forecast revenue with uncertainty quantification

**Requirements:**
- **FR-3.3.1:** Define input features
  - Opportunity features: dealValue, probability, stage, closeDate
  - Pipeline features: Total pipeline value, weighted value
  - Historical features: Historical revenue, seasonal patterns
  - Risk features: Risk scores, risk-adjusted values
  
- **FR-3.3.2:** Define output format
  - Schema:
    ```typescript
    {
      forecast: {
        p10: number;      // 10th percentile (worst case)
        p50: number;      // 50th percentile (base case)
        p90: number;      // 90th percentile (best case)
      };
      opportunities: Array<{
        opportunityId: string;
        expectedRevenue: number;
        contribution: number;  // % of total forecast
      }>;
      confidence: "low" | "medium" | "high";
    }
    ```
  
- **FR-3.3.3:** Implement uncertainty quantification
  - Method 1: Quantile regression (predict p10, p50, p90 directly)
  - Method 2: Monte Carlo simulation (sample from probability distributions)
  - Method 3: Ensemble standard deviation (if using ensemble models)
  
- **FR-3.3.4:** Aggregate opportunity-level forecasts
  - Sum: expectedRevenue across opportunities
  - Adjust: For correlation between opportunities (same account, same owner)
  - Validate: Ensure p10 < p50 < p90
  
- **FR-3.3.5:** Handle seasonality
  - Input: Seasonal multiplier from features
  - Adjust: Forecast by seasonal pattern
  - Example: Q4 typically 30% higher revenue

**Acceptance Criteria:**
- Forecast with uncertainty intervals (p10, p50, p90)
- Intervals properly ordered
- Opportunity-level contributions provided
- Seasonality accounted for

#### FR-3.4: Recommendation Ranking Prediction
**Priority:** Medium  
**Description:** Rank recommendations by relevance

**Requirements:**
- **FR-3.4.1:** Define input features
  - User features: Role, experience, historical behavior
  - Item features: Content type, tags, popularity
  - Context features: Current task, opportunity stage
  - Interaction features: Past clicks, engagements
  
- **FR-3.4.2:** Define output format
  - Schema:
    ```typescript
    {
      recommendations: Array<{
        itemId: string;
        rank: number;          // 1, 2, 3, ...
        score: number;         // 0-1 relevance score
        type: string;          // "template", "playbook", etc.
      }>;
    }
    ```
  - Order: Sorted by score (descending)
  - Limit: Top 10 recommendations
  
- **FR-3.4.3:** Implement learning-to-rank model
  - Model: XGBoost Ranker or LightGBM Ranker
  - Objective: Pairwise or listwise ranking
  - Training data: Historical clicks, engagement
  
- **FR-3.4.4:** Combine with collaborative filtering
  - Method: Hybrid approach (ML ranking + collaborative filtering)
  - Weight: 70% ML ranking, 30% collaborative filtering
  - Benefit: Cold start handling for new items

**Acceptance Criteria:**
- Recommendations ranked by relevance
- Top 10 returned
- Hybrid approach implemented
- Cold start handled

### FR-4: Model Management

#### FR-4.1: Model Metadata Synchronization
**Priority:** High  
**Description:** Sync model metadata from Azure ML to Cosmos DB

**Requirements:**
- **FR-4.1.1:** Implement periodic sync
  - Frequency: Every 5 minutes
  - Trigger: Scheduled job (Azure Function or Kubernetes CronJob)
  - Source: Azure ML Registry (via Azure ML SDK)
  - Destination: Cosmos DB Models container
  
- **FR-4.1.2:** Sync model metadata fields
  - Fields: id, name, version, status, endpointUrl, performance, config
  - Upsert: Update existing or insert new
  - Comparison: Compare timestamps to detect changes
  
- **FR-4.1.3:** Detect new model deployments
  - Compare: Current models in Cosmos DB vs Azure ML Registry
  - New: Models in Azure ML but not in Cosmos DB
  - Action: Insert new model metadata
  - Alert: Notify team of new deployment
  
- **FR-4.1.4:** Detect model updates
  - Compare: Model version in Cosmos DB vs Azure ML
  - Updated: Version or metadata changed
  - Action: Update Cosmos DB with latest metadata
  
- **FR-4.1.5:** Detect model deletions
  - Compare: Models in Cosmos DB but not in Azure ML
  - Deleted: Model no longer in registry
  - Action: Update status to "deprecated"
  - Retain: Keep in Cosmos DB for historical reference

**Acceptance Criteria:**
- Sync runs every 5 minutes
- All model changes detected within 5 minutes
- No data loss during sync
- Sync errors logged and alerted

#### FR-4.2: Model Performance Tracking
**Priority:** High  
**Description:** Track model performance over time

**Requirements:**
- **FR-4.2.1:** Calculate daily performance metrics
  - Metrics: Accuracy, precision, recall, F1 (for classification)
  - Metrics: MSE, MAE, R² (for regression)
  - Metrics: NDCG, MRR (for ranking)
  - Compare: Predictions vs actual outcomes
  
- **FR-4.2.2:** Store performance metrics
  - Container: ModelMetrics (Cosmos DB)
  - Document: Daily metrics per model
  - Fields: modelId, date, metrics, predictionCount, avgLatency, errorRate
  
- **FR-4.2.3:** Visualize performance trends
  - Chart: Time series of metrics over 30/90 days
  - UI: In ML Insights Dashboard
  - Alert: If metrics degrade >10% from baseline
  
- **FR-4.2.4:** Compare models
  - Compare: Champion vs challenger performance
  - Compare: Global vs industry-specific performance
  - Metrics: Side-by-side comparison table

**Acceptance Criteria:**
- Metrics calculated daily
- Historical trends available
- Degradation detected automatically
- Comparison tools available

#### FR-4.3: Model Health Monitoring
**Priority:** Critical  
**Description:** Monitor endpoint health and availability

**Requirements:**
- **FR-4.3.1:** Implement health check endpoint
  - Endpoint: POST /health
  - Body: `{ "test": true }`
  - Expected: 200 OK within 500ms
  - Frequency: Every 1 minute
  
- **FR-4.3.2:** Track health check results
  - Store: Last 60 health check results (1 hour)
  - Calculate: Success rate (rolling 1-hour window)
  - Alert: If success rate < 95%
  
- **FR-4.3.3:** Monitor endpoint latency
  - Metric: p50, p95, p99 latency
  - Window: Rolling 5-minute windows
  - Alert: If p95 > 3s
  
- **FR-4.3.4:** Monitor error rates
  - Track: 4xx errors (client), 5xx errors (server), timeouts
  - Window: Rolling 5-minute windows
  - Alert: If error rate > 5%
  
- **FR-4.3.5:** Dashboard for health metrics
  - Display: Endpoint status (healthy, degraded, down)
  - Display: Latency chart (real-time)
  - Display: Error rate chart
  - Display: Last error details

**Acceptance Criteria:**
- Health checks run every minute
- Metrics updated in real-time
- Alerts fired on degradation
- Dashboard shows current status

---

## Non-Functional Requirements

### NFR-1: Performance

#### NFR-1.1: Latency Requirements
**Requirements:**
- Single prediction inference: <2s (p95), <1s (p50), <500ms (p10)
- Batch prediction (100 opps): <5s (p95)
- Model selection: <50ms
- Cache read: <10ms (p95)
- Cache write: <20ms (p95)
- Feature extraction: <500ms (included in total)
- Endpoint call: <1.5s (p95)

**Measurement:**
- Use Application Insights custom metrics
- Track percentiles: p10, p50, p95, p99
- Dimensions: modelId, modelType, tenantId, cached (true/false)

**Optimization:**
- Cache predictions aggressively
- Use connection pooling for Azure ML endpoints
- Parallelize batch predictions
- Optimize feature vector serialization

#### NFR-1.2: Throughput Requirements
**Requirements:**
- Concurrent predictions: 100+ simultaneous requests
- Predictions per second: 50+ (single)
- Batch predictions per minute: 10+ (1000 opportunities/min)
- Cache operations: 1000+ ops/second

**Measurement:**
- Track requests per second
- Track queue depth
- Monitor Azure ML endpoint throughput limits

#### NFR-1.3: Resource Utilization
**Requirements:**
- CPU usage: <70% average, <90% peak
- Memory usage: <80% of allocated
- Cache memory: <4GB per instance
- Database RU consumption: <500 RU/s average

**Measurement:**
- Azure Monitor metrics
- Container Apps metrics
- Alert on resource exhaustion

### NFR-2: Scalability

#### NFR-2.1: Horizontal Scaling
**Requirements:**
- ModelService: Scale to 10+ instances
- MLService: Scale to 5+ instances
- Redis cache: Cluster mode (3+ nodes)
- Azure ML endpoints: Auto-scale (1-10 instances)

**Configuration:**
- Auto-scaling rules based on CPU, memory, queue depth
- Scale-out: Add instance when CPU > 70% for 5 minutes
- Scale-in: Remove instance when CPU < 30% for 10 minutes

#### NFR-2.2: Data Volume
**Requirements:**
- Predictions per day: 100,000+
- Historical predictions: 2 years retention (70M+ documents)
- Model metadata: 100+ models
- Metrics data: 365 days retention

**Optimization:**
- Partition Cosmos DB by tenantId
- Use Cosmos DB TTL for old predictions
- Archive old metrics to Azure Blob Storage

#### NFR-2.3: Tenant Isolation
**Requirements:**
- Multi-tenant prediction serving
- Independent scaling per tenant (if needed)
- Tenant-specific model routing

### NFR-3: Reliability

#### NFR-3.1: Availability
**Requirements:**
- ModelService uptime: 99.9% (8.76 hours downtime/year)
- Azure ML endpoints: 99.9% (SLA)
- Redis cache: 99.9%
- Cosmos DB: 99.99% (SLA)

**Measurement:**
- Track uptime percentage
- Track incident count and duration
- Track MTTR (Mean Time To Recovery)

#### NFR-3.2: Fault Tolerance
**Requirements:**
- Graceful degradation: Fallback to rule-based if ML unavailable
- Retry logic: Exponential backoff, max 3 retries
- Circuit breaker: Open after 5 consecutive failures
- Timeout handling: All operations have timeouts

**Testing:**
- Chaos engineering: Randomly kill instances
- Endpoint failure simulation
- Network latency simulation

#### NFR-3.3: Data Consistency
**Requirements:**
- Prediction storage: Eventually consistent (acceptable)
- Model metadata: Strongly consistent (required)
- Cache invalidation: Immediate (eventual consistency with < 1s lag acceptable)

### NFR-4: Security

#### NFR-4.1: Authentication & Authorization
**Requirements:**
- Azure ML endpoints: Managed Identity authentication
- API endpoints: JWT token authentication
- RBAC: Role-based access (Admin, Data Scientist, Developer)
- Tenant isolation: Users can only access their tenant's predictions

#### NFR-4.2: Data Encryption
**Requirements:**
- Encryption at rest: Cosmos DB, Azure Blob Storage
- Encryption in transit: TLS 1.2+ for all API calls
- Encryption in transit: TLS 1.2+ for Azure ML endpoint calls

#### NFR-4.3: Secrets Management
**Requirements:**
- API keys: Store in Azure Key Vault
- Connection strings: Retrieve from Key Vault at startup
- Managed Identity: Use for Azure services (no keys)

#### NFR-4.4: Audit Trail
**Requirements:**
- Log all predictions with user ID, tenant ID
- Log all model selection decisions
- Log all fallback events
- Retention: 1 year

### NFR-5: Observability

#### NFR-5.1: Logging
**Requirements:**
- Structured logging: JSON format
- Log levels: DEBUG, INFO, WARN, ERROR
- Correlation IDs: Include in all logs for request tracing
- Log content:
  - Prediction requests: opportunityId, tenantId, modelId
  - Model selection: Selected model, reason
  - Errors: Error type, stack trace, context

#### NFR-5.2: Metrics
**Requirements:**
- Custom metrics:
  - `ml_prediction_duration` (latency)
  - `ml_prediction_success` (boolean)
  - `ml_prediction_cache_hit_rate` (percentage)
  - `ml_model_error_rate` (percentage)
  - `ml_endpoint_health` (boolean)
- Dimensions: modelId, modelType, tenantId, cached
- Aggregations: Count, sum, min, max, avg, percentiles

#### NFR-5.3: Tracing
**Requirements:**
- Distributed tracing: OpenTelemetry
- Trace all requests end-to-end
- Span for each service call:
  - Feature extraction
  - Cache read/write
  - Model inference
  - Database operations

#### NFR-5.4: Dashboards
**Requirements:**
- Real-time dashboard:
  - Prediction latency (p50, p95, p99)
  - Cache hit rate
  - Error rate
  - Endpoint health
- Historical dashboard:
  - Prediction volume over time
  - Model performance trends
  - Error trends

#### NFR-5.5: Alerting
**Requirements:**
- Alert conditions:
  - Latency p95 > 3s for 5 minutes
  - Error rate > 5% for 5 minutes
  - Cache hit rate < 50% for 10 minutes
  - Endpoint health check fails 3 consecutive times
  - Circuit breaker opens
- Alert channels: Email, Slack, PagerDuty (for critical)
- Escalation: Critical alerts escalate after 15 minutes

---

## Service Implementation

### ModelService

#### Class Structure
```typescript
export class ModelService {
  constructor(
    private readonly azureMLClient: AzureMLClient,
    private readonly cachingService: CachingService,
    private readonly cosmosDBClient: CosmosDBClient,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly logger: Logger,
    private readonly metrics: MetricsService
  ) {}

  // Core prediction methods
  async predict(
    modelType: ModelType,
    features: FeatureVector,
    options?: PredictionOptions
  ): Promise<Prediction>

  async predictBatch(
    modelType: ModelType,
    featuresArray: FeatureVector[],
    options?: PredictionOptions
  ): Promise<Prediction[]>

  // Model selection
  async selectModel(
    modelType: ModelType,
    tenantId: string,
    opportunityId: string,
    options?: ModelSelectionOptions
  ): Promise<MLModel>

  async getModelMetadata(
    modelId: string
  ): Promise<MLModel>

  async getActiveModels(
    modelType: ModelType
  ): Promise<MLModel[]>

  // Caching
  async getCachedPrediction(
    modelId: string,
    opportunityId: string,
    tenantId: string
  ): Promise<Prediction | null>

  async cachePrediction(
    modelId: string,
    opportunityId: string,
    tenantId: string,
    prediction: Prediction,
    ttl?: number
  ): Promise<void>

  async invalidatePredictionCache(
    opportunityId: string,
    tenantId: string
  ): Promise<void>

  // Endpoint operations
  async callEndpoint(
    model: MLModel,
    features: FeatureVector,
    options?: EndpointOptions
  ): Promise<PredictionResponse>

  async callEndpointBatch(
    model: MLModel,
    featuresArray: FeatureVector[]
  ): Promise<PredictionResponse[]>

  // Health monitoring
  async checkEndpointHealth(
    endpointUrl: string
  ): Promise<HealthStatus>

  async trackPredictionLatency(
    modelId: string,
    latency: number,
    cached: boolean
  ): Promise<void>

  async trackPredictionError(
    modelId: string,
    error: Error
  ): Promise<void>

  // Private helper methods
  private async resolveModelVersion(
    modelType: ModelType,
    tenantId: string
  ): Promise<string>

  private async validatePredictionResponse(
    response: PredictionResponse,
    modelType: ModelType
  ): void

  private async storePrediction(
    prediction: Prediction
  ): Promise<void>

  private parsePredictionResponse(
    response: any,
    modelType: ModelType
  ): Prediction

  private buildCacheKey(
    modelId: string,
    opportunityId: string,
    tenantId: string
  ): string
}
```

[Continuing in next response due to length...]

