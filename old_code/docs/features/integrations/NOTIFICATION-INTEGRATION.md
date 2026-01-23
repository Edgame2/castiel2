# Integration Notification System

## Overview

The integration system integrates with the notification system in two directions:

1. **Integration System → Notification System**: Sending notifications to tenant admins on integration changes
2. **Notification System → Integration System**: Using integrations (Teams, Slack) to send notifications

This document focuses on the first direction: how the integration system sends notifications to tenant admins.

---

## Table of Contents

1. [Integration Events That Trigger Notifications](#integration-events-that-trigger-notifications)
2. [Notification Implementation](#notification-implementation)
3. [Notification Types](#notification-types)
4. [Code Examples](#code-examples)
5. [Error Handling](#error-handling)
6. [Notification Preferences](#notification-preferences)

---

## Integration Events That Trigger Notifications

The following integration events trigger notifications to tenant admins:

### Provider-Level Events

| Event | Description | Notification Type |
|-------|-------------|-------------------|
| Integration provider status changed | Provider status changed (active/beta/deprecated/disabled) | `information` or `warning` |
| Integration provider audience changed | Provider audience changed (system/tenant) | `information` |

### Integration Instance Events

| Event | Description | Notification Type |
|-------|-------------|-------------------|
| Integration instance connection status changed | Connection status changed (connected/disconnected/error) | `warning` or `error` |
| Integration instance connection test failed | Connection test failed | `warning` |
| Integration sync task failed | Sync task execution failed | `error` |
| Integration credentials expired or invalid | Credentials expired or became invalid | `error` |
| Integration data access configuration changed | Data access configuration (allowedShardTypes) changed | `information` |
| Integration search configuration changed | Search configuration updated | `information` |

---

## Notification Implementation

### Using NotificationService

The integration system uses `NotificationService.createSystemNotification()` to send notifications:

```typescript
import { NotificationService } from '../services/notification.service';

class IntegrationNotificationService {
  constructor(private notificationService: NotificationService) {}
  
  async notifyTenantAdmins(
    tenantId: string,
    notification: IntegrationNotification
  ): Promise<void> {
    await this.notificationService.createSystemNotification({
      tenantId,
      targetType: 'all_tenant', // Target all tenant admins
      type: notification.type,
      name: notification.title,
      content: notification.message,
      link: notification.link,
      metadata: {
        source: 'integration_system',
        relatedId: notification.integrationId,
        eventType: notification.eventType,
        providerName: notification.providerName,
        timestamp: new Date().toISOString()
      }
    });
  }
}
```

### Notification Target

All notifications are sent to **all tenant admins** for the affected tenant:

```typescript
{
  targetType: 'all_tenant', // All tenant admins receive the notification
  tenantId: integration.tenantId
}
```

---

## Notification Types

### Warning Notifications

Used for connection issues, test failures, and sync errors:

```typescript
{
  type: 'warning',
  title: 'Integration Connection Issue',
  message: 'The connection test for "Salesforce - Sales Team" failed. Please check your credentials.',
  link: `/integrations/${integrationId}/test`
}
```

### Error Notifications

Used for critical failures and credential expiration:

```typescript
{
  type: 'error',
  title: 'Integration Credentials Expired',
  message: 'The credentials for "Salesforce - Sales Team" have expired. Please update your credentials to continue syncing data.',
  link: `/integrations/${integrationId}/credentials`
}
```

### Information Notifications

Used for configuration changes and status updates:

```typescript
{
  type: 'information',
  title: 'Integration Configuration Updated',
  message: 'The data access configuration for "Salesforce - Sales Team" has been updated.',
  link: `/integrations/${integrationId}/configure`
}
```

### Alert Notifications

Used for urgent issues requiring immediate attention:

```typescript
{
  type: 'alert',
  title: 'Integration Sync Failure',
  message: 'Multiple sync tasks for "Salesforce - Sales Team" have failed. Immediate action required.',
  link: `/integrations/${integrationId}/sync`
}
```

---

## Code Examples

### Provider Status Changed

```typescript
async onProviderStatusChanged(
  providerId: string,
  oldStatus: IntegrationStatus,
  newStatus: IntegrationStatus,
  changedBy: string
): Promise<void> {
  // Get all tenant integrations using this provider
  const integrations = await this.integrationRepository.findByProvider(providerId);
  
  // Send notification to each tenant
  for (const integration of integrations) {
    await this.notificationService.createSystemNotification({
      tenantId: integration.tenantId,
      targetType: 'all_tenant',
      type: newStatus === 'disabled' ? 'warning' : 'information',
      name: 'Integration Provider Status Changed',
      content: `The "${integration.providerName}" integration provider status has changed from "${oldStatus}" to "${newStatus}".`,
      link: `/integrations/${integration.id}`,
      metadata: {
        source: 'integration_system',
        relatedId: integration.id,
        eventType: 'integration.provider.status.changed',
        providerName: integration.providerName,
        oldStatus,
        newStatus,
        changedBy
      }
    });
  }
}
```

### Connection Test Failed

```typescript
async onConnectionTestFailed(
  integrationId: string,
  tenantId: string,
  error: string
): Promise<void> {
  const integration = await this.integrationRepository.findById(integrationId, tenantId);
  
  await this.notificationService.createSystemNotification({
    tenantId,
    targetType: 'all_tenant',
    type: 'warning',
    name: 'Integration Connection Test Failed',
    content: `The connection test for "${integration.name}" failed: ${error}. Please check your credentials and try again.`,
    link: `/integrations/${integrationId}/test`,
    metadata: {
      source: 'integration_system',
      relatedId: integrationId,
      eventType: 'integration.connection.test.failed',
      providerName: integration.providerName,
      error,
      testedAt: new Date().toISOString()
    }
  });
  
  // Update integration document
  await this.integrationRepository.update(integrationId, tenantId, {
    lastConnectionTestAt: new Date(),
    lastConnectionTestResult: 'failed',
    connectionError: error
  });
}
```

### Sync Task Failed

```typescript
async onSyncTaskFailed(
  integrationId: string,
  tenantId: string,
  taskId: string,
  error: string,
  retryCount: number
): Promise<void> {
  const integration = await this.integrationRepository.findById(integrationId, tenantId);
  
  // Only send notification if it's a critical failure (multiple retries)
  if (retryCount >= 3) {
    await this.notificationService.createSystemNotification({
      tenantId,
      targetType: 'all_tenant',
      type: 'error',
      name: 'Integration Sync Task Failed',
      content: `The sync task for "${integration.name}" has failed after ${retryCount} attempts: ${error}. Please review the sync configuration.`,
      link: `/integrations/${integrationId}/sync/${taskId}`,
      metadata: {
        source: 'integration_system',
        relatedId: integrationId,
        eventType: 'integration.sync.failed',
        providerName: integration.providerName,
        taskId,
        error,
        retryCount
      }
    });
  }
}
```

### Credentials Expired

```typescript
async onCredentialsExpired(
  integrationId: string,
  tenantId: string
): Promise<void> {
  const integration = await this.integrationRepository.findById(integrationId, tenantId);
  
  await this.notificationService.createSystemNotification({
    tenantId,
    targetType: 'all_tenant',
    type: 'error',
    name: 'Integration Credentials Expired',
    content: `The credentials for "${integration.name}" have expired. Please update your credentials to continue syncing data.`,
    link: `/integrations/${integrationId}/credentials`,
    metadata: {
      source: 'integration_system',
      relatedId: integrationId,
      eventType: 'integration.credentials.expired',
      providerName: integration.providerName,
      expiredAt: new Date().toISOString()
    }
  });
  
  // Update integration status
  await this.integrationRepository.update(integrationId, tenantId, {
    connectionStatus: 'expired',
    connectionError: 'Credentials expired'
  });
}
```

### Data Access Configuration Changed

```typescript
async onDataAccessConfigChanged(
  integrationId: string,
  tenantId: string,
  oldAllowedShardTypes: string[],
  newAllowedShardTypes: string[],
  changedBy: string
): Promise<void> {
  const integration = await this.integrationRepository.findById(integrationId, tenantId);
  
  await this.notificationService.createSystemNotification({
    tenantId,
    targetType: 'all_tenant',
    type: 'information',
    name: 'Integration Data Access Updated',
    content: `The data access configuration for "${integration.name}" has been updated. Previously allowed: ${oldAllowedShardTypes.join(', ')}. Now allowed: ${newAllowedShardTypes.join(', ')}.`,
    link: `/integrations/${integrationId}/configure`,
    metadata: {
      source: 'integration_system',
      relatedId: integrationId,
      eventType: 'integration.data_access.updated',
      providerName: integration.providerName,
      oldAllowedShardTypes,
      newAllowedShardTypes,
      changedBy
    }
  });
}
```

### Search Configuration Changed

```typescript
async onSearchConfigChanged(
  integrationId: string,
  tenantId: string,
  changes: {
    searchEnabled?: boolean;
    searchableEntities?: string[];
    searchFilters?: any;
  },
  changedBy: string
): Promise<void> {
  const integration = await this.integrationRepository.findById(integrationId, tenantId);
  
  await this.notificationService.createSystemNotification({
    tenantId,
    targetType: 'all_tenant',
    type: 'information',
    name: 'Integration Search Configuration Updated',
    content: `The search configuration for "${integration.name}" has been updated.`,
    link: `/integrations/${integrationId}/configure`,
    metadata: {
      source: 'integration_system',
      relatedId: integrationId,
      eventType: 'integration.search.updated',
      providerName: integration.providerName,
      changes,
      changedBy
    }
  });
}
```

---

## Error Handling

Notification creation failures should **not break integration operations**. All notification calls should be wrapped in try-catch blocks:

```typescript
async notifyTenantAdmins(
  tenantId: string,
  notification: IntegrationNotification
): Promise<void> {
  try {
    await this.notificationService.createSystemNotification({
      tenantId,
      targetType: 'all_tenant',
      type: notification.type,
      name: notification.title,
      content: notification.message,
      link: notification.link,
      metadata: {
        source: 'integration_system',
        relatedId: notification.integrationId
      }
    });
  } catch (error) {
    // Log error but don't fail the integration operation
    this.monitoring.trackException(error, {
      operation: 'integration.notification.send',
      integrationId: notification.integrationId,
      tenantId
    });
    
    // Optionally retry notification in background
    await this.queueNotificationRetry(notification);
  }
}
```

### Retry Strategy

If notification creation fails, it can be retried in the background:

```typescript
async queueNotificationRetry(notification: IntegrationNotification): Promise<void> {
  await this.serviceBusClient.sendMessage('notification-retry', {
    notification,
    retryCount: 0,
    maxRetries: 3
  });
}
```

---

## Notification Preferences

The notification system respects tenant admin notification preferences. If a tenant admin has disabled notifications for integration events, they will not receive them.

### Notification Preferences Structure

```typescript
interface NotificationPreferences {
  integrationEvents: {
    connectionIssues: boolean; // Default: true
    syncFailures: boolean; // Default: true
    credentialExpiration: boolean; // Default: true
    configurationChanges: boolean; // Default: false
    statusUpdates: boolean; // Default: false
  };
}
```

### Checking Preferences

```typescript
async notifyTenantAdmins(
  tenantId: string,
  notification: IntegrationNotification
): Promise<void> {
  // Get tenant admin preferences
  const preferences = await this.getTenantAdminPreferences(tenantId);
  
  // Check if notification type is enabled
  if (!this.shouldSendNotification(notification.eventType, preferences)) {
    return; // Skip notification
  }
  
  // Send notification
  await this.notificationService.createSystemNotification({
    // ... notification config
  });
}
```

---

## Notification Links

All notifications include actionable links to integration management pages:

| Event | Link Pattern |
|-------|--------------|
| Connection test failed | `/integrations/{integrationId}/test` |
| Credentials expired | `/integrations/{integrationId}/credentials` |
| Sync task failed | `/integrations/{integrationId}/sync/{taskId}` |
| Configuration changed | `/integrations/{integrationId}/configure` |
| Status changed | `/integrations/{integrationId}` |

---

## Integration with Notification System (Using Integrations)

Some integrations can be used by the notification system to send notifications:

### Provider Configuration

In `integration_providers` container:

```typescript
{
  provider: "slack",
  supportsNotifications: true, // Can be used by notification system
  // ...
}
```

### Supported Integrations

- **Microsoft Teams**: `supportsNotifications: true`
- **Slack**: `supportsNotifications: true`
- **Email**: Via Azure Communication Services (not an integration)

### Usage

When the notification system needs to send a notification via an integration:

1. Check if integration has `supportsNotifications: true`
2. Get tenant's integration instance for that provider
3. Use adapter to send notification message
4. Track delivery status

---

## Related Documentation

- [Container Architecture](./CONTAINER-ARCHITECTURE.md) - Integration container structure
- [Configuration](./CONFIGURATION.md) - Integration configuration
- [Audit Logging](./AUDIT.md) - Integration audit events
- [Notification System](../notifications/README.md) - Global notification system

---

**Last Updated**: January 2025  
**Version**: 1.0.0







