# Integration Global Search

## Overview

The integration system provides a global search capability that allows users to search across multiple integrations and data types in a single unified interface. Search results are aggregated from all enabled integrations and presented in a consistent format.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Search Service](#search-service)
3. [Adapter Search Interface](#adapter-search-interface)
4. [Search Capabilities](#search-capabilities)
5. [Tenant-Level Configuration](#tenant-level-configuration)
6. [User-Level Scoping](#user-level-scoping)
7. [Result Aggregation](#result-aggregation)
8. [Performance Optimizations](#performance-optimizations)
9. [API Endpoints](#api-endpoints)

---

## Architecture

### Search Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION SEARCH SERVICE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              IntegrationSearchService                                │   │
│  │                                                                      │   │
│  │  1. Get enabled integrations for tenant                             │   │
│  │  2. Filter by search configuration (searchEnabled)                  │   │
│  │  3. Query all adapters in parallel                                   │   │
│  │  4. Aggregate and rank results                                       │   │
│  │  5. Return unified results                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                                │
│          ┌───────────────────┼───────────────────┐                          │
│          │                   │                   │                          │
│          ▼                   ▼                   ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │  Salesforce  │    │    Slack     │    │    Gmail     │                 │
│  │   Adapter    │    │   Adapter    │    │   Adapter    │                 │
│  │              │    │              │    │              │                 │
│  │  search()    │    │  search()    │    │  search()    │                 │
│  └──────────────┘    └──────────────┘    └──────────────┘                 │
│          │                   │                   │                          │
│          └───────────────────┼───────────────────┘                          │
│                              │                                                │
│                              ▼                                                │
│                    ┌──────────────────┐                                     │
│                    │  Aggregated       │                                     │
│                    │  Results          │                                     │
│                    └──────────────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Future Integration

The `IntegrationSearchService` can be integrated with existing search services later:

- Create `UnifiedSearchService` that aggregates:
  - Shard search (AdvancedSearchService)
  - Web search (WebSearchService)
  - Integration search (IntegrationSearchService)
- Or extend `/api/search` endpoint to include integration results
- Or create `/api/search/unified` endpoint

---

## Search Service

### IntegrationSearchService

**Location**: `apps/api/src/services/integration-search.service.ts`

**Pattern**: Follows same pattern as `AdvancedSearchService` and `WebSearchService`

```typescript
class IntegrationSearchService {
  constructor(
    private integrationRepository: IntegrationRepository,
    private adapterManager: AdapterManager,
    private monitoring: IMonitoringProvider
  ) {}
  
  async search(
    tenantId: string,
    userId: string,
    query: string,
    options: IntegrationSearchOptions
  ): Promise<IntegrationSearchResult> {
    // 1. Get enabled integrations with search enabled
    const integrations = await this.getSearchableIntegrations(tenantId);
    
    // 2. Apply tenant-level search configuration
    const filteredIntegrations = this.applySearchConfiguration(integrations, options);
    
    // 3. Query all adapters in parallel
    const searchPromises = filteredIntegrations.map(integration =>
      this.searchIntegration(integration, query, userId, options)
    );
    
    const results = await Promise.allSettled(searchPromises);
    
    // 4. Aggregate and rank results
    const aggregated = this.aggregateResults(results, query);
    
    // 5. Return unified results
    return aggregated;
  }
  
  private async getSearchableIntegrations(tenantId: string): Promise<IntegrationDocument[]> {
    return await this.integrationRepository.findByTenant(tenantId, {
      status: 'connected',
      searchEnabled: true
    });
  }
  
  private async searchIntegration(
    integration: IntegrationDocument,
    query: string,
    userId: string,
    options: IntegrationSearchOptions
  ): Promise<SearchResult> {
    const adapter = await this.adapterManager.getAdapter(
      integration.providerName,
      integration,
      integration.tenantId,
      integration.userScoped ? userId : undefined
    );
    
    return await adapter.search({
      query,
      entities: options.entities || integration.searchableEntities,
      filters: {
        ...options.filters,
        ...integration.searchFilters
      },
      limit: options.limit || 10,
      userId: integration.userScoped ? userId : undefined,
      tenantId: integration.tenantId
    });
  }
}
```

---

## Adapter Search Interface

### Search Method

All adapters must implement the `search()` method:

```typescript
interface IntegrationAdapter {
  // ... other methods ...
  
  search(options: SearchOptions): Promise<SearchResult>;
}
```

### SearchOptions Interface

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
  userId?: string; // User ID for user-scoped integrations
  tenantId: string; // Tenant ID
}
```

### SearchResult Interface

```typescript
interface SearchResult {
  results: SearchResultItem[];
  total: number;
  took: number; // Milliseconds
  hasMore: boolean;
}

interface SearchResultItem {
  id: string;
  entity: string; // Entity type (e.g., "Account", "Contact", "Message")
  title: string;
  description?: string;
  url?: string; // Link to item in external system
  score: number; // Relevance score (0-1)
  metadata?: Record<string, any>; // Additional metadata
  highlights?: string[]; // Highlighted matching text
  integrationId: string; // Which integration this result came from
  integrationName: string; // Integration instance name
  providerName: string; // Provider name
}
```

### Adapter Implementation Example

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
      return this.transformSearchResults(results, entity, integration);
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
}
```

---

## Search Capabilities

### Provider-Level Capabilities

In `integration_providers` container:

```typescript
{
  supportsSearch: true,
  searchableEntities: ["Account", "Contact", "Opportunity"],
  searchCapabilities: {
    fullText: true, // Supports full-text search
    fieldSpecific: true, // Supports field-specific search
    filtered: boolean // Supports filtered search
  }
}
```

### Full-Text Search

Search across all text fields in an entity:

```typescript
// Example: Search "Acme" in Salesforce
// Searches: Account.Name, Account.Description, Contact.Name, etc.
const results = await adapter.search({
  query: "Acme",
  tenantId: "tenant-123"
});
```

### Field-Specific Search

Search specific fields:

```typescript
// Example: Search by account name only
const results = await adapter.search({
  query: "Acme",
  filters: {
    fieldFilters: {
      name: "Acme"
    }
  },
  tenantId: "tenant-123"
});
```

### Filtered Search

Apply filters to search results:

```typescript
// Example: Search accounts created in last 30 days
const results = await adapter.search({
  query: "Acme",
  filters: {
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    customFilters: {
      status: "active"
    }
  },
  tenantId: "tenant-123"
});
```

---

## Tenant-Level Configuration

Tenant admins can configure search per integration instance:

### Enable/Disable Search

```typescript
{
  searchEnabled: true, // Enable/disable search for this instance
}
```

### Configure Searchable Entities

```typescript
{
  searchableEntities: ["Account", "Contact"], // Subset of provider's entities
  // Only search these entities, even if provider supports more
}
```

### Configure Search Filters

```typescript
{
  searchFilters: {
    dateRange: {
      start: "2024-01-01",
      end: "2024-12-31"
    },
    entityTypes: ["Account"],
    customFilters: {
      status: "active"
    }
  }
}
```

### Configuration Impact

- **Search Enabled**: Only integrations with `searchEnabled: true` are searched
- **Searchable Entities**: Only configured entities are searched (or all if not specified)
- **Search Filters**: Filters are applied to all search queries for this integration

---

## User-Level Scoping

### Provider-Level Configuration

Some providers always require user scoping:

```typescript
{
  provider: "gmail",
  requiresUserScoping: true, // Always requires user scoping
}
```

### Integration Instance-Level Configuration

Tenant admins can enable user scoping per integration:

```typescript
{
  userScoped: true, // Enable user-level scoping for this instance
}
```

### User Context Passing

User ID is passed to adapters in search requests:

```typescript
await adapter.search({
  query: "company x",
  userId: "user-456", // Passed for user-scoped integrations
  tenantId: "tenant-123"
});
```

### Adapter Implementation

Adapters filter results based on user permissions:

```typescript
// Gmail: User can only search their own emails
if (integration.userScoped && userId) {
  // Filter by user's email account
  const userEmails = await this.getUserEmails(userId);
  query += ` AND from:${userEmails.join(' OR ')}`;
}

// Slack: User can search messages/channels they have access to
if (integration.userScoped && userId) {
  // Filter by user's accessible channels
  const accessibleChannels = await this.getUserChannels(userId);
  query += ` AND channel:${accessibleChannels.join(' OR ')}`;
}

// Salesforce: User can only search opportunities they have access to
if (integration.userScoped && userId) {
  query += ` AND (OwnerId = '${userId}' OR Id IN (SELECT OpportunityId FROM OpportunityShare WHERE UserOrGroupId = '${userId}'))`;
}
```

### Examples

**Gmail Integration**:
- User searches "meeting notes"
- Results: Only emails from user's own Gmail account
- User cannot see other users' emails

**Slack Integration**:
- User searches "project update"
- Results: Only messages from channels the user has access to
- User cannot see messages from private channels they're not in

**Salesforce Integration**:
- User searches "Acme Corporation"
- Results: Only accounts/opportunities the user owns or has access to
- User cannot see accounts they don't have permission to view

**GDrive Integration**:
- User searches "budget spreadsheet"
- Results: Only documents the user has access to
- User cannot see documents they don't have permission to view

---

## Result Aggregation

### Aggregation Process

1. **Collect Results**: Query all enabled integrations in parallel
2. **Group by Integration**: Group results by integration instance
3. **Group by Entity**: Group results by entity type
4. **Rank Results**: Rank by relevance score
5. **Limit Results**: Apply pagination and limits

### Result Format

```typescript
interface IntegrationSearchResult {
  results: SearchResultItem[]; // Flattened, ranked results
  total: number; // Total results across all integrations
  took: number; // Total time in milliseconds
  hasMore: boolean; // More results available
  
  // Grouped results
  byIntegration: Record<string, SearchResultItem[]>; // Grouped by integration
  byEntity: Record<string, SearchResultItem[]>; // Grouped by entity type
  
  // Metadata
  integrationsSearched: string[]; // Integration IDs that were searched
  integrationsFailed: string[]; // Integration IDs that failed
}
```

### Ranking Algorithm

Results are ranked by:

1. **Relevance Score**: Score from adapter (0-1)
2. **Integration Priority**: Priority of integration (if configured)
3. **Entity Priority**: Priority of entity type (if configured)
4. **Recency**: More recent results ranked higher (if available)

### Example Result

```typescript
{
  results: [
    {
      id: "acc-123",
      entity: "Account",
      title: "Acme Corporation",
      description: "Technology company",
      score: 0.95,
      integrationId: "integration-789",
      integrationName: "Salesforce - Sales Team",
      providerName: "salesforce",
      url: "https://salesforce.com/001xx000003DGbQAAW"
    },
    {
      id: "msg-456",
      entity: "Message",
      title: "Meeting with Acme Corporation",
      description: "Discussion about project",
      score: 0.87,
      integrationId: "integration-790",
      integrationName: "Slack - Engineering",
      providerName: "slack",
      url: "https://slack.com/messages/msg-456"
    }
  ],
  total: 25,
  took: 450,
  hasMore: true,
  byIntegration: {
    "integration-789": [/* Salesforce results */],
    "integration-790": [/* Slack results */]
  },
  byEntity: {
    "Account": [/* Account results */],
    "Message": [/* Message results */]
  }
}
```

---

## Performance Optimizations

### Caching

Cache search results for frequently searched queries:

```typescript
// Cache key: tenantId:userId:query:hash(filters)
const cacheKey = `search:${tenantId}:${userId}:${queryHash}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// Perform search
const results = await this.search(tenantId, userId, query, options);

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(results));
```

### Parallel Queries

Query all adapters in parallel:

```typescript
const searchPromises = integrations.map(integration =>
  this.searchIntegration(integration, query, userId, options)
);

const results = await Promise.allSettled(searchPromises);
```

### Result Limits

Limit results per integration to prevent timeout:

```typescript
const limitPerIntegration = Math.ceil(options.limit / integrations.length);
// Each integration returns max limitPerIntegration results
```

### Timeout Handling

Set timeout for each integration search:

```typescript
const searchWithTimeout = Promise.race([
  adapter.search(options),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Search timeout')), 5000)
  )
]);
```

### Indexing (Optional)

For frequently searched integrations, consider indexing data in Castiel:

```typescript
// Index integration data in Castiel for faster search
// This is optional and depends on use case
```

---

## API Endpoints

### Global Search

**Endpoint**: `POST /api/integrations/search`

**Authentication**: User or Tenant Admin

**Request Body**:
```typescript
{
  query: string;
  integrations?: string[]; // Optional: filter by integration IDs
  entities?: string[]; // Optional: filter by entity types
  filters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  limit?: number; // Max results per integration (default: 10)
  offset?: number; // Pagination offset
}
```

**Response**: `200 OK`
```typescript
{
  results: SearchResultItem[];
  total: number;
  took: number;
  hasMore: boolean;
  byIntegration: Record<string, SearchResultItem[]>;
  byEntity: Record<string, SearchResultItem[]>;
}
```

### Search Specific Integration

**Endpoint**: `GET /api/integrations/:id/search`

**Authentication**: User or Tenant Admin

**Query Parameters**:
- `query: string` - Search query
- `entities?: string[]` - Filter by entity types
- `limit?: number` - Max results (default: 10)
- `offset?: number` - Pagination offset

**Response**: `200 OK`
```typescript
{
  results: SearchResultItem[];
  total: number;
  took: number;
  hasMore: boolean;
}
```

---

## Search Permissions

### Tenant Isolation

- Users can only search integrations enabled for their tenant
- Search results are filtered by tenant
- User-scoped integrations filter by user permissions

### Data Access Control

- Search respects `allowedShardTypes` configuration
- Only searches entities allowed by integration configuration
- Respects integration instance search configuration

---

## Related Documentation

- [Container Architecture](./CONTAINER-ARCHITECTURE.md) - Integration container structure
- [Configuration](./CONFIGURATION.md) - Search configuration
- [Adapter Migration Guide](./adapters/MIGRATION-GUIDE.md) - Implementing search in adapters

---

**Last Updated**: January 2025  
**Version**: 1.0.0







