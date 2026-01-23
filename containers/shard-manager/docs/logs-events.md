# Shard Manager Module - Logs Events

## Overview

This document describes all events published by the Shard Manager module that are consumed by the Logging service for audit trail and compliance logging.

## Published Events

### shard.created

**Description**: Emitted when a new shard is created.

**Triggered When**: 
- User creates a new shard via API
- Bulk shard creation completes

**Event Type**: `shard.created`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["shard.created"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version (e.g., '1.0')"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event (e.g., 'shard-manager')"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who created the shard"
    },
    "data": {
      "type": "object",
      "required": ["shardId", "shardTypeId", "tenantId"],
      "properties": {
        "shardId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the created shard"
        },
        "shardTypeId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the ShardType"
        },
        "tenantId": {
          "type": "string",
          "format": "uuid",
          "description": "Tenant ID"
        },
        "shardTypeName": {
          "type": "string",
          "description": "Name of the ShardType (optional)"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "shard.created",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "shard-manager",
  "correlationId": "req_45678901-2345-2345-2345-234567890def",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "shardId": "shard_12345678-1234-1234-1234-123456789abc",
    "shardTypeId": "type_78901234-3456-3456-3456-345678901ghi",
    "tenantId": "org_78901234-3456-3456-3456-345678901ghi",
    "shardTypeName": "Opportunity"
  }
}
```

---

### shard.updated

**Description**: Emitted when a shard is updated.

**Triggered When**: 
- User updates a shard via API
- Bulk shard update completes

**Event Type**: `shard.updated`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["shard.updated"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who updated the shard"
    },
    "data": {
      "type": "object",
      "required": ["shardId", "tenantId"],
      "properties": {
        "shardId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the updated shard"
        },
        "tenantId": {
          "type": "string",
          "format": "uuid",
          "description": "Tenant ID"
        },
        "changedFields": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of field names that were changed (optional)"
        }
      }
    }
  }
}
```

---

### shard.deleted

**Description**: Emitted when a shard is deleted (soft delete).

**Triggered When**: 
- User deletes a shard via API
- Bulk shard deletion completes

**Event Type**: `shard.deleted`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["shard.deleted"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who deleted the shard"
    },
    "data": {
      "type": "object",
      "required": ["shardId", "tenantId"],
      "properties": {
        "shardId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the deleted shard"
        },
        "tenantId": {
          "type": "string",
          "format": "uuid",
          "description": "Tenant ID"
        }
      }
    }
  }
}
```

---

### shard.type.created

**Description**: Emitted when a new ShardType is created.

**Triggered When**: 
- User creates a new ShardType via API

**Event Type**: `shard.type.created`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["shard.type.created"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who created the ShardType"
    },
    "data": {
      "type": "object",
      "required": ["shardTypeId", "name", "tenantId"],
      "properties": {
        "shardTypeId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the created ShardType"
        },
        "name": {
          "type": "string",
          "description": "Name of the ShardType"
        },
        "tenantId": {
          "type": "string",
          "format": "uuid",
          "description": "Tenant ID"
        }
      }
    }
  }
}
```

---

### shard.type.updated

**Description**: Emitted when a ShardType is updated.

**Triggered When**: 
- User updates a ShardType via API

**Event Type**: `shard.type.updated`

**Event Schema**: Similar to `shard.type.created`, with `type: "shard.type.updated"`

---

### shard.type.deleted

**Description**: Emitted when a ShardType is deleted.

**Triggered When**: 
- User deletes a ShardType via API

**Event Type**: `shard.type.deleted`

**Event Schema**: Similar to `shard.type.created`, with `type: "shard.type.deleted"`

---

### shard.relationship.created

**Description**: Emitted when a relationship between shards is created.

**Triggered When**: 
- User creates a relationship via API

**Event Type**: `shard.relationship.created`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["shard.relationship.created"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User ID who created the relationship"
    },
    "data": {
      "type": "object",
      "required": ["relationshipId", "sourceId", "targetId", "relationshipType", "tenantId"],
      "properties": {
        "relationshipId": {
          "type": "string",
          "format": "uuid",
          "description": "ID of the relationship"
        },
        "sourceId": {
          "type": "string",
          "format": "uuid",
          "description": "Source shard ID"
        },
        "targetId": {
          "type": "string",
          "format": "uuid",
          "description": "Target shard ID"
        },
        "relationshipType": {
          "type": "string",
          "description": "Type of relationship"
        },
        "tenantId": {
          "type": "string",
          "format": "uuid",
          "description": "Tenant ID"
        }
      }
    }
  }
}
```

---

### shard.relationship.deleted

**Description**: Emitted when a relationship between shards is deleted.

**Triggered When**: 
- User deletes a relationship via API

**Event Type**: `shard.relationship.deleted`

**Event Schema**: Similar to `shard.relationship.created`, with `type: "shard.relationship.deleted"`

---

## Consumed Events

The Shard Manager module does not consume events from other modules. It only publishes events.

