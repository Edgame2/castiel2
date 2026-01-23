# Web Search Integration with c_search Shards

## Overview

This document describes the complete Web Search Integration system for AI Insights using Azure AI Search with Web Indexing. The system stores search results as `c_search` shards in Azure Cosmos DB with intelligent multi-provider fallback routing, caching, and seamless context assembly integration.

**Key Features:**
- ✅ Multiple provider support (Azure AI Search, Bing, Google) with fallback chain
- ✅ Tenant-scoped search results with user audit trail
- ✅ Automatic query deduplication and 30-day caching (configurable)
- ✅ Super Admin control over provider activation and configuration
- ✅ Tenant Admin per-tenant configuration options
- ✅ Automatic and manual web search triggering
- ✅ Native Cosmos DB storage with Hierarchical Partition Keys
- ✅ Cost tracking and usage analytics
- ✅ Quality filters and domain management

---

## Table of Contents

1. [Architecture](#architecture)
2. [c_search Shard Type](#c_search-shard-type)
3. [Deep Web Search](#deep-web-search)
4. [Multi-Provider System](#multi-provider-system)
5. [Database Schema & Partitioning](#database-schema--partitioning)
6. [TypeScript Types](#typescript-types)
7. [Web Search Service](#web-search-service)
8. [Integration with Context Assembly](#integration-with-context-assembly)
9. [Provider Management](#provider-management)
10. [Configuration System](#configuration-system)
11. [API Endpoints](#api-endpoints)
12. [UI Components](#ui-components)
13. [Examples & Workflows](#examples--workflows)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER REQUEST                               │
│                 "What are the latest AI regulations?"               │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │   Intent Analyzer            │
        │   - Detect search trigger    │
        │   - Check tenant config      │
        │   - Auto vs. manual          │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  Web Search Service          │
        │  - Check cache (HPK query)   │
        │  - Get fallback chain        │
        │  - Route to providers        │
        └────────────┬─────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Azure   │ │  Bing   │ │ Google  │
    │  AI     │ │ Search  │ │ Custom  │
    │ Search  │ │  API    │ │ Search  │
    │(Primary)│ │(Backup1)│ │(Backup2)│
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         └───────────┼───────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  Store as c_search Shard     │
        │  - Tenant-scoped (HPK)       │
        │  - TTL-based cache           │
        │  - User audit trail          │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  Context Assembler           │
        │  - Merge RAG + web results   │
        │  - Rank by relevance         │
        │  - Apply ranking config      │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  Grounding Service           │
        │  - Generate citations        │
        │  - Mark web sources (🌐)     │
        │  - Confidence scoring        │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  LLM Generation              │
        │  - Synthesize answer         │
        │  - Include both sources      │
        │  - Show citations            │
        └──────────────────────────────┘
```

### Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI INSIGHTS SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐          ┌──────────────────────┐   │
│  │  Intent Analyzer     │          │  Context Assembler   │   │
│  │  - Triggers search   │◄────────►│  - Adds web chunks   │   │
│  │  - Checks keywords   │          │  - Ranks results     │   │
│  └──────────────┬───────┘          └──────────────┬───────┘   │
│                 │                                  │            │
│                 │                                  ▼            │
│                 │                  ┌──────────────────────┐   │
│                 │                  │ Grounding Service    │   │
│                 │                  │ - Citations (🌐)     │   │
│                 │                  │ - Confidence         │   │
│                 │                  └──────────────────────┘   │
│                 │                                               │
│                 ▼                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │         Web Search Service                           │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │                                                      │     │
│  │  1. Check cache (Cosmos DB, HPK)                    │     │
│  │  2. Get fallback chain                              │     │
│  │  3. Execute provider search                         │     │
│  │  4. Normalize results                               │     │
│  │  5. Store as c_search shard                         │     │
│  │  6. Return to context assembler                     │     │
│  │                                                      │     │
│  └──────────────────────────────────────────────────────┘     │
│                 │      │      │                                │
│          ┌──────┴──┬───┴──┬───┴──────┐                        │
│          ▼         ▼      ▼          ▼                         │
│  ┌──────────┐ ┌────────┐ ┌──────┐ ┌──────────┐               │
│  │Azure AI  │ │  Bing  │ │Google│ │Key Vault │               │
│  │ Search   │ │ Search │ │Search│ │(API Keys)│               │
│  └──────────┘ └────────┘ └──────┘ └──────────┘               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │     Cosmos DB - searchResults Container              │     │
│  │     Partition: /tenantId/query                       │     │
│  │     TTL: 30 days (configurable per tenant)           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## c_search Shard Type

### Definition

The `c_search` shard type represents web search results stored as first-class entities in Cosmos DB.

```typescript
/**
 * c_search Shard Type Definition
 * 
 * Represents web search results stored in Cosmos DB
 * Partition Key: /tenantId (Level 0), /query (Level 1)
 * TTL: 30 days default (configurable per tenant)
 */
interface SearchResultShard {
  // ======================================
  // CORE IDENTIFIERS
  // ======================================
  id: string;                          // UUID format: "search_${uuid}"
  shardTypeId: "c_search";             // Fixed value for this shard type
  
  // ======================================
  // TENANT & USER CONTEXT
  // ======================================
  tenantId: string;                    // Partition key level 0: tenant owner
  createdBy: string;                   // User ID who initiated search (audit trail)
  
  // ======================================
  // SEARCH METADATA
  // ======================================
  query: string;                       // Original search query (deduplication key)
  provider: "azure-ai-search" | "bing" | "google";  // Provider that returned results
  searchedAt: Date;                    // Exact timestamp of search execution
  expiresAt: Date;                     // TTL expiration datetime (for cleanup)
  
  // ======================================
  // SEARCH CONFIGURATION
  // ======================================
  searchConfig: {
    market?: string;                   // e.g., "en-US", "fr-FR"
    safeSearch?: "off" | "moderate" | "strict";
    freshness?: "day" | "week" | "month";  // Filter results by age
    maxResults: number;                // Number of results returned (1-10)
    autoTriggered: boolean;            // Was search auto-triggered or user-requested?
  };
  
  // ======================================
  // SEARCH RESULTS
  // ======================================
  results: SearchResult[];             // Array of search results (embedded)
  
  // ======================================
  // AGGREGATED METADATA
  // ======================================
  metadata: {
    totalMatches: number;              // Total matches available from provider
    executionTimeMs: number;           // Time to execute search (perf tracking)
    resultCount: number;               // Count of results returned
    fromCache: boolean;                // Was this result from cache or fresh?
    cacheHitCount?: number;            // How many times this result was reused
    cost: number;                      // Estimated cost in USD
    relevanceScores: {
      min: number;                     // 0-1 scale
      max: number;
      avg: number;
    };
  };
  
  // ======================================
  // GROUNDING METADATA (For Citations)
  // ======================================
  groundingMetadata: {
    domains: string[];                 // Unique domains in results (for filtering)
    freshResults: boolean;             // Any results within 7 days?
    newsSources: boolean;              // Any news/media sources?
    academicSources: boolean;          // Any academic/research sources?
    authoritative: boolean;            // Meets quality threshold (>80% relevance)?
  };
  
  // ======================================
  // AUDIT TRAIL
  // ======================================
  audit: {
    createdAt: Date;                   // When shard was created
    updatedAt: Date;                   // Last update timestamp
    accessCount: number;               // How many times used in context assembly
    lastAccessedAt?: Date;             // When last accessed
  };
}

/**
 * Individual Search Result (embedded in SearchResultShard)
 */
interface SearchResult {
  id: string;                          // Unique within shard: UUID
  title: string;                       // Page title
  snippet: string;                     // Short excerpt (100-200 chars)
  url: string;                         // Full URL
  displayUrl: string;                  // For display to user
  
  // ======================================
  // PUBLICATION INFO
  // ======================================
  publishedDate?: Date;                // When content was published
  dateLastCrawled?: Date;              // When search provider last crawled it
  
  // ======================================
  // RELEVANCE & RANKING
  // ======================================
  relevanceScore: number;              // 0-1 normalized (across all providers)
  provider: string;                    // Original provider (may differ from parent)
  
  // ======================================
  // SOURCE CLASSIFICATION
  // ======================================
  domain: string;                      // Extracted domain (e.g., "europa.eu")
  isFresh: boolean;                    // Within last 7 days?
  sourceType: "news" | "academic" | "blog" | "official" | "other";
  
  // ======================================
  // OPTIONAL METADATA
  // ======================================
  metadata?: {
    thumbnailUrl?: string;             // Image for visual display
    language?: string;
    author?: string;                   // Article author
    wordCount?: number;                // Article length
    isFamilyFriendly?: boolean;
  };
}
```

### Example c_search Shard (JSON)

```json
{
  "id": "search_f47ac10b58cc4372a5670e4eea1d0000",
  "shardTypeId": "c_search",
  "tenantId": "tenant_acme_corp",
  "createdBy": "user_jane_smith",
  
  "query": "latest AI regulations Europe 2025",
  "provider": "azure-ai-search",
  "searchedAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-02-14T10:30:00Z",
  
  "searchConfig": {
    "market": "en-US",
    "safeSearch": "moderate",
    "freshness": "month",
    "maxResults": 5,
    "autoTriggered": true
  },
  
  "results": [
    {
      "id": "result_1",
      "title": "EU AI Act Takes Effect: Key Changes for 2025",
      "snippet": "The European Union's Artificial Intelligence Act enters enforcement phase with new requirements for high-risk AI systems...",
      "url": "https://europa.eu/ai-act-2025-guide",
      "displayUrl": "europa.eu › ai-act-2025-guide",
      "publishedDate": "2025-01-10T00:00:00Z",
      "relevanceScore": 0.95,
      "provider": "azure-ai-search",
      "domain": "europa.eu",
      "isFresh": true,
      "sourceType": "official",
      "metadata": {
        "author": "European Commission",
        "wordCount": 2547,
        "isFamilyFriendly": true
      }
    },
    {
      "id": "result_2",
      "title": "Compliance Guide: EU AI Act Requirements",
      "snippet": "Organizations must now comply with risk-based AI requirements. This guide covers classification, documentation, testing, and monitoring requirements...",
      "url": "https://example-compliance.com/eu-ai-guide",
      "displayUrl": "example-compliance.com › eu-ai-guide",
      "publishedDate": "2025-01-12T00:00:00Z",
      "relevanceScore": 0.88,
      "provider": "azure-ai-search",
      "domain": "example-compliance.com",
      "isFresh": true,
      "sourceType": "blog",
      "metadata": {
        "author": "Compliance Team",
        "wordCount": 3421
      }
    }
  ],
  
  "metadata": {
    "totalMatches": 1250,
    "executionTimeMs": 342,
    "resultCount": 5,
    "fromCache": false,
    "cost": 0.02,
    "relevanceScores": {
      "min": 0.78,
      "max": 0.95,
      "avg": 0.87
    }
  },
  
  "groundingMetadata": {
    "domains": ["europa.eu", "example-compliance.com", "techcrunch.com", "ai-regulations.org"],
    "freshResults": true,
    "newsSources": true,
    "academicSources": false,
    "authoritative": true
  },
  
  "audit": {
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "accessCount": 3,
    "lastAccessedAt": "2025-01-15T14:22:00Z"
  }
}
```

---

## Deep Web Search

### Overview

Deep Web Search extends the basic web search functionality by automatically scraping and analyzing the full content of top search results. This provides more comprehensive context for alert detection and enables semantic search through vector embeddings.

**Key Capabilities:**
- **Automatic Page Scraping**: Extract full content from top 3 search results (configurable)
- **Content Embeddings**: Generate vector embeddings for semantic similarity search
- **Async Execution**: Initial results returned immediately, scraping happens in background
- **Real-Time Progress**: WebSocket/SSE updates for long-running scraping operations
- **Intelligent Storage**: Results stored as `c_webpages` shards in Cosmos DB

### How It Works

When deep search is enabled for a web search query:

1. **Synchronous Search Phase** (<1s):
   - Query SerpAPI or Bing Search provider
   - Return snippet-based results immediately
   - Begin async scraping in background

2. **Asynchronous Scraping Phase** (5-8s):
   - For each of top 3 results:
     - Fetch full page HTML using Axios
     - Extract clean text using Cheerio
     - Remove HTML, scripts, styles, navigation
     - Split into 512-token semantic chunks
     - Generate embeddings (OpenAI text-embedding-3-small)
     - Store as `c_webpages` shard

3. **Real-Time Updates**:
   - Send WebSocket/SSE progress updates
   - Client displays: "Scraping page 2 of 3..."
   - User can interact with initial results

4. **Enhanced Alert Detection**:
   - LLM alert analysis uses full page content
   - Vector search finds semantic relationships
   - Better contextual summaries with citations

### c_webpages Shard Type

Deep search results are stored in `c_webpages` shard type with embedded vector embeddings:

```typescript
/**
 * c_webpages Shard Type Definition
 * 
 * Stores scraped web page content with vector embeddings
 * Partition Key: /tenantId (HPK Level 0), /projectId (HPK Level 1), /sourceQuery (HPK Level 2)
 * TTL: 30 days (automatic cleanup)
 */
interface WebPageShard {
  // ======================================
  // IDENTIFIERS
  // ======================================
  id: string;                         // UUID format: "webpage_${uuid}"
  shardTypeId: "c_webpages";          // Fixed value for this shard type
  
  // ======================================
  // HIERARCHICAL PARTITION KEY (HPK)
  // ======================================
  tenantId: string;                   // HPK Level 0: Tenant owner
  projectId: string;                  // HPK Level 1: Project/search area
  sourceQuery: string;                // HPK Level 2: Original search query
  
  // ======================================
  // PAGE METADATA
  // ======================================
  url: string;                        // Full URL
  title?: string;                     // Page title
  author?: string;                    // Article author (if detected)
  publishDate?: string;               // Publication date (ISO 8601)
  
  // ======================================
  // STRUCTURED DATA (Content)
  // ======================================
  structuredData: {
    url: string;                      // Canonical URL
    content: string;                  // Clean text only (no HTML)
    contentLength: number;            // Total character count
  };
  
  // ======================================
  // EMBEDDINGS & CHUNKS
  // ======================================
  embedding: {
    model: 'text-embedding-3-small';  // Model used
    dimensions: 1536;                 // Vector dimensions
    chunks: Array<{
      text: string;                   // Chunk text (max 512 tokens)
      embedding: number[];            // Vector [1536 dimensions]
      startIndex: number;             // Position in original content
      tokenCount: number;             // Actual token count
    }>;
  };
  
  // ======================================
  // SCRAPING METADATA
  // ======================================
  metadata: {
    searchType: 'google' | 'bing' | 'news' | 'finance' | 'web';
    scrapedAt: Date;                  // When content was scraped
    scrapeDuration: number;           // Time to scrape (ms)
    extractionSuccess: boolean;       // Scraping succeeded?
    errorMessage?: string;            // If extraction failed
  };
  
  // ======================================
  // LIFECYCLE
  // ======================================
  expiresAt: Date;                    // +30 days from creation
  ttl: number;                        // 2592000 (30 days in seconds)
  
  // ======================================
  // RELATIONSHIPS
  // ======================================
  executionId: string;                // Link to search execution
  recurringSearchId?: string;         // Link to recurring search
  conversationId?: string;            // Link to chat conversation
  
  // ======================================
  // AUDIT
  // ======================================
  audit: {
    createdAt: Date;
    updatedAt: Date;
    accessCount: number;
    lastAccessedAt?: Date;
  };
}
```

### Configuration

Deep search is enabled per recurring search:

```typescript
interface DeepSearchConfig {
  enabled: boolean;                  // Enable/disable deep search
  pageDepth: number;                 // Pages to scrape (default: 3, max: 10)
  extractionMethod: 'text-only';     // Current: text-only (no HTML)
  chunkSize: number;                 // Token limit per chunk (default: 512)
  minContentLength: number;          // Skip pages with <100 chars
  timeout: number;                   // Max 30s per page (default: 10s)
}
```

### Related Documentation

For complete implementation details, see:
- [WEB-SEARCH-DEEP-SEARCH.md](./WEB-SEARCH-DEEP-SEARCH.md) - Comprehensive deep search system architecture
- [RECURRING-SEARCH-OVERVIEW.md](./RECURRING-SEARCH-OVERVIEW.md#deep-web-search) - Deep search in recurring searches

---

## Multi-Provider System

### Supported Providers

```typescript
/**
 * Supported Web Search Providers
 */
type SearchProvider = "azure-ai-search" | "bing" | "google";

/**
 * Provider Configuration
 * Stored in Cosmos DB, API keys in Azure Key Vault
 */
interface SearchProviderConfig {
  id: SearchProvider;                 // Primary key: provider ID
  name: string;                       // Display name (e.g., "Azure AI Search")
  description: string;                // Brief description
  
  // ======================================
  // ACTIVATION & PRIORITY
  // ======================================
  enabled: boolean;                   // Global enable/disable
  priority: number;                   // In fallback chain: 1=primary, 2=secondary
  
  // ======================================
  // PROVIDER-SPECIFIC CONFIG
  // ======================================
  config: {
    // Common fields
    endpoint?: string;                // API endpoint URL
    maxResults?: number;              // Default max results per query
    defaultMarket?: string;           // Default market/locale
    defaultSafeSearch?: "off" | "moderate" | "strict";
    
    // Azure AI Search specific
    indexName?: string;               // Index name for semantic search
    semanticSearchEnabled?: boolean;  // Use semantic ranking?
    
    // Bing specific
    subscriptionKeyVaultPath?: string;  // Path: /bingsearch/primary-key
    
    // Google specific
    customSearchEngineId?: string;    // Google Custom Search Engine ID
    subscriptionKeyVaultPath?: string;  // Path: /googlesearch/api-key
  };
  
  // ======================================
  // COST TRACKING
  // ======================================
  pricing: {
    costPerQuery: number;             // USD per query (for analytics)
    includesInMonthlyFree?: number;   // Free queries/month if applicable
  };
  
  // ======================================
  // HEALTH & MONITORING
  // ======================================
  health: {
    isHealthy: boolean;               // Last known health status
    lastHealthCheckAt?: Date;         // Last health check timestamp
    errorRate?: number;               // Error percentage (0-100)
    avgLatencyMs?: number;            // Average response time
  };
  
  // ======================================
  // AUDIT TRAIL
  // ======================================
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;                  // Super Admin who made the change
}

/**
 * Provider Fallback Chain Configuration
 * Determines order of provider attempts if one fails
 */
interface ProviderFallbackChain {
  id: string;                         // e.g., "global-fallback-chain"
  tenantId?: string;                  // null for global, or per-tenant override
  
  // ======================================
  // ORDERED PROVIDERS
  // ======================================
  chain: {
    provider: SearchProvider;         // Provider to try
    priority: number;                 // Order: 1, 2, 3...
    enabled: boolean;                 // Can be disabled without removing from chain
    fallbackOn?: string[];            // Error codes that trigger fallback: ["429", "timeout", "500"]
  }[];
  
  // ======================================
  // FALLBACK BEHAVIOR
  // ======================================
  behavior: {
    maxAttempts: number;              // Max providers to try before failing
    timeoutMs: number;                // Timeout per provider attempt
    retryDelay?: number;              // Delay (ms) before trying next provider
  };
  
  // ======================================
  // AUDIT TRAIL
  // ======================================
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;                // Super Admin who configured this
  };
}
```

### Default Fallback Chain Configuration

```json
{
  "id": "global-fallback-chain",
  "tenantId": null,
  "chain": [
    {
      "provider": "azure-ai-search",
      "priority": 1,
      "enabled": true,
      "fallbackOn": ["429", "500", "timeout", "service_unavailable"]
    },
    {
      "provider": "bing",
      "priority": 2,
      "enabled": true,
      "fallbackOn": ["429", "timeout"]
    },
    {
      "provider": "google",
      "priority": 3,
      "enabled": false,
      "fallbackOn": ["429"]
    }
  ],
  "behavior": {
    "maxAttempts": 2,
    "timeoutMs": 5000,
    "retryDelay": 500
  },
  "metadata": {
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z",
    "updatedBy": "system"
  }
}
```

### Provider Comparison

| Feature | Azure AI Search | Bing Search API | Google Custom Search |
|---------|-----------------|-----------------|----------------------|
| **Semantic Search** | ✅ Yes | ❌ No | ❌ No |
| **Cost/Query** | $0.01-0.02 | $0.007 | $0.005 |
| **Free Queries/Month** | Limited | - | 100 |
| **Setup Complexity** | Medium | Easy | Medium |
| **Enterprise Features** | ✅ Yes | ❌ No | ❌ No |
| **Recommended Use** | Primary | Fallback 1 | Fallback 2 |

---

## Database Schema & Partitioning

### Cosmos DB Container: searchResults

**Purpose**: Stores all search result shards with optimized multi-tenant isolation

```typescript
interface ContainerSpec {
  id: "searchResults";
  
  // ======================================
  // HIERARCHICAL PARTITION KEY (HPK)
  // ======================================
  // Optimizes for:
  // 1. Tenant isolation (/tenantId)
  // 2. Query deduplication (/query)
  // 3. Efficient multi-partition queries
  hierarchicalPartitionKeyPaths: [
    "/tenantId",                       // Level 0: Complete tenant isolation
    "/query"                           // Level 1: Query-based cache lookup
  ];
  
  // ======================================
  // TTL SETTINGS
  // ======================================
  defaultTtl: 2592000;                 // 30 days in seconds (30 * 24 * 60 * 60)
  
  // ======================================
  // INDEXING STRATEGY
  // ======================================
  indexingPolicy: {
    automatic: true;
    includedPaths: [
      // Partition keys (always indexed)
      { path: "/tenantId/?", indexes: [{ kind: "Hash" }] },
      { path: "/query/?", indexes: [{ kind: "Hash" }] },
      
      // Query/filter fields
      { path: "/provider/?", indexes: [{ kind: "Hash" }] },
      { path: "/searchedAt/?", indexes: [{ kind: "Range" }] },
      { path: "/expiresAt/?", indexes: [{ kind: "Range" }] },
      
      // Performance tracking
      { path: "/results[*].relevanceScore/?", indexes: [{ kind: "Range" }] },
      { path: "/groundingMetadata/domains[*]/?", indexes: [{ kind: "Hash" }] },
      { path: "/audit/accessCount/?", indexes: [{ kind: "Range" }] },
    ];
    excludedPaths: [
      // Don't index rarely-used fields
      { path: "/results[*].metadata/?", indexes: [] }
    ];
  };
  
  // ======================================
  // UNIQUENESS CONSTRAINT
  // ======================================
  uniqueKeyPolicy: {
    uniqueKeys: [
      {
        // Prevent duplicate searches
        paths: ["/tenantId", "/query", "/provider", "/searchedAt"]
      }
    ];
  };
}
```

**Sample Queries:**

```sql
-- Exact cache hit (single partition - most efficient)
SELECT * FROM c
WHERE c.tenantId = "tenant_acme"
  AND c.query = "latest AI regulations"
  AND c.expiresAt > GetCurrentTimestamp()
LIMIT 1

-- Get all searches for a tenant (multi-partition but HPK-filtered)
SELECT * FROM c
WHERE c.tenantId = "tenant_acme"
  AND c.expiresAt > GetCurrentTimestamp()
ORDER BY c.searchedAt DESC
LIMIT 50

-- Get most accessed searches (requires fallback scan - avoid if possible)
SELECT * FROM c
WHERE c.audit.accessCount > 5
ORDER BY c.audit.accessCount DESC
```

### Cosmos DB Container: searchProviders

**Purpose**: Stores provider configurations (global system-level)

```typescript
interface ProviderContainer {
  id: "searchProviders";
  
  partitionKeyPath: "/id";            // Simple: provider ID is partition key
  
  defaultTtl: -1;                     // No TTL: configs persist indefinitely
  
  indexingPolicy: {
    automatic: true;
    includedPaths: [
      { path: "/id/?", indexes: [{ kind: "Hash" }] },
      { path: "/enabled/?", indexes: [{ kind: "Hash" }] },
      { path: "/priority/?", indexes: [{ kind: "Range" }] },
      { path: "/health/isHealthy/?", indexes: [{ kind: "Hash" }] },
      { path: "/health/errorRate/?", indexes: [{ kind: "Range" }] }
    ];
  };
}
```

### Cosmos DB Container: providerFallbackChains

**Purpose**: Stores fallback chain configurations (global + per-tenant)

```typescript
interface FallbackChainContainer {
  id: "providerFallbackChains";
  
  partitionKeyPath: "/id";            // Partition by chain ID
  
  defaultTtl: -1;                     // No TTL: configs persist
  
  indexingPolicy: {
    automatic: true;
    includedPaths: [
      { path: "/id/?", indexes: [{ kind: "Hash" }] },
      { path: "/tenantId/?", indexes: [{ kind: "Hash" }] }
    ];
  };
}
```

### Cosmos DB Container: webSearchConfigurations

**Purpose**: Stores per-tenant web search configuration (TTL, triggering, quality)

```typescript
interface WebSearchConfigContainer {
  id: "webSearchConfigurations";
  
  partitionKeyPath: "/tenantId";      // Partition by tenant
  
  defaultTtl: -1;                     // No TTL: configs persist
  
  indexingPolicy: {
    automatic: true;
    includedPaths: [
      { path: "/tenantId/?", indexes: [{ kind: "Hash" }] },
      { path: "/enabled/?", indexes: [{ kind: "Hash" }] }
    ];
  };
}
```

### Cosmos DB Container Migration Script

```sql
-- Create searchResults container with HPK
CREATE CONTAINER searchResults
  WITH (
    PARTITION_KEY = ["/tenantId", "/query"],
    UNIQUE_KEY = (paths: ["/tenantId", "/query", "/provider", "/searchedAt"])
  )
  WITH (
    DEFAULT_TTL = 2592000,  -- 30 days
    INDEXING_POLICY = {
      "automatic": true,
      "includedPaths": [...],
      "excludedPaths": [...]
    }
  );

-- Create searchProviders container
CREATE CONTAINER searchProviders
  WITH (PARTITION_KEY = "/id");

-- Create providerFallbackChains container
CREATE CONTAINER providerFallbackChains
  WITH (PARTITION_KEY = "/id");

-- Create webSearchConfigurations container
CREATE CONTAINER webSearchConfigurations
  WITH (PARTITION_KEY = "/tenantId");
```

---

## TypeScript Types

All types should be defined in `apps/api/src/types/web-search.types.ts`:

```typescript
// ========================================
// SHARD TYPES
// ========================================

export interface SearchResultShard {
  id: string;
  shardTypeId: "c_search";
  tenantId: string;
  createdBy: string;
  
  query: string;
  provider: "azure-ai-search" | "bing" | "google";
  searchedAt: Date;
  expiresAt: Date;
  
  searchConfig: {
    market?: string;
    safeSearch?: "off" | "moderate" | "strict";
    freshness?: "day" | "week" | "month";
    maxResults: number;
    autoTriggered: boolean;
  };
  
  results: SearchResult[];
  
  metadata: {
    totalMatches: number;
    executionTimeMs: number;
    resultCount: number;
    fromCache: boolean;
    cacheHitCount?: number;
    cost: number;
    relevanceScores: {
      min: number;
      max: number;
      avg: number;
    };
  };
  
  groundingMetadata: {
    domains: string[];
    freshResults: boolean;
    newsSources: boolean;
    academicSources: boolean;
    authoritative: boolean;
  };
  
  audit: {
    createdAt: Date;
    updatedAt: Date;
    accessCount: number;
    lastAccessedAt?: Date;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  displayUrl: string;
  
  publishedDate?: Date;
  dateLastCrawled?: Date;
  
  relevanceScore: number;
  provider: string;
  
  domain: string;
  isFresh: boolean;
  sourceType: "news" | "academic" | "blog" | "official" | "other";
  
  metadata?: {
    thumbnailUrl?: string;
    language?: string;
    author?: string;
    wordCount?: number;
    isFamilyFriendly?: boolean;
  };
}

// ========================================
// PROVIDER TYPES
// ========================================

export type SearchProvider = "azure-ai-search" | "bing" | "google";

export interface SearchProviderConfig {
  id: SearchProvider;
  name: string;
  description: string;
  
  enabled: boolean;
  priority: number;
  
  config: {
    endpoint?: string;
    maxResults?: number;
    defaultMarket?: string;
    defaultSafeSearch?: "off" | "moderate" | "strict";
    
    // Azure AI Search
    indexName?: string;
    semanticSearchEnabled?: boolean;
    
    // Bing
    subscriptionKeyVaultPath?: string;
    
    // Google
    customSearchEngineId?: string;
    subscriptionKeyVaultPath?: string;
  };
  
  pricing: {
    costPerQuery: number;
    includesInMonthlyFree?: number;
  };
  
  health: {
    isHealthy: boolean;
    lastHealthCheckAt?: Date;
    errorRate?: number;
    avgLatencyMs?: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface ProviderFallbackChain {
  id: string;
  tenantId?: string;
  
  chain: {
    provider: SearchProvider;
    priority: number;
    enabled: boolean;
    fallbackOn?: string[];
  }[];
  
  behavior: {
    maxAttempts: number;
    timeoutMs: number;
    retryDelay?: number;
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;
  };
}

// ========================================
// CONFIGURATION TYPES
// ========================================

export interface WebSearchConfig {
  id: string;                         // tenantId
  tenantId: string;
  
  // Enable/disable
  enabled: boolean;
  
  // Triggering behavior
  autoTrigger: {
    enabled: boolean;
    keywords: string[];               // Temporal keywords that trigger search
  };
  
  // Caching
  caching: {
    enabled: boolean;
    ttlSeconds: number;               // 30 days default (2592000 seconds)
  };
  
  // Quality filters
  quality: {
    minRelevanceScore: number;        // 0-1
    allowedDomains?: string[];        // Whitelist
    blockedDomains?: string[];        // Blacklist
    requireFreshResults: boolean;     // Only results < 7 days old?
  };
  
  // Result ranking
  ranking: {
    strategy: "relevance" | "freshness" | "authority";  // How to rank web vs internal
    webResultWeight: number;          // 0-1: how much to favor web results
  };
  
  // Privacy
  privacy: {
    anonymizeQueries: boolean;        // Remove PII before searching?
    logSearchQueries: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

// ========================================
// REQUEST/RESPONSE TYPES
// ========================================

export interface WebSearchRequest {
  query: string;
  maxResults?: number;
  market?: string;
  safeSearch?: "off" | "moderate" | "strict";
  freshness?: "day" | "week" | "month";
  explicitRequest?: boolean;
}

export interface WebSearchResponse {
  shard: SearchResultShard;
  cached: boolean;                    // From cache or fresh search?
  cost: number;                       // Total cost of this search
}

// ========================================
// ANALYTICS TYPES
// ========================================

export interface WebSearchUsageStats {
  totalSearches: number;
  totalCost: number;
  cacheHitRate: number;              // 0-1
  byProvider: {
    [key in SearchProvider]?: {
      searches: number;
      cost: number;
      errorRate: number;
    };
  };
  dailyBreakdown: Array<{
    date: string;
    searches: number;
    cost: number;
    cacheHits: number;
  }>;
}

export interface ProviderHealth {
  provider: SearchProvider;
  isHealthy: boolean;
  errorRate: number;
  avgLatencyMs: number;
  lastCheckedAt: Date;
  lastErrorMessage?: string;
}
```

---

## Web Search Service

### Service Implementation

The `WebSearchService` is the core orchestrator for all web search operations.

**Location**: `apps/api/src/services/web-search.service.ts`

```typescript
export class WebSearchService {
  private searchResultsContainer: Container;
  private providersContainer: Container;
  private fallbackChainsContainer: Container;
  private configContainer: Container;

  constructor(
    cosmosClient: CosmosClient,
    private keyVaultClient: SecretClient,
    private monitoring: IMonitoringProvider,
    databaseId: string
  ) {
    const database = cosmosClient.database(databaseId);
    this.searchResultsContainer = database.container("searchResults");
    this.providersContainer = database.container("searchProviders");
    this.fallbackChainsContainer = database.container("providerFallbackChains");
    this.configContainer = database.container("webSearchConfigurations");
  }

  // ==========================================
  // PUBLIC API - SEARCH OPERATIONS
  // ==========================================

  /**
   * Determine if web search should be triggered
   * Checks: explicit request, auto-trigger config, temporal keywords
   */
  async shouldTriggerWebSearch(
    query: string,
    tenantId: string,
    options?: {
      explicitRequest?: boolean;
      intentType?: string;
    }
  ): Promise<boolean>;

  /**
   * Search with automatic fallback chain
   * 1. Check cache (exact match: tenantId + query)
   * 2. Get fallback chain
   * 3. Try providers in order
   * 4. Store result as c_search shard
   * 5. Return to caller
   */
  async search(
    tenantId: string,
    query: string,
    userId: string,
    options?: {
      maxResults?: number;
      market?: string;
      safeSearch?: string;
      freshness?: string;
    }
  ): Promise<SearchResultShard>;

  /**
   * Get cached result or search and cache
   */
  async searchOrGetCached(
    tenantId: string,
    query: string,
    userId: string,
    options?: any
  ): Promise<SearchResultShard>;

  /**
   * Get previously cached search result
   * Uses HPK for single-partition lookup
   */
  async getCachedResult(
    tenantId: string,
    query: string
  ): Promise<SearchResultShard | null>;

  // ==========================================
  // PUBLIC API - PROVIDER MANAGEMENT
  // ==========================================

  /**
   * Get provider configuration
   */
  async getProviderConfig(providerId: SearchProvider): Promise<SearchProviderConfig>;

  /**
   * Get all providers
   */
  async listProviders(): Promise<SearchProviderConfig[]>;

  /**
   * Update provider configuration (Super Admin only)
   * Updates: enabled, priority, config, health
   */
  async updateProviderConfig(
    providerId: SearchProvider,
    updates: Partial<SearchProviderConfig>,
    updatedBy: string
  ): Promise<void>;

  /**
   * Get fallback chain
   * Returns global or tenant-specific chain
   */
  async getFallbackChain(tenantId?: string): Promise<ProviderFallbackChain>;

  /**
   * Update fallback chain (Super Admin only)
   */
  async updateFallbackChain(
    updates: Partial<ProviderFallbackChain>,
    updatedBy: string
  ): Promise<void>;

  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<ProviderHealth[]>;

  // ==========================================
  // PUBLIC API - TENANT CONFIGURATION
  // ==========================================

  /**
   * Get web search config for tenant
   */
  async getTenantConfig(tenantId: string): Promise<WebSearchConfig>;

  /**
   * Update web search config for tenant
   */
  async updateTenantConfig(
    tenantId: string,
    updates: Partial<WebSearchConfig>,
    updatedBy: string
  ): Promise<void>;

  // ==========================================
  // PUBLIC API - ANALYTICS
  // ==========================================

  /**
   * Get usage statistics
   */
  async getUsageStats(
    tenantId: string,
    days?: number
  ): Promise<WebSearchUsageStats>;

  /**
   * Get search results for a shard
   */
  async getSearchShard(shardId: string, tenantId: string): Promise<SearchResultShard>;
}
```

### Key Implementation Details

**Cache Lookup (HPK)**:
```typescript
async getCachedResult(tenantId: string, query: string): Promise<SearchResultShard | null> {
  // Uses HPK for single-partition query
  const { resources } = await this.searchResultsContainer.items
    .query({
      query: `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND c.query = @query
          AND c.expiresAt > GetCurrentTimestamp()
        LIMIT 1
      `,
      parameters: [
        { name: "@tenantId", value: tenantId },
        { name: "@query", value: query }
      ]
    })
    .fetchAll();

  return resources[0] || null;
}
```

**Fallback Chain Execution**:
```typescript
private async executeWithFallback(
  tenantId: string,
  query: string,
  options: any
): Promise<SearchResultShard> {
  const chain = await this.getFallbackChain(tenantId);
  
  for (const entry of chain.chain) {
    if (!entry.enabled) continue;
    
    try {
      return await this.executeSearch(entry.provider, query, options);
    } catch (error) {
      if (!this.shouldFallback(error, entry.fallbackOn)) {
        throw error;
      }
      // Try next provider
    }
  }
  
  throw new Error("All providers exhausted");
}
```

---

## Integration with Context Assembly

### Updated Context Assembler Service

The Context Assembler Service integrates web search results into the context pipeline.

```typescript
// apps/api/src/services/context-assembler.service.ts (updated)

export class ContextAssemblerService {
  constructor(
    private webSearchService: WebSearchService,  // ✅ INJECTED
    // ... other dependencies ...
  ) {}

  async assemble(
    templateId: string,
    scope: ContextScope,
    query: string,
    userId: string,
    options?: {
      maxTokens?: number;
      includeRAG?: boolean;
      includeWebSearch?: boolean;    // Explicit request
      maxWebResults?: number;
    }
  ): Promise<AssembledContext> {
    const startTime = Date.now();

    // ✅ NEW: Check if web search should be triggered
    const shouldWebSearch =
      options?.includeWebSearch ||
      (await this.webSearchService.shouldTriggerWebSearch(
        query,
        scope.tenantId,
        { explicitRequest: options?.includeWebSearch }
      ));

    let searchShard: SearchResultShard | undefined;
    let webContextChunks: ContextChunk[] = [];

    if (shouldWebSearch) {
      try {
        // Perform search or get from cache
        searchShard = await this.webSearchService.searchOrGetCached(
          scope.tenantId,
          query,
          userId,
          { maxResults: options?.maxWebResults || 5 }
        );

        // ✅ NEW: Add web results to context chunks
        webContextChunks = searchShard.results.map((result, index) => ({
          id: result.id,
          shardId: searchShard!.id,
          shardTypeId: "c_search",
          shardName: result.title,
          content: `${result.title}\n\n${result.snippet}`,
          relevance: result.relevanceScore,
          sourceType: "web_search" as const,
          metadata: {
            url: result.url,
            domain: result.domain,
            publishedDate: result.publishedDate?.toISOString(),
            isFresh: result.isFresh,
            sourceType: result.sourceType
          }
        }));

        // Add to related chunks
        related.push(...webContextChunks);

      } catch (error) {
        // Non-fatal: Log and continue without web results
        this.monitoring.trackException(error as Error, {
          operation: "context-assembly.web-search",
          tenantId: scope.tenantId
        });
      }
    }

    // ... rest of context assembly (RAG, graph traversal, etc.) ...

    return {
      // ... existing context fields ...
      searchShard,
      metadata: {
        // ... existing metadata ...
        webSearchPerformed: !!searchShard,
        webSearchQuery: query,
        webResultCount: searchShard?.results.length || 0,
        webSearchCost: searchShard?.metadata.cost || 0
      }
    };
  }
}
```

### Updated Context Chunk Type

```typescript
interface ContextChunk {
  // ... existing fields ...
  
  // ✅ NEW: Web search source tracking
  sourceType: "internal_rag" | "internal_graph" | "web_search";
  
  // ✅ NEW: Web-specific metadata
  metadata?: {
    // ... existing metadata ...
    url?: string;                     // For web results
    domain?: string;
    publishedDate?: string;
    isFresh?: boolean;
    sourceType?: "news" | "academic" | "blog" | "official" | "other";
  };
}

interface AssembledContext {
  // ... existing fields ...
  
  // ✅ NEW: Reference to search shard
  searchShard?: SearchResultShard;
  
  metadata: {
    // ... existing metadata ...
    webSearchPerformed: boolean;
    webSearchQuery?: string;
    webResultCount?: number;
    webSearchCost?: number;
  };
}
```

---

## Provider Management

### Super Admin Provider Configuration UI

**Route**: `/admin/web-search/providers`

**Capabilities**:
- View all providers (name, status, priority, costs)
- Enable/disable individual providers
- Configure provider API credentials (via Key Vault)
- Set provider priority in fallback chain
- Monitor provider health (error rate, latency)
- View cost breakdown by provider

### Configuration Form Components

**Provider Configuration Form**:
```
Provider: [Azure AI Search ▼]

Status: [✓ Enabled] [✗ Disabled]

Priority: [1 ▼] (1 = Primary, 2 = Secondary)

API Configuration:
  Endpoint: [https://...azure... ▼]
  Index Name: [web-index]
  Semantic Search: [✓ Enabled]
  Key Vault Path: [/web-search/azure-api-key]

Pricing:
  Cost per Query: [$0.02]
  Monthly Free Quota: [None]

Health Status:
  Status: [✓ Healthy] / [✗ Unhealthy]
  Last Check: [2025-01-15 10:30 UTC]
  Error Rate: [1.2%]
  Avg Latency: [342ms]

[Save Configuration]
```

---

## Configuration System

### Super Admin Configuration

**Route**: `/admin/ai-insights/web-search/settings`

**Global Settings**:
- Default TTL for search results (30 days)
- Auto-trigger keywords
- Cost budget limits
- Quality filter defaults
- Privacy/logging options

### Tenant Admin Configuration

**Route**: `/admin/ai-insights/web-search/tenant-settings`

**Per-Tenant Settings**:
- Enable/disable web search
- Auto-trigger vs. manual only
- TTL override
- Domain whitelist/blacklist
- Safe search level
- Result ranking strategy

---

## API Endpoints

### Search Operations

```
POST /api/v1/search
  - Perform web search or get cached results
  - Request: { query, explicitRequest?, maxResults?, market?, safeSearch? }
  - Response: { shard, cached }

GET /api/v1/search/{shardId}
  - Get cached search result shard
  - Response: SearchResultShard
```

### Provider Management (Super Admin)

```
GET /api/v1/admin/web-search/providers
  - List all providers
  - Response: { providers: SearchProviderConfig[] }

GET /api/v1/admin/web-search/providers/{providerId}
  - Get specific provider
  - Response: SearchProviderConfig

PATCH /api/v1/admin/web-search/providers/{providerId}
  - Update provider config
  - Request: { enabled?, priority?, config? }
  - Response: { success }

GET /api/v1/admin/web-search/fallback-chain
  - Get fallback chain
  - Response: ProviderFallbackChain

PUT /api/v1/admin/web-search/fallback-chain
  - Update fallback chain
  - Request: ProviderFallbackChain
  - Response: { success }

GET /api/v1/admin/web-search/health
  - Get provider health
  - Response: { providers: ProviderHealth[] }
```

### Configuration

```
GET /api/v1/admin/web-search/config
  - Get global web search config
  - Response: WebSearchConfig

PUT /api/v1/admin/web-search/config
  - Update global config
  - Request: Partial<WebSearchConfig>
  - Response: { success }

GET /api/v1/admin/web-search/tenant-config/{tenantId}
  - Get tenant-specific config
  - Response: WebSearchConfig

PUT /api/v1/admin/web-search/tenant-config/{tenantId}
  - Update tenant config
  - Request: Partial<WebSearchConfig>
  - Response: { success }
```

### Analytics

```
GET /api/v1/admin/web-search/usage
  - Get usage statistics
  - Query: { days?, tenantId? }
  - Response: WebSearchUsageStats

GET /api/v1/admin/web-search/usage/daily
  - Get daily usage breakdown
  - Query: { days? }
  - Response: Array<{ date, searches, cost }>
```

---

## UI Components

### Super Admin Provider Management UI

**Route**: `/admin/web-search/providers`

**Layout**:
1. **Provider List Table**
   - Provider name, enabled status, priority, costs
   - Health status (✓ Healthy / ✗ Error)
   - Last check time, error rate, latency
   - Edit/view buttons

2. **Provider Edit Panel**
   - Enable/disable toggle
   - Priority selector (1-10)
   - API credentials (via Key Vault)
   - Cost and quota settings
   - Save button

3. **Fallback Chain Configuration**
   - Drag-to-reorder provider priority
   - Enable/disable individual entries
   - Timeout and retry settings
   - Error code mapping

4. **Health Dashboard**
   - Provider health cards
   - Error rates over time
   - Latency trends
   - Cost breakdown

### Tenant Admin Web Search Configuration UI

**Route**: `/admin/ai-insights/web-search/config`

**Settings Tabs**:

1. **General**
   - Enable/disable web search
   - Auto-trigger vs. manual only
   - Default keywords

2. **Quality**
   - Min relevance score
   - Domain whitelist/blacklist
   - Freshness requirements

3. **Caching**
   - TTL duration
   - Cache size limits
   - Cache statistics

4. **Privacy**
   - Anonymize queries
   - Log search queries
   - Data retention

5. **Analytics**
   - Usage by provider
   - Cost tracking
   - Cache hit rate

---

## Examples & Workflows

### Workflow 1: Automatic Web Search Trigger

**Scenario**: User asks "What are the latest AI regulations?"

```
1. User submits query via chat
2. Intent Analyzer detects "latest" keyword
3. shouldTriggerWebSearch(query, tenantId) returns true
4. searchOrGetCached() called:
   a. getCachedResult() checks HPK
   b. No cache found
   c. Executes search via fallback chain
   d. Tries Azure AI Search → Success
   e. Creates c_search shard
   f. Stores in searchResults container
5. Context Assembler adds search results to context
6. Grounding Service generates web citations (🌐)
7. LLM generates response with both sources
8. User sees: "Based on recent articles and documents..."
```

### Workflow 2: Provider Fallback

**Scenario**: Azure AI Search times out, Bing takes over

```
1. search() called
2. getCachedResult() → no cache
3. executeWithFallback():
   a. Gets fallback chain
   b. Tries primary: Azure AI Search
   c. Timeout after 5000ms → Error
   d. Fallback condition met: ["timeout"]
   e. Waits 500ms
   f. Tries secondary: Bing Search API
   g. Success! Returns 5 results
4. Normalizes to common schema
5. Stores c_search shard with provider="bing"
6. Monitoring tracks fallback event
```

### Workflow 3: Cache Hit & Reuse

**Scenario**: Same query run 2 hours later

```
1. search() called with "latest AI regulations"
2. getCachedResult():
   a. Uses HPK to query single partition
   b. Finds existing c_search shard
   c. Checks expiresAt > now ✓
3. Returns immediately:
   - Same results
   - No API cost
   - Latency < 10ms
   - fromCache = true
4. Updates metrics:
   - accessCount++
   - lastAccessedAt = now
5. Context Assembler uses returned shard
6. User gets same results from cache
```

---

## Next Steps & Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create database containers with HPK schema
- [ ] Define TypeScript types
- [ ] Implement WebSearchService core
- [ ] Set up Key Vault integration

### Phase 2: Providers (Week 2)
- [ ] Implement Azure AI Search adapter
- [ ] Implement Bing Search API adapter
- [ ] Implement Google Custom Search adapter
- [ ] Test fallback chain

### Phase 3: Integration (Week 3)
- [ ] Integrate with Context Assembler
- [ ] Integrate with Grounding Service
- [ ] Update Intent Analyzer for triggers
- [ ] Add cache invalidation logic

### Phase 4: Management UI (Week 4)
- [ ] Super Admin provider configuration
- [ ] Tenant Admin settings
- [ ] Analytics dashboard
- [ ] Health monitoring

### Phase 5: Testing & Optimization (Week 5)
- [ ] Unit tests for WebSearchService
- [ ] Integration tests with providers
- [ ] Performance testing
- [ ] Cost optimization

---

## References

- [CONTEXT-ASSEMBLY.md](./CONTEXT-ASSEMBLY.md) - Integration point
- [GROUNDING.md](./GROUNDING.md) - Citation generation
- [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) - Code examples
- [README.md](./README.md) - Permissions & capabilities
