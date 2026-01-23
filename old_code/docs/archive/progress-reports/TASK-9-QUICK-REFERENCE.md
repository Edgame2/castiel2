# Task 9: Azure Functions - Quick Reference

## Function Overview

| Function | Trigger | Purpose | Scale |
|----------|---------|---------|-------|
| **SyncScheduler** | Timer (1h) | Fetch & enqueue pending sync tasks | 1 instance |
| **SyncInboundWorker** | Service Bus | Pull-based sync (fetch & save) | 1-10 instances |
| **SyncOutboundWorker** | Service Bus | Push-based sync (push changes) | 1-50 instances |
| **TokenRefresher** | Timer (6h) | Refresh OAuth tokens before expiry | 1 instance |
| **WebhookReceiver** | HTTP | Receive & verify webhook events | 1-200 instances |

---

## Quick Start

### 1. Local Development

```bash
# Start emulators
npm run emulator:cosmos &
npm run emulator:redis &
npm run emulator:servicebus &

# Start functions locally
npm run functions:start

# Test webhook endpoint
curl -X POST http://localhost:7071/webhooks/reg-123/events \
  -H "Content-Type: application/json" \
  -d '{"entityId":"acc-001","operation":"create"}'
```

### 2. Deployment to Azure

```bash
# Build
npm run build

# Deploy
func azure functionapp publish castiel-functions --typescript

# Verify
az functionapp function list --name castiel-functions --resource-group castiel-rg
```

---

## Core Concepts

### Task Scheduling (SyncScheduler)

Every hour:
1. Query Cosmos DB for pending tasks
2. Group by priority: HIGH → NORMAL → LOW
3. Enqueue to Service Bus
4. Update task status to "queued"

**Example Task:**
```json
{
  "integrationId": "salesforce",
  "tenantId": "tenant-1",
  "syncMode": "pull",
  "priority": "normal",
  "status": "pending"
}
```

### Pull Sync (SyncInboundWorker)

Message from Service Bus:
1. ✅ Check rate limits
2. 🔄 Fetch from external system
3. 🧹 Deduplicate records
4. 🔀 Resolve conflicts
5. 💾 Save to Cosmos DB
6. 📊 Store results

**Rate Limit Levels:**
- Integration: Salesforce 300/min, GitHub 360/min, etc.
- Operation: fetch 200/min, create 100/min, update 150/min
- Tenant: 5,000/min (configurable)

### Push Sync (SyncOutboundWorker)

Message from Service Bus:
1. ✅ Check rate limits
2. 🔍 Get entity from DB
3. 🤝 Resolve conflicts (local wins)
4. 📤 Push to external system
5. 📊 Store results

### Token Refresh (TokenRefresher)

Every 6 hours:
1. Find credentials expiring in < 1 hour
2. Refresh OAuth token with provider
3. Update in Key Vault & Cosmos DB
4. Alert if invalid grant (needs re-auth)

### Webhook Processing (WebhookReceiver)

HTTP POST:
1. ✅ Verify signature (5 algorithms)
2. 📥 Parse event
3. ✅ Check rate limits
4. 📤 Queue for outbound sync
5. 📊 Store audit record

**Signature Algorithms:**
- HMAC-SHA256: Salesforce, Notion, GitHub, Slack
- RSA-SHA256: Google

---

## Common Operations

### Check Task Status

```typescript
// Query Cosmos DB
const container = cosmosClient
  .database("castiel")
  .container("sync-tasks");

const { resources: tasks } = await container.items
  .query("SELECT * FROM c WHERE c.integrationId = @id", {
    parameters: [{ name: "@id", value: "salesforce" }]
  })
  .fetchAll();
```

### Process Rate Limited Request

```typescript
const limitCheck = await rateLimiter.checkRateLimit({
  integrationId: "salesforce",
  tenantId: "tenant-1",
  operation: "fetch"
});

if (!limitCheck.allowed && !limitCheck.queued) {
  // Requeue with backoff
  throw new Error(`Retry after ${limitCheck.retryAfterSeconds}s`);
}
```

### Queue Outbound Sync

```typescript
const sender = serviceBusClient.createSender("sync-outbound");

await sender.sendMessages({
  body: JSON.stringify({
    integrationId: "salesforce",
    entityId: "entity-001",
    operation: "create",
    changes: { name: "John" }
  }),
  correlationId: executionId
});
```

### Verify Webhook Signature (Salesforce)

```typescript
const crypto = require("crypto");

const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(requestBody)
  .digest("base64");

const valid = signature === requestHeader["X-Salesforce-Content-SHA256"];
```

---

## Environment Setup

```bash
# .env.local
COSMOS_ENDPOINT=https://castiel.documents.azure.com:443/
COSMOS_KEY=your-key-here
COSMOS_DATABASE=castiel

SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://castiel-sb.servicebus.windows.net/...
SERVICE_BUS_QUEUE=sync-inbound
SERVICE_BUS_QUEUE_OUTBOUND=sync-outbound

KEY_VAULT_URL=https://castiel-kv.vault.azure.net/
REDIS_URL=redis://castiel-cache.redis.cache.windows.net:6379

SYNC_BATCH_SIZE=100
SYNC_MAX_RETRIES=3
TOKEN_EXPIRY_THRESHOLD_MINUTES=60
```

---

## Debugging

### View Function Logs

```bash
# Stream logs for specific function
func azure functionapp logstream castiel-functions --name SyncScheduler

# All functions
func azure functionapp logstream castiel-functions
```

### Check Service Bus Queue

```bash
# Queue depth
az servicebus queue show \
  --namespace-name castiel-sb \
  --name sync-inbound \
  --resource-group castiel-rg \
  --query "messageCount"

# Peek message
az servicebus queue peek \
  --namespace-name castiel-sb \
  --name sync-inbound \
  --resource-group castiel-rg
```

### Verify Cosmos DB Data

```bash
# Connect to local emulator
az cosmosdb emulator start

# Query via Azure Portal or:
SELECT * FROM sync-tasks WHERE status = 'queued'
SELECT * FROM sync-results WHERE integrationId = 'salesforce'
SELECT * FROM webhook-audit WHERE timestamp > '2025-12-10'
```

---

## API Reference

### Sync Task Message

```typescript
interface SyncTaskMessage {
  integrationId: string;      // "salesforce"
  tenantId: string;           // "tenant-1"
  connectionId: string;       // "conn-sf-001"
  syncMode: "pull" | "push" | "bidirectional";
  priority: "high" | "normal" | "low";
  correlationId: string;      // Trace ID
  enqueuedAt: string;         // ISO 8601
  taskId?: string;            // Original task ID
}
```

### Webhook Event Message

```typescript
interface WebhookEvent {
  integrationId: string;
  tenantId: string;
  eventType: string;          // "account.created"
  entityType: string;         // "account"
  entityId: string;           // "acc-001"
  operation: "create" | "update" | "delete";
  data: Record<string, any>;
  timestamp: string;          // ISO 8601
}
```

### Rate Limit Response

```typescript
interface RateLimitCheck {
  allowed: boolean;           // Request allowed?
  queued: boolean;           // Request queued?
  remaining: number;         // Requests remaining
  resetAt: Date;             // Window reset time
  retryAfterSeconds: number; // Seconds to retry
}
```

---

## Monitoring Queries

### SyncScheduler Task Count

```kusto
customMetrics
| where name == "tasks_scheduled"
| summarize TaskCount=sum(value) by bin(timestamp, 1h)
| render timechart
```

### InboundWorker Success Rate

```kusto
customMetrics
| where name startswith "inbound_"
| summarize Success=sumif(value, name == "inbound_success"), 
            Failed=sumif(value, name == "inbound_failed")
| extend SuccessRate = (Success * 100) / (Success + Failed)
```

### WebhookReceiver Latency

```kusto
customMetrics
| where name == "webhook_latency_ms"
| summarize P50=percentile(value, 50), P95=percentile(value, 95), P99=percentile(value, 99)
```

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Task scheduling | < 500ms | Query + enqueue per batch |
| Sync inbound | 2-5s per 100 records | Includes fetch + transform + save |
| Sync outbound | < 1s per record | Push to external system |
| Token refresh | < 500ms per token | OAuth refresh call |
| Webhook process | < 100ms | Verify + parse + queue |

---

## Troubleshooting Checklist

- [ ] Service Bus queues exist (sync-inbound, sync-outbound)
- [ ] Cosmos DB containers exist (sync-tasks, sync-results, webhooks)
- [ ] Redis is reachable from function environment
- [ ] Key Vault policies allow function managed identity
- [ ] Environment variables set in Function App settings
- [ ] Timer triggers are enabled in Azure Portal
- [ ] Storage account exists for function app
- [ ] Network security allows Service Bus connectivity

---

## Cost Optimization

| Component | Optimization |
|-----------|--------------|
| SyncScheduler | Runs once/hour, minimal cost |
| InboundWorker | Scale down to 0 when idle (10 min) |
| OutboundWorker | Scale down to 0 when idle (10 min) |
| TokenRefresher | Runs once per 6 hours, minimal cost |
| WebhookReceiver | Scale down to 1 when < 10 req/min |
| Service Bus | Use Standard tier for production |
| Cosmos DB | Use autoscale (400-4000 RU/s) |

**Estimated Monthly Cost:**
- Functions: $10-50 (depends on throughput)
- Service Bus: $10-25
- Cosmos DB: $20-100 (autoscale)
- Redis: $15-25
- Total: $55-200

---

## Summary

5 specialized functions handling:
- ✅ Task orchestration (SyncScheduler)
- ✅ Pull-based sync (SyncInboundWorker)
- ✅ Push-based sync (SyncOutboundWorker)
- ✅ Token management (TokenRefresher)
- ✅ Webhook receipt (WebhookReceiver)

**All functions scale independently for optimal cost & performance**
