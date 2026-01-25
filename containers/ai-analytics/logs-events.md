# AI Analytics Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the AI Analytics module that get logged by the Logging module. These events represent important analytics activities that should be tracked for audit and compliance purposes.

---

## Published Events

The AI Analytics module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `ai.analytics.insight.generated` | AI insight generated | Logging module |
| `ai.analytics.report.created` | Analytics report created | Logging module |
| `ai.analytics.metric.recorded` | Analytics metric recorded | Logging module |

---

### ai.analytics.insight.generated

**Description**: Emitted when an AI-powered insight is generated.

**Triggered When**:
- Analytics service generates an insight
- Insight is stored in database
- Insight is ready for consumption

**Event Type**: `ai.analytics.insight.generated`

**Publisher**: `src/events/publishers/AiAnalyticsEventPublisher.ts`

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
      "const": "ai.analytics.insight.generated"
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
          "const": "ai-analytics"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["insightId", "insightType", "organizationId"],
      "properties": {
        "insightId": {
          "type": "string",
          "format": "uuid",
          "description": "Insight ID"
        },
        "insightType": {
          "type": "string",
          "description": "Type of insight (e.g., trend, anomaly, prediction)"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who triggered the insight"
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
  "type": "ai.analytics.insight.generated",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "ai-analytics"
  },
  "data": {
    "insightId": "789e4567-e89b-12d3-a456-426614174001",
    "insightType": "trend",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "456e7890-e89b-12d3-a456-426614174002"
  }
}
```

---

### ai.analytics.report.created

**Description**: Emitted when an analytics report is created.

**Triggered When**:
- User requests a report
- Scheduled report is generated
- Report is stored and ready

**Event Type**: `ai.analytics.report.created`

**Publisher**: `src/events/publishers/AiAnalyticsEventPublisher.ts`

**Event Schema**: Similar structure to `ai.analytics.insight.generated`, with `type: "ai.analytics.report.created"` and report-specific data fields.

---

### ai.analytics.metric.recorded

**Description**: Emitted when an analytics metric is recorded.

**Triggered When**:
- Metric value is recorded
- Metric aggregation completes
- Metric is stored in database

**Event Type**: `ai.analytics.metric.recorded`

**Publisher**: `src/events/publishers/AiAnalyticsEventPublisher.ts`

**Event Schema**: Similar structure with metric-specific data fields.

---

## Consumed Events

The AI Analytics module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| N/A | Currently no event consumption | - |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
