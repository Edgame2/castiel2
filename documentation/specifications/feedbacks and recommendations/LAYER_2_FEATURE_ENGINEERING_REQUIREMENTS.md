# Layer 2: Feature Engineering - Detailed Requirements Document

**Document Version:** 1.0  
**Date:** January 2025  
**Status:** Comprehensive Requirements Specification  
**Layer:** CAIS Layer 2 - Feature Engineering

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Service Implementation](#service-implementation)
6. [Data Schemas](#data-schemas)
7. [API Specifications](#api-specifications)
8. [Integration Points](#integration-points)
9. [Testing Requirements](#testing-requirements)
10. [Deployment Requirements](#deployment-requirements)
11. [Monitoring & Observability](#monitoring--observability)
12. [Security Requirements](#security-requirements)
13. [Error Handling](#error-handling)
14. [Performance Optimization](#performance-optimization)

---

## Executive Summary

### Purpose
The Feature Engineering Layer (CAIS Layer 2) transforms raw opportunity signals from the Data Layer into machine-readable features for ML model consumption. This layer is critical for ML system success as it bridges business data and predictive models.

### Scope
This document specifies requirements for:
- Feature extraction from opportunities and related entities
- Feature transformation (encoding, normalization, temporal)
- Feature versioning and lineage tracking
- Feature storage and caching
- Feature quality monitoring
- Training/serving consistency guarantees

### Key Principles
1. **Never feed raw CRM objects to models** - Always transform to explicit features
2. **Version everything** - Features, transformations, and computation logic
3. **Prevent training/serving skew** - Pin feature versions for training, resolve for inference
4. **Cache aggressively** - Features are expensive to compute
5. **Monitor quality** - Track missing rates, outliers, drift

### Success Metrics
- Feature extraction latency: <500ms (p95)
- Feature cache hit rate: >80%
- Training/serving consistency: 100% (zero skew)
- Feature quality: <10% missing rate per feature
- Feature versioning: 100% coverage

---

## Architecture Overview

### Layer Position in CAIS
```
Layer 1: Data Layer (Cosmos DB, Redis)
    ↓ (Raw opportunity signals)
Layer 2: Feature Engineering ← YOU ARE HERE
    ↓ (Machine-readable features)
Layer 3: ML Prediction
    ↓ (Numeric predictions)
Layer 4: Explanation
```

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                   Feature Engineering Layer                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  FeatureStore    │      │  FeatureVersion  │            │
│  │  Service         │◄────►│  Manager         │            │
│  └────────┬─────────┘      └──────────────────┘            │
│           │                                                  │
│           ├──► Feature Extraction                           │
│           │    • Opportunity Features                       │
│           │    • Risk Features                              │
│           │    • Historical Features                        │
│           │    • Relationship Features                      │
│           │    • Temporal Features                          │
│           │                                                  │
│           ├──► Feature Transformation                       │
│           │    • Categorical Encoding                       │
│           │    • Numerical Normalization                    │
│           │    • Temporal Engineering                       │
│           │    • Aggregation                                │
│           │                                                  │
│           ├──► Feature Storage                              │
│           │    • Cosmos DB (persistent)                     │
│           │    • Redis (cache)                              │
│           │    • Azure ML Datastore (training)              │
│           │                                                  │
│           └──► Feature Quality                              │
│                • Missing rate tracking                      │
│                • Outlier detection                          │
│                • Distribution monitoring                    │
│                • Drift detection                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### FeatureStoreService
**Primary Owner:** Feature extraction and transformation orchestration  
**Responsibilities:**
- Extract features from opportunities and related entities
- Apply transformations (encoding, normalization)
- Manage feature versioning
- Cache features for performance
- Export features for training
- Validate feature quality

#### FeatureVersionManager
**Primary Owner:** Feature version lifecycle management  
**Responsibilities:**
- Pin feature versions for training jobs
- Resolve latest compatible versions for inference
- Track feature lineage
- Prevent training/serving skew
- Manage feature deprecation

#### FeatureQualityMonitor
**Primary Owner:** Feature quality assurance  
**Responsibilities:**
- Track feature statistics (mean, std, min, max)
- Monitor missing rates
- Detect outliers
- Monitor distribution drift
- Alert on quality degradation

---

## Functional Requirements

### FR-1: Feature Extraction

#### FR-1.1: Opportunity Features
**Priority:** Critical  
**Description:** Extract core opportunity attributes

**Requirements:**
- **FR-1.1.1:** Extract `dealValue` (numeric, required)
  - Source: `opportunity.structuredData.amount`
  - Validation: Must be > 0
  - Missing handling: Reject opportunity (cannot train/predict without)
  
- **FR-1.1.2:** Extract `probability` (numeric, 0-1, required)
  - Source: `opportunity.structuredData.probability`
  - Validation: Must be between 0 and 1
  - Missing handling: Use stage-based default
  
- **FR-1.1.3:** Extract `stage` (categorical, required)
  - Source: `opportunity.structuredData.stage`
  - Validation: Must be in predefined list
  - Values: prospecting, qualification, proposal, negotiation, closed_won, closed_lost
  - Missing handling: Reject opportunity
  
- **FR-1.1.4:** Extract `industry` (categorical, optional)
  - Source: `account.structuredData.industry`
  - Validation: Map to standard industry taxonomy
  - Missing handling: Use "unknown" category
  
- **FR-1.1.5:** Extract `closeDate` (datetime, required)
  - Source: `opportunity.structuredData.closeDate`
  - Validation: Must be future date
  - Missing handling: Use 90 days from today
  
- **FR-1.1.6:** Extract `ownerId` (categorical, required)
  - Source: `opportunity.structuredData.ownerId`
  - Validation: Must be valid user ID
  - Missing handling: Use "unassigned"
  
- **FR-1.1.7:** Extract `accountId` (categorical, required)
  - Source: `opportunity.structuredData.accountId`
  - Validation: Must be valid account ID
  - Missing handling: Reject opportunity

**Acceptance Criteria:**
- All required features extracted without errors
- Missing data handled according to strategy
- Validation errors logged and raised
- Extraction latency <50ms

#### FR-1.2: Risk Features
**Priority:** Critical  
**Description:** Extract risk-related features from risk evaluation history

**Requirements:**
- **FR-1.2.1:** Extract `currentRiskScore` (numeric, 0-1, optional)
  - Source: Latest risk snapshot `riskScore`
  - Validation: Between 0 and 1
  - Missing handling: Use 0.5 (neutral risk)
  
- **FR-1.2.2:** Extract `categoryScores` (numeric array, 6 values, optional)
  - Source: Latest risk snapshot `categoryScores`
  - Categories: commercial, competitive, technical, legal, resource, timeline
  - Validation: Each score between 0 and 1
  - Missing handling: Use 0.5 for each category
  
- **FR-1.2.3:** Extract `detectedRiskCount` (numeric, optional)
  - Source: Count of detected risks in latest snapshot
  - Validation: Non-negative integer
  - Missing handling: Use 0
  
- **FR-1.2.4:** Extract `highConfidenceRiskCount` (numeric, optional)
  - Source: Count of risks with confidence > 0.7
  - Validation: Non-negative integer
  - Missing handling: Use 0
  
- **FR-1.2.5:** Extract `riskTrend` (numeric, optional)
  - Source: Change in risk score over last 30 days
  - Calculation: (current - 30d_ago) / 30d_ago
  - Validation: Between -1 and 1
  - Missing handling: Use 0 (no trend)

**Acceptance Criteria:**
- Risk features extracted from latest snapshot
- Historical risk data used for trend calculation
- Missing snapshots handled gracefully
- Extraction latency <100ms

#### FR-1.3: Historical Features
**Priority:** High  
**Description:** Extract historical performance metrics

**Requirements:**
- **FR-1.3.1:** Extract `ownerWinRate` (numeric, 0-1, optional)
  - Source: Calculate from owner's closed opportunities
  - Calculation: won / (won + lost) for last 12 months
  - Validation: Between 0 and 1
  - Missing handling: Use global average win rate
  
- **FR-1.3.2:** Extract `accountWinRate` (numeric, 0-1, optional)
  - Source: Calculate from account's historical opportunities
  - Calculation: won / (won + lost) all time
  - Validation: Between 0 and 1
  - Missing handling: Use global average win rate
  
- **FR-1.3.3:** Extract `accountHealth` (numeric, 0-1, optional)
  - Source: Account health score from account shard
  - Validation: Between 0 and 1
  - Missing handling: Use 0.5 (neutral health)
  
- **FR-1.3.4:** Extract `similarDealsWinRate` (numeric, 0-1, optional)
  - Source: Calculate from similar deals (industry, size, stage)
  - Calculation: won / (won + lost) for similar deals
  - Validation: Between 0 and 1
  - Missing handling: Use global average win rate
  
- **FR-1.3.5:** Extract `averageDealCycle` (numeric, days, optional)
  - Source: Calculate from closed deals (industry, size)
  - Calculation: Average days from creation to close
  - Validation: Positive integer
  - Missing handling: Use 60 days (default)

**Acceptance Criteria:**
- Historical data queried efficiently (cached aggregations)
- Calculations accurate and reproducible
- Similar deal matching robust
- Extraction latency <200ms

#### FR-1.4: Relationship Features
**Priority:** Medium  
**Description:** Extract features from related entities

**Requirements:**
- **FR-1.4.1:** Extract `stakeholderCount` (numeric, optional)
  - Source: Count of related contact shards
  - Validation: Non-negative integer
  - Missing handling: Use 0
  
- **FR-1.4.2:** Extract `decisionMakerPresent` (boolean, optional)
  - Source: Check if any contact has role "decision_maker"
  - Validation: Boolean
  - Missing handling: Use false
  
- **FR-1.4.3:** Extract `activityCount` (numeric, optional)
  - Source: Count of activities (last 30 days)
  - Validation: Non-negative integer
  - Missing handling: Use 0
  
- **FR-1.4.4:** Extract `documentCount` (numeric, optional)
  - Source: Count of related documents
  - Validation: Non-negative integer
  - Missing handling: Use 0
  
- **FR-1.4.5:** Extract `meetingCount` (numeric, optional)
  - Source: Count of meetings (last 30 days)
  - Validation: Non-negative integer
  - Missing handling: Use 0
  
- **FR-1.4.6:** Extract `emailCount` (numeric, optional)
  - Source: Count of emails (last 30 days)
  - Validation: Non-negative integer
  - Missing handling: Use 0

**Acceptance Criteria:**
- Related entities queried via ShardRelationshipService
- Counts accurate and efficient
- Missing relationships handled gracefully
- Extraction latency <150ms

#### FR-1.5: Temporal Features
**Priority:** High  
**Description:** Extract time-based features

**Requirements:**
- **FR-1.5.1:** Extract `daysToClose` (numeric, optional)
  - Source: Calculate from closeDate and current date
  - Calculation: (closeDate - today).days
  - Validation: Positive integer
  - Missing handling: Use 90 days
  
- **FR-1.5.2:** Extract `month` (categorical, required)
  - Source: Extract from current date
  - Validation: Integer 1-12
  - Missing handling: N/A (always available)
  
- **FR-1.5.3:** Extract `quarter` (categorical, required)
  - Source: Calculate from current date
  - Calculation: Math.floor(month / 3) + 1
  - Validation: Integer 1-4
  - Missing handling: N/A (always available)
  
- **FR-1.5.4:** Extract `dayOfWeek` (categorical, optional)
  - Source: Extract from current date
  - Validation: Integer 0-6 (0=Sunday)
  - Missing handling: N/A (always available)
  
- **FR-1.5.5:** Extract `isMonthEnd` (boolean, optional)
  - Source: Check if current date within 3 days of month end
  - Calculation: abs(today - month_end) <= 3
  - Validation: Boolean
  - Missing handling: N/A (always available)
  
- **FR-1.5.6:** Extract `isQuarterEnd` (boolean, optional)
  - Source: Check if current date within 7 days of quarter end
  - Calculation: abs(today - quarter_end) <= 7
  - Validation: Boolean
  - Missing handling: N/A (always available)
  
- **FR-1.5.7:** Extract `seasonality` (numeric, optional)
  - Source: Historical seasonal multiplier for industry/month
  - Calculation: revenue_in_month / average_monthly_revenue
  - Validation: Positive float
  - Missing handling: Use 1.0 (no seasonality)
  
- **FR-1.5.8:** Extract `daysSinceCreated` (numeric, optional)
  - Source: Calculate from opportunity creation date
  - Calculation: (today - createdDate).days
  - Validation: Non-negative integer
  - Missing handling: Use 0
  
- **FR-1.5.9:** Extract `daysSinceLastActivity` (numeric, optional)
  - Source: Calculate from latest activity timestamp
  - Calculation: (today - lastActivityDate).days
  - Validation: Non-negative integer
  - Missing handling: Use 999 (very stale)

**Acceptance Criteria:**
- All temporal features calculated accurately
- Timezone handling consistent (use UTC)
- Date arithmetic handles edge cases (leap years, month boundaries)
- Extraction latency <50ms

#### FR-1.6: Behavioral Features
**Priority:** Medium  
**Description:** Extract engagement and behavioral metrics

**Requirements:**
- **FR-1.6.1:** Extract `engagementRate` (numeric, 0-1, optional)
  - Source: Calculate from activities and duration
  - Calculation: activity_count / days_since_created
  - Validation: Non-negative float
  - Missing handling: Use 0
  
- **FR-1.6.2:** Extract `responseTime` (numeric, hours, optional)
  - Source: Average time to respond to emails/messages
  - Calculation: Average(response_time) for last 10 interactions
  - Validation: Non-negative float
  - Missing handling: Use 48 hours (default)
  
- **FR-1.6.3:** Extract `activityVelocity` (numeric, optional)
  - Source: Rate of change in activity count
  - Calculation: (current_week - prev_week) / prev_week
  - Validation: Float (can be negative)
  - Missing handling: Use 0 (no change)
  
- **FR-1.6.4:** Extract `budgetConfirmed` (boolean, optional)
  - Source: Check for budget confirmation in activities/notes
  - Validation: Boolean
  - Missing handling: Use false
  
- **FR-1.6.5:** Extract `competitorPresent` (boolean, optional)
  - Source: Check for competitor mentions in activities/notes
  - Validation: Boolean
  - Missing handling: Use false

**Acceptance Criteria:**
- Behavioral metrics calculated from recent activities
- NLP-based extractions (budget, competitor) accurate
- Missing activity data handled gracefully
- Extraction latency <200ms

### FR-2: Feature Transformation

#### FR-2.1: Categorical Encoding
**Priority:** Critical  
**Description:** Transform categorical features to numeric representations

**Requirements:**
- **FR-2.1.1:** Implement one-hot encoding for stage
  - Input: stage (string)
  - Output: stage_prospecting, stage_qualification, stage_proposal, stage_negotiation, stage_closed_won, stage_closed_lost (6 binary features)
  - Logic: Set 1 for matching stage, 0 for others
  - Handle unknown stages: Create "unknown" category
  
- **FR-2.1.2:** Implement one-hot encoding for industry
  - Input: industry (string)
  - Output: industry_{name} for each known industry (N binary features)
  - Logic: Set 1 for matching industry, 0 for others
  - Handle unknown industries: Create "industry_unknown" category
  - Limit: Max 50 industry categories (group rare industries into "other")
  
- **FR-2.1.3:** Implement owner embedding
  - Input: ownerId (string)
  - Output: owner_embedding (32-dimensional vector)
  - Logic: Use pre-trained owner embeddings based on historical performance
  - Handle unknown owners: Use zero vector or global average embedding
  
- **FR-2.1.4:** Implement account embedding
  - Input: accountId (string)
  - Output: account_embedding (32-dimensional vector)
  - Logic: Use pre-trained account embeddings based on historical data
  - Handle unknown accounts: Use zero vector or global average embedding
  
- **FR-2.1.5:** Implement label encoding for ordinal features
  - Input: stage (string)
  - Output: stage_ordinal (integer 0-5)
  - Mapping: prospecting=0, qualification=1, proposal=2, negotiation=3, closed_won=4, closed_lost=5
  - Use case: For models that benefit from ordinal relationships

**Acceptance Criteria:**
- Encoding consistent between training and inference
- Unknown categories handled gracefully
- Encoded features dimensionality documented
- Encoding latency <50ms per feature

#### FR-2.2: Numerical Normalization
**Priority:** Critical  
**Description:** Normalize numerical features for model consumption

**Requirements:**
- **FR-2.2.1:** Implement min-max normalization for dealValue
  - Input: dealValue (float)
  - Output: dealValue_normalized (float 0-1)
  - Formula: (value - min) / (max - min)
  - Parameters: min=0, max=10,000,000 (clip values outside range)
  - Versioning: Store min/max in feature metadata
  
- **FR-2.2.2:** Implement z-score normalization for daysToClose
  - Input: daysToClose (int)
  - Output: daysToClose_normalized (float)
  - Formula: (value - mean) / std
  - Parameters: mean=60, std=30 (update quarterly from data)
  - Versioning: Store mean/std in feature metadata
  
- **FR-2.2.3:** Implement log transformation for skewed features
  - Input: dealValue (float)
  - Output: dealValue_log (float)
  - Formula: log1p(value) = log(1 + value)
  - Use case: Reduce skewness in deal value distribution
  
- **FR-2.2.4:** Implement robust scaling for outlier-prone features
  - Input: activityCount (int)
  - Output: activityCount_robust (float)
  - Formula: (value - median) / IQR
  - Parameters: median, IQR (update quarterly)
  
- **FR-2.2.5:** Handle missing values in normalization
  - Strategy: Use 0 for normalized values (represents "missing")
  - Alternative: Use mean/median imputation
  - Document: Missing value handling strategy per feature

**Acceptance Criteria:**
- Normalization parameters stored and versioned
- Outliers handled robustly (clipping or robust scaling)
- Missing values imputed consistently
- Normalization latency <20ms per feature

#### FR-2.3: Temporal Engineering
**Priority:** High  
**Description:** Engineer time-based features

**Requirements:**
- **FR-2.3.1:** Implement cyclical encoding for month
  - Input: month (int 1-12)
  - Output: month_sin, month_cos (2 floats)
  - Formula: sin(2π × month / 12), cos(2π × month / 12)
  - Rationale: Preserve cyclical nature (December adjacent to January)
  
- **FR-2.3.2:** Implement cyclical encoding for dayOfWeek
  - Input: dayOfWeek (int 0-6)
  - Output: dayOfWeek_sin, dayOfWeek_cos (2 floats)
  - Formula: sin(2π × day / 7), cos(2π × day / 7)
  - Rationale: Preserve weekly cycles
  
- **FR-2.3.3:** Calculate days-to-close ratio
  - Input: daysToClose, daysSinceCreated
  - Output: daysToCloseRatio (float)
  - Formula: daysToClose / daysSinceCreated
  - Validation: Handle division by zero (return 0)
  
- **FR-2.3.4:** Calculate time pressure indicator
  - Input: daysToClose
  - Output: timePressure (float 0-1)
  - Formula: 1 / (1 + exp(0.1 × daysToClose)) (sigmoid)
  - Interpretation: 1 = high pressure (close soon), 0 = low pressure

**Acceptance Criteria:**
- Cyclical features preserve temporal relationships
- Derived temporal features mathematically correct
- Edge cases handled (zero division, negative days)
- Engineering latency <30ms

#### FR-2.4: Aggregation Features
**Priority:** Medium  
**Description:** Create aggregated features from collections

**Requirements:**
- **FR-2.4.1:** Calculate rolling averages
  - Input: activity counts over last 7, 30, 90 days
  - Output: activity_7d_avg, activity_30d_avg, activity_90d_avg
  - Calculation: Sum(activities) / days for each window
  - Missing handling: Use 0 if no activity data
  
- **FR-2.4.2:** Calculate rate of change
  - Input: current value, previous value (e.g., risk score)
  - Output: rate_of_change (float)
  - Formula: (current - previous) / previous
  - Missing handling: Use 0 if previous unavailable
  
- **FR-2.4.3:** Calculate categorical aggregations
  - Input: List of related entities (contacts, activities)
  - Output: count, unique_count, mode, etc.
  - Example: stakeholder_roles_count, primary_stakeholder_role
  
- **FR-2.4.4:** Calculate statistical aggregations
  - Input: Historical numeric values (e.g., deal sizes)
  - Output: mean, median, std, min, max, percentiles
  - Use case: Industry benchmarking features

**Acceptance Criteria:**
- Aggregations calculated efficiently (use cached data)
- Statistical measures robust to outliers
- Missing data handled in aggregations
- Aggregation latency <100ms

### FR-3: Feature Versioning

#### FR-3.1: Version Management
**Priority:** Critical  
**Description:** Manage feature versions throughout lifecycle

**Requirements:**
- **FR-3.1.1:** Implement feature version naming
  - Format: `{featureName}_v{major}.{minor}`
  - Example: `dealValue_v1.0`, `ownerWinRate_v2.1`
  - Major version: Breaking changes (computation, schema)
  - Minor version: Non-breaking enhancements (bug fixes, optimizations)
  
- **FR-3.1.2:** Track feature computation logic
  - Store: Source code hash for feature computation
  - Store: Timestamp of logic change
  - Store: Change description
  - Store: Author of change
  
- **FR-3.1.3:** Pin feature versions for training
  - Input: Training job ID, list of feature names
  - Output: Map of feature name → pinned version
  - Logic: Pin to latest stable version at training time
  - Store: Pinned versions in training job metadata
  
- **FR-3.1.4:** Resolve feature versions for inference
  - Input: Model version, feature name
  - Output: Latest compatible feature version
  - Logic: Find highest version compatible with model
  - Compatibility: Major versions must match
  
- **FR-3.1.5:** Deprecate old feature versions
  - Process: Mark version as deprecated
  - Grace period: 90 days before removal
  - Notification: Alert users of deprecated features
  - Removal: Delete deprecated versions after grace period

**Acceptance Criteria:**
- All features have explicit versions
- Training jobs pin feature versions
- Inference resolves versions correctly
- Deprecated features retired gracefully

#### FR-3.2: Compatibility Management
**Priority:** Critical  
**Description:** Ensure training/serving consistency

**Requirements:**
- **FR-3.2.1:** Define compatibility rules
  - Rule 1: Same major version = compatible
  - Rule 2: Different major version = incompatible
  - Rule 3: Minor version upgrade = forward compatible
  - Rule 4: Minor version downgrade = backward compatible within major version
  
- **FR-3.2.2:** Validate compatibility at inference
  - Check: Model requires feature version X
  - Check: Feature version Y available
  - Validate: Y compatible with X
  - Action: Reject inference if incompatible
  
- **FR-3.2.3:** Handle compatibility errors
  - Error: Incompatible feature version
  - Action: Log error with details
  - Action: Alert engineering team
  - Action: Fallback to rule-based prediction (if available)
  
- **FR-3.2.4:** Test compatibility before deployment
  - Test: Extract features using new version
  - Test: Compare with old version (spot check)
  - Test: Validate major version changes break compatibility
  - Test: Validate minor version changes maintain compatibility

**Acceptance Criteria:**
- Zero training/serving skew incidents
- Incompatible features rejected at inference
- Compatibility rules enforced automatically
- Tests validate compatibility logic

#### FR-3.3: Feature Lineage
**Priority:** High  
**Description:** Track feature dependencies and transformations

**Requirements:**
- **FR-3.3.1:** Record source data for each feature
  - Store: Source shard type (opportunity, account, etc.)
  - Store: Source field name
  - Store: Extraction timestamp
  - Store: Data quality metrics (missing rate, etc.)
  
- **FR-3.3.2:** Track feature transformations
  - Store: Transformation type (one-hot, normalize, etc.)
  - Store: Transformation parameters (min, max, mean, std)
  - Store: Transformation version
  - Store: Order of transformations (if chained)
  
- **FR-3.3.3:** Track feature dependencies
  - Store: Parent features (if derived)
  - Store: Child features (if used to create others)
  - Example: `daysToCloseRatio` depends on `daysToClose` and `daysSinceCreated`
  
- **FR-3.3.4:** Generate feature lineage report
  - Output: Directed acyclic graph (DAG) of feature dependencies
  - Output: Transformation pipeline for each feature
  - Output: Data sources for each feature
  - Use case: Debugging, auditing, documentation

**Acceptance Criteria:**
- Complete lineage tracked for all features
- Lineage queryable via API
- Lineage visualization available
- Lineage used for impact analysis

### FR-4: Feature Storage

#### FR-4.1: Persistent Storage (Cosmos DB)
**Priority:** Critical  
**Description:** Store feature snapshots for historical analysis

**Requirements:**
- **FR-4.1.1:** Store feature snapshots
  - Trigger: After feature extraction for opportunity
  - Data: FeatureSnapshot document (see schema)
  - Partition key: tenantId
  - TTL: 2 years (for historical analysis)
  
- **FR-4.1.2:** Store feature metadata
  - Data: FeatureMetadata document (see schema)
  - Partition key: "global" (shared across tenants)
  - Update frequency: On feature version changes
  
- **FR-4.1.3:** Store feature statistics
  - Data: FeatureStatistics (mean, std, etc.)
  - Update frequency: Daily batch job
  - Use case: Normalization, quality monitoring
  
- **FR-4.1.4:** Query features by opportunity
  - Query: Get latest feature snapshot for opportunity
  - Index: opportunityId, tenantId, timestamp
  - Performance: <100ms
  
- **FR-4.1.5:** Query features by time range
  - Query: Get feature snapshots between start and end date
  - Use case: Training data export
  - Performance: <1s for 10,000 snapshots

**Acceptance Criteria:**
- All feature snapshots persisted
- Metadata and statistics stored
- Queries performant
- Storage cost optimized (use Cosmos DB TTL)

#### FR-4.2: Cache Storage (Redis)
**Priority:** Critical  
**Description:** Cache features for low-latency access

**Requirements:**
- **FR-4.2.1:** Cache feature vectors
  - Key: `features:{tenantId}:{opportunityId}`
  - Value: Serialized FeatureVector (JSON or MessagePack)
  - TTL: Event-based invalidation (no fixed TTL)
  - Invalidation trigger: Opportunity updated
  
- **FR-4.2.2:** Cache feature statistics
  - Key: `feature_stats:{featureName}`
  - Value: Serialized FeatureStatistics
  - TTL: 24 hours
  - Refresh: Daily batch job
  
- **FR-4.2.3:** Cache feature metadata
  - Key: `feature_metadata:{featureName}`
  - Value: Serialized FeatureMetadata
  - TTL: 1 hour
  - Refresh: On metadata update
  
- **FR-4.2.4:** Implement cache warming
  - Trigger: Opportunity created/updated
  - Action: Pre-compute and cache features
  - Priority: High-value opportunities first
  
- **FR-4.2.5:** Handle cache misses
  - Action: Compute features on-demand
  - Action: Cache result for future requests
  - Logging: Log cache miss rate

**Acceptance Criteria:**
- Cache hit rate >80%
- Cache invalidation immediate on opportunity updates
- Cache warming reduces cold start latency
- Cache memory usage monitored

#### FR-4.3: Training Data Storage (Azure ML Datastore)
**Priority:** High  
**Description:** Export features for model training

**Requirements:**
- **FR-4.3.1:** Export feature snapshots to Azure ML Datastore
  - Format: Parquet (columnar, compressed)
  - Schema: Same as FeatureSnapshot
  - Partitioning: By tenantId, date
  - Frequency: Daily batch job
  
- **FR-4.3.2:** Create training datasets
  - Input: Date range, feature list, outcome filter
  - Output: Parquet file with features + labels
  - Validation: Check for data quality (missing rates, outliers)
  
- **FR-4.3.3:** Version training datasets
  - Naming: `training_data_{modelType}_{startDate}_{endDate}_{version}.parquet`
  - Metadata: Store feature versions, data statistics
  - Immutability: Training datasets never modified after creation
  
- **FR-4.3.4:** Register datasets in Azure ML
  - Action: Register dataset with Azure ML SDK
  - Metadata: Feature versions, data lineage, statistics
  - Use case: Reproducible training

**Acceptance Criteria:**
- Training data exported daily
- Datasets versioned and immutable
- Azure ML registration successful
- Data quality validated before export

### FR-5: Feature Quality Monitoring

#### FR-5.1: Missing Data Tracking
**Priority:** High  
**Description:** Monitor and alert on missing feature values

**Requirements:**
- **FR-5.1.1:** Calculate missing rate per feature
  - Formula: missing_count / total_count
  - Frequency: Real-time (per feature extraction)
  - Storage: Store in FeatureStatistics
  
- **FR-5.1.2:** Alert on high missing rates
  - Threshold: >10% missing rate
  - Action: Send alert to engineering team
  - Action: Log to Application Insights
  
- **FR-5.1.3:** Track missing rate trends
  - Storage: Daily missing rate snapshots
  - Visualization: Time series chart
  - Alerting: Alert on upward trend (5%+ increase)
  
- **FR-5.1.4:** Identify root causes
  - Analysis: Which source data fields are missing?
  - Analysis: Which opportunities have missing features?
  - Output: Missing data report

**Acceptance Criteria:**
- Missing rates calculated accurately
- Alerts triggered appropriately
- Trends tracked over time
- Root cause analysis available

#### FR-5.2: Outlier Detection
**Priority:** Medium  
**Description:** Detect and handle outliers in feature values

**Requirements:**
- **FR-5.2.1:** Define outlier thresholds
  - Method: IQR (Interquartile Range) method
  - Threshold: Values < Q1 - 1.5×IQR or > Q3 + 1.5×IQR
  - Alternative: Z-score method (values > 3 std from mean)
  
- **FR-5.2.2:** Detect outliers during extraction
  - Check: Compare feature value against thresholds
  - Log: Log outlier instances
  - Alert: Alert if outlier rate > 5%
  
- **FR-5.2.3:** Handle outliers
  - Strategy 1: Clip to threshold (winsorization)
  - Strategy 2: Transform (log, sqrt)
  - Strategy 3: Flag as outlier (add boolean feature)
  - Configuration: Outlier handling per feature
  
- **FR-5.2.4:** Track outlier rates
  - Metric: outlier_count / total_count per feature
  - Storage: Store in FeatureStatistics
  - Alerting: Alert on spike in outlier rate

**Acceptance Criteria:**
- Outliers detected accurately
- Handling strategies applied correctly
- Outlier rates tracked
- Alerts triggered on anomalies

#### FR-5.3: Distribution Monitoring
**Priority:** Medium  
**Description:** Monitor feature value distributions for drift

**Requirements:**
- **FR-5.3.1:** Calculate distribution statistics
  - Metrics: mean, median, std, min, max, percentiles (5, 25, 50, 75, 95)
  - Frequency: Daily batch job
  - Storage: Store in FeatureStatistics
  
- **FR-5.3.2:** Compare distributions over time
  - Method: Kolmogorov-Smirnov (KS) test
  - Compare: Current distribution vs baseline (training data)
  - Threshold: KS statistic > 0.1 indicates drift
  
- **FR-5.3.3:** Visualize distributions
  - Chart: Histogram of feature values
  - Chart: Time series of distribution statistics
  - Chart: Comparison of current vs baseline distribution
  
- **FR-5.3.4:** Alert on distribution drift
  - Threshold: KS statistic > 0.1
  - Action: Alert engineering team
  - Action: Trigger retraining evaluation

**Acceptance Criteria:**
- Distribution statistics calculated daily
- Drift detection accurate
- Visualizations available in UI
- Alerts triggered appropriately

---

## Non-Functional Requirements

### NFR-1: Performance

#### NFR-1.1: Latency
**Requirements:**
- Feature extraction for single opportunity: <500ms (p95), <200ms (p50)
- Feature extraction batch (100 opportunities): <5s (p95)
- Feature transformation: <50ms per feature (p95)
- Cache read: <10ms (p95)
- Cache write: <20ms (p95)
- Database read (Cosmos DB): <100ms (p95)
- Database write (Cosmos DB): <200ms (p95)

**Measurement:**
- Use Application Insights custom metrics
- Track p50, p95, p99 latencies
- Alert if p95 exceeds threshold by 20%

#### NFR-1.2: Throughput
**Requirements:**
- Feature extraction requests: 100+ concurrent requests
- Batch feature extraction: 1000+ opportunities per batch
- Cache operations: 10,000+ ops/second
- Database writes: 500+ writes/second

**Measurement:**
- Track requests per second
- Monitor database RU consumption
- Monitor cache memory usage

#### NFR-1.3: Resource Utilization
**Requirements:**
- CPU usage: <70% average, <90% peak
- Memory usage: <80% of allocated memory
- Cache memory: <4GB per cache instance
- Database RU consumption: <1000 RU/s average

**Measurement:**
- Azure Monitor metrics
- Alert on resource exhaustion

### NFR-2: Scalability

#### NFR-2.1: Horizontal Scaling
**Requirements:**
- FeatureStoreService: Scale to 5+ instances
- Redis cache: Scale to cluster mode (3+ nodes)
- Cosmos DB: Auto-scale RU/s (400-10,000)

#### NFR-2.2: Data Volume
**Requirements:**
- Feature snapshots: 10,000+ per day
- Historical snapshots: 2 years retention (7M+ documents)
- Training data export: 100,000+ examples per export

#### NFR-2.3: Tenant Isolation
**Requirements:**
- Multi-tenant data isolation (partition by tenantId)
- Independent scaling per tenant (via RU allocation)
- Tenant-specific feature customization

### NFR-3: Reliability

#### NFR-3.1: Availability
**Requirements:**
- FeatureStoreService uptime: 99.9%
- Redis cache uptime: 99.9%
- Cosmos DB uptime: 99.99% (SLA)

#### NFR-3.2: Fault Tolerance
**Requirements:**
- Graceful degradation: If cache unavailable, read from database
- Retry logic: Exponential backoff for transient failures (max 3 retries)
- Circuit breaker: Disable service after 5 consecutive failures

#### NFR-3.3: Data Consistency
**Requirements:**
- Feature snapshots: Eventually consistent (acceptable for ML)
- Feature metadata: Strongly consistent (required for versioning)
- Cache invalidation: Immediate (on opportunity updates)

### NFR-4: Security

#### NFR-4.1: Data Encryption
**Requirements:**
- Encryption at rest: All data in Cosmos DB and Azure Blob Storage
- Encryption in transit: TLS 1.2+ for all API calls

#### NFR-4.2: Access Control
**Requirements:**
- RBAC: Role-based access to feature extraction endpoints
- Tenant isolation: Users can only access features for their tenant
- API authentication: JWT tokens for all API requests

#### NFR-4.3: PII Protection
**Requirements:**
- Detect PII in feature values
- Redact or anonymize PII before storage
- Log PII access for audit

### NFR-5: Observability

#### NFR-5.1: Logging
**Requirements:**
- Log all feature extraction requests
- Log feature quality issues (missing data, outliers)
- Log cache hit/miss rates
- Log latency metrics
- Structured logging (JSON format)

#### NFR-5.2: Metrics
**Requirements:**
- Custom metrics: feature_extraction_duration, feature_cache_hit_rate, feature_missing_rate, feature_outlier_rate
- System metrics: CPU, memory, database RU/s
- Alert thresholds: Define alerts for all metrics

#### NFR-5.3: Tracing
**Requirements:**
- Distributed tracing: Trace feature extraction across services
- Correlation IDs: Include correlation ID in all logs
- OpenTelemetry: Use OpenTelemetry for instrumentation

---

## Service Implementation

### FeatureStoreService

#### Class Structure
```typescript
export class FeatureStoreService {
  constructor(
    private readonly shardRepository: ShardRepositoryService,
    private readonly relationshipService: ShardRelationshipService,
    private readonly cachingService: CachingService,
    private readonly riskEvaluationService: RiskEvaluationService,
    private readonly logger: Logger
  ) {}

  // Core feature extraction
  async extractFeatures(
    opportunityId: string,
    tenantId: string,
    modelVersion?: string
  ): Promise<FeatureVector>

  async extractFeaturesForBatch(
    opportunityIds: string[],
    tenantId: string,
    modelVersion?: string
  ): Promise<Map<string, FeatureVector>>

  async getHistoricalFeatures(
    opportunityId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FeatureSnapshot[]>

  // Feature versioning
  async pinFeatureVersions(
    trainingJobId: string,
    featureNames: string[]
  ): Promise<FeatureVersionMap>

  async getFeatureVersionForInference(
    featureName: string,
    modelVersion: string
  ): Promise<FeatureVersion>

  isCompatibleVersion(
    featureVersion: string,
    requiredVersion: string
  ): boolean

  // Feature caching
  async cacheFeatures(
    opportunityId: string,
    tenantId: string,
    features: FeatureVector,
    ttl?: number
  ): Promise<void>

  async getCachedFeatures(
    opportunityId: string,
    tenantId: string
  ): Promise<FeatureVector | null>

  async invalidateCache(
    opportunityId: string,
    tenantId: string
  ): Promise<void>

  // Feature metadata
  async getFeatureSchema(): Promise<FeatureSchema>

  async getFeatureStatistics(
    featureName: string
  ): Promise<FeatureStatistics>

  async updateFeatureStatistics(
    featureName: string,
    values: number[]
  ): Promise<void>

  // Feature quality
  async trackFeatureQuality(
    featureName: string,
    values: number[]
  ): Promise<FeatureQualityMetrics>

  async detectOutliers(
    featureName: string,
    values: number[]
  ): Promise<OutlierResult>

  // Training data export
  async exportTrainingData(
    modelType: ModelType,
    startDate: Date,
    endDate: Date,
    options?: ExportOptions
  ): Promise<string>

  // Private helper methods
  private async extractOpportunityFeatures(
    opportunity: Shard,
    tenantId: string
  ): Promise<OpportunityFeatures>

  private async extractRiskFeatures(
    opportunityId: string,
    tenantId: string
  ): Promise<RiskFeatures>

  private async extractHistoricalFeatures(
    opportunityId: string,
    ownerId: string,
    accountId: string,
    tenantId: string
  ): Promise<HistoricalFeatures>

  private async extractRelationshipFeatures(
    opportunityId: string,
    tenantId: string
  ): Promise<RelationshipFeatures>

  private async extractTemporalFeatures(
    opportunity: Shard
  ): Promise<TemporalFeatures>

  private async extractBehavioralFeatures(
    opportunityId: string,
    tenantId: string
  ): Promise<BehavioralFeatures>

  private async transformCategorical(
    features: RawFeatures
  ): Promise<EncodedFeatures>

  private async transformNumerical(
    features: EncodedFeatures
  ): Promise<NormalizedFeatures>

  private async engineerTemporal(
    features: NormalizedFeatures
  ): Promise<TemporalEngineeredFeatures>

  private async computeAggregations(
    features: TemporalEngineeredFeatures
  ): Promise<AggregatedFeatures>

  private validateFeatures(
    features: FeatureVector
  ): ValidationResult

  private handleMissingData(
    features: FeatureVector
  ): FeatureVector
}
```

#### Method Implementations

##### extractFeatures
```typescript
async extractFeatures(
  opportunityId: string,
  tenantId: string,
  modelVersion?: string
): Promise<FeatureVector> {
  const startTime = Date.now();
  
  try {
    // 1. Check cache
    const cached = await this.getCachedFeatures(opportunityId, tenantId);
    if (cached) {
      this.logger.info('Feature cache hit', { opportunityId, tenantId });
      this.trackMetric('feature_cache_hit_rate', 1);
      return cached;
    }
    this.trackMetric('feature_cache_hit_rate', 0);

    // 2. Get opportunity
    const opportunity = await this.shardRepository.getById(
      opportunityId,
      tenantId
    );
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // 3. Extract features in parallel
    const [
      opportunityFeatures,
      riskFeatures,
      historicalFeatures,
      relationshipFeatures,
      temporalFeatures,
      behavioralFeatures
    ] = await Promise.all([
      this.extractOpportunityFeatures(opportunity, tenantId),
      this.extractRiskFeatures(opportunityId, tenantId),
      this.extractHistoricalFeatures(
        opportunityId,
        opportunity.structuredData.ownerId,
        opportunity.structuredData.accountId,
        tenantId
      ),
      this.extractRelationshipFeatures(opportunityId, tenantId),
      this.extractTemporalFeatures(opportunity),
      this.extractBehavioralFeatures(opportunityId, tenantId)
    ]);

    // 4. Combine raw features
    const rawFeatures: RawFeatures = {
      ...opportunityFeatures,
      ...riskFeatures,
      ...historicalFeatures,
      ...relationshipFeatures,
      ...temporalFeatures,
      ...behavioralFeatures
    };

    // 5. Transform features
    const encoded = await this.transformCategorical(rawFeatures);
    const normalized = await this.transformNumerical(encoded);
    const temporal = await this.engineerTemporal(normalized);
    const aggregated = await this.computeAggregations(temporal);

    // 6. Validate features
    const validation = this.validateFeatures(aggregated);
    if (!validation.valid) {
      this.logger.warn('Feature validation failed', {
        opportunityId,
        errors: validation.errors
      });
    }

    // 7. Handle missing data
    const features = this.handleMissingData(aggregated);

    // 8. Add metadata
    const featureVector: FeatureVector = {
      ...features,
      _metadata: {
        opportunityId,
        tenantId,
        extractedAt: new Date(),
        modelVersion: modelVersion || 'latest',
        featureVersions: await this.resolveFeatureVersions(modelVersion),
        validationResult: validation
      }
    };

    // 9. Cache features
    await this.cacheFeatures(opportunityId, tenantId, featureVector);

    // 10. Track metrics
    const duration = Date.now() - startTime;
    this.trackMetric('feature_extraction_duration', duration);
    this.logger.info('Feature extraction completed', {
      opportunityId,
      tenantId,
      duration
    });

    return featureVector;
  } catch (error) {
    this.logger.error('Feature extraction failed', {
      opportunityId,
      tenantId,
      error
    });
    throw error;
  }
}
```

##### extractFeaturesForBatch
```typescript
async extractFeaturesForBatch(
  opportunityIds: string[],
  tenantId: string,
  modelVersion?: string
): Promise<Map<string, FeatureVector>> {
  const startTime = Date.now();
  const results = new Map<string, FeatureVector>();
  
  try {
    // Process in parallel with concurrency limit
    const CONCURRENCY = 10;
    const chunks = this.chunkArray(opportunityIds, CONCURRENCY);
    
    for (const chunk of chunks) {
      const features = await Promise.all(
        chunk.map(id => this.extractFeatures(id, tenantId, modelVersion))
      );
      
      chunk.forEach((id, index) => {
        results.set(id, features[index]);
      });
    }
    
    const duration = Date.now() - startTime;
    this.trackMetric('batch_feature_extraction_duration', duration);
    this.logger.info('Batch feature extraction completed', {
      count: opportunityIds.length,
      duration
    });
    
    return results;
  } catch (error) {
    this.logger.error('Batch feature extraction failed', { error });
    throw error;
  }
}
```

##### pinFeatureVersions
```typescript
async pinFeatureVersions(
  trainingJobId: string,
  featureNames: string[]
): Promise<FeatureVersionMap> {
  const versionMap: FeatureVersionMap = {};
  
  for (const featureName of featureNames) {
    // Get latest stable version
    const metadata = await this.getFeatureMetadata(featureName);
    versionMap[featureName] = metadata.currentVersion;
  }
  
  // Store pinned versions in training job metadata
  await this.storeTrainingJobMetadata(trainingJobId, {
    featureVersions: versionMap,
    pinnedAt: new Date()
  });
  
  this.logger.info('Feature versions pinned for training', {
    trainingJobId,
    versionMap
  });
  
  return versionMap;
}
```

##### getFeatureVersionForInference
```typescript
async getFeatureVersionForInference(
  featureName: string,
  modelVersion: string
): Promise<FeatureVersion> {
  // Get model's required feature version
  const modelMetadata = await this.getModelMetadata(modelVersion);
  const requiredVersion = modelMetadata.featureVersions[featureName];
  
  if (!requiredVersion) {
    throw new Error(
      `Model ${modelVersion} does not specify version for feature ${featureName}`
    );
  }
  
  // Get feature metadata
  const featureMetadata = await this.getFeatureMetadata(featureName);
  
  // Find latest compatible version
  const compatibleVersions = featureMetadata.versions.filter(v =>
    this.isCompatibleVersion(v.version, requiredVersion)
  );
  
  if (compatibleVersions.length === 0) {
    throw new Error(
      `No compatible version found for feature ${featureName}. Required: ${requiredVersion}`
    );
  }
  
  // Return latest compatible version
  return compatibleVersions[compatibleVersions.length - 1];
}
```

##### isCompatibleVersion
```typescript
isCompatibleVersion(
  featureVersion: string,
  requiredVersion: string
): boolean {
  const [featMajor, featMinor] = featureVersion.split('.').map(Number);
  const [reqMajor, reqMinor] = requiredVersion.split('.').map(Number);
  
  // Major version must match
  if (featMajor !== reqMajor) {
    return false;
  }
  
  // Minor version can be equal or greater (forward compatible)
  return featMinor >= reqMinor;
}
```

[Due to length constraints, I'll create separate files for each layer. Let me continue with the other layers.]
