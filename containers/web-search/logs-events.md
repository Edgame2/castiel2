# Web Search Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Web Search module that get logged by the Logging module. These events represent important web search activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Web Search module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `web.search.performed` | Web search performed | Logging module |
| `web.search.completed` | Web search completed | Logging module |
| `web.search.failed` | Web search failed | Logging module |
| `web.result.cached` | Search result cached | Logging module |

---

### web.search.performed

**Description**: Emitted when a web search is performed.

**Triggered When**:
- User initiates a web search
- Search query is validated
- Search processing begins

**Event Type**: `web.search.performed`

**Publisher**: `src/events/publishers/WebSearchEventPublisher.ts`

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
      "const": "web.search.performed"
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
          "const": "web-search"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["searchId", "query", "organizationId"],
      "properties": {
        "searchId": {
          "type": "string",
          "format": "uuid",
          "description": "Search request ID"
        },
        "query": {
          "type": "string",
          "description": "Search query"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User who performed the search"
        },
        "provider": {
          "type": "string",
          "description": "Search provider used (e.g., google, bing)"
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
  "type": "web.search.performed",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "web-search"
  },
  "data": {
    "searchId": "789e4567-e89b-12d3-a456-426614174001",
    "query": "TypeScript best practices",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "456e7890-e89b-12d3-a456-426614174002",
    "provider": "google"
  }
}
```

---

### web.search.completed

**Description**: Emitted when a web search completes successfully.

**Triggered When**:
- Search results are retrieved
- Results are processed and formatted
- Search completes without errors

**Event Type**: `web.search.completed`

**Publisher**: `src/events/publishers/WebSearchEventPublisher.ts`

**Event Schema**: Similar structure with completion-specific data including `resultCount`, `durationMs`.

---

### web.search.failed

**Description**: Emitted when a web search fails.

**Triggered When**:
- Search provider returns an error
- Search processing fails
- Timeout occurs

**Event Type**: `web.search.failed`

**Publisher**: `src/events/publishers/WebSearchEventPublisher.ts`

---

### web.result.cached

**Description**: Emitted when a search result is cached.

**Triggered When**:
- Search result is stored in cache
- Cache entry is created
- Result is available for future requests

**Event Type**: `web.result.cached`

**Publisher**: `src/events/publishers/WebSearchEventPublisher.ts`

---

## Consumed Events

The Web Search module consumes the following events:

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
