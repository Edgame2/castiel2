# Integration Database Implementation

## Overview

This document describes the database implementation for the integration system, including containers to create/update/remove, Cosmos DB best practices, and initialization procedures.

---

## Table of Contents

1. [Containers to Create/Update/Remove](#containers-to-createupdateremove)
2. [Cosmos DB Best Practices](#cosmos-db-best-practices)
3. [Container Initialization](#container-initialization)
4. [Data Migration](#data-migration)
5. [Backup and Recovery](#backup-and-recovery)

---

## Containers to Create/Update/Remove

### Containers to CREATE (New)

#### `integration_providers`

**Purpose**: System-level integration catalog (all available integrations)

**Configuration**:
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

**Partition Key**: `/category` - Enables efficient queries by category

**Unique Keys**: `[['/category', '/provider']]` - Ensures unique provider per category

#### `integrations`

**Purpose**: Tenant-specific integration instances with configuration

**Configuration**:
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

**Partition Key**: `/tenantId` - Ensures tenant isolation and efficient tenant queries

**Unique Keys**: `[['/tenantId', '/providerName', '/name']]` - Allows multiple instances per provider per tenant

### Containers to UPDATE (Modify Existing)

#### `integration-connections`

**Purpose**: Update to support user-scoped connections

**Current Configuration**:
```typescript
{
  id: 'integration-connections',
  partitionKey: '/integrationId'
}
```

**Updated Configuration**:
```typescript
{
  id: 'integration-connections',
  partitionKey: '/integrationId', // Keep existing partition key
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/integrationId/*' },
      { path: '/scope/*' }, // NEW: Support user scope
      { path: '/tenantId/*' },
      { path: '/userId/*' }, // NEW: For user-scoped connections
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

**Changes**:
- Add support for `scope: 'user'` field
- Add support for `userId` field
- Update indexing to include `scope` and `userId`

### Containers to REMOVE (Deprecated)

The following containers can be removed (data can be lost, no migration needed):

- `integrations` (old) - If exists, can be removed
- `tenant-integrations` (old) - If exists, can be removed
- Any other old integration-related containers

**Note**: Before removing, verify no active integrations are using these containers.

---

## Cosmos DB Best Practices

### Partition Key Strategy

#### `integration_providers`: `/category`

**Rationale**:
- Enables efficient queries by category (e.g., "Show all CRM integrations")
- Categories are relatively stable (few categories, many providers per category)
- Good distribution across partitions

**Query Patterns**:
```sql
-- List all providers in a category
SELECT * FROM c WHERE c.category = @category

-- List active providers in a category
SELECT * FROM c 
WHERE c.category = @category 
  AND c.status = 'active'
```

#### `integrations`: `/tenantId`

**Rationale**:
- Ensures tenant isolation (all tenant's integrations in same partition)
- Enables efficient tenant queries (list all tenant integrations)
- Good distribution (many tenants, few integrations per tenant)

**Query Patterns**:
```sql
-- List all integrations for a tenant
SELECT * FROM c WHERE c.tenantId = @tenantId

-- Find integration by provider and name
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.providerName = @providerName 
  AND c.name = @name
```

#### `integration-connections`: `/integrationId`

**Rationale**:
- Enables efficient connection lookups by integration
- Connections are accessed per integration instance
- Good distribution (many integrations, few connections per integration)

**Query Patterns**:
```sql
-- Get connection for an integration
SELECT * FROM c 
WHERE c.integrationId = @integrationId 
  AND c.scope = @scope
  AND (@scope != 'user' OR c.userId = @userId)
```

### Indexing Strategy

#### Frequently Queried Fields

Index the following fields for efficient queries:

**`integration_providers`**:
- `status` - Filter by status
- `audience` - Filter by audience
- `provider` - Lookup by provider name
- `category` - Partition key, also indexed
- `supportsSearch` - Filter providers with search
- `supportsNotifications` - Filter providers for notifications
- `requiresUserScoping` - Filter providers requiring user scoping

**`integrations`**:
- `tenantId` - Partition key, also indexed
- `providerName` - Filter by provider
- `name` - Search/filter by name
- `status` - Filter by status
- `connectionStatus` - Filter by connection status
- `searchEnabled` - Filter integrations with search enabled
- `userScoped` - Filter user-scoped integrations

**`integration-connections`**:
- `integrationId` - Partition key, also indexed
- `scope` - Filter by scope (system/tenant/user)
- `tenantId` - Filter by tenant
- `userId` - Filter by user (for user-scoped)
- `status` - Filter by connection status

#### Composite Indexes

Consider composite indexes for common query patterns:

**`integration_providers`**:
```typescript
[
  // Query: List active tenant-visible providers by category
  [
    { path: '/category', order: 'ascending' },
    { path: '/status', order: 'ascending' },
    { path: '/audience', order: 'ascending' },
    { path: '/displayName', order: 'ascending' }
  ],
  // Query: List providers with search capability
  [
    { path: '/supportsSearch', order: 'ascending' },
    { path: '/status', order: 'ascending' },
    { path: '/displayName', order: 'ascending' }
  ]
]
```

**`integrations`**:
```typescript
[
  // Query: List connected integrations with search enabled
  [
    { path: '/tenantId', order: 'ascending' },
    { path: '/status', order: 'ascending' },
    { path: '/searchEnabled', order: 'ascending' },
    { path: '/name', order: 'ascending' }
  ],
  // Query: List integrations with connection errors
  [
    { path: '/tenantId', order: 'ascending' },
    { path: '/connectionStatus', order: 'ascending' },
    { path: '/updatedAt', order: 'descending' }
  ]
]
```

### Query Patterns

#### List Providers by Category

```sql
SELECT * FROM c 
WHERE c.category = @category 
  AND c.status = 'active'
  AND c.audience = 'tenant'
ORDER BY c.displayName
```

#### List Tenant Integrations

```sql
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
ORDER BY c.name
```

#### Find Integration by Provider and Name

```sql
SELECT * FROM c 
WHERE c.tenantId = @tenantId 
  AND c.providerName = @providerName 
  AND c.name = @name
```

#### List User-Scoped Connections

```sql
SELECT * FROM c 
WHERE c.integrationId = @integrationId 
  AND c.scope = 'user'
  AND c.tenantId = @tenantId
```

#### List Expired Connections

```sql
SELECT * FROM c 
WHERE c.status = 'expired'
  OR (c.oauth.expiresAt != null AND c.oauth.expiresAt < @now)
```

### Performance Optimization

#### Use Point Reads When Possible

For single document lookups, use point reads (by id and partition key):

```typescript
// Efficient: Point read
const provider = await container.item(providerId, category).read();

// Less efficient: Query
const { resources } = await container.items
  .query(`SELECT * FROM c WHERE c.id = '${providerId}' AND c.category = '${category}'`)
  .fetchAll();
```

#### Use Parameterized Queries

Always use parameterized queries to prevent SQL injection and enable query plan caching:

```typescript
// Good: Parameterized query
const querySpec = {
  query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
  parameters: [
    { name: '@tenantId', value: tenantId },
    { name: '@status', value: 'connected' }
  ]
};

// Bad: String interpolation
const query = `SELECT * FROM c WHERE c.tenantId = '${tenantId}'`;
```

#### Implement Pagination

For large result sets, implement pagination:

```typescript
const querySpec = {
  query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.name',
  parameters: [{ name: '@tenantId', value: tenantId }]
};

const { resources, continuationToken } = await container.items
  .query(querySpec)
  .fetchNext();

// Use continuationToken for next page
if (continuationToken) {
  const { resources: nextPage } = await container.items
    .query(querySpec)
    .fetchNext({ continuationToken });
}
```

#### Use Continuation Tokens for Large Queries

For queries that may return many results, use continuation tokens:

```typescript
let continuationToken: string | undefined;
let allResults: any[] = [];

do {
  const { resources, continuationToken: token } = await container.items
    .query(querySpec)
    .fetchNext({ continuationToken });
  
  allResults.push(...resources);
  continuationToken = token;
} while (continuationToken);
```

### Data Consistency

#### Strong Consistency

Use strong consistency for critical operations:

- Connection status updates
- Credential updates
- Integration activation/deactivation

```typescript
const requestOptions = {
  consistencyLevel: 'Strong'
};

await container.item(id, partitionKey).replace(document, requestOptions);
```

#### Eventual Consistency

Use eventual consistency for read-heavy operations:

- Listing integrations
- Browsing providers
- Search operations

```typescript
const requestOptions = {
  consistencyLevel: 'Eventual'
};

const { resources } = await container.items
  .query(querySpec, requestOptions)
  .fetchAll();
```

### TTL (Time To Live)

#### Temporary Data

Consider TTL for temporary data:

- OAuth states (stored in Redis, not Cosmos DB)
- Test results (can be cleaned up after 30 days)
- Sync execution logs (already have TTL in `sync-executions` container)

#### Persistent Data

No TTL for persistent data:

- Integration providers (system catalog)
- Integration instances (tenant configuration)
- Connections (credentials references)

---

## Container Initialization

### Update Initialization Script

Update `apps/api/src/scripts/init-cosmos-db.ts`:

```typescript
const CONTAINERS: ContainerConfig[] = [
  // ... existing containers ...
  
  // ==========================================================================
  // Integrations (NEW)
  // ==========================================================================
  {
    id: 'integration_providers',
    partitionKey: '/category',
    description: 'Integration provider definitions (system-level catalog)',
    uniqueKeys: [['/category', '/provider']],
  },
  {
    id: 'integrations',
    partitionKey: '/tenantId',
    description: 'Tenant integration instances with configuration',
    uniqueKeys: [['/tenantId', '/providerName', '/name']],
  },
  
  // ==========================================================================
  // Integration Connections (UPDATED)
  // ==========================================================================
  {
    id: 'integration-connections',
    partitionKey: '/integrationId',
    description: 'Integration connection credentials (system/tenant/user-scoped)',
    // Note: Updated to support user scope and userId field
  },
  
  // ... rest of containers ...
];
```

### Script Execution

**Run the initialization script**:

```bash
# Using npx
npx tsx apps/api/src/scripts/init-cosmos-db.ts

# Or with pnpm
pnpm --filter @castiel/api run init-db
```

### Script Behavior

The script should:

1. **Create new containers**: `integration_providers`, `integrations`
2. **Update existing containers**: `integration-connections` (add indexing for `scope` and `userId`)
3. **Handle existing containers gracefully**: Skip if container already exists (for updates)
4. **Remove deprecated containers**: Optionally remove old integration containers (with confirmation)

### Container Creation Example

```typescript
async function createContainer(
  database: Database,
  config: ContainerConfig
): Promise<void> {
  try {
    const containerDefinition: ContainerDefinition = {
      id: config.id,
      partitionKey: {
        paths: [config.partitionKey],
        kind: 'Hash'
      },
      uniqueKeyPolicy: config.uniqueKeys ? {
        uniqueKeys: config.uniqueKeys.map(keys => ({
          paths: keys
        }))
      } : undefined,
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: getIncludedPaths(config.id),
        excludedPaths: getExcludedPaths(config.id)
      }
    };
    
    const { container } = await database.containers.createIfNotExists(containerDefinition);
    console.log(`✅ Container "${config.id}" ready`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`⚠️  Container "${config.id}" already exists`);
    } else {
      throw error;
    }
  }
}
```

---

## Data Migration

### No Data Migration Required

**All current data can be lost**. The new container architecture is a fresh start:

- No migration scripts needed
- Old integration data can be discarded
- New integrations will be created in new containers

### Seed Data (Optional)

If needed, create seed data for initial integration providers:

```typescript
async function seedIntegrationProviders(): Promise<void> {
  const providers = [
    {
      id: 'salesforce-provider',
      category: 'crm',
      name: 'Salesforce',
      displayName: 'Salesforce CRM',
      provider: 'salesforce',
      status: 'active',
      audience: 'tenant',
      // ... other fields
    },
    // ... more providers
  ];
  
  for (const provider of providers) {
    await integrationProvidersContainer.items.create(provider);
  }
}
```

---

## Backup and Recovery

### Cosmos DB Automatic Backups

Cosmos DB provides automatic backups:

- **Backup Frequency**: Continuous (point-in-time restore)
- **Retention**: 7-30 days (configurable)
- **Backup Type**: Full database backup

### Point-in-Time Restore

Restore to a specific point in time:

```bash
# Via Azure Portal or Azure CLI
az cosmosdb sql container restore \
  --account-name <account-name> \
  --database-name <database-name> \
  --container-name integration_providers \
  --restore-timestamp <timestamp>
```

### Manual Backup (Optional)

For additional safety, export data periodically:

```typescript
async function exportIntegrationData(): Promise<void> {
  // Export integration_providers
  const providers = await integrationProvidersContainer.items.readAll().fetchAll();
  await fs.writeFile('backup-providers.json', JSON.stringify(providers, null, 2));
  
  // Export integrations (per tenant, if needed)
  // ...
}
```

### Retention Policies

**Audit Logs**: 7+ years (for compliance)

**Integration Data**:
- Providers: Permanent (system catalog)
- Integrations: Permanent (tenant configuration)
- Connections: Permanent (credential references)
- Sync Executions: 30 days TTL (in `sync-executions` container)

---

## Related Documentation

- [Container Architecture](./CONTAINER-ARCHITECTURE.md) - Complete container architecture
- [Configuration](./CONFIGURATION.md) - Integration configuration
- [API Implementation](./API-IMPLEMENTATION.md) - API endpoints

---

**Last Updated**: January 2025  
**Version**: 1.0.0







