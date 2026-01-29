# Comprehensive ML Integration Layer Requirements - Summary Document

**Date:** January 2025  
**Version:** 1.0  
**Status:** Executive Requirements Summary

---

## Document Purpose

This summary document provides an overview of the **extremely detailed requirements** for all 7 ML integration layers. Each layer has been fully specified with:

- Functional requirements (100+ per layer)
- Non-functional requirements (performance, scalability, security)
- Service implementations (complete class structures with method signatures)
- Data schemas (Cosmos DB containers, Redis cache structures)
- API specifications (endpoints, request/response formats)
- UI components and pages
- RabbitMQ message queue events
- Integration patterns
- Testing requirements
- Monitoring and observability
- Error handling strategies

---

## Layer Overview

| Layer | Name | Services | UI Components | API Endpoints | DB Schemas | MQ Events | Total Requirements |
|-------|------|----------|---------------|---------------|------------|-----------|-------------------|
| 2 | Feature Engineering | 3 | 0 | 5 | 4 | 4 | 150+ |
| 3 | ML Prediction | 3 | 5 | 8 | 3 | 5 | 120+ |
| 4 | Explanation | 2 | 4 | 4 | 4 | 3 | 100+ |
| 5 | LLM Reasoning | 2 | 5 | 5 | 4 | 3 | 90+ |
| 6 | Decision Engine | 3 | 5 | 6 | 5 | 6 | 130+ |
| 7 | Feedback Loop | 1 | 4 | 4 | 4 | 3 | 80+ |
| 8 | Learning Loop | 3 | 4 | 6 | 4 | 5 | 110+ |
| **TOTAL** | **7 Layers** | **17** | **27** | **38** | **28** | **29** | **780+** |

---

## Layer 2: Feature Engineering

### Executive Summary
Transforms raw opportunity signals into ML-ready features with versioning, caching, and quality monitoring.

### Key Requirements Sections

#### Functional Requirements (150+)
**FR-1: Feature Extraction (50 requirements)**
- FR-1.1: Opportunity Features (7 features)
  - dealValue, probability, stage, industry, closeDate, ownerId, accountId
- FR-1.2: Risk Features (5 features)
  - currentRiskScore, categoryScores, detectedRiskCount, highConfidenceRiskCount, riskTrend
- FR-1.3: Historical Features (5 features)
  - ownerWinRate, accountWinRate, accountHealth, similarDealsWinRate, averageDealCycle
- FR-1.4: Relationship Features (6 features)
  - stakeholderCount, decisionMakerPresent, activityCount, documentCount, meetingCount, emailCount
- FR-1.5: Temporal Features (9 features)
  - daysToClose, month, quarter, dayOfWeek, isMonthEnd, isQuarterEnd, seasonality, daysSinceCreated, daysSinceLastActivity
- FR-1.6: Behavioral Features (5 features)
  - engagementRate, responseTime, activityVelocity, budgetConfirmed, competitorPresent

**FR-2: Feature Transformation (40 requirements)**
- FR-2.1: Categorical Encoding
  - One-hot encoding (stage, industry)
  - Embeddings (owner, account)
  - Label encoding (ordinal features)
- FR-2.2: Numerical Normalization
  - Min-max normalization
  - Z-score standardization
  - Log transformation
  - Robust scaling
- FR-2.3: Temporal Engineering
  - Cyclical encoding (month, dayOfWeek)
  - Ratio calculations
  - Time pressure indicators
- FR-2.4: Aggregation Features
  - Rolling averages (7d, 30d, 90d)
  - Rate of change
  - Statistical aggregations

**FR-3: Feature Versioning (30 requirements)**
- FR-3.1: Version Management
  - Version naming conventions
  - Computation logic tracking
  - Pinning for training
  - Resolution for inference
  - Deprecation workflow
- FR-3.2: Compatibility Management
  - Compatibility rules (major/minor versions)
  - Validation at inference
  - Error handling
  - Testing before deployment
- FR-3.3: Feature Lineage
  - Source data tracking
  - Transformation tracking
  - Dependency management
  - Lineage reporting

**FR-4: Feature Storage (20 requirements)**
- FR-4.1: Persistent Storage (Cosmos DB)
  - Feature snapshots
  - Feature metadata
  - Feature statistics
  - Query patterns
- FR-4.2: Cache Storage (Redis)
  - Feature vector caching
  - Statistics caching
  - Metadata caching
  - Cache warming
- FR-4.3: Training Data Storage (Azure ML)
  - Export to Parquet
  - Dataset creation
  - Versioning
  - Azure ML registration

**FR-5: Feature Quality Monitoring (10 requirements)**
- FR-5.1: Missing Data Tracking
  - Missing rate calculation
  - Alerting on high rates
  - Trend tracking
  - Root cause analysis
- FR-5.2: Outlier Detection
  - Threshold definition
  - Detection during extraction
  - Handling strategies
  - Rate tracking
- FR-5.3: Distribution Monitoring
  - Statistics calculation
  - Drift detection (KS test)
  - Visualization
  - Alerting

#### Non-Functional Requirements (40+)
**NFR-1: Performance**
- Latency targets (extraction <500ms p95)
- Throughput requirements (100+ concurrent)
- Resource utilization limits

**NFR-2: Scalability**
- Horizontal scaling (5+ instances)
- Data volume handling (10K+ snapshots/day)
- Tenant isolation

**NFR-3: Reliability**
- Uptime (99.9%)
- Fault tolerance (retry logic, circuit breakers)
- Data consistency guarantees

**NFR-4: Security**
- Data encryption (rest + transit)
- Access control (RBAC, tenant isolation)
- PII protection

**NFR-5: Observability**
- Structured logging
- Custom metrics (extraction_duration, cache_hit_rate, missing_rate)
- Distributed tracing

### Services

#### FeatureStoreService
**Methods (20+):**
```typescript
extractFeatures(opportunityId, tenantId, modelVersion)
extractFeaturesForBatch(opportunityIds, tenantId, modelVersion)
getHistoricalFeatures(opportunityId, tenantId, startDate, endDate)
pinFeatureVersions(trainingJobId, featureNames)
getFeatureVersionForInference(featureName, modelVersion)
isCompatibleVersion(featureVersion, requiredVersion)
cacheFeatures(opportunityId, tenantId, features, ttl)
getCachedFeatures(opportunityId, tenantId)
invalidateCache(opportunityId, tenantId)
getFeatureSchema()
getFeatureStatistics(featureName)
updateFeatureStatistics(featureName, values)
trackFeatureQuality(featureName, values)
detectOutliers(featureName, values)
exportTrainingData(modelType, startDate, endDate, options)
// + 10 private helper methods
```

#### FeatureVersionManager
**Methods (10+):**
```typescript
pinVersionsForTraining(trainingJobId, featureNames)
resolveVersionForInference(featureName, modelVersion)
validateCompatibility(featureVersion, requiredVersion)
registerNewVersion(featureName, version, changes)
deprecateVersion(featureName, version)
getVersionHistory(featureName)
```

#### FeatureQualityMonitor
**Methods (8+):**
```typescript
calculateMissingRate(featureName, values)
detectOutliers(featureName, values)
calculateDistributionStats(featureName, values)
detectDrift(featureName, currentDist, baselineDist)
generateQualityReport(featureName, timeRange)
alertOnQualityIssue(featureName, issue)
```

### Database Schemas

#### FeatureSnapshot (Cosmos DB)
```typescript
interface FeatureSnapshot {
  id: string;
  partitionKey: string; // tenantId
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
```

#### FeatureMetadata (Cosmos DB)
```typescript
interface FeatureMetadata {
  id: string;
  partitionKey: string; // "global"
  featureName: string;
  currentVersion: string;
  versions: FeatureVersion[];
  schema: {
    type: string;
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
```

#### FeatureStatistics (embedded)
```typescript
interface FeatureStatistics {
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
  p25?: number;
  p75?: number;
  p95?: number;
  uniqueValues?: number;
  missingRate: number;
  sampleSize: number;
  lastUpdated: Date;
}
```

#### FeatureVersion (embedded)
```typescript
interface FeatureVersion {
  version: string;
  computationHash: string;
  changes: string;
  compatibleWith: string[];
  deprecatedAt?: Date;
  createdAt: Date;
}
```

### API Endpoints

#### GET /api/v1/ml/features/:opportunityId
Extract features for opportunity
- Query params: modelVersion
- Response: FeatureVector with metadata

#### POST /api/v1/ml/features/batch
Extract features for multiple opportunities
- Body: opportunityIds[], modelVersion
- Response: Map<opportunityId, FeatureVector>

#### GET /api/v1/ml/features/schema
Get feature schema
- Response: FeatureSchema with all feature definitions

#### GET /api/v1/ml/features/statistics/:featureName
Get feature statistics
- Response: FeatureStatistics

#### POST /api/v1/ml/features/export
Export training data
- Body: modelType, startDate, endDate, options
- Response: Export job ID

### RabbitMQ Events

#### feature.extraction.requested
Trigger: Training job or inference request  
Payload: `{ requestId, opportunityIds, tenantId, modelVersion, priority }`

#### feature.extraction.completed
Trigger: Feature extraction finished  
Payload: `{ requestId, opportunityId, features, success, duration }`

#### feature.cache.invalidated
Trigger: Opportunity updated  
Payload: `{ opportunityId, tenantId, reason, timestamp }`

#### feature.quality.alert
Trigger: Quality issue detected  
Payload: `{ featureName, issue, severity, timestamp }`

---

## Layer 3: ML Prediction

### Executive Summary
Orchestrates ML model inference via Azure ML Managed Endpoints with caching, A/B testing, and fallback strategies.

### Key Requirements Sections

#### Functional Requirements (120+)
**FR-1: Model Inference (40 requirements)**
- Call Azure ML endpoints
- Batch prediction support
- Prediction caching with event-based invalidation
- Circuit breaker for failures
- Retry logic with exponential backoff
- Timeout handling (2s default)

**FR-2: Model Selection (30 requirements)**
- Automatic model selection (global vs industry-specific)
- A/B testing support (traffic splitting)
- Champion/challenger deployment
- Model version management
- Fallback to rule-based if ML unavailable

**FR-3: Prediction Types (30 requirements)**
- Risk scoring (0-1 score + category scores)
- Win probability (0-1 + confidence)
- Revenue forecasting (point + uncertainty intervals P10/P50/P90)
- Recommendation ranking (scored list)

**FR-4: Model Management (20 requirements)**
- Model metadata sync from Azure ML Registry
- Model performance tracking
- Model health monitoring
- Model deployment automation

#### Non-Functional Requirements (30+)
- Inference latency: <2s p95
- Batch inference: 100+ opportunities
- Cache hit rate: >70%
- Endpoint availability: 99.9%
- Graceful degradation if ML unavailable

### Services

#### ModelService (15 methods)
```typescript
predict(modelType, features, options)
predictBatch(modelType, featuresArray, options)
selectModel(modelType, tenantId, opportunityId)
getModelMetadata(modelId)
getCachedPrediction(modelId, opportunityId)
cachePrediction(modelId, opportunityId, prediction)
invalidatePredictionCache(opportunityId)
checkEndpointHealth(endpointUrl)
trackPredictionLatency(modelId, latency)
```

#### MLService (10 methods)
```typescript
evaluateRisk(opportunityId, tenantId)
forecastRevenue(opportunityIds, tenantId)
generateRecommendations(userId, context)
runMLPipeline(opportunityId, modelType, options)
```

#### ModelRegistrySync (8 methods)
```typescript
syncFromAzureML()
registerModel(modelMetadata)
updateModelStatus(modelId, status)
getActiveModels(modelType)
```

### UI Components (5)

#### RiskScoreBadge
Display risk score with color coding, ML-powered indicator, confidence level

#### ForecastChart
Line chart with P10/P50/P90 bands, historical overlay, target line

#### PredictionConfidence
Confidence meter, top contributing factors, expandable details

#### ModelHealthIndicator
Endpoint status, latency metrics, error rate

#### ABTestToggle
Enable/disable A/B test, traffic percentage slider, metrics comparison

### UI Pages (2)

#### Opportunity Detail Page (Enhanced)
- ML Risk Score section
- Win Probability section
- Revenue Forecast section (if applicable)
- ML Model Info (version, last updated, confidence)

#### ML Insights Dashboard
- Model Performance (accuracy, precision, recall over time)
- Prediction Distribution (histograms)
- Top Risk Factors
- Forecast Accuracy (actual vs predicted)
- Model Health (endpoint status, latency, errors)

### Database Schemas (3)

#### MLModel (Cosmos DB)
```typescript
interface MLModel {
  id: string;
  partitionKey: string; // modelType
  name: string;
  modelType: "risk_scoring" | "forecasting" | "recommendations" | "win_probability";
  version: string;
  scope: "global" | "industry";
  industryId?: string;
  azureMLModelId: string;
  endpointUrl: string;
  endpointName: string;
  parentModelId?: string;
  performance: PerformanceMetrics;
  config: ModelConfig;
  status: "training" | "active" | "inactive" | "deprecated";
  deployedAt?: Date;
  deprecatedAt?: Date;
  abTest?: ABTestConfig;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Prediction (Cosmos DB)
```typescript
interface Prediction {
  id: string;
  partitionKey: string; // tenantId
  opportunityId: string;
  tenantId: string;
  modelId: string;
  modelVersion: string;
  prediction: PredictionOutput;
  features: FeatureVector;
  latency: number;
  predictedAt: Date;
  expiresAt: Date;
  actual?: ActualOutcome;
  actualAt?: Date;
  createdAt: Date;
}
```

#### ModelMetrics (Cosmos DB)
```typescript
interface ModelMetrics {
  id: string;
  partitionKey: string; // modelId
  modelId: string;
  date: Date;
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    mse?: number;
    mae?: number;
    r2?: number;
  };
  predictionCount: number;
  avgLatency: number;
  errorRate: number;
  calculatedAt: Date;
}
```

### API Endpoints (8)

1. POST /api/v1/ml/predict/risk
2. POST /api/v1/ml/predict/win-probability
3. POST /api/v1/ml/predict/forecast
4. POST /api/v1/ml/predict/recommendations
5. GET /api/v1/ml/models
6. GET /api/v1/ml/models/:modelId
7. POST /api/v1/ml/models/:modelId/health
8. GET /api/v1/ml/models/:modelId/metrics

### RabbitMQ Events (5)

1. ml.prediction.requested
2. ml.prediction.completed
3. ml.prediction.failed
4. ml.model.deployed
5. ml.model.health.degraded

---

## Layer 4: Explanation

### Executive Summary
Generates structured explanations for ML predictions using SHAP values and feature importance.

### Key Requirements (100+)

#### Functional Requirements
**FR-1: SHAP Integration (30 requirements)**
- Calculate SHAP values for predictions
- Identify top positive/negative factors
- Global feature importance
- Local feature importance per prediction
- Support TreeExplainer, LinearExplainer

**FR-2: Feature Importance (25 requirements)**
- Rank features by importance
- Group by category (opportunity, risk, historical)
- Calculate contribution to prediction
- Generate human-readable descriptions

**FR-3: Explanation Generation (25 requirements)**
- Structured explanation (JSON)
- Factor list with impacts
- Confidence indicators
- Prediction breakdown

**FR-4: Visualization Data (20 requirements)**
- Waterfall chart data
- Bar chart data for feature importance
- Distribution comparison data

#### Non-Functional Requirements
- SHAP calculation: <1s
- Cache SHAP values
- Consistent format across models
- Localization support (future)

### Services (2)

#### ExplainabilityService (12 methods)
```typescript
explainPrediction(modelId, opportunityId, prediction)
explainPredictionBatch(modelId, predictions)
getFeatureImportance(modelId, features)
getGlobalFeatureImportance(modelId)
generateFactors(shapValues, features)
describeFactors(factors)
calculateSHAPValues(model, features)
cacheExplanation(predictionId, explanation)
getCachedExplanation(predictionId)
```

#### RiskExplainabilityService (6 methods)
```typescript
explainRiskScore(opportunityId, riskScore, explanation)
generateRiskNarrative(riskExplanation)
identifyTopRiskFactors(riskScore, factors)
compareRiskToBaseline(opportunityId, riskScore)
```

### UI Components (4)

#### ExplanationCard
Show top positive/negative factors, interactive drill-down, importance bars, detail levels

#### SHAPWaterfallChart
Waterfall showing factor contributions, base → factors → prediction, interactive tooltips

#### FeatureImportanceBar
Horizontal bars of feature importance, color-coded by category, sortable

#### PredictionBreakdown
Detailed breakdown of prediction components, mathematical formula display

### UI Pages (1)

#### Prediction Detail Page
- Prediction Summary
- Explanation (SHAP waterfall, factors)
- Feature Values
- Model Info
- Actual Outcome (if available)

### Database Schemas (4)

#### Explanation (Cosmos DB)
```typescript
interface Explanation {
  id: string;
  partitionKey: string; // tenantId
  predictionId: string;
  opportunityId: string;
  tenantId: string;
  modelId: string;
  baseValue: number;
  prediction: number;
  positiveFactors: Factor[];
  negativeFactors: Factor[];
  shapValues: Record<string, number>;
  confidence: "low" | "medium" | "high";
  detailLevel: string;
  generatedAt: Date;
  createdAt: Date;
}
```

#### Factor (embedded)
```typescript
interface Factor {
  feature: string;
  value: any;
  impact: number;
  importance: number;
  category: string;
  description: string;
}
```

#### GlobalFeatureImportance (Cosmos DB)
```typescript
interface GlobalFeatureImportance {
  id: string;
  partitionKey: string; // modelId
  modelId: string;
  featureImportance: FeatureImportanceItem[];
  sampleSize: number;
  calculatedAt: Date;
  createdAt: Date;
}
```

### API Endpoints (4)

1. POST /api/v1/ml/explain/prediction
2. GET /api/v1/ml/explain/feature-importance/:modelId
3. GET /api/v1/ml/explain/factors/:predictionId
4. POST /api/v1/ml/explain/batch

### RabbitMQ Events (3)

1. ml.explanation.requested
2. ml.explanation.completed
3. ml.explanation.failed

---

## Layer 5: LLM Reasoning

### Executive Summary
Transforms structured ML outputs into natural language insights, recommendations, and scenarios.

### Key Requirements (90+)

#### Functional Requirements
**FR-1: Natural Language Generation (30 requirements)**
- Generate human-readable explanations from SHAP
- Create narrative summaries
- Explain "why" in business terms
- Context-aware language (industry-specific)

**FR-2: Recommendation Generation (30 requirements)**
- Suggest next best actions
- Prioritize by impact
- Generate playbook suggestions
- Create email/message drafts

**FR-3: Scenario Analysis (30 requirements)**
- Generate best/base/worst scenarios
- Explain assumptions
- Quantify scenario impact
- Provide mitigation strategies

#### Non-Functional Requirements
- Response time: <3s
- Context-aware
- Consistent tone
- Support multiple LLM providers

### Services (2)

#### ChainOfThoughtService (Enhanced) (15 methods)
```typescript
reason(query, context)
reasonMultiStep(query, steps)
explainPrediction(prediction, explanation, context)
generateRecommendations(prediction, explanation, context)
analyzeScenarios(prediction, context)
generateSummary(data, template)
generatePlaybook(opportunity, recommendations)
```

#### IntentAnalyzerService (Enhanced) (8 methods)
```typescript
analyzeIntent(query)
extractEntities(query)
classifyMLQuery(query)
extractMLContext(query)
```

### UI Components (5)

#### NaturalLanguageExplanation
Display LLM text, highlight factors, expandable sections, copy to clipboard

#### RecommendationList
List of actions, priority indicators, one-click execution, completion tracking

#### ScenarioCard
Scenario summary, assumptions list, impact metrics, probability

#### PlaybookViewer
Step-by-step playbook, progress tracking, completion checkboxes

#### InsightFeed
Stream of AI-generated insights, real-time updates, filtering

### UI Pages (1)

#### Opportunity Insights Page
- AI Summary
- Key Insights (top 3-5)
- Recommendations
- Scenario Analysis
- Risk Factors (LLM-explained)

### Database Schemas (4)

#### LLMOutput (Cosmos DB)
```typescript
interface LLMOutput {
  id: string;
  partitionKey: string; // tenantId
  outputType: "explanation" | "recommendations" | "scenarios" | "summary";
  opportunityId: string;
  tenantId: string;
  inputContext: LLMInputContext;
  output: LLMOutputData;
  llmProvider: string;
  model: string;
  promptTemplate: string;
  latency: number;
  tokenCount: number;
  generatedAt: Date;
  createdAt: Date;
}
```

#### Recommendation (embedded)
```typescript
interface Recommendation {
  action: string;
  priority: "low" | "medium" | "high" | "critical";
  rationale: string;
  estimatedImpact?: string;
  dueDate?: Date;
  completedAt?: Date;
}
```

#### Scenario (embedded)
```typescript
interface Scenario {
  type: "best" | "base" | "worst";
  probability: number;
  revenue?: number;
  description: string;
  assumptions: string[];
}
```

### API Endpoints (5)

1. POST /api/v1/llm/explain
2. POST /api/v1/llm/recommendations
3. POST /api/v1/llm/scenarios
4. POST /api/v1/llm/summary
5. POST /api/v1/llm/playbook

### RabbitMQ Events (3)

1. llm.reasoning.requested
2. llm.reasoning.completed
3. llm.reasoning.failed

---

## Layer 6: Decision Engine

### Executive Summary
Combines ML predictions, explanations, LLM insights, and business rules to make actionable decisions and execute actions.

### Key Requirements (130+)

#### Functional Requirements
**FR-1: Decision Rules (40 requirements)**
- Define rule-based logic
- Combine ML + rules
- Priority-based execution
- Conflict resolution
- Dynamic configuration

**FR-2: Action Execution (40 requirements)**
- CRM updates (mark as hot, change stage)
- Notifications (email, Slack, in-app)
- Task creation
- Email draft generation
- Calendar events
- Playbook assignment

**FR-3: Decision Orchestration (30 requirements)**
- Multiple decision types
- Sequential pipeline
- Parallel execution
- Dependencies (wait for X before Y)
- Decision caching

**FR-4: Rule Management (20 requirements)**
- Create/update rules
- Test rules on historical data
- Version rules
- Enable/disable rules
- A/B test rules

#### Non-Functional Requirements
- Rule evaluation: <100ms
- Idempotent actions
- Rollback capability
- Audit trail for all actions
- Async execution

### Services (3)

#### DecisionEngineService (18 methods)
```typescript
makeDecision(context, rules, mlPredictions)
evaluateRules(context, rules)
combinePredictions(mlPredictions, ruleResults)
resolveConflicts(results)
getRules(tenantId, context)
updateRule(ruleId, rule)
testRule(rule, testData)
```

#### RiskEvaluationService (Decision Engine) (15 methods)
```typescript
evaluateOpportunity(opportunityId, tenantId, options)
makeDecisions(riskScore, explanation, llmInsights, opportunity)
applyRules(riskScore, opportunity)
resolveConflicts(mlDecisions, ruleDecisions)
executeActions(decisions, opportunityId, tenantId)
executeAction(action, opportunityId, tenantId)
rollbackAction(actionId)
```

#### ActionExecutor (10 methods)
```typescript
executeCRMUpdate(action, opportunityId)
sendNotification(action, recipients)
createTask(action, opportunityId)
generateEmailDraft(action, context)
createCalendarEvent(action, opportunityId)
assignPlaybook(action, opportunityId)
```

### UI Components (5)

#### DecisionCard
Decision summary, recommended actions, execution buttons, rationale

#### ActionTimeline
Timeline of actions, status indicators, rollback buttons, audit trail

#### RuleBuilder
Visual rule builder, condition editor, action selector, testing interface

#### ConflictResolver
Show conflicting decisions, resolution strategy selector, preview outcome

#### ActionQueue
Pending actions list, priority sorting, batch execution

### UI Pages (2)

#### Decision Management Page
- Active Rules
- Decision History
- Action Queue
- Performance Metrics

#### Rule Editor Page
- Rule Configuration
- Conditions
- Actions
- Testing
- History

### Database Schemas (5)

#### Decision (Cosmos DB)
```typescript
interface Decision {
  id: string;
  partitionKey: string; // tenantId
  opportunityId: string;
  tenantId: string;
  decisionType: string;
  priority: string;
  rationale: string;
  source: "rule" | "ml" | "llm" | "combined";
  mlPrediction?: Prediction;
  explanation?: Explanation;
  llmInsights?: LLMOutput;
  ruleResults?: RuleResult[];
  actions: Action[];
  actionResults?: ActionResult[];
  status: "pending" | "executed" | "failed" | "rolled_back";
  executedAt?: Date;
  createdAt: Date;
}
```

#### Rule (Cosmos DB)
```typescript
interface Rule {
  id: string;
  partitionKey: string; // tenantId
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  conditionLogic: "AND" | "OR";
  actions: Action[];
  version: number;
  previousVersionId?: string;
  testResults?: RuleTestResult[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

#### Action (embedded)
```typescript
interface Action {
  type: "crm_update" | "notification" | "task_creation" | "email_draft" | "calendar_event";
  details: Record<string, any>;
  priority: "low" | "medium" | "high";
  idempotencyKey: string;
}
```

### API Endpoints (6)

1. POST /api/v1/decisions/evaluate
2. POST /api/v1/decisions/execute
3. GET /api/v1/decisions/rules
4. POST /api/v1/decisions/rules
5. PUT /api/v1/decisions/rules/:ruleId
6. POST /api/v1/decisions/rules/:ruleId/test

### RabbitMQ Events (6)

1. decision.evaluation.requested
2. decision.evaluation.completed
3. action.execution.requested
4. action.execution.completed
5. action.execution.failed
6. action.rolled_back

---

## Layer 7: Feedback Loop

### Executive Summary
Collects user feedback and actual outcomes to improve the system.

### Key Requirements (80+)

#### Functional Requirements
**FR-1: Feedback Collection (30 requirements)**
- User ratings (1-5 stars)
- Acknowledge/dismiss decisions
- Correct predictions
- Comment on predictions
- Track action effectiveness

**FR-2: Outcome Tracking (25 requirements)**
- Track won/lost opportunities
- Actual revenue vs predicted
- Actual close date vs predicted
- Action effectiveness

**FR-3: Feedback Analysis (25 requirements)**
- Aggregate by model, feature, industry
- Identify prediction errors
- Calculate user satisfaction
- Generate feedback reports

#### Non-Functional Requirements
- Lightweight feedback UI
- Optional feedback
- Anonymous option
- Link to predictions

### Services (1)

#### FeedbackLearningService (Enhanced) (15 methods)
```typescript
recordFeedback(feedback)
recordOutcome(opportunityId, outcome)
linkFeedbackToPrediction(predictionId, feedbackId)
aggregateFeedback(modelId, timeRange)
calculateUserSatisfaction(modelId)
identifyPredictionErrors(modelId)
generateFeedbackReport(modelId, timeRange)
trackFeedbackTrends(modelId)
```

### UI Components (4)

#### FeedbackWidget
Star rating, thumbs up/down, quick buttons, optional comment

#### OutcomeTracker
Outcome selector, actual values, comparison display, save

#### FeedbackDashboard
Stats, distribution chart, recent feedback, accuracy chart

#### UserSatisfactionMeter
NPS-style metric, trend over time, breakdown by segment

### UI Pages (1)

#### Feedback Management Page
- Feedback Overview
- Recent Feedback
- Prediction Accuracy
- User Satisfaction

### Database Schemas (4)

#### UserFeedback (Cosmos DB)
```typescript
interface UserFeedback {
  id: string;
  partitionKey: string; // tenantId
  predictionId: string;
  opportunityId: string;
  tenantId: string;
  userId: string;
  rating?: number;
  accurate?: boolean;
  helpful?: boolean;
  actionTaken?: boolean;
  comment?: string;
  predictionType: string;
  modelVersion: string;
  recordedAt: Date;
  createdAt: Date;
}
```

#### Outcome (Cosmos DB)
```typescript
interface Outcome {
  id: string;
  partitionKey: string; // tenantId
  opportunityId: string;
  tenantId: string;
  status: "won" | "lost";
  actualRevenue?: number;
  actualCloseDate?: Date;
  predictions: PredictionComparison[];
  recordedAt: Date;
  createdAt: Date;
}
```

### API Endpoints (4)

1. POST /api/v1/feedback
2. POST /api/v1/outcomes
3. GET /api/v1/feedback/summary/:modelId
4. GET /api/v1/feedback/trends/:modelId

### RabbitMQ Events (3)

1. feedback.recorded
2. outcome.recorded
3. feedback.trend.alert

---

## Layer 8: Learning Loop

### Executive Summary
Continuously improves the system through model retraining, drift detection, and system optimization.

### Key Requirements (110+)

#### Functional Requirements
**FR-1: Model Retraining (40 requirements)**
- Scheduled retraining (monthly, quarterly)
- Trigger-based (performance degradation, drift)
- Incremental training
- A/B testing new models
- Champion/challenger deployment

**FR-2: Drift Detection (35 requirements)**
- Feature distribution drift
- Prediction distribution drift
- Outcome drift (concept drift)
- Alert on significant drift

**FR-3: Continuous Improvement (35 requirements)**
- Analyze feedback patterns
- Identify model weaknesses
- Suggest feature improvements
- Update decision rules
- Optimize hyperparameters

#### Non-Functional Requirements
- Automated retraining pipeline
- Data validation before training
- Model evaluation before deployment
- Rollback capability
- Daily drift monitoring

### Services (3)

#### TrainingService (15 methods)
```typescript
trainModel(modelType, options)
scheduleRetraining(modelId, schedule)
triggerRetraining(modelId, reason)
prepareTrainingData(modelType, startDate, endDate)
validateTrainingData(dataset)
exportToAzureML(dataset)
deployModel(modelId, environment)
rollbackModel(modelId)
monitorTrainingJob(jobId)
cancelTrainingJob(jobId)
```

#### EvaluationService (Enhanced) (12 methods)
```typescript
evaluateModel(modelId, testData, actuals)
compareModels(modelId1, modelId2)
detectFeatureDistributionDrift(modelId)
detectPredictionDistributionDrift(modelId)
detectOutcomeDrift(modelId)
trackModelPerformance(modelId)
shouldRetrain(modelId)
generateEvaluationReport(modelId)
```

#### ContinuousLearningService (10 methods)
```typescript
analyzeSystemPerformance()
identifyImprovementOpportunities()
suggestFeatureImprovements()
suggestRuleUpdates()
runLearningLoop()
scheduleImprovements()
```

### UI Components (4)

#### TrainingJobCard
Job status, progress indicator, duration, metrics preview, cancel button

#### DriftMonitor
Drift score, trend chart, alert threshold, feature-level drilldown

#### ImprovementSuggestions
Prioritized suggestions, estimated impact, accept/reject, implementation status

#### ModelComparison
Side-by-side metrics, performance charts, A/B test results

### UI Pages (3)

#### Training Dashboard Page
- Active Training Jobs
- Training History
- Model Performance Comparison
- Retraining Schedule

#### Drift Monitoring Page
- Drift Overview
- Feature Drift Analysis
- Prediction Drift Analysis
- Outcome Drift Analysis
- Drift Alerts

#### Continuous Learning Page
- System Performance
- Improvement Opportunities
- Feature Suggestions
- Rule Updates
- Learning Loop History

### Database Schemas (4)

#### TrainingJob (Cosmos DB)
```typescript
interface TrainingJob {
  id: string;
  partitionKey: string; // "global" or tenantId
  modelType: ModelType;
  scope: "global" | "industry";
  industryId?: string;
  config: TrainingConfig;
  azureMLRunId?: string;
  azureMLExperimentId?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  duration?: number;
  metrics?: EvaluationMetrics;
  modelId?: string;
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

#### DriftMetrics (Cosmos DB)
```typescript
interface DriftMetrics {
  id: string;
  partitionKey: string; // modelId
  modelId: string;
  featureDrift: number;
  predictionDrift: number;
  outcomeDrift: number;
  featureDriftDetails: FeatureDrift[];
  shouldRetrain: boolean;
  retrainReason?: string;
  urgency: "low" | "medium" | "high";
  calculatedAt: Date;
  createdAt: Date;
}
```

#### ImprovementOpportunity (Cosmos DB)
```typescript
interface ImprovementOpportunity {
  id: string;
  partitionKey: string; // "global"
  type: "feature_addition" | "feature_removal" | "rule_update" | "hyperparameter_tuning";
  priority: "low" | "medium" | "high";
  description: string;
  estimatedImpact: string;
  effort: "low" | "medium" | "high";
  data: Record<string, any>;
  supportingEvidence: string;
  status: "suggested" | "accepted" | "rejected" | "implemented";
  implementedAt?: Date;
  generatedAt: Date;
  createdAt: Date;
}
```

### API Endpoints (6)

1. POST /api/v1/ml/training/train
2. GET /api/v1/ml/training/jobs/:jobId
3. POST /api/v1/ml/training/deploy
4. GET /api/v1/ml/evaluation/drift/:modelId
5. GET /api/v1/ml/learning/suggestions
6. POST /api/v1/ml/learning/suggestions/:id/accept

### RabbitMQ Events (5)

1. ml.training.started
2. ml.training.completed
3. ml.training.failed
4. ml.drift.detected
5. ml.improvement.suggested

---

## Cross-Layer Requirements

### Performance Requirements
- **Layer 2:** Feature extraction <500ms (p95)
- **Layer 3:** ML prediction <2s (p95)
- **Layer 4:** Explanation <1s (p95)
- **Layer 5:** LLM reasoning <3s (p95)
- **Layer 6:** Decision evaluation <100ms (p95)
- **Layer 7:** Feedback submission <200ms (p95)
- **Layer 8:** Training job start <5s
- **End-to-End:** Complete pipeline <5s (p95)

### Scalability Requirements
- **Concurrent requests:** 100+ across all layers
- **Batch processing:** 1000+ opportunities per batch
- **Daily training data:** 10,000+ opportunities
- **Historical retention:** 2 years

### Reliability Requirements
- **Uptime:** 99.9% for all services
- **Fallback:** Graceful degradation if layers fail
- **Circuit breaker:** Auto-disable after 5 failures
- **Retry logic:** Exponential backoff, max 3 retries

### Security Requirements
- **Multi-tenant isolation:** Strict partition by tenantId
- **Encryption:** At rest (Cosmos DB, Blob) and in transit (TLS 1.2+)
- **RBAC:** Role-based access for all endpoints
- **Audit trail:** Log all actions and predictions
- **PII protection:** Detect and redact sensitive data

### Monitoring Requirements
- **Application Insights:** All services instrumented
- **Custom metrics:** 50+ metrics across layers
- **Alerts:** Automated alerts for degradation
- **Dashboards:** Real-time operational dashboards
- **Distributed tracing:** End-to-end request correlation

---

## Implementation Priority

### Phase 1: Foundation (Weeks 1-2)
- Layer 2: FeatureStoreService core
- Database schemas
- Caching infrastructure
- RabbitMQ events

### Phase 2: ML Prediction (Weeks 3-4)
- Layer 3: ModelService, MLService
- Azure ML endpoint integration
- Risk scoring deployment
- Basic caching

### Phase 3: Explanation & Reasoning (Weeks 5-6)
- Layer 4: ExplainabilityService
- Layer 5: LLM enhancements
- SHAP integration
- UI components

### Phase 4: Decision & Feedback (Weeks 7-8)
- Layer 6: DecisionEngineService
- Layer 7: FeedbackLearningService enhancements
- Action execution
- Outcome tracking

### Phase 5: Learning Loop (Weeks 9-10)
- Layer 8: TrainingService, EvaluationService
- Drift detection
- Retraining automation
- Continuous improvement

---

## Total Effort Estimation

### Development Effort
- **Layer 2:** 3-4 weeks (2 developers)
- **Layer 3:** 3-4 weeks (2 developers)
- **Layer 4:** 2-3 weeks (1 developer)
- **Layer 5:** 2-3 weeks (1 developer)
- **Layer 6:** 3-4 weeks (2 developers)
- **Layer 7:** 1-2 weeks (1 developer)
- **Layer 8:** 3-4 weeks (2 developers)
- **Integration & Testing:** 2-3 weeks (all developers)
- **Total:** 19-27 weeks (overlapping, parallelized)

### Team Composition
- 2 Backend Engineers (feature engineering, ML orchestration)
- 1 ML Engineer (Azure ML, model training, SHAP)
- 1 Frontend Engineer (UI components, pages)
- 1 DevOps Engineer (infrastructure, monitoring)
- 1 QA Engineer (testing, validation)

---

## Document Maintenance

This summary document should be updated when:
- New requirements are identified
- Requirements change or are removed
- Implementation is completed (update status)
- Performance metrics are measured
- Issues are discovered

**Last Updated:** January 2025  
**Next Review:** February 2025

