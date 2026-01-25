# Integration Manager - Logs Events

## Overview

Events published and consumed by the Integration Manager module for sync scheduling and OAuth token refresh. These events support audit trails and operational logging.

## Published Events

### integration.sync.scheduled

**Description**: Emitted when an integration is due for sync and has been scheduled.

**Triggered When**:
- IntegrationManagerEventConsumer receives `integration.sync.check-due`
- Query finds integrations with `syncConfig.syncEnabled=true`, `nextSyncAt <= now`, `status=connected`

**Event Type**: `integration.sync.scheduled`

**data**: `integrationId`, `tenantId`, `trigger` (`scheduled`), `scheduledAt` (ISO)

---

### integration.token.refresh-requested

**Description**: Emitted when an OAuth connection has an expiring token and a refresh is requested.

**Triggered When**:
- IntegrationManagerEventConsumer receives `integration.token.check-expiring`
- Query finds connections with `authType=oauth`, `status=active`, `oauth.expiresAt <= thresholdTime`, `oauth.expiresAt > now`

**Event Type**: `integration.token.refresh-requested`

**data**: `connectionId`, `integrationId`, `tenantId`, `expiresAt` (ISO), `requestedAt` (ISO)

---

## Consumed Events

### integration.sync.check-due

**Description**: Triggers a check for integrations due for sync.

**Handler**: `src/events/consumers/IntegrationManagerEventConsumer.ts`

**Action**: Query `integration_integrations` for due syncs; publish `integration.sync.scheduled` per integration; update `nextSyncAt`.

**data**: `timestamp` (ISO, optional)

---

### integration.token.check-expiring

**Description**: Triggers a check for OAuth connections with expiring tokens.

**Handler**: `src/events/consumers/IntegrationManagerEventConsumer.ts`

**Action**: Query `integration_connections` for expiring tokens; publish `integration.token.refresh-requested` per connection.

**data**: `timestamp` (ISO), `thresholdTime` (ISO)
