# Logging Module - Notifications Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the Logging module that trigger notifications. These events are consumed by the Notification module to alert administrators about security issues and compliance violations.

---

## Published Events

The Logging module publishes the following events to the `coder_events` exchange:

| Event | Description | Notification Channels |
|-------|-------------|----------------------|
| `audit.alert.triggered` | Alert rule condition was met | Email, Push, In-App, Webhook |
| `audit.verification.failed` | Hash chain verification detected tampering | Email, Push, SMS, In-App |

---

### audit.alert.triggered

**Description**: Emitted when an alert rule's conditions are met (e.g., 5 failed logins within 10 minutes).

**Triggered When**:
- Pattern-based alert: A log matching the configured action pattern is created
- Threshold alert: Log count exceeds the configured threshold within the time window
- Anomaly alert: Unusual log volume or pattern is detected

**Event Type**: `audit.alert.triggered`

**Notification Priority**: Based on rule configuration (can be HIGH, MEDIUM, LOW)

**Publisher**: `src/events/publisher.ts` → `publishAlertTriggered()`

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
      "const": "audit.alert.triggered",
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp when event was emitted"
    },
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "const": "logging",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization where the alert was triggered"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User context if applicable (optional)"
    },
    "data": {
      "type": "object",
      "required": ["ruleId", "ruleName", "triggeredAt", "matchCount", "conditions", "notificationChannels"],
      "properties": {
        "ruleId": {
          "type": "string",
          "format": "cuid",
          "description": "ID of the alert rule that was triggered"
        },
        "ruleName": {
          "type": "string",
          "description": "Human-readable name of the alert rule"
        },
        "triggeredAt": {
          "type": "string",
          "format": "date-time",
          "description": "When the alert was triggered"
        },
        "matchCount": {
          "type": "integer",
          "minimum": 1,
          "description": "Number of matching log entries"
        },
        "conditions": {
          "type": "object",
          "description": "Alert rule conditions that were matched",
          "properties": {
            "action": {
              "type": "string",
              "description": "Action pattern that was matched"
            },
            "category": {
              "type": "string",
              "enum": ["ACTION", "ACCESS", "SECURITY", "SYSTEM", "CUSTOM"]
            },
            "severity": {
              "type": "string",
              "enum": ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"]
            },
            "count": {
              "type": "integer",
              "description": "Threshold count (for threshold alerts)"
            },
            "windowMinutes": {
              "type": "integer",
              "description": "Time window in minutes"
            }
          }
        },
        "notificationChannels": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["email", "push", "sms", "in_app", "webhook"]
          },
          "description": "Channels to use for notification"
        }
      }
    }
  }
}
```

**TypeScript Interface**:

```typescript
interface AlertTriggeredEventData {
  ruleId: string;
  ruleName: string;
  triggeredAt: string; // ISO 8601
  matchCount: number;
  conditions: {
    action?: string;
    category?: LogCategory;
    severity?: LogSeverity;
    count?: number;
    windowMinutes?: number;
  };
  notificationChannels: string[];
}

interface AlertTriggeredEvent extends DomainEvent<AlertTriggeredEventData> {
  type: 'audit.alert.triggered';
  data: AlertTriggeredEventData;
}
```

**Example Event**:

```json
{
  "id": "evt_clx1234567890abcdef",
  "type": "audit.alert.triggered",
  "timestamp": "2026-01-22T10:30:00Z",
  "version": "1.0",
  "source": "logging",
  "organizationId": "org_abc123def456",
  "data": {
    "ruleId": "rule_xyz789",
    "ruleName": "Multiple Failed Logins",
    "triggeredAt": "2026-01-22T10:30:00Z",
    "matchCount": 5,
    "conditions": {
      "action": "auth.login.failed",
      "category": "SECURITY",
      "count": 5,
      "windowMinutes": 10
    },
    "notificationChannels": ["email", "push", "in_app"]
  }
}
```

**Notification Template Suggestion**:

```
Subject: 🚨 Security Alert: {ruleName}

Alert Rule "{ruleName}" was triggered.

Details:
- Matched Events: {matchCount}
- Time Window: Last {windowMinutes} minutes
- Action: {conditions.action}

This alert was configured by your organization administrator.
Review the audit logs for more details.

[View Audit Logs] [Manage Alert Rules]
```

---

### audit.verification.failed

**Description**: Emitted when hash chain verification detects that audit logs may have been tampered with. This is a **CRITICAL** security event.

**Triggered When**:
- Manual verification via `/api/v1/verification/verify` finds invalid hashes
- Scheduled verification job detects hash chain inconsistencies
- Checkpoint verification finds logs with broken hash chains

**Event Type**: `audit.verification.failed`

**Notification Priority**: **CRITICAL** (highest priority)

**Publisher**: `src/events/publisher.ts` → `publishVerificationFailed()`

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
      "const": "audit.verification.failed",
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp when event was emitted"
    },
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Event schema version"
    },
    "source": {
      "type": "string",
      "const": "logging",
      "description": "Module that emitted the event"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization where tampering was detected"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "User who ran the verification (if manual)"
    },
    "data": {
      "type": "object",
      "required": ["failedLogIds", "count"],
      "properties": {
        "failedLogIds": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "cuid"
          },
          "description": "IDs of logs with invalid hashes"
        },
        "count": {
          "type": "integer",
          "minimum": 1,
          "description": "Number of logs with verification failures"
        },
        "verificationStartDate": {
          "type": "string",
          "format": "date-time",
          "description": "Start of verification range"
        },
        "verificationEndDate": {
          "type": "string",
          "format": "date-time",
          "description": "End of verification range"
        },
        "checkpointId": {
          "type": "string",
          "format": "cuid",
          "description": "Checkpoint ID if verification was from checkpoint"
        }
      }
    }
  }
}
```

**TypeScript Interface**:

```typescript
interface VerificationFailedEventData {
  failedLogIds: string[];
  count: number;
  verificationStartDate?: string;
  verificationEndDate?: string;
  checkpointId?: string;
}

interface VerificationFailedEvent extends DomainEvent<VerificationFailedEventData> {
  type: 'audit.verification.failed';
  data: VerificationFailedEventData;
}
```

**Example Event**:

```json
{
  "id": "evt_clx9876543210fedcba",
  "type": "audit.verification.failed",
  "timestamp": "2026-01-22T11:00:00Z",
  "version": "1.0",
  "source": "logging",
  "organizationId": "org_abc123def456",
  "userId": "user_admin123",
  "data": {
    "failedLogIds": [
      "log_aaa111",
      "log_bbb222",
      "log_ccc333"
    ],
    "count": 3,
    "verificationStartDate": "2026-01-01T00:00:00Z",
    "verificationEndDate": "2026-01-22T11:00:00Z"
  }
}
```

**Notification Template Suggestion**:

```
Subject: 🔴 CRITICAL: Audit Log Tampering Detected

⚠️ SECURITY ALERT: Hash chain verification has FAILED

{count} audit log entries may have been tampered with.

Organization: {organizationId}
Verification Run By: {userId}
Detection Time: {timestamp}

Affected Log IDs:
{failedLogIds.join('\n')}

IMMEDIATE ACTION REQUIRED:
1. Investigate the affected log entries
2. Check database access logs
3. Review system security
4. Contact security team immediately

This is an automated critical security alert.
Do not ignore this message.

[View Affected Logs] [Contact Security Team]
```

**Recommended Notification Channels**:
- **Email**: To all Organization Admins + Super Admins
- **SMS**: To primary security contact (if configured)
- **Push**: To all logged-in admins
- **In-App**: Banner alert for all admin users
- **Webhook**: To SIEM/security monitoring systems

---

## Event Handler in Notification Module

The Notification module should consume these events and handle them as follows:

```typescript
// In notification-manager/src/events/consumers/auditConsumer.ts

consumer.on('audit.alert.triggered', async (event) => {
  const { ruleId, ruleName, matchCount, conditions, notificationChannels } = event.data;
  
  // Get organization admins to notify
  const admins = await userService.getOrganizationAdmins(event.organizationId);
  
  // Send notifications through configured channels
  for (const channel of notificationChannels) {
    await notificationEngine.send({
      type: channel,
      recipients: admins,
      template: 'audit-alert-triggered',
      variables: {
        ruleName,
        matchCount,
        conditions,
        organizationId: event.organizationId,
      },
      priority: 'high',
    });
  }
});

consumer.on('audit.verification.failed', async (event) => {
  const { failedLogIds, count } = event.data;
  
  // This is CRITICAL - notify through all available channels
  const superAdmins = await userService.getSuperAdmins();
  const orgAdmins = await userService.getOrganizationAdmins(event.organizationId);
  
  await notificationEngine.sendCritical({
    recipients: [...superAdmins, ...orgAdmins],
    template: 'audit-verification-failed',
    variables: {
      count,
      failedLogIds,
      organizationId: event.organizationId,
      verifiedBy: event.userId,
    },
    channels: ['email', 'sms', 'push', 'in_app'],
    escalate: true, // Ensure delivery
  });
});
```

---

## Testing Events

### Manual Testing

Trigger events via API:

```bash
# Trigger alert (via alert evaluation)
curl -X POST http://localhost:3014/api/v1/alerts/{ruleId}/evaluate \
  -H "Authorization: Bearer $TOKEN"

# Run verification (may trigger verification.failed)
curl -X POST http://localhost:3014/api/v1/verification/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-01-01T00:00:00Z"}'
```

### Unit Test Example

```typescript
import { vi, describe, it, expect } from 'vitest';
import { publishAlertTriggered, publishVerificationFailed } from '../events/publisher';

describe('Event Publishing', () => {
  it('should publish alert.triggered event', async () => {
    const mockPublish = vi.fn();
    
    await publishAlertTriggered({
      ruleId: 'rule_123',
      ruleName: 'Test Alert',
      organizationId: 'org_456',
      triggeredAt: new Date(),
      matchCount: 5,
      conditions: { action: 'auth.login.failed' },
      notificationChannels: ['email'],
    });
    
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audit.alert.triggered',
      }),
      'audit.alert.triggered'
    );
  });
  
  it('should publish verification.failed event', async () => {
    await publishVerificationFailed(
      'org_456',
      ['log_1', 'log_2'],
      'user_admin'
    );
    
    // Assert event was published with correct data
  });
});
```

---

## Related Documentation

- [Logs Events](./logs-events.md) - Events consumed by this module
- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Architecture](./architecture.md) - Module architecture

---

*Document Version: 1.0*  
*Last Updated: 2026-01-22*



