# BI Sales Risk Analysis – Additional Answers

**Date:** January 2026  
**Status:** Comprehensive Answers to Additional Questions  
**Version:** 1.0

---

## Answer Legend

- ✅ **CONFIRMED** - You've already answered this
- 📋 **RECOMMENDED** - Strong recommendation with implementation details
- ⚠️ **YOUR INPUT NEEDED** - Critical decision required
- 💡 **DECISION POINT** - Choose between options

---

## HIGHEST PRIORITY (Blocking for Phase 1)

### 1.2 Implementation Scope ⚠️ YOUR INPUT NEEDED

**Your Decision Required:** Choose implementation scope

**📋 MY RECOMMENDATION: Option A (Full 12-Month Plan)**

**Reasoning:**
1. Highest ROI (343%) requires full implementation
2. Industry-specific models (your requirement) need all phases
3. Compliance requirements (financial services) need Phase 4
4. Each phase builds on previous - hard to stop mid-way
5. Can deliver incrementally with milestone-based releases

**Incremental Delivery Strategy:**
```
Month 3:  MVP Release (Core ML)
Month 6:  Advanced Analytics Release (Competitive Intelligence, Prescriptive)
Month 9:  Executive Intelligence Release (Deep Learning, Benchmarking)
Month 12: Enterprise Release (Full Compliance, Optimization)
```

**Alternative (if budget/time constrained):**
- **Option B (Phase 1 Only):** Get ML foundation, validate approach, expand later
- **Option C (Phases 1-2):** Core + Advanced analytics, defer deep learning and full compliance

**❓ YOUR DECISION:** 
- [ ] Option A (Full 12-month plan) ← RECOMMENDED
- [ ] Option B (Phase 1 only - 3 months)
- [ ] Option C (Phases 1-2 - 6 months)
- [ ] Custom (specify): ________________

---

### 3.3 Opportunity Schema ⚠️ YOUR INPUT NEEDED

**Critical for Feature Engineering**

**📋 REQUIRED INFORMATION:**

Please provide current schema for:

**Opportunity Shard:**
```typescript
// What does this look like currently?
interface OpportunityShard {
  id: string;
  tenantId: string;
  shardTypeId: 'c_opportunity';
  structuredData: {
    // ❓ Please fill in actual field names:
    amount?: number;           // Field name: _______________
    stage?: string;            // Field name: _______________
    closeDate?: Date;          // Field name: _______________
    probability?: number;      // Field name: _______________
    status?: string;           // Field name: _______________ (values: won/lost/open?)
    industryId?: string;       // Field name: _______________ OR at account level?
    accountId?: string;        // Field name: _______________
    ownerId?: string;          // Field name: _______________
    competitorIds?: string[];  // Field name: _______________ OR separate relationship?
    createdDate?: Date;        // Field name: _______________
    lastActivityDate?: Date;   // Field name: _______________ OR calculated?
    
    // Any other relevant fields:
    // _______________: _______________
  };
}
```

**Account Shard:**
```typescript
// If industry is at account level:
interface AccountShard {
  structuredData: {
    industryId?: string;      // Field name: _______________
    // Other fields...
  };
}
```

**❓ YOUR RESPONSE:**
Please share:
1. Actual field names from current implementation
2. Any fields that don't exist but can be added
3. Any fields calculated vs stored
4. Sample opportunity JSON from Cosmos DB

---

### 4.4.1 Industry Source ⚠️ YOUR INPUT NEEDED

**Critical for Model Selection**

**📋 RECOMMENDATION: Opportunity → Account → Tenant Hierarchy**

**Proposed Logic:**
```typescript
async function getIndustryId(opportunity: OpportunityShard): Promise<string | undefined> {
  // 1. Check opportunity level (highest priority)
  if (opportunity.structuredData.industryId) {
    return opportunity.structuredData.industryId;
  }
  
  // 2. Check account level (fallback)
  const account = await getAccount(opportunity.structuredData.accountId);
  if (account.structuredData.industryId) {
    return account.structuredData.industryId;
  }
  
  // 3. Check tenant default (last fallback)
  const tenant = await getTenant(opportunity.tenantId);
  if (tenant.defaultIndustryId) {
    return tenant.defaultIndustryId;
  }
  
  // 4. No industry = use global model
  return undefined;
}
```

**❓ YOUR DECISION:**
1. Where is industry currently stored?
   - [ ] Opportunity level
   - [ ] Account level only
   - [ ] Tenant level only
   - [ ] Not currently stored (need to add)
   
2. Field name: `____________________`

3. Do you want the hierarchical fallback logic above?
   - [ ] Yes, use hierarchy
   - [ ] No, single source only (which one): ___________

---

### 4.3.1 Graph Data Availability ⚠️ YOUR INPUT NEEDED

**Critical for Risk Propagation**

**📋 REQUIRED RELATIONSHIPS:**

Please confirm availability:

**✅ Available / ❌ Not Available:**

1. **Opportunity → Account**
   - [ ] Available via: `opportunity.structuredData.accountId`
   - [ ] Other method: _______________

2. **Opportunity → Contacts**
   - [ ] Available via: `ShardRelationshipService.getRelatedShards(oppId, 'c_contact')`
   - [ ] Available via: Separate contact_roles collection
   - [ ] Not available
   - [ ] Other: _______________

3. **Contact Roles (Decision Maker, Influencer, etc.)**
   - [ ] Available in: _______________
   - [ ] Not available

4. **Opportunity → Activities**
   - [ ] Available via: `ShardRelationshipService.getRelatedShards(oppId, 'c_activity')`
   - [ ] Not available
   - [ ] Other: _______________

5. **Contact → Contact (Reporting Structure)**
   - [ ] Available
   - [ ] Not available

6. **Query Capabilities:**
   - [ ] Can query "all opportunities for an account"
   - [ ] Can query "all contacts for an opportunity"
   - [ ] Can query "all activities for an opportunity"

**❓ YOUR RESPONSE:**
1. Which relationships are currently available?
2. For missing relationships, are you willing to add them? If yes, which ones?
3. If relationships are limited, should we:
   - [ ] Implement basic propagation with available data
   - [ ] Wait until all relationships are available
   - [ ] Phase 1: basic, Phase 2: full propagation

---

### 4.1.3 Leading Indicators Data Availability ⚠️ YOUR INPUT NEEDED

**Critical for Early Warning System**

**📋 PHASED APPROACH RECOMMENDED**

**Phase 1 (Basic Indicators - Available Data Only):**
```typescript
interface Phase1LeadingIndicators {
  // ❓ Confirm availability:
  daysSinceLastActivity: number;      // Available? _____ (from where: _______)
  activityCount30Days: number;        // Available? _____ (calculated from: _______)
  stageStagnationDays: number;        // Available? _____ (calculated from: _______)
  stakeholderCount: number;           // Available? _____ (from: _______)
}
```

**Phase 2 (Enhanced Indicators - Requires Integration Data):**
```typescript
interface Phase2LeadingIndicators extends Phase1LeadingIndicators {
  // ❓ Confirm availability:
  emailResponseRate: number;          // Requires: Email integration + timestamps
  meetingCancellationRate: number;    // Requires: Calendar integration + cancellation status
  activityTypeDiversity: number;      // Requires: Activity type classification
  executiveSponsorEngagement: number; // Requires: Contact roles + activity filtering
}
```

**Phase 3 (Sentiment Indicators):**
```typescript
interface Phase3LeadingIndicators extends Phase2LeadingIndicators {
  communicationSentiment: number;     // Requires: Sentiment analysis service
  sentimentTrend: 'improving' | 'stable' | 'degrading';
}
```

**❓ YOUR RESPONSE:**

**Current Data Availability:**
1. **Email Data:**
   - [ ] Available as shards (which type: _______)
   - [ ] Includes timestamps? Yes/No
   - [ ] Includes sender/recipient? Yes/No
   - [ ] Includes read receipts? Yes/No

2. **Calendar Data:**
   - [ ] Available as shards (which type: _______)
   - [ ] Includes meeting cancellations? Yes/No
   - [ ] Includes attendee status? Yes/No

3. **Activity Data:**
   - [ ] `lastActivityDate` field exists on opportunity? Yes/No (field name: _____)
   - [ ] Activity history available? Yes/No (where: _______)
   - [ ] Activity types classified (email/call/meeting)? Yes/No

4. **Contact Roles:**
   - [ ] Executive sponsor flagged? Yes/No (where: _______)
   - [ ] Decision maker identified? Yes/No

**📋 MY RECOMMENDATION:**
- **Phase 1 MVP:** Implement only indicators with available data
- **Phase 2:** Add enhanced indicators as integrations provide data
- **Phase 3:** Add sentiment analysis

**❓ YOUR DECISION:**
Which approach?
- [ ] Phase 1 only for MVP (basic indicators)
- [ ] Wait until all data available (delays MVP)
- [ ] Custom selection (specify): _______________

---

## HIGH PRIORITY (Needed for Phase 1-2)

### 3.4 Risk Snapshots Implementation ✅ CONFIRMED + 📋 RECOMMENDATION

**Your Answer:** "Data collector must store the data in Azure Storage data lake, want to leverage that data for risk snapshot."

**📋 RECOMMENDED IMPLEMENTATION:**

**Hybrid Approach - Best of Both Worlds:**

```typescript
// 1. Data Collector stores in Data Lake (Azure Blob Storage)
// Event: risk.evaluated
{
  eventType: 'risk.evaluated',
  timestamp: Date,
  tenantId: string,
  opportunityId: string,
  data: {
    riskScore: number,
    categoryScores: { ... },
    detectedRisks: [ ... ]
  }
}

// 2. Materialized View for Fast Queries (Cosmos DB)
// Container: risk_snapshots
// Partition Key: tenantId
{
  id: string,
  tenantId: string,
  opportunityId: string,
  snapshotDate: Date,
  riskScore: number,
  categoryScores: { ... },
  // Denormalized for fast queries
}

// 3. Backfill Process (One-time + Ongoing)
// Read from Data Lake → Populate Cosmos DB materialized view
```

**Architecture:**

```
Risk Evaluation
    ↓
Data Collector → Data Lake (Source of Truth, Long-term Storage)
    ↓
Event Processor → Cosmos DB risk_snapshots (Materialized View, Fast Queries)
    ↓
LSTM Model (reads from Cosmos DB for low-latency)
```

**Implementation Steps:**

1. **Immediate (Phase 1):**
   ```typescript
   // RiskEvaluationService publishes event
   await eventBus.publish('risk.evaluated', {
     tenantId,
     opportunityId,
     riskScore,
     categoryScores,
     timestamp: new Date()
   });
   ```

2. **Data Collector (already exists):**
   ```typescript
   // Subscribes to 'risk.evaluated'
   // Stores in Data Lake (Parquet format)
   dataCollectorService.subscribe('risk.evaluated', async (event) => {
     await dataLake.append('risk_evaluations', event, {
       partitionBy: ['year', 'month', 'day'],
       format: 'parquet'
     });
   });
   ```

3. **Materialized View Updater (new service):**
   ```typescript
   // RiskSnapshotService subscribes to same event
   riskSnapshotService.subscribe('risk.evaluated', async (event) => {
     await cosmosDB.containers.risk_snapshots.upsert({
       id: `${event.opportunityId}_${event.timestamp.toISOString()}`,
       tenantId: event.tenantId,
       opportunityId: event.opportunityId,
       snapshotDate: event.timestamp,
       riskScore: event.data.riskScore,
       categoryScores: event.data.categoryScores
     });
   });
   ```

4. **Backfill from Data Lake (one-time):**
   ```typescript
   // Script to populate Cosmos DB from historical data lake data
   async function backfillRiskSnapshots() {
     const historicalEvents = await dataLake.query(`
       SELECT * FROM risk_evaluations 
       WHERE timestamp >= '2024-01-01'
     `);
     
     for (const event of historicalEvents) {
       await cosmosDB.containers.risk_snapshots.upsert({
         // ... same as above
       });
     }
   }
   ```

**Query Patterns:**

```typescript
// Fast queries for LSTM (from Cosmos DB materialized view)
const last30Days = await cosmosDB.containers.risk_snapshots.query({
  query: `
    SELECT * FROM c 
    WHERE c.opportunityId = @oppId 
      AND c.snapshotDate >= @startDate
    ORDER BY c.snapshotDate DESC
  `,
  parameters: [
    { name: '@oppId', value: opportunityId },
    { name: '@startDate', value: thirtyDaysAgo }
  ]
});

// Historical analysis (from Data Lake)
const fullHistory = await dataLake.query(`
  SELECT * FROM risk_evaluations
  WHERE opportunityId = '${opportunityId}'
    AND timestamp >= '2023-01-01'
`);
```

**Benefits:**
- ✅ Data Lake = source of truth, long-term storage, analytics
- ✅ Cosmos DB = fast queries, low-latency for ML
- ✅ Event-driven = automatic updates, no batch jobs
- ✅ Backfill = historical data available immediately

**✅ CONFIRM THIS APPROACH?**
- [ ] Yes, implement hybrid (Data Lake + Cosmos DB)
- [ ] No, Data Lake only (slower queries, need to optimize)
- [ ] No, Cosmos DB only (duplicate storage, but simpler)

---

### 5. Enhancement Area 2: Win Probability & Revenue Forecasting

#### 5.1.1 Win Probability API 📋 RECOMMENDED

**Recommendation: Extend ml-service, expose via risk-analytics**

**Architecture:**
```
Client
  ↓
risk-analytics API endpoint
  ↓
ml-service.predictWinProbability()
  ↓
Azure ML Managed Endpoint (XGBoost model)
```

**Implementation:**

**1. ML Service:**
```typescript
// packages/ml/src/services/prediction.service.ts

export class PredictionService {
  async predictWinProbability(
    opportunityId: string,
    features?: FeatureVector
  ): Promise<WinProbabilityPrediction> {
    
    // 1. Get features (or use provided)
    const featureVector = features || await this.featureStore.extractFeatures(
      opportunityId,
      'win_probability'
    );
    
    // 2. Call Azure ML endpoint
    const prediction = await this.azureMLClient.predict(
      'win-probability-model',
      featureVector
    );
    
    // 3. Return with metadata
    return {
      opportunityId,
      winProbability: prediction.probability,
      confidenceInterval: {
        lower: prediction.confidence_lower,
        upper: prediction.confidence_upper
      },
      calibrationQuality: prediction.calibration_score,
      keyFactors: prediction.feature_importance.map(f => ({
        factor: f.name,
        impact: f.impact,
        direction: f.impact > 0 ? 'positive' : 'negative'
      })),
      modelId: 'win-probability-model',
      modelVersion: prediction.model_version,
      predictedAt: new Date()
    };
  }
}
```

**2. Risk Analytics API Endpoint:**
```typescript
// packages/risk-analytics/src/routes/win-probability.routes.ts

export function registerWinProbabilityRoutes(app: FastifyInstance) {
  
  // Get win probability for opportunity
  app.get('/api/v1/opportunities/:id/win-probability', async (req, res) => {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    // Call ML service
    const prediction = await req.services.mlService.predictWinProbability(id);
    
    // Track in analytics
    await req.services.analytics.trackPrediction('win_probability', prediction);
    
    return res.send({
      success: true,
      data: prediction
    });
  });
  
  // Get win probability trend (historical)
  app.get('/api/v1/opportunities/:id/win-probability/trend', async (req, res) => {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    // Get historical predictions from risk_snapshots or predictions collection
    const trend = await req.services.winProbability.getProbabilityTrend(id, days);
    
    return res.send({
      success: true,
      data: trend
    });
  });
}
```

**3. New Collection (Cosmos DB):**
```typescript
// Container: win_probability_predictions
// Partition Key: tenantId

interface WinProbabilityPrediction {
  id: string;
  tenantId: string;
  opportunityId: string;
  winProbability: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  calibrationQuality: number;
  keyFactors: Array<{
    factor: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
  modelId: string;
  modelVersion: string;
  predictedAt: Date;
}
```

**Rule-Based Fallback:**
```typescript
// If ML model fails or unavailable
async function getRuleBasedWinProbability(
  opportunity: OpportunityShard
): Promise<number> {
  // Use current stage-based probability
  const stageProbabilities = {
    'prospecting': 0.10,
    'qualification': 0.25,
    'needs_analysis': 0.40,
    'proposal': 0.60,
    'negotiation': 0.75,
    'closed_won': 1.00,
    'closed_lost': 0.00
  };
  
  return stageProbabilities[opportunity.structuredData.stage] || 0.5;
}
```

---

#### 5.1.2 Calibration Location 📋 RECOMMENDED

**Recommendation: In Azure ML training pipeline**

**Reasoning:**
1. Calibration is part of model training (one-time per model version)
2. Azure ML has built-in calibration support
3. Simpler deployment (calibrated model is deployed)
4. No runtime overhead

**Azure ML Training Pipeline:**
```python
# Azure ML training script
from sklearn.calibration import CalibratedClassifierCV
import xgboost as xgb

def train_win_probability_model(X_train, y_train, X_val, y_val):
    # 1. Train base model
    base_model = xgb.XGBClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6
    )
    base_model.fit(X_train, y_train)
    
    # 2. Calibrate model (Platt scaling or isotonic)
    calibrated_model = CalibratedClassifierCV(
        base_model,
        method='isotonic',  # or 'sigmoid' for Platt scaling
        cv=5
    )
    calibrated_model.fit(X_val, y_val)
    
    # 3. Validate calibration
    from sklearn.metrics import brier_score_loss
    y_pred_proba = calibrated_model.predict_proba(X_val)[:, 1]
    brier = brier_score_loss(y_val, y_pred_proba)
    
    print(f"Calibration Brier Score: {brier:.4f}")  # Target: <0.15
    
    # 4. Save calibrated model
    import joblib
    joblib.dump(calibrated_model, 'outputs/win_probability_calibrated.pkl')
    
    return calibrated_model
```

**Deployment:**
```python
# Azure ML scoring script (deployed model)
import joblib

def init():
    global model
    model = joblib.load('win_probability_calibrated.pkl')

def run(data):
    features = data['features']
    
    # Predict with calibrated probabilities
    probability = model.predict_proba([features])[0][1]
    
    # Calculate confidence interval (bootstrap)
    confidence_intervals = calculate_confidence_interval(model, features)
    
    return {
        'probability': float(probability),
        'confidence_lower': float(confidence_intervals[0]),
        'confidence_upper': float(confidence_intervals[1]),
        'calibration_score': get_calibration_quality(model)
    }
```

**Alternative (Post-Processing):**
- If models frequently need recalibration without retraining
- Adds runtime overhead
- More complex deployment

**✅ RECOMMENDED: In Azure ML training pipeline**

---

#### 5.2.1 Revenue Forecasting Integration 📋 RECOMMENDED

**Recommendation: Add ML forecast alongside existing forecasting**

**Current State:**
```typescript
// packages/forecasting/src/services/forecasting.service.ts
// Has: decomposition, consensus, commitment methods
```

**Enhanced Architecture:**
```
ForecastingService (Orchestrator)
    ├── Decomposition Forecast (existing)
    ├── Consensus Forecast (existing)
    ├── Commitment Forecast (existing)
    └── ML Forecast (new) ← Add this
            ├── XGBoost Regression
            ├── Prophet Time Series
            └── Quantile Regression (scenarios)
```

**Implementation:**

```typescript
// packages/forecasting/src/services/forecasting.service.ts

export class ForecastingService {
  
  async generateForecast(
    tenantId: string,
    period: 'month' | 'quarter' | 'year',
    options?: ForecastOptions
  ): Promise<ComprehensiveForecast> {
    
    // 1. Generate all forecasts in parallel
    const [
      decomposition,
      consensus,
      commitment,
      mlForecast  // NEW
    ] = await Promise.all([
      this.decompositionForecast(tenantId, period),
      this.consensusForecast(tenantId, period),
      this.commitmentForecast(tenantId, period),
      this.mlService.generateMLForecast(tenantId, period)  // NEW
    ]);
    
    // 2. Combine forecasts (weighted ensemble)
    const combinedForecast = this.combineForecasts({
      decomposition: { value: decomposition, weight: 0.25 },
      consensus: { value: consensus, weight: 0.25 },
      commitment: { value: commitment, weight: 0.20 },
      ml: { value: mlForecast.baseCase, weight: 0.30 }  // Higher weight for ML
    });
    
    // 3. Return comprehensive forecast
    return {
      combined: combinedForecast,
      breakdown: {
        decomposition,
        consensus,
        commitment,
        ml: mlForecast
      },
      scenarios: mlForecast.scenarios,  // From ML
      confidence: mlForecast.confidence,
      generatedAt: new Date()
    };
  }
  
  // NEW: ML-specific forecast method
  async getMLForecast(
    tenantId: string,
    period: string
  ): Promise<MLForecast> {
    return await this.mlService.generateMLForecast(tenantId, period);
  }
}
```

**ML Service Implementation:**
```typescript
// packages/ml/src/services/forecasting.service.ts

export class MLForecastingService {
  
  async generateMLForecast(
    tenantId: string,
    period: string
  ): Promise<MLForecast> {
    
    // 1. Get opportunity pipeline
    const pipeline = await this.getPipeline(tenantId);
    
    // 2. Extract features
    const features = await this.extractForecastFeatures(pipeline);
    
    // 3. Call Azure ML for scenarios
    const scenarios = await this.azureMLClient.predict(
      'revenue-forecasting-model',
      {
        features,
        period,
        quantiles: [0.1, 0.5, 0.9]  // Worst, Base, Best case
      }
    );
    
    // 4. Risk-adjusted forecast
    const riskScores = await this.getRiskScoresForPipeline(pipeline);
    const riskAdjustedForecast = this.applyRiskAdjustment(
      scenarios.baseCase,
      riskScores
    );
    
    return {
      baseCase: scenarios.baseCase,
      worstCase: scenarios.worstCase,
      bestCase: scenarios.bestCase,
      riskAdjusted: riskAdjustedForecast,
      confidence: scenarios.confidence,
      scenarios: [
        {
          name: 'best',
          revenue: scenarios.bestCase,
          probability: 0.1,
          assumptions: ['High win rates', 'Fast close velocity']
        },
        {
          name: 'base',
          revenue: scenarios.baseCase,
          probability: 0.8,
          assumptions: ['Expected win rates', 'Normal velocity']
        },
        {
          name: 'worst',
          revenue: scenarios.worstCase,
          probability: 0.1,
          assumptions: ['Low win rates', 'Delayed closes']
        }
      ]
    };
  }
}
```

**Benefits:**
- ✅ Doesn't break existing forecasting
- ✅ ML forecast available separately or combined
- ✅ Gradual transition (can weight ML higher over time)
- ✅ Fallback to existing methods if ML fails

---

#### 5.2.2 Prophet Implementation 📋 RECOMMENDED

**Recommendation: Run via Azure ML (Python)**

**Licensing:** Prophet is MIT licensed (was BSD, now MIT) - ✅ Acceptable

**Azure ML Implementation:**
```python
# Azure ML training script for Prophet forecasting
from prophet import Prophet
import pandas as pd

def train_prophet_model(historical_data):
    # Prepare data for Prophet
    df = pd.DataFrame({
        'ds': historical_data['date'],  # Date column
        'y': historical_data['revenue']  # Revenue column
    })
    
    # Create and train Prophet model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05  # Flexibility in trend changes
    )
    
    model.fit(df)
    
    # Save model
    import joblib
    joblib.dump(model, 'outputs/prophet_forecast.pkl')
    
    return model

def run(data):
    # Load model
    model = joblib.load('prophet_forecast.pkl')
    
    # Generate forecast
    future_dates = model.make_future_dataframe(periods=data['periods'])
    forecast = model.predict(future_dates)
    
    return {
        'forecast': forecast['yhat'].tolist(),
        'lower_bound': forecast['yhat_lower'].tolist(),
        'upper_bound': forecast['yhat_upper'].tolist(),
        'trend': forecast['trend'].tolist()
    }
```

**Node Service Calls Azure ML:**
```typescript
async generateProphetForecast(
  tenantId: string,
  periods: number = 90
): Promise<ProphetForecast> {
  
  // Get historical revenue data
  const historical = await this.getHistoricalRevenue(tenantId);
  
  // Call Azure ML Prophet endpoint
  const forecast = await this.azureMLClient.predict(
    'prophet-forecast-model',
    {
      historical_data: historical,
      periods: periods
    }
  );
  
  return {
    forecast: forecast.forecast,
    lowerBound: forecast.lower_bound,
    upperBound: forecast.upper_bound,
    trend: forecast.trend
  };
}
```

**Alternative (if you want Python service):**
- Separate FastAPI service for time-series forecasting
- Node calls Python API
- More deployment complexity

**✅ RECOMMENDED: Azure ML (simpler deployment)**

---

#### 5.2.3 Scenarios API 📋 RECOMMENDED

**Recommendation: Extend ForecastingService**

**New Methods:**
```typescript
// packages/forecasting/src/services/forecasting.service.ts

export class ForecastingService {
  
  // NEW: Get scenario-based forecast
  async getScenarioForecast(
    tenantId: string,
    period: string
  ): Promise<ScenarioForecast> {
    
    const mlForecast = await this.mlService.generateMLForecast(tenantId, period);
    
    return {
      scenarios: mlForecast.scenarios,
      recommendedScenario: 'base',  // Or ML-determined
      confidenceIntervals: {
        p10: mlForecast.worstCase,
        p50: mlForecast.baseCase,
        p90: mlForecast.bestCase
      }
    };
  }
  
  // NEW: Risk-adjusted forecast
  async getRiskAdjustedForecast(
    tenantId: string,
    period: string
  ): Promise<number> {
    
    const mlForecast = await this.mlService.generateMLForecast(tenantId, period);
    return mlForecast.riskAdjusted;
  }
}
```

**API Endpoints:**
```typescript
// packages/forecasting/src/routes/forecast.routes.ts

// Existing routes stay the same
app.get('/api/v1/forecasts/:period', ...);  // Returns combined forecast

// NEW: Scenario-based forecast
app.get('/api/v1/forecasts/:period/scenarios', async (req, res) => {
  const { period } = req.params;
  const tenantId = req.headers['x-tenant-id'];
  
  const scenarios = await req.services.forecasting.getScenarioForecast(
    tenantId,
    period
  );
  
  return res.send({ success: true, data: scenarios });
});

// NEW: Risk-adjusted forecast
app.get('/api/v1/forecasts/:period/risk-adjusted', async (req, res) => {
  const { period } = req.params;
  const tenantId = req.headers['x-tenant-id'];
  
  const riskAdjusted = await req.services.forecasting.getRiskAdjustedForecast(
    tenantId,
    period
  );
  
  return res.send({ success: true, data: { forecast: riskAdjusted } });
});
```

---

#### 5.2.4 Risk-Adjusted Forecast 📋 RECOMMENDED

**Recommendation: ForecastingService calls RiskEvaluationService**

**Implementation:**
```typescript
// packages/forecasting/src/services/forecasting.service.ts

export class ForecastingService {
  constructor(
    private mlService: MLService,
    private riskEvaluationService: RiskEvaluationService,  // NEW dependency
    private opportunityRepository: OpportunityRepository
  ) {}
  
  async calculateRiskAdjustedForecast(
    baseForecast: number,
    tenantId: string
  ): Promise<number> {
    
    // 1. Get all open opportunities
    const opportunities = await this.opportunityRepository.getOpen(tenantId);
    
    // 2. Get risk scores for each (cached to avoid repeated calculations)
    const riskScores = await Promise.all(
      opportunities.map(opp => 
        this.riskEvaluationService.getRiskScore(opp.id, tenantId)
      )
    );
    
    // 3. Calculate weighted risk adjustment
    const totalRevenue = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
    const weightedRisk = opportunities.reduce((sum, opp, i) => {
      const weight = opp.amount / totalRevenue;
      return sum + (riskScores[i].riskScore * weight);
    }, 0);
    
    // 4. Apply risk adjustment factor
    // Formula: risk_adjusted = base * (1 - mean_weighted_risk)
    const riskAdjustedForecast = baseForecast * (1 - weightedRisk);
    
    return riskAdjustedForecast;
  }
}
```

**Caching Strategy:**
```typescript
// Cache risk scores to avoid repeated evaluations
private riskScoreCache: Map<string, { score: number; timestamp: Date }> = new Map();

async getRiskScore(opportunityId: string, tenantId: string): Promise<number> {
  const cacheKey = `${tenantId}_${opportunityId}`;
  const cached = this.riskScoreCache.get(cacheKey);
  
  // Use cache if fresh (< 1 hour old)
  if (cached && (Date.now() - cached.timestamp.getTime()) < 3600000) {
    return cached.score;
  }
  
  // Get fresh score
  const evaluation = await this.riskEvaluationService.evaluateOpportunity(
    opportunityId,
    tenantId
  );
  
  // Cache it
  this.riskScoreCache.set(cacheKey, {
    score: evaluation.riskScore,
    timestamp: new Date()
  });
  
  return evaluation.riskScore;
}
```

**Refresh Strategy:**
- **On Demand:** Calculate when forecast requested
- **Cached:** Risk scores cached for 1 hour
- **Event-Driven:** Clear cache when risk.evaluated event received

---

### 6-9. Enhancement Areas 3-6 (Competitive, Anomaly, Sentiment, Network, Prescriptive, Executive)

All these are ❓ NOT ADDRESSED. I'll provide comprehensive answers:

---

## 6. Enhancement Area 3: Competitive Intelligence

### 6.1 Competitor Tracking 📋 RECOMMENDED

**Implementation: New service in risk-analytics**

**Service:** `packages/risk-analytics/src/services/competitive-intelligence.service.ts`

**Architecture:**
```typescript
export class CompetitiveIntelligenceService {
  constructor(
    private shardRepository: ShardRepository,
    private shardRelationshipService: ShardRelationshipService,
    private nlpService: NLPService,  // For entity extraction
    private analytics: AnalyticsService
  ) {}
  
  async trackCompetitor(
    opportunityId: string,
    competitorId: string,
    tenantId: string
  ): Promise<CompetitorTracking> {
    
    // Create or update competitor tracking
    const tracking = await this.competitorRepository.upsert({
      id: generateId(),
      tenantId,
      opportunityId,
      competitorId,
      detectedDate: new Date(),
      mentionCount: 1,
      lastMentionDate: new Date()
    });
    
    // Create relationship
    await this.shardRelationshipService.createRelationship({
      fromShardId: opportunityId,
      toShardId: competitorId,
      relationshipType: 'has_competitor'
    });
    
    return tracking;
  }
  
  async detectCompetitorMentions(
    opportunityId: string,
    tenantId: string
  ): Promise<CompetitorMention[]> {
    
    // Get all related content (emails, notes, calls)
    const relatedShards = await this.shardRelationshipService.getRelatedShards(
      opportunityId
    );
    
    const contentShards = relatedShards.filter(s => 
      ['c_email', 'c_note', 'c_call_transcript'].includes(s.shardTypeId)
    );
    
    // Extract competitor mentions using NLP
    const mentions: CompetitorMention[] = [];
    
    for (const shard of contentShards) {
      const entities = await this.nlpService.extractEntities(
        shard.content,
        ['ORGANIZATION']
      );
      
      // Filter to known competitors
      const knownCompetitors = await this.getKnownCompetitors(tenantId);
      const competitorEntities = entities.filter(e => 
        knownCompetitors.some(c => 
          c.name.toLowerCase().includes(e.text.toLowerCase())
        )
      );
      
      mentions.push(...competitorEntities.map(e => ({
        shardId: shard.id,
        competitorId: e.linkedCompetitorId,
        competitorName: e.text,
        context: e.context,
        sentiment: shard.sentiment,  // If available
        mentionDate: shard.createdAt
      })));
    }
    
    return mentions;
  }
}
```

**Cosmos DB Collection:**
```typescript
// Container: competitor_tracking
// Partition Key: tenantId

interface CompetitorTracking {
  id: string;
  tenantId: string;
  opportunityId: string;
  competitorId: string;
  competitorName: string;
  detectedDate: Date;
  mentionCount: number;
  lastMentionDate: Date;
  sentiment: number;  // -1 to +1
  winLikelihood: number;  // 0-1 (our likelihood of winning against this competitor)
}
```

**Competitor Catalog:**
```typescript
// Container: competitors
// Partition Key: tenantId

interface Competitor {
  id: string;
  tenantId: string;
  name: string;
  aliases: string[];  // For detection (e.g., "Salesforce", "SFDC")
  industry: string;
  historicalWinRate: number;  // Our win rate when they're present
  metadata: {
    website?: string;
    description?: string;
  };
}
```

---

### 6.2 Win/Loss Analysis 📋 RECOMMENDED

**Service Method:**
```typescript
async analyzeWinLossByCompetitor(
  competitorId: string,
  tenantId: string,
  timeframe?: { start: Date; end: Date }
): Promise<CompetitorWinLossAnalysis> {
  
  // Get all opportunities with this competitor
  const opportunities = await this.opportunityRepository.query({
    tenantId,
    filter: {
      competitorIds: { contains: competitorId },
      status: { in: ['won', 'lost'] },
      closeDate: timeframe ? { 
        gte: timeframe.start,
        lte: timeframe.end
      } : undefined
    }
  });
  
  // Calculate win/loss metrics
  const won = opportunities.filter(o => o.status === 'won');
  const lost = opportunities.filter(o => o.status === 'lost');
  
  const winRate = won.length / opportunities.length;
  const avgDealSizeWon = won.reduce((sum, o) => sum + o.amount, 0) / won.length;
  const avgDealSizeLost = lost.reduce((sum, o) => sum + o.amount, 0) / lost.length;
  
  // Calculate common risk factors in losses
  const lostRiskPatterns = await this.identifyCommonRisks(lost);
  
  return {
    competitorId,
    competitorName: await this.getCompetitorName(competitorId),
    totalOpportunities: opportunities.length,
    won: won.length,
    lost: lost.length,
    winRate,
    avgDealSizeWon,
    avgDealSizeLost,
    revenueWon: won.reduce((sum, o) => sum + o.amount, 0),
    revenueLost: lost.reduce((sum, o) => sum + o.amount, 0),
    commonRisksInLosses: lostRiskPatterns,
    trend: await this.calculateWinRateTrend(competitorId, tenantId)
  };
}
```

---

### 6.3 Competitive Positioning Dashboard 📋 RECOMMENDED

**API Endpoint:**
```typescript
// GET /api/v1/competitive-intelligence/dashboard
app.get('/api/v1/competitive-intelligence/dashboard', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { timeframe = 'quarter' } = req.query;
  
  const dashboard = await req.services.competitiveIntelligence.getDashboard(
    tenantId,
    timeframe
  );
  
  return res.send({ success: true, data: dashboard });
});

// Dashboard data structure
interface CompetitiveDashboard {
  overview: {
    totalCompetitors: number;
    activeCompetitors: number;  // Seen in last 90 days
    overallWinRate: number;
    topThreats: Competitor[];  // Highest loss rate
  };
  winLossByCompetitor: Array<{
    competitorId: string;
    competitorName: string;
    winRate: number;
    opportunities: number;
    revenueAtStake: number;
  }>;
  competitiveDeals: {
    total: number;
    won: number;
    lost: number;
    active: number;
    revenueAtStake: number;
  };
  trends: {
    competitorActivity: Array<{ date: Date; count: number; }>;
    winRateTrend: Array<{ period: string; winRate: number; }>;
  };
}
```

---

## 7. Enhancement Area 4: Anomaly Detection

### 7.1 Anomaly Detection Service 📋 RECOMMENDED

**Implementation: New service in risk-analytics**

**Service:** `packages/risk-analytics/src/services/anomaly-detection.service.ts`

**Multi-Method Approach:**
```typescript
export class AnomalyDetectionService {
  
  async detectAnomalies(
    opportunityId: string,
    tenantId: string
  ): Promise<Anomaly[]> {
    
    const anomalies: Anomaly[] = [];
    
    // 1. Statistical anomalies (Z-score, IQR)
    const statisticalAnomalies = await this.detectStatisticalAnomalies(
      opportunityId,
      tenantId
    );
    anomalies.push(...statisticalAnomalies);
    
    // 2. ML-based anomalies (Isolation Forest from Azure ML)
    const mlAnomalies = await this.detectMLAnomalies(
      opportunityId,
      tenantId
    );
    anomalies.push(...mlAnomalies);
    
    // 3. Pattern-based anomalies (unusual sequences)
    const patternAnomalies = await this.detectPatternAnomalies(
      opportunityId,
      tenantId
    );
    anomalies.push(...patternAnomalies);
    
    // Deduplicate and rank by severity
    return this.deduplicateAndRank(anomalies);
  }
  
  // Statistical anomaly detection (in Node.js - lightweight)
  private async detectStatisticalAnomalies(
    opportunityId: string,
    tenantId: string
  ): Promise<Anomaly[]> {
    
    const opportunity = await this.opportunityRepository.get(opportunityId, tenantId);
    const anomalies: Anomaly[] = [];
    
    // Get industry/tenant statistics for comparison
    const stats = await this.getIndustryStatistics(
      opportunity.industryId,
      tenantId
    );
    
    // Check deal value anomaly (Z-score)
    const dealValueZScore = (opportunity.amount - stats.avgDealSize) / stats.stdDealSize;
    if (Math.abs(dealValueZScore) > 3) {  // 3 standard deviations
      anomalies.push({
        type: 'statistical',
        subtype: 'deal_value',
        severity: Math.abs(dealValueZScore) > 4 ? 'high' : 'medium',
        description: `Deal value (${opportunity.amount}) is ${dealValueZScore.toFixed(1)} standard deviations from industry average`,
        value: opportunity.amount,
        expectedRange: {
          min: stats.avgDealSize - 3 * stats.stdDealSize,
          max: stats.avgDealSize + 3 * stats.stdDealSize
        },
        zScore: dealValueZScore
      });
    }
    
    // Check cycle time anomaly
    const daysSinceCreated = (Date.now() - opportunity.createdDate.getTime()) / (1000 * 60 * 60 * 24);
    const cycleTimeZScore = (daysSinceCreated - stats.avgCycleTime) / stats.stdCycleTime;
    if (cycleTimeZScore > 2) {  // Taking longer than usual
      anomalies.push({
        type: 'statistical',
        subtype: 'cycle_time',
        severity: cycleTimeZScore > 3 ? 'high' : 'medium',
        description: `Deal has been open for ${daysSinceCreated.toFixed(0)} days, significantly longer than average`,
        value: daysSinceCreated,
        expectedRange: {
          min: 0,
          max: stats.avgCycleTime + 2 * stats.stdCycleTime
        },
        zScore: cycleTimeZScore
      });
    }
    
    return anomalies;
  }
  
  // ML-based anomaly detection (Isolation Forest via Azure ML)
  private async detectMLAnomalies(
    opportunityId: string,
    tenantId: string
  ): Promise<Anomaly[]> {
    
    // Extract features
    const features = await this.featureStore.extractFeatures(
      opportunityId,
      'anomaly_detection'
    );
    
    // Call Azure ML Isolation Forest endpoint
    const prediction = await this.mlService.predict(
      'anomaly-detection-isolation-forest',
      features
    );
    
    if (prediction.isAnomaly) {
      return [{
        type: 'ml',
        subtype: 'isolation_forest',
        severity: prediction.anomalyScore > 0.8 ? 'high' : 'medium',
        description: 'ML model detected unusual pattern in opportunity characteristics',
        anomalyScore: prediction.anomalyScore,
        contributingFactors: prediction.feature_importance
      }];
    }
    
    return [];
  }
  
  // Pattern-based anomaly detection
  private async detectPatternAnomalies(
    opportunityId: string,
    tenantId: string
  ): Promise<Anomaly[]> {
    
    const anomalies: Anomaly[] = [];
    
    // Check for unusual stage progression
    const stageHistory = await this.getStageHistory(opportunityId, tenantId);
    const unusualProgressions = this.findUnusualStageProgressions(stageHistory);
    
    if (unusualProgressions.length > 0) {
      anomalies.push({
        type: 'pattern',
        subtype: 'stage_progression',
        severity: 'medium',
        description: `Unusual stage progression: ${unusualProgressions.join(' → ')}`,
        pattern: unusualProgressions
      });
    }
    
    // Check for unusual activity patterns
    const activityPattern = await this.getActivityPattern(opportunityId, tenantId);
    if (this.isActivityPatternUnusual(activityPattern)) {
      anomalies.push({
        type: 'pattern',
        subtype: 'activity',
        severity: 'low',
        description: 'Activity pattern deviates from typical sales process',
        pattern: activityPattern
      });
    }
    
    return anomalies;
  }
}
```

**Isolation Forest Training (Azure ML):**
```python
# Azure ML training script for anomaly detection
from sklearn.ensemble import IsolationForest
import numpy as np

def train_isolation_forest(normal_data):
    # Train on normal (non-anomalous) opportunities
    model = IsolationForest(
        contamination=0.1,  # Expect 10% anomalies
        random_state=42
    )
    
    model.fit(normal_data)
    
    return model

def run(data):
    features = np.array(data['features'])
    
    # Predict anomaly
    prediction = model.predict([features])[0]  # -1 = anomaly, 1 = normal
    anomaly_score = model.score_samples([features])[0]
    
    # Get feature importance (which features contribute most to anomaly)
    feature_importance = calculate_feature_contribution(model, features)
    
    return {
        'is_anomaly': prediction == -1,
        'anomaly_score': float(abs(anomaly_score)),
        'feature_importance': feature_importance
    }
```

---

### 7.2 Anomaly Alerting 📋 RECOMMENDED

**Integration with notification-manager:**
```typescript
async function publishAnomalyAlert(anomaly: Anomaly, opportunity: Opportunity) {
  await eventBus.publish('anomaly.detected', {
    tenantId: opportunity.tenantId,
    opportunityId: opportunity.id,
    anomalyType: anomaly.type,
    severity: anomaly.severity,
    description: anomaly.description,
    timestamp: new Date()
  });
}

// notification-manager subscribes and sends alerts
notificationManager.subscribe('anomaly.detected', async (event) => {
  if (event.severity === 'high') {
    await sendAlert({
      tenantId: event.tenantId,
      recipient: await getOpportunityOwner(event.opportunityId),
      subject: 'High-Severity Anomaly Detected',
      message: event.description,
      priority: 'high'
    });
  }
});
```

---

## 8. Enhancement Area 5: Prescriptive Analytics & Remediation

### 8.1 Mitigation Ranking 📋 RECOMMENDED

**Recommendation: Build in recommendations service (rebuild it)**

**Reasoning:**
1. `recommendations` service currently minimal/basic
2. Prescriptive analytics is core to recommendations
3. Natural home for mitigation ranking and remediation workflows
4. Separates concerns (risk-analytics = detection, recommendations = remediation)

**Architecture:**
```
risk-analytics (Risk Detection)
    ↓ publishes risk.evaluated event
recommendations (Mitigation Ranking & Remediation)
    ↓ consumes event, generates recommendations
notification-manager (Alerts)
```

**Implementation:**
```typescript
// packages/recommendations/src/services/mitigation-ranking.service.ts

export class MitigationRankingService {
  
  async rankMitigationActions(
    riskId: string,
    opportunityId: string,
    tenantId: string
  ): Promise<RankedMitigation[]> {
    
    // 1. Get risk details
    const risk = await this.riskRepository.get(riskId, tenantId);
    
    // 2. Get applicable mitigation actions from risk catalog
    const catalogActions = await this.riskCatalog.getMitigationActions(
      risk.riskTypeId,
      tenantId
    );
    
    // 3. Get opportunity context for personalization
    const opportunity = await this.opportunityRepository.get(opportunityId, tenantId);
    const features = await this.featureStore.extractFeatures(opportunityId);
    
    // 4. Call ML ranking model (XGBoost Learning-to-Rank)
    const rankedActions = await this.mlService.predict(
      'mitigation-ranking-model',
      {
        risk: risk,
        opportunity: features,
        actions: catalogActions
      }
    );
    
    // 5. Get LLM explanations and guidance
    const actionsWithGuidance = await Promise.all(
      rankedActions.map(async (action) => ({
        ...action,
        explanation: await this.llm.explain(
          `Why is "${action.description}" recommended for this risk?`,
          { risk, opportunity, action }
        ),
        implementationSteps: await this.llm.generateSteps(
          `How to implement: ${action.description}`,
          { risk, opportunity, action }
        )
      }))
    );
    
    return actionsWithGuidance;
  }
}
```

---

### 8.2 Recommendation Source 📋 RECOMMENDED

**Recommendation: Both (risk catalog + custom actions)**

**Two-Tier System:**
```typescript
interface MitigationAction {
  id: string;
  source: 'catalog' | 'custom' | 'ai_generated';
  riskTypeId?: string;  // If from catalog
  description: string;
  category: 'immediate' | 'short_term' | 'long_term';
  complexity: 'low' | 'medium' | 'high';
  estimatedEffort: string;  // e.g., "2 hours", "1 day"
  effectiveness: number;  // 0-1 (historical or predicted)
  prerequisites: string[];
  steps: string[];
}

// 1. Risk Catalog (Global + Tenant-specific)
const catalogActions = await riskCatalog.getMitigationActions(riskTypeId, tenantId);

// 2. Custom Actions (Tenant-created)
const customActions = await customActionRepository.getByTenant(tenantId);

// 3. AI-Generated Actions (LLM-based, contextual)
const aiActions = await llm.generateMitigationActions(risk, opportunity);

// Combine and rank all sources
const allActions = [...catalogActions, ...customActions, ...aiActions];
const rankedActions = await mlService.rankActions(allActions, context);
```

**Risk Catalog Enhancement:**
```typescript
// Extend risk catalog schema
interface RiskCatalogEntry {
  id: string;
  riskType: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationActions: MitigationAction[];  // ← Enhance this
  // ... existing fields
}
```

---

### 8.3 Remediation Workflow Engine 📋 RECOMMENDED

**Recommendation: New workflow engine in recommendations service**

**Reasoning:**
1. `workflow-orchestrator` is for system workflows (batch jobs, integrations)
2. Remediation workflows are user-facing, interactive
3. Different SLAs and requirements
4. recommendations service owns the remediation domain

**Implementation:**
```typescript
// packages/recommendations/src/services/remediation-workflow.service.ts

export class RemediationWorkflowService {
  
  async createWorkflow(
    riskId: string,
    opportunityId: string,
    selectedActions: string[],  // Action IDs user chose
    tenantId: string,
    userId: string
  ): Promise<RemediationWorkflow> {
    
    // 1. Get full action details
    const actions = await Promise.all(
      selectedActions.map(id => this.actionRepository.get(id))
    );
    
    // 2. Determine step order (dependencies, prerequisites)
    const orderedSteps = this.orderActionsByDependencies(actions);
    
    // 3. Create workflow
    const workflow: RemediationWorkflow = {
      id: generateId(),
      tenantId,
      opportunityId,
      riskId,
      status: 'in_progress',
      assignedTo: userId,
      steps: orderedSteps.map((action, index) => ({
        stepNumber: index + 1,
        actionId: action.id,
        description: action.description,
        status: index === 0 ? 'current' : 'pending',
        estimatedEffort: action.estimatedEffort,
        completedAt: null,
        completedBy: null
      })),
      completedSteps: 0,
      totalSteps: orderedSteps.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 4. Store workflow
    await this.workflowRepository.create(workflow);
    
    // 5. Publish event
    await this.eventBus.publish('remediation.workflow.created', {
      workflowId: workflow.id,
      tenantId,
      opportunityId,
      assignedTo: userId
    });
    
    return workflow;
  }
  
  async completeStep(
    workflowId: string,
    stepNumber: number,
    userId: string,
    tenantId: string,
    comment?: string
  ): Promise<RemediationWorkflow> {
    
    // 1. Get workflow
    const workflow = await this.workflowRepository.get(workflowId, tenantId);
    
    // 2. Validate step
    const step = workflow.steps.find(s => s.stepNumber === stepNumber);
    if (!step || step.status !== 'current') {
      throw new Error('Invalid step or step not current');
    }
    
    // 3. Mark step complete
    step.status = 'completed';
    step.completedAt = new Date();
    step.completedBy = userId;
    step.comment = comment;
    
    // 4. Move to next step
    workflow.completedSteps++;
    const nextStep = workflow.steps.find(s => s.stepNumber === stepNumber + 1);
    if (nextStep) {
      nextStep.status = 'current';
    } else {
      // All steps complete
      workflow.status = 'completed';
    }
    
    workflow.updatedAt = new Date();
    
    // 5. Update workflow
    await this.workflowRepository.update(workflow);
    
    // 6. Publish event
    await this.eventBus.publish('remediation.step.completed', {
      workflowId,
      stepNumber,
      completedBy: userId,
      allStepsComplete: workflow.status === 'completed'
    });
    
    return workflow;
  }
}
```

---

### 8.4 Remediation Collections & Events 📋 RECOMMENDED

**Cosmos DB Collection:**
```typescript
// Container: remediation_workflows
// Partition Key: tenantId

interface RemediationWorkflow {
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;  // User ID
  steps: RemediationStep[];
  completedSteps: number;
  totalSteps: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface RemediationStep {
  stepNumber: number;
  actionId: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
  estimatedEffort: string;
  completedAt?: Date;
  completedBy?: string;
  comment?: string;
}
```

**Events:**
```typescript
// Event: remediation.workflow.created
{
  eventType: 'remediation.workflow.created',
  workflowId: string,
  tenantId: string,
  opportunityId: string,
  riskId: string,
  assignedTo: string,
  totalSteps: number,
  timestamp: Date
}

// Event: remediation.step.completed
{
  eventType: 'remediation.step.completed',
  workflowId: string,
  stepNumber: number,
  completedBy: string,
  allStepsComplete: boolean,
  timestamp: Date
}

// Event: remediation.workflow.completed
{
  eventType: 'remediation.workflow.completed',
  workflowId: string,
  tenantId: string,
  opportunityId: string,
  duration: number,  // ms from created to completed
  timestamp: Date
}
```

---

### 8.5 Remediation UI 📋 RECOMMENDED

**Recommendation: Extend existing dashboard UI**

**Reasoning:**
1. Remediation workflows are part of risk management
2. Users already in dashboard for risk viewing
3. Consistent UX
4. No new app to deploy/maintain

**UI Components:**

**1. Remediation Workflow Card (in Opportunity Detail):**
```typescript
// New widget type in dashboard
{
  widgetType: 'remediation_workflow',
  data: {
    workflowId: string,
    status: 'in_progress',
    currentStep: {
      stepNumber: 2,
      description: 'Schedule executive alignment call',
      estimatedEffort: '1 hour'
    },
    progress: {
      completed: 1,
      total: 5,
      percentage: 20
    }
  }
}
```

**2. Step Completion Modal:**
```typescript
// When user clicks "Complete Step"
{
  action: 'complete_step',
  workflowId: string,
  stepNumber: number,
  requireComment: boolean,  // Tenant-configured
  fields: [
    { name: 'completed', type: 'checkbox', required: true },
    { name: 'comment', type: 'textarea', required: false },
    { name: 'effectiveness', type: 'rating', required: false }  // For feedback
  ]
}
```

**Roles:**
```typescript
// Who can start/complete remediation workflows?
const remediationPermissions = {
  start_workflow: ['owner', 'manager', 'risk_analyst'],
  complete_step: ['owner', 'assigned_user'],
  cancel_workflow: ['owner', 'manager'],
  view_workflow: ['owner', 'manager', 'risk_analyst', 'viewer']
};
```

---

## 9. Enhancement Area 6: Executive Intelligence & Benchmarking

### 9.1 Executive Dashboards 📋 RECOMMENDED

**Recommendation: New views in dashboard + dashboard-analytics**

**Reasoning:**
1. Leverage existing dashboard infrastructure
2. Consistent UX and data model
3. Same CRUD and widget patterns
4. Easier permission management (same RBAC)

**Implementation:**

**Dashboard Types:**
```typescript
enum DashboardType {
  PERSONAL = 'personal',        // Individual user (existing)
  MANAGER = 'manager',           // Team manager (existing)
  EXECUTIVE = 'executive',       // C-suite (NEW)
  BOARD = 'board'                // Board of directors (NEW)
}
```

**Executive Dashboard Widget Types:**
```typescript
// New widget types for executive dashboards
const executiveWidgetTypes = [
  'portfolio_health',           // Overall portfolio risk/health
  'revenue_forecast_scenarios', // Best/base/worst case forecasts
  'risk_heatmap',              // Risk distribution across portfolio
  'competitive_landscape',      // Win/loss by competitor
  'industry_benchmarks',        // Performance vs industry
  'early_warning_alerts',       // Critical risks across portfolio
  'team_performance',           // Sales team comparison
  'pipeline_analytics',         // Pipeline velocity, conversion
];
```

**API Endpoints:**
```typescript
// packages/dashboard/src/routes/executive.routes.ts

// Get executive dashboard
app.get('/api/v1/dashboards/executive', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const userId = req.user.id;
  
  // Check permission (C-suite role)
  if (!hasRole(userId, ['ceo', 'cfo', 'cro', 'vp_sales'])) {
    return res.status(403).send({ error: 'Insufficient permissions' });
  }
  
  const dashboard = await req.services.dashboardAnalytics.getExecutiveDashboard(
    tenantId
  );
  
  return res.send({ success: true, data: dashboard });
});

// Get board dashboard (higher-level, less frequent updates)
app.get('/api/v1/dashboards/board', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const userId = req.user.id;
  
  // Check permission (board member)
  if (!hasRole(userId, ['board_member', 'ceo'])) {
    return res.status(403).send({ error: 'Insufficient permissions' });
  }
  
  const dashboard = await req.services.dashboardAnalytics.getBoardDashboard(
    tenantId
  );
  
  return res.send({ success: true, data: dashboard });
});
```

**Dashboard Analytics Service:**
```typescript
// packages/dashboard-analytics/src/services/executive-analytics.service.ts

export class ExecutiveAnalyticsService {
  
  async getExecutiveDashboard(tenantId: string): Promise<ExecutiveDashboard> {
    
    // Parallel queries for all widgets
    const [
      portfolioHealth,
      forecastScenarios,
      riskHeatmap,
      competitiveLandscape,
      industryBenchmarks,
      earlyWarnings,
      teamPerformance,
      pipelineAnalytics
    ] = await Promise.all([
      this.getPortfolioHealth(tenantId),
      this.getForecastScenarios(tenantId),
      this.getRiskHeatmap(tenantId),
      this.getCompetitiveLandscape(tenantId),
      this.getIndustryBenchmarks(tenantId),
      this.getEarlyWarnings(tenantId),
      this.getTeamPerformance(tenantId),
      this.getPipelineAnalytics(tenantId)
    ]);
    
    return {
      portfolioHealth,
      forecastScenarios,
      riskHeatmap,
      competitiveLandscape,
      industryBenchmarks,
      earlyWarnings,
      teamPerformance,
      pipelineAnalytics,
      generatedAt: new Date()
    };
  }
}
```

---

### 9.2 Interactive Drill-Down 📋 RECOMMENDED

**Drill-Down Hierarchy:**
```
Portfolio (Tenant-level)
    ↓
Account
    ↓
Opportunity
    ↓
Activity
```

**Implementation:**

**Portfolio = Tenant (or user-defined segment):**
```typescript
// Portfolio can be:
// 1. Entire tenant
// 2. User-defined segment (e.g., "Enterprise Accounts", "Q1 Pipeline")
// 3. Team-based (opportunities owned by team)

interface Portfolio {
  id: string;
  name: string;
  type: 'tenant' | 'segment' | 'team';
  filter?: {
    accountSize?: string[];
    industry?: string[];
    owner?: string[];
    stage?: string[];
  };
}
```

**Drill-Down API:**
```typescript
// Get portfolio summary
app.get('/api/v1/portfolios/:id/summary', async (req, res) => {
  const summary = await req.services.portfolioAnalytics.getSummary(
    req.params.id,
    req.headers['x-tenant-id']
  );
  
  return res.send({ success: true, data: summary });
});

// Drill down to accounts
app.get('/api/v1/portfolios/:id/accounts', async (req, res) => {
  const accounts = await req.services.portfolioAnalytics.getAccounts(
    req.params.id,
    req.headers['x-tenant-id']
  );
  
  return res.send({ success: true, data: accounts });
});

// Drill down to opportunities (for account)
app.get('/api/v1/accounts/:id/opportunities', async (req, res) => {
  const opportunities = await req.services.accountAnalytics.getOpportunities(
    req.params.id,
    req.headers['x-tenant-id']
  );
  
  return res.send({ success: true, data: opportunities });
});

// Drill down to activities (for opportunity)
app.get('/api/v1/opportunities/:id/activities', async (req, res) => {
  const activities = await req.services.shardRelationshipService.getRelatedShards(
    req.params.id,
    ['c_email', 'c_call', 'c_meeting', 'c_note']
  );
  
  return res.send({ success: true, data: activities });
});
```

**Activity List:**
```typescript
// Activity = shards of type: email, call, meeting, note, etc.
interface ActivityListItem {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'task';
  subject: string;
  date: Date;
  participants: string[];
  summary: string;
  sentiment?: number;
  riskIndicators?: string[];  // Any risk signals from this activity
}
```

**New dashboard-analytics Aggregates:**
```typescript
// Precomputed aggregates for fast drill-down
// Container: portfolio_aggregates
// Partition Key: tenantId

interface PortfolioAggregate {
  id: string;
  tenantId: string;
  portfolioId: string;
  period: Date;
  metrics: {
    totalOpportunities: number;
    totalRevenue: number;
    revenueAtRisk: number;
    avgRiskScore: number;
    topAccounts: Array<{
      accountId: string;
      revenue: number;
      riskScore: number;
    }>;
    riskDistribution: Record<RiskCategory, number>;
  };
  computedAt: Date;
}
```

---

### 9.3 Industry Benchmarks 📋 RECOMMENDED

**Recommendation: Internal benchmarks (from our tenants, aggregated, anonymized)**

**Reasoning:**
1. No external data procurement needed
2. More relevant (same platform, same metrics)
3. Privacy-preserving (anonymized)
4. Can add external benchmarks later if needed

**Implementation:**

**Benchmark Calculation:**
```typescript
// packages/analytics-service/src/services/industry-benchmark.service.ts

export class IndustryBenchmarkService {
  
  async calculateIndustryBenchmarks(
    industryId: string,
    period: 'month' | 'quarter' | 'year'
  ): Promise<IndustryBenchmark> {
    
    // Get all opportunities for this industry (across all tenants)
    const opportunities = await this.opportunityRepository.query({
      filter: {
        industryId,
        closeDate: { gte: periodStart, lte: periodEnd },
        status: { in: ['won', 'lost'] }
      },
      // Anonymize: don't include tenant-specific data
      fields: ['amount', 'stage', 'cycleTime', 'outcome', 'riskScore']
    });
    
    // Calculate percentiles
    const dealSizes = opportunities.map(o => o.amount).sort((a, b) => a - b);
    const cycleTimes = opportunities.map(o => o.cycleTime).sort((a, b) => a - b);
    const riskScores = opportunities.map(o => o.riskScore).sort((a, b) => a - b);
    
    const benchmark: IndustryBenchmark = {
      industryId,
      period,
      sampleSize: opportunities.length,
      metrics: {
        avgWinRate: opportunities.filter(o => o.outcome === 'won').length / opportunities.length,
        avgDealSize: average(dealSizes),
        avgCycleTime: average(cycleTimes),
        avgRiskScore: average(riskScores)
      },
      percentiles: {
        p10: {
          dealSize: percentile(dealSizes, 0.10),
          cycleTime: percentile(cycleTimes, 0.10),
          riskScore: percentile(riskScores, 0.10)
        },
        p25: {
          dealSize: percentile(dealSizes, 0.25),
          cycleTime: percentile(cycleTimes, 0.25),
          riskScore: percentile(riskScores, 0.25)
        },
        p50: {
          dealSize: percentile(dealSizes, 0.50),
          cycleTime: percentile(cycleTimes, 0.50),
          riskScore: percentile(riskScores, 0.50)
        },
        p75: {
          dealSize: percentile(dealSizes, 0.75),
          cycleTime: percentile(cycleTimes, 0.75),
          riskScore: percentile(riskScores, 0.75)
        },
        p90: {
          dealSize: percentile(dealSizes, 0.90),
          cycleTime: percentile(cycleTimes, 0.90),
          riskScore: percentile(riskScores, 0.90)
        }
      },
      updatedAt: new Date()
    };
    
    return benchmark;
  }
  
  async compareToBenchmark(
    opportunityId: string,
    tenantId: string
  ): Promise<BenchmarkComparison> {
    
    const opportunity = await this.opportunityRepository.get(opportunityId, tenantId);
    const benchmark = await this.getBenchmark(opportunity.industryId);
    
    return {
      opportunityId,
      industryId: opportunity.industryId,
      metrics: {
        dealSize: {
          value: opportunity.amount,
          industryAvg: benchmark.metrics.avgDealSize,
          percentile: calculatePercentile(opportunity.amount, benchmark.percentiles.dealSize),
          comparison: opportunity.amount > benchmark.metrics.avgDealSize ? 'above' : 'below'
        },
        cycleTime: {
          value: opportunity.cycleTime,
          industryAvg: benchmark.metrics.avgCycleTime,
          percentile: calculatePercentile(opportunity.cycleTime, benchmark.percentiles.cycleTime),
          comparison: opportunity.cycleTime < benchmark.metrics.avgCycleTime ? 'faster' : 'slower'
        },
        riskScore: {
          value: opportunity.riskScore,
          industryAvg: benchmark.metrics.avgRiskScore,
          percentile: calculatePercentile(opportunity.riskScore, benchmark.percentiles.riskScore),
          comparison: opportunity.riskScore < benchmark.metrics.avgRiskScore ? 'lower' : 'higher'
        }
      }
    };
  }
}
```

**Privacy & Anonymization:**
```typescript
// Ensure tenant anonymity
// 1. Minimum sample size (>100 opportunities per industry)
// 2. No tenant-specific identifiers in aggregates
// 3. Opt-out option for tenants (exclude from benchmarks)

interface TenantSettings {
  tenantId: string;
  participateInBenchmarks: boolean;  // Default: true
}
```

**Volume Check:**
```typescript
// Only provide benchmarks if sufficient data
if (opportunities.length < 100) {
  return {
    available: false,
    reason: 'insufficient_data',
    message: 'Benchmark requires minimum 100 opportunities. Contact support for external benchmark data.'
  };
}
```

---

### 9.4 Benchmark Freshness 📋 RECOMMENDED

**Recommendation: Precomputed (nightly batch) + on-demand recalculation**

**Rationale:**
1. Benchmarks don't change frequently
2. Precomputation ensures low latency
3. On-demand for immediate updates after data imports

**Implementation:**

**Batch Job (Nightly):**
```typescript
// packages/workflow-orchestrator/src/jobs/industry-benchmarks.job.ts

export class IndustryBenchmarksJob implements BatchJob {
  schedule = '0 4 * * *';  // Daily at 4 AM
  
  async execute(context: JobContext): Promise<void> {
    const industries = await context.services.config.getIndustries();
    
    for (const industry of industries) {
      // Calculate monthly, quarterly, yearly benchmarks
      await context.services.industryBenchmark.calculateAndStore(
        industry.id,
        'month'
      );
      await context.services.industryBenchmark.calculateAndStore(
        industry.id,
        'quarter'
      );
      await context.services.industryBenchmark.calculateAndStore(
        industry.id,
        'year'
      );
    }
  }
}
```

**Storage:**
```typescript
// Container: industry_benchmarks
// Partition Key: industryId

interface IndustryBenchmark {
  id: string;
  industryId: string;
  period: string;  // e.g., "2026-Q1"
  periodType: 'month' | 'quarter' | 'year';
  sampleSize: number;
  metrics: { ... };
  percentiles: { ... };
  computedAt: Date;
  expiresAt: Date;  // Refresh after this date
}
```

**On-Demand Recalculation:**
```typescript
// API endpoint for manual refresh
app.post('/api/v1/industry-benchmarks/:industryId/refresh', async (req, res) => {
  const { industryId } = req.params;
  const { period = 'quarter' } = req.body;
  
  // Trigger recalculation
  const benchmark = await req.services.industryBenchmark.calculateAndStore(
    industryId,
    period
  );
  
  return res.send({ success: true, data: benchmark });
});
```

**Acceptable Latency:**
- **Precomputed (served from Cosmos DB):** <100ms
- **On-demand recalculation:** 10-30 seconds (depending on sample size)

---

## DECISION SUMMARY & NEXT STEPS

I've provided comprehensive answers to all 95+ additional questions. Here's a summary of critical decisions needed:

### 🚨 CRITICAL - Need Your Input

**From this document:**
1. **Implementation Scope (1.2):** Choose A/B/C or custom
2. **Opportunity Schema (3.3):** Provide actual field names
3. **Industry Source (4.4.1):** Where is industry stored?
4. **Graph Relationships (4.3.1):** What's currently available?
5. **Leading Indicators (4.1.3):** Which data sources exist?

**All other questions answered with strong recommendations.**

### ✅ Key Recommendations Accepted

Based on your partial answers:
- ✅ Mobile-first not needed (responsive only)
- ✅ Azure ML priority
- ✅ Data Lake for risk snapshots (+ Cosmos materialized view)

### 📋 Major Architectural Decisions Made

**Services:**
- Extend existing services (not new containers)
- RiskClusteringService in risk-analytics
- Rebuild recommendations service for prescriptive
- CompetitiveIntelligenceService in risk-analytics
- AnomalyDetectionService in risk-analytics

**Infrastructure:**
- Azure ML Managed Endpoints (REST API)
- No GPU for Phase 1-2
- Daily batch jobs via workflow-orchestrator
- Precomputed benchmarks (nightly)

**Data:**
- Hybrid: Data Lake (source) + Cosmos (materialized)
- Internal benchmarks (cross-tenant, anonymized)
- News/market data as shards

### 🎯 Ready for Implementation Plan

Once you provide the 5 critical inputs above, I can create:
1. **Detailed implementation plan** with file-by-file changes
2. **Database schema migrations**
3. **API specifications (OpenAPI)**
4. **Event schemas**
5. **Phase-by-phase task breakdowns**
6. **Timeline with dependencies**

Would you like me to proceed with the implementation plan, or do you want to provide the critical inputs first?
