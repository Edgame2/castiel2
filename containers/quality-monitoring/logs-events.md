# Quality Monitoring Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Quality Monitoring module that get logged by the Logging module. These events represent important quality monitoring activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Quality Monitoring module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `quality.metric.recorded` | Quality metric recorded | Logging module |
| `quality.anomaly.detected` | Quality anomaly detected | Logging module |
| `quality.threshold.exceeded` | Quality threshold exceeded | Logging module |
| `quality.report.generated` | Quality report generated | Logging module |

---

### quality.metric.recorded

**Description**: Emitted when a quality metric is recorded.

**Triggered When**:
- Quality metric value is measured
- Metric is stored in database
- Metric aggregation completes

**Event Type**: `quality.metric.recorded`

**Publisher**: `src/events/publishers/QualityMonitoringEventPublisher.ts`

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
      "const": "quality.metric.recorded"
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
          "const": "quality-monitoring"
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
          "description": "Name of the quality metric"
        },
        "value": {
          "type": "number",
          "description": "Metric value"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "component": {
          "type": "string",
          "description": "Component being monitored"
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
  "type": "quality.metric.recorded",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "quality-monitoring"
  },
  "data": {
    "metricId": "789e4567-e89b-12d3-a456-426614174001",
    "metricName": "response_time",
    "value": 125.5,
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "component": "api_gateway"
  }
}
```

---

### quality.anomaly.detected

**Description**: Emitted when a quality anomaly is detected.

**Triggered When**:
- Anomaly detection algorithm identifies an anomaly
- Quality metric deviates from expected pattern
- Anomaly is confirmed and stored

**Event Type**: `quality.anomaly.detected`

**Publisher**: `src/events/publishers/QualityMonitoringEventPublisher.ts`

---

### quality.threshold.exceeded

**Description**: Emitted when a quality threshold is exceeded.

**Triggered When**:
- Quality metric exceeds configured threshold
- Threshold violation is detected
- Alert condition is met

**Event Type**: `quality.threshold.exceeded`

**Publisher**: `src/events/publishers/QualityMonitoringEventPublisher.ts`

---

### quality.report.generated

**Description**: Emitted when a quality report is generated.

**Triggered When**:
- Quality report generation completes
- Report is stored and ready
- Scheduled report is generated

**Event Type**: `quality.report.generated`

**Publisher**: `src/events/publishers/QualityMonitoringEventPublisher.ts`

---

## Consumed Events

The Quality Monitoring module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| `service.health.changed` | Service health changed | Records quality metric |
| `api.request.completed` | API request completed | Records performance metrics |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
