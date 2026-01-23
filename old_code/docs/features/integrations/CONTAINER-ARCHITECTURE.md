# Integration Container Architecture

## Overview

This document defines the complete Azure Cosmos DB container architecture for the Integration System. Integrations use dedicated containers (NOT shard types with `c_` prefix) for optimal performance, cost management, and scalability.

> **Important**: The `c_` prefix is reserved for shard types in the `c_shard` container only. Integration containers do NOT use the `c_` prefix.

> **Deprecation Notice**: The previous ShardType-based approach (`c_integrationProvider` and `c_integration`) is deprecated. All integrations now use the container architecture described in this document.

---

## Container Architecture

### Integration Containers

| Container | Purpose | Partition Key | Managed By |
|-----------|---------|---------------|------------|
| **integration_providers** | System-level integration catalog (all available integrations) | `/category` | Super Admin |
| **integrations** | Tenant-specific integration instances with configuration | `/tenantId` | Tenant Admin |
| **integration-connections** | Connection credentials (system/tenant/user-scoped) | `/integrationId` | System |

### Related Containers

| Container | Purpose | Partition Key |
|-----------|---------|---------------|
| **conversion-schemas** | Data conversion schemas for integrations | `/tenantId` |
| **sync-tasks** | Sync task configurations | `/tenantId` |
| **sync-executions** | Sync execution history and logs | `/tenantId` |
| **sync-conflicts** | Sync conflict records for resolution | `/tenantId` |

---

## Detailed Container Specifications

### 1. integration_providers Container

**Container Name**: `integration_providers`  
**Partition Key**: `/category`  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: System-level catalog of all available integrations (managed by Super Admin)

#### Document Schema

```typescript
interface IntegrationProviderDocument {
  id: string;
  category: string; // Partition key (e.g., "crm", "communication", "data_source", "storage", "custom")
  name: string; // Internal name
  displayName: string; // User-friendly name
  provider: string; // Unique identifier (e.g., "salesforce")
  description?: string;
  
  // Status & Audience (Super Admin controlled)
  status: 'active' | 'beta' | 'deprecated' | 'disabled'; // Super admin can set
  audience: 'system' | 'tenant'; // Replaces visibility and connectionScope
  // audience: 'system' = not visible to tenant admins, system-level only
  // audience: 'tenant' = visible to tenant admins, they can configure per-tenant
  
  // Capabilities & Features
  capabilities: IntegrationCapability[]; // ['read', 'write', 'delete', 'search', 'realtime', 'bulk', 'attachments']
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  supportsNotifications: boolean; // Can be used by notification system (e.g., Teams, Slack)
  supportsSearch: boolean; // Adapter provides search capability
  searchableEntities?: string[]; // Which entities can be searched (e.g., ["Account", "Contact", "Opportunity"])
  searchCapabilities?: {
    fullText: boolean; // Supports full-text search
    fieldSpecific: boolean; // Supports field-specific search
    filtered: boolean; // Supports filtered search
  };
  requiresUserScoping: boolean; // Integration requires user-level scoping (not tenant-wide)
  // When true: search and sync must be scoped to individual users
  // Examples: Gmail (user emails), Slack (user-accessible channels), Salesforce (user opportunities), GDrive (user documents)
  
  // Authentication Configuration
  authType: AuthType; // 'oauth2' | 'api_key' | 'basic' | 'custom'
  oauthConfig?: OAuthConfig;
  
  // Entity Mappings
  availableEntities: IntegrationEntity[];
  entityMappings?: EntityToShardTypeMapping[];
  
  // Metadata
  icon: string; // Icon name/identifier
  color: string;
  documentationUrl?: string;
  supportUrl?: string;
  version: string;
  
  // Pricing (if applicable)
  isPremium?: boolean;
  requiredPlan?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Super admin user ID
  updatedBy: string;
}
```

#### Container Configuration

```typescript
{
  id: 'integration_providers',
  partitionKey: '/category',
  uniqueKeys: [
    ['/category', '/provider'] // Ensure unique provider per category
  ],
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/status/*' },
      { path: '/audience/*' },
      { path: '/provider/*' },
      { path: '/name/*' },
      { path: '/displayName/*' },
      { path: '/category/*' },
      { path: '/supportsSearch/*' },
      { path: '/supportsNotifications/*' },
      { path: '/requiresUserScoping/*' },
      { path: '/createdAt/*' },
      { path: '/updatedAt/*' }
    ],
    excludedPaths: [
      { path: '/description/*' },
      { path: '/oauthConfig/*' },
      { path: '/availableEntities/*' }
    ]
  }
}
```

#### Query Patterns

```typescript
// List all active providers by category
SELECT * FROM c 
WHERE c.category = @category 
  AND c.status = 'active'
  AND c.audience = 'tenant'
ORDER BY c.displayName

// Get provider by category and provider name
SELECT * FROM c 
WHERE c.category = @category 
  AND c.provider = @provider

// List providers that support search
SELECT * FROM c 
WHERE c.supportsSearch = true 
  AND c.status = 'active'
  AND c.audience = 'tenant'

// List providers that support notifications
SELECT * FROM c 
WHERE c.supportsNotifications = true 
  AND c.status = 'active'

// List providers that require user scoping
SELECT * FROM c 
WHERE c.requiresUserScoping = true 
  AND c.status = 'active'
```

---

### 2. integrations Container

**Container Name**: `integrations`  
**Partition Key**: `/tenantId`  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Tenant-specific integration instances with configuration (managed by Tenant Admin)

#### Document Schema

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

#### Container Configuration

```typescript
{
  id: 'integrations',
  partitionKey: '/tenantId',
  uniqueKeys: [
    ['/tenantId', '/providerName', '/name'] // Allow multiple instances per provider per tenant
  ],
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/tenantId/*' },
      { path: '/providerName/*' },
      { path: '/name/*' },
      { path: '/status/*' },
      { path: '/connectionStatus/*' },
      { path: '/searchEnabled/*' },
      { path: '/userScoped/*' },
      { path: '/enabledAt/*' },
      { path: '/createdAt/*' },
      { path: '/updatedAt/*' }
    ],
    excludedPaths: [
      { path: '/description/*' },
      { path: '/settings/*' },
      { path: '/syncConfig/*' }
    ]
  }
}
```

#### Query Patterns

```typescript
// List all integrations for a tenant
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
ORDER BY c.name

// Find integration by provider and name
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.providerName = @providerName 
  AND c.name = @name

// List enabled integrations with search enabled
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.status = 'connected'
  AND c.searchEnabled = true

// List integrations with connection errors
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.connectionStatus = 'error'
  OR c.lastConnectionTestResult = 'failed'

// List user-scoped integrations
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.userScoped = true
```

---

### 3. integration-connections Container

**Container Name**: `integration-connections`  
**Partition Key**: `/integrationId`  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Store connection credentials for integrations (system/tenant/user-scoped)

#### Document Schema

```typescript
interface IntegrationConnection {
  id: string;
  integrationId: string; // Partition key - reference to integrations.id
  
  // Scope
  scope: 'system' | 'tenant' | 'user'; // Extended to support user-scoped connections
  tenantId?: string; // Required for tenant and user scopes
  userId?: string; // Required for user scope
  
  // Authentication
  authType: AuthType; // 'oauth2' | 'api_key' | 'basic' | 'custom'
  
  // Encrypted credentials (for non-OAuth)
  encryptedCredentials?: string;
  encryptionKeyId?: string;
  
  // OAuth specific (stored separately for token refresh)
  oauth?: {
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    tokenType: string;
    expiresAt?: Date;
    scope?: string[];
  };
  
  // Status
  status: ConnectionStatus; // 'active' | 'expired' | 'revoked' | 'error'
  lastValidatedAt?: Date;
  validationError?: string;
  
  // Metadata
  displayName?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Container Configuration

```typescript
{
  id: 'integration-connections',
  partitionKey: '/integrationId',
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/integrationId/*' },
      { path: '/scope/*' },
      { path: '/tenantId/*' },
      { path: '/userId/*' },
      { path: '/status/*' },
      { path: '/authType/*' },
      { path: '/createdAt/*' },
      { path: '/updatedAt/*' }
    ],
    excludedPaths: [
      { path: '/encryptedCredentials/*' },
      { path: '/oauth/*' }
    ]
  }
}
```

#### Query Patterns

```typescript
// Get connection for an integration
SELECT * FROM c 
WHERE c.integrationId = @integrationId 
  AND c.scope = @scope
  AND (@scope != 'user' OR c.userId = @userId)

// List all user-scoped connections for an integration
SELECT * FROM c 
WHERE c.integrationId = @integrationId 
  AND c.scope = 'user'
  AND c.tenantId = @tenantId

// List expired connections
SELECT * FROM c 
WHERE c.status = 'expired'
  OR (c.oauth.expiresAt != null AND c.oauth.expiresAt < @now)
```

---

## Key Vault Credential Storage

### Secret Naming Convention

Credentials are stored in Azure Key Vault, not in Cosmos DB containers. The container stores only a reference to the secret name.

**Naming Patterns:**

- **Tenant-scoped**: `tenant-{tenantId}-{providerName}-{instanceId}-oauth`
- **User-scoped**: `tenant-{tenantId}-user-{userId}-{providerName}-{instanceId}-oauth`
- **System-scoped**: `system-{providerName}-oauth`

**Example:**
```
tenant-abc123-salesforce-sales-team-oauth
tenant-abc123-user-user456-gmail-personal-oauth
system-salesforce-oauth
```

### Secret Structure

For OAuth credentials:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_at": "2024-01-01T00:00:00Z",
  "scope": ["read", "write"],
  "instance_url": "https://instance.salesforce.com" // If applicable
}
```

For API Key credentials:
```json
{
  "api_key": "...",
  "api_secret": "..."
}
```

---

## Multiple Integration Instances

Tenant admins can configure multiple instances of the same integration provider per tenant. Each instance has:

- **Unique name**: User-defined label (e.g., "Salesforce - Sales Team", "Salesforce - Support Team")
- **Unique configuration**: Different settings, data access scopes, search configurations
- **Separate credentials**: Each instance has its own connection and credentials
- **Independent status**: Each instance can be enabled/disabled independently

**Example:**
```typescript
// Tenant can have multiple Salesforce instances
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
```

---

## Data Access Control

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

---

## User-Level Scoping

Some integrations require user-level scoping (not tenant-wide). This is configured at two levels:

### Provider Level (`integration_providers`)

```typescript
{
  provider: "gmail",
  requiresUserScoping: true, // Always requires user scoping
  // Examples: Gmail, Slack, GDrive, Salesforce (for user opportunities)
}
```

### Integration Instance Level (`integrations`)

```typescript
{
  providerName: "salesforce",
  userScoped: true, // Override provider setting, enable user scoping for this instance
  // When true: search and sync filtered by user permissions
}
```

### Sync Configuration

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

---

## Search Configuration

### Provider-Level Search Capabilities

```typescript
{
  supportsSearch: true,
  searchableEntities: ["Account", "Contact", "Opportunity"],
  searchCapabilities: {
    fullText: true,
    fieldSpecific: true,
    filtered: true
  }
}
```

### Integration Instance-Level Configuration

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

---

## Best Practices

### Partition Key Strategy

- **`integration_providers`**: `/category` enables efficient queries by category
- **`integrations`**: `/tenantId` ensures tenant isolation and efficient tenant queries
- **`integration-connections`**: `/integrationId` enables efficient connection lookups

### Indexing Strategy

- Index frequently queried fields (status, audience, provider, name)
- Use composite indexes for common query patterns
- Exclude large fields (descriptions, OAuth configs) from indexing

### Query Optimization

- Use point reads when possible (by id and partition key)
- Use parameterized queries
- Implement pagination for large result sets
- Use continuation tokens for large queries

### Data Consistency

- Use strong consistency for critical operations (connection status, credentials)
- Use eventual consistency for read-heavy operations (listing integrations)

### TTL (Time To Live)

- Consider TTL for temporary data (OAuth states, test results)
- No TTL for persistent data (providers, integrations, connections)

---

## External References in Shards

Shards created from integration data must include an external reference section using the existing `external_relationships` field in the shard schema.

### External Relationships Structure

```typescript
interface ShardExternalRelationship {
  integrationId: string; // Reference to integrations.id
  integrationName?: string; // Denormalized for quick display
  providerName: string; // e.g., "salesforce"
  externalId: string; // ID in the external system
  externalEntity: string; // Entity type in external system (e.g., "Account")
  syncDirection: 'inbound' | 'outbound' | 'bidirectional';
  lastSyncedAt?: Date; // Last successful sync timestamp
  syncMetadata?: {
    syncTaskId?: string;
    syncExecutionId?: string;
    recordVersion?: string; // External system's record version/ETag
    conflictResolution?: 'newest_wins' | 'external_wins' | 'castiel_wins' | 'manual';
  };
}
```

### Shard Document Example

```typescript
{
  id: "shard-123",
  shardTypeId: "c_company",
  tenantId: "tenant-abc",
  structuredData: {
    name: "Acme Corporation",
    industry: "Technology",
    // ... other fields
  },
  external_relationships: [
    {
      integrationId: "integration-789",
      integrationName: "Salesforce - Sales Team",
      providerName: "salesforce",
      externalId: "001xx000003DGbQAAW",
      externalEntity: "Account",
      syncDirection: "bidirectional",
      lastSyncedAt: "2025-01-15T10:30:00Z",
      syncMetadata: {
        syncTaskId: "task-456",
        recordVersion: "2025-01-15T10:25:00Z",
        conflictResolution: "newest_wins"
      }
    }
  ]
}
```

### Multiple External References

A shard can have multiple external relationships (e.g., synced from multiple integrations):

```typescript
{
  external_relationships: [
    {
      integrationId: "integration-789",
      providerName: "salesforce",
      externalId: "001xx000003DGbQAAW",
      externalEntity: "Account",
      syncDirection: "bidirectional"
    },
    {
      integrationId: "integration-790",
      providerName: "dynamics",
      externalId: "abc123-def456",
      externalEntity: "account",
      syncDirection: "inbound"
    }
  ]
}
```

### Querying by External Reference

```sql
-- Find shard by external ID
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND ARRAY_CONTAINS(c.external_relationships, {
    integrationId: @integrationId,
    externalId: @externalId
  }, true)

-- Find all shards synced from an integration
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND ARRAY_CONTAINS(c.external_relationships, {
    integrationId: @integrationId
  }, true)
```

### Sync Metadata

The `syncMetadata` field stores additional information about the sync relationship:

- **syncTaskId**: Reference to the sync task that created/updated this relationship
- **syncExecutionId**: Reference to the specific sync execution
- **recordVersion**: External system's record version or ETag (for conflict detection)
- **conflictResolution**: Strategy used for resolving conflicts

---

## Migration from ShardTypes

The previous ShardType-based approach (`c_integrationProvider` and `c_integration`) is deprecated. All integrations now use containers.

**Key Changes:**
- Integrations are no longer stored as shards in the `c_shard` container
- Integration providers are stored in `integration_providers` container
- Tenant integrations are stored in `integrations` container
- Credentials are stored in Azure Key Vault (not in containers)

See the [Adapter Migration Guide](./adapters/MIGRATION-GUIDE.md) for details on updating adapters.

---

## Related Documentation

- [Integration README](./README.md) - Overview of the integration system
- [Providers Documentation](./PROVIDERS.md) - List of available integration providers
- [Configuration Guide](./CONFIGURATION.md) - How to configure integrations
- [Adapter Migration Guide](./adapters/MIGRATION-GUIDE.md) - Updating adapters for container architecture
- [Search Documentation](./SEARCH.md) - Global search across integrations
- [Notification Integration](./NOTIFICATION-INTEGRATION.md) - Integration with notification system







