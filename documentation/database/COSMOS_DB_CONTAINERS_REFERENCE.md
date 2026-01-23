# Cosmos DB Containers Reference for 16 New Containers

**Date:** 2026-01-23  
**Status:** Complete - All containers documented

## Overview

This document lists all Cosmos DB containers required by the 16 new containers. All containers use `/tenantId` as the partition key for tenant isolation.

## Container List by Service

### 1. AI Conversation (4 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `conversation_conversations` | `/tenantId` | Conversation records and metadata |
| `conversation_messages` | `/tenantId` | Message history for conversations |
| `conversation_contexts` | `/tenantId` | Context cache for conversations |
| `conversation_citations` | `/tenantId` | Citation validation records |

### 2. Risk Analytics (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `risk_evaluations` | `/tenantId` | Risk evaluation results and analysis |
| `risk_revenue_at_risk` | `/tenantId` | Revenue at risk calculations |

### 3. Recommendations (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `recommendation_recommendations` | `/tenantId` | Generated recommendations |
| `recommendation_feedback` | `/tenantId` | User feedback on recommendations |

### 4. Forecasting (4 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `forecast_decompositions` | `/tenantId` | Forecast decompositions |
| `forecast_consensus` | `/tenantId` | Consensus forecasts |
| `forecast_commitments` | `/tenantId` | Commitment analysis results |
| `forecast_pipeline_health` | `/tenantId` | Pipeline health metrics |

### 5. Workflow Orchestrator (3 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `workflow_workflows` | `/tenantId` | Workflow definitions and state |
| `workflow_steps` | `/tenantId` | Workflow step tracking |
| `workflow_executions` | `/tenantId` | Execution history |

### 6. Integration Sync (4 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `integration_sync_tasks` | `/tenantId` | Sync task definitions and status |
| `integration_executions` | `/tenantId` | Sync execution history |
| `integration_conflicts` | `/tenantId` | Sync conflict records |
| `integration_webhooks` | `/tenantId` | Webhook registrations for sync triggers |

### 7. Data Enrichment (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `enrichment_jobs` | `/tenantId` | Enrichment job queue |
| `enrichment_results` | `/tenantId` | Enrichment results |

### 8. Cache Management (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `cache_metrics` | `/tenantId` | Cache performance metrics |
| `cache_strategies` | `/tenantId` | Caching strategies |

### 9. Security Scanning (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `security_scans` | `/tenantId` | Security scan results |
| `security_pii_detections` | `/tenantId` | PII detection records |

### 10. Quality Monitoring (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `quality_metrics` | `/tenantId` | Quality metrics |
| `quality_anomalies` | `/tenantId` | Detected anomalies |

### 11. Utility Services (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `utility_imports` | `/tenantId` | Import job tracking |
| `utility_exports` | `/tenantId` | Export job tracking |

### 12. Dashboard Analytics (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `dashboard_admin_data` | `/tenantId` | Dashboard analytics data |
| `dashboard_widget_cache` | `/tenantId` | Widget cache |

### 13. Web Search (1 container)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `web_search_cache` | `/tenantId` | Search result cache |

### 14. AI Analytics (2 containers)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `ai_analytics_events` | `/tenantId` | AI usage events |
| `ai_analytics_models` | `/tenantId` | Model analytics |

### 15. Collaboration Intelligence (1 container)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `collaboration_insights` | `/tenantId` | Collaborative insights |

### 16. Signal Intelligence (1 container)

| Container Name | Partition Key | Purpose |
|---------------|---------------|---------|
| `signal_communications` | `/tenantId` | Signal analysis results |

## Summary

**Total Containers:** 36  
**Partition Key:** `/tenantId` (all containers)  
**Database:** Shared database (default: `castiel`)

## Initialization

All containers are automatically created when services start via the `initializeDatabase()` function in `@coder/shared/database`. The containers are created with:

- Partition key: `/tenantId`
- Default throughput: 400 RU/s (configurable)
- Automatic indexing: Enabled

## Configuration

Container names are defined in each service's `config/default.yaml`:

```yaml
cosmos_db:
  containers:
    conversations: conversation_conversations
    messages: conversation_messages
    # ... etc
```

## Notes

1. All containers use the same database (shared database architecture)
2. Container names are prefixed with service name for clarity
3. All queries must include `tenantId` in the partition key
4. Containers are created automatically on first service startup
5. Throughput can be configured per-container if needed
