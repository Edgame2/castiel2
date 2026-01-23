# AI Insights Module

AI-powered insights and recommendations service.

**Service**: `containers/ai-insights/`  
**Port**: 3027  
**API Base**: `/api/v1/insights`  
**Database**: Cosmos DB NoSQL (containers: `ai_insights`, `ai_proactive_insights`, `ai_collaborative_insights`, `ai_risk_analysis`)

## Overview

The AI Insights module generates AI-powered insights, recommendations, and risk analysis from shard data.

## Features

- **AI Insight Generation**: Generate insights from shard data
- **Proactive Insights**: Automated insight generation
- **Collaborative Insights**: Shared insights and collaboration
- **Risk Analysis**: Comprehensive risk evaluation and analysis
  - RiskEvaluationService integration
  - ML-based risk score predictions
  - Multiple risk detection methods with adaptive weights
  - Risk analysis tools for AI integration
  - Revenue at risk calculations
  - Early warning system

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/ai-insights/README.md)

## Dependencies

- AI Service (for AI model access)
- Shard Manager (for data access)
- Embeddings (for vector search)
- Logging (for audit logging)

