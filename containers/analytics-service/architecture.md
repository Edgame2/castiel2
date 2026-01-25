# Analytics Service Module - Architecture

## Overview

The Analytics Service module provides analytics and reporting service for Castiel, including general analytics, project analytics, AI analytics, and API performance metrics.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `analytics_events` | `/tenantId` | Analytics events |
| `analytics_metrics` | `/tenantId` | Analytics metrics |
| `analytics_reports` | `/tenantId` | Analytics reports |
| `quality_metrics` | `/tenantId` | Quality metrics |
| `quality_anomalies` | `/tenantId` | Quality anomalies |
| `ai_analytics_events` | `/tenantId` | AI analytics events |
| `ai_analytics_models` | `/tenantId` | AI analytics models |
| `signal_intelligence_signals` | `/tenantId` | Signal intelligence data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **AnalyticsService** - General analytics and metrics
2. **AIAnalyticsService** - AI usage analytics
3. **QualityMonitoringService** - Quality metrics monitoring
4. **SignalIntelligenceService** - Signal intelligence
5. **ReportService** - Analytics report generation

## Data Flow

```
User Request / Event
    ↓
Analytics Service
    ↓
Shard Manager (fetch data)
    ↓
ML Service (for predictions)
    ↓
Cosmos DB (store analytics)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Shard Manager**: For data access
- **User Management**: For user analytics
- **AI Service**: For AI analytics
- **ML Service**: For ML predictions
- **Integration Manager**: For integration analytics
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
