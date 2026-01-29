# Detailed Requirements for ML Integration Layers

**Date:** January 2025  
**Version:** 1.0  
**Status:** Comprehensive Requirements Document

---

## Table of Contents

1. [Layer 2: Feature Engineering](#layer-2-feature-engineering)
2. [Layer 3: ML Prediction](#layer-3-ml-prediction)
3. [Layer 4: Explanation](#layer-4-explanation)
4. [Layer 5: LLM Reasoning](#layer-5-llm-reasoning)
5. [Layer 6: Decision Engine](#layer-6-decision-engine)
6. [Layer 7: Feedback Loop](#layer-7-feedback-loop)
7. [Layer 8: Learning Loop](#layer-8-learning-loop)
8. [Cross-Layer Requirements](#cross-layer-requirements)

---

## Layer 2: Feature Engineering

### Overview
Transforms raw opportunity signals into ML-ready features with versioning and caching.

### Features & Capabilities

#### 2.1 Feature Extraction
**Features:**
- Extract opportunity features (dealValue, probability, stage, industry, closeDate)
- Extract risk features (detected risks, category scores, risk snapshots)
- Extract historical features (owner win rate, account health, similar deals win rate)
- Extract relationship features (stakeholder count, activity count, document count)
- Extract temporal features (month, quarter, days to close, seasonality)
- Extract behavioral features (engagement rate, response time, activity velocity)

**Requirements:**
- Support batch feature extraction (multiple opportunities)
- Support real-time feature extraction (single opportunity, <500ms)
- Handle missing data gracefully (imputation strategies)
- Support feature statistics tracking (mean, std, min, max)

#### 2.2 Feature Transformation
**Features:**
- Categorical encoding (one-hot, embeddings)
- Numerical normalization (min-max, z-score)
- Log transformations for skewed features
- Rolling aggregations (7-day, 30-day averages)
- Rate of change calculations
- Seasonal pattern detection

**Requirements:**
- Consistent transformations between training and inference
- Feature scaling appropriate for model type (XGBoost vs neural networks)
- Handle outliers (clipping, winsorization)

#### 2.3 Feature Versioning
**Features:**
- Pin feature versions for training jobs
- Resolve latest compatible versions for inference
- Track feature computation logic changes
- Prevent training/serving skew
- Major/minor version compatibility checking

**Requirements:**
- Feature version format: `{featureName}_v{major}.{minor}`
- Major version changes: Breaking changes (schema, computation logic)
- Minor version changes: Non-breaking enhancements
- Store feature metadata: version, computation hash, dependencies

#### 2.4 Feature Store
**Features:**
- Store computed features in Cosmos DB
- Cache features in Redis (15-minute TTL, event-based invalidation)
- Query features by opportunityId, tenantId, timestamp
- Support feature snapshots for historical analysis
- Feature discovery and documentation

**Requirements:**
- Feature schema validation
- Feature quality metrics (missing rate, outlier rate)
- Feature lineage tracking
- Bulk feature export for training

### Service Integration

#### FeatureStoreService
**Location:** `apps/api/src/services/ml/feature-store.service.ts`

**Dependencies:**
- ShardRepositoryService (read opportunity data)
- ShardRelationshipService (read related entities)
- CachingService (feature caching)
- RiskEvaluationService (risk features)

**Key Methods:**
```typescript
class FeatureStoreService {
  // Core feature extraction
  extractFeatures(opportunityId: string, tenantId: string, modelVersion?: string): Promise<FeatureVector>
  extractFeaturesForBatch(opportunityIds: string[], tenantId: string): Promise<Map<string, FeatureVector>>
  
  // Feature versioning
  pinFeatureVersions(trainingJobId: string, featureNames: string[]): Promise<FeatureVersionMap>
  getFeatureVersionForInference(featureName: string, modelVersion: string): Promise<FeatureVersion>
  isCompatibleVersion(featureVersion: string, requiredVersion: string): boolean
  
  // Feature caching
  cacheFeatures(opportunityId: string, features: FeatureVector, ttl?: number): Promise<void>
  getCachedFeatures(opportunityId: string): Promise<FeatureVector | null>
  invalidateCache(opportunityId: string): Promise<void>
  
  // Feature metadata
  getFeatureSchema(): Promise<FeatureSchema>
  getFeatureStatistics(featureName: string): Promise<FeatureStatistics>
  trackFeatureQuality(featureName: string, values: number[]): Promise<void>
}
```

### UI Components
*No direct UI for feature engineering - used internally by ML services*

### API Endpoints

#### GET /api/v1/ml/features/:opportunityId
**Purpose:** Get features for an opportunity  
**Request:**
```json
{
  "modelVersion": "risk-scoring-v1.2"
}
```
**Response:**
```json
{
  "opportunityId": "opp_123",
  "features": {
    "dealValue": 500000,
    "probability": 0.75,
    "daysToClose": 49,
    "hasCompetitor": true,
    "budgetConfirmed": true,
    "ownerWinRate": 0.68,
    "accountHealth": 0.82,
    "month": 3,
    "quarter": 1,
    "seasonality": 1.15
  },
  "metadata": {
    "featureVersions": {
      "dealValue": "dealValue_v1.0",
      "probability": "probability_v1.1",
      "ownerWinRate": "ownerWinRate_v2.0"
    },
    "extractedAt": "2025-01-28T10:30:00Z",
    "modelVersion": "risk-scoring-v1.2"
  }
}
```

#### POST /api/v1/ml/features/batch
**Purpose:** Get features for multiple opportunities  
**Request:**
```json
{
  "opportunityIds": ["opp_123", "opp_456", "opp_789"],
  "modelVersion": "risk-scoring-v1.2"
}
```
**Response:**
```json
{
  "features": [
    {
      "opportunityId": "opp_123",
      "features": { ... }
    },
    {
      "opportunityId": "opp_456",
      "features": { ... }
    }
  ]
}
```

#### GET /api/v1/ml/features/schema
**Purpose:** Get feature schema and metadata  
**Response:**
```json
{
  "features": [
    {
      "name": "dealValue",
      "type": "numerical",
      "description": "Opportunity amount",
      "version": "1.0",
      "transformations": ["log", "normalize"],
      "statistics": {
        "mean": 250000,
        "std": 150000,
        "min": 10000,
        "max": 5000000
      }
    },
    {
      "name": "stage",
      "type": "categorical",
      "description": "Opportunity stage",
      "version": "1.1",
      "transformations": ["one-hot"],
      "categories": ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]
    }
  ]
}
```

### Database Schema

#### Features Container (Cosmos DB)
```typescript
interface FeatureSnapshot {
  id: string;                          // feature_snapshot_{opportunityId}_{timestamp}
  partitionKey: string;                // tenantId
  opportunityId: string;
  tenantId: string;
  features: FeatureVector;
  featureVersions: Record<string, string>;
  metadata: {
    extractedAt: Date;
    modelVersion: string;
    expiresAt: Date;
  };
  createdAt: Date;
  _ts: number;
}

interface FeatureMetadata {
  id: string;                          // feature_metadata_{featureName}
  partitionKey: string;                // "global"
  featureName: string;
  currentVersion: string;
  versions: FeatureVersion[];
  schema: {
    type: "numerical" | "categorical" | "temporal" | "embedding";
    description: string;
    transformations: string[];
    dependencies: string[];
  };
  statistics: FeatureStatistics;
  qualityMetrics: {
    missingRate: number;
    outlierRate: number;
    lastChecked: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface FeatureVersion {
  version: string;                     // "1.2"
  computationHash: string;
  changes: string;
  compatibleWith: string[];            // ["1.0", "1.1"]
  deprecatedAt?: Date;
  createdAt: Date;
}

interface FeatureStatistics {
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
  p25?: number;
  p75?: number;
  uniqueValues?: number;
  missingRate: number;
  sampleSize: number;
  lastUpdated: Date;
}
```

### Message Queues (RabbitMQ)

#### feature.extraction.requested
**Purpose:** Request feature extraction for opportunities  
**Publisher:** Training jobs, inference requests  
**Consumer:** FeatureStoreService  
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityIds": ["opp_123", "opp_456"],
  "tenantId": "tenant_001",
  "modelVersion": "risk-scoring-v1.2",
  "priority": "high",
  "correlationId": "corr_abc"
}
```

#### feature.extraction.completed
**Purpose:** Feature extraction completed  
**Publisher:** FeatureStoreService  
**Consumer:** Training jobs, inference pipelines  
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityId": "opp_123",
  "features": { ... },
  "success": true,
  "duration": 250,
  "correlationId": "corr_abc"
}
```

#### feature.cache.invalidated
**Purpose:** Feature cache invalidation  
**Publisher:** Opportunity update events  
**Consumer:** FeatureStoreService  
**Payload:**
```json
{
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "reason": "opportunity_updated",
  "timestamp": "2025-01-28T10:30:00Z"
}
```

---

## Layer 3: ML Prediction

### Overview
Orchestrates ML model inference via Azure ML Managed Endpoints.

### Features & Capabilities

#### 3.1 Model Inference
**Features:**
- Call Azure ML Managed Endpoints for predictions
- Support multiple model types (risk scoring, forecasting, recommendations)
- Handle prediction batching
- Implement prediction caching (event-based invalidation)
- Circuit breaker for endpoint failures
- Retry logic with exponential backoff

**Requirements:**
- Inference latency: <2 seconds (p95)
- Batch inference: 100+ opportunities per request
- Cache predictions until opportunity changes
- Graceful degradation if ML unavailable

#### 3.2 Model Selection
**Features:**
- Select appropriate model based on scope (global vs industry-specific)
- A/B testing support (traffic splitting)
- Champion/challenger model deployment
- Model version management
- Fallback to rule-based if ML unavailable

**Requirements:**
- Automatic model selection based on opportunity industry
- A/B test traffic splitting (e.g., 90/10, 80/20)
- Model metadata sync from Azure ML Registry to Cosmos DB

#### 3.3 Prediction Types
**Features:**
- Risk scoring (0-1 score, category scores)
- Win probability prediction (0-1 probability, confidence)
- Revenue forecasting (point forecast + uncertainty intervals)
- Recommendation ranking (ranked list with scores)

**Requirements:**
- Calibrated probabilities (well-calibrated risk scores)
- Uncertainty quantification (P10, P50, P90 for forecasts)
- Confidence intervals for predictions

### Service Integration

#### ModelService
**Location:** `apps/api/src/services/ml/model.service.ts`

**Dependencies:**
- FeatureStoreService (get features)
- CachingService (prediction caching)
- Azure ML SDK (endpoint calls)

**Key Methods:**
```typescript
class ModelService {
  // Core prediction
  predict(modelType: ModelType, features: FeatureVector, options?: PredictionOptions): Promise<Prediction>
  predictBatch(modelType: ModelType, featuresArray: FeatureVector[], options?: PredictionOptions): Promise<Prediction[]>
  
  // Model selection
  selectModel(modelType: ModelType, tenantId: string, opportunityId: string): Promise<MLModel>
  getModelMetadata(modelId: string): Promise<MLModel>
  
  // Caching
  getCachedPrediction(modelId: string, opportunityId: string): Promise<Prediction | null>
  cachePrediction(modelId: string, opportunityId: string, prediction: Prediction): Promise<void>
  invalidatePredictionCache(opportunityId: string): Promise<void>
  
  // Health & monitoring
  checkEndpointHealth(endpointUrl: string): Promise<HealthStatus>
  trackPredictionLatency(modelId: string, latency: number): Promise<void>
}
```

#### MLService (Orchestrator)
**Location:** `apps/api/src/services/ml/ml.service.ts`

**Dependencies:**
- FeatureStoreService
- ModelService
- ExplainabilityService

**Key Methods:**
```typescript
class MLService {
  // High-level orchestration
  evaluateRisk(opportunityId: string, tenantId: string): Promise<RiskPrediction>
  forecastRevenue(opportunityIds: string[], tenantId: string): Promise<RevenueForecast>
  generateRecommendations(userId: string, context: RecommendationContext): Promise<Recommendation[]>
  
  // Complete ML pipeline
  runMLPipeline(opportunityId: string, modelType: ModelType, options?: MLOptions): Promise<MLResult>
}
```

### UI Components

#### RiskScoreBadge Component
```typescript
interface RiskScoreBadgeProps {
  riskScore: number;
  confidence: "low" | "medium" | "high";
  mlPowered: boolean;
}
```
**Location:** `apps/web/src/components/ml/RiskScoreBadge.tsx`  
**Features:**
- Display risk score with color coding (green: 0-0.3, yellow: 0.3-0.7, red: 0.7-1.0)
- Show "ML-Powered" badge if prediction from ML model
- Confidence indicator

#### ForecastChart Component
```typescript
interface ForecastChartProps {
  forecast: {
    p10: number;
    p50: number;
    p90: number;
  };
  historical: number[];
  target: number;
}
```
**Location:** `apps/web/src/components/ml/ForecastChart.tsx`  
**Features:**
- Line chart with forecast line and confidence bands
- Historical data overlay
- Target line
- Interactive tooltips

#### PredictionConfidence Component
```typescript
interface PredictionConfidenceProps {
  confidence: number;
  factors: { name: string; impact: number }[];
}
```
**Location:** `apps/web/src/components/ml/PredictionConfidence.tsx`  
**Features:**
- Confidence meter (0-100%)
- Top contributing factors
- Expandable details

### UI Pages

#### Opportunity Detail Page (Enhanced)
**Location:** `apps/web/src/app/(authenticated)/opportunities/[id]/page.tsx`

**New Sections:**
- ML Risk Score section (risk score, confidence, key factors)
- Win Probability section (ML prediction vs rule-based)
- Revenue Forecast section (if in forecast)
- ML Model Info (model version, last updated)

#### ML Insights Dashboard
**Location:** `apps/web/src/app/(authenticated)/ml-insights/page.tsx`

**Sections:**
- Model Performance (accuracy, precision, recall over time)
- Prediction Distribution (histogram of risk scores, win probabilities)
- Top Risk Factors (most common risk drivers)
- Forecast Accuracy (actual vs predicted)
- Model Health (endpoint status, latency, error rate)

### API Endpoints

#### POST /api/v1/ml/predict/risk
**Purpose:** Predict risk score for opportunity  
**Request:**
```json
{
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "options": {
    "useCache": true,
    "explainability": true
  }
}
```
**Response:**
```json
{
  "opportunityId": "opp_123",
  "riskScore": 0.72,
  "categoryScores": {
    "commercial": 0.65,
    "competitive": 0.58,
    "technical": 0.45,
    "legal": 0.30,
    "resource": 0.40,
    "timeline": 0.55
  },
  "confidence": "high",
  "modelVersion": "risk-scoring-v1.2",
  "predictedAt": "2025-01-28T10:30:00Z",
  "cached": false
}
```

#### POST /api/v1/ml/predict/win-probability
**Purpose:** Predict win probability  
**Request:**
```json
{
  "opportunityId": "opp_123",
  "tenantId": "tenant_001"
}
```
**Response:**
```json
{
  "opportunityId": "opp_123",
  "winProbability": 0.82,
  "confidence": "high",
  "calibrated": true,
  "modelVersion": "win-probability-v1.0",
  "predictedAt": "2025-01-28T10:30:00Z"
}
```

#### POST /api/v1/ml/predict/forecast
**Purpose:** Forecast revenue  
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
  "forecast": {
    "p10": 500000,
    "p50": 650000,
    "p90": 800000
  },
  "opportunities": [
    {
      "opportunityId": "opp_123",
      "expectedRevenue": 375000,
      "contribution": 0.58
    },
    {
      "opportunityId": "opp_456",
      "expectedRevenue": 275000,
      "contribution": 0.42
    }
  ],
  "modelVersion": "forecast-v1.0",
  "forecastedAt": "2025-01-28T10:30:00Z"
}
```

#### POST /api/v1/ml/predict/recommendations
**Purpose:** Generate personalized recommendations  
**Request:**
```json
{
  "userId": "user_123",
  "tenantId": "tenant_001",
  "context": {
    "opportunityId": "opp_123",
    "currentTask": "proposal"
  },
  "limit": 5
}
```
**Response:**
```json
{
  "recommendations": [
    {
      "itemId": "template_discovery",
      "rank": 1,
      "score": 0.85,
      "type": "template",
      "metadata": {
        "title": "Discovery Call Template",
        "description": "Template for enterprise discovery calls"
      }
    },
    {
      "itemId": "playbook_enterprise",
      "rank": 2,
      "score": 0.78,
      "type": "playbook",
      "metadata": {
        "title": "Enterprise Sales Playbook"
      }
    }
  ],
  "modelVersion": "recommendations-v1.0",
  "generatedAt": "2025-01-28T10:30:00Z"
}
```

#### GET /api/v1/ml/models
**Purpose:** List available ML models  
**Response:**
```json
{
  "models": [
    {
      "id": "model_risk_001",
      "name": "risk-scoring-global",
      "modelType": "risk_scoring",
      "version": "1.2",
      "scope": "global",
      "status": "active",
      "endpointUrl": "https://ml-endpoint.azureml.net/risk",
      "performance": {
        "accuracy": 0.87,
        "precision": 0.85,
        "recall": 0.89
      },
      "deployedAt": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### Database Schema

#### Models Container (Cosmos DB)
```typescript
interface MLModel {
  id: string;                          // model_{modelType}_{scope}_{version}
  partitionKey: string;                // modelType
  name: string;
  modelType: "risk_scoring" | "forecasting" | "recommendations" | "win_probability";
  version: string;                     // Semantic version: "1.2"
  
  // Scope
  scope: "global" | "industry";
  industryId?: string;
  
  // Azure ML references
  azureMLModelId: string;
  endpointUrl: string;
  endpointName: string;
  
  // Relationships
  parentModelId?: string;              // For fine-tuned models
  
  // Performance metrics
  performance: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    mse?: number;
    mae?: number;
    r2?: number;
    customMetrics?: Record<string, number>;
  };
  
  // Configuration
  config: {
    inputFeatures: string[];
    outputType: string;
    calibrated?: boolean;
    threshold?: number;
  };
  
  // Status
  status: "training" | "active" | "inactive" | "deprecated";
  deployedAt?: Date;
  deprecatedAt?: Date;
  
  // A/B testing
  abTest?: {
    enabled: boolean;
    trafficPercentage: number;
    challengerModelId?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

interface Prediction {
  id: string;                          // prediction_{opportunityId}_{modelId}_{timestamp}
  partitionKey: string;                // tenantId
  opportunityId: string;
  tenantId: string;
  modelId: string;
  modelVersion: string;
  
  // Prediction output
  prediction: {
    value: number | Record<string, number>;
    confidence?: string;
    metadata?: Record<string, any>;
  };
  
  // Input features (for explainability)
  features: FeatureVector;
  
  // Timing
  latency: number;                     // ms
  predictedAt: Date;
  expiresAt: Date;
  
  // Outcome (filled when available)
  actual?: number | string;
  actualAt?: Date;
  
  createdAt: Date;
}
```

### Message Queues (RabbitMQ)

#### ml.prediction.requested
**Purpose:** Request ML prediction  
**Publisher:** RiskEvaluationService, ForecastingService, RecommendationsService  
**Consumer:** MLService  
**Payload:**
```json
{
  "requestId": "req_123",
  "modelType": "risk_scoring",
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "priority": "high",
  "options": {
    "useCache": true,
    "explainability": true
  },
  "correlationId": "corr_abc"
}
```

#### ml.prediction.completed
**Purpose:** Prediction completed  
**Publisher:** MLService  
**Consumer:** RiskEvaluationService, ForecastingService  
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityId": "opp_123",
  "prediction": {
    "riskScore": 0.72,
    "categoryScores": { ... }
  },
  "modelVersion": "risk-scoring-v1.2",
  "latency": 450,
  "success": true,
  "correlationId": "corr_abc"
}
```

#### ml.prediction.failed
**Purpose:** Prediction failed  
**Publisher:** MLService  
**Consumer:** Monitoring, alerting  
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityId": "opp_123",
  "modelType": "risk_scoring",
  "error": "Endpoint timeout",
  "retryable": true,
  "correlationId": "corr_abc"
}
```

---

## Layer 4: Explanation

### Overview
Generates structured explanations for ML predictions using SHAP values and feature importance.

### Features & Capabilities

#### 4.1 SHAP Integration
**Features:**
- Calculate SHAP values for predictions
- Identify top positive factors (increase risk/win probability)
- Identify top negative factors (decrease risk/win probability)
- Global feature importance (across all predictions)
- Local feature importance (per prediction)

**Requirements:**
- SHAP calculation latency: <1 second
- Support tree-based models (TreeExplainer)
- Support linear models (LinearExplainer)
- Cache SHAP values for repeated requests

#### 4.2 Feature Importance
**Features:**
- Rank features by importance
- Group features by category (opportunity, risk, historical, relationship)
- Calculate contribution to prediction
- Generate factor descriptions

**Requirements:**
- Human-readable factor names
- Impact quantification (+X% or -X%)
- Context-aware descriptions

#### 4.3 Explainability Outputs
**Features:**
- Structured explanation (JSON)
- Factor list (positive/negative)
- Confidence indicators
- Prediction breakdown

**Requirements:**
- Consistent explanation format across model types
- Localization support (future)
- Customizable detail level

### Service Integration

#### ExplainabilityService
**Location:** `apps/api/src/services/ml/explainability.service.ts`

**Dependencies:**
- ModelService (get predictions)
- FeatureStoreService (get feature values)
- SHAP library

**Key Methods:**
```typescript
class ExplainabilityService {
  // SHAP-based explanation
  explainPrediction(modelId: string, opportunityId: string, prediction: Prediction): Promise<Explanation>
  explainPredictionBatch(modelId: string, predictions: Prediction[]): Promise<Explanation[]>
  
  // Feature importance
  getFeatureImportance(modelId: string, features: FeatureVector): Promise<FeatureImportance[]>
  getGlobalFeatureImportance(modelId: string): Promise<FeatureImportance[]>
  
  // Factor generation
  generateFactors(shapValues: SHAPValues, features: FeatureVector): Promise<Factor[]>
  describeFactors(factors: Factor[]): Promise<FactorDescription[]>
}
```

#### RiskExplainabilityService (Enhanced)
**Location:** `apps/api/src/services/risk-explainability.service.ts`

**Dependencies:**
- ExplainabilityService
- RiskCatalogService

**Key Methods:**
```typescript
class RiskExplainabilityService {
  // Risk-specific explanations
  explainRiskScore(opportunityId: string, riskScore: number, explanation: Explanation): Promise<RiskExplanation>
  generateRiskNarrative(riskExplanation: RiskExplanation): Promise<string>
}
```

### UI Components

#### ExplanationCard Component
```typescript
interface ExplanationCardProps {
  explanation: Explanation;
  detailLevel: "summary" | "detailed" | "expert";
}
```
**Location:** `apps/web/src/components/ml/ExplanationCard.tsx`  
**Features:**
- Show top positive/negative factors
- Interactive factor drill-down
- Visual importance bars
- Toggle detail level

#### SHAPWaterfallChart Component
```typescript
interface SHAPWaterfallChartProps {
  baseValue: number;
  factors: Factor[];
  prediction: number;
}
```
**Location:** `apps/web/src/components/ml/SHAPWaterfallChart.tsx`  
**Features:**
- Waterfall chart showing factor contributions
- Base value → factors → final prediction
- Interactive tooltips
- Export capability

#### FeatureImportanceBar Component
```typescript
interface FeatureImportanceBarProps {
  features: FeatureImportance[];
  maxFeatures: number;
}
```
**Location:** `apps/web/src/components/ml/FeatureImportanceBar.tsx`  
**Features:**
- Horizontal bar chart of feature importance
- Color-coded by category
- Sortable

### UI Pages

#### Prediction Detail Page
**Location:** `apps/web/src/app/(authenticated)/ml-insights/predictions/[id]/page.tsx`

**Sections:**
- Prediction Summary (value, confidence, model)
- Explanation (SHAP waterfall, factors)
- Feature Values (input features used)
- Model Info (version, performance)
- Actual Outcome (if available)

### API Endpoints

#### POST /api/v1/ml/explain/prediction
**Purpose:** Generate explanation for prediction  
**Request:**
```json
{
  "predictionId": "pred_123",
  "modelId": "model_risk_001",
  "opportunityId": "opp_123",
  "detailLevel": "detailed"
}
```
**Response:**
```json
{
  "predictionId": "pred_123",
  "explanation": {
    "baseValue": 0.50,
    "prediction": 0.72,
    "positiveFactors": [
      {
        "feature": "budgetConfirmed",
        "value": true,
        "impact": 0.15,
        "description": "Budget is confirmed, increasing confidence by 15%"
      },
      {
        "feature": "decisionMakerPresent",
        "value": true,
        "impact": 0.12,
        "description": "Decision maker is involved, adding 12% confidence"
      }
    ],
    "negativeFactors": [
      {
        "feature": "hasCompetitor",
        "value": true,
        "impact": -0.08,
        "description": "Competitor presence detected, reducing confidence by 8%"
      }
    ],
    "confidence": "high"
  },
  "generatedAt": "2025-01-28T10:30:00Z"
}
```

#### GET /api/v1/ml/explain/feature-importance/:modelId
**Purpose:** Get global feature importance for model  
**Response:**
```json
{
  "modelId": "model_risk_001",
  "featureImportance": [
    {
      "feature": "ownerWinRate",
      "importance": 0.25,
      "category": "historical",
      "description": "Owner's historical win rate"
    },
    {
      "feature": "dealValue",
      "importance": 0.18,
      "category": "opportunity",
      "description": "Deal size"
    },
    {
      "feature": "daysToClose",
      "importance": 0.15,
      "category": "temporal",
      "description": "Days until expected close"
    }
  ],
  "calculatedAt": "2025-01-28T10:30:00Z",
  "sampleSize": 10000
}
```

### Database Schema

#### Explanations Container (Cosmos DB)
```typescript
interface Explanation {
  id: string;                          // explanation_{predictionId}
  partitionKey: string;                // tenantId
  predictionId: string;
  opportunityId: string;
  tenantId: string;
  modelId: string;
  
  // Explanation data
  baseValue: number;
  prediction: number;
  positiveFactors: Factor[];
  negativeFactors: Factor[];
  
  // SHAP values
  shapValues: Record<string, number>;
  
  // Metadata
  confidence: "low" | "medium" | "high";
  detailLevel: string;
  
  generatedAt: Date;
  createdAt: Date;
}

interface Factor {
  feature: string;
  value: any;
  impact: number;                      // SHAP value
  importance: number;                  // Absolute SHAP value
  category: string;
  description: string;
}

interface FeatureImportance {
  modelId: string;
  feature: string;
  importance: number;
  category: string;
  description: string;
  sampleSize: number;
  calculatedAt: Date;
}
```

### Message Queues (RabbitMQ)

#### ml.explanation.requested
**Purpose:** Request explanation generation  
**Publisher:** UI, API  
**Consumer:** ExplainabilityService  
**Payload:**
```json
{
  "requestId": "req_123",
  "predictionId": "pred_123",
  "modelId": "model_risk_001",
  "detailLevel": "detailed",
  "correlationId": "corr_abc"
}
```

#### ml.explanation.completed
**Purpose:** Explanation generated  
**Publisher:** ExplainabilityService  
**Consumer:** UI, notification system  
**Payload:**
```json
{
  "requestId": "req_123",
  "predictionId": "pred_123",
  "explanation": { ... },
  "success": true,
  "correlationId": "corr_abc"
}
```

---

## Layer 5: LLM Reasoning

### Overview
Transforms structured ML outputs and explanations into natural language insights and recommendations.

### Features & Capabilities

#### 5.1 Natural Language Generation
**Features:**
- Generate human-readable explanations from SHAP values
- Create narrative summaries of predictions
- Explain "why" in business terms
- Translate technical factors to user-friendly language

**Requirements:**
- Response time: <3 seconds
- Context-aware language (industry-specific terms)
- Consistent tone and style
- Support for multiple LLM providers (Azure OpenAI, Anthropic)

#### 5.2 Recommendation Generation
**Features:**
- Suggest next best actions based on predictions
- Prioritize recommendations by impact
- Generate playbook suggestions
- Create email/message drafts

**Requirements:**
- Actionable recommendations (specific, measurable)
- Context-aware (current stage, industry, role)
- Risk-aware (highlight risks in recommendations)

#### 5.3 Scenario Analysis
**Features:**
- Generate best/base/worst case scenarios
- Explain assumptions for each scenario
- Quantify scenario impact
- Provide mitigation strategies

**Requirements:**
- Realistic scenarios based on data
- Clear assumption documentation
- Probability estimates for scenarios

### Service Integration

#### ChainOfThoughtService (Enhanced)
**Location:** `apps/api/src/services/chain-of-thought.service.ts`

**Dependencies:**
- LLM providers (Azure OpenAI, Anthropic)
- ExplainabilityService
- RiskCatalogService

**Key Methods:**
```typescript
class ChainOfThoughtService {
  // Core reasoning
  reason(query: string, context: ReasoningContext): Promise<ReasoningResult>
  reasonMultiStep(query: string, steps: ReasoningStep[]): Promise<ReasoningResult>
  
  // ML-specific reasoning
  explainPrediction(prediction: Prediction, explanation: Explanation, context: OpportunityContext): Promise<NaturalLanguageExplanation>
  generateRecommendations(prediction: Prediction, explanation: Explanation, context: OpportunityContext): Promise<Recommendation[]>
  analyzeScenarios(prediction: Prediction, context: OpportunityContext): Promise<ScenarioAnalysis>
  
  // Narrative generation
  generateSummary(data: any, template: string): Promise<string>
  generatePlaybook(opportunity: Opportunity, recommendations: Recommendation[]): Promise<Playbook>
}
```

#### IntentAnalyzerService (Enhanced)
**Location:** `apps/api/src/services/intent-analyzer.service.ts`

**Dependencies:**
- LLM providers
- ContextService

**Key Methods:**
```typescript
class IntentAnalyzerService {
  // Intent classification
  analyzeIntent(query: string): Promise<Intent>
  extractEntities(query: string): Promise<Entity[]>
  
  // ML-related intents
  classifyMLQuery(query: string): Promise<MLQueryType>
  extractMLContext(query: string): Promise<MLContext>
}
```

### UI Components

#### NaturalLanguageExplanation Component
```typescript
interface NaturalLanguageExplanationProps {
  text: string;
  highlightFactors: boolean;
}
```
**Location:** `apps/web/src/components/ml/NaturalLanguageExplanation.tsx`  
**Features:**
- Display LLM-generated explanation
- Highlight key factors (clickable to drill down)
- Expandable sections
- Copy to clipboard

#### RecommendationList Component
```typescript
interface RecommendationListProps {
  recommendations: Recommendation[];
  onActionClick: (action: string) => void;
}
```
**Location:** `apps/web/src/components/ml/RecommendationList.tsx`  
**Features:**
- List of recommended actions
- Priority indicators
- One-click action execution
- Track completion status

#### ScenarioCard Component
```typescript
interface ScenarioCardProps {
  scenario: Scenario;
  type: "best" | "base" | "worst";
}
```
**Location:** `apps/web/src/components/ml/ScenarioCard.tsx`  
**Features:**
- Scenario summary
- Assumptions list
- Impact metrics
- Probability indicator

### UI Pages

#### Opportunity Insights Page
**Location:** `apps/web/src/app/(authenticated)/opportunities/[id]/insights/page.tsx`

**Sections:**
- AI Summary (LLM-generated narrative)
- Key Insights (top 3-5 insights)
- Recommendations (prioritized actions)
- Scenario Analysis (best/base/worst)
- Risk Factors (LLM-explained risks)

### API Endpoints

#### POST /api/v1/llm/explain
**Purpose:** Generate natural language explanation  
**Request:**
```json
{
  "predictionId": "pred_123",
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "context": {
    "industry": "technology",
    "stage": "proposal",
    "role": "sales_rep"
  }
}
```
**Response:**
```json
{
  "explanation": "This opportunity has a 72% risk score, which is above average for your pipeline. The main drivers are:\n\n1. **Budget Confirmed** (+15%): The buyer has confirmed budget availability, which historically increases win probability by 21%. This is a strong positive signal.\n\n2. **Decision Maker Involved** (+12%): The decision maker is actively participating in discussions, which typically leads to faster deal cycles.\n\n3. **Competitor Present** (-8%): We've detected competitor activity. Based on similar deals, competitor presence reduces win probability by an average of 8%.\n\nOverall, this is a strong opportunity with high close potential, but monitor competitor activity closely.",
  "highlights": [
    {
      "text": "Budget Confirmed",
      "type": "positive_factor",
      "impact": 0.15
    },
    {
      "text": "Competitor Present",
      "type": "negative_factor",
      "impact": -0.08
    }
  ],
  "generatedAt": "2025-01-28T10:30:00Z"
}
```

#### POST /api/v1/llm/recommendations
**Purpose:** Generate action recommendations  
**Request:**
```json
{
  "opportunityId": "opp_123",
  "predictionId": "pred_123",
  "context": {
    "currentStage": "proposal",
    "daysToClose": 15
  }
}
```
**Response:**
```json
{
  "recommendations": [
    {
      "action": "Send proposal within 48 hours",
      "priority": "high",
      "rationale": "Budget is confirmed and decision maker is engaged. Strike while the opportunity is hot.",
      "estimatedImpact": "+15% win probability",
      "dueDate": "2025-01-30T00:00:00Z"
    },
    {
      "action": "Schedule executive alignment call",
      "priority": "high",
      "rationale": "Decision maker involvement is high. An executive alignment call will accelerate the deal.",
      "estimatedImpact": "+10% win probability"
    },
    {
      "action": "Monitor competitor activity",
      "priority": "medium",
      "rationale": "Competitor presence detected. Track their moves and be ready to differentiate.",
      "estimatedImpact": "-5% risk"
    }
  ],
  "generatedAt": "2025-01-28T10:30:00Z"
}
```

#### POST /api/v1/llm/scenarios
**Purpose:** Generate scenario analysis  
**Request:**
```json
{
  "opportunityId": "opp_123",
  "forecastPeriod": "Q1_2025"
}
```
**Response:**
```json
{
  "scenarios": [
    {
      "type": "best",
      "probability": 0.20,
      "revenue": 800000,
      "description": "All opportunities close on time with full value. Competitor threats mitigated.",
      "assumptions": [
        "All decision makers approve by month-end",
        "No unexpected budget cuts",
        "Successful executive alignment"
      ]
    },
    {
      "type": "base",
      "probability": 0.60,
      "revenue": 650000,
      "description": "Most opportunities close as expected. Some deals slip to next quarter.",
      "assumptions": [
        "Average close rate of 75%",
        "10% of deals delayed by 30 days",
        "Budget cuts affect 1-2 small deals"
      ]
    },
    {
      "type": "worst",
      "probability": 0.20,
      "revenue": 500000,
      "description": "Significant delays and losses due to competitor pressure and budget constraints.",
      "assumptions": [
        "Lose 2-3 deals to competitors",
        "20% of pipeline slips to Q2",
        "Budget cuts impact 3-4 deals"
      ]
    }
  ],
  "generatedAt": "2025-01-28T10:30:00Z"
}
```

### Database Schema

#### LLMOutputs Container (Cosmos DB)
```typescript
interface LLMOutput {
  id: string;                          // llm_output_{type}_{opportunityId}_{timestamp}
  partitionKey: string;                // tenantId
  outputType: "explanation" | "recommendations" | "scenarios" | "summary";
  opportunityId: string;
  tenantId: string;
  
  // Input context
  inputContext: {
    predictionId?: string;
    mlPrediction?: Prediction;
    explanation?: Explanation;
    opportunityContext?: OpportunityContext;
  };
  
  // LLM output
  output: {
    text?: string;
    recommendations?: Recommendation[];
    scenarios?: Scenario[];
    highlights?: Highlight[];
  };
  
  // Metadata
  llmProvider: "azure_openai" | "anthropic" | "openai";
  model: string;
  promptTemplate: string;
  latency: number;
  tokenCount: number;
  
  generatedAt: Date;
  createdAt: Date;
}

interface Recommendation {
  action: string;
  priority: "low" | "medium" | "high" | "critical";
  rationale: string;
  estimatedImpact?: string;
  dueDate?: Date;
  completedAt?: Date;
}

interface Scenario {
  type: "best" | "base" | "worst";
  probability: number;
  revenue?: number;
  description: string;
  assumptions: string[];
}
```

### Message Queues (RabbitMQ)

#### llm.reasoning.requested
**Purpose:** Request LLM reasoning  
**Publisher:** UI, API, decision engine  
**Consumer:** ChainOfThoughtService  
**Payload:**
```json
{
  "requestId": "req_123",
  "reasoningType": "explain_prediction",
  "predictionId": "pred_123",
  "opportunityId": "opp_123",
  "context": { ... },
  "correlationId": "corr_abc"
}
```

#### llm.reasoning.completed
**Purpose:** LLM reasoning completed  
**Publisher:** ChainOfThoughtService  
**Consumer:** Decision engine, UI  
**Payload:**
```json
{
  "requestId": "req_123",
  "output": {
    "explanation": "...",
    "recommendations": [ ... ]
  },
  "latency": 2500,
  "success": true,
  "correlationId": "corr_abc"
}
```

---

## Layer 6: Decision Engine

### Overview
Combines ML predictions, explanations, LLM insights, and business rules to make actionable decisions.

### Features & Capabilities

#### 6.1 Decision Rules
**Features:**
- Define rule-based decision logic
- Combine ML predictions with business rules
- Priority-based rule execution
- Conflict resolution between rules and ML
- Dynamic rule configuration

**Requirements:**
- Rule evaluation latency: <100ms
- Support complex boolean logic (AND, OR, NOT)
- Versioned rules (track changes)
- A/B testing for rules

#### 6.2 Action Execution
**Features:**
- CRM updates (mark as hot, change stage)
- Notification sending (email, Slack, in-app)
- Task creation
- Email draft generation
- Calendar event creation
- Playbook assignment

**Requirements:**
- Idempotent actions (safe to retry)
- Action rollback capability
- Audit trail for all actions
- Async execution for non-blocking actions

#### 6.3 Decision Orchestration
**Features:**
- Orchestrate multiple decision types
- Sequential decision pipeline
- Parallel decision execution
- Decision dependencies (wait for X before Y)
- Decision caching

**Requirements:**
- Support complex workflows
- Handle failures gracefully
- Retry failed actions with exponential backoff

### Service Integration

#### RiskEvaluationService (Decision Engine)
**Location:** `apps/api/src/services/risk-evaluation.service.ts`

**Dependencies:**
- MLService (get ML predictions)
- ExplainabilityService (get explanations)
- ChainOfThoughtService (get LLM insights)
- NotificationService (send notifications)
- TaskService (create tasks)
- ShardRepositoryService (update CRM)

**Key Methods:**
```typescript
class RiskEvaluationService {
  // Orchestration
  evaluateOpportunity(opportunityId: string, tenantId: string, options?: EvaluationOptions): Promise<RiskEvaluation>
  
  // Decision-making
  makeDecisions(riskScore: number, explanation: Explanation, llmInsights: LLMOutput, opportunity: Opportunity): Promise<Decision[]>
  applyRules(riskScore: number, opportunity: Opportunity): Promise<RuleResult[]>
  resolveConflicts(mlDecisions: Decision[], ruleDecisions: Decision[]): Promise<Decision[]>
  
  // Action execution
  executeActions(decisions: Decision[], opportunityId: string, tenantId: string): Promise<ActionResult[]>
  executeAction(action: Action, opportunityId: string, tenantId: string): Promise<ActionResult>
  rollbackAction(actionId: string): Promise<void>
}
```

#### DecisionEngineService
**Location:** `apps/api/src/services/ml/decision-engine.service.ts`

**Dependencies:**
- RuleEngine
- MLService
- ChainOfThoughtService

**Key Methods:**
```typescript
class DecisionEngineService {
  // Core decision-making
  makeDecision(context: DecisionContext, rules: Rule[], mlPredictions: Prediction[]): Promise<DecisionResult>
  evaluateRules(context: DecisionContext, rules: Rule[]): Promise<RuleResult[]>
  combinePredictions(mlPredictions: Prediction[], rules: RuleResult[]): Promise<CombinedResult>
  
  // Conflict resolution
  resolveConflicts(results: (Prediction | RuleResult)[]): Promise<ResolvedResult>
  
  // Rule management
  getRules(tenantId: string, context: string): Promise<Rule[]>
  updateRule(ruleId: string, rule: Rule): Promise<void>
  testRule(rule: Rule, testData: any[]): Promise<RuleTestResult>
}
```

### UI Components

#### DecisionCard Component
```typescript
interface DecisionCardProps {
  decision: Decision;
  actions: Action[];
  onExecuteAction: (action: Action) => void;
}
```
**Location:** `apps/web/src/components/ml/DecisionCard.tsx`  
**Features:**
- Decision summary
- Recommended actions list
- Action execution buttons
- Decision rationale (why this decision)

#### ActionTimeline Component
```typescript
interface ActionTimelineProps {
  actions: ActionResult[];
  opportunityId: string;
}
```
**Location:** `apps/web/src/components/ml/ActionTimeline.tsx`  
**Features:**
- Timeline of actions taken
- Action status (pending, completed, failed)
- Rollback button for reversible actions
- Audit trail

#### RuleBuilder Component
```typescript
interface RuleBuilderProps {
  rule?: Rule;
  onSave: (rule: Rule) => void;
}
```
**Location:** `apps/web/src/components/ml/RuleBuilder.tsx`  
**Features:**
- Visual rule builder (drag-and-drop)
- Condition editor (field, operator, value)
- Action selector
- Rule testing (test on historical data)

### UI Pages

#### Decision Management Page
**Location:** `apps/web/src/app/(authenticated)/ml-insights/decisions/page.tsx`

**Sections:**
- Active Rules (list of rules, enable/disable)
- Decision History (recent decisions made)
- Action Queue (pending actions)
- Performance Metrics (action success rate, decision accuracy)

#### Rule Editor Page
**Location:** `apps/web/src/app/(authenticated)/ml-insights/rules/[id]/page.tsx`

**Sections:**
- Rule Configuration (name, description, priority)
- Conditions (rule logic)
- Actions (what to execute)
- Testing (test rule on sample data)
- History (rule changes over time)

### API Endpoints

#### POST /api/v1/decisions/evaluate
**Purpose:** Evaluate and make decision  
**Request:**
```json
{
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "context": {
    "triggeredBy": "risk_evaluation",
    "urgency": "high"
  }
}
```
**Response:**
```json
{
  "opportunityId": "opp_123",
  "decisions": [
    {
      "type": "mark_as_hot",
      "priority": "high",
      "rationale": "Risk score > 0.7 threshold",
      "source": "rule",
      "actions": [
        {
          "type": "crm_update",
          "details": {
            "field": "rating",
            "value": "hot"
          }
        }
      ]
    },
    {
      "type": "escalate",
      "priority": "high",
      "rationale": "High-value deal with competitor risk",
      "source": "ml",
      "actions": [
        {
          "type": "notification",
          "details": {
            "recipients": ["sales_manager"],
            "message": "High-risk opportunity requires attention"
          }
        },
        {
          "type": "task_creation",
          "details": {
            "title": "Review competitor strategy",
            "priority": "high",
            "dueDate": "2025-01-30T00:00:00Z"
          }
        }
      ]
    }
  ],
  "evaluatedAt": "2025-01-28T10:30:00Z"
}
```

#### POST /api/v1/decisions/execute
**Purpose:** Execute decision actions  
**Request:**
```json
{
  "opportunityId": "opp_123",
  "decisions": [
    {
      "type": "mark_as_hot",
      "actions": [ ... ]
    }
  ]
}
```
**Response:**
```json
{
  "opportunityId": "opp_123",
  "results": [
    {
      "decisionType": "mark_as_hot",
      "actionResults": [
        {
          "action": "crm_update",
          "status": "completed",
          "executedAt": "2025-01-28T10:30:00Z"
        }
      ]
    }
  ],
  "success": true
}
```

#### GET /api/v1/decisions/rules
**Purpose:** Get decision rules  
**Response:**
```json
{
  "rules": [
    {
      "id": "rule_001",
      "name": "High Risk Escalation",
      "enabled": true,
      "priority": 1,
      "conditions": [
        {
          "field": "riskScore",
          "operator": ">",
          "value": 0.7
        },
        {
          "field": "dealValue",
          "operator": ">",
          "value": 100000
        }
      ],
      "actions": [
        {
          "type": "notify",
          "recipients": ["sales_manager", "risk_manager"]
        },
        {
          "type": "mark_as_hot"
        }
      ],
      "createdAt": "2025-01-15T00:00:00Z",
      "updatedAt": "2025-01-20T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/decisions/rules
**Purpose:** Create or update rule  
**Request:**
```json
{
  "name": "Competitor Alert",
  "enabled": true,
  "priority": 2,
  "conditions": [
    {
      "field": "hasCompetitor",
      "operator": "==",
      "value": true
    },
    {
      "field": "stage",
      "operator": "in",
      "value": ["proposal", "negotiation"]
    }
  ],
  "actions": [
    {
      "type": "task_creation",
      "details": {
        "title": "Monitor competitor activity",
        "priority": "medium"
      }
    }
  ]
}
```
**Response:**
```json
{
  "ruleId": "rule_002",
  "success": true,
  "createdAt": "2025-01-28T10:30:00Z"
}
```

### Database Schema

#### Decisions Container (Cosmos DB)
```typescript
interface Decision {
  id: string;                          // decision_{opportunityId}_{timestamp}
  partitionKey: string;                // tenantId
  opportunityId: string;
  tenantId: string;
  
  // Decision details
  decisionType: string;
  priority: "low" | "medium" | "high" | "critical";
  rationale: string;
  source: "rule" | "ml" | "llm" | "combined";
  
  // Supporting data
  mlPrediction?: Prediction;
  explanation?: Explanation;
  llmInsights?: LLMOutput;
  ruleResults?: RuleResult[];
  
  // Actions
  actions: Action[];
  actionResults?: ActionResult[];
  
  // Status
  status: "pending" | "executed" | "failed" | "rolled_back";
  executedAt?: Date;
  
  createdAt: Date;
}

interface Action {
  type: "crm_update" | "notification" | "task_creation" | "email_draft" | "calendar_event";
  details: Record<string, any>;
  priority: "low" | "medium" | "high";
  idempotencyKey: string;
}

interface ActionResult {
  actionType: string;
  status: "pending" | "completed" | "failed";
  executedAt?: Date;
  error?: string;
  rollbackable: boolean;
  rolledBackAt?: Date;
}

interface Rule {
  id: string;                          // rule_{tenantId}_{name}
  partitionKey: string;                // tenantId
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  
  // Rule logic
  conditions: RuleCondition[];
  conditionLogic: "AND" | "OR";
  
  // Actions
  actions: Action[];
  
  // Versioning
  version: number;
  previousVersionId?: string;
  
  // Testing
  testResults?: RuleTestResult[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface RuleCondition {
  field: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in" | "contains";
  value: any;
}

interface RuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  conditions: {
    field: string;
    value: any;
    expectedValue: any;
    matched: boolean;
  }[];
}
```

### Message Queues (RabbitMQ)

#### decision.evaluation.requested
**Purpose:** Request decision evaluation  
**Publisher:** Risk evaluation, forecast, recommendation services  
**Consumer:** DecisionEngineService  
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "context": {
    "triggeredBy": "risk_evaluation",
    "mlPrediction": { ... },
    "explanation": { ... }
  },
  "correlationId": "corr_abc"
}
```

#### decision.evaluation.completed
**Purpose:** Decision evaluation completed  
**Publisher:** DecisionEngineService  
**Consumer:** Action execution services  
**Payload:**
```json
{
  "requestId": "req_123",
  "opportunityId": "opp_123",
  "decisions": [ ... ],
  "success": true,
  "correlationId": "corr_abc"
}
```

#### action.execution.requested
**Purpose:** Request action execution  
**Publisher:** DecisionEngineService  
**Consumer:** Action executors (CRM, notification, task services)  
**Payload:**
```json
{
  "actionId": "action_123",
  "opportunityId": "opp_123",
  "action": {
    "type": "notification",
    "details": { ... }
  },
  "idempotencyKey": "idem_abc",
  "correlationId": "corr_abc"
}
```

#### action.execution.completed
**Purpose:** Action executed  
**Publisher:** Action executors  
**Consumer:** DecisionEngineService, audit service  
**Payload:**
```json
{
  "actionId": "action_123",
  "opportunityId": "opp_123",
  "status": "completed",
  "executedAt": "2025-01-28T10:30:00Z",
  "correlationId": "corr_abc"
}
```

---

## Layer 7: Feedback Loop

### Overview
Collects user feedback and actual outcomes to improve the system.

### Features & Capabilities

#### 7.1 Feedback Collection
**Features:**
- User rating of predictions (1-5 stars)
- Acknowledge/dismiss decisions
- Correct predictions
- Comment on predictions
- Track action taken (user followed recommendation or not)

**Requirements:**
- Lightweight feedback UI (non-intrusive)
- Optional feedback (don't force users)
- Anonymous feedback option
- Feedback linked to specific predictions

#### 7.2 Outcome Tracking
**Features:**
- Track opportunity outcomes (won/lost)
- Track actual revenue (vs predicted)
- Track actual close date (vs predicted)
- Track action effectiveness (did action help?)

**Requirements:**
- Automatic outcome tracking (from CRM updates)
- Manual outcome entry (if CRM not synced)
- Outcome validation (prevent incorrect data)

#### 7.3 Feedback Analysis
**Features:**
- Aggregate feedback by model, feature, industry
- Identify prediction errors
- Calculate user satisfaction
- Generate feedback reports

**Requirements:**
- Real-time feedback aggregation
- Feedback trend analysis
- Alert on negative feedback spike

### Service Integration

#### FeedbackLearningService (Enhanced)
**Location:** `apps/api/src/services/feedback-learning.service.ts`

**Dependencies:**
- ShardRepositoryService (store feedback)
- EvaluationService (link feedback to predictions)
- MonitoringService (track feedback metrics)

**Key Methods:**
```typescript
class FeedbackLearningService {
  // Feedback collection
  recordFeedback(feedback: UserFeedback): Promise<void>
  recordOutcome(opportunityId: string, outcome: Outcome): Promise<void>
  linkFeedbackToPrediction(predictionId: string, feedbackId: string): Promise<void>
  
  // Feedback analysis
  aggregateFeedback(modelId: string, timeRange: DateRange): Promise<FeedbackAggregation>
  calculateUserSatisfaction(modelId: string): Promise<number>
  identifyPredictionErrors(modelId: string): Promise<PredictionError[]>
  
  // Reporting
  generateFeedbackReport(modelId: string, timeRange: DateRange): Promise<FeedbackReport>
  trackFeedbackTrends(modelId: string): Promise<FeedbackTrend[]>
}
```

### UI Components

#### FeedbackWidget Component
```typescript
interface FeedbackWidgetProps {
  predictionId: string;
  predictionType: "risk" | "forecast" | "recommendation";
  compact?: boolean;
}
```
**Location:** `apps/web/src/components/ml/FeedbackWidget.tsx`  
**Features:**
- Star rating (1-5)
- Thumbs up/down
- Quick feedback buttons (accurate, inaccurate, helpful, not helpful)
- Optional comment field
- Submit feedback

#### OutcomeTracker Component
```typescript
interface OutcomeTrackerProps {
  opportunityId: string;
  prediction: Prediction;
  onOutcomeRecorded: (outcome: Outcome) => void;
}
```
**Location:** `apps/web/src/components/ml/OutcomeTracker.tsx`  
**Features:**
- Outcome selector (won/lost)
- Actual revenue input
- Actual close date picker
- Compare actual vs predicted
- Save outcome

#### FeedbackDashboard Component
```typescript
interface FeedbackDashboardProps {
  modelId: string;
  timeRange: DateRange;
}
```
**Location:** `apps/web/src/components/ml/FeedbackDashboard.tsx`  
**Features:**
- Feedback statistics (avg rating, response rate)
- Feedback distribution chart
- Recent feedback list
- Prediction accuracy chart (predicted vs actual)

### UI Pages

#### Feedback Management Page
**Location:** `apps/web/src/app/(authenticated)/ml-insights/feedback/page.tsx`

**Sections:**
- Feedback Overview (stats, trends)
- Recent Feedback (list, filterable)
- Prediction Accuracy (comparison charts)
- User Satisfaction (NPS-style metric)

### API Endpoints

#### POST /api/v1/feedback
**Purpose:** Submit user feedback  
**Request:**
```json
{
  "predictionId": "pred_123",
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "userId": "user_123",
  "feedback": {
    "rating": 4,
    "accurate": true,
    "helpful": true,
    "comment": "Good prediction, helped prioritize"
  }
}
```
**Response:**
```json
{
  "feedbackId": "feedback_123",
  "success": true,
  "recordedAt": "2025-01-28T10:30:00Z"
}
```

#### POST /api/v1/outcomes
**Purpose:** Record actual outcome  
**Request:**
```json
{
  "opportunityId": "opp_123",
  "tenantId": "tenant_001",
  "outcome": {
    "status": "won",
    "actualRevenue": 500000,
    "actualCloseDate": "2025-03-12T00:00:00Z"
  }
}
```
**Response:**
```json
{
  "outcomeId": "outcome_123",
  "success": true,
  "linkedPredictions": ["pred_123", "pred_456"],
  "recordedAt": "2025-01-28T10:30:00Z"
}
```

#### GET /api/v1/feedback/summary/:modelId
**Purpose:** Get feedback summary for model  
**Response:**
```json
{
  "modelId": "model_risk_001",
  "timeRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-28T23:59:59Z"
  },
  "summary": {
    "totalFeedback": 1250,
    "averageRating": 4.2,
    "accuracyRate": 0.87,
    "helpfulRate": 0.92,
    "userSatisfaction": 8.5
  },
  "trends": [
    {
      "date": "2025-01-28",
      "feedbackCount": 45,
      "averageRating": 4.3,
      "accuracyRate": 0.89
    }
  ]
}
```

### Database Schema

#### Feedback Container (Cosmos DB)
```typescript
interface UserFeedback {
  id: string;                          // feedback_{predictionId}_{userId}_{timestamp}
  partitionKey: string;                // tenantId
  predictionId: string;
  opportunityId: string;
  tenantId: string;
  userId: string;
  
  // Feedback data
  rating?: number;                     // 1-5
  accurate?: boolean;
  helpful?: boolean;
  actionTaken?: boolean;
  comment?: string;
  
  // Metadata
  predictionType: "risk" | "forecast" | "recommendation";
  modelVersion: string;
  
  recordedAt: Date;
  createdAt: Date;
}

interface Outcome {
  id: string;                          // outcome_{opportunityId}
  partitionKey: string;                // tenantId
  opportunityId: string;
  tenantId: string;
  
  // Outcome data
  status: "won" | "lost";
  actualRevenue?: number;
  actualCloseDate?: Date;
  
  // Prediction comparison
  predictions: {
    predictionId: string;
    predictedValue: any;
    actualValue: any;
    error: number;
  }[];
  
  recordedAt: Date;
  createdAt: Date;
}

interface FeedbackAggregation {
  modelId: string;
  timeRange: DateRange;
  totalFeedback: number;
  averageRating: number;
  accuracyRate: number;
  helpfulRate: number;
  userSatisfaction: number;
  breakdown: {
    byIndustry: Record<string, FeedbackStats>;
    byStage: Record<string, FeedbackStats>;
    byUser: Record<string, FeedbackStats>;
  };
  calculatedAt: Date;
}
```

### Message Queues (RabbitMQ)

#### feedback.recorded
**Purpose:** Feedback recorded  
**Publisher:** FeedbackLearningService  
**Consumer:** EvaluationService, analytics  
**Payload:**
```json
{
  "feedbackId": "feedback_123",
  "predictionId": "pred_123",
  "opportunityId": "opp_123",
  "rating": 4,
  "accurate": true,
  "recordedAt": "2025-01-28T10:30:00Z",
  "correlationId": "corr_abc"
}
```

#### outcome.recorded
**Purpose:** Outcome recorded  
**Publisher:** FeedbackLearningService, CRM sync  
**Consumer:** EvaluationService, training pipeline  
**Payload:**
```json
{
  "outcomeId": "outcome_123",
  "opportunityId": "opp_123",
  "status": "won",
  "actualRevenue": 500000,
  "linkedPredictions": ["pred_123"],
  "recordedAt": "2025-01-28T10:30:00Z",
  "correlationId": "corr_abc"
}
```

---

## Layer 8: Learning Loop

### Overview
Continuously improves the system by retraining models, updating features, and adjusting rules.

### Features & Capabilities

#### 8.1 Model Retraining
**Features:**
- Scheduled retraining (monthly, quarterly)
- Trigger-based retraining (performance degradation, drift detection)
- Incremental training (online learning)
- A/B testing new models
- Champion/challenger model deployment

**Requirements:**
- Automated retraining pipeline
- Data validation before retraining
- Model evaluation before deployment
- Rollback capability

#### 8.2 Drift Detection
**Features:**
- Feature distribution drift
- Prediction distribution drift
- Outcome drift (concept drift)
- Alert on significant drift

**Requirements:**
- Daily drift monitoring
- Alert when drift exceeds threshold
- Drift visualization

#### 8.3 Continuous Improvement
**Features:**
- Analyze feedback patterns
- Identify model weaknesses
- Suggest feature improvements
- Update decision rules based on outcomes
- Optimize hyperparameters

**Requirements:**
- Weekly improvement analysis
- Actionable improvement suggestions
- Track improvement impact

### Service Integration

#### TrainingService
**Location:** `apps/api/src/services/ml/training.service.ts`

**Dependencies:**
- Azure ML SDK
- FeatureStoreService
- ModelService
- EvaluationService

**Key Methods:**
```typescript
class TrainingService {
  // Training orchestration
  trainModel(modelType: ModelType, options: TrainingOptions): Promise<TrainingJob>
  scheduleRetraining(modelId: string, schedule: CronExpression): Promise<void>
  triggerRetraining(modelId: string, reason: string): Promise<TrainingJob>
  
  // Data preparation
  prepareTrainingData(modelType: ModelType, startDate: Date, endDate: Date): Promise<TrainingDataset>
  validateTrainingData(dataset: TrainingDataset): Promise<ValidationResult>
  exportToAzureML(dataset: TrainingDataset): Promise<string>
  
  // Model deployment
  deployModel(modelId: string, environment: "staging" | "production"): Promise<void>
  rollbackModel(modelId: string): Promise<void>
  
  // Job monitoring
  monitorTrainingJob(jobId: string): Promise<TrainingJobStatus>
  cancelTrainingJob(jobId: string): Promise<void>
}
```

#### EvaluationService (Enhanced)
**Location:** `apps/api/src/services/ml/evaluation.service.ts`

**Dependencies:**
- ModelService
- FeedbackLearningService
- MonitoringService

**Key Methods:**
```typescript
class EvaluationService {
  // Model evaluation
  evaluateModel(modelId: string, testData: Prediction[], actuals: Outcome[]): Promise<EvaluationMetrics>
  compareModels(modelId1: string, modelId2: string): Promise<ModelComparison>
  
  // Drift detection
  detectFeatureDistributionDrift(modelId: string): Promise<DriftResult>
  detectPredictionDistributionDrift(modelId: string): Promise<DriftResult>
  detectOutcomeDrift(modelId: string): Promise<DriftResult>
  
  // Performance monitoring
  trackModelPerformance(modelId: string): Promise<PerformanceMetrics>
  shouldRetrain(modelId: string): Promise<RetrainingRecommendation>
  
  // Reporting
  generateEvaluationReport(modelId: string): Promise<EvaluationReport>
}
```

#### ContinuousLearningService
**Location:** `apps/api/src/services/ml/continuous-learning.service.ts`

**Dependencies:**
- EvaluationService
- FeedbackLearningService
- TrainingService

**Key Methods:**
```typescript
class ContinuousLearningService {
  // Continuous improvement
  analyzeSystemPerformance(): Promise<PerformanceAnalysis>
  identifyImprovementOpportunities(): Promise<ImprovementOpportunity[]>
  suggestFeatureImprovements(): Promise<FeatureSuggestion[]>
  suggestRuleUpdates(): Promise<RuleSuggestion[]>
  
  // Learning loop orchestration
  runLearningLoop(): Promise<LearningLoopResult>
  scheduleImprovements(): Promise<void>
}
```

### UI Components

#### TrainingJobCard Component
```typescript
interface TrainingJobCardProps {
  job: TrainingJob;
  onCancel: (jobId: string) => void;
}
```
**Location:** `apps/web/src/components/ml/TrainingJobCard.tsx`  
**Features:**
- Job status (running, completed, failed)
- Progress indicator
- Duration
- Metrics preview (if completed)
- Cancel button

#### DriftMonitor Component
```typescript
interface DriftMonitorProps {
  modelId: string;
  driftType: "feature" | "prediction" | "outcome";
}
```
**Location:** `apps/web/src/components/ml/DriftMonitor.tsx`  
**Features:**
- Drift score (0-1)
- Drift trend chart
- Alert threshold indicator
- Drilldown to feature-level drift

#### ImprovementSuggestions Component
```typescript
interface ImprovementSuggestionsProps {
  suggestions: ImprovementOpportunity[];
  onAccept: (suggestion: ImprovementOpportunity) => void;
}
```
**Location:** `apps/web/src/components/ml/ImprovementSuggestions.tsx`  
**Features:**
- List of suggestions (prioritized)
- Estimated impact
- Accept/reject buttons
- Implementation status

### UI Pages

#### Training Dashboard Page
**Location:** `apps/web/src/app/(authenticated)/ml-insights/training/page.tsx`

**Sections:**
- Active Training Jobs
- Training History
- Model Performance Comparison
- Retraining Schedule

#### Drift Monitoring Page
**Location:** `apps/web/src/app/(authenticated)/ml-insights/drift/page.tsx`

**Sections:**
- Drift Overview (all models)
- Feature Drift Analysis
- Prediction Drift Analysis
- Outcome Drift Analysis
- Drift Alerts

#### Continuous Learning Page
**Location:** `apps/web/src/app/(authenticated)/ml-insights/learning/page.tsx`

**Sections:**
- System Performance (overall metrics)
- Improvement Opportunities (suggestions)
- Feature Suggestions (new features to add)
- Rule Updates (rules to modify)
- Learning Loop History

### API Endpoints

#### POST /api/v1/ml/training/train
**Purpose:** Start training job  
**Request:**
```json
{
  "modelType": "risk_scoring",
  "scope": "global",
  "options": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2025-01-28T23:59:59Z",
    "hyperparameters": {
      "max_depth": 10,
      "learning_rate": 0.1
    },
    "automl": true
  }
}
```
**Response:**
```json
{
  "jobId": "job_123",
  "status": "running",
  "estimatedDuration": 3600,
  "startedAt": "2025-01-28T10:30:00Z"
}
```

#### GET /api/v1/ml/training/jobs/:jobId
**Purpose:** Get training job status  
**Response:**
```json
{
  "jobId": "job_123",
  "modelType": "risk_scoring",
  "status": "completed",
  "progress": 100,
  "duration": 3245,
  "metrics": {
    "accuracy": 0.89,
    "precision": 0.87,
    "recall": 0.91,
    "f1": 0.89
  },
  "modelId": "model_risk_002",
  "startedAt": "2025-01-28T10:30:00Z",
  "completedAt": "2025-01-28T11:24:05Z"
}
```

#### POST /api/v1/ml/training/deploy
**Purpose:** Deploy trained model  
**Request:**
```json
{
  "modelId": "model_risk_002",
  "environment": "staging",
  "options": {
    "abTest": {
      "enabled": true,
      "trafficPercentage": 10
    }
  }
}
```
**Response:**
```json
{
  "deploymentId": "deploy_123",
  "status": "deploying",
  "estimatedTime": 600,
  "startedAt": "2025-01-28T11:30:00Z"
}
```

#### GET /api/v1/ml/evaluation/drift/:modelId
**Purpose:** Get drift metrics  
**Response:**
```json
{
  "modelId": "model_risk_001",
  "driftScores": {
    "featureDrift": 0.08,
    "predictionDrift": 0.12,
    "outcomeDrift": 0.05
  },
  "alerts": [
    {
      "type": "prediction_drift",
      "severity": "medium",
      "message": "Prediction distribution has shifted 12% from training data",
      "threshold": 0.10,
      "actual": 0.12,
      "detectedAt": "2025-01-28T10:00:00Z"
    }
  ],
  "recommendation": {
    "shouldRetrain": true,
    "reason": "Prediction drift exceeds threshold",
    "urgency": "medium"
  },
  "calculatedAt": "2025-01-28T10:30:00Z"
}
```

#### GET /api/v1/ml/learning/suggestions
**Purpose:** Get improvement suggestions  
**Response:**
```json
{
  "suggestions": [
    {
      "type": "feature_addition",
      "priority": "high",
      "description": "Add 'competitor_count' feature to improve risk scoring",
      "estimatedImpact": "+3% accuracy",
      "effort": "medium",
      "data": {
        "featureName": "competitor_count",
        "source": "feedback_analysis",
        "supporting_evidence": "Competitors mentioned in 45% of inaccurate predictions"
      }
    },
    {
      "type": "rule_update",
      "priority": "medium",
      "description": "Update 'high_risk_escalation' rule threshold from 0.7 to 0.65",
      "estimatedImpact": "+5% alert accuracy",
      "effort": "low",
      "data": {
        "ruleId": "rule_001",
        "currentThreshold": 0.7,
        "suggestedThreshold": 0.65,
        "supporting_evidence": "15% of risks scored 0.65-0.70 led to lost deals"
      }
    }
  ],
  "generatedAt": "2025-01-28T10:30:00Z"
}
```

### Database Schema

#### TrainingJobs Container (Cosmos DB)
```typescript
interface TrainingJob {
  id: string;                          // job_{modelType}_{timestamp}
  partitionKey: string;                // tenantId or "global"
  modelType: ModelType;
  scope: "global" | "industry";
  industryId?: string;
  
  // Training configuration
  config: {
    startDate: Date;
    endDate: Date;
    featureVersions: Record<string, string>;
    hyperparameters?: Record<string, any>;
    automl?: boolean;
  };
  
  // Azure ML references
  azureMLRunId?: string;
  azureMLExperimentId?: string;
  
  // Status
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;                    // 0-100
  duration?: number;                   // seconds
  
  // Results
  metrics?: EvaluationMetrics;
  modelId?: string;                    // Created model ID
  
  // Error handling
  error?: string;
  retryCount: number;
  
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface DriftMetrics {
  id: string;                          // drift_{modelId}_{date}
  partitionKey: string;                // modelId
  modelId: string;
  
  // Drift scores
  featureDrift: number;                // 0-1
  predictionDrift: number;             // 0-1
  outcomeDrift: number;                // 0-1
  
  // Feature-level drift
  featureDriftDetails: {
    feature: string;
    drift: number;
    threshold: number;
    alert: boolean;
  }[];
  
  // Recommendations
  shouldRetrain: boolean;
  retrainReason?: string;
  urgency: "low" | "medium" | "high";
  
  calculatedAt: Date;
  createdAt: Date;
}

interface ImprovementOpportunity {
  id: string;
  partitionKey: string;                // "global"
  type: "feature_addition" | "feature_removal" | "rule_update" | "hyperparameter_tuning";
  priority: "low" | "medium" | "high";
  
  // Description
  description: string;
  estimatedImpact: string;
  effort: "low" | "medium" | "high";
  
  // Supporting data
  data: Record<string, any>;
  supportingEvidence: string;
  
  // Status
  status: "suggested" | "accepted" | "rejected" | "implemented";
  implementedAt?: Date;
  
  generatedAt: Date;
  createdAt: Date;
}
```

### Message Queues (RabbitMQ)

#### ml.training.started
**Purpose:** Training job started  
**Publisher:** TrainingService  
**Consumer:** Monitoring, notifications  
**Payload:**
```json
{
  "jobId": "job_123",
  "modelType": "risk_scoring",
  "startedAt": "2025-01-28T10:30:00Z",
  "estimatedDuration": 3600,
  "correlationId": "corr_abc"
}
```

#### ml.training.completed
**Purpose:** Training job completed  
**Publisher:** TrainingService  
**Consumer:** ModelService, evaluation, notifications  
**Payload:**
```json
{
  "jobId": "job_123",
  "modelId": "model_risk_002",
  "status": "completed",
  "metrics": { ... },
  "completedAt": "2025-01-28T11:24:05Z",
  "correlationId": "corr_abc"
}
```

#### ml.drift.detected
**Purpose:** Drift detected  
**Publisher:** EvaluationService  
**Consumer:** Training scheduler, alerting  
**Payload:**
```json
{
  "modelId": "model_risk_001",
  "driftType": "prediction_drift",
  "driftScore": 0.12,
  "threshold": 0.10,
  "severity": "medium",
  "shouldRetrain": true,
  "detectedAt": "2025-01-28T10:00:00Z"
}
```

#### ml.improvement.suggested
**Purpose:** Improvement opportunity identified  
**Publisher:** ContinuousLearningService  
**Consumer:** Admin dashboard, notifications  
**Payload:**
```json
{
  "suggestionId": "sugg_123",
  "type": "feature_addition",
  "priority": "high",
  "description": "Add 'competitor_count' feature",
  "estimatedImpact": "+3% accuracy",
  "generatedAt": "2025-01-28T10:30:00Z"
}
```

---

## Cross-Layer Requirements

### Performance Requirements
- **Feature Extraction:** <500ms (p95)
- **ML Prediction:** <2s (p95)
- **Explanation Generation:** <1s (p95)
- **LLM Reasoning:** <3s (p95)
- **Decision Evaluation:** <100ms (p95)
- **End-to-End Pipeline:** <5s (p95)

### Scalability Requirements
- **Concurrent Predictions:** 100+ simultaneous requests
- **Batch Processing:** 1000+ opportunities per batch
- **Daily Training Data:** 10,000+ opportunities
- **Historical Data:** 2+ years retention

### Reliability Requirements
- **Uptime:** 99.9% availability
- **Fallback:** Graceful degradation if ML unavailable
- **Circuit Breaker:** Automatic failover
- **Retry Logic:** Exponential backoff with max 3 retries

### Security Requirements
- **Multi-Tenant Isolation:** Strict tenant data separation
- **Data Encryption:** At rest and in transit
- **Access Control:** RBAC for all ML operations
- **Audit Trail:** Log all predictions and actions
- **PII Protection:** Detect and redact sensitive data

### Monitoring Requirements
- **Application Insights:** All services instrumented
- **Custom Metrics:** Model performance, latency, accuracy
- **Alerts:** Performance degradation, drift detection, errors
- **Dashboards:** Real-time operational dashboards
- **Distributed Tracing:** End-to-end request tracing

### Data Quality Requirements
- **Missing Data:** <10% missing values per feature
- **Outlier Detection:** Flag and handle outliers
- **Data Validation:** Schema validation on all inputs
- **Feature Quality Metrics:** Track feature statistics
- **Drift Monitoring:** Daily drift checks

---

## Implementation Priority

### Phase 1: Foundation (Weeks 1-2)
1. FeatureStoreService (Layer 2)
2. Basic caching infrastructure
3. Database schema setup
4. RabbitMQ event setup

### Phase 2: ML Prediction (Weeks 3-4)
1. ModelService (Layer 3)
2. MLService orchestration
3. Azure ML endpoint integration
4. Risk scoring model deployment

### Phase 3: Explanation & Reasoning (Weeks 5-6)
1. ExplainabilityService (Layer 4)
2. SHAP integration
3. ChainOfThoughtService enhancement (Layer 5)
4. UI components for explanations

### Phase 4: Decision & Feedback (Weeks 7-8)
1. DecisionEngineService (Layer 6)
2. Action execution
3. FeedbackLearningService enhancement (Layer 7)
4. Outcome tracking

### Phase 5: Learning Loop (Weeks 9-10)
1. TrainingService (Layer 8)
2. EvaluationService
3. Drift detection
4. Continuous improvement

