# Collaboration Intelligence Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Collaboration Intelligence module that get logged by the Logging module. These events represent important collaboration intelligence activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Collaboration Intelligence module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `collaboration.insight.generated` | Collaboration insight generated | Logging module |
| `collaboration.pattern.detected` | Collaboration pattern detected | Logging module |
| `collaboration.recommendation.created` | Collaboration recommendation created | Logging module |

---

### collaboration.insight.generated

**Description**: Emitted when a collaboration insight is generated.

**Triggered When**:
- AI analysis generates an insight
- Insight is stored in database
- Insight is ready for consumption

**Event Type**: `collaboration.insight.generated`

**Publisher**: `src/events/publishers/CollaborationIntelligenceEventPublisher.ts`

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
      "const": "collaboration.insight.generated"
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
          "const": "collaboration-intelligence"
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
          "description": "Type of insight (e.g., team_performance, communication_pattern)"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "teamId": {
          "type": "string",
          "format": "uuid",
          "description": "Team ID if applicable"
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
  "type": "collaboration.insight.generated",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "collaboration-intelligence"
  },
  "data": {
    "insightId": "789e4567-e89b-12d3-a456-426614174001",
    "insightType": "team_performance",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "teamId": "456e7890-e89b-12d3-a456-426614174002"
  }
}
```

---

### collaboration.pattern.detected

**Description**: Emitted when a collaboration pattern is detected.

**Triggered When**:
- Pattern matching identifies a collaboration pattern
- Pattern is recognized in collaboration data

**Event Type**: `collaboration.pattern.detected`

**Publisher**: `src/events/publishers/CollaborationIntelligenceEventPublisher.ts`

---

### collaboration.recommendation.created

**Description**: Emitted when a collaboration recommendation is created.

**Triggered When**:
- Recommendation is generated
- Recommendation is stored
- Recommendation is ready for users

**Event Type**: `collaboration.recommendation.created`

**Publisher**: `src/events/publishers/CollaborationIntelligenceEventPublisher.ts`

---

## Consumed Events

The Collaboration Intelligence module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| `collaboration.activity.created` | Collaboration activity created | Analyzes activity for insights |
| `user.interaction.recorded` | User interaction recorded | Updates collaboration patterns |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
