# Third-Party Extension Guide

## Overview

Castiel supports third-party integrations through two extension models:

1. **Deployed Adapters**: Third-party builds an adapter using our SDK, submitted for review and deployed to Castiel infrastructure
2. **Webhook-Based**: Third-party hosts their own service, communicates via webhooks

This guide covers both approaches.

---

## Table of Contents

1. [Extension Options](#extension-options)
2. [Deployed Adapter Process](#deployed-adapter-process)
3. [Webhook-Based Integration](#webhook-based-integration)
4. [Security Requirements](#security-requirements)
5. [Submission Process](#submission-process)
6. [Support & Maintenance](#support--maintenance)

---

## Extension Options

### Comparison

| Aspect | Deployed Adapter | Webhook-Based |
|--------|------------------|---------------|
| Hosting | Castiel infrastructure | Third-party infrastructure |
| Review | Required | Not required |
| Maintenance | Shared | Third-party |
| Trust Level | High | Standard |
| Capabilities | Full adapter API | Events + API only |
| Rate Limits | Standard | Per-integration |
| Ideal For | Commercial integrations | Custom/private |

### Decision Matrix

Choose **Deployed Adapter** if:
- Building a commercial integration for many tenants
- Need full bidirectional sync capabilities
- Want deep platform integration
- Can commit to security review process

Choose **Webhook-Based** if:
- Building a private/custom integration
- Need quick time-to-market
- Want full control over your service
- Don't want Castiel review process

---

## Deployed Adapter Process

### Step 1: Request Access

Contact Castiel partner team to request Adapter SDK access:

```
Email: partners@castiel.io
Subject: Integration Partner Request - [Your Company]
```

Include:
- Company information
- Integration description
- Target external system
- Expected tenant usage

### Step 2: Development

Once approved, you'll receive:
- Adapter SDK npm package
- Development documentation
- Sandbox environment access
- Test tenant credentials

#### SDK Installation

```bash
npm install @castiel/adapter-sdk
```

#### Adapter Template

```typescript
import { 
  BaseAdapter, 
  AdapterConfig,
  FetchOptions,
  FetchResult,
  // ... other types
} from '@castiel/adapter-sdk';

export class MySystemAdapter extends BaseAdapter {
  readonly providerId = 'mysystem';
  readonly providerName = 'My System';
  
  constructor() {
    super({
      timeout: 30000,
      retries: 3,
      rateLimit: {
        requestsPerSecond: 10
      }
    });
  }
  
  // Implement required methods...
  
  protected async validateCredentials(): Promise<void> {
    // Validate API credentials
  }
  
  async fetchRecords(entity: string, options: FetchOptions): Promise<FetchResult> {
    // Fetch records from external system
  }
  
  // ... other methods
}
```

→ See [Adapter SDK Documentation](./ADAPTER-SDK.md) for complete guide

### Step 3: Testing

Run the adapter test suite:

```bash
# Unit tests
npm run test:unit

# Integration tests (requires sandbox credentials)
MYSYSTEM_API_KEY=xxx npm run test:integration

# SDK compliance tests
npm run test:compliance
```

#### Compliance Tests

The SDK includes compliance tests that verify:
- Interface implementation
- Error handling
- Rate limit compliance
- Security requirements
- Data transformation

### Step 4: Security Review

Submit adapter for security review:

1. **Code Review**: Security team reviews source code
2. **Dependency Audit**: Check for vulnerable dependencies
3. **Credential Handling**: Verify secure credential management
4. **Data Privacy**: Ensure no data leakage

#### Security Checklist

- [ ] No credentials logged
- [ ] No PII in error messages
- [ ] Secure HTTP connections only
- [ ] Rate limiting implemented
- [ ] Input validation on all external data
- [ ] Proper error classification
- [ ] No hard-coded secrets

### Step 5: Deployment

After approval:
1. Adapter bundled into Castiel deployment
2. Provider definition created
3. Available to all tenants

---

## Webhook-Based Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK-BASED INTEGRATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CASTIEL                                      │   │
│  │                                                                      │   │
│  │  ┌──────────────────┐        ┌──────────────────┐                   │   │
│  │  │  Webhook Sender  │        │  Webhook Receiver│                   │   │
│  │  │                  │        │                  │                   │   │
│  │  │  Events OUT:     │        │  Data IN:        │                   │   │
│  │  │  • shard.created │        │  • Shard API     │                   │   │
│  │  │  • shard.updated │        │  • Batch import  │                   │   │
│  │  │  • shard.deleted │        │                  │                   │   │
│  │  └────────┬─────────┘        └────────▲─────────┘                   │   │
│  │           │                           │                              │   │
│  └───────────┼───────────────────────────┼──────────────────────────────┘   │
│              │                           │                                   │
│              │ HTTPS POST                │ HTTPS POST                        │
│              │ (signed)                  │ (authenticated)                   │
│              │                           │                                   │
│              ▼                           │                                   │
│  ┌───────────────────────────────────────┼──────────────────────────────┐   │
│  │              THIRD-PARTY SERVICE                                      │   │
│  │                                                                       │   │
│  │  ┌──────────────────┐        ┌──────────────────┐                    │   │
│  │  │ Webhook Endpoint │        │   Data Pusher    │                    │   │
│  │  │                  │        │                  │                    │   │
│  │  │ /webhooks/castiel│        │ POST to Castiel  │                    │   │
│  │  │                  │        │ API              │                    │   │
│  │  └──────────────────┘        └──────────────────┘                    │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Setup

#### 1. Register Webhook Endpoint

Call Castiel API to register your webhook:

```typescript
POST /api/integrations/webhooks
Authorization: Bearer {tenant_api_key}

{
  "name": "My Custom Integration",
  "url": "https://myservice.com/webhooks/castiel",
  "events": ["shard.created", "shard.updated", "shard.deleted"],
  "shardTypes": ["c_company", "c_contact"],
  "secret": "your-webhook-secret"
}
```

Response:
```json
{
  "webhookId": "wh_abc123",
  "url": "https://myservice.com/webhooks/castiel",
  "events": ["shard.created", "shard.updated", "shard.deleted"],
  "createdAt": "2025-11-30T10:00:00Z",
  "status": "active"
}
```

#### 2. Receive Events

Castiel sends events to your endpoint:

```typescript
POST https://myservice.com/webhooks/castiel
X-Castiel-Signature: sha256=abc123...
X-Castiel-Timestamp: 1732964400
Content-Type: application/json

{
  "eventType": "shard.created",
  "eventId": "evt_xyz789",
  "timestamp": "2025-11-30T10:00:00Z",
  "tenantId": "tenant_123",
  "shard": {
    "id": "shard_abc",
    "shardTypeId": "c_company",
    "name": "Acme Corp",
    "structuredData": {
      "industry": "Technology"
    }
  }
}
```

#### 3. Validate Signature

```typescript
function validateWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  );
}
```

#### 4. Push Data to Castiel

Use Castiel API to create/update shards:

```typescript
POST /api/shards
Authorization: Bearer {tenant_api_key}
Content-Type: application/json

{
  "shardTypeId": "c_company",
  "name": "New Company from External",
  "structuredData": {
    "externalSystemId": "ext_123",
    "name": "Company Name",
    "industry": "Technology"
  },
  "external_relationships": [{
    "system": "myservice",
    "externalId": "ext_123",
    "syncDirection": "inbound"
  }]
}
```

→ See [Webhook API Reference](./WEBHOOK-API.md) for complete API documentation

---

## Security Requirements

### For Deployed Adapters

| Requirement | Description |
|-------------|-------------|
| HTTPS Only | All external API calls must use HTTPS |
| No Credential Logging | Never log credentials or tokens |
| Secure Dependencies | No known vulnerabilities in dependencies |
| Input Validation | Validate all external data |
| Error Handling | No sensitive data in error messages |
| Rate Limiting | Respect external API rate limits |

### For Webhook-Based

| Requirement | Description |
|-------------|-------------|
| HTTPS Endpoint | Your webhook endpoint must use HTTPS |
| Signature Validation | Always validate webhook signatures |
| Timestamp Check | Reject events older than 5 minutes |
| Idempotency | Handle duplicate events gracefully |
| API Auth | Use API keys for Castiel API calls |

---

## Submission Process

### Deployed Adapter

1. **Initial Request**: Contact partners@castiel.io
2. **Agreement**: Sign partner agreement
3. **Development**: Build adapter using SDK
4. **Testing**: Pass all compliance tests
5. **Review**: Security review (1-2 weeks)
6. **Deployment**: Rolled out to production
7. **Listing**: Added to integration marketplace

### Webhook-Based

No submission required. Tenants can configure webhook integrations directly.

---

## Support & Maintenance

### Deployed Adapters

- **Bug Fixes**: Critical bugs fixed within 48 hours
- **Updates**: SDK updates announced 30 days in advance
- **Deprecation**: 6 months notice for breaking changes

### Webhook-Based

- **API Stability**: Webhook API versioned, 12 months support
- **Breaking Changes**: 90 days notice
- **Support**: Standard API support channels

---

**Last Updated**: November 2025  
**Version**: 1.0.0

