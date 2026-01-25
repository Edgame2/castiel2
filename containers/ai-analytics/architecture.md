# AI Analytics Module - Architecture

## Overview

The AI Analytics module provides AI usage analytics and monitoring for the Castiel system. It tracks AI usage, manages chat catalogs, handles AI configuration, seeds models, generates proactive insights, and manages feedback learning.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `ai_analytics_events` | `/tenantId` | AI analytics events |
| `ai_analytics_models` | `/tenantId` | AI model data |
| `ai_analytics_feedback` | `/tenantId` | AI feedback data |

## Service Architecture

### Core Services

1. **AIAnalyticsService** - AI analytics orchestration
   - AI usage tracking
   - Chat catalog management
   - AI configuration
   - Model seeding
   - Proactive insights
   - Feedback learning

## Integration Points

- **ai-service**: AI operations
- **ai-insights**: Insight generation
- **analytics-service**: Analytics integration
