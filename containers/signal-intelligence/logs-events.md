# Signal Intelligence Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Signal Intelligence module that get logged by the Logging module. These events represent important signal intelligence activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Signal Intelligence module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `signal.detected` | Signal detected | Logging module |
| `signal.processed` | Signal processed | Logging module |
| `signal.analyzed` | Signal analyzed | Logging module |
| `signal.pattern.identified` | Signal pattern identified | Logging module |

---

### signal.detected

**Description**: Emitted when a new signal is detected.

**Triggered When**:
- Signal is detected from source
- Signal is received and validated
- Signal enters processing queue

**Event Type**: `signal.detected`

**Publisher**: `src/events/publishers/SignalIntelligenceEventPublisher.ts`

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
      "const": "signal.detected"
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
          "const": "signal-intelligence"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["signalId", "signalType", "organizationId"],
      "properties": {
        "signalId": {
          "type": "string",
          "format": "uuid",
          "description": "Signal ID"
        },
        "signalType": {
          "type": "string",
          "description": "Type of signal detected"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "source": {
          "type": "string",
          "description": "Signal source"
        },
        "intensity": {
          "type": "number",
          "description": "Signal intensity/strength"
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
  "type": "signal.detected",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "signal-intelligence"
  },
  "data": {
    "signalId": "789e4567-e89b-12d3-a456-426614174001",
    "signalType": "user_activity",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "source": "api_gateway",
    "intensity": 0.85
  }
}
```

---

### signal.processed

**Description**: Emitted when a signal is processed.

**Triggered When**:
- Signal processing completes
- Signal is transformed and stored
- Processing results are available

**Event Type**: `signal.processed`

**Publisher**: `src/events/publishers/SignalIntelligenceEventPublisher.ts`

---

### signal.analyzed

**Description**: Emitted when signal analysis completes.

**Triggered When**:
- Signal analysis is performed
- Analysis results are generated
- Insights are extracted

**Event Type**: `signal.analyzed`

**Publisher**: `src/events/publishers/SignalIntelligenceEventPublisher.ts`

---

### signal.pattern.identified

**Description**: Emitted when a signal pattern is identified.

**Triggered When**:
- Pattern matching algorithm identifies a pattern
- Pattern is recognized in signal data
- Pattern is stored for future reference

**Event Type**: `signal.pattern.identified`

**Publisher**: `src/events/publishers/SignalIntelligenceEventPublisher.ts`

---

## Consumed Events

The Signal Intelligence module consumes the following events:

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
