# ML Service Use Cases

**Date:** January 2025  
**Status:** 📋 **PLANNED** - Ready for Implementation  
**Version:** 1.0

## Overview

The ML Service provides ML-powered predictions for three priority use cases that provide the highest business value:

1. **Risk Scoring** ⭐ - ML-powered risk prediction to identify opportunities at risk
2. **Revenue Forecasting** ⭐ - Predictive revenue forecasting across multiple levels
3. **Recommendations** ⭐ - Intelligent next-best-action recommendations

These use cases transform the platform from **reactive** (analyzing what happened) to **predictive** (anticipating what will happen).

## Use Case 1: Risk Scoring ⭐

**Priority**: Highest (START HERE - highest impact)  
**Implementation**: Weeks 1-4  
**Model Type**: Regression (XGBoost/LightGBM via AutoML)

### Purpose

ML-powered risk score predictions to enhance existing risk analysis. Proactively identify at-risk opportunities before they're lost.

### Capabilities

- **Risk Score Prediction**: Predicts risk scores (0-1 scale) for opportunities
- **Category-Specific Scores**: Individual risk scores for:
  - Commercial risks (pricing, contract terms, competition)
  - Technical risks (feasibility, integration complexity)
  - Financial risks (budget, payment terms, economic factors)
  - Legal risks (compliance, contract issues)
  - Competitive risks (market position, competitor activity)
  - Operational risks (resource availability, timeline)
- **Multi-Level Aggregation**: 
  - Opportunity-level risk scores
  - Account-level aggregate risk
  - Team-level aggregate risk
  - Tenant-level aggregate risk
- **Confidence Intervals**: Uncertainty quantification showing how certain the model is
- **Risk Trends**: How risk is changing over time (increasing/decreasing)

### Integration

- **Integrates with**: Existing `RiskEvaluationService`
- **Enhances**: Rule-based and LLM-powered risk detection
- **Combines**: ML predictions with existing detection methods (weighted ensemble)

### Model Details

**Input Features**:
- Opportunity attributes (amount, probability, stage, closeDate)
- Risk indicators (detected risks, competitor presence, budget confirmation)
- Historical features (owner win rate, account health, industry win rate)
- Relationship features (stakeholder count, activity metrics)
- Temporal features (days to close, days in stage, seasonality)

**Output**:
```typescript
{
  riskScore: 0.75,  // 0-1 scale
  categoryScores: {
    commercial: 0.80,
    technical: 0.65,
    financial: 0.70,
    legal: 0.55,
    competitive: 0.85,
    operational: 0.60
  },
  confidence: 0.85,
  uncertainty: {
    lower: 0.70,
    upper: 0.80
  },
  trend: "increasing" | "decreasing" | "stable"
}
```

### Performance Targets

- **R² Score**: >85%
- **Calibration Error**: <0.05 (5% calibration error)
- **Brier Score**: <0.15 (calibration quality)
- **AUC**: >0.80
- **Business Impact**: Risk score accuracy correlates with actual opportunity outcomes

### Business Value

- **Proactive Risk Management**: Identify at-risk opportunities before they're lost
- **Multi-Level Visibility**: Understand risk at opportunity, account, team, and tenant levels
- **Confidence Intervals**: Know how certain predictions are
- **Trend Analysis**: Track how risk changes over time

## Use Case 2: Revenue Forecasting ⭐

**Priority**: High  
**Implementation**: Weeks 5-6  
**Model Type**: Regression / Time Series (XGBoost/LightGBM via AutoML)

### Purpose

ML-powered revenue forecasts at multiple levels. Predict future revenue with confidence intervals, not just probability-weighted estimates.

### Capabilities

- **Opportunity Level**: 
  - Revenue forecasts with uncertainty quantification
  - Close date forecasts (probability distribution)
  - Risk-adjusted revenue forecasts
  - Scenario analysis (best/base/worst case)
- **Team Level**: 
  - Pipeline forecast (total value, weighted by probability)
  - Win rate forecast
  - Quota attainment forecast
  - Risk-adjusted pipeline forecast
- **Tenant Level**: 
  - Total revenue forecast
  - Growth rate forecast
  - Churn risk forecast
  - Industry benchmarking

### Integration

- **Integrates with**: `ForecastingService` (new or enhanced)
- **Enhances**: Probability-weighted revenue estimates
- **Provides**: Uncertainty quantification and scenario analysis

### Model Details

**Input Features**:
- Opportunity attributes (amount, probability, stage, closeDate)
- Historical revenue patterns
- Industry seasonality features
- Team performance metrics
- Temporal features (month, quarter, year-end effects)

**Output**:
```typescript
{
  pointForecast: 500000,  // P50 forecast
  uncertainty: {
    p10: 450000,  // 10th percentile (conservative)
    p50: 500000,  // 50th percentile (point forecast)
    p90: 550000   // 90th percentile (optimistic)
  },
  scenarios: {
    best: 550000,
    base: 500000,
    worst: 450000
  },
  confidence: 0.80,
  forecastHorizon: "30_days" | "60_days" | "90_days"
}
```

### Performance Targets

- **MAPE**: <15% (Mean Absolute Percentage Error)
- **Forecast Bias**: <5% (over 30 days), <10% (over 60 days), <15% (over 90 days)
- **R²**: >0.75
- **Business Impact**: Forecast accuracy improves business planning

### Business Value

- **Accurate Planning**: Predict revenue with confidence intervals
- **Scenario Analysis**: Understand best/base/worst case scenarios
- **Multi-Level Forecasting**: Forecast at opportunity, team, and tenant levels
- **Industry Seasonality**: Account for industry-specific patterns

## Use Case 3: Recommendations ⭐

**Priority**: High  
**Implementation**: Weeks 7-8  
**Model Type**: Ranking (XGBoost Ranker via AutoML, Phase 1)

### Purpose

ML-enhanced recommendation system for better personalization. Guide users to the most impactful actions based on learned patterns.

### Capabilities

- **Improved Ranking**: Better recommendation ranking and personalization
- **User Engagement**: Better user engagement and click-through rates
- **Context-Aware**: Context-aware recommendations based on:
  - User behavior patterns
  - Opportunity characteristics
  - Historical success patterns
  - Similar user actions
- **Next-Best-Action**: Intelligent next-best-action recommendations

### Integration

- **Integrates with**: Existing `RecommendationsService`
- **Enhances**: Vector search and collaborative filtering
- **Combines**: ML ranking with existing recommendation methods

### Model Details

**Input Features**:
- User features (role, historical actions, preferences)
- Opportunity features (stage, amount, risk score)
- Context features (time of day, day of week, recent activity)
- User-item interaction history
- Similar user patterns

**Output**:
```typescript
{
  recommendations: [
    {
      action: "Send proposal within 48 hours",
      score: 0.92,
      confidence: 0.85,
      reason: "Budget confirmed and decision maker engaged",
      priority: "high"
    },
    {
      action: "Schedule executive alignment call",
      score: 0.78,
      confidence: 0.70,
      reason: "Strengthen relationship with decision maker",
      priority: "medium"
    }
  ],
  personalizationScore: 0.88,
  contextRelevance: 0.85
}
```

### Performance Targets

- **NDCG@10**: >0.75 (Normalized Discounted Cumulative Gain)
- **CTR Uplift**: >20% improvement over non-ML baseline
- **Precision@10**: >0.50
- **Business Impact**: Recommendations drive user value and engagement

### Business Value

- **Better Personalization**: Recommendations tailored to user and context
- **Higher Engagement**: Improved click-through rates and user engagement
- **Actionable Guidance**: Clear next-best-action recommendations
- **Context-Aware**: Recommendations adapt to current situation

## Implementation Timeline

### Phase 1: Priority Use Cases (Weeks 1-8)

**Week 1-2: Foundation**
- Azure ML Workspace setup
- FeatureStoreService implementation
- Synthetic data augmentation pipeline

**Week 3-4: Risk Scoring** ⭐ **START HERE**
- Risk Scoring Model training
- Integration with RiskEvaluationService
- ML endpoints and calibration

**Week 5-6: Revenue Forecasting**
- Forecasting Model training
- Integration with ForecastingService
- Multi-level forecasting implementation

**Week 7-8: Recommendations**
- Recommendations Model training
- Integration with RecommendationsService
- Ranking and personalization

### Phase 2: Industry Analysis & Fine-Tuning (Weeks 9-12)

- Industry performance analysis
- Industry-specific models (when justified)
- Model selection logic

### Phase 3: Continuous Learning (Weeks 13-16)

- Feedback collection operational
- Continuous learning enabled
- Automated retraining pipeline

## Success Criteria

### Technical Metrics

**Risk Scoring**:
- R² score: >85%
- Calibration Error: <0.05
- Brier Score: <0.15
- AUC: >0.80

**Revenue Forecasting**:
- MAPE: <15%
- Forecast Bias: <5% (30 days), <10% (60 days), <15% (90 days)
- R²: >0.75

**Recommendations**:
- NDCG@10: >0.75
- CTR Uplift: >20%
- Precision@10: >0.50

### Business Metrics

- **Risk Scoring**: Risk score accuracy correlates with actual opportunity outcomes
- **Revenue Forecasting**: Forecast accuracy improves business planning
- **Recommendations**: Recommendations drive user value and engagement

## Related Documentation

- [CAIS Architecture](./CAIS_ARCHITECTURE.md) - How ML fits into CAIS
- [Implementation](./IMPLEMENTATION.md) - Implementation strategy
- [Orchestration](./ORCHESTRATION.md) - How ML integrates with existing services

---

**Document Status:** Complete  
**Last Updated:** January 2025  
**Next Review:** After Phase 1 implementation
