# Adapter Migration Guide

## Overview

This guide documents the changes required for adapters to work with the new container-based integration architecture. Adapters must be updated to work with the new `integration_providers` and `integrations` containers instead of the deprecated ShardType-based approach.

---

## Table of Contents

1. [Architecture Changes](#architecture-changes)
2. [New Adapter Interface Requirements](#new-adapter-interface-requirements)
3. [Search Capability Implementation](#search-capability-implementation)
4. [User-Level Scoping Implementation](#user-level-scoping-implementation)
5. [User Credentials Handling](#user-credentials-handling)
6. [Migration Steps](#migration-steps)
7. [Code Examples](#code-examples)

---

## Architecture Changes

### Before (ShardType-based)

- Integration providers stored as `c_integrationProvider` shards
- Tenant integrations stored as `c_integration` shards
- Credentials stored in Key Vault, referenced by `credentialSecretName` in shard

### After (Container-based)

- Integration providers stored in `integration_providers` container (partition key: `/category`)
- Tenant integrations stored in `integrations` container (partition key: `/tenantId`)
- Credentials stored in Key Vault, referenced by `credentialSecretName` in container document
- User-scoped connections supported via `integration-connections` container with `scope: 'user'`

---

## New Adapter Interface Requirements

### Updated Base Adapter Interface

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
    id: string,
    data: Record<string, any>
  ): Promise<UpdateResult>;
  deleteRecord(
    entity: string,
    id: string
  ): Promise<DeleteResult>;
  
  // === SEARCH (NEW) ===
  search(
    options: SearchOptions
  ): Promise<SearchResult>;
  
  // === WEBHOOKS ===
  registerWebhook(
    events: string[],
    callbackUrl: string
  ): Promise<WebhookRegistration>;
  validateWebhookSignature(
    payload: any,
    signature: string
  ): boolean;
}
```

### New Search Interface

```typescript
interface SearchOptions {
  query: string; // Search query string
  entities?: string[]; // Which entities to search (if not provided, search all)
  filters?: {
    dateRange?: { start?: Date; end?: Date };
    fieldFilters?: Record<string, any>;
    customFilters?: Record<string, any>;
  };
  limit?: number; // Max results per entity
  offset?: number; // Pagination offset
  userId?: string; // User ID for user-scoped integrations (NEW)
  tenantId: string; // Tenant ID
}

interface SearchResult {
  results: SearchResultItem[];
  total: number;
  took: number; // Milliseconds
  hasMore: boolean;
}

interface SearchResultItem {
  id: string;
  entity: string;
  title: string;
  description?: string;
  url?: string;
  score: number; // Relevance score (0-1)
  metadata?: Record<string, any>;
  highlights?: string[]; // Highlighted matching text
}
```

---

## Search Capability Implementation

### Provider-Level Configuration

In `integration_providers` container:

```typescript
{
  supportsSearch: true,
  searchableEntities: ["Account", "Contact", "Opportunity"],
  searchCapabilities: {
    fullText: true, // Supports full-text search
    fieldSpecific: true, // Supports field-specific search
    filtered: true // Supports filtered search
  }
}
```

### Integration Instance-Level Configuration

In `integrations` container:

```typescript
{
  searchEnabled: true,
  searchableEntities: ["Account", "Contact"], // Subset of provider's entities
  searchFilters: {
    dateRange: { start: "2024-01-01", end: "2024-12-31" },
    entityTypes: ["Account"],
    customFilters: { status: "active" }
  }
}
```

### Adapter Implementation

```typescript
class SalesforceAdapter extends BaseIntegrationAdapter {
  async search(options: SearchOptions): Promise<SearchResult> {
    const { query, entities, filters, limit = 10, userId, tenantId } = options;
    
    // Get integration instance configuration
    const integration = await this.getIntegrationInstance(tenantId);
    
    // Check if search is enabled
    if (!integration.searchEnabled) {
      throw new Error('Search is not enabled for this integration');
    }
    
    // Use configured searchable entities or provider's default
    const searchableEntities = integration.searchableEntities || 
                               this.provider.searchableEntities;
    
    // Filter by configured entities if specified
    const entitiesToSearch = entities || searchableEntities;
    
    // Apply user scoping if required
    let userFilter = '';
    if (integration.userScoped && userId) {
      userFilter = ` AND OwnerId = '${userId}'`;
    }
    
    // Build SOQL queries for each entity
    const searchPromises = entitiesToSearch.map(async (entity) => {
      const soql = this.buildSearchQuery(entity, query, filters, userFilter);
      const results = await this.salesforceApi.query(soql);
      return this.transformSearchResults(results, entity);
    });
    
    // Execute searches in parallel
    const allResults = await Promise.all(searchPromises);
    
    // Flatten and rank results
    const flattened = allResults.flat();
    const ranked = this.rankResults(flattened, query);
    
    return {
      results: ranked.slice(0, limit),
      total: ranked.length,
      took: Date.now() - startTime,
      hasMore: ranked.length > limit
    };
  }
  
  private buildSearchQuery(
    entity: string,
    query: string,
    filters: SearchOptions['filters'],
    userFilter: string
  ): string {
    // Build SOQL query with search, filters, and user scoping
    let soql = `SELECT Id, Name FROM ${entity} WHERE `;
    
    // Full-text search
    soql += `(Name LIKE '%${query}%' OR Description LIKE '%${query}%')`;
    
    // Apply filters
    if (filters?.dateRange) {
      soql += ` AND LastModifiedDate >= ${filters.dateRange.start}`;
      soql += ` AND LastModifiedDate <= ${filters.dateRange.end}`;
    }
    
    // Apply user scoping
    soql += userFilter;
    
    soql += ` LIMIT 100`;
    return soql;
  }
}
```

---

## User-Level Scoping Implementation

### Provider-Level Configuration

Some providers always require user scoping:

```typescript
// In integration_providers container
{
  provider: "gmail",
  requiresUserScoping: true, // Always requires user scoping
}
```

### Integration Instance-Level Configuration

Tenant admins can enable user scoping per integration instance:

```typescript
// In integrations container
{
  providerName: "salesforce",
  userScoped: true, // Enable user-level scoping for this instance
  syncConfig: {
    syncUserScoped: true, // Sync only user-accessible data
  }
}
```

### Adapter Implementation

#### Receiving User Context

```typescript
class SalesforceAdapter extends BaseIntegrationAdapter {
  async fetchRecords(
    entity: string,
    options: FetchOptions & { userId?: string } // User ID passed in options
  ): Promise<FetchResult> {
    const { userId, tenantId } = options;
    
    // Get integration instance
    const integration = await this.getIntegrationInstance(tenantId);
    
    // Check if user scoping is required
    if (integration.userScoped && userId) {
      // Filter by user permissions
      const soql = this.buildUserScopedQuery(entity, userId, options);
      return await this.salesforceApi.query(soql);
    }
    
    // Tenant-wide access
    return await this.salesforceApi.query(this.buildQuery(entity, options));
  }
  
  private buildUserScopedQuery(
    entity: string,
    userId: string,
    options: FetchOptions
  ): string {
    // Build query with user-specific filters
    // Example: Only opportunities owned by or shared with user
    let soql = `SELECT * FROM ${entity} WHERE `;
    
    if (entity === 'Opportunity') {
      soql += `(OwnerId = '${userId}' OR Id IN (SELECT OpportunityId FROM OpportunityShare WHERE UserOrGroupId = '${userId}'))`;
    } else {
      soql += `OwnerId = '${userId}'`;
    }
    
    // Add other filters from options
    if (options.filters) {
      soql += this.applyFilters(options.filters);
    }
    
    return soql;
  }
}
```

#### Search with User Scoping

```typescript
async search(options: SearchOptions): Promise<SearchResult> {
  const { query, userId, tenantId } = options;
  
  const integration = await this.getIntegrationInstance(tenantId);
  
  // Apply user scoping if enabled
  if (integration.userScoped && userId) {
    // Filter search results by user permissions
    return await this.searchUserScoped(query, userId, options);
  }
  
  // Tenant-wide search
  return await this.searchTenantWide(query, options);
}
```

---

## User Credentials Handling

### Checking Connection Scope

```typescript
class BaseIntegrationAdapter {
  protected async getConnection(tenantId: string, userId?: string): Promise<IntegrationConnection> {
    // Get integration instance
    const integration = await this.integrationRepository.findById(tenantId, integrationId);
    
    // Determine connection scope
    let scope: 'system' | 'tenant' | 'user' = 'tenant';
    if (integration.userScoped && userId) {
      scope = 'user';
    }
    
    // Get connection from integration-connections container
    const connection = await this.connectionRepository.findByIntegrationId(
      integration.id,
      scope,
      userId
    );
    
    return connection;
  }
  
  protected async getCredentials(
    tenantId: string,
    userId?: string
  ): Promise<Credentials> {
    const connection = await this.getConnection(tenantId, userId);
    
    // Retrieve credentials from Key Vault
    const secretName = connection.scope === 'user'
      ? `tenant-${tenantId}-user-${userId}-${this.providerName}-${integrationId}-oauth`
      : `tenant-${tenantId}-${this.providerName}-${integrationId}-oauth`;
    
    const secret = await this.keyVaultClient.getSecret(secretName);
    return JSON.parse(secret.value);
  }
}
```

### Key Vault Secret Naming Pattern

```typescript
// Tenant-scoped connection
const tenantSecretName = `tenant-${tenantId}-${providerName}-${instanceId}-oauth`;

// User-scoped connection
const userSecretName = `tenant-${tenantId}-user-${userId}-${providerName}-${instanceId}-oauth`;

// System-scoped connection
const systemSecretName = `system-${providerName}-oauth`;
```

---

## Migration Steps

### Step 1: Update Adapter Constructor

**Before:**
```typescript
constructor(
  private integrationDefinition: IntegrationDefinition,
  private tenantIntegration: TenantIntegration,
  private connectionService: ConnectionService
) {
  this.providerId = integrationDefinition.provider;
}
```

**After:**
```typescript
constructor(
  private providerDocument: IntegrationProviderDocument,
  private integrationDocument: IntegrationDocument,
  private connectionService: ConnectionService,
  private tenantId: string,
  private userId?: string // Optional, for user-scoped integrations
) {
  this.providerId = providerDocument.provider;
  this.tenantId = tenantId;
}
```

### Step 2: Update Data Access Methods

**Before:**
```typescript
async fetchRecords(entity: string, options: FetchOptions): Promise<FetchResult> {
  // Access tenantIntegration.syncConfig directly
  const syncConfig = this.tenantIntegration.syncConfig;
  // ...
}
```

**After:**
```typescript
async fetchRecords(
  entity: string,
  options: FetchOptions & { userId?: string }
): Promise<FetchResult> {
  // Access integrationDocument.syncConfig
  const syncConfig = this.integrationDocument.syncConfig;
  
  // Check data access control
  if (this.integrationDocument.allowedShardTypes.length > 0) {
    const shardType = this.getShardTypeForEntity(entity);
    if (!this.integrationDocument.allowedShardTypes.includes(shardType)) {
      throw new Error(`Entity ${entity} is not allowed for this integration`);
    }
  }
  
  // Apply user scoping if enabled
  if (this.integrationDocument.userScoped && options.userId) {
    return await this.fetchUserScopedRecords(entity, options);
  }
  
  // ...
}
```

### Step 3: Implement Search Method

```typescript
async search(options: SearchOptions): Promise<SearchResult> {
  // Check if search is enabled
  if (!this.integrationDocument.searchEnabled) {
    throw new Error('Search is not enabled for this integration');
  }
  
  // Use configured searchable entities
  const entities = options.entities || 
                   this.integrationDocument.searchableEntities ||
                   this.providerDocument.searchableEntities;
  
  // Apply user scoping if enabled
  if (this.integrationDocument.userScoped && options.userId) {
    return await this.searchUserScoped(options);
  }
  
  // Tenant-wide search
  return await this.searchTenantWide(options);
}
```

### Step 4: Update Credential Retrieval

**Before:**
```typescript
private async getCredentials(): Promise<Credentials> {
  const secretName = this.tenantIntegration.credentialSecretName;
  return await this.connectionService.getCredentials(secretName);
}
```

**After:**
```typescript
private async getCredentials(): Promise<Credentials> {
  // Determine secret name based on scope
  const connection = await this.getConnection();
  const secretName = connection.scope === 'user'
    ? `tenant-${this.tenantId}-user-${this.userId}-${this.providerId}-${this.integrationDocument.id}-oauth`
    : this.integrationDocument.credentialSecretName;
  
  return await this.connectionService.getCredentials(secretName);
}
```

### Step 5: Update Test Connection

```typescript
async testConnection(): Promise<ConnectionTestResult> {
  try {
    const credentials = await this.getCredentials();
    await this.connect(credentials);
    
    // Test with a simple query
    const testResult = await this.fetchRecords('User', { limit: 1 });
    
    return {
      success: true,
      message: 'Connection successful',
      testedAt: new Date()
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      testedAt: new Date()
    };
  }
}
```

---

## Code Examples

### Complete Adapter Example

```typescript
import { BaseIntegrationAdapter } from './base-adapter';
import type {
  IntegrationProviderDocument,
  IntegrationDocument,
  FetchOptions,
  FetchResult,
  SearchOptions,
  SearchResult,
  ConnectionTestResult
} from '../types';

export class SalesforceAdapter extends BaseIntegrationAdapter {
  constructor(
    provider: IntegrationProviderDocument,
    integration: IntegrationDocument,
    connectionService: ConnectionService,
    tenantId: string,
    userId?: string
  ) {
    super(provider, integration, connectionService, tenantId, userId);
  }
  
  async connect(credentials: Credentials): Promise<void> {
    // OAuth connection logic
    this.salesforceClient = new SalesforceClient({
      instanceUrl: credentials.instanceUrl,
      accessToken: credentials.accessToken
    });
  }
  
  async fetchRecords(
    entity: string,
    options: FetchOptions & { userId?: string }
  ): Promise<FetchResult> {
    // Check data access control
    this.validateEntityAccess(entity);
    
    // Apply user scoping if enabled
    if (this.integration.userScoped && options.userId) {
      return await this.fetchUserScopedRecords(entity, options);
    }
    
    // Build SOQL query
    const soql = this.buildQuery(entity, options);
    const results = await this.salesforceClient.query(soql);
    
    return {
      records: results.records,
      total: results.totalSize,
      hasMore: results.done === false
    };
  }
  
  async search(options: SearchOptions): Promise<SearchResult> {
    if (!this.integration.searchEnabled) {
      throw new Error('Search is not enabled');
    }
    
    const entities = options.entities || 
                     this.integration.searchableEntities ||
                     this.provider.searchableEntities;
    
    const searchPromises = entities.map(entity => 
      this.searchEntity(entity, options)
    );
    
    const results = await Promise.all(searchPromises);
    const flattened = results.flat();
    
    return {
      results: this.rankResults(flattened, options.query),
      total: flattened.length,
      took: Date.now() - startTime,
      hasMore: false
    };
  }
  
  private validateEntityAccess(entity: string): void {
    if (this.integration.allowedShardTypes.length === 0) {
      return; // All entities allowed
    }
    
    const shardType = this.getShardTypeForEntity(entity);
    if (!this.integration.allowedShardTypes.includes(shardType)) {
      throw new Error(`Entity ${entity} is not allowed`);
    }
  }
  
  private async fetchUserScopedRecords(
    entity: string,
    options: FetchOptions & { userId: string }
  ): Promise<FetchResult> {
    // Build query with user-specific filters
    const soql = this.buildUserScopedQuery(entity, options.userId, options);
    return await this.salesforceClient.query(soql);
  }
  
  private async searchEntity(
    entity: string,
    options: SearchOptions
  ): Promise<SearchResultItem[]> {
    let soql = `SELECT Id, Name FROM ${entity} WHERE `;
    soql += `(Name LIKE '%${options.query}%' OR Description LIKE '%${options.query}%')`;
    
    // Apply user scoping if enabled
    if (this.integration.userScoped && options.userId) {
      soql += ` AND OwnerId = '${options.userId}'`;
    }
    
    // Apply filters
    if (options.filters) {
      soql += this.applyFilters(options.filters);
    }
    
    soql += ` LIMIT ${options.limit || 10}`;
    
    const results = await this.salesforceClient.query(soql);
    return this.transformSearchResults(results.records, entity);
  }
}
```

---

## Testing

### Unit Tests

```typescript
describe('SalesforceAdapter', () => {
  let adapter: SalesforceAdapter;
  let provider: IntegrationProviderDocument;
  let integration: IntegrationDocument;
  
  beforeEach(() => {
    provider = {
      id: 'salesforce-provider',
      category: 'crm',
      provider: 'salesforce',
      supportsSearch: true,
      searchableEntities: ['Account', 'Contact'],
      requiresUserScoping: false
    };
    
    integration = {
      id: 'integration-1',
      tenantId: 'tenant-123',
      providerName: 'salesforce',
      name: 'Salesforce - Sales',
      searchEnabled: true,
      userScoped: false,
      allowedShardTypes: ['c_company', 'c_contact']
    };
    
    adapter = new SalesforceAdapter(provider, integration, connectionService, 'tenant-123');
  });
  
  it('should search accounts', async () => {
    const result = await adapter.search({
      query: 'Acme',
      tenantId: 'tenant-123'
    });
    
    expect(result.results).toHaveLength(5);
    expect(result.results[0].entity).toBe('Account');
  });
  
  it('should respect user scoping', async () => {
    integration.userScoped = true;
    adapter = new SalesforceAdapter(provider, integration, connectionService, 'tenant-123', 'user-456');
    
    const result = await adapter.search({
      query: 'Acme',
      tenantId: 'tenant-123',
      userId: 'user-456'
    });
    
    // Results should be filtered by user
    expect(result.results.every(r => r.metadata.ownerId === 'user-456')).toBe(true);
  });
  
  it('should respect data access control', async () => {
    integration.allowedShardTypes = ['c_company'];
    
    await expect(
      adapter.fetchRecords('Contact', { tenantId: 'tenant-123' })
    ).rejects.toThrow('Entity Contact is not allowed');
  });
});
```

---

## Checklist

- [ ] Update adapter constructor to accept container documents
- [ ] Implement `search()` method
- [ ] Add user scoping support to `fetchRecords()` and `search()`
- [ ] Update credential retrieval to handle user-scoped connections
- [ ] Add data access control validation (`allowedShardTypes`)
- [ ] Update `testConnection()` to work with new architecture
- [ ] Add unit tests for search functionality
- [ ] Add unit tests for user scoping
- [ ] Add unit tests for data access control
- [ ] Update integration tests
- [ ] Update documentation

---

## Related Documentation

- [Container Architecture](../CONTAINER-ARCHITECTURE.md) - Complete container architecture
- [Search Documentation](../SEARCH.md) - Global search implementation
- [Adapter Development Guide](./README.md) - General adapter development

---

**Last Updated**: January 2025  
**Version**: 2.0.0







