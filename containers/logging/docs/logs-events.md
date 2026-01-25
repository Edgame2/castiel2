# Logging Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **consumed** by the Logging module for audit logging purposes. The Logging module listens to events from other modules and creates audit log entries for compliance and security tracking.

---

## Consumed Events

The Logging module consumes events from the following exchanges via RabbitMQ:

- `auth.#` - Authentication events
- `user.#` - User management events
- `secret.#` - Secret management events
- `plan.#` - Planning events
- `notification.#` - Notification events

**BI/risk (dedicated queues, Plan §3.5):** `risk.evaluated` (DataLakeCollector → Parquet); `risk.evaluated`, `ml.prediction.completed`, `remediation.workflow.completed` (MLAuditConsumer → audit Blob). Config: `rabbitmq.data_lake`, `rabbitmq.ml_audit`, `data_lake.*`.

---

### auth.login.success

**Description**: Logged when a user successfully authenticates.

**Audit Category**: `SECURITY`  
**Audit Severity**: `INFO`

**Handler**: `src/events/consumers/AuditEventConsumer.ts`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "userId", "organizationId", "sessionId"],
  "properties": {
    "type": {
      "type": "string",
      "const": "auth.login.success"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "correlationId": {
      "type": "string"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "sessionId": {
      "type": "string"
    },
    "ipAddress": {
      "type": "string"
    },
    "userAgent": {
      "type": "string"
    }
  }
}
```

**Audit Log Entry Created**:
- Action: `auth.login.success`
- Message: "User logged in successfully"
- Metadata: `{ sessionId, ipAddress, userAgent }`

---

### auth.login.failed

**Description**: Logged when a login attempt fails.

**Audit Category**: `SECURITY`  
**Audit Severity**: `WARN`

**Handler**: `src/events/consumers/AuditEventConsumer.ts`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "email", "reason"],
  "properties": {
    "type": {
      "type": "string",
      "const": "auth.login.failed"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "reason": {
      "type": "string",
      "enum": ["invalid_credentials", "account_locked", "mfa_required", "account_disabled"]
    },
    "ipAddress": {
      "type": "string"
    },
    "userAgent": {
      "type": "string"
    }
  }
}
```

**Audit Log Entry Created**:
- Action: `auth.login.failed`
- Message: "Login attempt failed: {reason}"
- Metadata: `{ email, reason, ipAddress, userAgent }`

---

### auth.logout

**Description**: Logged when a user logs out.

**Audit Category**: `SECURITY`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "userId", "organizationId", "sessionId"],
  "properties": {
    "type": {
      "type": "string",
      "const": "auth.logout"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "sessionId": {
      "type": "string"
    }
  }
}
```

---

### auth.password.changed

**Description**: Logged when a user changes their password.

**Audit Category**: `SECURITY`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "userId", "organizationId"],
  "properties": {
    "type": {
      "type": "string",
      "const": "auth.password.changed"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    }
  }
}
```

---

### auth.mfa.enabled

**Description**: Logged when MFA is enabled for a user.

**Audit Category**: `SECURITY`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "userId", "organizationId"],
  "properties": {
    "type": {
      "type": "string",
      "const": "auth.mfa.enabled"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    }
  }
}
```

---

### user.created

**Description**: Logged when a new user account is created.

**Audit Category**: `ACTION`  
**Audit Severity**: `INFO`

**Handler**: `src/events/consumers/AuditEventConsumer.ts`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "targetUserId", "organizationId", "role"],
  "properties": {
    "type": {
      "type": "string",
      "const": "user.created"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "correlationId": {
      "type": "string"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User who created the new user (admin)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "targetUserId": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the newly created user"
    },
    "role": {
      "type": "string",
      "description": "Initial role assigned to the user"
    }
  }
}
```

**Audit Log Entry Created**:
- Action: `user.created`
- Resource Type: `user`
- Resource ID: `{targetUserId}`
- Message: "User account created with role: {role}"

---

### user.updated

**Description**: Logged when a user profile is updated.

**Audit Category**: `ACTION`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "targetUserId", "organizationId", "changes"],
  "properties": {
    "type": {
      "type": "string",
      "const": "user.updated"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User who made the update"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "targetUserId": {
      "type": "string",
      "format": "uuid",
      "description": "User being updated"
    },
    "changes": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of changed fields"
    }
  }
}
```

---

### user.deleted

**Description**: Logged when a user account is deleted.

**Audit Category**: `ACTION`  
**Audit Severity**: `WARN`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "targetUserId", "organizationId"],
  "properties": {
    "type": {
      "type": "string",
      "const": "user.deleted"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User who deleted the account"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "targetUserId": {
      "type": "string",
      "format": "uuid",
      "description": "User being deleted"
    }
  }
}
```

---

### user.role.changed

**Description**: Logged when a user's role is changed.

**Audit Category**: `SECURITY`  
**Audit Severity**: `WARN`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "targetUserId", "organizationId", "previousRole", "newRole"],
  "properties": {
    "type": {
      "type": "string",
      "const": "user.role.changed"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "Admin who changed the role"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "targetUserId": {
      "type": "string",
      "format": "uuid"
    },
    "previousRole": {
      "type": "string"
    },
    "newRole": {
      "type": "string"
    }
  }
}
```

---

### secret.created

**Description**: Logged when a new secret is created.

**Audit Category**: `ACTION`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "secretId", "organizationId", "secretName"],
  "properties": {
    "type": {
      "type": "string",
      "const": "secret.created"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "secretId": {
      "type": "string",
      "format": "uuid"
    },
    "secretName": {
      "type": "string",
      "description": "Name of the secret (NOT the value)"
    }
  }
}
```

---

### secret.accessed

**Description**: Logged when a secret is accessed (read or written).

**Audit Category**: `ACCESS`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "secretId", "organizationId", "secretName", "accessType"],
  "properties": {
    "type": {
      "type": "string",
      "const": "secret.accessed"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "secretId": {
      "type": "string",
      "format": "uuid"
    },
    "secretName": {
      "type": "string"
    },
    "accessType": {
      "type": "string",
      "enum": ["read", "write"]
    }
  }
}
```

**Audit Log Entry Created**:
- Action: `secret.accessed`
- Resource Type: `secret`
- Resource ID: `{secretId}`
- Message: "Secret '{secretName}' was {accessType}"

---

### secret.deleted

**Description**: Logged when a secret is deleted.

**Audit Category**: `ACTION`  
**Audit Severity**: `WARN`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "secretId", "organizationId", "secretName"],
  "properties": {
    "type": {
      "type": "string",
      "const": "secret.deleted"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "secretId": {
      "type": "string",
      "format": "uuid"
    },
    "secretName": {
      "type": "string"
    }
  }
}
```

---

### secret.rotated

**Description**: Logged when a secret is rotated (value updated).

**Audit Category**: `SECURITY`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "secretId", "organizationId", "secretName"],
  "properties": {
    "type": {
      "type": "string",
      "const": "secret.rotated"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "secretId": {
      "type": "string",
      "format": "uuid"
    },
    "secretName": {
      "type": "string"
    }
  }
}
```

---

### plan.created

**Description**: Logged when a new plan is created.

**Audit Category**: `ACTION`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "planId", "projectId", "organizationId"],
  "properties": {
    "type": {
      "type": "string",
      "const": "plan.created"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "planId": {
      "type": "string",
      "format": "uuid"
    },
    "projectId": {
      "type": "string",
      "format": "uuid"
    }
  }
}
```

---

### plan.executed

**Description**: Logged when a plan is executed.

**Audit Category**: `ACTION`  
**Audit Severity**: `INFO` (success) or `ERROR` (failed)

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "planId", "projectId", "organizationId", "status"],
  "properties": {
    "type": {
      "type": "string",
      "const": "plan.executed"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "planId": {
      "type": "string",
      "format": "uuid"
    },
    "projectId": {
      "type": "string",
      "format": "uuid"
    },
    "status": {
      "type": "string",
      "enum": ["success", "failed"]
    }
  }
}
```

---

### notification.sent

**Description**: Logged when a notification is sent.

**Audit Category**: `ACTION`  
**Audit Severity**: `INFO`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "timestamp", "notificationId", "organizationId", "channel", "recipientCount"],
  "properties": {
    "type": {
      "type": "string",
      "const": "notification.sent"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid"
    },
    "notificationId": {
      "type": "string",
      "format": "uuid"
    },
    "channel": {
      "type": "string",
      "enum": ["email", "push", "sms", "in_app", "webhook"]
    },
    "recipientCount": {
      "type": "integer"
    }
  }
}
```

---

## BI / Risk Events (Data Lake & ML Audit)

Per BI_SALES_RISK_IMPLEMENTATION_PLAN §3.5, FIRST_STEPS §3, and BI_SALES_RISK_DATA_LAKE_LAYOUT. These events are consumed via dedicated queues (`rabbitmq.data_lake`, `rabbitmq.ml_audit`). Require `data_lake.connection_string` and `data_lake.container`.

### risk.evaluated (DataLakeCollector)

**Description**: Written by **DataLakeCollector** to Azure Data Lake as Parquet at `/risk_evaluations/year=YYYY/month=MM/day=DD/*.parquet`. Used by risk-snapshot-backfill and training.

**Handler**: `src/events/consumers/DataLakeCollector.ts`  
**Queue**: `rabbitmq.data_lake.queue` (e.g. `logging_data_lake`), bindings: `risk.evaluated`

**Parquet columns** (DATA_LAKE_LAYOUT §2.1): `tenantId`, `opportunityId`, `riskScore`, `categoryScores` (JSON string), `topDrivers` (optional, JSON), `dataQuality` (optional, JSON), `timestamp` (ISO), `evaluationId` (optional).

---

### risk.evaluated, risk.prediction.generated, ml.prediction.completed, remediation.workflow.completed (MLAuditConsumer)

**Description**: Written by **MLAuditConsumer** to audit Blob at `data_lake.audit_path_prefix/year=YYYY/month=MM/day=DD/{routingKey}-{id}.json`. Immutable; 7-year retention per Plan.

**Handler**: `src/events/consumers/MLAuditConsumer.ts`  
**Queue**: `rabbitmq.ml_audit.queue` (e.g. `logging_ml_audit`), bindings: `risk.evaluated`, `risk.prediction.generated`, `ml.prediction.completed`, `remediation.workflow.completed`

**Blob content**: `{ eventType, timestamp, tenantId, userId?, data, id, source }`. `risk.prediction.generated` (Plan §10): payload from risk-analytics when EarlyWarningService.generatePredictions writes to risk_predictions.

---

## Event Processing

### Event Mapper

The Logging module uses `src/events/eventMapper.ts` to transform incoming domain events into audit log entries:

```typescript
function mapDomainEventToAuditLogEvent(event: AuditableEvent): AuditLogEvent {
  // Extract common fields
  const base = {
    timestamp: event.timestamp,
    organizationId: event.organizationId,
    userId: event.userId,
    correlationId: event.correlationId,
    source: getSourceFromEventType(event.type),
  };

  // Map to appropriate category and severity
  const { category, severity } = getCategoryAndSeverity(event.type);

  return {
    ...base,
    action: event.type,
    category,
    severity,
    message: generateMessage(event),
    metadata: extractMetadata(event),
    resourceType: getResourceType(event),
    resourceId: getResourceId(event),
  };
}
```

### Category and Severity Mapping

| Event Pattern | Category | Severity |
|---------------|----------|----------|
| `auth.login.success` | SECURITY | INFO |
| `auth.login.failed` | SECURITY | WARN |
| `auth.logout` | SECURITY | INFO |
| `auth.password.*` | SECURITY | INFO |
| `auth.mfa.*` | SECURITY | INFO |
| `user.created` | ACTION | INFO |
| `user.updated` | ACTION | INFO |
| `user.deleted` | ACTION | WARN |
| `user.role.changed` | SECURITY | WARN |
| `secret.created` | ACTION | INFO |
| `secret.accessed` | ACCESS | INFO |
| `secret.deleted` | ACTION | WARN |
| `secret.rotated` | SECURITY | INFO |
| `plan.*` | ACTION | INFO |
| `notification.*` | ACTION | INFO |

---

## Related Documentation

- [Notifications Events](./notifications-events.md) - Events published by this module
- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-22*



