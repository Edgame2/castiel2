# Model Architecture Recommendation: Industry-Specific vs Global Models

**Date:** January 2025  
**Focus:** Risk Scoring, Forecasting, Recommendations  
**Question:** One model per use case and industry, or alternative approach?

---

## Executive Summary

**Recommendation: Hybrid Approach - Global Models with Industry-Specific Fine-Tuning**

Your instinct for industry-specific models is **partially correct**, but a pure "one model per industry" approach has significant drawbacks. Instead, I recommend:

1. **Start with Global Models** (industry as a feature)
2. **Add Industry-Specific Models** only when justified by:
   - Sufficient data (>3000 examples per industry)
   - Significant performance improvement (>5%)
   - Business value

This balances performance, maintenance, and scalability.

---

## Analysis: One Model Per Industry

### Your Proposal

**Architecture:**
- Risk Scoring: 1 model per industry (e.g., Risk Scoring - Healthcare, Risk Scoring - Finance)
- Forecasting: 1 model per industry
- Recommendations: 1 model per industry

**Total Models:** 3 use cases × ~16 industries = **~48 models minimum**

### Pros of Industry-Specific Models

1. **Specialized Learning**
   - Can learn industry-specific patterns precisely
   - Potentially higher accuracy for industries with distinct patterns
   - Better interpretability for industry-specific factors

2. **No Cross-Industry Noise**
   - No risk of irrelevant patterns from other industries diluting signals
   - Cleaner feature importance per industry

### Cons of Industry-Specific Models

1. **Data Scarcity Problem**
   - **Critical Issue:** XGBoost needs minimum 1000+ examples, ideally 3000-10000+ for reliable performance
   - With 16+ industries, many will have insufficient data
   - Small industries will have poor model performance
   - Cold-start problem for new industries

2. **Maintenance Overhead**
   - **48+ models** to train, deploy, monitor, update
   - 48× training jobs, 48× deployment pipelines
   - 48× monitoring dashboards
   - Significant operational complexity

3. **Cost and Complexity**
   - Higher infrastructure costs
   - More complex model registry
   - More A/B testing complexity
   - Harder to maintain consistency

4. **Generalization Loss**
   - Misses shared patterns across industries
   - Can't leverage data from similar industries
   - Less robust to data distribution shifts

---

## Recommended Approach: Hybrid Architecture

### Strategy: Global Models + Industry Fine-Tuning

**Phase 1: Global Models (Start Here)**

For each use case (Risk Scoring, Forecasting, Recommendations):
- **One global model** trained on all industries
- **Industry as a feature** (categorical/embedding)
- **Industry-specific features** (industry win rates, industry baselines)
- **Shared patterns** learned across all industries

**Benefits:**
- Leverages all available data
- Learns shared patterns
- Works for all industries immediately
- Single model to maintain
- Easy to add new industries

**Implementation:**
```typescript
// Global model with industry feature
interface GlobalModelFeatures {
  // ... all standard features
  industry: string; // Categorical feature
  industryWinRate: number; // Industry-specific metric
  industryRiskBaseline: number; // Industry-specific baseline
  // ... other industry-specific features
}
```

**Phase 2: Industry-Specific Models (When Justified)**

Add industry-specific models only when:
1. **Data Threshold:** >3000 examples with outcomes for that industry
2. **Performance Improvement:** >5% better than global model (validated)
3. **Business Value:** High-value industry or distinct patterns

**Fine-Tuning Approach:**
- Start with global model as base
- Fine-tune on industry-specific data
- Compare performance vs. global model
- Deploy if significantly better

**Implementation:**
```typescript
// Industry-specific model (fine-tuned from global)
interface IndustryModel {
  id: string;
  modelType: 'risk_scoring' | 'forecasting' | 'recommendations';
  industryId: string;
  scope: 'industry';
  parentModelId: string; // Reference to global model
  fineTunedFrom: string; // Global model version
  performanceImprovement: number; // % improvement over global
}
```

### Model Selection Logic

```typescript
async function getModelForInference(
  modelType: ModelType,
  industryId?: string,
  tenantId?: string
): Promise<LoadedModel> {
  // 1. Check for industry-specific model
  if (industryId) {
    const industryModel = await getIndustryModel(modelType, industryId);
    if (industryModel && industryModel.isActive) {
      // Check if industry model is better
      if (industryModel.performanceImprovement > 0.05) {
        return await loadModel(industryModel.id);
      }
    }
  }
  
  // 2. Fall back to global model
  const globalModel = await getGlobalModel(modelType);
  return await loadModel(globalModel.id);
}
```

---

## Detailed Recommendation by Use Case

### 1. Risk Scoring

**Recommendation: Global Model + Industry Fine-Tuning**

**Rationale:**
- Risk patterns have significant overlap across industries
- Industry-specific risks already captured in risk catalog
- Industry can be a strong feature in global model
- Fine-tune only for industries with distinct risk patterns (e.g., healthcare regulatory risks, finance compliance risks)

**Implementation:**
- **Global Model:** All industries, industry as categorical feature
- **Industry Models:** Only for industries with:
  - >3000 risk snapshots with outcomes
  - Distinct risk patterns (validated)
  - >5% performance improvement

**Expected Models:**
- 1 global model
- 2-5 industry-specific models (for large, distinct industries)

**Total: 3-6 models** (vs. 16+ with pure industry approach)

---

### 2. Forecasting

**Recommendation: Global Model + Industry Fine-Tuning**

**Rationale:**
- Forecasting patterns (seasonality, trends) often similar across industries
- Industry-specific seasonality can be captured as features
- Revenue forecasting benefits from larger dataset
- Fine-tune for industries with distinct seasonal patterns

**Implementation:**
- **Global Model:** All industries, industry seasonality as features
- **Industry Models:** Only for industries with:
  - >3000 opportunities with outcomes
  - Distinct seasonal patterns (e.g., retail Q4, education academic year)
  - >5% forecast accuracy improvement

**Expected Models:**
- 1 global model
- 3-6 industry-specific models (for industries with strong seasonality)

**Total: 4-7 models** (vs. 16+ with pure industry approach)

---

### 3. Recommendations

**Recommendation: Global Model + Industry Fine-Tuning**

**Rationale:**
- Recommendation patterns often similar across industries
- Industry context can be captured in features
- User behavior patterns transcend industries
- Fine-tune for industries with distinct recommendation needs

**Implementation:**
- **Global Model:** All industries, industry as context feature
- **Industry Models:** Only for industries with:
  - >5000 user interactions
  - Distinct recommendation patterns
  - >5% recommendation quality improvement

**Expected Models:**
- 1 global model
- 2-4 industry-specific models (for industries with unique needs)

**Total: 3-5 models** (vs. 16+ with pure industry approach)

---

## Data Requirements Analysis

### Minimum Data Per Industry Model

**XGBoost Requirements (Research-Based):**
- **Minimum:** 1000 examples (barely sufficient, high overfitting risk)
- **Recommended:** 3000-5000 examples (reliable performance)
- **Ideal:** 10000+ examples (optimal performance)

**Per Use Case:**
- **Risk Scoring:** 3000+ risk snapshots with outcomes
- **Forecasting:** 3000+ opportunities with historical outcomes
- **Recommendations:** 5000+ user interactions with feedback

### Reality Check

**With 16+ industries:**
- Most industries will have <1000 examples initially
- Only 2-5 industries likely have >3000 examples
- Many industries will have insufficient data for separate models

**Conclusion:** Pure industry-specific approach would result in:
- Poor performance for most industries (insufficient data)
- Only 2-5 industries with good models
- 11+ industries with inadequate models

---

## Recommended Architecture

### Model Hierarchy

```
Global Models (3 models)
├── Risk Scoring (Global)
├── Forecasting (Global)
└── Recommendations (Global)

Industry-Specific Models (Fine-tuned, when justified)
├── Risk Scoring
│   ├── Healthcare (if >3000 examples, >5% improvement)
│   ├── Finance (if >3000 examples, >5% improvement)
│   └── ... (only when justified)
├── Forecasting
│   ├── Retail (if distinct seasonality, >5% improvement)
│   ├── Education (if academic year patterns, >5% improvement)
│   └── ... (only when justified)
└── Recommendations
    ├── Technology (if distinct patterns, >5% improvement)
    └── ... (only when justified)
```

### Model Selection Strategy

```typescript
async function selectModel(
  modelType: ModelType,
  industryId?: string
): Promise<ModelSelection> {
  // 1. Check for industry-specific model
  if (industryId) {
    const industryModel = await getIndustryModel(modelType, industryId);
    
    if (industryModel && industryModel.isActive) {
      // Validate it's better than global
      if (industryModel.performanceImprovement > 0.05) {
        return {
          modelId: industryModel.id,
          modelType: 'industry-specific',
          confidence: 'high'
        };
      }
    }
  }
  
  // 2. Use global model
  const globalModel = await getGlobalModel(modelType);
  return {
    modelId: globalModel.id,
    modelType: 'global',
    confidence: 'high'
  };
}
```

---

## Implementation Plan

### Phase 1: Global Models (Weeks 1-4)

1. **Train Global Models:**
   - Risk Scoring (all industries)
   - Forecasting (all industries)
   - Recommendations (all industries)

2. **Include Industry Features:**
   - Industry as categorical feature
   - Industry-specific baselines
   - Industry-specific patterns

3. **Evaluate Performance:**
   - Overall performance
   - Per-industry performance breakdown
   - Identify industries with poor performance

### Phase 2: Industry Analysis (Weeks 5-6)

1. **Data Assessment:**
   - Count examples per industry
   - Identify industries with >3000 examples
   - Assess data quality per industry

2. **Performance Analysis:**
   - Compare global model performance per industry
   - Identify industries with <80% of global average
   - Identify industries with distinct patterns

3. **Prioritization:**
   - Rank industries by:
     - Data availability
     - Performance gap
     - Business value
     - Pattern distinctness

### Phase 3: Industry Fine-Tuning (Weeks 7-12)

1. **Fine-Tune Top Priority Industries:**
   - Start with industries with most data
   - Fine-tune from global model
   - Compare performance

2. **Deploy if Justified:**
   - Deploy if >5% improvement
   - A/B test against global model
   - Monitor performance

3. **Iterate:**
   - Continue for other industries
   - Re-evaluate global model periodically
   - Update industry models as data grows

---

## Comparison: Your Approach vs. Recommended

| Aspect | One Model Per Industry | Hybrid (Global + Fine-Tuning) |
|--------|----------------------|------------------------------|
| **Total Models** | ~48 models | 3-15 models |
| **Maintenance** | High (48× complexity) | Low (3-15× complexity) |
| **Data Efficiency** | Poor (can't use cross-industry data) | Excellent (leverages all data) |
| **Performance (High-Data Industries)** | Potentially better | Similar (fine-tuned) |
| **Performance (Low-Data Industries)** | Poor (insufficient data) | Good (global model) |
| **Scalability** | Difficult (new industry = new model) | Easy (new industry = feature) |
| **Cold Start** | Poor (need data first) | Good (works immediately) |
| **Cost** | High (48× training/deployment) | Low (3-15× training/deployment) |
| **Consistency** | Hard to maintain | Easier (shared base) |

---

## When Industry-Specific Models Are Justified

### Criteria Checklist

**Industry-specific model is justified when ALL are true:**

1. **Data Availability:**
   - ✅ >3000 examples with outcomes
   - ✅ Data quality is good
   - ✅ Sufficient validation set

2. **Performance Improvement:**
   - ✅ >5% improvement over global model (validated)
   - ✅ Improvement is statistically significant
   - ✅ Improvement holds on test set

3. **Business Value:**
   - ✅ High-value industry
   - ✅ Distinct patterns that matter
   - ✅ Users benefit from specialization

4. **Operational Feasibility:**
   - ✅ Can maintain additional model
   - ✅ Training/deployment pipeline ready
   - ✅ Monitoring in place

### Industries Likely to Qualify

Based on typical data distribution:
- **Technology:** Often largest, likely to qualify
- **Healthcare:** Distinct regulatory patterns, may qualify
- **Finance:** Distinct compliance patterns, may qualify
- **Retail:** Strong seasonality, may qualify for forecasting

**Most industries:** Will use global model (which is fine!)

---

## Feature Engineering for Global Models

### Industry as a Feature

**Categorical Encoding:**
```typescript
// One-hot encoding for industry
industry_technology: 0 | 1
industry_healthcare: 0 | 1
industry_finance: 0 | 1
// ... for each industry
```

**Industry Embeddings:**
```typescript
// Learned embeddings (better for many industries)
industry_embedding: [0.23, -0.45, 0.67, ...] // 16-dim vector
```

**Industry-Specific Features:**
```typescript
// Industry baselines and patterns
industryWinRate: number // Industry average win rate
industryRiskBaseline: number // Industry average risk
industryDealSizeAvg: number // Industry average deal size
industrySeasonalityFactor: number // Industry seasonal adjustment
```

### Benefits

- Industry patterns captured as features
- Model learns industry interactions
- Shared patterns across industries
- Industry-specific patterns when data supports

---

## Monitoring and Evaluation

### Per-Industry Performance Tracking

**Monitor global model performance per industry:**
```typescript
interface IndustryPerformance {
  industryId: string;
  modelType: ModelType;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    // ... other metrics
  };
  sampleSize: number;
  performanceVsGlobal: number; // % difference
  recommendation: 'use_global' | 'consider_industry_model' | 'use_industry_model';
}
```

### Decision Framework

**When to create industry-specific model:**
1. Global model performance <80% of target for that industry
2. Industry has >3000 examples
3. Industry patterns are distinct (validated)
4. Business value justifies additional model

**When to keep using global model:**
1. Global model performance meets targets
2. Industry has <3000 examples
3. Industry patterns similar to others
4. Additional model not justified

---

## Final Recommendation

### Start Simple, Scale Smart

**Phase 1 (Initial):**
- **3 global models** (one per use case)
- Industry as a feature
- Evaluate per-industry performance

**Phase 2 (As Data Grows):**
- Add industry-specific models only when:
  - >3000 examples available
  - >5% performance improvement validated
  - Business value justifies it

**Expected Outcome:**
- **3-15 total models** (vs. 48+ with pure industry approach)
- **Better performance** for all industries (global model works for all)
- **Lower maintenance** (fewer models)
- **Easier scaling** (new industries work immediately)

### You're Partially Right

**Correct:**
- Industry-specific patterns matter
- Some industries need specialization
- One-size-fits-all may not be optimal

**But:**
- Data scarcity makes pure industry approach risky
- Maintenance overhead is significant
- Global models with industry features often perform well
- Fine-tuned models can match industry-specific performance

---

## Conclusion

**Recommendation: Hybrid Approach**

1. **Start with global models** (industry as feature)
2. **Add industry-specific models** only when justified
3. **Use fine-tuning** from global model for industry models
4. **Monitor per-industry performance** to guide decisions

**Expected Result:**
- 3-15 models total (vs. 48+)
- Better performance for all industries
- Lower maintenance and cost
- Easier to scale and maintain

**You're not wrong** - industry-specific models can be valuable. But start with global models and add industry-specific models strategically, not by default.

---

## Next Steps

1. **Assess data availability** per industry
2. **Train global models** with industry features
3. **Evaluate per-industry performance**
4. **Identify candidates** for industry-specific models
5. **Fine-tune selectively** based on data and performance

---

**Document Status:** Recommendation Complete  
**Last Updated:** January 2025
