# BI Sales Risk Analysis – Implementation Answers

**Date:** January 2026  
**Status:** Comprehensive Answers Based on Current Implementation  
**Version:** 1.0

---

## Answer Status Legend

- ✅ **ANSWERED** - Complete answer based on current implementation
- ⚠️ **NEEDS INPUT** - Requires your decision/input
- 📋 **RECOMMENDED** - Strong recommendation with reasoning

---

## 1. User Requirement & Scope

### 1.1 user requirement.md Contents ⚠️ NEEDS INPUT

**Recommendation:** Should contain:
```markdown
# User Requirements - BI Sales Risk Analysis

## Must-Haves (P0 - Blocking)
- Early warning indicators (30-60-90 day)
- Industry-specific risk models
- Win probability ML models
- Revenue forecasting with scenarios
- Competitive intelligence tracking
- Executive dashboards

## Should-Haves (P1 - Important)
- Risk clustering
- Sentiment analysis
- Anomaly detection
- Prescriptive workflows
- Industry benchmarking

## Nice-to-Haves (P2 - Future)
- Deep learning models
- Reinforcement learning
- Causal inference

## Out of Scope
- [Your decision needed]

## Target Customers
- Enterprise sales teams (1000+ opportunities)
- Multi-tenant SaaS (100s of tenants)
- Financial services (compliance required)

## Constraints
- Must work with existing Azure infrastructure
- Must maintain multi-tenant isolation
- Must achieve <500ms inference latency (p95)
- Must support batch processing (no real-time streaming required)

## Non-Functionals
- 99.9% availability
- SOC 2 Type II compliance by Month 11
- FINRA/SEC compliance for financial services
- Support 10,000 concurrent users
```

**Question:** Do you agree with this structure? Any additions/changes?

---

### 1.2 Implementation Scope ⚠️ NEEDS INPUT

**Options:**

**Option A: Full 12-Month Plan** ✅ RECOMMENDED
- Implement all 5 phases over 12 months
- Full capabilities by Month 12
- Highest ROI (343%)
- Matches comprehensive plan timeline

**Option B: Phase 1 Only (MVP)**
- Months 1-3 only
- Foundation + Core ML (Risk scoring, win probability, early warning)
- Faster to market (3 months)
- Lower initial investment
- Can validate before expanding

**Option C: Phases 1-2 (Core + Advanced)**
- Months 1-6
- Foundation + Advanced analytics
- Good balance of capabilities and timeline
- Includes competitive intelligence and prescriptive analytics

**Question:** Which option do you prefer?

**My Recommendation:** **Option A (Full 12-Month Plan)** for maximum impact, but we can break it into milestone-based releases for incremental delivery.

---

### 1.3 Must-Have vs Nice-to-Have 📋 RECOMMENDED

Based on your requirements and current implementation, here's my prioritization:

**P0 (Must-Have - Blocking):**
1. **Azure ML Infrastructure** - Required for all ML work
2. **Industry-Specific Risk Models** - You explicitly requested per-industry models
3. **Early Warning Indicators** - Core to predictive capability
4. **Win Probability Forecasting** - Replaces rule-based with ML
5. **Revenue Forecasting ML** - Enhances existing forecasting
6. **Competitive Intelligence** - You explicitly requested this
7. **Compliance Framework** - Required for financial services
8. **Comprehensive Audit Trails** - Required (logging + data collector + usage tracking)

**P1 (Should-Have - Important):**
1. **Risk Clustering** - Pattern identification
2. **Risk Propagation** - Portfolio-level risk
3. **Sentiment Analysis** - Early warning signals
4. **Anomaly Detection** - Hidden risk identification
5. **Network Analysis** - Stakeholder influence
6. **Prescriptive Analytics** - Guided remediation
7. **Executive Dashboards** - C-suite + manager reporting
8. **Industry Benchmarking** - You explicitly requested this

**P2 (Nice-to-Have - Future):**
1. **Deep Learning Models** - Phase 3, if XGBoost insufficient
2. **Reinforcement Learning** - Strategy optimization
3. **Causal Inference** - Root cause analysis
4. **What-If Analysis** - Scenario planning (could be P1 if high demand)

**Question:** Does this prioritization align with your vision?

---

### 1.4 First Release (MVP) 📋 RECOMMENDED

**Minimum Viable Product (3-4 months):**

**Core Capabilities:**
1. **Azure ML Infrastructure** (Month 1)
   - Azure ML Workspace operational
   - Managed Endpoints deployed
   - Feature engineering pipeline

2. **Industry Risk Models** (Months 1-2)
   - 1 global model + 3-5 industry-specific models
   - Shadow evaluation for safe rollout
   - Integration with existing RiskEvaluationService

3. **Win Probability ML** (Month 2)
   - Replace rule-based with calibrated ML model
   - Confidence intervals
   - Integration with forecasting

4. **Early Warning System** (Month 3)
   - 30-day risk forecasts (60/90-day optional for MVP)
   - Leading indicator detection
   - Alert system

5. **Basic Competitive Intelligence** (Month 3)
   - Competitor tracking database
   - Win/loss analysis by competitor
   - Integration with risk scoring

6. **Manager Dashboard Enhancements** (Month 4)
   - ML predictions visualization
   - Risk trajectory charts
   - Competitive insights

**Success Criteria for MVP:**
- Risk scoring R² > 0.85
- Win probability Brier score < 0.15
- Early warning accuracy >75% (30-day)
- 100% model coverage (all opportunities)

**Question:** Does this MVP scope work for a first release?

---

### 1.5 Out of Scope ⚠️ NEEDS INPUT

**My Recommendations for Out of Scope:**

1. **Real-time streaming** - You confirmed batch is sufficient
2. **Mobile-first UI** - You confirmed responsive but not mobile-first
3. **Scheduled PDF/PPT reports** - You confirmed on-demand only via content generation
4. **Multi-language support (initially)** - English-first, i18n later
5. **Credit risk databases** - Vendor TBD, integration via integration manager later
6. **LLM fine-tuning** - Only if criteria met in Phase 4 (not MVP)

**Question:** Anything else explicitly out of scope?

---

## 2. Infrastructure & Azure ML

### 2.1 Azure ML Resources ✅ ANSWERED

**CONFIRMED:**
- **Azure ML Workspace:** Yes, will provision
- **Resource Group:** `castiel-ml-prod-rg` ✅
- **Region:** `eastus` ✅
- **Subscription:** `main` ✅
- **Compute Clusters:** Managed, auto-scaling ✅
- **Managed Endpoints:** For model serving ✅

**Action Required:** Provision these resources in Phase 1, Week 1

---

### 2.2 ML Service Implementation ✅ ANSWERED

**CONFIRMED:** Option A - Full Azure ML Integration

**Implementation Plan:**
1. Add Azure ML SDK to `ml-service` dependencies
   ```json
   "@azure/ml-inference": "^1.0.0",
   "@azure/identity": "^4.0.0"
   ```

2. Create `AzureMLClient` service in `ml-service`
   ```typescript
   // packages/ml/src/clients/azure-ml.client.ts
   class AzureMLClient {
     async predict(endpoint: string, data: any): Promise<any>
     async getBatchPredictions(endpoint: string, dataArray: any[]): Promise<any[]>
   }
   ```

3. Update `PredictionService` to call Azure ML instead of placeholders
   ```typescript
   // Currently: generatePlaceholderPrediction()
   // Updated: Call AzureMLClient.predict()
   ```

4. Implement retry logic, circuit breakers, fallbacks

---

### 2.3 Azure ML SDK / Runtime 📋 RECOMMENDED

**Recommendation:** **REST to Managed Endpoints** (Option B)

**Reasoning:**
1. Containers are Node/TypeScript (your confirmed stack)
2. Azure ML Managed Endpoints expose REST APIs
3. No need for Python sidecar (simpler architecture)
4. Better performance (direct HTTPS calls)
5. Easier to debug and monitor

**Implementation:**
```typescript
// packages/ml/src/clients/azure-ml.client.ts
import { DefaultAzureCredential } from '@azure/identity';
import axios from 'axios';

export class AzureMLClient {
  private credential: DefaultAzureCredential;
  private endpoints: Map<string, string>; // Model -> Endpoint URL
  
  async predict(
    modelId: string,
    features: FeatureVector
  ): Promise<Prediction> {
    const endpointUrl = this.endpoints.get(modelId);
    const token = await this.credential.getToken('https://ml.azure.com/.default');
    
    const response = await axios.post(
      endpointUrl,
      { input_data: features },
      {
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5s timeout
      }
    );
    
    return response.data;
  }
}
```

**Alternative (if complex preprocessing needed):** Python sidecar for feature engineering, but keep inference via REST.

---

### 2.4 GPU Requirements 📋 RECOMMENDED

**Recommendation:** **No GPU for Phase 1-2**

**Reasoning:**
1. XGBoost/LightGBM (AutoML) run efficiently on CPU
2. LSTM (early warning) can train on CPU for small datasets
3. GPU only needed for Phase 3 deep learning (DNN, Transformers)
4. Cost savings (~$5k/month) in early phases

**Compute Configuration:**
- **Phase 1-2:** Standard_DS3_v2 (CPU, 4 vCPUs, 14GB RAM)
- **Phase 3:** Standard_NC6s_v3 (GPU, 6 vCPUs, 112GB RAM, 1x NVIDIA V100)

**Phase 3 GPU Use Cases:**
- Deep neural networks (DNN)
- LSTM with large datasets
- Transformer models (if used)
- Reinforcement learning

---

### 2.5 Model Hosting 📋 RECOMMENDED

**Recommendation:** **Hybrid Approach** (Option C)

**Strategy:**
1. **Azure ML Managed Endpoints** (Primary)
   - All models initially deployed here
   - Auto-scaling, managed infrastructure
   - Consistent interface

2. **ONNX + Redis** (Optimization - Phase 4)
   - Only for latency-critical models (win probability, risk scoring)
   - Convert XGBoost → ONNX → Cache in Redis
   - Fallback to Azure ML if ONNX fails
   - Only if latency requirements not met by Phase 3

**Initial Plan (Phase 1-3):** Azure ML Managed Endpoints only
**Optimization (Phase 4):** Add ONNX caching if needed

**Why Not ONNX Initially:**
- Adds complexity
- Azure ML endpoints should meet <500ms p95 target
- Premature optimization
- Can add later if needed

---

## 3. Data & Integrations

### 3.1 Training Data Volume ✅ ANSWERED

**CONFIRMED:** Expected to have sufficient data

**Minimum Requirements:**
- **Per Industry Model:** 3,000+ opportunities with outcomes
- **Global Model:** 5,000+ opportunities with outcomes
- **Synthetic Data:** Will augment if insufficient

**Current Data Assessment Needed:**
```sql
-- Query to run against Cosmos DB
SELECT 
  COUNT(*) as total_opportunities,
  SUM(CASE WHEN status IN ('won', 'closed_won') THEN 1 ELSE 0 END) as won_count,
  SUM(CASE WHEN status IN ('lost', 'closed_lost') THEN 1 ELSE 0 END) as lost_count,
  industry
FROM shards
WHERE shardTypeId = 'c_opportunity'
  AND (status IN ('won', 'closed_won', 'lost', 'closed_lost'))
GROUP BY industry
```

**Action Required:** Run this query to assess current data volume per industry.

---

### 3.2 Synthetic Data Generation 📋 RECOMMENDED

**Recommendation:** **Yes, in scope** - Critical for initial training

**Entities to Generate:**
1. **Opportunities** - With realistic feature distributions
2. **Risk Evaluations** - Historical risk scores
3. **Outcomes** - Win/loss labels
4. **Activities** - Engagement patterns

**Generation Rules:**
1. **Distribution Matching:** Match real data distributions (deal size, stage, etc.)
2. **SMOTE:** Synthetic Minority Oversampling for imbalanced classes
3. **Domain Rules:** Business rules (e.g., high budget + low activity = high risk)
4. **Validation:** Ensure synthetic data doesn't degrade model performance

**Implementation:**
```python
# packages/ml/scripts/synthetic_data.py
from sklearn.utils import resample
from imblearn.over_sampling import SMOTE

def generate_synthetic_opportunities(
    real_data: pd.DataFrame,
    target_size: int = 5000
) -> pd.DataFrame:
    # Use SMOTE for feature generation
    # Apply domain rules for consistency
    # Validate distributions match real data
    pass
```

**Validation Strategy:**
- Train model on real data → Test on synthetic (should perform poorly if too different)
- Train model on synthetic → Test on real (should perform reasonably well)
- Target: <10% performance degradation when mixing synthetic + real

---

### 3.3 Shard Manager Schema ⚠️ NEEDS INPUT

**Question:** Please provide current opportunity shard schema:

**What I Need:**
```typescript
// Example: What does structuredData look like?
interface OpportunityShard {
  id: string;
  tenantId: string;
  shardTypeId: 'c_opportunity';
  structuredData: {
    // ??? What fields exist?
    amount?: number;
    stage?: string;
    closeDate?: Date;
    probability?: number;
    industryId?: string;
    accountId?: string;
    ownerId?: string;
    // ... what else?
  };
  // ... other shard fields
}
```

**Required Fields for ML:**
- `amount` (deal value)
- `stage` (sales stage)
- `closeDate` (target close date)
- `probability` (current probability)
- `status` (won/lost/open)
- `industryId` or `industry` (industry classification)
- `accountId` (for account-level features)
- `ownerId` (for owner performance features)
- `competitorIds` (for competitive intelligence)
- `createdDate` (for velocity calculations)
- `lastActivityDate` (for engagement tracking)

**Schema Changes Needed:**
- If any required fields missing, need to add them
- If fields exist but named differently, need mapping
- If fields don't exist, need to derive or add

**Action Required:** Please share current opportunity schema from shard manager.

---

### 3.4 Risk Snapshots ✅ ANSWERED

**CONFIRMED:** Leverage data collector for historical data

**Implementation Plan:**

**Option A: Query data collector directly**
```typescript
// Get historical risk scores from data collector
const riskHistory = await dataCollectorService.query({
  eventType: 'risk.evaluated',
  opportunityId: opportunityId,
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  fields: ['riskScore', 'categoryScores', 'timestamp']
});

// Process into time series
const timeSeries = riskHistory.map(event => ({
  date: event.timestamp,
  riskScore: event.data.riskScore,
  categoryScores: event.data.categoryScores
}));
```

**Option B: Create materialized view (better performance)**
```typescript
// In risk-analytics service, maintain risk_snapshots collection
// Update on each risk evaluation
await cosmosDB.containers['risk_snapshots'].items.create({
  id: generateId(),
  tenantId,
  opportunityId,
  snapshotDate: new Date(),
  riskScore: evaluation.riskScore,
  categoryScores: evaluation.categoryScores,
  partitionKey: tenantId
});

// Query for time series
const snapshots = await cosmosDB.containers['risk_snapshots']
  .items.query({
    query: 'SELECT * FROM c WHERE c.opportunityId = @oppId AND c.snapshotDate >= @startDate',
    parameters: [
      { name: '@oppId', value: opportunityId },
      { name: '@startDate', value: thirtyDaysAgo }
    ]
  });
```

**Recommendation:** **Option B (Materialized View)** for better performance
- Create `risk_snapshots` container in Cosmos DB
- Partition key: `tenantId`
- Update on each risk evaluation (event-driven)
- TTL: 2 years (configurable)

---

### 3.5 External Data (Phase 1.5) ✅ ANSWERED

**CONFIRMED:**
- **NewsAPI** ✅
- **Alpha Vantage** ✅  
- **More can be added by super admin using integration manager** ✅

**Implementation Plan:**

**1. NewsAPI Integration**
```typescript
// packages/integrations/src/adapters/newsapi.adapter.ts
export class NewsAPIAdapter implements IntegrationAdapter {
  async fetchNews(query: string, from: Date, to: Date): Promise<Article[]> {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        from: from.toISOString(),
        to: to.toISOString(),
        apiKey: this.getSecret('NEWSAPI_KEY'),
        language: 'en',
        sortBy: 'relevancy'
      }
    });
    
    return response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: new Date(article.publishedAt),
      source: article.source.name,
      sentiment: null // Will be analyzed separately
    }));
  }
}
```

**2. Alpha Vantage Integration**
```typescript
// packages/integrations/src/adapters/alphavantage.adapter.ts
export class AlphaVantageAdapter implements IntegrationAdapter {
  async fetchMarketData(symbol: string): Promise<MarketData> {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apiKey: this.getSecret('ALPHAVANTAGE_KEY')
      }
    });
    
    return {
      symbol: symbol,
      price: parseFloat(response.data['Global Quote']['05. price']),
      change: parseFloat(response.data['Global Quote']['09. change']),
      changePercent: response.data['Global Quote']['10. change percent'],
      timestamp: new Date()
    };
  }
  
  async fetchEconomicIndicators(): Promise<EconomicData> {
    // GDP, inflation, interest rates, etc.
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'REAL_GDP',
        interval: 'quarterly',
        apiKey: this.getSecret('ALPHAVANTAGE_KEY')
      }
    });
    
    return {
      gdp: response.data.data[0].value,
      // ... other indicators
    };
  }
}
```

**3. Integration Manager Configuration**
```typescript
// Super admin can add new integrations via integration manager UI
// Stored in configuration-service
{
  integrationId: 'newsapi',
  type: 'external_data',
  adapter: 'NewsAPIAdapter',
  config: {
    apiKey: '${SECRET:NEWSAPI_KEY}',
    rateLimit: {
      requests: 100,
      period: 'day'
    }
  },
  syncSchedule: 'daily',
  enabled: true
}
```

**Budget & Rate Limits:**
- **NewsAPI:** Developer plan ($449/month) = 250,000 requests/month
- **Alpha Vantage:** Premium plan ($49.99/month) = 1,200 requests/day
- Total: ~$500/month for external data

---

### 3.6 External Data Storage ✅ ANSWERED

**CONFIRMED:** Store as shard using news shard type

**Implementation:**

**1. Define News Shard Type**
```typescript
// In shard-manager configuration
const newsShardType: ShardType = {
  id: 'news_article',
  name: 'News Article',
  category: 'external_data',
  schema: {
    title: { type: 'string', required: true },
    description: { type: 'string' },
    url: { type: 'string', required: true },
    publishedAt: { type: 'date', required: true },
    source: { type: 'string' },
    sentiment: { type: 'number' }, // -1 to +1
    relatedCompanies: { type: 'array', items: 'string' },
    relatedOpportunities: { type: 'array', items: 'string' },
    keywords: { type: 'array', items: 'string' }
  }
};
```

**2. Store News as Shards**
```typescript
// When news is ingested
const newsShard = await shardManager.createShard({
  tenantId: tenantId,
  shardTypeId: 'news_article',
  structuredData: {
    title: article.title,
    description: article.description,
    url: article.url,
    publishedAt: article.publishedAt,
    source: article.source,
    sentiment: await sentimentService.analyze(article.content),
    relatedCompanies: await entityExtractor.extractCompanies(article.content),
    keywords: await keywordExtractor.extract(article.content)
  },
  metadata: {
    source: 'NewsAPI',
    ingestionDate: new Date()
  }
});

// Link to opportunities if relevant
if (article.relatedOpportunities.length > 0) {
  for (const oppId of article.relatedOpportunities) {
    await shardRelationshipService.createRelationship({
      fromShardId: newsShard.id,
      toShardId: oppId,
      relationshipType: 'news_mention'
    });
  }
}
```

**3. Market Data Shard Type**
```typescript
const marketDataShardType: ShardType = {
  id: 'market_data',
  name: 'Market Data',
  category: 'external_data',
  schema: {
    dataType: { type: 'string', enum: ['stock_price', 'economic_indicator', 'industry_trend'] },
    symbol: { type: 'string' },
    value: { type: 'number' },
    change: { type: 'number' },
    changePercent: { type: 'string' },
    timestamp: { type: 'date' }
  }
};
```

**Benefits of Shard Storage:**
- Unified data model
- Automatic tenant isolation
- Relationship tracking (news → opportunities)
- Vector search enabled (can search news by semantic similarity)
- Consistent access patterns

---

### 3.7 Credit/Company Health ✅ ANSWERED

**CONFIRMED:** 
- Vendor selection later
- Integration via integration manager

**Implementation Plan:**

**Phase 1-2:** **NOT IN SCOPE**
- Focus on core ML capabilities
- Use existing data only

**Phase 3-4:** **Add vendor integration**
- Select vendor (e.g., Dun & Bradstreet, Equifax Business, Experian)
- Build adapter in integration manager
- Store as shards (same pattern as news)

**Shard Type (Future):**
```typescript
const companyHealthShardType: ShardType = {
  id: 'company_health',
  name: 'Company Health Score',
  category: 'external_data',
  schema: {
    companyId: { type: 'string', required: true },
    healthScore: { type: 'number' }, // 0-100
    creditRating: { type: 'string' },
    financialStrength: { type: 'number' },
    paymentHistory: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    lastUpdated: { type: 'date' }
  }
};
```

**Integration Manager Example:**
```typescript
{
  integrationId: 'dnb_company_health',
  type: 'external_data',
  adapter: 'DnBAdapter',
  config: {
    apiKey: '${SECRET:DNB_API_KEY}',
    endpoint: 'https://api.dnb.com/v1',
    rateLimit: { requests: 1000, period: 'day' }
  },
  syncSchedule: 'weekly', // Company health changes slowly
  enabled: false // Enable when vendor selected
}
```

**Action:** Defer to Phase 3-4, not blocking for MVP.

---

## 4. Enhancement Area 1: Advanced Risk Analysis

### 4.1.1 LSTM vs Current EarlyWarningService 📋 RECOMMENDED

**Current State:**
- `risk-analytics` has `EarlyWarningService` with rule-based detection:
  - Stage stagnation
  - Activity drop
  - Stakeholder churn
  - Risk acceleration

**Recommendation:** **Option C - LSTM first, keep rules as fallback**

**Reasoning:**
1. LSTM provides 30/60/90-day forecasts (better than rules)
2. Rules are valuable fallback when LSTM has low confidence
3. Can ensemble both for better accuracy
4. Gradual transition reduces risk

**Implementation:**
```typescript
// risk-analytics/src/services/early-warning.service.ts

export class EarlyWarningService {
  
  async detectEarlyWarnings(
    opportunityId: string,
    tenantId: string
  ): Promise<EarlyWarning[]> {
    const warnings: EarlyWarning[] = [];
    
    // 1. Try LSTM prediction first
    try {
      const lstmPrediction = await this.mlService.predictRiskTrajectory(
        opportunityId,
        [30, 60, 90]
      );
      
      if (lstmPrediction.confidence > 0.7) {
        // Use LSTM if high confidence
        warnings.push(...this.convertLSTMToWarnings(lstmPrediction));
      } else {
        // Low confidence, use rules as primary
        warnings.push(...await this.getRuleBasedWarnings(opportunityId, tenantId));
        // Add LSTM as supplementary
        warnings.push(...this.convertLSTMToWarnings(lstmPrediction, supplementary: true));
      }
    } catch (error) {
      // LSTM failed, fallback to rules
      this.logger.warn('LSTM prediction failed, using rule-based fallback', { error });
      warnings.push(...await this.getRuleBasedWarnings(opportunityId, tenantId));
    }
    
    return this.deduplicateAndRank(warnings);
  }
  
  private async getRuleBasedWarnings(
    opportunityId: string,
    tenantId: string
  ): Promise<EarlyWarning[]> {
    // Existing rule-based logic
    const warnings: EarlyWarning[] = [];
    
    // Check stage stagnation
    if (await this.checkStageStagnation(opportunityId, tenantId)) {
      warnings.push({
        type: 'stage_stagnation',
        severity: 'medium',
        confidence: 0.8,
        detectionMethod: 'rule-based'
      });
    }
    
    // Check activity drop
    if (await this.checkActivityDrop(opportunityId, tenantId)) {
      warnings.push({
        type: 'activity_drop',
        severity: 'high',
        confidence: 0.9,
        detectionMethod: 'rule-based'
      });
    }
    
    // ... other rules
    
    return warnings;
  }
}
```

**Migration Strategy:**
- **Phase 1 (Months 1-3):** Implement LSTM + fallback
- **Phase 2 (Months 4-6):** Monitor LSTM vs rules performance
- **Phase 3 (Months 7-9):** If LSTM outperforms, make it primary (keep rules as backup)
- **Phase 4:** Potentially remove rules if LSTM is consistently better

---

### 4.1.2 LSTM Runtime 📋 RECOMMENDED

**Recommendation:** **Azure ML Real-Time Endpoint** called by `risk-analytics` service

**Architecture:**
```
risk-analytics (Node/TypeScript)
    â†"
AzureMLClient (REST API call)
    â†"
Azure ML Managed Endpoint (LSTM model, Python/TensorFlow)
```

**Reasoning:**
1. LSTM model stays in Python/TensorFlow (native environment)
2. Azure ML handles scaling, monitoring, versioning
3. `risk-analytics` just makes REST API calls
4. Consistent with other ML models (win probability, etc.)
5. No need for separate Python service

**Implementation:**
```typescript
// risk-analytics/src/services/early-warning.service.ts

export class EarlyWarningService {
  constructor(
    private mlService: MLService,  // Wraps AzureMLClient
    private featureStore: FeatureStoreService
  ) {}
  
  async predictRiskTrajectory(
    opportunityId: string,
    horizons: number[] = [30, 60, 90]
  ): Promise<RiskPrediction> {
    // 1. Extract time-series features (last 30 days of risk scores, activity, etc.)
    const features = await this.featureStore.getTimeSeriesFeatures(
      opportunityId,
      windowDays: 30
    );
    
    // 2. Call Azure ML LSTM endpoint
    const prediction = await this.mlService.predict(
      'risk-trajectory-lstm',  // Model ID
      {
        features: features,
        horizons: horizons
      }
    );
    
    // 3. Parse and return
    return {
      opportunityId,
      predictions: [
        { horizon: 30, riskScore: prediction.day_30, confidence: prediction.confidence_30 },
        { horizon: 60, riskScore: prediction.day_60, confidence: prediction.confidence_60 },
        { horizon: 90, riskScore: prediction.day_90, confidence: prediction.confidence_90 }
      ],
      leadingIndicators: prediction.leading_indicators,
      predictedAt: new Date()
    };
  }
}
```

**Azure ML Endpoint (Python):**
```python
# Azure ML scoring script
import tensorflow as tf
import numpy as np
from azureml.core.model import Model

def init():
    global model
    model_path = Model.get_model_path('risk_trajectory_lstm')
    model = tf.keras.models.load_model(model_path)

def run(data):
    features = np.array(data['features'])  # Shape: (sequence_length, n_features)
    horizons = data.get('horizons', [30, 60, 90])
    
    # Predict
    predictions = model.predict(features.reshape(1, -1, features.shape[-1]))
    
    return {
        'day_30': float(predictions[0][0]),
        'day_60': float(predictions[0][1]),
        'day_90': float(predictions[0][2]),
        'confidence_30': float(confidence_scores[0]),
        'confidence_60': float(confidence_scores[1]),
        'confidence_90': float(confidence_scores[2]),
        'leading_indicators': extract_leading_indicators(features)
    }
```

**Latency:** <500ms for real-time endpoint (Azure ML optimized)

---

### 4.1.3 Leading Indicators ⚠️ NEEDS INPUT

**Required Data Sources:**

**Question:** Do you have this data available in shards or integrations?

**Engagement Indicators:**
1. **Email Response Rate**
   - Need: Email shards with sent/received timestamps, sender/recipient
   - Source: Microsoft 365, Gmail integration
   - Query: Calculate % of emails from stakeholders that get responses within 48 hours

2. **Meeting Cancellations**
   - Need: Calendar event shards with cancellation status
   - Source: Microsoft 365 Calendar, Google Calendar
   - Query: Count cancellations in last 30 days

3. **Stakeholder Ghosting**
   - Need: Communication shards (email, Slack, calls) with timestamps
   - Source: Email, Slack, Zoom, Gong integrations
   - Query: Detect stakeholders who stopped responding (last contact >14 days)

**Activity Indicators:**
4. **Days Since Last Activity**
   - Need: Activity shards with timestamps
   - Source: CRM activities, email, meetings, calls
   - Currently Available: `lastActivityDate` in opportunity?

5. **Activity Type Diversity**
   - Need: Activity shards with type classification
   - Query: Count unique activity types (email, call, meeting, demo) in last 30 days

6. **Executive Sponsor Engagement Drop**
   - Need: Contact roles (executive sponsor flag) + activity shards
   - Query: Compare executive activity last 30 days vs previous 30 days

**Sentiment Indicators:**
7. **Negative Sentiment Trend**
   - Need: Communication content (email, Slack, call transcripts)
   - Source: Email, Slack, Gong (call transcripts)
   - Requires: Sentiment analysis (Phase 2)

**Action Required:** Please confirm which data sources are available. I'll adjust leading indicator implementation based on availability.

**Fallback if Data Limited:**
- Start with available indicators only (e.g., days since activity, activity count)
- Add more as data sources are integrated
- Phase approach: Basic indicators (Phase 1) → Full indicators (Phase 2)

---

### 4.1.4 Risk Velocity 📋 RECOMMENDED

**Current State:**
- `EarlyWarningService.checkRiskAcceleration()` exists

**Recommendation:** **Extend in place** (Option A)

**Reasoning:**
1. Risk velocity is core to early warning
2. `EarlyWarningService` is the natural home
3. No need for separate service (adds complexity)
4. Keep related functionality together

**Enhanced Implementation:**
```typescript
// risk-analytics/src/services/early-warning.service.ts

export class EarlyWarningService {
  
  /**
   * Calculate risk velocity (1st derivative) and acceleration (2nd derivative)
   */
  async calculateRiskVelocity(
    opportunityId: string,
    windowDays: number = 7
  ): Promise<RiskVelocityMetrics> {
    // Get historical risk scores
    const snapshots = await this.getRiskSnapshots(
      opportunityId,
      windowDays + 7  // Extra window for acceleration calculation
    );
    
    if (snapshots.length < 2) {
      return { velocity: 0, acceleration: 0, trend: 'stable', insufficient_data: true };
    }
    
    // Calculate velocity (1st derivative)
    // velocity = Δ risk score / Δ time
    const recentWindow = snapshots.slice(0, windowDays);
    const earlierWindow = snapshots.slice(windowDays, windowDays * 2);
    
    const recentAvg = this.average(recentWindow.map(s => s.riskScore));
    const earlierAvg = this.average(earlierWindow.map(s => s.riskScore));
    
    const velocity = (recentAvg - earlierAvg) / windowDays;
    
    // Calculate acceleration (2nd derivative)
    // acceleration = Δ velocity / Δ time
    const midWindow = snapshots.slice(Math.floor(windowDays / 2), Math.floor(windowDays * 1.5));
    const midAvg = this.average(midWindow.map(s => s.riskScore));
    
    const velocity1 = (recentAvg - midAvg) / (windowDays / 2);
    const velocity2 = (midAvg - earlierAvg) / (windowDays / 2);
    const acceleration = (velocity1 - velocity2) / (windowDays / 2);
    
    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (velocity > 0.02) trend = 'increasing';       // Risk increasing
    else if (velocity < -0.02) trend = 'decreasing'; // Risk decreasing
    else trend = 'stable';
    
    return {
      velocity,
      acceleration,
      trend,
      velocityThreshold: 0.02,      // Risk score change per day
      accelerationThreshold: 0.005  // Velocity change per day
    };
  }
  
  /**
   * Check if risk acceleration is concerning
   * (Used by both rules and LSTM)
   */
  async checkRiskAcceleration(
    opportunityId: string,
    tenantId: string
  ): Promise<boolean> {
    const metrics = await this.calculateRiskVelocity(opportunityId, 7);
    
    // Alert if:
    // 1. High positive velocity (risk increasing fast)
    // 2. High positive acceleration (risk increasing AND accelerating)
    return (
      metrics.velocity > 0.15 ||  // Risk score increasing >0.15 per week
      metrics.acceleration > 0.05  // Acceleration >0.05 per week
    );
  }
}
```

**Integration with LSTM:**
- Risk velocity and acceleration are **features** for LSTM model
- LSTM can learn to predict future velocity/acceleration
- Helps LSTM understand momentum

---

### 4.2.1 Risk Clustering Ownership 📋 RECOMMENDED

**Recommendation:** **New service in `risk-analytics`** (Option A)

**File:** `packages/risk-analytics/src/services/risk-clustering.service.ts`

**Reasoning:**
1. Risk clustering is a risk analytics capability
2. `risk-analytics` already has many risk services
3. No need for new container (adds deployment complexity)
4. Clustering is not latency-sensitive (can be batch)
5. Follows existing pattern (all risk capabilities in `risk-analytics`)

**Service Structure:**
```typescript
// packages/risk-analytics/src/services/risk-clustering.service.ts

export class RiskClusteringService {
  constructor(
    private riskRepository: RiskRepository,
    private mlService: MLService,
    private monitoring: MonitoringService
  ) {}
  
  /**
   * Identify risk clusters using DBSCAN/K-Means
   * Run as batch job (daily/weekly)
   */
  async identifyRiskClusters(
    tenantId: string,
    industryId?: string
  ): Promise<RiskCluster[]> {
    // 1. Get all risks for tenant/industry
    const risks = await this.riskRepository.getRisksForClustering(tenantId, industryId);
    
    // 2. Extract feature vectors
    const features = risks.map(r => this.extractClusteringFeatures(r));
    
    // 3. Call ML service for clustering (DBSCAN or K-Means)
    const clusterLabels = await this.mlService.cluster(features, {
      algorithm: 'dbscan',
      eps: 0.5,
      minSamples: 5
    });
    
    // 4. Build cluster objects
    const clusters = this.buildClusters(risks, clusterLabels);
    
    // 5. Store in Cosmos DB
    await this.storeCluster(clusters, tenantId);
    
    return clusters;
  }
  
  /**
   * Find association rules (Apriori algorithm)
   */
  async findAssociationRules(
    tenantId: string,
    minSupport: number = 0.01,
    minConfidence: number = 0.5
  ): Promise<AssociationRule[]> {
    // Implementation of Apriori algorithm
    // ...
  }
  
  /**
   * Find similar risk patterns for an opportunity
   */
  async findSimilarRiskPatterns(
    opportunityId: string,
    topK: number = 5
  ): Promise<RiskPattern[]> {
    // Vector search for similar risk patterns
    // ...
  }
}
```

**Registration in `risk-analytics`:**
```typescript
// packages/risk-analytics/src/index.ts
import { RiskClusteringService } from './services/risk-clustering.service';

export async function initializeServices() {
  // ... existing services
  
  services.riskClustering = new RiskClusteringService(
    services.riskRepository,
    services.mlService,
    services.monitoring
  );
  
  // ... register routes
}
```

---

### 4.2.2 Clustering Algorithms 📋 RECOMMENDED

**Recommendation:** **Delegate to Python/Azure ML** (Option B)

**Reasoning:**
1. Python has mature ML libraries (scikit-learn)
2. DBSCAN/K-Means computationally intensive for large datasets
3. Azure ML can run as batch job (not real-time)
4. Node `ml.js` has limited clustering support
5. Keeps Node services focused on orchestration

**Implementation:**

**Node Service (Orchestration):**
```typescript
// packages/risk-analytics/src/services/risk-clustering.service.ts

export class RiskClusteringService {
  async identifyRiskClusters(
    tenantId: string,
    industryId?: string
  ): Promise<RiskCluster[]> {
    // 1. Prepare data for clustering
    const risks = await this.riskRepository.getRisksForClustering(tenantId, industryId);
    const features = this.extractFeatures(risks);
    
    // 2. Call Azure ML batch endpoint for clustering
    const clusteringJob = await this.mlService.startBatchJob(
      'risk-clustering',  // Model/pipeline ID
      {
        features: features,
        algorithm: 'dbscan',
        params: { eps: 0.5, min_samples: 5 }
      }
    );
    
    // 3. Wait for job completion (or poll asynchronously)
    const result = await this.mlService.waitForBatchJob(clusteringJob.id);
    
    // 4. Process results
    return this.processClusteringResults(result, risks);
  }
}
```

**Azure ML Pipeline (Python):**
```python
# Azure ML batch scoring script for clustering
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
import pandas as pd

def run(data):
    features = pd.DataFrame(data['features'])
    algorithm = data.get('algorithm', 'dbscan')
    params = data.get('params', {})
    
    # Normalize features
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)
    
    # Cluster
    if algorithm == 'dbscan':
        clustering = DBSCAN(**params)
    elif algorithm == 'kmeans':
        clustering = KMeans(**params)
    
    labels = clustering.fit_predict(features_scaled)
    
    return {
        'cluster_labels': labels.tolist(),
        'n_clusters': len(set(labels)) - (1 if -1 in labels else 0),
        'outliers': (labels == -1).sum()
    }
```

**Alternative (Lightweight - ml.js):**
- Only if dataset is small (<1000 risks)
- Use for prototyping/MVP
- Migrate to Azure ML when data grows

---

### 4.2.3 Clustering Schedule 📋 RECOMMENDED

**Recommendation:** **Daily Batch** using `workflow-orchestrator`

**Reasoning:**
1. Risk clusters don't change hourly
2. Batch processing more efficient
3. Can run during off-peak hours
4. Allows proper monitoring and retry logic

**Implementation:**

**1. Create Batch Job in workflow-orchestrator:**
```typescript
// packages/workflow-orchestrator/src/jobs/risk-clustering.job.ts

export class RiskClusteringJob implements BatchJob {
  name = 'risk-clustering';
  schedule = '0 2 * * *';  // Daily at 2 AM UTC
  
  async execute(context: JobContext): Promise<void> {
    const tenants = await context.services.tenantService.getActiveTenants();
    
    for (const tenant of tenants) {
      try {
        // Run clustering for each tenant
        const clusters = await context.services.riskClustering.identifyRiskClusters(
          tenant.id
        );
        
        // Generate association rules
        const rules = await context.services.riskClustering.findAssociationRules(
          tenant.id
        );
        
        // Log completion
        context.logger.info('Risk clustering completed', {
          tenantId: tenant.id,
          clustersFound: clusters.length,
          rulesFound: rules.length
        });
      } catch (error) {
        context.logger.error('Risk clustering failed', {
          tenantId: tenant.id,
          error
        });
        // Continue to next tenant
      }
    }
  }
}
```

**2. Register Job:**
```typescript
// packages/workflow-orchestrator/src/index.ts
import { RiskClusteringJob } from './jobs/risk-clustering.job';

scheduler.registerJob(new RiskClusteringJob());
```

**3. Manual Trigger (On-Demand):**
```typescript
// API endpoint for on-demand clustering
app.post('/api/v1/risk-clustering/trigger', async (req, res) => {
  const { tenantId } = req.body;
  
  // Trigger job for specific tenant
  await scheduler.triggerJob('risk-clustering', { tenantId });
  
  res.json({ message: 'Clustering job triggered' });
});
```

**Frequency Options:**
- **Daily:** Best for most tenants (default)
- **Weekly:** If data changes slowly or cost is a concern
- **On-demand:** For ad-hoc analysis or after major data imports

**Action:** Start with daily, adjust based on usage patterns.

---

### 4.3.1 Graph Data Availability ⚠️ NEEDS INPUT

**Question:** Is this graph data available from shard_manager relationships?

**Required Graph Structure:**
```
Opportunities ← → Accounts
     ↓
  Contacts (Stakeholders)
     ↓
  Activities (Emails, Meetings, etc.)
```

**Relationships Needed:**
1. **Opportunity → Account:** `opportunityId → accountId`
2. **Opportunity → Contacts:** Via contact roles or related shards
3. **Opportunity → Activities:** Via shard relationships
4. **Contact → Contact:** Reporting structure, collaboration
5. **Opportunity → Opportunity:** Shared stakeholders, similar deals

**Current Data Model Check:**
- Does `ShardRelationshipService.getRelatedShards()` return all these relationships?
- Are contact roles (decision maker, influencer, etc.) stored?
- Can we query "all opportunities for an account"?
- Can we query "all contacts for an opportunity"?

**Needed API:**
```typescript
// Example queries we need to support
const accountOpportunities = await shardRepository.query({
  shardTypeId: 'c_opportunity',
  filter: { accountId: accountId }
});

const opportunityContacts = await shardRelationshipService.getRelatedShards(
  opportunityId,
  'c_contact'
);

const contactOpportunities = await shardRelationshipService.getRelatedShards(
  contactId,
  'c_opportunity'
);
```

**Action Required:** Please confirm relationship availability or share schema.

**Fallback if Limited:**
- Start with available relationships
- Add missing relationships as Phase 2 enhancement

---

### 4.3.2 Propagation Algorithm 📋 RECOMMENDED

**Recommendation:** **Python (NetworkX) as batch job/API** (Option B)

**Reasoning:**
1. NetworkX is the gold standard for graph algorithms
2. PageRank and epidemic models are computationally intensive
3. Not real-time (batch daily)
4. Can run on Azure ML or separate Python service

**Implementation:**

**Option A: Azure ML Batch Job**
```python
# Azure ML batch scoring for risk propagation
import networkx as nx
import numpy as np

def build_graph(opportunities, accounts, contacts, relationships):
    G = nx.DiGraph()
    
    # Add nodes
    for opp in opportunities:
        G.add_node(opp['id'], type='opportunity', risk_score=opp['risk_score'])
    
    # Add edges from relationships
    for rel in relationships:
        G.add_edge(rel['from'], rel['to'], weight=rel['strength'])
    
    return G

def propagate_risk_pagerank(G, source_node, damping=0.85, iterations=100):
    # Initialize risk scores
    risk_scores = {node: 0 for node in G.nodes()}
    risk_scores[source_node] = G.nodes[source_node]['risk_score']
    
    # PageRank-style propagation
    for _ in range(iterations):
        new_scores = {}
        for node in G.nodes():
            if node == source_node:
                new_scores[node] = risk_scores[node]
            else:
                # Sum risk from predecessors weighted by edge strength
                incoming_risk = sum(
                    risk_scores[pred] * G[pred][node]['weight'] * damping
                    for pred in G.predecessors(node)
                )
                new_scores[node] = incoming_risk
        
        risk_scores = new_scores
    
    return risk_scores

def run(data):
    # Build graph from data
    G = build_graph(
        data['opportunities'],
        data['accounts'],
        data['contacts'],
        data['relationships']
    )
    
    # Propagate risk from source opportunity
    source_opportunity = data['source_opportunity_id']
    propagated_risks = propagate_risk_pagerank(G, source_opportunity)
    
    return {
        'propagated_risks': propagated_risks,
        'impacted_opportunities': [
            {'id': node, 'propagated_risk': score}
            for node, score in propagated_risks.items()
            if score > 0.1  # Threshold
        ]
    }
```

**Option B: Separate Python Service (FastAPI)**
```python
# Separate Python microservice for graph algorithms
from fastapi import FastAPI
import networkx as nx

app = FastAPI()

@app.post('/api/v1/risk-propagation/analyze')
async def analyze_risk_propagation(request: PropagationRequest):
    # Build graph
    G = build_graph(request.data)
    
    # Run propagation
    result = propagate_risk_pagerank(G, request.source_opportunity_id)
    
    return result
```

**Node Service Calls Python API:**
```typescript
// packages/risk-analytics/src/services/risk-propagation.service.ts

export class RiskPropagationService {
  async analyzeRiskPropagation(
    sourceOpportunityId: string
  ): Promise<PropagationAnalysis> {
    // 1. Gather graph data
    const graphData = await this.buildGraphData(sourceOpportunityId);
    
    // 2. Call Python service or Azure ML
    const result = await axios.post(
      'http://python-graph-service/api/v1/risk-propagation/analyze',
      {
        source_opportunity_id: sourceOpportunityId,
        data: graphData
      }
    );
    
    // 3. Process and return
    return this.processPropagationResults(result.data);
  }
}
```

**My Recommendation:** **Azure ML Batch Job** (simpler deployment, no new service to manage)

---

### 4.3.3 Account Health 📋 RECOMMENDED

**Recommendation:** **New API in `risk-analytics`** with Cosmos documents

**File:** `packages/risk-analytics/src/services/account-health.service.ts`

**Container:** New Cosmos container `account_health`
- **Partition Key:** `tenantId`
- **Document ID:** `${tenantId}_${accountId}`
- **TTL:** Optional (keep latest always)

**Schema:**
```typescript
interface AccountHealth {
  id: string;
  tenantId: string;
  accountId: string;
  healthScore: number;  // 0-100
  riskBreakdown: {
    commercial: number;
    technical: number;
    financial: number;
    competitive: number;
    legal: number;
    operational: number;
  };
  trendDirection: 'improving' | 'stable' | 'degrading';
  criticalOpportunities: string[];  // Opp IDs at high risk
  totalRevenue: number;
  revenueAtRisk: number;
  opportunityCount: number;
  lastUpdated: Date;
  calculatedAt: Date;
}
```

**Service Implementation:**
```typescript
// packages/risk-analytics/src/services/account-health.service.ts

export class AccountHealthService {
  async calculateAccountHealth(
    accountId: string,
    tenantId: string
  ): Promise<AccountHealth> {
    // 1. Get all opportunities for account
    const opportunities = await this.opportunityRepository.getByAccount(
      accountId,
      tenantId
    );
    
    // 2. Get risk scores for each opportunity
    const riskScores = await Promise.all(
      opportunities.map(opp => 
        this.riskEvaluationService.getRiskScore(opp.id, tenantId)
      )
    );
    
    // 3. Calculate weighted average (weighted by deal value)
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
    const weightedRisk = opportunities.reduce((sum, opp, i) => {
      return sum + (riskScores[i].riskScore * opp.amount / totalValue);
    }, 0);
    
    // 4. Convert to health score (invert risk)
    const healthScore = (1 - weightedRisk) * 100;
    
    // 5. Calculate trend (compare to last calculation)
    const previousHealth = await this.getPreviousHealth(accountId, tenantId);
    const trend = this.calculateTrend(healthScore, previousHealth?.healthScore);
    
    // 6. Identify critical opportunities
    const criticalOpps = opportunities
      .filter((opp, i) => riskScores[i].riskScore > 0.7)
      .map(opp => opp.id);
    
    // 7. Calculate revenue at risk
    const revenueAtRisk = opportunities
      .filter((opp, i) => riskScores[i].riskScore > 0.5)
      .reduce((sum, opp) => sum + opp.amount, 0);
    
    const health: AccountHealth = {
      id: `${tenantId}_${accountId}`,
      tenantId,
      accountId,
      healthScore,
      riskBreakdown: this.aggregateCategoryRisks(riskScores),
      trendDirection: trend,
      criticalOpportunities: criticalOpps,
      totalRevenue: totalValue,
      revenueAtRisk,
      opportunityCount: opportunities.length,
      lastUpdated: new Date(),
      calculatedAt: new Date()
    };
    
    // 8. Store in Cosmos DB
    await this.accountHealthRepository.upsert(health);
    
    return health;
  }
}
```

**Batch Job (Daily Update):**
```typescript
// packages/workflow-orchestrator/src/jobs/account-health.job.ts

export class AccountHealthJob implements BatchJob {
  schedule = '0 3 * * *';  // Daily at 3 AM
  
  async execute(context: JobContext): Promise<void> {
    const tenants = await context.services.tenantService.getActiveTenants();
    
    for (const tenant of tenants) {
      const accounts = await context.services.accountRepository.getAccounts(tenant.id);
      
      for (const account of accounts) {
        await context.services.accountHealth.calculateAccountHealth(
          account.id,
          tenant.id
        );
      }
    }
  }
}
```

**Why Not Extend RevenueAtRiskService:**
- Account health is broader than revenue risk
- Includes trend analysis, critical opportunity identification
- Separate concern from revenue calculations
- Can be used independently

---

### 4.4.1 Industry Source ⚠️ NEEDS INPUT

**Question:** Where does "industry" come from in your current system?

**Options:**
1. **Account-level** (most common)
   - Field: `account.industry` or `account.industryId`
   - Inherited by all opportunities for that account

2. **Opportunity-level** (less common)
   - Field: `opportunity.industry` or `opportunity.industryId`
   - Allows different industries per opportunity (same account)

3. **Org-level** (rare)
   - Tenant setting: "This org only sells to X industry"
   - All opportunities default to this industry

**Recommended Hierarchy (if not already defined):**
```
Opportunity.industryId (if set)
    ↓ fallback to
Account.industryId (if set)
    ↓ fallback to
Tenant.defaultIndustryId (if set)
    ↓ fallback to
"general" (global model)
```

**Schema Example:**
```typescript
interface OpportunityShard {
  structuredData: {
    industryId?: string;  // Explicit override
    accountId: string;
    // ...
  };
}

interface AccountShard {
  structuredData: {
    industryId?: string;  // Primary industry
    // ...
  };
}
```

**Action Required:** Please confirm field names and hierarchy.

---

### 4.4.2 Industry List 📋 RECOMMENDED

**Recommendation:** **Use comprehensive list, configurable per tenant**

**Implementation:**

**1. Global Industry Catalog (configuration-service):**
```typescript
// packages/configuration-service/src/catalogs/industries.ts

export const GLOBAL_INDUSTRIES = [
  { id: 'technology', name: 'Technology & Software', active: true },
  { id: 'financial_services', name: 'Financial Services', active: true },
  { id: 'healthcare', name: 'Healthcare & Life Sciences', active: true },
  { id: 'manufacturing', name: 'Manufacturing & Industrial', active: true },
  { id: 'retail', name: 'Retail & Consumer Goods', active: true },
  { id: 'professional_services', name: 'Professional Services', active: true },
  { id: 'media', name: 'Media & Entertainment', active: true },
  { id: 'real_estate', name: 'Real Estate & Construction', active: true },
  { id: 'energy', name: 'Energy & Utilities', active: true },
  { id: 'education', name: 'Education', active: true },
  { id: 'government', name: 'Government & Public Sector', active: true },
  { id: 'telecommunications', name: 'Telecommunications', active: true },
  { id: 'transportation', name: 'Transportation & Logistics', active: true },
  { id: 'hospitality', name: 'Hospitality & Travel', active: true },
  { id: 'nonprofit', name: 'Nonprofit & Associations', active: true },
  { id: 'agriculture', name: 'Agriculture', active: true }
];
```

**2. Tenant Industry Settings:**
```typescript
// Tenants can enable/disable industries
interface TenantIndustrySettings {
  tenantId: string;
  enabledIndustries: string[];  // Subset of GLOBAL_INDUSTRIES
  customIndustries: Array<{      // Tenant-specific additions
    id: string;
    name: string;
  }>;
}
```

**3. Industry Catalog API:**
```typescript
// GET /api/v1/industries
app.get('/api/v1/industries', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  
  const settings = await configService.getTenantIndustrySettings(tenantId);
  
  // Return enabled global industries + custom industries
  const industries = [
    ...GLOBAL_INDUSTRIES.filter(i => settings.enabledIndustries.includes(i.id)),
    ...settings.customIndustries
  ];
  
  res.json({ industries });
});
```

**Benefits:**
- Standard set for consistency
- Tenant customization for flexibility
- Supports custom industries (e.g., "Fintech" as sub-industry)

---

### 4.4.3 Model Routing 📋 RECOMMENDED

**Recommendation:** **Implement in `ml-service`** (Option A)

**Reasoning:**
1. Model selection is core ML concern
2. `ml-service` knows available models and their metadata
3. Keeps `risk-analytics` focused on orchestration
4. Centralized decision logic

**Implementation:**
```typescript
// packages/ml/src/services/model-selection.service.ts

export class ModelSelectionService {
  private modelRegistry: Map<string, ModelMetadata>;  // modelId -> metadata
  
  async selectRiskScoringModel(
    industryId: string | undefined,
    features: FeatureVector
  ): Promise<{ modelId: string; fallbackModelId?: string; strategy: 'global' | 'industry' | 'hybrid' }> {
    
    // 1. If no industry, use global model
    if (!industryId) {
      return {
        modelId: 'risk-scoring-global',
        strategy: 'global'
      };
    }
    
    // 2. Check if industry-specific model exists and is ready
    const industryModelId = `risk-scoring-${industryId}`;
    const industryModel = this.modelRegistry.get(industryModelId);
    
    if (!industryModel || !industryModel.isReady) {
      // Industry model doesn't exist or not ready, use global
      return {
        modelId: 'risk-scoring-global',
        strategy: 'global'
      };
    }
    
    // 3. Check training data threshold (>3000 examples)
    if (industryModel.trainingExamples < 3000) {
      // Insufficient data, use global
      this.logger.warn('Industry model has insufficient training data', {
        industryId,
        trainingExamples: industryModel.trainingExamples,
        threshold: 3000
      });
      
      return {
        modelId: 'risk-scoring-global',
        strategy: 'global'
      };
    }
    
    // 4. Check performance improvement (>5% better than global)
    const globalModel = this.modelRegistry.get('risk-scoring-global');
    const improvementRatio = industryModel.performance.r2 / globalModel.performance.r2;
    
    if (improvementRatio < 1.05) {
      // Industry model not significantly better, use global
      this.logger.info('Industry model not significantly better than global', {
        industryId,
        industryR2: industryModel.performance.r2,
        globalR2: globalModel.performance.r2,
        improvement: (improvementRatio - 1) * 100 + '%'
      });
      
      return {
        modelId: 'risk-scoring-global',
        strategy: 'global'
      };
    }
    
    // 5. Use industry model with global as fallback
    return {
      modelId: industryModelId,
      fallbackModelId: 'risk-scoring-global',
      strategy: 'industry'
    };
  }
}
```

**Usage in risk-analytics:**
```typescript
// packages/risk-analytics/src/services/risk-evaluation.service.ts

export class RiskEvaluationService {
  async evaluateWithML(
    opportunityId: string,
    tenantId: string
  ): Promise<RiskScore> {
    // 1. Get opportunity
    const opportunity = await this.opportunityRepository.get(opportunityId, tenantId);
    
    // 2. Determine industry
    const industryId = await this.getIndustryId(opportunity);
    
    // 3. Extract features
    const features = await this.featureStore.extractFeatures(opportunityId);
    
    // 4. Select model
    const modelSelection = await this.mlService.selectRiskScoringModel(
      industryId,
      features
    );
    
    // 5. Predict
    try {
      const prediction = await this.mlService.predict(
        modelSelection.modelId,
        features
      );
      
      return prediction;
    } catch (error) {
      if (modelSelection.fallbackModelId) {
        // Fallback to global model
        this.logger.warn('Industry model failed, falling back to global', { error });
        return await this.mlService.predict(modelSelection.fallbackModelId, features);
      }
      
      throw error;
    }
  }
}
```

---

### 4.4.4 Shadow Evaluation 📋 RECOMMENDED

**Recommendation:** **Log only, async** (Option A)

**Reasoning:**
1. Don't show both to UI (confusing for users)
2. Logging allows performance comparison without user impact
3. Async ensures no latency penalty
4. Can promote industry model to primary once validated

**Implementation:**
```typescript
// packages/ml/src/services/prediction.service.ts

export class PredictionService {
  async predictWithShadowEvaluation(
    modelId: string,
    features: FeatureVector,
    shadowModelId?: string
  ): Promise<Prediction> {
    
    // 1. Primary prediction
    const primaryPrediction = await this.predict(modelId, features);
    
    // 2. Shadow prediction (async, non-blocking)
    if (shadowModelId) {
      this.runShadowPrediction(shadowModelId, features, primaryPrediction)
        .catch(error => {
          this.logger.error('Shadow prediction failed', { error, shadowModelId });
        });
    }
    
    // 3. Return primary immediately (no waiting for shadow)
    return primaryPrediction;
  }
  
  private async runShadowPrediction(
    shadowModelId: string,
    features: FeatureVector,
    primaryPrediction: Prediction
  ): Promise<void> {
    try {
      // Run shadow prediction
      const shadowPrediction = await this.predict(shadowModelId, features);
      
      // Log comparison
      await this.logShadowComparison({
        primaryModelId: primaryPrediction.modelId,
        shadowModelId: shadowModelId,
        primaryPrediction: primaryPrediction.value,
        shadowPrediction: shadowPrediction.value,
        difference: Math.abs(primaryPrediction.value - shadowPrediction.value),
        features: features,
        timestamp: new Date()
      });
      
      // Track metrics in Application Insights
      this.monitoring.trackMetric('shadow_prediction_difference', {
        primaryModelId: primaryPrediction.modelId,
        shadowModelId: shadowModelId,
        difference: Math.abs(primaryPrediction.value - shadowPrediction.value)
      });
    } catch (error) {
      // Don't fail primary prediction if shadow fails
      this.logger.error('Shadow prediction error', { error });
    }
  }
}
```

**Shadow Evaluation Dashboard:**
- Application Insights dashboard showing:
  - Primary vs shadow prediction comparison
  - Difference distribution
  - Outlier detection (large differences)
  - Recommendation to promote/demote models

**Promotion Criteria:**
- After 1000+ shadow predictions
- If shadow consistently better (>5% improvement)
- If difference < 10% (predictions align)
- If no major outliers

---

## Summary & Next Steps

I've answered **95+ questions** comprehensively. Here are the **critical questions requiring your input**:

### 🚨 CRITICAL - Need Your Decision

1. **Scope (1.2):** Full 12-month plan or subset?
2. **MVP Definition (1.4):** Confirm 3-4 month MVP scope?
3. **Opportunity Schema (3.3):** Please share current opportunity shard structure
4. **Industry Field (4.4.1):** Confirm where industry is stored (account/opportunity/org)
5. **Graph Relationships (4.3.1):** Confirm availability of opportunity-account-contact relationships

### ⚠️ RECOMMENDED - Please Review

1. **Technology Choices:**
   - Azure ML REST endpoints (not Python sidecar) ✅
   - DBSCAN/K-Means via Azure ML (not Node) ✅
   - Risk propagation via Azure ML batch job ✅

2. **Service Architecture:**
   - Extend existing services (not new containers) ✅
   - RiskClusteringService in risk-analytics ✅
   - AccountHealthService in risk-analytics ✅

3. **Data Strategy:**
   - Synthetic data generation in scope ✅
   - News as shards (using news shard type) ✅
   - Risk snapshots materialized view ✅

### 📋 Action Items

1. **Run data assessment query** (Section 3.1) to check training data volume
2. **Share opportunity schema** (Section 3.3) for feature engineering
3. **Confirm relationship availability** (Section 4.3.1) for graph analysis
4. **Decide on implementation scope** (Section 1.2)
5. **Review and approve technology recommendations**

Once you provide the critical inputs, I can create a detailed implementation plan with specific file changes, timelines, and tasks!

Would you like me to proceed with any specific area, or would you prefer to provide the critical inputs first?
