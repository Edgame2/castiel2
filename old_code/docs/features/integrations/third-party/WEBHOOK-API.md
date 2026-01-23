# Webhook API Reference

## Overview

The Webhook API enables third-party services to integrate with Castiel without deploying code to Castiel infrastructure. This document covers:

1. **Outbound Webhooks**: Events Castiel sends to your service
2. **Inbound API**: API endpoints for pushing data to Castiel

---

## Table of Contents

1. [Authentication](#authentication)
2. [Webhook Registration](#webhook-registration)
3. [Outbound Events](#outbound-events)
4. [Signature Validation](#signature-validation)
5. [Inbound API](#inbound-api)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)
8. [Best Practices](#best-practices)

---

## Authentication

### API Keys

All API calls require authentication via API key:

```
Authorization: Bearer {tenant_api_key}
```

API keys are created in the Castiel admin panel under **Settings → API Keys**.

### Webhook Signatures

Outbound webhooks are signed with HMAC-SHA256:

```
X-Castiel-Signature: sha256={signature}
X-Castiel-Timestamp: {unix_timestamp}
```

---

## Webhook Registration

### Register Webhook

```http
POST /api/integrations/webhooks
Authorization: Bearer {api_key}
Content-Type: application/json
```

Request Body:
```json
{
  "name": "My External Service",
  "url": "https://myservice.com/webhooks/castiel",
  "events": [
    "shard.created",
    "shard.updated",
    "shard.deleted"
  ],
  "shardTypes": ["c_company", "c_contact", "c_opportunity"],
  "secret": "your-webhook-secret-min-32-chars",
  "headers": {
    "X-Custom-Header": "custom-value"
  },
  "enabled": true
}
```

Response:
```json
{
  "id": "wh_abc123def456",
  "name": "My External Service",
  "url": "https://myservice.com/webhooks/castiel",
  "events": ["shard.created", "shard.updated", "shard.deleted"],
  "shardTypes": ["c_company", "c_contact", "c_opportunity"],
  "status": "active",
  "createdAt": "2025-11-30T10:00:00Z",
  "updatedAt": "2025-11-30T10:00:00Z"
}
```

### List Webhooks

```http
GET /api/integrations/webhooks
Authorization: Bearer {api_key}
```

### Get Webhook

```http
GET /api/integrations/webhooks/{webhookId}
Authorization: Bearer {api_key}
```

### Update Webhook

```http
PATCH /api/integrations/webhooks/{webhookId}
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "events": ["shard.created", "shard.updated"],
  "enabled": true
}
```

### Delete Webhook

```http
DELETE /api/integrations/webhooks/{webhookId}
Authorization: Bearer {api_key}
```

### Test Webhook

```http
POST /api/integrations/webhooks/{webhookId}/test
Authorization: Bearer {api_key}
```

Sends a test event to your webhook endpoint.

---

## Outbound Events

### Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `shard.created` | New shard created | Full shard data |
| `shard.updated` | Shard modified | Full shard data + changed fields |
| `shard.deleted` | Shard deleted | Shard ID + metadata |

### Event Payload Structure

```typescript
interface WebhookEvent {
  // Event identity
  eventId: string;                    // Unique event ID
  eventType: string;                  // 'shard.created', etc.
  timestamp: string;                  // ISO 8601
  
  // Tenant context
  tenantId: string;
  
  // Shard data
  shard: {
    id: string;
    shardTypeId: string;
    name: string;
    description?: string;
    structuredData: Record<string, any>;
    relationships?: Relationship[];
    external_relationships?: ExternalRelationship[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
  };
  
  // For updates
  changedFields?: string[];
  previousValues?: Record<string, any>;
  
  // Metadata
  triggeredBy: string;                // 'user' | 'system' | 'integration'
  userId?: string;                    // If triggered by user
}
```

### Example: shard.created

```json
{
  "eventId": "evt_123abc456def",
  "eventType": "shard.created",
  "timestamp": "2025-11-30T10:00:00Z",
  "tenantId": "tenant_abc123",
  "shard": {
    "id": "shard_xyz789",
    "shardTypeId": "c_company",
    "name": "Acme Corporation",
    "structuredData": {
      "industry": "Technology",
      "employeeCount": 500,
      "website": "https://acme.com"
    },
    "relationships": [],
    "createdAt": "2025-11-30T10:00:00Z",
    "updatedAt": "2025-11-30T10:00:00Z",
    "createdBy": "user_123"
  },
  "triggeredBy": "user",
  "userId": "user_123"
}
```

### Example: shard.updated

```json
{
  "eventId": "evt_456def789ghi",
  "eventType": "shard.updated",
  "timestamp": "2025-11-30T11:00:00Z",
  "tenantId": "tenant_abc123",
  "shard": {
    "id": "shard_xyz789",
    "shardTypeId": "c_company",
    "name": "Acme Corporation",
    "structuredData": {
      "industry": "Technology",
      "employeeCount": 600,
      "website": "https://acme.com"
    },
    "createdAt": "2025-11-30T10:00:00Z",
    "updatedAt": "2025-11-30T11:00:00Z"
  },
  "changedFields": ["structuredData.employeeCount"],
  "previousValues": {
    "structuredData.employeeCount": 500
  },
  "triggeredBy": "user",
  "userId": "user_456"
}
```

### Example: shard.deleted

```json
{
  "eventId": "evt_789ghi012jkl",
  "eventType": "shard.deleted",
  "timestamp": "2025-11-30T12:00:00Z",
  "tenantId": "tenant_abc123",
  "shard": {
    "id": "shard_xyz789",
    "shardTypeId": "c_company",
    "name": "Acme Corporation"
  },
  "triggeredBy": "user",
  "userId": "user_789"
}
```

---

## Signature Validation

### How Signatures Work

1. Castiel combines timestamp and payload
2. Signs with HMAC-SHA256 using your secret
3. Sends signature in header

### Validation Code

```typescript
import crypto from 'crypto';

function validateCastielWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // 1. Check timestamp (prevent replay attacks)
  const eventTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  
  if (Math.abs(now - eventTime) > 300) { // 5 minutes
    throw new Error('Webhook timestamp too old');
  }
  
  // 2. Compute expected signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  // 3. Compare signatures (timing-safe)
  const actual = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(actual)
  );
}

// Express middleware example
app.post('/webhooks/castiel', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-castiel-signature'] as string;
  const timestamp = req.headers['x-castiel-timestamp'] as string;
  
  try {
    const isValid = validateCastielWebhook(
      req.body.toString(),
      signature,
      timestamp,
      process.env.CASTIEL_WEBHOOK_SECRET!
    );
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = JSON.parse(req.body.toString());
    // Process event...
    
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## Inbound API

### Create Shard

```http
POST /api/shards
Authorization: Bearer {api_key}
Content-Type: application/json
```

Request:
```json
{
  "shardTypeId": "c_company",
  "name": "New Company",
  "description": "Created via webhook integration",
  "structuredData": {
    "industry": "Healthcare",
    "employeeCount": 200,
    "website": "https://newcompany.com"
  },
  "external_relationships": [{
    "system": "myservice",
    "externalId": "ext_company_123",
    "externalUrl": "https://myservice.com/companies/123",
    "syncDirection": "inbound",
    "metadata": {
      "importedAt": "2025-11-30T10:00:00Z"
    }
  }]
}
```

Response:
```json
{
  "id": "shard_newxyz789",
  "shardTypeId": "c_company",
  "name": "New Company",
  "structuredData": {
    "industry": "Healthcare",
    "employeeCount": 200,
    "website": "https://newcompany.com"
  },
  "external_relationships": [{
    "system": "myservice",
    "externalId": "ext_company_123",
    "syncDirection": "inbound"
  }],
  "createdAt": "2025-11-30T10:00:00Z"
}
```

### Update Shard

```http
PATCH /api/shards/{shardId}
Authorization: Bearer {api_key}
Content-Type: application/json
```

Request:
```json
{
  "structuredData": {
    "employeeCount": 250
  }
}
```

### Get Shard

```http
GET /api/shards/{shardId}
Authorization: Bearer {api_key}
```

### Find Shard by External ID

```http
GET /api/shards?externalSystem=myservice&externalId=ext_company_123
Authorization: Bearer {api_key}
```

### Batch Create/Update

```http
POST /api/shards/batch
Authorization: Bearer {api_key}
Content-Type: application/json
```

Request:
```json
{
  "operations": [
    {
      "operation": "upsert",
      "externalId": "ext_company_123",
      "externalSystem": "myservice",
      "data": {
        "shardTypeId": "c_company",
        "name": "Company 1",
        "structuredData": { "industry": "Tech" }
      }
    },
    {
      "operation": "upsert",
      "externalId": "ext_company_456",
      "externalSystem": "myservice",
      "data": {
        "shardTypeId": "c_company",
        "name": "Company 2",
        "structuredData": { "industry": "Finance" }
      }
    }
  ]
}
```

Response:
```json
{
  "results": [
    { "operation": "created", "shardId": "shard_abc", "externalId": "ext_company_123" },
    { "operation": "updated", "shardId": "shard_def", "externalId": "ext_company_456" }
  ],
  "summary": {
    "total": 2,
    "created": 1,
    "updated": 1,
    "failed": 0
  }
}
```

---

## Error Handling

### Webhook Delivery

Castiel retries failed webhook deliveries:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 30 seconds |
| 3 | 2 minutes |
| 4 | 10 minutes |
| 5 | 1 hour |

After 5 failures, webhook is disabled and admin notified.

### Expected Responses

| Status | Meaning |
|--------|---------|
| `200-299` | Success, event processed |
| `400-499` | Client error, don't retry |
| `500-599` | Server error, retry |
| Timeout | Retry (30s timeout) |

### API Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "structuredData.industry is required",
    "details": {
      "field": "structuredData.industry",
      "constraint": "required"
    }
  }
}
```

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE` | Resource already exists |
| `RATE_LIMITED` | Too many requests |
| `UNAUTHORIZED` | Invalid API key |
| `FORBIDDEN` | Insufficient permissions |

---

## Rate Limits

### API Limits

| Endpoint | Limit |
|----------|-------|
| Create Shard | 100 req/min |
| Update Shard | 100 req/min |
| Batch Operations | 10 req/min (max 100 items) |
| Read Operations | 1000 req/min |

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1732964460
```

---

## Best Practices

### Webhook Handling

1. **Respond Quickly**: Return 200 within 5 seconds
2. **Process Async**: Queue events for background processing
3. **Idempotency**: Use `eventId` to deduplicate
4. **Retry Logic**: Handle temporary failures gracefully

### Data Sync

1. **Use External IDs**: Always set `external_relationships`
2. **Batch Updates**: Use batch API for bulk operations
3. **Incremental Sync**: Track last sync timestamp
4. **Error Recovery**: Log failed operations for retry

### Security

1. **Validate Signatures**: Always validate webhook signatures
2. **Secure Secrets**: Store webhook secret securely
3. **HTTPS Only**: Use HTTPS for all endpoints
4. **API Key Rotation**: Rotate API keys periodically

---

**Last Updated**: November 2025  
**Version**: 1.0.0

