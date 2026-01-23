# Integration Audit Logging

## Overview

All integration-related events must be audited to provide a complete audit trail for compliance, troubleshooting, and security monitoring. This document describes the audit log structure, events, and integration with the existing audit system.

---

## Table of Contents

1. [Audit Events](#audit-events)
2. [Audit Log Structure](#audit-log-structure)
3. [Integration with Audit System](#integration-with-audit-system)
4. [Event Examples](#event-examples)
5. [Query Patterns](#query-patterns)

---

## Audit Events

### Integration Provider Events (Super Admin)

| Event | Description | Triggered By |
|-------|-------------|--------------|
| `integration.provider.created` | New integration provider created | Super Admin |
| `integration.provider.updated` | Integration provider updated | Super Admin |
| `integration.provider.deleted` | Integration provider deleted | Super Admin |
| `integration.provider.status.changed` | Provider status changed (active/beta/deprecated/disabled) | Super Admin |
| `integration.provider.audience.changed` | Provider audience changed (system/tenant) | Super Admin |

### Tenant Integration Events

| Event | Description | Triggered By |
|-------|-------------|--------------|
| `integration.instance.enabled` | Tenant integration instance enabled | Tenant Admin |
| `integration.instance.disabled` | Tenant integration instance disabled | Tenant Admin |
| `integration.instance.activated` | Integration instance activated | Tenant Admin |
| `integration.instance.deactivated` | Integration instance deactivated | Tenant Admin |
| `integration.instance.config.updated` | Integration configuration updated | Tenant Admin |
| `integration.instance.data_access.updated` | Data access configuration (allowedShardTypes) changed | Tenant Admin |
| `integration.instance.search.updated` | Search configuration updated | Tenant Admin |

### Connection Events

| Event | Description | Triggered By |
|-------|-------------|--------------|
| `integration.connection.tested` | Connection test performed | Tenant Admin / Super Admin |
| `integration.connection.connected` | Integration connected successfully | Tenant Admin |
| `integration.connection.disconnected` | Integration disconnected | Tenant Admin |
| `integration.connection.status.changed` | Connection status changed | System / Tenant Admin |
| `integration.credentials.updated` | Credentials updated (Key Vault secret changed) | Tenant Admin / Super Admin |
| `integration.credentials.expired` | Credentials expired | System (TokenRefresher) |

### Sync Events

| Event | Description | Triggered By |
|-------|-------------|--------------|
| `integration.sync.started` | Sync task started | Sync Engine |
| `integration.sync.completed` | Sync task completed successfully | Sync Engine |
| `integration.sync.failed` | Sync task failed | Sync Engine |
| `integration.sync.partial` | Sync task completed with partial success | Sync Engine |

---

## Audit Log Structure

### Audit Document Schema

```typescript
interface IntegrationAuditLog {
  id: string;
  tenantId: string; // Partition key
  timestamp: Date;
  eventType: string; // e.g., "integration.provider.created"
  
  // Actor (who performed the action)
  actor: {
    type: 'system' | 'super_admin' | 'tenant_admin' | 'user';
    userId?: string;
    userName?: string;
    tenantId?: string;
  };
  
  // Target (what was affected)
  target: {
    type: 'provider' | 'integration' | 'connection' | 'sync';
    providerId?: string;
    providerName?: string;
    integrationId?: string;
    integrationName?: string;
    connectionId?: string;
  };
  
  // Action details
  action: {
    operation: string; // 'create', 'update', 'delete', 'test', etc.
    field?: string; // Field that was changed (for updates)
    oldValue?: any; // Previous value (for updates)
    newValue?: any; // New value (for updates)
  };
  
  // Result
  result: {
    success: boolean;
    error?: string;
    errorCode?: string;
  };
  
  // Context
  context: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    integrationVersion?: string;
  };
  
  // Metadata
  metadata?: Record<string, any>; // Additional event-specific data
}
```

### Example Audit Log Entry

```json
{
  "id": "audit-123",
  "tenantId": "tenant-abc",
  "timestamp": "2025-01-15T10:30:00Z",
  "eventType": "integration.instance.config.updated",
  
  "actor": {
    "type": "tenant_admin",
    "userId": "user-456",
    "userName": "John Doe",
    "tenantId": "tenant-abc"
  },
  
  "target": {
    "type": "integration",
    "providerId": "salesforce-provider",
    "providerName": "salesforce",
    "integrationId": "integration-789",
    "integrationName": "Salesforce - Sales Team"
  },
  
  "action": {
    "operation": "update",
    "field": "allowedShardTypes",
    "oldValue": ["c_company", "c_contact"],
    "newValue": ["c_company", "c_contact", "c_opportunity"]
  },
  
  "result": {
    "success": true
  },
  
  "context": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "requestId": "req-abc123"
  },
  
  "metadata": {
    "previousSyncCount": 150,
    "newSyncCount": 200
  }
}
```

---

## Integration with Audit System

### Using Existing Audit Container

The integration system uses the existing audit container/system. Audit logs are stored in the `audit` container with the following structure:

**Container**: `audit`  
**Partition Key**: `/tenantId` (or hierarchical partition key if supported)

### Audit Service Integration

```typescript
import { AuditService } from '../services/audit.service';

class IntegrationAuditService {
  constructor(private auditService: AuditService) {}
  
  async logIntegrationEvent(event: IntegrationAuditEvent): Promise<void> {
    await this.auditService.createAuditLog({
      tenantId: event.tenantId,
      eventType: event.eventType,
      actor: event.actor,
      target: event.target,
      action: event.action,
      result: event.result,
      context: event.context,
      metadata: event.metadata,
      timestamp: new Date()
    });
  }
}
```

### Event Logging Examples

#### Provider Created

```typescript
await auditService.logIntegrationEvent({
  tenantId: 'system', // System-level event
  eventType: 'integration.provider.created',
  actor: {
    type: 'super_admin',
    userId: 'admin-123',
    userName: 'Super Admin'
  },
  target: {
    type: 'provider',
    providerId: 'salesforce-provider',
    providerName: 'salesforce'
  },
  action: {
    operation: 'create'
  },
  result: {
    success: true
  },
  metadata: {
    category: 'crm',
    status: 'active',
    audience: 'tenant'
  }
});
```

#### Connection Tested

```typescript
await auditService.logIntegrationEvent({
  tenantId: integration.tenantId,
  eventType: 'integration.connection.tested',
  actor: {
    type: 'tenant_admin',
    userId: userId,
    userName: userName,
    tenantId: integration.tenantId
  },
  target: {
    type: 'connection',
    integrationId: integration.id,
    integrationName: integration.name
  },
  action: {
    operation: 'test'
  },
  result: {
    success: testResult.success,
    error: testResult.error
  },
  metadata: {
    testDuration: testResult.duration,
    responseTime: testResult.responseTime
  }
});
```

#### Credentials Updated

```typescript
await auditService.logIntegrationEvent({
  tenantId: integration.tenantId,
  eventType: 'integration.credentials.updated',
  actor: {
    type: 'tenant_admin',
    userId: userId,
    userName: userName,
    tenantId: integration.tenantId
  },
  target: {
    type: 'connection',
    integrationId: integration.id,
    integrationName: integration.name
  },
  action: {
    operation: 'update',
    field: 'credentialSecretName',
    oldValue: oldSecretName,
    newValue: newSecretName
  },
  result: {
    success: true
  },
  metadata: {
    secretVersion: newSecretVersion
  }
});
```

---

## Event Examples

### Provider Status Changed

```json
{
  "eventType": "integration.provider.status.changed",
  "actor": {
    "type": "super_admin",
    "userId": "admin-123"
  },
  "target": {
    "type": "provider",
    "providerId": "salesforce-provider",
    "providerName": "salesforce"
  },
  "action": {
    "operation": "update",
    "field": "status",
    "oldValue": "active",
    "newValue": "deprecated"
  },
  "result": {
    "success": true
  },
  "metadata": {
    "reason": "Replaced by new version",
    "affectedTenants": 15
  }
}
```

### Data Access Configuration Changed

```json
{
  "eventType": "integration.instance.data_access.updated",
  "actor": {
    "type": "tenant_admin",
    "userId": "user-456",
    "tenantId": "tenant-abc"
  },
  "target": {
    "type": "integration",
    "integrationId": "integration-789",
    "integrationName": "Salesforce - Sales Team"
  },
  "action": {
    "operation": "update",
    "field": "allowedShardTypes",
    "oldValue": ["c_company", "c_contact"],
    "newValue": ["c_company", "c_contact", "c_opportunity"]
  },
  "result": {
    "success": true
  },
  "metadata": {
    "previousAccessCount": 2,
    "newAccessCount": 3
  }
}
```

### Sync Task Failed

```json
{
  "eventType": "integration.sync.failed",
  "actor": {
    "type": "system"
  },
  "target": {
    "type": "sync",
    "integrationId": "integration-789",
    "integrationName": "Salesforce - Sales Team"
  },
  "action": {
    "operation": "sync",
    "field": "syncExecution",
    "newValue": {
      "taskId": "task-123",
      "entity": "Account",
      "recordsProcessed": 0,
      "recordsFailed": 0
    }
  },
  "result": {
    "success": false,
    "error": "Connection timeout",
    "errorCode": "CONNECTION_TIMEOUT"
  },
  "metadata": {
    "retryCount": 3,
    "maxRetries": 5,
    "nextRetryAt": "2025-01-15T10:35:00Z"
  }
}
```

---

## Query Patterns

### Get All Integration Events for Tenant

```sql
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.eventType LIKE 'integration.%'
ORDER BY c.timestamp DESC
```

### Get Provider Events

```sql
SELECT * FROM c 
WHERE c.eventType LIKE 'integration.provider.%'
  AND c.target.providerId = @providerId
ORDER BY c.timestamp DESC
```

### Get Connection Test Events

```sql
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.eventType = 'integration.connection.tested'
  AND c.target.integrationId = @integrationId
ORDER BY c.timestamp DESC
```

### Get Failed Operations

```sql
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.eventType LIKE 'integration.%'
  AND c.result.success = false
ORDER BY c.timestamp DESC
```

### Get Credential Changes

```sql
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.eventType = 'integration.credentials.updated'
ORDER BY c.timestamp DESC
```

---

## Compliance Requirements

### Audit Log Retention

- **Retention Period**: 7+ years (for compliance)
- **Storage**: Cosmos DB with automatic backups
- **Access**: Super Admin and Tenant Admin (for their tenant)

### Data Privacy

- Audit logs may contain sensitive information (user IDs, integration names)
- Access is restricted by tenant isolation
- Super admins can access all audit logs
- Tenant admins can only access their tenant's audit logs

### Audit Log Integrity

- Audit logs are immutable (append-only)
- Cannot be modified or deleted
- Timestamps are server-generated
- All events include request ID for correlation

---

## Related Documentation

- [Container Architecture](./CONTAINER-ARCHITECTURE.md) - Integration container structure
- [Configuration](./CONFIGURATION.md) - Integration configuration
- [Notification Integration](./NOTIFICATION-INTEGRATION.md) - Notifications for integration events

---

**Last Updated**: January 2025  
**Version**: 1.0.0







