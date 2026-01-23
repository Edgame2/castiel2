# Adapter Development Guide

## Overview

Adapters are the integration layer between Castiel and external systems. Each adapter implements a common interface to handle authentication, data fetching, write operations, and webhooks.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Adapter Interface](#adapter-interface)
3. [Base Adapter Class](#base-adapter-class)
4. [Creating a New Adapter](#creating-a-new-adapter)
5. [Authentication](#authentication)
6. [Data Operations](#data-operations)
7. [Webhooks](#webhooks)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Available Adapters](#available-adapters)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADAPTER ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SYNC ENGINE                                   │   │
│  │                                                                      │   │
│  │  SyncInboundWorker          SyncOutboundWorker                       │   │
│  │         │                          │                                 │   │
│  │         └──────────────┬───────────┘                                 │   │
│  │                        │                                             │   │
│  │                        ▼                                             │   │
│  │         ┌──────────────────────────────────┐                         │   │
│  │         │      ADAPTER MANAGER             │                         │   │
│  │         │                                  │                         │   │
│  │         │  getAdapter(provider: string)    │                         │   │
│  │         │  registerAdapter(...)            │                         │   │
│  │         └──────────────┬───────────────────┘                         │   │
│  │                        │                                             │   │
│  └────────────────────────┼─────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ADAPTER INTERFACE                                 │   │
│  │                                                                      │   │
│  │  connect() | disconnect() | testConnection()                         │   │
│  │  fetchRecords() | createRecord() | updateRecord() | deleteRecord()   │   │
│  │  registerWebhook() | validateWebhookSignature()                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│         ┌─────────────────┼─────────────────┐                              │
│         │                 │                 │                              │
│         ▼                 ▼                 ▼                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                      │
│  │ Salesforce  │   │  Dynamics   │   │   Teams     │                      │
│  │  Adapter    │   │  Adapter    │   │  Adapter    │                      │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                      │
│         │                 │                 │                              │
│         ▼                 ▼                 ▼                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                      │
│  │ Salesforce  │   │  Dynamics   │   │  Microsoft  │                      │
│  │    API      │   │    API      │   │ Graph API   │                      │
│  └─────────────┘   └─────────────┘   └─────────────┘                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Adapter Interface

```typescript
interface IntegrationAdapter {
  // === IDENTITY ===
  readonly providerId: string;
  readonly providerName: string;
  
  // === LIFECYCLE ===
  connect(credentials: Credentials): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(): Promise<ConnectionTestResult>;
  
  // === INBOUND (External → Castiel) ===
  fetchRecords(
    entity: string,
    options: FetchOptions
  ): Promise<FetchResult>;
  
  // === OUTBOUND (Castiel → External) ===
  createRecord(
    entity: string,
    data: Record<string, any>
  ): Promise<CreateResult>;
  
  updateRecord(
    entity: string,
    externalId: string,
    data: Record<string, any>
  ): Promise<UpdateResult>;
  
  deleteRecord(
    entity: string,
    externalId: string
  ): Promise<DeleteResult>;
  
  // === WEBHOOKS ===
  registerWebhook(
    events: string[],
    callbackUrl: string
  ): Promise<WebhookRegistration>;
  
  unregisterWebhook(
    webhookId: string
  ): Promise<void>;
  
  validateWebhookSignature(
    payload: any,
    signature: string,
    secret?: string
  ): boolean;
  
  parseWebhookPayload(
    payload: any
  ): ParsedWebhookEvent;
}

// === TYPES ===

interface Credentials {
  type: 'oauth' | 'apikey' | 'serviceaccount' | 'basic';
  data: Record<string, any>;
}

interface FetchOptions {
  query?: string;              // Provider-specific query
  fields?: string[];           // Fields to return
  filter?: string;             // Filter expression
  cursor?: string;             // Pagination cursor
  limit?: number;              // Max records
  since?: Date;                // For incremental sync
  orderBy?: string;
}

interface FetchResult {
  records: any[];
  hasMore: boolean;
  cursor?: string;
  totalCount?: number;
}

interface CreateResult {
  id: string;
  success: boolean;
  errors?: string[];
}

interface UpdateResult {
  success: boolean;
  errors?: string[];
}

interface DeleteResult {
  success: boolean;
  errors?: string[];
}

interface ConnectionTestResult {
  success: boolean;
  message?: string;
  details?: {
    userId?: string;
    userName?: string;
    instanceUrl?: string;
    permissions?: string[];
  };
}

interface WebhookRegistration {
  webhookId: string;
  events: string[];
  callbackUrl: string;
  secret?: string;
  expiresAt?: Date;
}

interface ParsedWebhookEvent {
  eventType: string;           // 'record.created', 'record.updated', etc.
  entity: string;              // 'Account', 'Contact', etc.
  recordId: string;
  data?: any;
  timestamp: Date;
}
```

---

## Base Adapter Class

```typescript
abstract class BaseAdapter implements IntegrationAdapter {
  abstract readonly providerId: string;
  abstract readonly providerName: string;
  
  protected httpClient: HttpClient;
  protected credentials: Credentials | null = null;
  protected connected: boolean = false;
  protected rateLimiter: RateLimiter;
  
  constructor(config: AdapterConfig) {
    this.httpClient = new HttpClient({
      timeout: config.timeout || 30000,
      retries: config.retries || 3
    });
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }
  
  // === LIFECYCLE ===
  
  async connect(credentials: Credentials): Promise<void> {
    this.credentials = credentials;
    await this.validateCredentials();
    this.connected = true;
  }
  
  async disconnect(): Promise<void> {
    this.credentials = null;
    this.connected = false;
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  // Subclasses implement specific validation
  protected abstract validateCredentials(): Promise<void>;
  
  // === HTTP HELPERS ===
  
  protected async request<T>(
    method: string,
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    if (!this.connected) {
      throw new AdapterError('Not connected', 'NOT_CONNECTED');
    }
    
    await this.rateLimiter.acquire();
    
    const headers = await this.getAuthHeaders();
    
    try {
      const response = await this.httpClient.request<T>({
        method,
        url: this.buildUrl(url),
        headers: { ...headers, ...options?.headers },
        body: options?.body,
        params: options?.params
      });
      
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  protected abstract getAuthHeaders(): Promise<Record<string, string>>;
  protected abstract buildUrl(path: string): string;
  protected abstract handleError(error: any): AdapterError;
  
  // === DEFAULT IMPLEMENTATIONS ===
  
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.fetchTestData();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  protected abstract fetchTestData(): Promise<any>;
  
  // === ABSTRACT METHODS (must be implemented) ===
  
  abstract fetchRecords(entity: string, options: FetchOptions): Promise<FetchResult>;
  abstract createRecord(entity: string, data: Record<string, any>): Promise<CreateResult>;
  abstract updateRecord(entity: string, id: string, data: Record<string, any>): Promise<UpdateResult>;
  abstract deleteRecord(entity: string, id: string): Promise<DeleteResult>;
  abstract registerWebhook(events: string[], callbackUrl: string): Promise<WebhookRegistration>;
  abstract unregisterWebhook(webhookId: string): Promise<void>;
  abstract validateWebhookSignature(payload: any, signature: string, secret?: string): boolean;
  abstract parseWebhookPayload(payload: any): ParsedWebhookEvent;
}
```

---

## Creating a New Adapter

### Step 1: Create Adapter File

```typescript
// adapters/mycrm/mycrm-adapter.ts

import { BaseAdapter, FetchOptions, FetchResult, ... } from '../base-adapter';

export class MyCRMAdapter extends BaseAdapter {
  readonly providerId = 'mycrm';
  readonly providerName = 'MyCRM';
  
  private baseUrl: string = '';
  
  // === CREDENTIAL VALIDATION ===
  
  protected async validateCredentials(): Promise<void> {
    if (this.credentials?.type !== 'apikey') {
      throw new AdapterError('Invalid credential type', 'INVALID_CREDENTIALS');
    }
    
    // Test API key
    const response = await this.request('GET', '/me');
    if (!response.userId) {
      throw new AdapterError('Invalid API key', 'INVALID_API_KEY');
    }
  }
  
  // === AUTH HEADERS ===
  
  protected async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      'Authorization': `Bearer ${this.credentials!.data.api_key}`,
      'Content-Type': 'application/json'
    };
  }
  
  protected buildUrl(path: string): string {
    return `https://api.mycrm.com/v1${path}`;
  }
  
  // === DATA OPERATIONS ===
  
  async fetchRecords(entity: string, options: FetchOptions): Promise<FetchResult> {
    const params: Record<string, any> = {
      limit: options.limit || 100
    };
    
    if (options.cursor) {
      params.cursor = options.cursor;
    }
    
    if (options.since) {
      params.updated_after = options.since.toISOString();
    }
    
    const response = await this.request<MyCRMListResponse>('GET', `/${entity}`, { params });
    
    return {
      records: response.data,
      hasMore: !!response.next_cursor,
      cursor: response.next_cursor,
      totalCount: response.total
    };
  }
  
  async createRecord(entity: string, data: Record<string, any>): Promise<CreateResult> {
    const response = await this.request<MyCRMRecord>('POST', `/${entity}`, { body: data });
    
    return {
      id: response.id,
      success: true
    };
  }
  
  async updateRecord(entity: string, id: string, data: Record<string, any>): Promise<UpdateResult> {
    await this.request('PATCH', `/${entity}/${id}`, { body: data });
    
    return { success: true };
  }
  
  async deleteRecord(entity: string, id: string): Promise<DeleteResult> {
    await this.request('DELETE', `/${entity}/${id}`);
    
    return { success: true };
  }
  
  // === WEBHOOKS ===
  
  async registerWebhook(events: string[], callbackUrl: string): Promise<WebhookRegistration> {
    const response = await this.request<MyCRMWebhook>('POST', '/webhooks', {
      body: {
        url: callbackUrl,
        events: events,
        secret: generateSecret()
      }
    });
    
    return {
      webhookId: response.id,
      events: response.events,
      callbackUrl: response.url,
      secret: response.secret
    };
  }
  
  async unregisterWebhook(webhookId: string): Promise<void> {
    await this.request('DELETE', `/webhooks/${webhookId}`);
  }
  
  validateWebhookSignature(payload: any, signature: string, secret?: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret!)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
  
  parseWebhookPayload(payload: any): ParsedWebhookEvent {
    return {
      eventType: payload.event,
      entity: payload.object_type,
      recordId: payload.object_id,
      data: payload.data,
      timestamp: new Date(payload.timestamp)
    };
  }
  
  // === ERROR HANDLING ===
  
  protected handleError(error: any): AdapterError {
    if (error.response?.status === 401) {
      return new AdapterError('Invalid credentials', 'AUTHENTICATION_FAILED');
    }
    if (error.response?.status === 429) {
      return new AdapterError('Rate limit exceeded', 'RATE_LIMIT', { retryable: true });
    }
    return new AdapterError(error.message, 'UNKNOWN_ERROR');
  }
  
  protected async fetchTestData(): Promise<any> {
    return this.request('GET', '/me');
  }
}
```

### Step 2: Register Adapter

```typescript
// adapters/index.ts

import { SalesforceAdapter } from './salesforce/salesforce-adapter';
import { DynamicsAdapter } from './dynamics/dynamics-adapter';
import { MyCRMAdapter } from './mycrm/mycrm-adapter';

const adapters: Map<string, new () => IntegrationAdapter> = new Map([
  ['salesforce', SalesforceAdapter],
  ['dynamics', DynamicsAdapter],
  ['mycrm', MyCRMAdapter]
]);

export function getAdapter(providerId: string): IntegrationAdapter {
  const AdapterClass = adapters.get(providerId);
  if (!AdapterClass) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return new AdapterClass();
}

export function registerAdapter(
  providerId: string,
  AdapterClass: new () => IntegrationAdapter
): void {
  adapters.set(providerId, AdapterClass);
}
```

### Step 3: Create Provider Definition

Create a document in the `integration_providers` container:

```json
{
  "id": "mycrm-provider",
  "category": "crm",
  "name": "MyCRM",
  "displayName": "MyCRM Integration",
  "provider": "mycrm",
  "description": "Integration with MyCRM system",
  
  "status": "active",
  "audience": "tenant",
  
  "capabilities": ["read", "write"],
  "supportedSyncDirections": ["pull", "push", "bidirectional"],
  "supportsRealtime": false,
  "supportsWebhooks": false,
  "supportsNotifications": false,
  "supportsSearch": false,
  "requiresUserScoping": false,
  
  "authType": "api_key",
  "oauthConfig": null,
  
  "availableEntities": [
      {
        "externalEntity": "customers",
        "shardTypeId": "c_company",
        "displayName": "Customer",
        "supportedDirections": ["inbound", "outbound"],
        "defaultFieldMappings": [
          { "externalField": "name", "shardField": "name" },
          { "externalField": "email", "shardField": "email" }
        ]
      }
    ],
    
    "supportsWebhooks": true,
    "supportsPolling": true,
    "minPollIntervalMinutes": 5,
    "defaultPollIntervalMinutes": 15,
    "queryLanguage": "rest",
    
    "status": "active",
    "version": "1.0.0",
    "isBuiltIn": false,
    "isThirdParty": true
  }
}
```

---

## Authentication

### OAuth 2.0

```typescript
async handleOAuthCallback(code: string): Promise<OAuthTokens> {
  const response = await fetch(this.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri
    })
  });
  
  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    token_type: data.token_type
  };
}

async refreshToken(refreshToken: string): Promise<OAuthTokens> {
  // Similar to above with grant_type: 'refresh_token'
}
```

### API Key

```typescript
protected async getAuthHeaders(): Promise<Record<string, string>> {
  const apiKey = this.credentials!.data.api_key;
  const prefix = this.config.apiKeyPrefix || '';
  const header = this.config.apiKeyHeader || 'Authorization';
  
  return {
    [header]: prefix ? `${prefix} ${apiKey}` : apiKey
  };
}
```

---

## Error Handling

### Error Classification

```typescript
class AdapterError extends Error {
  constructor(
    message: string,
    public code: AdapterErrorCode,
    public options?: {
      retryable?: boolean;
      retryAfterMs?: number;
      details?: any;
    }
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

type AdapterErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'NOT_CONNECTED'
  | 'RATE_LIMIT'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

const RETRYABLE_CODES: AdapterErrorCode[] = [
  'RATE_LIMIT',
  'SERVICE_UNAVAILABLE',
  'TIMEOUT'
];
```

---

## Testing

### Unit Tests

```typescript
describe('MyCRMAdapter', () => {
  let adapter: MyCRMAdapter;
  
  beforeEach(() => {
    adapter = new MyCRMAdapter();
  });
  
  describe('connect', () => {
    it('should connect with valid API key', async () => {
      mockApi.get('/me').reply(200, { userId: '123' });
      
      await adapter.connect({
        type: 'apikey',
        data: { api_key: 'valid-key' }
      });
      
      expect(adapter.isConnected()).toBe(true);
    });
    
    it('should throw on invalid API key', async () => {
      mockApi.get('/me').reply(401);
      
      await expect(adapter.connect({
        type: 'apikey',
        data: { api_key: 'invalid' }
      })).rejects.toThrow('Invalid credentials');
    });
  });
  
  describe('fetchRecords', () => {
    it('should fetch records with pagination', async () => {
      mockApi.get('/customers').reply(200, {
        data: [{ id: '1', name: 'Acme' }],
        next_cursor: 'cursor123'
      });
      
      const result = await adapter.fetchRecords('customers', { limit: 100 });
      
      expect(result.records).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('cursor123');
    });
  });
});
```

### Integration Tests

```typescript
describe('MyCRMAdapter Integration', () => {
  // Use sandbox/test account
  const adapter = new MyCRMAdapter();
  
  beforeAll(async () => {
    await adapter.connect({
      type: 'apikey',
      data: { api_key: process.env.MYCRM_TEST_API_KEY }
    });
  });
  
  it('should create and fetch a record', async () => {
    const createResult = await adapter.createRecord('customers', {
      name: 'Test Customer',
      email: 'test@example.com'
    });
    
    expect(createResult.success).toBe(true);
    
    const fetchResult = await adapter.fetchRecords('customers', {
      filter: `id eq '${createResult.id}'`
    });
    
    expect(fetchResult.records[0].name).toBe('Test Customer');
    
    // Cleanup
    await adapter.deleteRecord('customers', createResult.id);
  });
});
```

---

## Available Adapters

| Adapter | Provider ID | Documentation |
|---------|-------------|---------------|
| Salesforce | `salesforce` | [salesforce.md](./salesforce.md) |
| Dynamics 365 | `dynamics` | [dynamics.md](./dynamics.md) |
| HubSpot | `hubspot` | [hubspot.md](./hubspot.md) |
| Microsoft Teams | `teams` | [teams.md](./teams.md) |
| Zoom | `zoom` | [zoom.md](./zoom.md) |
| Gong | `gong` | [gong.md](./gong.md) |
| Google Drive | `google_drive` | [google-drive.md](./google-drive.md) |
| Google Workspace | `google_workspace` | [google-workspace.md](./google-workspace.md) |
| OneDrive | `onedrive` | [onedrive.md](./onedrive.md) |
| Notion | `notion` | [notion.md](./notion.md) |
| Google News | `google-news` | [google-news.md](./google-news.md) |

---

**Last Updated**: January 2025  
**Version**: 1.0.0

---

## 🔍 Gap Analysis### Current Implementation Status**Status:** ✅ **Complete** - Adapter development guide fully documented#### Implemented Features (✅)- ✅ Adapter interface documented
- ✅ Base adapter class documented
- ✅ Adapter creation guide
- ✅ Authentication patterns
- ✅ Error handling patterns
- ✅ Available adapters listed

#### Known Limitations

- ⚠️ **Adapter Completeness** - Some adapters may not be fully implemented
  - **Code Reference:**
    - Adapter implementations may need verification
  - **Recommendation:**
    1. Verify all adapter implementations
    2. Test adapter functionality
    3. Document adapter status

- ⚠️ **Adapter Testing** - Adapter testing may be incomplete
  - **Recommendation:**
    1. Add comprehensive adapter tests
    2. Test error scenarios
    3. Document testing procedures

### Code References

- **Backend Services:**
  - `apps/api/src/integrations/adapters/` - Adapter implementations
  - `apps/api/src/services/integration.service.ts` - Integration service

### Related Documentation

- [Gap Analysis](../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Integrations Feature](../README.md) - Integration system
- [Backend Documentation](../../backend/README.md) - Backend implementation
