# AI Insights Module - Architecture

## Overview

The AI Insights module provides AI-powered insights and recommendations service for Castiel, including proactive insights, collaborative insights, and risk analysis.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `ai_insights` | `/tenantId` | Insight documents |
| `ai_proactive_insights` | `/tenantId` | Proactive insight triggers |
| `ai_collaborative_insights` | `/tenantId` | Collaborative insights |
| `ai_risk_analysis` | `/tenantId` | Risk analysis results |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **InsightService** - Generate insights from shard data
2. **ProactiveInsightService** - Automated insight generation
3. **RiskAnalysisService** - Comprehensive risk evaluation and analysis

## Data Flow

```
User Request / Scheduled Job
    ↓
AI Insights Service
    ↓
AI Service (generate insights)
    ↓
Shard Manager (fetch data)
    ↓
Embeddings Service (vector operations)
    ↓
Cosmos DB (store insights)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **AI Service**: For insight generation
- **Shard Manager**: For data access
- **Embeddings Service**: For vector operations
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
