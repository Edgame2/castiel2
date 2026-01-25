# Cache Management Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Cache Management module that get logged by the Logging module. These events represent important cache management activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Cache Management module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `cache.invalidated` | Cache entry invalidated | Logging module |
| `cache.warmed` | Cache warmed | Logging module |
| `cache.cleared` | Cache cleared | Logging module |
| `cache.optimized` | Cache optimization performed | Logging module |

---

### cache.invalidated

**Description**: Emitted when a cache entry is invalidated.

**Triggered When**:
- Cache entry is manually invalidated
- Cache entry expires
- Related data is updated

**Event Type**: `cache.invalidated`

**Publisher**: `src/events/publishers/CacheManagementEventPublisher.ts`

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
      "const": "cache.invalidated"
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
          "const": "cache-management"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["cacheKey", "organizationId"],
      "properties": {
        "cacheKey": {
          "type": "string",
          "description": "Cache key that was invalidated"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "reason": {
          "type": "string",
          "description": "Reason for invalidation"
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
  "type": "cache.invalidated",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "cache-management"
  },
  "data": {
    "cacheKey": "user:123:profile",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "reason": "data_updated"
  }
}
```

---

### cache.warmed

**Description**: Emitted when cache warming is performed.

**Triggered When**:
- Cache warming job completes
- Pre-population of cache entries finishes

**Event Type**: `cache.warmed`

**Publisher**: `src/events/publishers/CacheManagementEventPublisher.ts`

**Event Schema**: Similar structure with cache warming specific data.

---

### cache.cleared

**Description**: Emitted when cache is cleared.

**Triggered When**:
- Cache is manually cleared
- Cache clear operation completes

**Event Type**: `cache.cleared`

**Publisher**: `src/events/publishers/CacheManagementEventPublisher.ts`

---

### cache.optimized

**Description**: Emitted when cache optimization is performed.

**Triggered When**:
- Cache optimization job runs
- Cache performance improvements are applied

**Event Type**: `cache.optimized`

**Publisher**: `src/events/publishers/CacheManagementEventPublisher.ts`

---

## Consumed Events

The Cache Management module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| `data.updated` | Data updated | Invalidates related cache entries |
| `user.updated` | User updated | Invalidates user-related cache |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
