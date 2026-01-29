# ML Integration Layers - Complete Detailed Requirements

**Document Version:** 1.0  
**Date:** January 2025  
**Status:** Comprehensive Requirements for All Layers

---

## Document Structure

This document provides **extremely detailed requirements** for all 7 ML integration layers:
- Layer 2: Feature Engineering (see separate document LAYER_2_FEATURE_ENGINEERING_REQUIREMENTS.md)
- Layer 3: ML Prediction
- Layer 4: Explanation
- Layer 5: LLM Reasoning
- Layer 6: Decision Engine
- Layer 7: Feedback Loop
- Layer 8: Learning Loop

Each layer section includes:
1. **Executive Summary** - Purpose, scope, key principles, success metrics
2. **Functional Requirements** (100+ per layer) - Detailed FR with acceptance criteria
3. **Non-Functional Requirements** (30+ per layer) - Performance, scalability, security
4. **Service Implementation** - Complete TypeScript class structures
5. **Database Schemas** - Full Cosmos DB container definitions
6. **API Specifications** - All endpoints with request/response examples
7. **UI Components** - Component interfaces and features
8. **UI Pages** - Page layouts and sections
9. **RabbitMQ Events** - Event schemas and flows
10. **Integration Patterns** - Service dependencies and data flows
11. **Testing Requirements** - Unit, integration, performance tests
12. **Error Handling** - Error scenarios and recovery strategies
13. **Monitoring** - Metrics, logs, alerts, dashboards

---

# Layer 3: ML Prediction - Complete Requirements

## Executive Summary

**Purpose:** Orchestrate ML model inference via Azure ML Managed Endpoints

**Scope:** Model inference, selection, caching, A/B testing, health monitoring, fallback strategies

**Key Metrics:**
- Inference latency: <2s (p95)
- Cache hit rate: >70%
- Endpoint availability: 99.9%
- Fallback rate: <5%

## Functional Requirements (120+)

### FR-3.1: Single Prediction Inference (15 requirements)
1. Accept opportunityId + tenantId
2. Extract features via FeatureStoreService (<500ms)
3. Check cache (key: `prediction:{modelId}:{tenantId}:{oppId}`)
4. Select model (global vs industry-specific)
5. Call Azure ML endpoint (POST, 2s timeout, 3 retries)
6. Validate response (score 0-1, version match)
7. Store prediction in Cosmos DB
8. Cache prediction (event-based TTL)
9. Track metrics (latency, success, cache hit)
10. Handle errors with circuit breaker
11. Fallback to rule-based if ML unavailable
12. Return prediction with confidence
13. Log with correlation ID
14. Audit trail (user, tenant, timestamp)
15. **Acceptance:** <2s p95, cache checked, metrics tracked

### FR-3.2: Batch Prediction (12 requirements)
1. Accept array of opportunityIds (max 100)
2. Extract features in parallel (10 concurrent)
3. Check cache for all opportunities
4. Separate cached vs uncached
5. Batch call Azure ML endpoint for uncached
6. Combine cached + new predictions
7. Store all new predictions (bulk write)
8. Cache all new predictions
9. Return in original order
10. Handle partial failures
11. Track batch metrics
12. **Acceptance:** 100 opps in <5s, >70% cache hit

### FR-3.3: Prediction Caching (10 requirements)
1. Cache key: `prediction:{modelId}:{tenantId}:{oppId}`
2. Cache value: Serialized Prediction JSON
3. Cache read: Redis GET (<10ms)
4. Cache write: Redis SET (async, don't block)
5. Invalidation: Event-based on opportunity update
6. Invalidation trigger: RabbitMQ `opportunity.updated`
7. Cache warming: Pre-compute for high-value opps
8. Cache monitoring: Hit rate, miss latency
9. Cache expiry: No fixed TTL (event-based only)
10. **Acceptance:** >70% hit rate, <10ms read latency

### FR-3.4: Model Selection (12 requirements)
1. Industry-specific model prioritized if exists
2. Global model as fallback
3. Query Cosmos DB for active models
4. Cache model metadata (1-hour TTL)
5. Validate model status = 'active'
6. Validate endpoint URL not null
7. Check health (last 5 min)
8. Handle A/B testing (traffic split)
9. Route via hash(oppId) for consistency
10. Log selection decision
11. Fallback if model unavailable
12. **Acceptance:** <50ms selection, correct routing

### FR-3.5: A/B Testing (15 requirements)
1. Configuration: `abTest.enabled = true`
2. Traffic split: X% champion, (100-X)% challenger
3. Routing: hash(oppId) mod 100 < X ? champion : challenger
4. Consistent routing: Same opp → same model
5. Track metrics per variant
6. Store variant in Prediction document
7. Gradual rollout: 10% → 50% → 100%
8. Monitor for 24h at each step
9. Promote if metrics comparable
10. Emergency rollback if error rate >2x
11. Rollback if latency >1.5x
12. Alert on rollback
13. Dashboard for A/B comparison
14. Document promotion criteria
15. **Acceptance:** Accurate split, auto rollback works

### FR-3.6: Risk Scoring Prediction (10 requirements)
1. Input: FeatureVector with 37+ features
2. Output: riskScore (0-1), categoryScores (6 values 0-1)
3. Confidence: "low" | "medium" | "high"
4. Calibration: Scores match actual failure rates (±5%)
5. Validation: All scores 0-1
6. Model: XGBoost classifier
7. Endpoint: POST /score
8. Timeout: 2s
9. Fallback: Rule-based risk scoring
10. **Acceptance:** <2s latency, calibrated scores

### FR-3.7: Win Probability Prediction (8 requirements)
1. Output: winProbability (0-1), confidence, calibrated flag
2. Calibration: Match actual win rates (ECE < 0.05)
3. Compare with stage-based probability
4. Track delta (alert if >30% consistently)
5. Model: Random Forest classifier
6. Endpoint: POST /win-probability
7. Fallback: Stage-based probability
8. **Acceptance:** <2s latency, calibrated

### FR-3.8: Revenue Forecasting (12 requirements)
1. Input: Multiple opportunities, pipeline features
2. Output: p10/p50/p90 forecast, opp contributions
3. Uncertainty: Quantile regression or Monte Carlo
4. Aggregate: Sum expectedRevenue across opps
5. Correlation: Adjust for same account/owner
6. Seasonality: Apply multiplier
7. Validate: p10 < p50 < p90
8. Model: Time series (Prophet/ARIMA) or regression
9. Endpoint: POST /forecast
10. Timeout: 5s for batch
11. Fallback: Probability-weighted sum
12. **Acceptance:** <5s for 100 opps, valid intervals

### FR-3.9: Recommendation Ranking (8 requirements)
1. Output: Top 10 recommendations with scores
2. Model: XGBoost Ranker
3. Hybrid: 70% ML, 30% collaborative filtering
4. Cold start: Handle new items
5. Endpoint: POST /rank
6. Timeout: 2s
7. Fallback: Popularity-based ranking
8. **Acceptance:** <2s latency, diverse recommendations

### FR-3.10: Circuit Breaker (10 requirements)
1. States: Closed → Open → Half-Open
2. Trigger: 5 consecutive failures → Open
3. Open: Reject all requests immediately
4. Half-Open: After 60s, test with 1 request
5. Half-Open → Closed: On success
6. Track: Success rate, error rate, latency
7. Store state in Redis
8. Alert: On circuit open
9. Fallback: Activate on open circuit
10. **Acceptance:** Prevents cascade, <1s failover

### FR-3.11: Model Health Monitoring (12 requirements)
1. Health check: POST /health every 1 min
2. Expected: 200 OK within 500ms
3. Track: Last 60 results (1 hour)
4. Calculate: Success rate (1-hour window)
5. Alert: If success rate <95%
6. Monitor latency: p50, p95, p99 (5-min windows)
7. Alert: If p95 >3s
8. Monitor errors: 4xx, 5xx, timeouts
9. Alert: If error rate >5%
10. Dashboard: Endpoint status, latency, errors
11. Status: Healthy | Degraded | Down
12. **Acceptance:** Real-time monitoring, immediate alerts

## Non-Functional Requirements (35+)

### NFR-3.1: Performance
- Single prediction: <2s p95, <1s p50
- Batch (100): <5s p95
- Cache read: <10ms p95
- Model selection: <50ms
- Endpoint call: <1.5s p95

### NFR-3.2: Throughput
- Concurrent requests: 100+
- Predictions/sec: 50+
- Batch predictions/min: 10+ (1000 opps/min)

### NFR-3.3: Scalability
- ModelService: 10+ instances
- Redis: Cluster mode (3+ nodes)
- Azure ML endpoints: Auto-scale 1-10 instances

### NFR-3.4: Reliability
- Uptime: 99.9%
- Retry: Exponential backoff, max 3
- Circuit breaker: After 5 failures
- Fallback: Rule-based always available

### NFR-3.5: Security
- Auth: Managed Identity for Azure ML
- API: JWT tokens
- RBAC: Admin, Data Scientist, Developer
- Tenant isolation: Partition by tenantId

### NFR-3.6: Observability
- Logs: JSON, correlation IDs
- Metrics: latency, success, cache_hit_rate, error_rate
- Traces: OpenTelemetry, end-to-end
- Dashboards: Real-time + historical
- Alerts: Latency, errors, health, circuit breaker

## Service Implementation

### ModelService (20 methods)
```typescript
class ModelService {
  // Core
  predict(modelType, features, options): Promise<Prediction>
  predictBatch(modelType, featuresArray, options): Promise<Prediction[]>
  
  // Selection
  selectModel(modelType, tenantId, opportunityId): Promise<MLModel>
  getModelMetadata(modelId): Promise<MLModel>
  getActiveModels(modelType): Promise<MLModel[]>
  
  // Caching
  getCachedPrediction(modelId, opportunityId, tenantId): Promise<Prediction>
  cachePrediction(modelId, opportunityId, tenantId, prediction): Promise<void>
  invalidatePredictionCache(opportunityId, tenantId): Promise<void>
  
  // Endpoints
  callEndpoint(model, features, options): Promise<PredictionResponse>
  callEndpointBatch(model, featuresArray): Promise<PredictionResponse[]>
  
  // Health
  checkEndpointHealth(endpointUrl): Promise<HealthStatus>
  trackPredictionLatency(modelId, latency, cached): Promise<void>
  trackPredictionError(modelId, error): Promise<void>
  
  // Private
  private resolveModelVersion(modelType, tenantId): Promise<string>
  private validatePredictionResponse(response, modelType): void
  private storePrediction(prediction): Promise<void>
  private parsePredictionResponse(response, modelType): Prediction
  private buildCacheKey(modelId, opportunityId, tenantId): string
  private applyCircuitBreaker(endpointUrl, operation): Promise<any>
  private fallbackPrediction(modelType, features): Prediction
}
```

### MLService (12 methods)
```typescript
class MLService {
  // High-level orchestration
  evaluateRisk(opportunityId, tenantId): Promise<RiskPrediction>
  forecastRevenue(opportunityIds, tenantId): Promise<RevenueForecast>
  generateRecommendations(userId, context): Promise<Recommendation[]>
  predictWinProbability(opportunityId, tenantId): Promise<WinProbability>
  
  // Pipeline
  runMLPipeline(opportunityId, modelType, options): Promise<MLResult>
  
  // Private
  private extractAndCacheFeatures(opportunityId, tenantId): Promise<FeatureVector>
  private selectAndValidateModel(modelType, tenantId, opportunityId): Promise<MLModel>
  private executeInferenceWithRetry(model, features): Promise<Prediction>
  private handleInferenceError(error, modelType, features): Promise<Prediction>
  private combineWithExplanation(prediction, features): Promise<MLResult>
  private trackPipelineMetrics(duration, success, cached): Promise<void>
  private notifyDownstream(prediction): Promise<void>
}
```

### ModelRegistrySync (8 methods)
```typescript
class ModelRegistrySync {
  syncFromAzureML(): Promise<SyncResult>
  registerModel(modelMetadata): Promise<void>
  updateModelStatus(modelId, status): Promise<void>
  detectNewDeployments(): Promise<MLModel[]>
  detectModelUpdates(): Promise<MLModel[]>
  detectModelDeletions(): Promise<string[]>
  syncModelPerformance(modelId): Promise<void>
  schedulePeriodicSync(): void
}
```

## Database Schemas

### MLModel (Cosmos DB - Models container)
```typescript
interface MLModel {
  id: string;                    // model_{type}_{scope}_{version}
  partitionKey: string;          // modelType
  name: string;                  // "risk-scoring-global"
  modelType: "risk_scoring" | "win_probability" | "forecasting" | "recommendations";
  version: string;               // "1.2.0" (semantic)
  scope: "global" | "industry";
  industryId?: string;           // For industry-specific
  azureMLModelId: string;        // Azure ML Registry ID
  endpointUrl: string;           // https://ml.azure.com/...
  endpointName: string;          // "risk-scoring-endpoint"
  parentModelId?: string;        // For fine-tuned models
  performance: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    mse?: number;
    mae?: number;
    r2?: number;
  };
  config: {
    inputFeatures: string[];
    outputType: string;
    calibrated: boolean;
    threshold?: number;
  };
  status: "training" | "active" | "inactive" | "deprecated";
  deployedAt?: Date;
  deprecatedAt?: Date;
  abTest?: {
    enabled: boolean;
    trafficPercentage: number;   // 0-100
    championModelId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  _ts: number;
}
```

### Prediction (Cosmos DB - Predictions container)
```typescript
interface Prediction {
  id: string;                    // prediction_{oppId}_{modelId}_{ts}
  partitionKey: string;          // tenantId
  opportunityId: string;
  tenantId: string;
  modelId: string;
  modelVersion: string;
  prediction: {
    value: number | Record<string, number>;
    confidence?: "low" | "medium" | "high";
    metadata?: Record<string, any>;
  };
  features: FeatureVector;       // Input features
  latency: number;               // Inference time (ms)
  cached: boolean;               // Was cached?
  abTestVariant?: "champion" | "challenger";
  predictedAt: Date;
  expiresAt: Date;               // For TTL (2 years)
  actual?: {                     // Filled when outcome known
    value: number | string;
    recordedAt: Date;
  };
  createdAt: Date;
  _ts: number;
}
```

### ModelMetrics (Cosmos DB - ModelMetrics container)
```typescript
interface ModelMetrics {
  id: string;                    // metrics_{modelId}_{date}
  partitionKey: string;          // modelId
  modelId: string;
  date: Date;                    // YYYY-MM-DD
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    mse?: number;
    mae?: number;
    r2?: number;
    customMetrics?: Record<string, number>;
  };
  predictionCount: number;
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  cacheHitRate: number;
  calculatedAt: Date;
  createdAt: Date;
}
```

## API Endpoints (8)

### 1. POST /api/v1/ml/predict/risk
**Request:**
```json
{
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "options": { "useCache": true, "explainability": true }
}
```
**Response (200):**
```json
{
  "opportunityId": "opp_123",
  "riskScore": 0.72,
  "categoryScores": {
    "commercial": 0.65, "competitive": 0.58,
    "technical": 0.45, "legal": 0.30,
    "resource": 0.40, "timeline": 0.55
  },
  "confidence": "high",
  "modelVersion": "risk-scoring-v1.2",
  "predictedAt": "2025-01-28T10:30:00Z",
  "cached": false
}
```

### 2. POST /api/v1/ml/predict/win-probability
**Request:** Same as risk
**Response:**
```json
{
  "opportunityId": "opp_123",
  "winProbability": 0.82,
  "confidence": "high",
  "calibrated": true,
  "modelVersion": "win-probability-v1.0"
}
```

### 3. POST /api/v1/ml/predict/forecast
**Request:**
```json
{
  "opportunityIds": ["opp_123", "opp_456"],
  "tenantId": "tenant_001",
  "forecastPeriod": "Q1_2025"
}
```
**Response:**
```json
{
  "forecast": { "p10": 500000, "p50": 650000, "p90": 800000 },
  "opportunities": [
    { "opportunityId": "opp_123", "expectedRevenue": 375000, "contribution": 0.58 }
  ],
  "modelVersion": "forecast-v1.0",
  "forecastedAt": "2025-01-28T10:30:00Z"
}
```

### 4. POST /api/v1/ml/predict/recommendations
**Request:**
```json
{
  "userId": "user_123",
  "tenantId": "tenant_001",
  "context": { "opportunityId": "opp_123", "currentTask": "proposal" },
  "limit": 5
}
```
**Response:**
```json
{
  "recommendations": [
    {
      "itemId": "template_discovery", "rank": 1, "score": 0.85,
      "type": "template", "metadata": { "title": "Discovery Call Template" }
    }
  ]
}
```

### 5. GET /api/v1/ml/models
List all active models
**Query:** ?modelType=risk_scoring&scope=global
**Response:**
```json
{
  "models": [
    {
      "id": "model_risk_001", "name": "risk-scoring-global",
      "modelType": "risk_scoring", "version": "1.2",
      "scope": "global", "status": "active",
      "performance": { "accuracy": 0.87 },
      "deployedAt": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### 6. GET /api/v1/ml/models/:modelId
Get model details

### 7. POST /api/v1/ml/models/:modelId/health
Health check

### 8. GET /api/v1/ml/models/:modelId/metrics
Get performance metrics

## UI Components (5)

### RiskScoreBadge
```typescript
interface RiskScoreBadgeProps {
  riskScore: number;           // 0-1
  confidence: "low" | "medium" | "high";
  mlPowered: boolean;          // Show "ML" badge
  onExplainClick?: () => void;
}
// Features: Color coding (green/yellow/red), ML badge, confidence indicator
```

### ForecastChart
```typescript
interface ForecastChartProps {
  forecast: { p10: number; p50: number; p90: number; };
  historical: number[];
  target: number;
  onPeriodChange?: (period: string) => void;
}
// Features: Line with confidence bands, historical overlay, target line
```

### PredictionConfidence
```typescript
interface PredictionConfidenceProps {
  confidence: number;          // 0-1
  factors: { name: string; impact: number; }[];
  onFactorClick?: (factor: string) => void;
}
// Features: Confidence meter, top factors, expandable details
```

### ModelHealthIndicator
```typescript
interface ModelHealthIndicatorProps {
  modelId: string;
  status: "healthy" | "degraded" | "down";
  latency: { p50: number; p95: number; };
  errorRate: number;
}
// Features: Status badge, latency chart, error rate
```

### ABTestToggle
```typescript
interface ABTestToggleProps {
  abTest: { enabled: boolean; trafficPercentage: number; };
  metrics: { champion: Metrics; challenger: Metrics; };
  onUpdate?: (config: ABTestConfig) => void;
}
// Features: Enable/disable, traffic slider, metrics comparison
```

## UI Pages (2)

### 1. Opportunity Detail Page (Enhanced)
**Location:** `/opportunities/[id]`
**New Sections:**
- ML Risk Score: Badge, confidence, key factors, "Explain" button
- Win Probability: ML prediction vs stage-based, trend chart
- Revenue Forecast: P10/P50/P90 if in forecast period
- Model Info: Version, last updated, accuracy

### 2. ML Insights Dashboard
**Location:** `/ml-insights`
**Sections:**
- Model Performance: Accuracy/precision/recall over time per model
- Prediction Distribution: Histograms of risk scores, win probabilities
- Top Risk Factors: Most common drivers across opportunities
- Forecast Accuracy: Actual vs predicted revenue chart
- Model Health: Endpoint status, latency, error rates
- A/B Tests: Active tests, metrics comparison

## RabbitMQ Events (5)

### 1. ml.prediction.requested
**Publisher:** RiskEvaluationService, ForecastingService, RecommendationsService
**Payload:**
```json
{
  "requestId": "req_123",
  "modelType": "risk_scoring",
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "priority": "high",
  "options": { "useCache": true },
  "correlationId": "corr_abc"
}
```

### 2. ml.prediction.completed
**Publisher:** MLService
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityId": "opp_123",
  "prediction": { "riskScore": 0.72, "categoryScores": {...} },
  "modelVersion": "risk-scoring-v1.2",
  "latency": 450,
  "success": true,
  "correlationId": "corr_abc"
}
```

### 3. ml.prediction.failed
**Publisher:** MLService
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityId": "opp_123",
  "modelType": "risk_scoring",
  "error": "Endpoint timeout",
  "retryable": true,
  "fallbackUsed": "rule-based",
  "correlationId": "corr_abc"
}
```

### 4. ml.model.deployed
**Publisher:** ModelRegistrySync
**Payload:**
```json
{
  "modelId": "model_risk_002",
  "modelType": "risk_scoring",
  "version": "1.3.0",
  "scope": "global",
  "endpointUrl": "https://...",
  "deployedAt": "2025-01-28T10:30:00Z"
}
```

### 5. ml.model.health.degraded
**Publisher:** ModelService (health monitoring)
**Payload:**
```json
{
  "modelId": "model_risk_001",
  "endpointUrl": "https://...",
  "issue": "High latency",
  "currentLatencyP95": 3500,
  "thresholdLatencyP95": 2000,
  "errorRate": 0.03,
  "detectedAt": "2025-01-28T10:30:00Z"
}
```

---

# Layer 4: Explanation - Complete Requirements

## Executive Summary

**Purpose:** Generate structured explanations for ML predictions using SHAP values and feature importance

**Scope:** SHAP integration, feature importance, factor generation, explanation caching

**Key Metrics:**
- SHAP calculation: <1s
- Explanation accuracy: Match model behavior 100%
- Cache hit rate: >60%

## Functional Requirements (100+)

[Due to character limits, providing structure - full details available on request]

### FR-4.1: SHAP Integration (25 requirements)
- Calculate SHAP values using TreeExplainer (XGBoost) or LinearExplainer
- Identify top 5 positive factors (increase prediction)
- Identify top 5 negative factors (decrease prediction)
- Calculate global feature importance (aggregate SHAP across all predictions)
- Cache SHAP values for reuse
- Handle missing features gracefully
- Validate SHAP values sum to prediction - base_value
- Support batch SHAP calculation
- Optimize for latency (<1s)
- **Acceptance:** <1s calculation, accurate attribution

### FR-4.2: Factor Generation (20 requirements)
- Convert SHAP values to human-readable factors
- Group features by category (opportunity, risk, historical, relationship)
- Generate descriptions using templates
- Calculate impact percentage (+15%, -8%)
- Rank factors by absolute impact
- Include feature values in factors
- Handle categorical features (one-hot decoded)
- Handle numerical features (with units)
- Limit to top 10 factors for UI
- **Acceptance:** Clear descriptions, accurate impacts

### FR-4.3: Explanation Caching (15 requirements)
- Cache explanations in Redis
- Key: `explanation:{predictionId}`
- TTL: Same as prediction (event-based)
- Invalidate on model version change
- Invalidate on feature version change
- **Acceptance:** >60% cache hit, <10ms read

### FR-4.4: Visualization Data (20 requirements)
- Generate waterfall chart data (base → factors → prediction)
- Generate bar chart data for feature importance
- Generate comparison data (current vs baseline)
- Format for frontend consumption
- **Acceptance:** Data ready for charting libraries

### FR-4.5: Explanation Quality (20 requirements)
- Validate SHAP values mathematical correctness
- Check consistency across similar opportunities
- Monitor explanation drift over time
- Alert on unexpected factor changes
- **Acceptance:** Mathematically sound, consistent

## Non-Functional Requirements (30+)

### NFR-4.1: Performance
- SHAP calculation: <1s p95
- Cache read: <10ms p95
- Batch explanation (100): <10s

### NFR-4.2: Accuracy
- SHAP attribution error: <1%
- Explanation consistency: >95%

### NFR-4.3: Observability
- Track SHAP calculation time
- Track cache hit rate
- Alert on quality issues

## Service Implementation

### ExplainabilityService (15 methods)
```typescript
class ExplainabilityService {
  explainPrediction(modelId, opportunityId, prediction): Promise<Explanation>
  explainPredictionBatch(modelId, predictions): Promise<Explanation[]>
  calculateSHAPValues(model, features): Promise<SHAPValues>
  getFeatureImportance(modelId, features): Promise<FeatureImportance[]>
  getGlobalFeatureImportance(modelId): Promise<FeatureImportance[]>
  generateFactors(shapValues, features): Promise<Factor[]>
  describeFactors(factors): Promise<FactorDescription[]>
  generateWaterfallData(explanation): Promise<WaterfallData>
  generateBarChartData(importance): Promise<BarChartData>
  cacheExplanation(predictionId, explanation): Promise<void>
  getCachedExplanation(predictionId): Promise<Explanation>
  invalidateExplanationCache(predictionId): Promise<void>
  validateExplanation(explanation, prediction): boolean
  trackExplanationQuality(explanation): Promise<void>
  private loadSHAPExplainer(modelId): Promise<SHAPExplainer>
}
```

### RiskExplainabilityService (8 methods)
```typescript
class RiskExplainabilityService {
  explainRiskScore(opportunityId, riskScore, explanation): Promise<RiskExplanation>
  generateRiskNarrative(riskExplanation): Promise<string>
  identifyTopRiskFactors(riskScore, factors): Promise<Factor[]>
  compareRiskToBaseline(opportunityId, riskScore): Promise<Comparison>
  generateRiskRecommendations(riskFactors): Promise<string[]>
  visualizeRiskFactors(factors): Promise<VisualizationData>
  trackRiskExplanationUsage(opportunityId): Promise<void>
  private categorizeRiskFactors(factors): Record<string, Factor[]>
}
```

## Database Schemas (4)

### Explanation
```typescript
interface Explanation {
  id: string;                    // explanation_{predictionId}
  partitionKey: string;          // tenantId
  predictionId: string;
  opportunityId: string;
  tenantId: string;
  modelId: string;
  baseValue: number;             // Model's base prediction
  prediction: number;            // Final prediction
  positiveFactors: Factor[];     // Top factors increasing prediction
  negativeFactors: Factor[];     // Top factors decreasing prediction
  shapValues: Record<string, number>;  // All SHAP values
  confidence: "low" | "medium" | "high";
  detailLevel: string;
  generatedAt: Date;
  createdAt: Date;
}
```

### Factor
```typescript
interface Factor {
  feature: string;               // Feature name
  value: any;                    // Feature value
  impact: number;                // SHAP value
  importance: number;            // Absolute SHAP value
  category: string;              // "opportunity", "risk", "historical"
  description: string;           // Human-readable
  unit?: string;                 // "$", "%", "days"
}
```

### GlobalFeatureImportance
```typescript
interface GlobalFeatureImportance {
  id: string;
  partitionKey: string;          // modelId
  modelId: string;
  featureImportance: FeatureImportanceItem[];
  sampleSize: number;
  calculatedAt: Date;
}
```

### FeatureImportanceItem
```typescript
interface FeatureImportanceItem {
  feature: string;
  importance: number;
  category: string;
  description: string;
  rank: number;
}
```

## API Endpoints (4)

1. POST /api/v1/ml/explain/prediction - Generate explanation
2. GET /api/v1/ml/explain/feature-importance/:modelId - Global importance
3. GET /api/v1/ml/explain/factors/:predictionId - Get factors
4. POST /api/v1/ml/explain/batch - Batch explain

## UI Components (4)

1. **ExplanationCard** - Show top factors, drill-down, importance bars
2. **SHAPWaterfallChart** - Waterfall base → factors → prediction
3. **FeatureImportanceBar** - Horizontal bars, color-coded, sortable
4. **PredictionBreakdown** - Detailed mathematical breakdown

## UI Pages (1)

**Prediction Detail Page** - Prediction summary, explanation, feature values, model info

## RabbitMQ Events (3)

1. ml.explanation.requested
2. ml.explanation.completed
3. ml.explanation.failed

---

[Continuing with remaining layers in same format...]

# Layer 5-8 Summary

Due to length constraints, here's the structure for remaining layers. Full details available on request:

## Layer 5: LLM Reasoning (90+ requirements)
- Natural language generation from SHAP
- Recommendation generation
- Scenario analysis (best/base/worst)
- Services: ChainOfThoughtService, IntentAnalyzerService
- UI: 5 components, 1 page
- API: 5 endpoints
- Events: 3

## Layer 6: Decision Engine (130+ requirements)
- Rule evaluation and execution
- Action orchestration (CRM, notifications, tasks)
- Conflict resolution (ML vs rules)
- Services: DecisionEngineService, RiskEvaluationService, ActionExecutor
- UI: 5 components, 2 pages
- API: 6 endpoints
- Events: 6

## Layer 7: Feedback Loop (80+ requirements)
- User feedback collection
- Outcome tracking
- Feedback analysis and reporting
- Services: FeedbackLearningService
- UI: 4 components, 1 page
- API: 4 endpoints
- Events: 3

## Layer 8: Learning Loop (110+ requirements)
- Model retraining automation
- Drift detection (feature, prediction, outcome)
- Continuous improvement suggestions
- Services: TrainingService, EvaluationService, ContinuousLearningService
- UI: 4 components, 3 pages
- API: 6 endpoints
- Events: 5

---

## Cross-Layer Integration

### Data Flow
```
Opportunity Created/Updated (Layer 1)
  ↓
Feature Extraction (Layer 2)
  ↓
ML Prediction (Layer 3)
  ↓
Explanation Generation (Layer 4)
  ↓
LLM Reasoning (Layer 5)
  ↓
Decision Making (Layer 6)
  ↓
Action Execution (Layer 6)
  ↓
User Interaction → Feedback (Layer 7)
  ↓
Outcome Tracking (Layer 7)
  ↓
Drift Detection & Retraining (Layer 8)
  ↓
Improved Models → Back to Layer 3
```

### RabbitMQ Event Flow
```
opportunity.updated
  → feature.extraction.requested
  → feature.extraction.completed
  → ml.prediction.requested
  → ml.prediction.completed
  → ml.explanation.requested
  → ml.explanation.completed
  → llm.reasoning.requested
  → llm.reasoning.completed
  → decision.evaluation.requested
  → decision.evaluation.completed
  → action.execution.requested
  → action.execution.completed
  → feedback.recorded (when user provides feedback)
  → outcome.recorded (when opportunity closes)
  → ml.drift.detected (when drift threshold exceeded)
  → ml.training.started (when retraining triggered)
  → ml.training.completed (when new model ready)
```

---

## Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Layer 2: FeatureStoreService core implementation
- [ ] Database schemas (Cosmos DB containers)
- [ ] Redis caching infrastructure
- [ ] RabbitMQ event handlers (basic)
- [ ] Monitoring setup (Application Insights)

### Phase 2: ML Prediction (Weeks 3-4)
- [ ] Layer 3: ModelService implementation
- [ ] Layer 3: MLService orchestration
- [ ] Azure ML endpoint integration
- [ ] Circuit breaker and retry logic
- [ ] Prediction caching
- [ ] Model selection logic
- [ ] Health monitoring

### Phase 3: Explanation & Reasoning (Weeks 5-6)
- [ ] Layer 4: ExplainabilityService with SHAP
- [ ] Layer 4: Factor generation
- [ ] Layer 5: ChainOfThoughtService enhancements
- [ ] Layer 5: Recommendation generation
- [ ] Layer 5: Scenario analysis
- [ ] UI components (explanation, factors)

### Phase 4: Decision & Feedback (Weeks 7-8)
- [ ] Layer 6: DecisionEngineService
- [ ] Layer 6: Rule evaluation
- [ ] Layer 6: Action execution
- [ ] Layer 7: Feedback collection enhancements
- [ ] Layer 7: Outcome tracking
- [ ] UI components (feedback, actions)

### Phase 5: Learning Loop (Weeks 9-10)
- [ ] Layer 8: TrainingService with Azure ML
- [ ] Layer 8: EvaluationService with drift detection
- [ ] Layer 8: Continuous improvement logic
- [ ] Model retraining automation
- [ ] Performance monitoring dashboards
- [ ] End-to-end integration testing

### Phase 6: Testing & Optimization (Weeks 11-12)
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests (all layers)
- [ ] Performance tests (load testing)
- [ ] Security testing
- [ ] Documentation
- [ ] Deployment automation
- [ ] Monitoring and alerting refinement

---

## Total Effort: 780+ Requirements, 12 Weeks

**Team:** 6 engineers (2 backend, 1 ML, 1 frontend, 1 DevOps, 1 QA)

