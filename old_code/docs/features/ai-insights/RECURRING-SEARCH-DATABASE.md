# AI Insights: Recurring Search - Database Schema

## Overview

The Recurring Search system uses Azure Cosmos DB with strategically designed containers and Hierarchical Partition Keys (HPK) to ensure optimal performance, scalability, and cost-efficiency. This document details the complete database schema, partitioning strategies, indexes, and migration scripts.

## Table of Contents

1. [Container Overview](#container-overview)
2. [Hierarchical Partition Key (HPK) Strategy](#hierarchical-partition-key-hpk-strategy)
3. [recurringSearches Container](#recurringsearches-container)
4. [searchExecutions Container](#searchexecutions-container)
5. [notifications Container](#notifications-container)
6. [suppressionRules Container](#suppressionrules-container)
7. [searchStatistics Container](#searchstatistics-container)
8. [c_search Container (Reused)](#c_search-container-reused)
9. [c_webpages Container (Deep Search)](#c_webpages-container-deep-search)
10. [Index Strategies](#index-strategies)
11. [TTL Configuration](#ttl-configuration)
12. [Migration Scripts](#migration-scripts)
13. [Query Patterns](#query-patterns)
14. [Performance Optimization](#performance-optimization)

## Container Overview

| Container Name | Purpose | HPK Path | Estimated Size |
|----------------|---------|----------|----------------|
| `recurringSearches` | Store search configurations | `/tenantId/userId/id` | Medium |
| `searchExecutions` | Store execution records | `/tenantId/searchId/id` | Large |
| `notifications` | Store all app notifications | `/tenantId/userId/notificationId` | Large |
| `suppressionRules` | Store alert suppression rules | `/tenantId/searchId/id` | Small |
| `searchStatistics` | Store aggregated stats | `/tenantId/period/id` | Medium |
| `c_search` | Store search results (reused) | `/tenantId/queryHash/id` | Large |
| `c_webpages` | Store scraped web pages (deep search) | `/tenantId/projectId/sourceQuery` | Large |

**Total Containers**: 7 (6 new + 1 deep search)

## Hierarchical Partition Key (HPK) Strategy

### Why HPK for Recurring Search?

1. **Tenant Isolation**: First partition level ensures tenant data isolation
2. **Query Efficiency**: Most queries filter by tenant → user → search
3. **Scale Beyond 20GB**: HPK allows logical partitions > 20GB
4. **Cost Optimization**: Targeted queries reduce RU consumption

### HPK Design Principles

```typescript
// BAD: Single partition key (limited to 20GB per value)
partitionKey: "/searchId"

// GOOD: Hierarchical partition key (unlimited scale)
partitionKey: ["/tenantId", "/userId", "/id"]
```

**Benefits**:
- Query `/tenantId/user123/*` to get all searches for a user
- Query `/tenantId/*` to get all searches for a tenant (Tenant Admin)
- Partition automatically distributes across physical partitions

## recurringSearches Container

### Purpose
Stores recurring search configurations created by users.

### Schema

```typescript
interface RecurringSearch {
  // Identity
  id: string;                           // Unique search ID
  tenantId: string;                     // Partition key level 1
  userId: string;                       // Partition key level 2 (owner)
  
  // Basic configuration
  name: string;                         // User-friendly name
  description?: string;                 // Optional description
  query: string;                        // Search query
  searchType: SearchType;               // sales_opportunity | risk_detection | etc.
  
  // Data sources
  dataSources: {
    rag: boolean;                       // Query internal shards
    webSearch: boolean;                 // Query web providers
    webSearchProviders?: string[];     // Which providers to use
  };
  
  // Filters
  filters: {
    dateRange?: {
      from?: string;                    // ISO date
      to?: string;                      // ISO date
      relative?: string;                // "last_7_days" | "last_30_days" | etc.
    };
    sources?: string[];                 // Allowed sources
    excludeSources?: string[];          // Excluded sources
    language?: string[];                // Language filter
    country?: string[];                 // Country filter
  };
  
  // Schedule configuration
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    time?: string;                      // HH:mm in tenant timezone
    dayOfWeek?: number;                 // 0-6 for weekly
    dayOfMonth?: number;                // 1-31 for monthly
    monthsOfYear?: number[];            // [1,4,7,10] for quarterly
    timezone: string;                   // IANA timezone
    nextExecutionTime: string;          // ISO timestamp (UTC)
  };
  
  // Alert configuration
  alertConfig: {
    enabled: boolean;
    confidenceThreshold: number;        // 0-1, default 0.70
    sensitivity: 'low' | 'medium' | 'high';
    volumeThreshold?: number;           // Min result count change
    volumeThresholdPercent?: number;    // Min % change
    customDetectionPrompt?: string;     // User-defined prompt
    notificationChannels: string[];     // ['email', 'in-app', 'webhook', etc.]
    digestMode: boolean;                // Join digest or immediate
  };
  
  // Sharing & access
  sharing: {
    isPrivate: boolean;                 // Default true
    sharedWith: string[];               // Array of user IDs
    teamId?: string;                    // Optional team assignment
  };
  
  // Status
  status: 'active' | 'paused' | 'deleted';
  pausedAt?: string;
  pausedBy?: string;
  pauseReason?: string;
  
  // Execution tracking
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutionAt?: string;
    lastSuccessAt?: string;
    lastFailureAt?: string;
    alertsTriggered: number;
  };
  
  // Learning data
  learningData: {
    feedbackCount: number;
    relevantCount: number;
    irrelevantCount: number;
    falsePositiveRate: number;
    lastPromptRefinementAt?: string;
    suppressionRuleCount: number;
  };
  
  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;                      // For optimistic concurrency
  
  // Cosmos DB fields
  _partitionKey: string;                // "/tenantId/userId/id"
  ttl?: number;                         // Optional TTL for deleted searches
}
```

### Hierarchical Partition Key

```typescript
{
  "partitionKey": {
    "paths": ["/tenantId", "/userId", "/id"],
    "kind": "MultiHash",
    "version": 2
  }
}
```

### Indexing Policy

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/tenantId/?"
    },
    {
      "path": "/userId/?"
    },
    {
      "path": "/status/?"
    },
    {
      "path": "/schedule/nextExecutionTime/?"
    },
    {
      "path": "/createdAt/?"
    },
    {
      "path": "/searchType/?"
    },
    {
      "path": "/sharing/sharedWith/*"
    }
  ],
  "excludedPaths": [
    {
      "path": "/filters/*"
    },
    {
      "path": "/executionStats/*"
    },
    {
      "path": "/learningData/*"
    }
  ]
}
```

### Common Queries

```typescript
// 1. Get user's searches
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.userId = @userId
    AND c.status != 'deleted'
  ORDER BY c.createdAt DESC
`;

// 2. Get all tenant searches (Tenant Admin)
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.status = 'active'
  ORDER BY c.createdAt DESC
`;

// 3. Get searches due for execution
const query = `
  SELECT * FROM c
  WHERE c.status = 'active'
    AND c.schedule.nextExecutionTime <= @now
`;

// 4. Get shared searches for user
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND ARRAY_CONTAINS(c.sharing.sharedWith, @userId)
    AND c.status = 'active'
`;
```

## searchExecutions Container

### Purpose
Stores individual execution records for recurring searches.

### Schema

```typescript
interface SearchExecution {
  // Identity
  id: string;                           // Unique execution ID
  tenantId: string;                     // Partition key level 1
  searchId: string;                     // Partition key level 2
  
  // Execution details
  executedAt: string;                   // ISO timestamp (UTC)
  scheduledAt: string;                  // When it was scheduled
  completedAt?: string;                 // When it completed
  duration: number;                     // Execution time in ms
  
  // Status
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  retryCount: number;
  
  // Search configuration snapshot (for audit trail)
  searchConfig: {
    query: string;
    dataSources: any;
    filters: any;
  };
  
  // Results summary
  results: {
    totalResults: number;
    ragResults: number;
    webSearchResults: number;
    resultIds: string[];                // References to c_search items
    queryHash: string;                  // For linking to c_search shard
  };
  
  // Alert detection
  alertDetection: {
    analysisPerformed: boolean;
    alertTriggered: boolean;
    alertId?: string;                   // Reference to notification
    confidence?: number;
    reasoning?: string;
  };
  
  // Performance metrics
  metrics: {
    ragQueryTime?: number;
    webSearchTime?: number;
    alertAnalysisTime?: number;
    totalRUs: number;                   // Total RUs consumed
    webSearchCalls: number;
    webSearchCost?: number;
  };
  
  // Metadata
  createdAt: string;
  ttl: number;                          // Auto-delete after retention period
  
  // Cosmos DB fields
  _partitionKey: string;                // "/tenantId/searchId/id"
}
```

### Hierarchical Partition Key

```typescript
{
  "partitionKey": {
    "paths": ["/tenantId", "/searchId", "/id"],
    "kind": "MultiHash",
    "version": 2
  }
}
```

### Indexing Policy

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/tenantId/?"
    },
    {
      "path": "/searchId/?"
    },
    {
      "path": "/executedAt/?"
    },
    {
      "path": "/status/?"
    },
    {
      "path": "/alertDetection/alertTriggered/?"
    }
  ],
  "excludedPaths": [
    {
      "path": "/searchConfig/*"
    },
    {
      "path": "/metrics/*"
    },
    {
      "path": "/error/*"
    }
  ]
}
```

### Common Queries

```typescript
// 1. Get execution history for a search
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.searchId = @searchId
  ORDER BY c.executedAt DESC
  OFFSET 0 LIMIT 50
`;

// 2. Get recent executions with alerts
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.searchId = @searchId
    AND c.alertDetection.alertTriggered = true
  ORDER BY c.executedAt DESC
`;

// 3. Get failed executions for troubleshooting
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.status = 'failed'
    AND c.executedAt >= @since
  ORDER BY c.executedAt DESC
`;
```

## notifications Container

### Purpose
**Global container** for all application notifications (not just recurring search alerts). This includes alerts, system notifications, team mentions, and other user notifications.

### Schema

```typescript
interface Notification {
  // Identity
  id: string;                           // Unique notification ID
  notificationId: string;               // Alias for id (for HPK)
  tenantId: string;                     // Partition key level 1
  userId: string;                       // Partition key level 2 (recipient)
  
  // Notification type
  type: 'recurring_search_alert' | 'system' | 'team_mention' | 'share' | 'learning_update';
  
  // Source (for recurring search alerts)
  source?: {
    searchId?: string;                  // Link to recurring search
    executionId?: string;               // Link to execution
    alertType?: SearchType;             // Type of search
  };
  
  // Content
  title: string;
  summary: string;                      // Brief summary
  content: string;                      // Full content (can be markdown)
  
  // Alert-specific (for recurring search alerts)
  alert?: {
    confidence: number;
    keyChanges: string[];
    citations: Citation[];
    reasoning: string;
    recommendedActions?: string[];
  };
  
  // Status & interaction
  status: 'unread' | 'read' | 'acknowledged' | 'snoozed' | 'deleted';
  readAt?: string;
  acknowledgedAt?: string;
  snoozedUntil?: string;
  
  // User feedback (for alerts)
  feedback?: {
    type: 'relevant' | 'irrelevant';
    comment?: string;
    providedAt: string;
  };
  
  // Delivery tracking
  delivery: {
    channels: {
      channel: 'email' | 'in-app' | 'webhook' | 'push' | 'slack' | 'teams';
      status: 'pending' | 'sent' | 'failed' | 'bounced';
      sentAt?: string;
      failedAt?: string;
      error?: string;
      metadata?: any;                   // Channel-specific metadata
    }[];
    digestIncluded: boolean;            // Part of digest?
    digestSentAt?: string;
  };
  
  // Priority
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Actions (clickable buttons)
  actions?: {
    label: string;
    action: string;                     // e.g., 'view_results', 'adjust_search'
    url?: string;
  }[];
  
  // Metadata
  createdAt: string;
  expiresAt?: string;                   // For auto-deletion
  ttl?: number;                         // Auto-delete after retention
  
  // Cosmos DB fields
  _partitionKey: string;                // "/tenantId/userId/notificationId"
}
```

### Hierarchical Partition Key

```typescript
{
  "partitionKey": {
    "paths": ["/tenantId", "/userId", "/notificationId"],
    "kind": "MultiHash",
    "version": 2
  }
}
```

**Why this HPK?**
- Level 1 (`tenantId`): Tenant isolation
- Level 2 (`userId`): User's notification inbox
- Level 3 (`notificationId`): Individual notification

**Query Efficiency**:
- Get user's notifications: `/tenant123/user456/*` (single partition query)
- Get specific notification: `/tenant123/user456/notif789` (point read)

### Indexing Policy

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/tenantId/?"
    },
    {
      "path": "/userId/?"
    },
    {
      "path": "/type/?"
    },
    {
      "path": "/status/?"
    },
    {
      "path": "/priority/?"
    },
    {
      "path": "/createdAt/?"
    },
    {
      "path": "/source/searchId/?"
    }
  ],
  "excludedPaths": [
    {
      "path": "/content/?"
    },
    {
      "path": "/alert/*"
    },
    {
      "path": "/delivery/*"
    }
  ]
}
```

### Common Queries

```typescript
// 1. Get user's unread notifications
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.userId = @userId
    AND c.status = 'unread'
  ORDER BY c.createdAt DESC
`;

// 2. Get recurring search alerts for user
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.userId = @userId
    AND c.type = 'recurring_search_alert'
  ORDER BY c.createdAt DESC
  OFFSET 0 LIMIT 20
`;

// 3. Get alerts for specific search
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.userId = @userId
    AND c.source.searchId = @searchId
  ORDER BY c.createdAt DESC
`;

// 4. Count unread by priority
const query = `
  SELECT c.priority, COUNT(1) as count
  FROM c
  WHERE c.tenantId = @tenantId
    AND c.userId = @userId
    AND c.status = 'unread'
  GROUP BY c.priority
`;
```

## suppressionRules Container

### Purpose
Stores learned suppression rules to prevent false positive alerts.

### Schema

```typescript
interface SuppressionRule {
  // Identity
  id: string;                           // Unique rule ID
  tenantId: string;                     // Partition key level 1
  searchId: string;                     // Partition key level 2
  
  // Rule definition
  ruleType: 'keyword' | 'source' | 'pattern' | 'semantic';
  condition: {
    keywords?: string[];                // For keyword type
    sources?: string[];                 // For source type
    pattern?: string;                   // Regex for pattern type
    semanticDescription?: string;       // For semantic type
  };
  
  // Origin
  createdBy: 'user' | 'learning-system';
  createdReason?: string;               // Why was this created?
  basedOnAlerts?: string[];             // Alert IDs that led to this rule
  
  // Status
  status: 'active' | 'disabled';
  
  // Effectiveness tracking
  stats: {
    appliedCount: number;               // How many times applied
    preventedAlerts: number;            // Estimated alerts prevented
    userFeedbackCount: number;          // Times user agreed with suppression
    effectiveness: number;              // 0-1 score
    lastAppliedAt?: string;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;
  
  // Cosmos DB fields
  _partitionKey: string;                // "/tenantId/searchId/id"
}
```

### Hierarchical Partition Key

```typescript
{
  "partitionKey": {
    "paths": ["/tenantId", "/searchId", "/id"],
    "kind": "MultiHash",
    "version": 2
  }
}
```

### Indexing Policy

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/tenantId/?"
    },
    {
      "path": "/searchId/?"
    },
    {
      "path": "/status/?"
    },
    {
      "path": "/ruleType/?"
    },
    {
      "path": "/createdBy/?"
    }
  ],
  "excludedPaths": [
    {
      "path": "/condition/*"
    },
    {
      "path": "/stats/*"
    }
  ]
}
```

### Common Queries

```typescript
// 1. Get active rules for a search
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.searchId = @searchId
    AND c.status = 'active'
  ORDER BY c.stats.appliedCount DESC
`;

// 2. Get ineffective rules for review
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.stats.effectiveness < 0.5
    AND c.stats.appliedCount >= 10
  ORDER BY c.stats.effectiveness ASC
`;
```

## searchStatistics Container

### Purpose
Stores aggregated statistics for performance monitoring and analytics dashboards.

### Schema

```typescript
interface SearchStatistics {
  // Identity
  id: string;                           // Unique stat ID (e.g., "search-456-2025-12")
  tenantId: string;                     // Partition key level 1
  period: string;                       // Partition key level 2 (e.g., "2025-12", "2025-W48")
  
  // Scope
  scope: 'search' | 'tenant' | 'global';
  searchId?: string;                    // For search-level stats
  
  // Execution stats
  executions: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
    totalRUsConsumed: number;
  };
  
  // Alert stats
  alerts: {
    total: number;
    byType: Record<SearchType, number>;
    avgConfidence: number;
    withFeedback: number;
    relevant: number;
    irrelevant: number;
    snoozed: number;
  };
  
  // Accuracy metrics
  accuracy: {
    precision: number;                  // relevant / (relevant + irrelevant)
    falsePositiveRate: number;
    avgConfidenceForRelevant: number;
    avgConfidenceForIrrelevant: number;
  };
  
  // Learning metrics
  learning: {
    promptRefinements: number;
    suppressionRulesCreated: number;
    suppressionRulesActive: number;
    feedbackCount: number;
    feedbackRate: number;
  };
  
  // Cost tracking
  costs: {
    webSearchCalls: number;
    webSearchCost: number;
    llmCalls: number;
    llmTokens: number;
    llmCost: number;
    totalCost: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Cosmos DB fields
  _partitionKey: string;                // "/tenantId/period/id"
}
```

### Hierarchical Partition Key

```typescript
{
  "partitionKey": {
    "paths": ["/tenantId", "/period", "/id"],
    "kind": "MultiHash",
    "version": 2
  }
}
```

### Indexing Policy

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/tenantId/?"
    },
    {
      "path": "/period/?"
    },
    {
      "path": "/scope/?"
    },
    {
      "path": "/searchId/?"
    }
  ],
  "excludedPaths": [
    {
      "path": "/executions/*"
    },
    {
      "path": "/alerts/*"
    },
    {
      "path": "/costs/*"
    }
  ]
}
```

### Common Queries

```typescript
// 1. Get search stats for period
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.period = @period
    AND c.searchId = @searchId
`;

// 2. Get tenant stats for year
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.period >= '2025-01'
    AND c.period <= '2025-12'
    AND c.scope = 'tenant'
  ORDER BY c.period ASC
`;
```

## c_search Container (Reused)

### Purpose
Reuses existing `c_search` container from Web Search feature to store recurring search results.

**See**: [WEB-SEARCH.md](./WEB-SEARCH.md) for complete schema.

### Hierarchical Partition Key

```typescript
{
  "partitionKey": {
    "paths": ["/tenantId", "/queryHash", "/id"],
    "kind": "MultiHash",
    "version": 2
  }
}
```

### Integration with Recurring Search

```typescript
// Recurring search execution creates c_search shard
const searchResult: CSearchShard = {
  id: generateId(),
  tenantId: search.tenantId,
  queryHash: hashQuery(search.query),
  shardType: 'c_search',
  
  // Link to recurring search
  metadata: {
    source: 'recurring_search',
    recurringSearchId: search.id,
    executionId: execution.id,
    executedAt: execution.executedAt
  },
  
  // Search configuration
  searchQuery: search.query,
  searchFilters: search.filters,
  
  // Results
  results: [...],
  
  // Standard fields
  createdAt: new Date().toISOString(),
  ttl: search.retentionDays * 86400  // 30 days default
};
```

## c_webpages Container (Deep Search)

### Purpose
Stores scraped web page content with vector embeddings for deep search functionality.

### Hierarchical Partition Key Strategy

```typescript
{
  "partitionKey": {
    "paths": ["/tenantId", "/projectId", "/sourceQuery"],
    "kind": "MultiHash",
    "version": 2
  }
}
```

**Rationale:**
- **Level 0 `/tenantId`**: Ensures complete tenant data isolation
- **Level 1 `/projectId`**: Organizes pages by project/search area within tenant
- **Level 2 `/sourceQuery`**: Groups pages by original search query for deduplication

### Schema

```typescript
interface WebPageShard {
  // Identity
  id: string;                         // UUID format: "webpage_${uuid}"
  shardTypeId: "c_webpages";          // Fixed value
  
  // Partition key components (HPK)
  tenantId: string;                   // Level 0: Tenant owner
  projectId: string;                  // Level 1: Project/search area
  sourceQuery: string;                // Level 2: Original search query
  
  // Page metadata
  url: string;                        // Full URL
  title?: string;                     // Page title
  author?: string;                    // Article author
  publishDate?: string;               // Publication date (ISO)
  
  // Content (clean text only)
  structuredData: {
    url: string;
    content: string;                  // Plain text, no HTML/scripts
    contentLength: number;            // Total characters
  };
  
  // Vector embeddings
  embedding: {
    model: 'text-embedding-3-small';
    dimensions: 1536;
    chunks: Array<{
      text: string;                   // Chunk (max 512 tokens)
      embedding: number[];            // Vector [1536 dims]
      startIndex: number;             // Byte position
      tokenCount: number;             // Actual tokens
    }>;
  };
  
  // Scraping metadata
  metadata: {
    searchType: 'google' | 'bing' | 'news' | 'finance' | 'web';
    scrapedAt: Date;
    scrapeDuration: number;           // ms to scrape
    extractionSuccess: boolean;
    errorMessage?: string;
  };
  
  // Lifecycle
  expiresAt: Date;                    // +30 days
  ttl: number;                        // 2592000 (30 days)
  
  // Relationships
  executionId: string;                // Link to search execution
  recurringSearchId?: string;         // Link to recurring search
  conversationId?: string;            // Link to chat conversation
  
  // Audit
  audit: {
    createdAt: Date;
    updatedAt: Date;
    accessCount: number;
    lastAccessedAt?: Date;
  };
}
```

### Index Configuration

```typescript
// Cosmos DB index policy for c_webpages
{
  "indexingPolicy": {
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
      {
        "path": "/*"
      },
      {
        "path": "/embedding/chunks/embedding/?",
        "indexes": []  // Vector index (configured separately)
      }
    ],
    "excludedPaths": [
      {
        "path": "/structuredData/content/?",
        "indexes": []  // Don't index full text (too large)
      }
    ],
    "compositeIndexes": [
      [
        {
          "path": "/tenantId",
          "order": "ascending"
        },
        {
          "path": "/metadata/scrapedAt",
          "order": "descending"
        }
      ],
      [
        {
          "path": "/recurringSearchId",
          "order": "ascending"
        },
        {
          "path": "/audit/accessCount",
          "order": "descending"
        }
      ]
    ]
  }
}
```

### Vector Index Configuration

```typescript
// Vector index for semantic search (Cosmos DB Vector Search)
{
  "indexes": [
    {
      "name": "embedding_vector_index",
      "path": "/embedding/chunks/embedding",
      "type": "vector",
      "dimensions": 1536,
      "similarity": "cosine",
      "listSize": 100
    }
  ]
}
```

### Storage Estimates

| Metric | Size |
|--------|------|
| Average page content | 20-50 KB |
| With embeddings (1536 dims × chunks) | ~35 KB |
| Per search execution (3 pages) | ~150 KB |
| Monthly (10 searches/day, 300 executions) | ~45 MB |
| Yearly | ~540 MB |

### Retention & Cleanup

**TTL Configuration:**
- Default: 30 days (2,592,000 seconds)
- Automatic deletion by Cosmos DB
- Can be extended per project if needed

**Manual Cleanup:**
```typescript
// Query for expired pages
SELECT c.id FROM c_webpages c 
WHERE c.tenantId = @tenantId
AND c.expiresAt < GETCURRENTTIMESTAMP()
LIMIT 1000
```

### Query Patterns

**Find all pages for a project:**
```typescript
SELECT c.id, c.url, c.title, c.metadata.scrapedAt
FROM c_webpages c
WHERE c.tenantId = @tenantId
AND c.projectId = @projectId
ORDER BY c.metadata.scrapedAt DESC
```

**Vector similarity search:**
```typescript
// Find pages semantically similar to a query
SELECT TOP 10 c.id, c.url, c.title, c.embedding.chunks
FROM c_webpages c
WHERE c.tenantId = @tenantId
AND c.projectId = @projectId
ORDER BY VectorDistance(c.embedding.chunks[0].embedding, @queryVector) DESC
```

**Find frequently accessed pages:**
```typescript
SELECT TOP 20 c.url, c.audit.accessCount, c.metadata.scrapedAt
FROM c_webpages c
WHERE c.tenantId = @tenantId
AND c.recurringSearchId = @recurringSearchId
ORDER BY c.audit.accessCount DESC
```

### Integration with Recurring Search

When a recurring search executes with deep search enabled:

```typescript
// 1. Execute web search (gets snippets)
const results = await webSearchService.search({...});

// 2. For each result, scrape and create c_webpages shard
for (const result of results.slice(0, pageDepth)) {
  const webpage = await scraperService.scrape(result.url);
  
  const shard: WebPageShard = {
    id: generateId(),
    shardTypeId: 'c_webpages',
    tenantId: recurringSearch.tenantId,
    projectId: recurringSearch.projectId,
    sourceQuery: recurringSearch.query,
    
    url: webpage.url,
    title: webpage.title,
    
    structuredData: {
      url: webpage.url,
      content: webpage.cleanText,
      contentLength: webpage.cleanText.length
    },
    
    embedding: {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      chunks: await embeddingService.embedChunks(
        webpage.cleanText,
        512  // chunk size
      )
    },
    
    metadata: {
      searchType: recurringSearch.searchType,
      scrapedAt: new Date(),
      scrapeDuration: webpage.duration,
      extractionSuccess: true
    },
    
    expiresAt: addDays(new Date(), 30),
    ttl: 2592000,
    
    executionId: execution.id,
    recurringSearchId: recurringSearch.id,
    
    audit: {
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0
    }
  };
  
  // Store in c_webpages container
  await cosmosClient.container('c_webpages').items.create(shard);
}
```

### Related Documentation

- [WEB-SEARCH-DEEP-SEARCH.md](./WEB-SEARCH-DEEP-SEARCH.md) - Complete deep search architecture
- [WEB-SEARCH.md](./WEB-SEARCH.md) - c_webpages shard definition
- [RECURRING-SEARCH-OVERVIEW.md](./RECURRING-SEARCH-OVERVIEW.md#deep-web-search) - Deep search in recurring searches

## Index Strategies

### Composite Indexes

For frequently used query patterns, create composite indexes:

```json
{
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/userId", "order": "ascending" },
      { "path": "/status", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/schedule/nextExecutionTime", "order": "ascending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/userId", "order": "ascending" },
      { "path": "/type", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ]
  ]
}
```

### Spatial Indexes

Not required for recurring search (no geospatial queries).

## TTL Configuration

### Automatic Cleanup

All containers support TTL for automatic document deletion:

```typescript
// Container-level TTL (default, can be overridden per document)
{
  "defaultTtl": -1  // Disabled by default, set per document
}

// Document-level TTL examples:

// Search results: 30 days (configurable by tenant)
{
  ttl: 2592000  // 30 days in seconds
}

// Notifications: 90 days
{
  ttl: 7776000  // 90 days in seconds
}

// Executions: 180 days
{
  ttl: 15552000  // 180 days in seconds
}

// Statistics: 1 year
{
  ttl: 31536000  // 365 days in seconds
}

// Suppression rules: No TTL (kept indefinitely while active)
{
  ttl: undefined
}

// Deleted searches: 7 days (grace period)
{
  ttl: 604800  // 7 days in seconds
}
```

## Migration Scripts

### Create Containers

```typescript
import { CosmosClient } from '@azure/cosmos';

async function createRecurringSearchContainers() {
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING!);
  const database = client.database(process.env.COSMOS_DATABASE_NAME!);
  
  // 1. Create recurringSearches container
  await database.containers.createIfNotExists({
    id: 'recurringSearches',
    partitionKey: {
      paths: ['/tenantId', '/userId', '/id'],
      kind: 'MultiHash',
      version: 2
    },
    indexingPolicy: {
      indexingMode: 'consistent',
      automatic: true,
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/userId/?' },
        { path: '/status/?' },
        { path: '/schedule/nextExecutionTime/?' },
        { path: '/createdAt/?' },
        { path: '/searchType/?' },
        { path: '/sharing/sharedWith/*' }
      ],
      excludedPaths: [
        { path: '/filters/*' },
        { path: '/executionStats/*' },
        { path: '/learningData/*' }
      ]
    },
    defaultTtl: -1  // Disabled, set per document
  });
  
  // 2. Create searchExecutions container
  await database.containers.createIfNotExists({
    id: 'searchExecutions',
    partitionKey: {
      paths: ['/tenantId', '/searchId', '/id'],
      kind: 'MultiHash',
      version: 2
    },
    indexingPolicy: {
      indexingMode: 'consistent',
      automatic: true,
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/searchId/?' },
        { path: '/executedAt/?' },
        { path: '/status/?' },
        { path: '/alertDetection/alertTriggered/?' }
      ],
      excludedPaths: [
        { path: '/searchConfig/*' },
        { path: '/metrics/*' },
        { path: '/error/*' }
      ]
    },
    defaultTtl: -1
  });
  
  // 3. Create notifications container
  await database.containers.createIfNotExists({
    id: 'notifications',
    partitionKey: {
      paths: ['/tenantId', '/userId', '/notificationId'],
      kind: 'MultiHash',
      version: 2
    },
    indexingPolicy: {
      indexingMode: 'consistent',
      automatic: true,
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/userId/?' },
        { path: '/type/?' },
        { path: '/status/?' },
        { path: '/priority/?' },
        { path: '/createdAt/?' },
        { path: '/source/searchId/?' }
      ],
      excludedPaths: [
        { path: '/content/?' },
        { path: '/alert/*' },
        { path: '/delivery/*' }
      ]
    },
    defaultTtl: -1
  });
  
  // 4. Create suppressionRules container
  await database.containers.createIfNotExists({
    id: 'suppressionRules',
    partitionKey: {
      paths: ['/tenantId', '/searchId', '/id'],
      kind: 'MultiHash',
      version: 2
    },
    indexingPolicy: {
      indexingMode: 'consistent',
      automatic: true,
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/searchId/?' },
        { path: '/status/?' },
        { path: '/ruleType/?' },
        { path: '/createdBy/?' }
      ],
      excludedPaths: [
        { path: '/condition/*' },
        { path: '/stats/*' }
      ]
    },
    defaultTtl: -1
  });
  
  // 5. Create searchStatistics container
  await database.containers.createIfNotExists({
    id: 'searchStatistics',
    partitionKey: {
      paths: ['/tenantId', '/period', '/id'],
      kind: 'MultiHash',
      version: 2
    },
    indexingPolicy: {
      indexingMode: 'consistent',
      automatic: true,
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/period/?' },
        { path: '/scope/?' },
        { path: '/searchId/?' }
      ],
      excludedPaths: [
        { path: '/executions/*' },
        { path: '/alerts/*' },
        { path: '/costs/*' }
      ]
    },
    defaultTtl: -1
  });
  
  console.log('✅ All recurring search containers created successfully');
}

// Run migration
createRecurringSearchContainers().catch(console.error);
```

## Query Patterns

### Efficient Query Examples

**✅ GOOD: Single-partition query (low RU cost)**
```typescript
// Get user's searches (uses HPK efficiently)
const query = `
  SELECT * FROM c
  WHERE c.tenantId = 'tenant123'
    AND c.userId = 'user456'
    AND c.status = 'active'
`;
// Estimated RUs: 2-5 RUs (single partition)
```

**✅ GOOD: Point read (lowest RU cost)**
```typescript
// Get specific search by full HPK
const search = await container.item(
  'search789',
  ['/tenant123', '/user456', '/search789']
).read();
// Estimated RUs: 1 RU (point read)
```

**⚠️ ACCEPTABLE: Cross-partition with filter**
```typescript
// Get all due searches (Scheduler function)
const query = `
  SELECT * FROM c
  WHERE c.status = 'active'
    AND c.schedule.nextExecutionTime <= @now
`;
// Estimated RUs: 10-50 RUs (depends on data size, runs once/minute)
```

**❌ BAD: Cross-partition without selective filter**
```typescript
// Get all searches (no tenantId filter)
const query = `
  SELECT * FROM c
  WHERE c.searchType = 'sales_opportunity'
`;
// Estimated RUs: 100+ RUs (scans all partitions)
```

## Performance Optimization

### RU Optimization

1. **Use HPK in queries**: Always include `tenantId` in WHERE clause
2. **Leverage point reads**: When you have full HPK, use `.item().read()`
3. **Limit result sets**: Use `OFFSET/LIMIT` or `TOP`
4. **Project only needed fields**: Use `SELECT c.id, c.name` instead of `SELECT *`
5. **Cache frequently accessed data**: Cache search configs in memory

### Query Examples with RU Estimates

```typescript
// Point read: ~1 RU
const search = await container.item(id, [tenantId, userId, id]).read();

// Single-partition list: ~2-5 RUs
const { resources } = await container.items
  .query({
    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId',
    parameters: [{ name: '@tenantId', value: tenantId }, { name: '@userId', value: userId }]
  })
  .fetchAll();

// Filtered single-partition: ~3-7 RUs
const { resources } = await container.items
  .query({
    query: `SELECT * FROM c 
            WHERE c.tenantId = @tenantId 
              AND c.userId = @userId 
              AND c.status = 'active'
            ORDER BY c.createdAt DESC`,
    parameters: [...]
  })
  .fetchAll();
```

### Indexing Best Practices

1. **Exclude large/unused paths**: Don't index content, metrics, config objects
2. **Use composite indexes**: For common multi-field sorts/filters
3. **Monitor index usage**: Review unused indexes quarterly
4. **Test query performance**: Use `x-ms-request-charge` header to measure RUs

## Related Documentation

- [RECURRING-SEARCH-OVERVIEW.md](./RECURRING-SEARCH-OVERVIEW.md) - System architecture
- [RECURRING-SEARCH-ALERTS.md](./RECURRING-SEARCH-ALERTS.md) - Alert detection system
- [RECURRING-SEARCH-SERVICES.md](./RECURRING-SEARCH-SERVICES.md) - Service implementations
- [NOTIFICATIONS.md](./NOTIFICATIONS.md) - Global notification system
- [WEB-SEARCH.md](./WEB-SEARCH.md) - c_search container details
