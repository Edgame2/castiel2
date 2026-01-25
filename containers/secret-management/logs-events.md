# Secret Management Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Secret Management module that get logged by the Logging module. These events represent important secret management activities that should be tracked for audit and compliance purposes.

---

## Published Events

The Secret Management module publishes the following events to the `coder.events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `secret.created` | Secret created | Logging module |
| `secret.updated` | Secret updated | Logging module |
| `secret.deleted` | Secret deleted (soft delete) | Logging module |
| `secret.permanently_deleted` | Secret permanently deleted | Logging module |
| `secret.restored` | Secret restored from deleted state | Logging module |
| `secret.expiring_soon` | Secret expiring soon | Logging module |
| `secret.rotated` | Secret value rotated | Logging module |
| `secret.accessed` | Secret accessed (read/write) | Logging module |
| `secret.granted` | Access granted to secret | Logging module |
| `secret.revoked` | Access revoked from secret | Logging module |

---

### secret.created

**Description**: Emitted when a new secret is created.

**Triggered When**:
- User creates a new secret via API
- Secret metadata is stored in database
- Secret value is encrypted and stored

**Event Type**: `secret.created`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretCreated()`

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
      "const": "secret.created"
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
          "const": "secret-management"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["secretId", "secretName", "secretScope", "actorId"],
      "properties": {
        "secretId": {
          "type": "string",
          "format": "uuid",
          "description": "Secret ID"
        },
        "secretName": {
          "type": "string",
          "description": "Secret name (NOT the value)"
        },
        "secretScope": {
          "type": "string",
          "description": "Secret scope"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid",
          "description": "Organization ID"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who created the secret"
        },
        "actorId": {
          "type": "string",
          "description": "Actor who performed the action"
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
  "type": "secret.created",
  "version": "1.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": {
    "service": "secret-management"
  },
  "data": {
    "secretId": "789e4567-e89b-12d3-a456-426614174001",
    "secretName": "database_password",
    "secretScope": "project:abc123",
    "organizationId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "456e7890-e89b-12d3-a456-426614174002",
    "actorId": "456e7890-e89b-12d3-a456-426614174002"
  }
}
```

---

### secret.updated

**Description**: Emitted when a secret is updated.

**Triggered When**:
- Secret metadata is updated
- Secret description or tags are changed
- Secret configuration is modified

**Event Type**: `secret.updated`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretUpdated()`

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
      "const": "secret.updated"
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
          "const": "secret-management"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["secretId", "secretName", "secretScope", "actorId"],
      "properties": {
        "secretId": {
          "type": "string",
          "format": "uuid"
        },
        "secretName": {
          "type": "string"
        },
        "secretScope": {
          "type": "string"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "actorId": {
          "type": "string"
        },
        "changeReason": {
          "type": "string",
          "description": "Reason for the update"
        }
      }
    }
  }
}
```

---

### secret.deleted

**Description**: Emitted when a secret is deleted (soft delete).

**Triggered When**:
- User deletes a secret via API
- Secret is marked as deleted (soft delete)
- Secret enters recovery period

**Event Type**: `secret.deleted`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretDeleted()`

**Event Schema**: Similar structure to `secret.created`, with `type: "secret.deleted"`

---

### secret.permanently_deleted

**Description**: Emitted when a secret is permanently deleted (after recovery period).

**Triggered When**:
- Secret recovery period expires
- Secret is permanently deleted from database
- All secret versions are removed

**Event Type**: `secret.permanently_deleted`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretPermanentlyDeleted()`

---

### secret.restored

**Description**: Emitted when a deleted secret is restored.

**Triggered When**:
- User restores a deleted secret within recovery period
- Secret is unmarked as deleted

**Event Type**: `secret.restored`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretRestored()`

---

### secret.expiring_soon

**Description**: Emitted when a secret is approaching its expiration date.

**Triggered When**:
- Secret expiration date is within configured threshold (e.g., 30 days)
- Scheduled job detects expiring secrets

**Event Type**: `secret.expiring_soon`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretExpiringSoon()`

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
      "const": "secret.expiring_soon"
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
          "const": "secret-management"
        }
      }
    },
    "data": {
      "type": "object",
      "required": ["secretId", "secretName", "secretScope", "daysUntilExpiration"],
      "properties": {
        "secretId": {
          "type": "string",
          "format": "uuid"
        },
        "secretName": {
          "type": "string"
        },
        "secretScope": {
          "type": "string"
        },
        "organizationId": {
          "type": "string",
          "format": "uuid"
        },
        "daysUntilExpiration": {
          "type": "integer",
          "description": "Number of days until expiration"
        }
      }
    }
  }
}
```

---

### secret.rotated

**Description**: Emitted when a secret value is rotated.

**Triggered When**:
- Secret rotation is performed
- New secret value is generated and stored
- Old secret value is archived

**Event Type**: `secret.rotated`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretRotated()`

---

### secret.accessed

**Description**: Emitted when a secret is accessed (read or write).

**Triggered When**:
- Secret value is retrieved (read)
- Secret value is updated (write)
- Secret is accessed via API

**Event Type**: `secret.accessed`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretAccessed()`

---

### secret.granted

**Description**: Emitted when access is granted to a secret.

**Triggered When**:
- User or service is granted access to a secret
- Access grant is created

**Event Type**: `secret.granted`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretGranted()`

---

### secret.revoked

**Description**: Emitted when access is revoked from a secret.

**Triggered When**:
- User or service access is revoked
- Access grant is deleted

**Event Type**: `secret.revoked`

**Publisher**: `src/services/events/SecretEventPublisher.ts` → `SecretEvents.secretRevoked()`

---

## Consumed Events

The Secret Management module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| `user.deleted` | User deleted | Revokes all secret access for deleted user |
| `organization.deleted` | Organization deleted | Permanently deletes all organization secrets |

---

## Related Documentation

- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-23*
