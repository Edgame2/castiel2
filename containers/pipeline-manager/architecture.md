# Pipeline Manager Module - Architecture

## Overview

The Pipeline Manager module provides sales pipeline and opportunity management service for Castiel, including pipeline views, opportunity management, and pipeline analytics.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `pipeline_opportunities` | `/tenantId` | Opportunity documents |
| `pipeline_views` | `/tenantId` | Pipeline view configurations |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **PipelineViewService** - Pipeline visualization and management
2. **OpportunityService** - Opportunity CRUD operations
3. **PipelineAnalyticsService** - Revenue forecasting and pipeline metrics

## Data Flow

```
User Request
    ↓
Pipeline Manager Service
    ↓
Shard Manager (link to shards)
    ↓
Cosmos DB (store opportunities)
    ↓
Analytics Service (pipeline metrics)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Shard Manager**: For shard linking
- **User Management**: For user context
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
