# Configuration Reference

## Overview

This document covers all configuration options for the Integrations System, including environment variables, tenant settings, and provider configuration.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Function App Settings](#function-app-settings)
3. [Service Bus Configuration](#service-bus-configuration)
4. [Tenant Integration Settings](#tenant-integration-settings)
5. [Provider Configuration](#provider-configuration)
6. [Sync Settings](#sync-settings)
7. [Limits & Quotas](#limits--quotas)

---

## Environment Variables

### Azure Functions (func-sync-{env})

| Variable | Description | Example |
|----------|-------------|---------|
| `SERVICEBUS_SYNC_CONNECTION` | Service Bus connection string | `Endpoint=sb://sb-sync-prod...` |
| `KEY_VAULT_URL` | Key Vault URL | `https://kv-castiel-prod.vault.azure.net` |
| `EVENTGRID_ENDPOINT` | Event Grid topic endpoint | `https://evgt-castiel-prod...` |
| `EVENTGRID_KEY` | Event Grid key (from Key Vault) | `@Microsoft.KeyVault(...)` |
| `COSMOS_ENDPOINT` | Cosmos DB endpoint | `https://cosmos-castiel-prod...` |
| `COSMOS_KEY` | Cosmos DB key (from Key Vault) | `@Microsoft.KeyVault(...)` |
| `COSMOS_DATABASE` | Database name | `castiel` |
| `MAX_RECORDS_PER_SYNC` | Maximum records per sync job | `1000` |
| `MAX_CONCURRENT_SYNCS` | Max parallel syncs per tenant | `3` |
| `WEBHOOK_BASE_URL` | Base URL for webhook callbacks | `https://api.castiel.io/webhooks` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights | `InstrumentationKey=...` |

### Environment-Specific Overrides

```bash
# Development
MAX_RECORDS_PER_SYNC=100
MAX_CONCURRENT_SYNCS=1

# Staging
MAX_RECORDS_PER_SYNC=500
MAX_CONCURRENT_SYNCS=2

# Production
MAX_RECORDS_PER_SYNC=1000
MAX_CONCURRENT_SYNCS=3
```

---

## Function App Settings

### host.json

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensions": {
    "serviceBus": {
      "prefetchCount": 100,
      "messageHandlerOptions": {
        "autoComplete": false,
        "maxConcurrentCalls": 16,
        "maxAutoRenewDuration": "00:10:00"
      },
      "sessionHandlerOptions": {
        "autoComplete": false,
        "messageWaitTimeout": "00:00:30",
        "maxConcurrentSessions": 8
      }
    },
    "http": {
      "routePrefix": "",
      "maxOutstandingRequests": 200,
      "maxConcurrentRequests": 100
    }
  },
  "functionTimeout": "00:10:00"
}
```

### Function-Specific Settings

#### WebhookReceiver

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
    }
  ]
}
```

#### SyncScheduler

```json
{
  "bindings": [
    {
      "name": "timer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 */1 * * * *",
      "runOnStartup": false,
      "useMonitor": true
    }
  ]
}
```

#### SyncInboundScheduled

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

#### SyncOutbound

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

#### TokenRefresher

```json
{
  "bindings": [
    {
      "name": "timer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 */1 * * *"
    }
  ]
}
```

---

## Service Bus Configuration

### Namespace: sb-sync-{env}

#### Queues

| Queue | Max Size | TTL | Max Delivery | Sessions |
|-------|----------|-----|--------------|----------|
| `sync-inbound-webhook` | 5 GB | 7 days | 5 | No |
| `sync-inbound-scheduled` | 5 GB | 14 days | 10 | No |
| `sync-outbound` | 5 GB | 7 days | 10 | Yes |

#### Queue ARM Configuration

```json
{
  "type": "Microsoft.ServiceBus/namespaces/queues",
  "name": "sync-inbound-scheduled",
  "properties": {
    "maxSizeInMegabytes": 5120,
    "defaultMessageTimeToLive": "P14D",
    "maxDeliveryCount": 10,
    "lockDuration": "PT10M",
    "enablePartitioning": false,
    "deadLetteringOnMessageExpiration": true,
    "duplicateDetectionHistoryTimeWindow": "PT10M",
    "requiresSession": false
  }
}
```

---

## Tenant Integration Settings

### integrations Container Document Schema

Tenant integrations are stored in the `integrations` container (partition key: `/tenantId`). Each document represents a tenant's integration instance configuration.

```typescript
interface IntegrationDocument {
  id: string;
  tenantId: string; // Partition key
  integrationId: string; // Reference to integration_providers.id
  providerName: string; // e.g., "salesforce" (denormalized for queries)
  
  // Instance Identity (for multiple instances of same provider)
  name: string; // User-defined name/label (e.g., "Salesforce - Sales Team")
  icon?: string; // Icon name/identifier (inherited from provider by default)
  description?: string; // Optional description
  
  // Credentials Reference (Key Vault)
  credentialSecretName: string; // Azure Key Vault secret name
  // Credentials are stored in Azure Key Vault, not in container
  // Format: e.g., "tenant-{tenantId}-{providerName}-{instanceId}-oauth"
  // For user-scoped: "tenant-{tenantId}-user-{userId}-{providerName}-{instanceId}-oauth"
  
  // Configuration
  settings: Record<string, any>; // Tenant-specific settings
  syncConfig?: {
    syncEnabled: boolean;
    syncDirection: 'inbound' | 'outbound' | 'bidirectional';
    syncFrequency?: SyncFrequency;
    entityMappings: EntityMapping[];
    pullFilters?: PullFilter[];
    syncUserScoped?: boolean; // Sync scoped to individual users (configurable per integration)
    // When true: sync only data accessible to specific users
    // When false or undefined: sync tenant-wide data
  };
  userScoped?: boolean; // Enable user-level scoping for this integration instance
  // When true: search and sync filtered by user permissions/access
  // When false or undefined: tenant-wide access
  // Can override provider's requiresUserScoping setting
  
  // Data Access Control (Tenant Admin configured)
  allowedShardTypes: string[]; // Which shard types this integration can access
  // e.g., ["c_company", "c_contact"] - integration can only access these shard types
  // Empty array = no access, undefined/null = access to all supported types
  
  // Search Configuration (Tenant Admin configured)
  searchEnabled?: boolean; // Enable/disable search for this integration instance
  searchableEntities?: string[]; // Which entities can be searched (subset of provider's searchableEntities)
  // e.g., ["Account", "Contact"] - only search these entities, even if provider supports more
  // undefined/null = use all provider's searchableEntities
  searchFilters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  
  // Connection Status
  status: TenantIntegrationStatus; // 'pending' | 'connected' | 'error' | 'disabled'
  connectionStatus?: ConnectionStatus; // 'active' | 'expired' | 'revoked' | 'error'
  lastConnectedAt?: Date;
  lastConnectionTestAt?: Date; // When connection was last tested
  lastConnectionTestResult?: 'success' | 'failed'; // Result of last connection test
  connectionError?: string;
  
  // OAuth-specific (if applicable)
  instanceUrl?: string; // For OAuth (Salesforce instance, etc.)
  
  // Metadata
  enabledAt: Date;
  enabledBy: string; // Tenant admin user ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Key Vault Credential Reference

Credentials are stored in Azure Key Vault, not in Cosmos DB containers. The `credentialSecretName` field stores the reference to the Key Vault secret.

**Secret Naming Patterns:**
- **Tenant-scoped**: `tenant-{tenantId}-{providerName}-{instanceId}-oauth`
- **User-scoped**: `tenant-{tenantId}-user-{userId}-{providerName}-{instanceId}-oauth`
- **System-scoped**: `system-{providerName}-oauth`

**Example:**
```typescript
{
  credentialSecretName: "tenant-abc123-salesforce-sales-team-oauth"
  // Actual credentials stored in Azure Key Vault at this secret name
}
```

### Multiple Integration Instances

Tenant admins can configure multiple instances of the same provider per tenant. Each instance has:

- **Unique name**: User-defined label (e.g., "Salesforce - Sales Team", "Salesforce - Support Team")
- **Unique configuration**: Different settings, data access scopes, search configurations
- **Separate credentials**: Each instance has its own connection and credentials
- **Independent status**: Each instance can be enabled/disabled independently

**Example:**
```typescript
// Tenant can have multiple Salesforce instances
[
  {
    tenantId: "tenant-123",
    providerName: "salesforce",
    name: "Salesforce - Sales Team",
    allowedShardTypes: ["c_company", "c_contact", "c_opportunity"]
  },
  {
    tenantId: "tenant-123",
    providerName: "salesforce",
    name: "Salesforce - Support Team",
    allowedShardTypes: ["c_ticket", "c_case"]
  }
]
```

### Data Access Control

Tenant admins configure which shard types each integration instance can access using the `allowedShardTypes` field.

**Behavior:**
- **Empty array `[]`**: Integration has no access to any shard types
- **Specific array `["c_company", "c_contact"]`**: Integration can only access these shard types
- **Undefined/null**: Integration can access all shard types supported by the provider

**Example:**
```typescript
{
  id: "integration-1",
  tenantId: "tenant-123",
  providerName: "salesforce",
  allowedShardTypes: ["c_company", "c_contact", "c_opportunity"],
  // This integration can only read/write companies, contacts, and opportunities
}
```

### User-Level Scoping Configuration

Some integrations require user-level scoping (not tenant-wide). This is configured at multiple levels:

#### Provider Level (`integration_providers`)

```typescript
{
  provider: "gmail",
  requiresUserScoping: true, // Always requires user scoping
  // Examples: Gmail, Slack, GDrive, Salesforce (for user opportunities)
}
```

#### Integration Instance Level (`integrations`)

```typescript
{
  providerName: "salesforce",
  userScoped: true, // Override provider setting, enable user scoping for this instance
  // When true: search and sync filtered by user permissions
}
```

#### Sync Configuration

```typescript
{
  syncConfig: {
    syncUserScoped: true, // Sync only data accessible to specific users
    // Configurable per integration instance
  }
}
```

**User Context Passing:**
- User ID is passed to adapters in search and sync requests
- Adapters filter results based on user permissions/access
- User-specific credentials stored with `scope: 'user'` in `integration-connections`

**Examples of User-Scoped Integrations:**
- **Gmail**: User can only search their own emails
- **Slack**: User can search messages/channels they have access to
- **Salesforce**: User can only search opportunities they have access to
- **GDrive**: User can only search documents they have access to

**Multi-User Support:**
- Per-user connections: Each user connects their own account
- Shared account: Single connection, filtered by user permissions

### Search Configuration

Tenant admins can configure search per integration instance:

```typescript
{
  searchEnabled: true, // Enable/disable search for this instance
  searchableEntities: ["Account", "Contact"], // Subset of provider's entities
  searchFilters: {
    dateRange: { start: "2024-01-01", end: "2024-12-31" },
    entityTypes: ["Account"],
    customFilters: { status: "active" }
  }
}
```

### Sync Frequency Options

```typescript
interface SyncFrequency {
  type: 'interval' | 'cron' | 'manual';
  
  // For interval
  intervalMinutes?: number;             // 5, 15, 30, 60
  
  // For cron
  cronExpression?: string;              // "0 0 */4 * * *"
}

// Examples
const frequencies = {
  everyFiveMinutes: { type: 'interval', intervalMinutes: 5 },
  everyHour: { type: 'interval', intervalMinutes: 60 },
  dailyAt2AM: { type: 'cron', cronExpression: '0 0 2 * * *' },
  manual: { type: 'manual' }
};
```

### Entity Mapping Configuration

```typescript
interface EntityMapping {
  // Identity
  externalEntity: string;              // "Account", "contacts"
  shardTypeId: string;                 // "c_company", "c_contact"
  
  // Direction
  direction: 'inbound' | 'outbound' | 'bidirectional';
  
  // Behavior
  createNew: boolean;                  // Create new shards for new records
  updateExisting: boolean;             // Update existing shards
  deleteOnRemoval: boolean;            // Delete shard when external deleted
  
  // Field mappings
  fieldMappings: FieldMapping[];
  
  // Filters (entity-specific)
  filter?: string;                     // SOQL WHERE, OData $filter
}

interface FieldMapping {
  externalField: string;               // "Name", "customer_name"
  shardField: string;                  // "name", "structuredData.companyName"
  direction: 'inbound' | 'outbound' | 'bidirectional';
  transform?: FieldTransform;          // Optional transformation
  required?: boolean;                  // Required for sync
}

interface FieldTransform {
  type: 'direct' | 'map' | 'custom';
  
  // For map
  mapping?: Record<string, string>;    // { "LEAD": "lead", "CUSTOMER": "customer" }
  
  // For custom
  inboundFn?: string;                  // Function name for inbound transform
  outboundFn?: string;                 // Function name for outbound transform
}
```

### Pull Filter Configuration

```typescript
interface PullFilter {
  entity: string;                      // Which entity this applies to
  filterType: 'soql' | 'odata' | 'simple';
  
  // For SOQL (Salesforce)
  soqlWhere?: string;                  // "Type = 'Customer' AND Industry != null"
  
  // For OData (Dynamics)
  odataFilter?: string;                // "accountcategorycode eq 1"
  
  // For simple REST
  queryParams?: Record<string, string>;
}

// Example configurations
const pullFilters: PullFilter[] = [
  {
    entity: 'Account',
    filterType: 'soql',
    soqlWhere: "Type = 'Customer' AND OwnerId = '005xxx'"
  },
  {
    entity: 'account',
    filterType: 'odata',
    odataFilter: "accountcategorycode eq 1 and statecode eq 0"
  }
];
```

### Write-Back Configuration

```typescript
interface WriteBackConfig {
  enabled: boolean;
  mode: 'realtime';                    // Always real-time
  
  // Which entities to write back
  entities: WriteBackEntity[];
  
  // Retry policy
  retryPolicy: {
    maxAttempts: number;               // Default: 3
    initialDelayMs: number;            // Default: 5000
    backoffMultiplier: number;         // Default: 2
    maxDelayMs: number;                // Default: 60000
  };
}

interface WriteBackEntity {
  shardTypeId: string;
  externalEntity: string;
  operations: ('create' | 'update' | 'delete')[];
  fieldMappings: FieldMapping[];       // Reverse mappings
}
```

### Conflict Resolution

```typescript
type ConflictResolutionMode = 
  | 'last_write_wins'     // Most recent timestamp wins
  | 'external_wins'       // External system always wins
  | 'castiel_wins'        // Castiel always wins
  | 'manual';             // Flag for manual resolution

interface ConflictRecord {
  shardId: string;
  externalId: string;
  shardVersion: any;
  externalVersion: any;
  conflictedAt: string;
  resolvedAt?: string;
  resolution?: 'shard' | 'external' | 'merged';
}
```

---

## Provider Configuration

### integration_providers Container Schema

Providers are stored in the `integration_providers` container (partition key: `/category`). See [Container Architecture](./CONTAINER-ARCHITECTURE.md) for complete schema documentation.

```typescript
interface IntegrationProviderDocument {
  id: string;
  category: string; // Partition key (e.g., "crm", "communication")
  name: string;
  displayName: string;
  provider: string; // Unique identifier
  description?: string;
  
  // Status & Audience (Super Admin controlled)
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  audience: 'system' | 'tenant';
  
  // Capabilities
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  supportsNotifications: boolean;
  supportsSearch: boolean;
  searchableEntities?: string[];
  requiresUserScoping: boolean;
  
  // Authentication
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  oauthConfig?: OAuthConfig;
  
  // Entities
  availableEntities: IntegrationEntity[];
  entityMappings?: EntityToShardTypeMapping[];
  
  // Metadata
  icon: string;
  color: string;
  version: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  
  // Extension
  isBuiltIn: boolean;
  isThirdParty: boolean;
  adapterModule?: string;
}

interface AuthConfig {
  // OAuth 2.0
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  responseType?: string;
  grantType?: string;
  
  // For OAuth clients (stored separately)
  clientIdEnvVar?: string;             // Environment variable name
  clientSecretEnvVar?: string;
  
  // API Key
  apiKeyHeader?: string;               // "X-Api-Key"
  apiKeyPrefix?: string;               // "Bearer"
  
  // Service Account
  serviceAccountFields?: string[];
}
```

---

## Sync Settings

### Global Settings (Environment)

```typescript
const SYNC_GLOBAL_CONFIG = {
  // Limits
  MAX_RECORDS_PER_SYNC: 1000,
  MAX_CONCURRENT_SYNCS_PER_TENANT: 3,
  MAX_TOTAL_CONCURRENT_SYNCS: 50,
  
  // Timeouts
  SYNC_TIMEOUT_MS: 600000,             // 10 minutes
  API_CALL_TIMEOUT_MS: 30000,          // 30 seconds
  
  // Retry
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY_MS: 5000,
  MAX_RETRY_DELAY_MS: 300000,          // 5 minutes
  
  // Scheduling
  MIN_SYNC_INTERVAL_MINUTES: 5,
  SCHEDULER_CHECK_INTERVAL_SECONDS: 60,
  
  // Token refresh
  TOKEN_REFRESH_BUFFER_MS: 7200000,    // Refresh 2 hours before expiry
  TOKEN_REFRESH_CHECK_INTERVAL_MS: 3600000, // Check every hour
};
```

### Per-Tenant Overrides

Super Admin can set per-tenant limits:

```typescript
interface TenantSyncLimits {
  tenantId: string;
  maxRecordsPerSync?: number;          // Override global
  maxConcurrentSyncs?: number;         // Override global
  minSyncIntervalMinutes?: number;     // Minimum allowed interval
  allowedProviders?: string[];         // Restrict providers
  disabledProviders?: string[];        // Block specific providers
}
```

---

## Connection Testing

### Overview

Connection testing allows tenant admins and super admins to verify that integration connections are working correctly. Test results are stored in the integration document for tracking and troubleshooting.

### Permissions

**Tenant Admin:**
- Can test their tenant-specific integration connections
- Uses tenant credentials stored in Key Vault
- Test results stored in `integrations` container document

**Super Admin:**
- Can test system-level integration connections
- Can test any tenant integration (for support/troubleshooting)
- Uses system credentials or tenant credentials depending on scope

### Test Result Storage

Connection test results are stored in the `integrations` container document:

```typescript
{
  lastConnectionTestAt: Date; // When connection was last tested
  lastConnectionTestResult: 'success' | 'failed'; // Result of last connection test
  connectionError?: string; // Error message if test failed
  connectionStatus?: 'active' | 'expired' | 'revoked' | 'error'; // Current connection status
}
```

### Test Process

1. **Retrieve Credentials**: Get credentials from Key Vault using `credentialSecretName`
2. **Connect**: Attempt to connect to external system using adapter
3. **Validate**: Perform a simple operation (e.g., query user info, list entities)
4. **Store Results**: Update integration document with test results
5. **Notify**: Send notification to tenant admins if test fails (if configured)

### API Endpoints

**Tenant Admin:**
- `POST /api/tenant/integrations/:id/connection/test` - Test tenant integration connection

**Super Admin:**
- `POST /api/admin/integrations/:category/:id/test` - Test system-level connection

### Test Implementation Example

```typescript
async testConnection(integrationId: string, tenantId: string): Promise<ConnectionTestResult> {
  // Get integration instance
  const integration = await this.integrationRepository.findById(integrationId, tenantId);
  
  // Get credentials from Key Vault
  const credentials = await this.keyVaultClient.getSecret(integration.credentialSecretName);
  
  // Get adapter
  const adapter = await this.adapterManager.getAdapter(integration.providerName);
  
  try {
    // Connect and test
    await adapter.connect(JSON.parse(credentials.value));
    const testResult = await adapter.testConnection();
    
    // Update integration document
    await this.integrationRepository.update(integrationId, tenantId, {
      lastConnectionTestAt: new Date(),
      lastConnectionTestResult: testResult.success ? 'success' : 'failed',
      connectionError: testResult.error,
      connectionStatus: testResult.success ? 'active' : 'error'
    });
    
    return testResult;
  } catch (error) {
    // Update with error
    await this.integrationRepository.update(integrationId, tenantId, {
      lastConnectionTestAt: new Date(),
      lastConnectionTestResult: 'failed',
      connectionError: error.message,
      connectionStatus: 'error'
    });
    
    throw error;
  }
}
```

### Activate/Disable Permissions

**Tenant Admin:**
- Can activate/disable their tenant integrations
- Controls: `status: 'connected' | 'disabled'` in `integrations` container

**Super Admin:**
- Can activate/disable system providers (`status` in `integration_providers` container)
- Can activate/disable any tenant integrations (for support/troubleshooting)
- Controls: `status: 'active' | 'beta' | 'deprecated' | 'disabled'` for providers
- Controls: `status: 'connected' | 'disabled'` for tenant integrations

### Activation Process

```typescript
// Activate integration
await integrationRepository.update(integrationId, tenantId, {
  status: 'connected',
  enabledAt: new Date(),
  enabledBy: userId
});

// Disable integration
await integrationRepository.update(integrationId, tenantId, {
  status: 'disabled',
  updatedAt: new Date()
});
```

---

## Limits & Quotas

### System Limits

| Limit | Value | Scope |
|-------|-------|-------|
| Max records per sync | 1000 | Global |
| Max concurrent syncs per tenant | 3 | Per tenant |
| Max total concurrent syncs | 50 | System |
| Min sync interval | 5 minutes | Per provider |
| Sync timeout | 10 minutes | Per job |
| API call timeout | 30 seconds | Per request |
| Max retry attempts | 10 | Per job |
| Webhook payload size | 1 MB | Per webhook |

### Tenant Quotas

| Quota | Default | Configurable By |
|-------|---------|-----------------|
| Total integrations | 10 | Super Admin |
| Records per sync | 1000 | Super Admin |
| Syncs per day | Unlimited | Super Admin |
| Concurrent syncs | 3 | Super Admin |

### Provider-Specific Limits

| Provider | API Rate Limit | Min Interval |
|----------|---------------|--------------|
| Salesforce | 25 req/sec | 5 min |
| Dynamics | 60 req/sec | 5 min |
| HubSpot | 10 req/sec | 5 min |
| Teams | 30 req/sec | 5 min |
| Zoom | 10 req/sec | 15 min |
| Gong | 5 req/sec | 15 min |
| Google Drive | 100 req/sec | 5 min |
| OneDrive | 60 req/sec | 5 min |

---

**Last Updated**: November 2025  
**Version**: 1.0.0

