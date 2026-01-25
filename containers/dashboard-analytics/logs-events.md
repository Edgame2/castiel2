# Dashboard Analytics Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Dashboard Analytics module that get logged by the Logging module. These events represent important dashboard analytics activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Dashboard Analytics module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `dashboard.analytics.metric.recorded` | Dashboard metric recorded | Logging module |
| `dashboard.analytics.report.generated` | Dashboard report generated | Logging module |
| `dashboard.analytics.insight.created` | Dashboard insight created | Logging module |

---

### dashboard.analytics.metric.recorded

**Description**: Emitted when a dashboard analytics metric is recorded.

**Triggered When**:
- Metric value is recorded
- Metric aggregation completes
- Metric is stored in database

**Event Type**: `dashboard.analytics.metric.recorded`

**Publisher**: `src/events/publishers/DashboardAnalyticsEventPublisher.ts`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event identifier"
    },
    "type": {
      "type": "string",
      "const": "dashboard.analytics.metric.recorded"
    },
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant ID"
    },
    "source": {
      "type": "object",
      "properties": {
        "service": {
          "type": "string",
          "const": "dashboard-analytics"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["metricId", "metricName", "value", "organizationId"],
      "properties": {
        "metricId": {
          "type": "string",
          "format": "uuid",
          "description": "Metric ID"
        },
        "metricName": {
          "type": "string",
          "description": "Name of the metric"
        },
        "value": {
          "type": "number",
          "description": "Metric value"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "dashboardId": {
          "type": "string",
          "format": "uuid",
          "description": "Dashboard ID if applicable"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "dashboard.analytics.metric.recorded",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "dashboard-analytics"
  },
  "data": {
    "metricId": "789e4567-e89b-12d3-a456-426614174001",
    "metricName": "active_users",
    "value": 1250,
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "dashboardId": "456e7890-e89b-12d3-a456-426614174002"
  }
}
```

---

### dashboard.analytics.report.generated

**Description**: Emitted when a dashboard analytics report is generated.

**Triggered When**:
- Report generation completes
- Report is stored and ready
- Scheduled report is generated

**Event Type**: `dashboard.analytics.report.generated`

**Publisher**: `src/events/publishers/DashboardAnalyticsEventPublisher.ts`

---

### dashboard.analytics.insight.created

**Description**: Emitted when a dashboard analytics insight is created.

**Triggered When**:
- Insight is generated from analytics
- Insight is stored
- Insight is available for display

**Event Type**: `dashboard.analytics.insight.created`

**Publisher**: `src/events/publishers/DashboardAnalyticsEventPublisher.ts`

---

## Consumed Events

The Dashboard Analytics module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| `dashboard.created` | Dashboard created | Initializes analytics tracking |
| `dashboard.updated` | Dashboard updated | Updates analytics configuration |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
