# Integration Sync - Logs Events

## Overview

Events published and consumed by the Integration Sync module for scheduled syncs, webhook-triggered syncs, and OAuth token refresh. These events support audit trails and operational logging.

## Published Events

### integration.sync.check-due

**Description**: Emitted by SyncSchedulerService to request a check for integrations due for sync.

**Triggered When**:
- Sync scheduler timer fires (default every 60s)

**Event Type**: `integration.sync.check-due`

**data**: `timestamp` (ISO)

---

### integration.token.check-expiring

**Description**: Emitted by TokenRefreshService to request a check for OAuth connections with expiring tokens.

**Triggered When**:
- Token refresh timer fires (default every 1h)

**Event Type**: `integration.token.check-expiring`

**data**: `timestamp` (ISO), `thresholdTime` (ISO)

---

### integration.token.refreshed

**Description**: Emitted when OAuth tokens for a connection were refreshed successfully.

**Triggered When**:
- TokenRefreshService.refreshConnectionTokens completes successfully after calling integration-manager refresh API

**Event Type**: `integration.token.refreshed`

**data**: `connectionId`, `integrationId`, `refreshedAt` (ISO)

---

### integration.token.refresh.failed

**Description**: Emitted when OAuth token refresh failed for a connection.

**Triggered When**:
- TokenRefreshService.refreshConnectionTokens throws or integration-manager refresh API returns failure

**Event Type**: `integration.token.refresh.failed`

**data**: `connectionId`, `integrationId`, `error` (string), `failedAt` (ISO)

---

## Consumed Events

### integration.sync.scheduled

**Description**: Triggers execution of a scheduled sync for an integration.

**Handler**: `src/events/consumers/SyncTaskEventConsumer.ts`

**Action**: Create sync task and execute via IntegrationSyncService.

**data**: `integrationId`, `tenantId`, `trigger`, `scheduledAt`

---

### integration.webhook.received

**Description**: Triggers a sync when a webhook is received.

**Handler**: `src/events/consumers/SyncTaskEventConsumer.ts`

**Action**: Create and execute sync task for webhook.

**data**: `integrationId`, `tenantId`, `entityType?`, `filters?`

---

### integration.token.refresh-requested

**Description**: Triggers OAuth token refresh for a connection.

**Handler**: `src/events/consumers/SyncTaskEventConsumer.ts`

**Action**: Call TokenRefreshService.refreshConnectionTokens with connection data from event.

**data**: `connectionId`, `integrationId`, `tenantId`, `expiresAt`, `requestedAt`
