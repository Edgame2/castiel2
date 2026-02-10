# Integration Sync - Logs Events

## Overview

Events published and consumed by the Integration Sync module for scheduled syncs, webhook-triggered syncs, and OAuth token refresh. These events support audit trails and operational logging.

## Published Events

### integration.sync.check_due

**Description**: Emitted by SyncSchedulerService to request a check for integrations due for sync.

**Triggered When**:
- Sync scheduler timer fires (default every 60s)

**Event Type**: `integration.sync.check_due`

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

### integration.data.raw

**Description**: Emitted when raw data is fetched from an external integration and needs to be processed.

**Triggered When**:
- IntegrationSyncService.executeSyncTask() fetches data from external system (for small syncs or webhooks)

**Event Type**: `integration.data.raw`

**data**: 
- `integrationId` (string)
- `tenantId` (string)
- `entityType` (string) - e.g., "Opportunity", "Account"
- `rawData` (object) - Raw data from external system
- `externalId` (string) - External system ID
- `syncTaskId` (string) - Sync task ID
- `idempotencyKey` (string) - Format: `${integrationId}-${externalId}-${syncTaskId}`
- `correlationId` (string) - Correlation ID for tracking
- `metadata` (object, optional) - Additional metadata (direction, filters, etc.)

---

### integration.data.raw.batch

**Description**: Emitted when a batch of raw data records is fetched (for large syncs).

**Triggered When**:
- IntegrationSyncService.executeSyncTask() fetches large number of records (> batch_threshold, default: 100)

**Event Type**: `integration.data.raw.batch`

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `entityType` (string)
- `records` (array) - Array of records, each with:
  - `rawData` (object)
  - `externalId` (string)
  - `idempotencyKey` (string)
- `syncTaskId` (string)
- `correlationId` (string)
- `batchSize` (number) - Number of records in batch
- `metadata` (object, optional)

---

### integration.data.mapped

**Description**: Emitted when raw data has been successfully mapped and stored as a shard.

**Triggered When**:
- CRMDataMappingConsumer successfully processes integration.data.raw event and creates/updates shard

**Event Type**: `integration.data.mapped`

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `shardId` (string) - ID of created/updated shard
- `externalId` (string)
- `syncTaskId` (string)
- `idempotencyKey` (string)
- `correlationId` (string)
- `success` (boolean) - Always true for this event
- `duration` (number) - Processing duration in milliseconds

---

### integration.data.mapping.failed

**Description**: Emitted when mapping fails for a raw data record.

**Triggered When**:
- CRMDataMappingConsumer fails to process integration.data.raw event (after max retries)

**Event Type**: `integration.data.mapping.failed`

**data**:
- `integrationId` (string)
- `tenantId` (string)
- `externalId` (string, optional)
- `syncTaskId` (string)
- `idempotencyKey` (string, optional)
- `correlationId` (string)
- `error` (string) - Error message
- `retryAttempt` (number) - Retry attempt number (0 = first attempt)

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
