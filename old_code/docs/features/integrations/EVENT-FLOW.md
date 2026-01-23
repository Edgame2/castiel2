# Event Flow

## Overview

All integration events in Castiel flow through Azure Event Grid as the single entry point, then route to dedicated Service Bus queues for reliable processing. This document details the event routing configuration.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Event Grid Configuration](#event-grid-configuration)
3. [Event Types](#event-types)
4. [Service Bus Routing](#service-bus-routing)
5. [Event Schemas](#event-schemas)
6. [Subscription Filters](#subscription-filters)
7. [Dead Letter Handling](#dead-letter-handling)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EVENT FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EVENT SOURCES                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Cosmos Change   │  │   Webhooks      │  │   Scheduler     │             │
│  │    Feed         │  │ (External)      │  │   (Timer)       │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                                ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        EVENT GRID                                     │  │
│  │                                                                       │  │
│  │  System Topic: evgt-castiel-{env}                                     │  │
│  │                                                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      EVENT ROUTING                              │  │  │
│  │  │                                                                 │  │  │
│  │  │  Event Type                      │  Subscription  │  Destination│  │  │
│  │  │  ────────────────────────────────┼───────────────┼────────────│  │  │
│  │  │  Castiel.Shard.Created           │ evgs-embedding│ sb-embedding│  │  │
│  │  │  Castiel.Shard.Updated           │ evgs-embedding│ sb-embedding│  │  │
│  │  │  Castiel.Integration.Webhook*    │ evgs-sync-in  │ sb-sync-in  │  │  │
│  │  │  Castiel.Integration.SyncSched*  │ evgs-sync-in  │ sb-sync-in  │  │  │
│  │  │  Castiel.Integration.WriteBack*  │ evgs-sync-out │ sb-sync-out │  │  │
│  │  │  Castiel.Content.*               │ evgs-content  │ sb-contentgen│ │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────┬──────────────────────────────────────┘  │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────────────┐        │
│         │                        │                                │        │
│         ▼                        ▼                                ▼        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │  SERVICE BUS    │  │  SERVICE BUS    │  │  SERVICE BUS    │            │
│  │  sb-embedding   │  │   sb-sync       │  │ sb-contentgen   │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Grid Configuration

### System Topic

```bash
# Create Event Grid System Topic
az eventgrid system-topic create \
  --name evgt-castiel-prod \
  --resource-group rg-castiel-prod \
  --source /subscriptions/{sub}/resourceGroups/rg-castiel-prod \
  --topic-type Microsoft.Resources.ResourceGroups \
  --location westus2
```

### Custom Topic (Alternative)

```bash
# Or use Custom Topic for more control
az eventgrid topic create \
  --name evgt-castiel-prod \
  --resource-group rg-castiel-prod \
  --location westus2 \
  --input-schema cloudeventschemav1_0
```

---

## Event Types

### Shard Events (from Cosmos Change Feed)

| Event Type | Trigger | Data |
|------------|---------|------|
| `Castiel.Shard.Created` | New Shard created | shardId, tenantId, shardTypeId |
| `Castiel.Shard.Updated` | Shard modified | shardId, tenantId, changedFields |
| `Castiel.Shard.Deleted` | Shard deleted | shardId, tenantId |

### Integration Events

| Event Type | Trigger | Data |
|------------|---------|------|
| `Castiel.Integration.WebhookReceived` | External webhook | provider, tenantId, payload |
| `Castiel.Integration.SyncScheduled` | Scheduler triggers sync | integrationId, tenantId |
| `Castiel.Integration.SyncRequested` | Manual sync request | integrationId, tenantId, options |
| `Castiel.Integration.WriteBackRequested` | Shard changed, needs write-back | shardId, tenantId, externalId |

### Content Generation Events

| Event Type | Trigger | Data |
|------------|---------|------|
| `Castiel.Content.GenerationRequested` | User requests generation | templateId, tenantId, prompt |
| `Castiel.Content.RenderRequested` | UIF needs rendering | generatedContentId, formats |

---

## Service Bus Routing

### Subscription: evgs-sync-inbound

Routes integration events to sync inbound queues.

```json
{
  "name": "evgs-sync-inbound",
  "properties": {
    "destination": {
      "endpointType": "ServiceBusQueue",
      "properties": {
        "resourceId": "/subscriptions/{sub}/resourceGroups/rg-castiel-prod/providers/Microsoft.ServiceBus/namespaces/sb-sync-prod/queues/sync-inbound-webhook",
        "deliveryAttributeMappings": [
          {
            "name": "tenantId",
            "type": "Dynamic",
            "properties": {
              "sourceField": "data.tenantId"
            }
          }
        ]
      }
    },
    "filter": {
      "includedEventTypes": [
        "Castiel.Integration.WebhookReceived",
        "Castiel.Integration.SyncScheduled",
        "Castiel.Integration.SyncRequested"
      ]
    },
    "eventDeliverySchema": "CloudEventSchemaV1_0",
    "retryPolicy": {
      "maxDeliveryAttempts": 30,
      "eventTimeToLiveInMinutes": 1440
    }
  }
}
```

### Subscription: evgs-sync-outbound

Routes write-back events to sync outbound queue.

```json
{
  "name": "evgs-sync-outbound",
  "properties": {
    "destination": {
      "endpointType": "ServiceBusQueue",
      "properties": {
        "resourceId": "/subscriptions/{sub}/resourceGroups/rg-castiel-prod/providers/Microsoft.ServiceBus/namespaces/sb-sync-prod/queues/sync-outbound"
      }
    },
    "filter": {
      "includedEventTypes": [
        "Castiel.Integration.WriteBackRequested"
      ]
    }
  }
}
```

### Subscription: evgs-embedding

Routes shard events for embedding processing.

```json
{
  "name": "evgs-embedding",
  "properties": {
    "destination": {
      "endpointType": "ServiceBusQueue",
      "properties": {
        "resourceId": "/subscriptions/{sub}/resourceGroups/rg-castiel-prod/providers/Microsoft.ServiceBus/namespaces/sb-embedding-prod/queues/embedding-high"
      }
    },
    "filter": {
      "includedEventTypes": [
        "Castiel.Shard.Created",
        "Castiel.Shard.Updated"
      ],
      "advancedFilters": [
        {
          "operatorType": "StringIn",
          "key": "data.shardTypeId",
          "values": ["c_document", "c_project"]
        }
      ]
    }
  }
}
```

---

## Event Schemas

### CloudEvents Schema (Recommended)

```json
{
  "specversion": "1.0",
  "type": "Castiel.Integration.SyncScheduled",
  "source": "/subscriptions/{sub}/resourceGroups/rg-castiel/providers/Castiel/integrations",
  "subject": "/tenants/tenant-123/integrations/int-salesforce-abc",
  "id": "event-uuid-123",
  "time": "2025-11-30T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "integrationId": "int-salesforce-abc",
    "tenantId": "tenant-123",
    "provider": "salesforce",
    "syncType": "incremental",
    "triggeredBy": "scheduler"
  }
}
```

### Event Data Schemas

#### SyncScheduled

```typescript
interface SyncScheduledEventData {
  integrationId: string;
  tenantId: string;
  provider: string;
  syncType: 'full' | 'incremental';
  triggeredBy: 'scheduler' | 'manual' | 'webhook';
  entities?: string[];
}
```

#### WebhookReceived

```typescript
interface WebhookReceivedEventData {
  tenantId: string;
  provider: string;
  webhookId: string;
  eventType: string;           // Provider-specific event type
  payload: any;                // Raw webhook payload
  signature?: string;          // For validation
  receivedAt: string;
}
```

#### WriteBackRequested

```typescript
interface WriteBackRequestedEventData {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  operation: 'create' | 'update' | 'delete';
  changedFields?: string[];
  externalRelationship: {
    system: string;
    externalId?: string;
  };
  triggeredBy: string;         // userId or 'system'
}
```

---

## Subscription Filters

### Advanced Filtering Examples

#### Filter by ShardType (Embedding)

```json
{
  "advancedFilters": [
    {
      "operatorType": "StringIn",
      "key": "data.shardTypeId",
      "values": ["c_document", "c_project", "c_note"]
    }
  ]
}
```

#### Filter by Provider (Sync)

```json
{
  "advancedFilters": [
    {
      "operatorType": "StringIn",
      "key": "data.provider",
      "values": ["salesforce", "dynamics", "hubspot"]
    }
  ]
}
```

#### Filter by Tenant (Multi-tenant isolation)

```json
{
  "advancedFilters": [
    {
      "operatorType": "StringBeginsWith",
      "key": "subject",
      "values": ["/tenants/tenant-123/"]
    }
  ]
}
```

#### Exclude System Events

```json
{
  "advancedFilters": [
    {
      "operatorType": "StringNotIn",
      "key": "data.triggeredBy",
      "values": ["system-internal"]
    }
  ]
}
```

---

## Publishing Events

### From Cosmos Change Feed

```typescript
// Change Feed Processor
async function processChange(change: any): Promise<void> {
  const eventType = change.operationType === 'insert' 
    ? 'Castiel.Shard.Created'
    : 'Castiel.Shard.Updated';
  
  await eventGridClient.send([{
    eventType,
    subject: `/tenants/${change.tenantId}/shards/${change.id}`,
    dataVersion: '1.0',
    data: {
      shardId: change.id,
      tenantId: change.tenantId,
      shardTypeId: change.shardTypeId,
      changedFields: getChangedFields(change),
      timestamp: new Date().toISOString()
    }
  }]);
}
```

### From Webhook Receiver

```typescript
// WebhookReceiver Function
async function onWebhookReceived(
  provider: string,
  tenantId: string,
  payload: any
): Promise<void> {
  await eventGridClient.send([{
    eventType: 'Castiel.Integration.WebhookReceived',
    subject: `/tenants/${tenantId}/integrations/${provider}/webhook`,
    data: {
      tenantId,
      provider,
      webhookId: generateId(),
      eventType: extractEventType(provider, payload),
      payload,
      receivedAt: new Date().toISOString()
    }
  }]);
}
```

### From API (Manual Sync)

```typescript
// Integration Controller
async function requestSync(
  integrationId: string,
  tenantId: string,
  options: SyncOptions
): Promise<void> {
  await eventGridClient.send([{
    eventType: 'Castiel.Integration.SyncRequested',
    subject: `/tenants/${tenantId}/integrations/${integrationId}`,
    data: {
      integrationId,
      tenantId,
      syncType: options.full ? 'full' : 'incremental',
      triggeredBy: 'manual',
      entities: options.entities,
      userId: getCurrentUserId()
    }
  }]);
}
```

---

## Dead Letter Handling

### Event Grid Dead Letter

Configure storage account for failed deliveries:

```json
{
  "deadLetterDestination": {
    "endpointType": "StorageBlob",
    "properties": {
      "resourceId": "/subscriptions/{sub}/resourceGroups/rg-castiel/providers/Microsoft.Storage/storageAccounts/stcastieldl",
      "blobContainerName": "deadletterevents"
    }
  }
}
```

### Service Bus Dead Letter

Messages that fail after max delivery attempts go to dead letter queue:

```typescript
// Process dead letter messages
async function processDeadLetterQueue(): Promise<void> {
  const receiver = serviceBusClient.createReceiver(
    'sync-inbound-scheduled',
    { subQueueType: 'deadLetter' }
  );
  
  const messages = await receiver.receiveMessages(10);
  
  for (const message of messages) {
    // Log for investigation
    await logDeadLetter({
      queueName: 'sync-inbound-scheduled',
      body: message.body,
      deadLetterReason: message.deadLetterReason,
      deadLetterErrorDescription: message.deadLetterErrorDescription,
      enqueuedTime: message.enqueuedTimeUtc,
      deliveryCount: message.deliveryCount
    });
    
    // Optionally retry or archive
    if (isRetryable(message)) {
      await retryMessage(message);
    }
    
    await receiver.completeMessage(message);
  }
}
```

---

## Monitoring Events

### Event Grid Metrics

| Metric | Description |
|--------|-------------|
| `PublishSuccessCount` | Events successfully published |
| `PublishFailCount` | Events failed to publish |
| `MatchedEventCount` | Events matched by subscriptions |
| `DeliverySuccessCount` | Events delivered successfully |
| `DeliveryFailCount` | Events failed delivery |
| `DeadLetteredCount` | Events sent to dead letter |

### Alert Configuration

```json
{
  "alerts": [
    {
      "name": "High Event Grid Failure Rate",
      "condition": "DeliveryFailCount > 100 in 5 minutes",
      "severity": "Critical"
    },
    {
      "name": "Dead Letter Accumulation",
      "condition": "DeadLetteredCount > 50 in 1 hour",
      "severity": "Warning"
    }
  ]
}
```

---

**Last Updated**: November 2025  
**Version**: 1.0.0

