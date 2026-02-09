# Recommendations Module - Architecture

## Overview

The Recommendations module provides asynchronous recommendation generation with multi-factor recommendation engine and CAIS integration. It generates intelligent next-best-action recommendations based on multiple factors including vector similarity, collaborative filtering, temporal patterns, content-based filtering, and ML-enhanced recommendations.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `recommendation_recommendations` | `/tenantId` | Generated recommendations |
| `recommendation_feedback` | `/tenantId` | User feedback on recommendations |
| `recommendation_models` | `/tenantId` | Recommendation model configurations |

## Service Architecture

### Core Services

1. **RecommendationsService** - Main recommendation engine
   - Multi-factor recommendation generation
   - Vector-based recommendations
   - Collaborative filtering
   - Temporal pattern analysis
   - Content-based filtering
   - ML-enhanced recommendations
   - User feedback handling
   - CAIS integration for learned weights

## Integration Points

- **ml-service**: ML-enhanced recommendations (REST API)
- **adaptive-learning**: Get learned recommendation weights (REST API)
- **adaptive-learning**: Publish feedback for learning (Events)
- **risk-analytics**: Risk-based recommendations
- **forecasting**: Forecast-based recommendations

## Event-Driven Communication

### Published Events

- `recommendation.generation.started` - Recommendation generation started
- `recommendation.generation.completed` - Recommendations generated
- `recommendation.feedback.received` - User feedback received (for CAIS learning)

### Consumed Events

- `opportunity.updated` - Trigger recommendations when opportunity changes
- `integration.opportunity.updated` - Trigger recommendations when opportunities change via integration sync (waits for risk and forecast to complete)
- `risk.evaluation.completed` - Generate risk-based recommendations
- `forecast.completed` - Generate forecast-based recommendations (ensures sequential processing after risk and forecast)
- `workflow.recommendation.requested` - Triggered by workflow-orchestrator
- `opportunity.outcome.recorded` - Record won/lost for accepted recommendations (dataflow Phase 2.3); recordOutcomeForOpportunityClose → adaptive-learning record-outcome per accepted rec

## CAIS Integration (Hybrid Approach)

- **REST API calls** to adaptive-learning for:
  - `GET /api/v1/adaptive-learning/weights/:tenantId?component=recommendations`
    - Returns learned weights for recommendation algorithms
- **Event publishing** to adaptive-learning for outcome learning:
  - `recommendation.feedback.received` - User feedback (accept, ignore, irrelevant)
  - `adaptive.learning.outcome.recorded` - Recommendation accuracy outcomes

## Data Flow

1. Consumes opportunity/risk/forecast completion events
2. Gets learned recommendation weights from adaptive-learning (REST)
3. Generates recommendations using learned weights
4. Publishes recommendation completion event
5. User provides feedback → Publishes feedback event
6. Adaptive-learning learns from feedback → Updates weights
7. Next recommendations use improved weights

## Security

- All queries include tenantId in partition key
- User feedback includes userId for personalization
- Recommendations respect tenant isolation
