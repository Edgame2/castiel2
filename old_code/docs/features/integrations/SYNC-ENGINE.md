# Sync Engine

## Overview

The Sync Engine is a dedicated Azure Functions service that handles all data synchronization between Castiel and external systems. It processes inbound syncs (external → Castiel) and outbound write-back (Castiel → external) through Service Bus queues.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Azure Functions](#azure-functions)
3. [Service Bus Configuration](#service-bus-configuration)
4. [Inbound Sync Processing](#inbound-sync-processing)
5. [Outbound Write-Back](#outbound-write-back)
6. [Scheduling](#scheduling)
7. [Error Handling & Retries](#error-handling--retries)
8. [Rate Limiting](#rate-limiting)
9. [Monitoring](#monitoring)

---

## Architecture

### Function App Structure

```
func-sync-{env}/
├── functions/
│   ├── WebhookReceiver/           # HTTP trigger - receives webhooks
│   ├── SyncScheduler/             # Timer trigger - checks due syncs
│   ├── SyncInboundWebhook/        # SB trigger - process webhook events
│   ├── SyncInboundScheduled/      # SB trigger - process scheduled syncs
│   ├── SyncOutbound/              # SB trigger - write-back to external
│   └── TokenRefresher/            # Timer trigger - refresh OAuth tokens
├── adapters/
│   ├── salesforce/
│   ├── dynamics/
│   ├── teams/
│   ├── zoom/
│   ├── gong/
│   ├── google-drive/
│   └── onedrive/
├── services/
│   ├── credential-service.ts      # Key Vault operations
│   ├── transform-service.ts       # Field mappings
│   ├── shard-service.ts           # Shard CRUD operations
│   └── event-service.ts           # Event Grid publishing
└── shared/
    ├── types.ts
    ├── config.ts
    └── utils.ts
```

### Configuration

```typescript
// Function App Settings
const SYNC_CONFIG = {
  // Service Bus
  serviceBusConnection: process.env.SERVICEBUS_SYNC_CONNECTION,
  
  // Key Vault
  keyVaultUrl: process.env.KEY_VAULT_URL,
  
  // Event Grid
  eventGridEndpoint: process.env.EVENTGRID_ENDPOINT,
  eventGridKey: process.env.EVENTGRID_KEY,
  
  // Cosmos DB (for Shard operations)
  cosmosEndpoint: process.env.COSMOS_ENDPOINT,
  cosmosKey: process.env.COSMOS_KEY,
  
  // Limits
  maxRecordsPerSync: parseInt(process.env.MAX_RECORDS_PER_SYNC || '1000'),
  maxConcurrentSyncs: parseInt(process.env.MAX_CONCURRENT_SYNCS || '3'),
};
```

---

## Azure Functions

### WebhookReceiver

Receives webhooks from external systems and routes to Event Grid.

```typescript
// WebhookReceiver/index.ts
import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const webhookReceiver: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  const provider = req.params.provider;
  const tenantId = req.headers['x-tenant-id'];
  
  // 1. Validate webhook signature
  const adapter = getAdapter(provider);
  const isValid = adapter.validateWebhookSignature(
    req.body,
    req.headers['x-signature']
  );
  
  if (!isValid) {
    context.res = { status: 401, body: 'Invalid signature' };
    return;
  }
  
  // 2. Publish to Event Grid
  await publishEvent({
    eventType: 'Castiel.Integration.WebhookReceived',
    subject: `/integrations/${provider}/webhook`,
    data: {
      tenantId,
      provider,
      payload: req.body,
      receivedAt: new Date().toISOString()
    }
  });
  
  context.res = { status: 200, body: 'OK' };
};

export default webhookReceiver;
```

**function.json:**
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "webhooks/{provider}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

---

### SyncScheduler

Checks for integrations due for sync and triggers them.

```typescript
// SyncScheduler/index.ts
import { AzureFunction, Context } from "@azure/functions";

const syncScheduler: AzureFunction = async (context: Context): Promise<void> => {
  // 1. Query integrations where nextSyncAt <= now
  const dueIntegrations = await queryDueIntegrations();
  
  context.log(`Found ${dueIntegrations.length} integrations due for sync`);
  
  // 2. Publish sync event for each
  for (const integration of dueIntegrations) {
    await publishEvent({
      eventType: 'Castiel.Integration.SyncScheduled',
      subject: `/integrations/${integration.id}/sync`,
      data: {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        provider: integration.structuredData.providerName,
        syncType: 'incremental'
      }
    });
    
    // 3. Update nextSyncAt based on frequency
    await updateNextSyncTime(integration);
  }
};

export default syncScheduler;
```

**function.json:**
```json
{
  "bindings": [
    {
      "name": "timer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 */1 * * * *"
    }
  ]
}
```

---

### SyncInboundScheduled

Processes scheduled sync jobs from Service Bus.

```typescript
// SyncInboundScheduled/index.ts
import { AzureFunction, Context } from "@azure/functions";

const syncInboundScheduled: AzureFunction = async (
  context: Context,
  message: SyncJobMessage
): Promise<void> => {
  const { integrationId, tenantId, syncType } = message;
  
  context.log(`Processing sync: ${integrationId}, type: ${syncType}`);
  
  try {
    // 1. Load integration config
    const integration = await getIntegration(integrationId, tenantId);
    const provider = await getProvider(integration.structuredData.providerId);
    
    // 2. Get credentials from Key Vault
    const credentials = await getCredentials(tenantId, integrationId);
    
    // 3. Check token expiration, refresh if needed
    if (credentials.expiresAt && new Date(credentials.expiresAt) < new Date()) {
      const newTokens = await refreshOAuthToken(credentials);
      await storeCredentials(tenantId, integrationId, newTokens);
    }
    
    // 4. Initialize adapter
    const adapter = getAdapter(provider.structuredData.provider);
    await adapter.connect(credentials);
    
    // 5. Process each entity mapping
    const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
    
    for (const mapping of integration.structuredData.entityMappings) {
      const entityStats = await syncEntity(
        adapter,
        integration,
        mapping,
        syncType,
        tenantId
      );
      
      stats.created += entityStats.created;
      stats.updated += entityStats.updated;
      stats.skipped += entityStats.skipped;
      stats.failed += entityStats.failed;
    }
    
    // 6. Create sync history record
    await createSyncRecord(integrationId, tenantId, 'success', stats);
    
    // 7. Update integration lastSyncAt
    await updateIntegrationSyncTime(integrationId, tenantId);
    
    context.log(`Sync complete: ${JSON.stringify(stats)}`);
    
  } catch (error) {
    context.log.error(`Sync failed: ${error.message}`);
    await createSyncRecord(integrationId, tenantId, 'failed', null, error.message);
    throw error; // Rethrow for Service Bus retry
  }
};

async function syncEntity(
  adapter: IntegrationAdapter,
  integration: any,
  mapping: EntityMapping,
  syncType: string,
  tenantId: string
): Promise<SyncStats> {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  
  // Build query with filters
  const query = buildQuery(
    mapping.externalEntity,
    integration.structuredData.pullFilters,
    syncType === 'incremental' ? integration.structuredData.lastSyncAt : null,
    SYNC_CONFIG.maxRecordsPerSync
  );
  
  // Fetch records
  const result = await adapter.fetchRecords(mapping.externalEntity, {
    query,
    limit: SYNC_CONFIG.maxRecordsPerSync
  });
  
  // Process each record
  for (const record of result.records) {
    try {
      const shardData = transformToShard(record, mapping, tenantId);
      
      // Check if exists
      const existing = await findShardByExternalId(
        tenantId,
        mapping.shardTypeId,
        integration.structuredData.providerName,
        record.Id
      );
      
      if (existing) {
        await updateShard(existing.id, shardData, tenantId);
        stats.updated++;
      } else if (mapping.createNew) {
        await createShard(shardData, tenantId);
        stats.created++;
      } else {
        stats.skipped++;
      }
    } catch (error) {
      stats.failed++;
    }
  }
  
  return stats;
}

export default syncInboundScheduled;
```

**function.json:**
```json
{
  "bindings": [
    {
      "name": "message",
      "type": "serviceBusTrigger",
      "direction": "in",
      "queueName": "sync-inbound-scheduled",
      "connection": "SERVICEBUS_SYNC_CONNECTION"
    }
  ]
}
```

---

### SyncOutbound (Write-Back)

Processes real-time write-back to external systems.

```typescript
// SyncOutbound/index.ts
import { AzureFunction, Context } from "@azure/functions";

const syncOutbound: AzureFunction = async (
  context: Context,
  message: WriteBackMessage
): Promise<void> => {
  const { shardId, tenantId, operation, changedFields, externalSystem, externalId } = message;
  
  context.log(`Write-back: ${shardId} → ${externalSystem}/${externalId}`);
  
  try {
    // 1. Load integration and shard
    const shard = await getShard(shardId, tenantId);
    const integration = await findIntegrationByProvider(tenantId, externalSystem);
    
    // 2. Get credentials
    const credentials = await getCredentials(tenantId, integration.id);
    
    // 3. Initialize adapter
    const adapter = getAdapter(externalSystem);
    await adapter.connect(credentials);
    
    // 4. Find reverse mapping
    const mapping = findMappingForShardType(integration, shard.shardTypeId);
    
    // 5. Transform shard to external format (reverse mapping)
    const externalData = transformToExternal(shard, mapping, changedFields);
    
    // 6. Execute write-back
    if (operation === 'create') {
      const newId = await adapter.createRecord(mapping.externalEntity, externalData);
      await updateExternalRelationship(shardId, tenantId, externalSystem, newId);
    } else if (operation === 'update') {
      await adapter.updateRecord(mapping.externalEntity, externalId, externalData);
    } else if (operation === 'delete') {
      await adapter.deleteRecord(mapping.externalEntity, externalId);
    }
    
    // 7. Update sync status
    await updateExternalRelationshipSyncStatus(shardId, tenantId, externalSystem, 'synced');
    
    context.log(`Write-back complete`);
    
  } catch (error) {
    context.log.error(`Write-back failed: ${error.message}`);
    await updateExternalRelationshipSyncStatus(
      shardId, tenantId, externalSystem, 'failed', error.message
    );
    throw error;
  }
};

export default syncOutbound;
```

**function.json:**
```json
{
  "bindings": [
    {
      "name": "message",
      "type": "serviceBusTrigger",
      "direction": "in",
      "queueName": "sync-outbound",
      "connection": "SERVICEBUS_SYNC_CONNECTION",
      "isSessionsEnabled": true
    }
  ]
}
```

---

### TokenRefresher

Proactively refreshes OAuth tokens before expiration.

```typescript
// TokenRefresher/index.ts
const tokenRefresher: AzureFunction = async (context: Context): Promise<void> => {
  // Find tokens expiring in next 2 hours
  const expiringIntegrations = await findExpiringIntegrations(2 * 60 * 60 * 1000);
  
  for (const integration of expiringIntegrations) {
    try {
      const credentials = await getCredentials(
        integration.tenantId,
        integration.id
      );
      
      const newTokens = await refreshOAuthToken(
        integration.structuredData.providerId,
        credentials
      );
      
      await storeCredentials(integration.tenantId, integration.id, newTokens);
      
      context.log(`Refreshed token for ${integration.id}`);
    } catch (error) {
      context.log.error(`Token refresh failed for ${integration.id}: ${error.message}`);
      // Notify admin, integration may need re-authentication
      await notifyTokenRefreshFailure(integration);
    }
  }
};
```

---

## Service Bus Configuration

### Namespace: sb-sync-{env}

```typescript
const QUEUE_CONFIG = {
  'sync-inbound-webhook': {
    // Real-time webhook events
    maxDeliveryCount: 5,
    lockDurationMinutes: 5,
    defaultMessageTimeToLive: '7.00:00:00',  // 7 days
    deadLetteringOnMessageExpiration: true,
  },
  
  'sync-inbound-scheduled': {
    // Scheduled full/incremental syncs
    maxDeliveryCount: 10,
    lockDurationMinutes: 10,
    defaultMessageTimeToLive: '14.00:00:00', // 14 days
    deadLetteringOnMessageExpiration: true,
  },
  
  'sync-outbound': {
    // Write-back to external systems
    maxDeliveryCount: 10,
    lockDurationMinutes: 5,
    defaultMessageTimeToLive: '7.00:00:00',
    requiresSession: true,  // Per-integration ordering
    deadLetteringOnMessageExpiration: true,
  },
  
  'sync-deadletter': {
    // Failed jobs for investigation
    // Auto-created by Service Bus
  }
};
```

### Message Schemas

```typescript
interface SyncJobMessage {
  // Identity
  integrationId: string;
  tenantId: string;
  
  // Job details
  jobType: 'full_sync' | 'incremental' | 'webhook';
  provider: string;
  
  // For webhook jobs
  webhookPayload?: any;
  
  // For scheduled jobs
  entities?: string[];
  
  // Metadata
  scheduledAt: string;
  attempt: number;
}

interface WriteBackMessage {
  // Identity
  shardId: string;
  tenantId: string;
  
  // Operation
  operation: 'create' | 'update' | 'delete';
  changedFields?: string[];
  
  // External target
  externalSystem: string;
  externalId?: string;  // For update/delete
  
  // Metadata
  triggeredAt: string;
  triggeredBy: string;  // userId or 'system'
}
```

---

## Inbound Sync Processing

### Full Sync

```
1. Query all records matching filters (with pagination)
2. For each record:
   a. Transform to Shard format
   b. Check if exists (by externalId)
   c. Create new or update existing
3. Track statistics
4. Update lastSyncAt
```

### Incremental Sync

```
1. Query records modified since lastSyncAt
2. Same processing as full sync
3. Typically much fewer records
```

### Webhook Sync

```
1. Parse webhook payload
2. Identify affected record
3. Transform and upsert single record
4. Update sync timestamp
```

### Pagination Handling

```typescript
async function fetchAllRecords(
  adapter: IntegrationAdapter,
  entity: string,
  query: string,
  maxRecords: number
): Promise<any[]> {
  const allRecords = [];
  let cursor = null;
  
  while (allRecords.length < maxRecords) {
    const result = await adapter.fetchRecords(entity, {
      query,
      cursor,
      limit: Math.min(200, maxRecords - allRecords.length)
    });
    
    allRecords.push(...result.records);
    
    if (!result.hasMore || !result.cursor) {
      break;
    }
    
    cursor = result.cursor;
  }
  
  return allRecords;
}
```

---

## Outbound Write-Back

### Trigger Conditions

Write-back is triggered when:
1. Shard is created/updated
2. Shard has `external_relationship` with `syncDirection: 'bidirectional'`
3. Integration has `writeBack.enabled: true`

### Session-Based Ordering

Service Bus sessions ensure write-backs for the same integration are processed in order:

```typescript
// Session ID = integrationId
const sessionId = integration.id;

// All write-backs for this integration go to same session
await serviceBus.sendMessage('sync-outbound', message, { sessionId });
```

### Conflict Detection

Before write-back, check if external record was modified:

```typescript
async function detectConflict(
  shard: Shard,
  externalRecord: any,
  integration: Integration
): Promise<ConflictResult> {
  const shardLastModified = new Date(shard.updatedAt);
  const externalLastModified = new Date(externalRecord.LastModifiedDate);
  const lastSyncedAt = new Date(shard.external_relationships[0].lastSyncedAt);
  
  // Both modified since last sync = conflict
  if (shardLastModified > lastSyncedAt && externalLastModified > lastSyncedAt) {
    return {
      hasConflict: true,
      resolution: integration.structuredData.conflictResolution
    };
  }
  
  return { hasConflict: false };
}
```

---

## Scheduling

### Frequency Options

| Frequency | Cron Expression | Use Case |
|-----------|-----------------|----------|
| Every 5 min | `0 */5 * * * *` | High-priority CRM |
| Every 15 min | `0 */15 * * * *` | Standard sync |
| Every 30 min | `0 */30 * * * *` | Less critical data |
| Hourly | `0 0 * * * *` | Low priority |
| Daily | `0 0 0 * * *` | Bulk imports |

### Next Sync Calculation

```typescript
function calculateNextSyncTime(
  integration: Integration,
  lastSyncAt: Date
): Date {
  const frequency = integration.structuredData.syncFrequency;
  
  if (frequency.type === 'interval') {
    return addMinutes(lastSyncAt, frequency.intervalMinutes);
  }
  
  if (frequency.type === 'cron') {
    return getNextCronTime(frequency.cronExpression);
  }
  
  // Manual: set far future
  return new Date('2099-12-31');
}
```

---

## Error Handling & Retries

### Retry Policy

```typescript
const RETRY_CONFIG = {
  maxAttempts: 10,
  initialDelayMs: 5000,      // 5 seconds
  maxDelayMs: 300000,        // 5 minutes
  backoffMultiplier: 2,
  
  retryableErrors: [
    'RATE_LIMIT',
    'TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'CONNECTION_RESET'
  ],
  
  nonRetryableErrors: [
    'AUTHENTICATION_FAILED',
    'INVALID_CREDENTIALS',
    'NOT_FOUND',
    'VALIDATION_ERROR'
  ]
};
```

### Error Handling Flow

```typescript
async function processWithRetry(
  job: SyncJobMessage,
  context: Context
): Promise<void> {
  try {
    await processSync(job);
  } catch (error) {
    const errorType = classifyError(error);
    
    if (RETRY_CONFIG.nonRetryableErrors.includes(errorType)) {
      // Don't retry, send to dead letter
      context.log.error(`Non-retryable error: ${error.message}`);
      await sendToDeadLetter(job, error);
      return; // Complete the message
    }
    
    if (job.attempt >= RETRY_CONFIG.maxAttempts) {
      context.log.error(`Max retries exceeded: ${error.message}`);
      await sendToDeadLetter(job, error);
      return;
    }
    
    // Throw to trigger Service Bus retry
    throw error;
  }
}
```

### Dead Letter Processing

```typescript
// Manual processing of dead-lettered messages
async function reviewDeadLetters(): Promise<void> {
  const deadLetters = await receiveDeadLetterMessages('sync-inbound-scheduled');
  
  for (const message of deadLetters) {
    // Log for investigation
    await logDeadLetter(message);
    
    // Notify admin
    await notifyAdmin({
      type: 'SYNC_DEAD_LETTER',
      integrationId: message.body.integrationId,
      error: message.deadLetterReason,
      attempts: message.body.attempt
    });
  }
}
```

---

## Rate Limiting

### Per-Provider Limits

```typescript
const RATE_LIMITS = {
  salesforce: {
    requestsPerSecond: 25,
    requestsPerDay: 100000
  },
  dynamics: {
    requestsPerSecond: 60,
    requestsPerMinute: 6000
  },
  teams: {
    requestsPerSecond: 30
  }
};
```

### Rate Limiter Implementation

```typescript
class RateLimiter {
  private tokens: Map<string, number> = new Map();
  
  async acquire(key: string, limit: number): Promise<void> {
    const current = this.tokens.get(key) || limit;
    
    if (current <= 0) {
      // Wait and retry
      await delay(1000);
      return this.acquire(key, limit);
    }
    
    this.tokens.set(key, current - 1);
    
    // Replenish token after 1 second
    setTimeout(() => {
      const val = this.tokens.get(key) || 0;
      this.tokens.set(key, Math.min(val + 1, limit));
    }, 1000);
  }
}
```

---

## Monitoring

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `sync_jobs_processed` | Counter | Total sync jobs |
| `sync_jobs_failed` | Counter | Failed sync jobs |
| `sync_records_created` | Counter | Records created |
| `sync_records_updated` | Counter | Records updated |
| `sync_latency_ms` | Histogram | Sync duration |
| `sync_queue_depth` | Gauge | Pending jobs |
| `writeback_latency_ms` | Histogram | Write-back duration |
| `token_refresh_failures` | Counter | OAuth refresh failures |

### Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High failure rate | >10% jobs failing | Critical |
| Queue backlog | >100 pending jobs | Warning |
| Token refresh failure | Any failure | High |
| Dead letter accumulation | >10 messages | Warning |

### Logging

```typescript
// Structured logging for sync operations
context.log({
  level: 'info',
  message: 'Sync job completed',
  integrationId: job.integrationId,
  tenantId: job.tenantId,
  provider: job.provider,
  syncType: job.jobType,
  stats: {
    created: stats.created,
    updated: stats.updated,
    skipped: stats.skipped,
    failed: stats.failed
  },
  durationMs: endTime - startTime
});
```

---

**Last Updated**: November 2025  
**Version**: 1.0.0

