# AI Service Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the AI Service module that get logged by the Logging module. These events represent important AI service activities that should be tracked for audit and compliance purposes.

---

## Published Events

The AI Service module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `ai.completion.started` | AI completion request started | Logging module |
| `ai.completion.completed` | AI completion request completed | Logging module |
| `ai.completion.failed` | AI completion request failed | Logging module |

---

### ai.completion.started

**Description**: Emitted when an AI completion request is initiated.

**Triggered When**:
- User sends a completion request via API
- Request is validated and accepted
- Processing begins

**Event Type**: `ai.completion.started`

**Publisher**: `src/routes/completions.ts` → `eventPublisher.publish()`

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
      "const": "ai.completion.started"
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
      "description": "Tenant ID (organizationId)"
    },
    "source": {
      "type": "object",
      "properties": {
        "service": {
          "type": "string",
          "const": "ai-service"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["requestId", "model", "organizationId", "userId"],
      "properties": {
        "requestId": {
          "type": "string",
          "description": "Request ID"
        },
        "model": {
          "type": "string",
          "description": "AI model used (e.g., gpt-4, claude-3)"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid",
          "description": "Organization ID"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who initiated the request"
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
  "type": "ai.completion.started",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "ai-service"
  },
  "data": {
    "requestId": "req_1234567890",
    "model": "gpt-4",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "456e7890-e89b-12d3-a456-426614174002"
  }
}
```

---

### ai.completion.completed

**Description**: Emitted when an AI completion request completes successfully.

**Triggered When**:
- AI provider returns a successful response
- Completion is processed and returned to user
- Request completes without errors

**Event Type**: `ai.completion.completed`

**Publisher**: `src/routes/completions.ts` → `eventPublisher.publish()`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "type": {
      "type": "string",
      "const": "ai.completion.completed"
    },
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid"
    },
    "source": {
      "type": "object",
      "properties": {
        "service": {
          "type": "string",
          "const": "ai-service"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["requestId", "model", "tokensUsed", "durationMs", "organizationId"],
      "properties": {
        "requestId": {
          "type": "string"
        },
        "model": {
          "type": "string"
        },
        "tokensUsed": {
          "type": "integer",
          "description": "Number of tokens used"
        },
        "durationMs": {
          "type": "integer",
          "description": "Request duration in milliseconds"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "type": "ai.completion.completed",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:05Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "ai-service"
  },
  "data": {
    "requestId": "req_1234567890",
    "model": "gpt-4",
    "tokensUsed": 150,
    "durationMs": 2500,
    "organizationId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

---

### ai.completion.failed

**Description**: Emitted when an AI completion request fails.

**Triggered When**:
- AI provider returns an error
- Request processing fails
- Timeout occurs
- Invalid input is detected

**Event Type**: `ai.completion.failed`

**Publisher**: `src/routes/completions.ts` → `eventPublisher.publish()`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "type": {
      "type": "string",
      "const": "ai.completion.failed"
    },
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid"
    },
    "source": {
      "type": "object",
      "properties": {
        "service": {
          "type": "string",
          "const": "ai-service"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["requestId", "model", "error", "durationMs", "organizationId"],
      "properties": {
        "requestId": {
          "type": "string"
        },
        "model": {
          "type": "string"
        },
        "error": {
          "type": "string",
          "description": "Error message"
        },
        "durationMs": {
          "type": "integer",
          "description": "Request duration in milliseconds before failure"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "type": "ai.completion.failed",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:03Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "ai-service"
  },
  "data": {
    "requestId": "req_1234567890",
    "model": "gpt-4",
    "error": "Rate limit exceeded",
    "durationMs": 1000,
    "organizationId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

---

## Consumed Events

The AI Service module consumes the following events:

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
