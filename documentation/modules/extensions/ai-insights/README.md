# AI Insights Module

AI-powered insights and risk analysis service for Castiel's business intelligence platform.

**Service**: `containers/ai-insights/`  
**Port**: 3027  
**API Base**: `/api/v1/insights`  
**Database**: Cosmos DB NoSQL (containers: `ai_insights`, `ai_proactive_insights`, `ai_collaborative_insights`, `ai_risk_analysis`)

## Overview

The AI Insights module generates AI-powered insights, recommendations, and comprehensive risk analysis from business data. It integrates with the **ML Service** to provide ML-enhanced risk scoring and predictions, transforming the platform from reactive to predictive intelligence.

## Features

### AI Insight Generation

- **AI Insight Generation**: Generate insights from business data (opportunities, accounts, activities)
- **Proactive Insights**: Automated insight generation based on data patterns
- **Collaborative Insights**: Shared insights and team collaboration

### Risk Analysis (ML-Enhanced)

The AI Insights module provides comprehensive risk evaluation and analysis, enhanced with ML-powered predictions:

- **RiskEvaluationService Integration**: Orchestrates multiple risk detection methods
- **ML-Based Risk Score Predictions** ⭐: ML-powered risk scores (0-1 scale) from ML Service
  - Category-specific risk scores (Commercial, Technical, Financial, Legal, Competitive, Operational)
  - Multi-level aggregation (opportunity → account → team → tenant)
  - Confidence intervals and uncertainty quantification
- **Multiple Risk Detection Methods**: 
  - Rule-based detection (fast, deterministic)
  - Historical pattern matching (vector search)
  - AI-powered detection (LLM reasoning)
  - **ML prediction** (from ML Service) - NEW
- **Adaptive Weights**: Learned weights for combining detection methods
- **Risk Analysis Tools**: Tools for AI integration and explanation
- **Revenue at Risk Calculations**: Risk-adjusted revenue calculations
- **Early Warning System**: Proactive risk identification

### CAIS Integration

The AI Insights module is a key component of Castiel's **Compound AI System (CAIS)** architecture:

- **Layer 4 (Explanation Layer)**: Provides structured explanations for risk detections
- **Layer 5 (LLM Reasoning Layer)**: Generates natural language explanations
- **Layer 6 (Decision & Action Engine)**: Combines ML predictions with rules to make decisions

The module orchestrates ML predictions (from ML Service), LLM explanations (from AI Service), and business rules to deliver explainable, actionable risk intelligence.

## ML Integration

### Risk Scoring Integration

The AI Insights module integrates with the ML Service to enhance risk analysis:

```typescript
// Enhanced Risk Detection with ML
async function detectRisks(opportunity, relatedShards, tenantId, userId) {
  const detectedRisks = [];
  
  // 1. Rule-based detection
  const ruleBasedRisks = await detectRisksByRules(opportunity, relatedShards);
  detectedRisks.push(...ruleBasedRisks);
  
  // 2. Historical pattern matching
  const historicalRisks = await detectRisksByHistoricalPatterns(opportunity);
  detectedRisks.push(...historicalRisks);
  
  // 3. AI-powered detection (LLM)
  const aiRisks = await detectRisksByAI(opportunity, relatedShards);
  detectedRisks.push(...aiRisks);
  
  // 4. ML prediction (NEW - from ML Service)
  const mlRiskScore = await mlService.predictRiskScore(opportunity);
  if (mlRiskScore > threshold) {
    const mlRisks = await convertMLScoreToRisks(mlRiskScore, opportunity);
    detectedRisks.push(...mlRisks);
  }
  
  // 5. Merge and deduplicate
  return mergeRisks(detectedRisks);
}
```

### ML-Enhanced Insights

ML predictions enhance insights by:
- Providing numeric risk scores with confidence intervals
- Identifying patterns that may not be visible through rules or LLMs alone
- Learning from historical outcomes to improve predictions
- Enabling proactive risk identification before problems occur

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/ai-insights/README.md)

## Dependencies

- **AI Service**: For LLM explanations and reasoning
- **Shard Manager**: For business data access
- **Embeddings**: For vector search and similarity matching
- **ML Service** ⭐: For ML-powered risk scoring and predictions
- **Logging**: For audit logging

## Related Documentation

- [ML Service](../ml-service/) - ML capabilities and predictions
- [Pipeline Manager](../pipeline-manager/) - Sales pipeline management
- [Global CAIS Overview](../../../global/CAIS_OVERVIEW.md) - Compound AI System architecture

