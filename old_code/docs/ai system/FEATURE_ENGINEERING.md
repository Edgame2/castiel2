# Feature Engineering

## Overview

Feature engineering is a critical component of the ML system for the three priority use cases: **Risk Scoring**, **Revenue Forecasting**, and **Recommendations**. This document describes the feature extraction, transformation, and storage processes that prepare data for ML model training and inference.

## CAIS Context: Signals → Features → Predictions → Explanations → Actions

Feature engineering is **CAIS Layer 2: Feature Engineering Layer**. It plays a critical role in the Compound AI System (CAIS) by transforming raw opportunity **signals** into machine-readable **features** that feed the predictive models.

### The CAIS Flow

```
Opportunity Signals (Raw Data)
    ↓
Feature Engineering (This Layer)
    ↓
Features (Machine-Readable)
    ↓
Predictive Model (ML Prediction)
    ↓
Explanation Layer (SHAP, Feature Importance)
    ↓
LLM Reasoning (Natural Language)
    ↓
Decision & Action (Rules + AI Combined)
```

### Key Principle

**Never feed raw CRM objects directly to models. Always store explicit features.**

Raw opportunity data (signals) must be transformed into features:
- **Signals**: Raw CRM data (amount, stage, closeDate, etc.)
- **Features**: Machine-readable, normalized, encoded values (dealValue: 500000, stage_encoded: [0,1,0,0,...], daysToClose: 49)

### Feature Engineering in CAIS

Feature engineering is where **signals become machine-readable**. This layer:
1. **Extracts** signals from opportunities and related entities
2. **Transforms** signals into features (encoding, normalization, temporal)
3. **Stores** features for training and inference
4. **Versions** features to prevent training/serving skew

For detailed CAIS architecture, see [CAIS_ARCHITECTURE.md](CAIS_ARCHITECTURE.md).

## Feature Categories

Features are organized into several categories based on their source and nature. These features represent **signals** extracted from opportunities and transformed into machine-readable format:

### 1. Opportunity Features

Direct features from the opportunity shard:

```typescript
interface OpportunityFeatures {
  // Numerical features
  dealValue: number;              // Deal value in base currency
  expectedRevenue: number;         // Expected revenue
  probability: number;              // Win probability (0-100)
  daysToClose: number;              // Days until expected close date
  daysSinceActivity: number;       // Days since last activity
  daysSinceCreated: number;         // Days since opportunity created
  daysInCurrentStage: number;       // Days in current stage (NEW - for risk scoring)
  daysSinceLastActivity: number;   // Days since last activity (NEW - for risk scoring)
  dealVelocity: number;             // Rate of stage progression (NEW - for forecasting)
  competitorCount: number;          // Number of competitors (NEW - for risk scoring)
  stakeholderCount: number;         // Number of stakeholders (NEW - for risk scoring)
  documentCount: number;            // Number of documents (NEW - for risk scoring)
  emailCount: number;              // Email interaction count (NEW - for recommendations)
  meetingCount: number;             // Meeting count (NEW - for recommendations)
  
  // Categorical features (encoded)
  stage: string;                    // Current stage (one-hot encoded)
  industry: string;                 // Industry (one-hot encoded)
  currency: string;                  // Currency code
  ownerId: string;                  // Opportunity owner (embedding)
  accountId: string;                // Account ID (embedding)
  
  // Boolean features
  hasCloseDate: boolean;            // Whether close date is set
  hasExpectedRevenue: boolean;      // Whether expected revenue is set
  isRecurring: boolean;              // Whether deal is recurring
}
```

### 2. Risk Features

Features derived from detected risks:

```typescript
interface RiskFeatures {
  // Risk counts
  totalRisks: number;               // Total number of detected risks
  highConfidenceRisks: number;      // Risks with confidence > 0.7
  risksByCategory: Record<string, number>; // Count per category
  
  // Risk scores
  riskScore: number;                 // Overall risk score (0-1)
  categoryScores: Record<string, number>; // Score per category
  maxCategoryScore: number;          // Highest category score
  
  // Risk characteristics
  avgRiskConfidence: number;        // Average confidence across risks
  riskDiversity: number;             // Number of unique risk types
  criticalRisks: number;             // Number of critical risks
}
```

### 3. Historical Features

Features derived from historical data:

```typescript
interface HistoricalFeatures {
  // Owner performance
  ownerWinRate: number;             // Owner's historical win rate
  ownerAvgDealSize: number;         // Owner's average deal size
  ownerDealCount: number;            // Owner's total deal count
  ownerDaysToClose: number;         // Owner's average days to close
  
  // Account performance
  accountWinRate: number;            // Account's historical win rate
  accountDealCount: number;          // Account's total deal count
  accountAvgDealSize: number;        // Account's average deal size
  accountHealth: number;             // Account health score (0-1)
  
  // Industry/Stage patterns
  industryWinRate: number;          // Industry win rate
  stageWinRate: number;              // Stage win rate
  stageAvgDays: number;              // Average days in this stage
  
  // Similar opportunities
  similarDealsWinRate: number;      // Win rate of similar deals
  similarDealsAvgValue: number;     // Average value of similar deals
  similarDealsCount: number;        // Number of similar deals
}
```

### 4. Relationship Features

Features from related entities:

```typescript
interface RelationshipFeatures {
  // Stakeholder features
  stakeholderCount: number;        // Number of stakeholders
  stakeholderChangeCount: number;   // Number of stakeholder changes
  daysSinceStakeholderChange: number; // Days since last change
  
  // Activity features
  activityCount: number;             // Total activity count
  activityCountLast7Days: number;   // Activities in last 7 days
  activityCountLast30Days: number;  // Activities in last 30 days
  avgActivityInterval: number;       // Average days between activities
  
  // Document features
  documentCount: number;             // Number of documents
  documentCountLast30Days: number;   // Documents in last 30 days
  avgDocumentSize: number;           // Average document size
  
  // Communication features
  emailCount: number;                // Email count
  meetingCount: number;              // Meeting count
  callCount: number;                 // Call count
}
```

### 5. Temporal Features

Time-based features:

```typescript
interface TemporalFeatures {
  // Time of year
  month: number;                     // Month (1-12)
  quarter: number;                    // Quarter (1-4)
  dayOfWeek: number;                  // Day of week (0-6)
  isMonthEnd: boolean;                // Within 3 days of month end
  isQuarterEnd: boolean;              // Within 7 days of quarter end
  isYearEnd: boolean;                 // Within 30 days of year end
  
  // Time-based ratios
  daysToCloseRatio: number;          // daysToClose / daysSinceCreated
  activityRatio: number;              // activityCount / daysSinceCreated
  stageProgressRatio: number;         // Current stage index / total stages
}
```

### 6. Derived Features

Computed features from combinations:

```typescript
interface DerivedFeatures {
  // Value-based
  valueProbabilityRatio: number;    // dealValue * probability / 100
  revenueAtRisk: number;             // dealValue * riskScore
  riskAdjustedValue: number;          // dealValue - revenueAtRisk
  
  // Risk-based
  riskVelocity: number;               // Change in risk score over time
  riskAcceleration: number;          // Rate of change of risk velocity
  
  // Activity-based
  activityVelocity: number;           // Activities per day
  activityTrend: number;              // Trend in activity (increasing/decreasing)
  
  // Composite scores
  healthScore: number;               // Composite health score
  urgencyScore: number;               // Composite urgency score
}
```

## Feature Extraction Process

### Step 1: Data Collection (Signals)

```pseudocode
// Feature Extraction: Signals → Features
async function extractFeatures(opportunityId, tenantId) {
  // 1. Load opportunity shard (signals)
  opportunity = await shardRepository.get(opportunityId, tenantId)
  
  // 2. Load related shards (signals)
  relatedShards = await relationshipService.getRelatedShards(
    opportunityId,
    tenantId
  )
  
  // 3. Load risk snapshot (if exists) - signals from risk detection
  riskSnapshot = await getRiskSnapshot(opportunityId, tenantId)
  
  // 4. Load historical data (memory layer)
  historicalData = await getHistoricalData(opportunity, tenantId)
  
  // 5. Extract features (transform signals to features)
  return {
    ...extractOpportunityFeatures(opportunity),      // Signals → Features
    ...extractRiskFeatures(riskSnapshot),            // Risk signals → Features
    ...extractHistoricalFeatures(opportunity, historicalData),  // Memory → Features
    ...extractRelationshipFeatures(relatedShards),   // Relationship signals → Features
    ...extractTemporalFeatures(opportunity),         // Temporal signals → Features
    ...computeDerivedFeatures(opportunity, riskSnapshot)  // Derived features
  }
}
```

**CAIS Context**: This step collects **signals** (raw data) from the Data Layer (CAIS Layer 1) and transforms them into **features** (machine-readable) for the Predictive Model Layer (CAIS Layer 3).

### Step 2: Feature Transformation

#### Categorical Encoding

```typescript
function encodeCategorical(features: RawFeatures): EncodedFeatures {
  // One-hot encoding for stage
  const stageEncoded = oneHotEncode(features.stage, STAGE_VALUES);
  
  // One-hot encoding for industry
  const industryEncoded = oneHotEncode(features.industry, INDUSTRY_VALUES);
  
  // Embedding for owner (pre-trained embeddings)
  const ownerEmbedding = getOwnerEmbedding(features.ownerId);
  
  return {
    ...features,
    stageEncoded,
    industryEncoded,
    ownerEmbedding
  };
}
```

#### Numerical Normalization

```typescript
function normalizeNumerical(features: EncodedFeatures): NormalizedFeatures {
  // Min-max normalization for deal value
  const normalizedDealValue = minMaxNormalize(
    features.dealValue,
    MIN_DEAL_VALUE,
    MAX_DEAL_VALUE
  );
  
  // Z-score normalization for days to close
  const normalizedDaysToClose = zScoreNormalize(
    features.daysToClose,
    DAYS_TO_CLOSE_MEAN,
    DAYS_TO_CLOSE_STD
  );
  
  // Log transformation for skewed features
  const logDealValue = Math.log1p(features.dealValue);
  
  return {
    ...features,
    normalizedDealValue,
    normalizedDaysToClose,
    logDealValue
  };
}
```

#### Temporal Feature Engineering

```typescript
function extractTemporalFeatures(opportunity: Shard): TemporalFeatures {
  const now = new Date();
  const createdDate = new Date(opportunity.createdAt);
  const closeDate = opportunity.structuredData.closeDate 
    ? new Date(opportunity.structuredData.closeDate) 
    : null;
  
  return {
    month: now.getMonth() + 1,
    quarter: Math.floor(now.getMonth() / 3) + 1,
    dayOfWeek: now.getDay(),
    isMonthEnd: isWithinDays(now, getMonthEnd(now), 3),
    isQuarterEnd: isWithinDays(now, getQuarterEnd(now), 7),
    isYearEnd: isWithinDays(now, getYearEnd(now), 30),
    daysToCloseRatio: closeDate 
      ? daysBetween(now, closeDate) / daysBetween(createdDate, now)
      : 0
  };
}
```

### Step 3: Feature Selection

Not all features are used for all models. Feature selection is model-specific:

```typescript
const FEATURE_SETS = {
  risk_scoring: [
    'dealValue',
    'probability',
    'daysToClose',
    'riskScore',
    'categoryScores',
    'ownerWinRate',
    'accountHealth',
    'industry',
    'stage',
    'activityCount',
    'stakeholderCount',
    // ... more features
  ],
  forecasting: [
    'dealValue',
    'probability',
    'daysToClose',
    'riskScore',
    'ownerWinRate',
    'accountWinRate',
    'industry',
    'stage',
    'historicalRevenue',
    'seasonality',
    'temporalFeatures',
    // ... more features
  ],
  recommendations: [
    'userId',
    'userFeatures',
    'itemFeatures',
    'userItemInteractions',
    'contextFeatures',
    'industry',
    'similarityFeatures',
    'temporalFeatures',
    // ... more features
  ]
};
```

## Feature Store

### Storage

Features are stored in multiple locations:

1. **Redis Cache**: Cached features for quick access (TTL: 15 minutes)
2. **Cosmos DB**: Historical features for training data
3. **In-Memory**: During inference for performance

### Feature Versioning (CAIS Memory Layer)

Features are versioned to handle schema changes and prevent training/serving skew. This is a **critical operational standard** (see [ML_OPERATIONAL_STANDARDS.md](ML_OPERATIONAL_STANDARDS.md)).

**CAIS Context**: Feature versioning is part of the CAIS **memory layer** (Data Layer - CAIS Layer 1). It ensures that:
- Training jobs use consistent feature versions (reproducibility)
- Inference uses compatible feature versions (no training/serving skew)
- Feature evolution is tracked and managed (lineage)

#### Feature Interface

Each feature has explicit versioning metadata:

```typescript
interface Feature {
  featureName: string;              // Feature identifier (e.g., "dealValue")
  version: string;                  // Feature version (e.g., "v1", "v2")
  source: string;                   // Source system or computation method
  computationLogicHash: string;    // Hash of computation logic for lineage
  createdAt: Date;                  // When this version was created
  deprecatedAt?: Date;              // When this version was deprecated
}

interface FeatureSchema {
  version: string;                  // Schema version (e.g., "v1.0")
  features: Array<{
    name: string;
    type: 'numerical' | 'categorical' | 'boolean' | 'embedding';
    description: string;
    normalization?: 'minmax' | 'zscore' | 'log' | 'none';
    encoding?: 'onehot' | 'embedding' | 'label';
    // Feature versioning metadata
    featureVersion: string;         // Individual feature version
    source: string;                  // Source system
    computationLogicHash: string; // Hash of computation logic
  }>;
  createdAt: Date;
  deprecatedAt?: Date;
}
```

#### Phase 1: Minimum Viable Versioning

For Phase 1, we enforce simple versioning without full lineage graphs:

- Feature name + version tracking
- Source system identification
- Computation logic hash (for change detection)
- Basic compatibility checking

**Not included in Phase 1:**
- Full lineage graphs (e.g., Feast-like dependency tracking)
- Complex feature dependency resolution
- Automatic feature migration

#### Version Pinning and Compatibility

**Training Pipeline:**
- Training jobs **must** pin feature versions
- Feature version metadata stored with training job configuration
- Ensures reproducibility of training data

**Inference Pipeline:**
- Inference uses latest compatible version by default
- Compatibility checked via version schema (semantic versioning)
- Falls back to pinned version if compatibility check fails

```typescript
// Feature version lookup for training (pinned)
async function getFeatureVersionForTraining(
  featureName: string,
  trainingJobId: string
): Promise<Feature> {
  // Check if training job has pinned version
  const pinnedVersion = await getPinnedFeatureVersion(trainingJobId, featureName);
  if (pinnedVersion) {
    return pinnedVersion;
  }
  
  // Use latest stable version
  return await getLatestStableVersion(featureName);
}

// Feature version lookup for inference (latest compatible)
async function getFeatureVersionForInference(
  featureName: string,
  modelVersion: string
): Promise<Feature> {
  // Get model's required feature version
  const modelFeatureVersion = await getModelFeatureVersion(modelVersion, featureName);
  
  // Get latest compatible version
  return await getLatestCompatibleVersion(featureName, modelFeatureVersion);
}

// Compatibility checking
function isCompatibleVersion(
  featureVersion: string,
  requiredVersion: string
): boolean {
  // Semantic versioning compatibility check
  // Major version must match, minor/patch can be >=
  const [reqMajor] = requiredVersion.split('.').map(Number);
  const [featMajor] = featureVersion.split('.').map(Number);
  
  return featMajor === reqMajor;
}
```

#### Enforcement

**Training Pipeline Enforcement:**
```typescript
async function prepareTrainingFeatures(
  snapshots: RiskSnapshot[],
  trainingJobId: string
): Promise<TrainingExample[]> {
  // Pin feature versions for this training job
  const featureVersions = await pinFeatureVersions(trainingJobId, [
    'dealValue',
    'probability',
    'riskScore',
    // ... all features used
  ]);
  
  // Store pinned versions in training job metadata
  await storeTrainingJobMetadata(trainingJobId, {
    featureVersions,
    pinnedAt: new Date()
  });
  
  // Extract features using pinned versions
  const examples = [];
  for (const snapshot of snapshots) {
    const features = await extractFeaturesWithVersions(
      snapshot,
      featureVersions  // Use pinned versions
    );
    examples.push({ ...snapshot, features });
  }
  
  return examples;
}
```

**Inference Pipeline Enforcement:**
```typescript
async function extractFeaturesForInference(
  opportunityId: string,
  modelVersion: string
): Promise<FeatureVector> {
  // Get model's required feature versions
  const modelMetadata = await getModelMetadata(modelVersion);
  const requiredVersions = modelMetadata.featureVersions;
  
  // Extract features with version compatibility check
  const features: FeatureVector = {};
  for (const [featureName, requiredVersion] of Object.entries(requiredVersions)) {
    // Get latest compatible version
    const feature = await getFeatureVersionForInference(featureName, requiredVersion);
    
    // Validate compatibility
    if (!isCompatibleVersion(feature.version, requiredVersion)) {
      throw new Error(
        `Feature ${featureName} version ${feature.version} is not compatible with model requirement ${requiredVersion}`
      );
    }
    
    // Extract feature value
    features[featureName] = await computeFeature(feature, opportunityId);
  }
  
  return features;
}
```

### Feature Statistics

Track feature statistics for normalization and validation:

```typescript
interface FeatureStatistics {
  featureName: string;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
  missingRate: number;
  uniqueValues?: number;
  lastUpdated: Date;
}
```

## Feature Engineering Pipeline

### Training Data Preparation

```typescript
async function prepareTrainingFeatures(
  riskSnapshots: RiskSnapshot[],
  outcomes: Map<string, 'won' | 'lost'>
): Promise<TrainingExample[]> {
  const examples: TrainingExample[] = [];
  
  for (const snapshot of riskSnapshots) {
    // Extract features at snapshot time
    const features = await extractFeaturesAtTime(
      snapshot.opportunityId,
      snapshot.tenantId,
      snapshot.snapshotDate
    );
    
    // Get labels from outcome
    const outcome = outcomes.get(snapshot.opportunityId);
    const labels = {
      actualRiskScore: snapshot.riskScore,
      actualOutcome: outcome || null,
      actualRevenueAtRisk: snapshot.revenueAtRisk
    };
    
    examples.push({
      id: snapshot.id,
      opportunityId: snapshot.opportunityId,
      tenantId: snapshot.tenantId,
      snapshotDate: snapshot.snapshotDate,
      features,
      labels,
      createdAt: snapshot.createdAt,
      outcomeDate: outcome ? getOutcomeDate(snapshot.opportunityId) : undefined
    });
  }
  
  return examples;
}
```

### Feature Validation

```typescript
function validateFeatures(features: FeatureVector): ValidationResult {
  const errors: string[] = [];
  
  // Check for missing required features
  const requiredFeatures = ['dealValue', 'probability', 'riskScore'];
  for (const feature of requiredFeatures) {
    if (features[feature] === undefined || features[feature] === null) {
      errors.push(`Missing required feature: ${feature}`);
    }
  }
  
  // Check for invalid ranges
  if (features.probability < 0 || features.probability > 100) {
    errors.push(`Invalid probability: ${features.probability}`);
  }
  
  // Check for NaN or Infinity
  for (const [key, value] of Object.entries(features)) {
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
      errors.push(`Invalid numeric value for ${key}: ${value}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Feature Importance

Track feature importance for model interpretability:

```typescript
interface FeatureImportance {
  featureName: string;
  importance: number;                // Importance score (0-1)
  modelType: string;                  // Model this applies to
  method: 'shap' | 'permutation' | 'coefficient';
  calculatedAt: Date;
}

// Example: Calculate SHAP values for feature importance
async function calculateFeatureImportance(
  model: Model,
  testData: FeatureVector[]
): Promise<FeatureImportance[]> {
  const shapValues = await calculateSHAP(model, testData);
  
  return Object.entries(shapValues).map(([feature, importance]) => ({
    featureName: feature,
    importance: Math.abs(importance),
    modelType: model.type,
    method: 'shap',
    calculatedAt: new Date()
  }));
}
```

## Best Practices

### 1. Handle Missing Values

```typescript
function handleMissingValues(features: FeatureVector): FeatureVector {
  return {
    ...features,
    // Use median for numerical features
    dealValue: features.dealValue ?? getMedian('dealValue'),
    // Use mode for categorical features
    stage: features.stage ?? getMode('stage'),
    // Use default for boolean features
    hasCloseDate: features.hasCloseDate ?? false
  };
}
```

### 2. Handle Outliers

```typescript
function handleOutliers(features: FeatureVector): FeatureVector {
  return {
    ...features,
    // Cap outliers at 99th percentile
    dealValue: Math.min(
      features.dealValue,
      getPercentile('dealValue', 99)
    ),
    // Use IQR method for days to close
    daysToClose: capOutlierIQR(features.daysToClose, 'daysToClose')
  };
}
```

### 3. Feature Scaling

Different models require different scaling:
- **XGBoost/LightGBM**: Tree-based models don't require scaling
- **Neural Networks**: Require normalization (min-max or z-score)
- **Linear Models**: Benefit from standardization

### 4. Feature Engineering for Time Series

For temporal patterns:
- Rolling averages (7-day, 30-day)
- Rate of change
- Seasonal patterns
- Trend detection

## Performance Optimization

### Caching Strategy

- **Feature Cache**: Cache extracted features for 15 minutes
- **Historical Cache**: Cache historical aggregations for 1 hour
- **Statistics Cache**: Cache feature statistics for 24 hours

### Batch Processing

- Extract features in batches for multiple opportunities
- Use parallel processing for independent features
- Pre-compute historical features during off-peak hours

## Monitoring

### Feature Quality Metrics

- **Missing Rate**: Percentage of missing values
- **Outlier Rate**: Percentage of outliers
- **Distribution Drift**: Changes in feature distributions over time
- **Correlation Changes**: Changes in feature correlations

### Alerts

- Alert when missing rate > 10%
- Alert when distribution drift detected
- Alert when feature statistics change significantly
