# Phase 2: Web Search & Deep Search - Implementation Plan

## Overview

This document outlines the complete implementation plan for Phase 2: Web Search & Deep Search system, which enables the AI Insights platform to search the web, scrape page content, and perform semantic analysis on external sources.

**Reference Specification**: See `/docs/features/ai-insights/WEB-SEARCH-DEEP-SEARCH.md` for complete architectural details (2,000+ lines).

## Phase Objectives

1. ✅ Implement multi-provider web search with intelligent fallback (SerpAPI → Bing)
2. ✅ Build deep search capability: async scraping of top 3 pages with content extraction
3. ✅ Create vector embeddings for semantic search (OpenAI text-embedding-3-small)
4. ✅ Store all results as first-class shards (c_search, c_webpages) with HPK
5. ✅ Integrate with recurring searches for automated monitoring
6. ✅ Provide real-time progress updates via WebSocket/SSE
7. ✅ Implement comprehensive UI components with widget support
8. ✅ Support project-scoped search in chat conversations

## Implementation Timeline

**Estimated Duration**: 3-4 weeks

**Breakdown:**
- Database Layer: 2-3 days
- Service Layer: 5-7 days
- API Layer: 3-4 days
- UI Components: 4-5 days
- Integration & Testing: 3-4 days
- Documentation & Polish: 2-3 days

## Phase Phases & Checkpoints

### Phase 2.1: Foundation (Days 1-3)
**Goal**: Database and core service infrastructure

#### Database Setup
- [ ] Create `c_search` container with HPK: `/tenantId`, `/queryHash`, `/id`
- [ ] Create `c_webpages` container with HPK: `/tenantId`, `/projectId`, `/sourceQuery`
- [ ] Configure composite indexes for query patterns
- [ ] Configure vector indexes for embedding similarity search
- [ ] Set TTL policies (30 days for both containers)
- [ ] Create container initialization script

#### Core Services
- [ ] Implement `SearchProviderFactory` with health checks
- [ ] Implement `SerpAPIProvider` (primary search provider)
- [ ] Implement `BingSearchProvider` (fallback provider)
- [ ] Implement `WebSearchService` with query deduplication

**Checkpoint**: Containers created, providers can execute search queries

### Phase 2.2: Deep Search Services (Days 4-7)
**Goal**: Content scraping and embedding pipeline

#### Services
- [ ] Implement `WebScraperService` (Cheerio + Axios)
  - [ ] Page fetching with timeout handling
  - [ ] HTML parsing and clean text extraction
  - [ ] Unwanted element removal (scripts, styles, nav, ads)
  
- [ ] Implement `ContentChunkingService`
  - [ ] Semantic sentence-based chunking
  - [ ] 512-token limit per chunk
  - [ ] Token counting and validation
  
- [ ] Implement `EmbeddingService`
  - [ ] OpenAI text-embedding-3-small integration
  - [ ] Batch embedding for efficiency
  - [ ] Caching to reduce API calls
  - [ ] Cost tracking per tenant

#### Integration
- [ ] Create c_webpages shard creation pipeline
- [ ] Link shards to recurring searches
- [ ] Implement TTL management

**Checkpoint**: Can scrape URLs, chunk content, and generate embeddings

### Phase 2.3: API Endpoints (Days 8-11)
**Goal**: REST endpoints with streaming and WebSocket support

#### Endpoints
- [ ] `POST /api/v1/insights/search` - Synchronous search with optional deep search
- [ ] `GET /api/v1/insights/search/{shardId}` - Retrieve cached search results
- [ ] `POST /api/v1/chat/search` - Deep search with project scoping
- [ ] `POST /api/v1/recurring-search` - Create/execute recurring searches
- [ ] WebSocket upgrade support for progress updates

#### Features
- [ ] Request validation (Zod schemas)
- [ ] Authentication and authorization
- [ ] Rate limiting per tenant
- [ ] Error handling and retries
- [ ] Cost tracking and quota enforcement

**Checkpoint**: All endpoints working with proper validation and auth

### Phase 2.4: UI Components (Days 12-16)
**Goal**: React components with widget support

#### Components
- [ ] `SearchInput` - Query builder with filters
- [ ] `SearchResults` - Display results with citations
- [ ] `DeepSearchToggle` - Enable/disable with page depth config
- [ ] `ScrapingProgress` - Real-time scraping indicator
- [ ] `RecurringSearchForm` - Recurring search configuration
- [ ] `SearchStatistics` - Metrics and performance display
- [ ] `WebPagePreview` - Scraped content visualization

#### Widget Support
- [ ] `isWidget` prop for widget mode
- [ ] `widgetSize` configuration (small/medium/large/full)
- [ ] `widgetConfig` for customization
- [ ] Responsive design for all sizes
- [ ] Export functionality

**Checkpoint**: All components work standalone and as widgets

### Phase 2.5: Integration & Testing (Days 17-19)
**Goal**: End-to-end integration and comprehensive testing

#### Integration
- [ ] Context Assembly integration
- [ ] Grounding Service integration
- [ ] Recurring Search system integration
- [ ] Cost tracking implementation

#### Testing
- [ ] Unit tests for all services (80%+ coverage)
- [ ] Integration tests for all endpoints
- [ ] Component tests for all UI elements
- [ ] Provider fallback testing
- [ ] WebSocket communication testing
- [ ] Performance testing

**Checkpoint**: All features working end-to-end with tests passing

### Phase 2.6: Documentation & Polish (Days 20-21)
**Goal**: Complete documentation and optimization

#### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Service implementation examples
- [ ] Database schema documentation
- [ ] Troubleshooting guide
- [ ] Performance tuning guide

#### Polish
- [ ] Code review and cleanup
- [ ] Performance optimization
- [ ] Security audit
- [ ] Error message review
- [ ] Mobile testing

## Database Schema

### c_search Container

**HPK**: `/tenantId`, `/queryHash`, `/id`

```typescript
interface SearchResultShard {
  id: string;
  shardTypeId: 'c_search';
  tenantId: string;
  queryHash: string;
  
  query: string;
  provider: 'serpapi' | 'bing' | 'google';
  searchedAt: Date;
  expiresAt: Date;
  
  searchConfig: {
    market?: string;
    safeSearch?: 'off' | 'moderate' | 'strict';
    maxResults: number;
    autoTriggered: boolean;
  };
  
  results: SearchResult[];
  
  metadata: {
    totalMatches: number;
    executionTimeMs: number;
    resultCount: number;
    fromCache: boolean;
    cost: number;
    relevanceScores: { min: number; max: number; avg: number };
  };
  
  groundingMetadata: {
    domains: string[];
    freshResults: boolean;
    newsSources: boolean;
    authoritative: boolean;
  };
  
  audit: {
    createdAt: Date;
    updatedAt: Date;
    accessCount: number;
    lastAccessedAt?: Date;
  };
  
  ttl: 2592000; // 30 days
}
```

### c_webpages Container

**HPK**: `/tenantId`, `/projectId`, `/sourceQuery`

```typescript
interface WebPageShard {
  id: string;
  shardTypeId: 'c_webpages';
  tenantId: string;
  projectId: string;
  sourceQuery: string;
  
  url: string;
  title?: string;
  author?: string;
  publishDate?: string;
  
  structuredData: {
    url: string;
    content: string;
    contentLength: number;
  };
  
  embedding: {
    model: 'text-embedding-3-small';
    dimensions: 1536;
    chunks: Array<{
      text: string;
      embedding: number[];
      startIndex: number;
      tokenCount: number;
    }>;
  };
  
  metadata: {
    searchType: 'google' | 'bing' | 'news' | 'finance' | 'web';
    scrapedAt: Date;
    scrapeDuration: number;
    extractionSuccess: boolean;
  };
  
  expiresAt: Date;
  ttl: 2592000; // 30 days
  
  executionId: string;
  recurringSearchId?: string;
  conversationId?: string;
  
  audit: {
    createdAt: Date;
    updatedAt: Date;
    accessCount: number;
  };
}
```

## Service Layer Architecture

### Service Dependencies

```
WebSearchService
  ├── SearchProviderFactory
  │   ├── SerpAPIProvider
  │   ├── BingSearchProvider
  │   └── GoogleProvider
  ├── AIInsightsCosmosService (for c_search storage)
  └── Logger

WebScraperService
  ├── Cheerio (HTML parsing)
  ├── Axios (HTTP client)
  ├── ContentChunkingService
  ├── EmbeddingService
  ├── AIInsightsCosmosService (for c_webpages storage)
  └── Logger

ContentChunkingService
  ├── Langchain (text splitters)
  └── Token counter

EmbeddingService
  ├── OpenAI API client
  ├── Redis (for caching)
  └── Logger
```

## API Endpoints

### Web Search

**POST /api/v1/insights/search**
```typescript
{
  query: string;
  deepSearch?: {
    enabled: boolean;
    pageDepth?: number;    // default: 3, max: 10
    timeout?: number;      // default: 10000ms
  };
  filters?: {
    domain?: string[];
    excludeDomain?: string[];
    freshness?: 'day' | 'week' | 'month';
  };
  maxResults?: number;    // default: 10
}

// Response (immediate)
{
  executionId: string;
  snippets: SearchResult[];
  totalMatches: number;
  scrapingStarted?: boolean;
}
```

**GET /api/v1/insights/search/{shardId}**
```typescript
// Retrieve cached search results with full c_search shard data
```

### Chat Search

**POST /api/v1/chat/search**
```typescript
{
  query: string;
  projectId: string;
  conversationId?: string;
  deepSearch: {
    enabled: boolean;
    pageDepth?: number;
  };
}

// WebSocket updates:
// { type: 'initial-results', results: [...] }
// { type: 'scraping-progress', page: 1, status: 'completed' }
// { type: 'scraping-complete', totalPages: 3 }
```

### Recurring Search

**POST /api/v1/recurring-search**
```typescript
{
  name: string;
  query: string;
  dataSources: {
    rag: boolean;
    webSearch: boolean;
    deepSearch?: {
      enabled: boolean;
      pageDepth?: number;
    };
  };
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    timezone: string;
  };
}
```

## Testing Strategy

### Unit Tests (Services)
- Provider fallback logic
- HTML scraping with various structures
- Semantic chunking with edge cases
- Embedding generation and caching
- HPK query building
- TTL management

### Integration Tests (APIs)
- End-to-end search flow
- Deep search async flow
- WebSocket progress updates
- Rate limiting
- Quota enforcement
- Authentication/authorization

### Component Tests (UI)
- SearchInput functionality
- SearchResults rendering
- DeepSearchToggle interaction
- ScrapingProgress updates
- Form validation
- Widget rendering

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|-----------------|
| Initial search result | <1s | SerpAPI/Bing synchronous |
| Per-page scraping | 1-2s | Cheerio optimization |
| Total for 3 pages | 5-8s | Parallel async operations |
| Embedding generation | <2s | Batch API calls |
| Vector similarity search | <100ms | Index optimization |
| Search result cache | 30 days | TTL policies |

## Cost Estimation

| Component | Cost |
|-----------|------|
| SerpAPI (primary) | $0.002/query |
| Bing Search API (fallback) | Free (with limits) |
| Page scraping (Cheerio) | $0 |
| Embeddings (OpenAI) | $0.02/million tokens |
| Cosmos DB (c_search + c_webpages) | ~$10-20/month |
| **Total per search execution** | **~$0.002** |
| **Monthly (300 searches)** | **~$0.60** |

## Success Criteria

Phase 2 is complete when:
- [ ] All database containers created and tested
- [ ] All services implemented and tested (unit tests > 80%)
- [ ] All API endpoints functional with validation
- [ ] WebSocket/SSE streaming working
- [ ] All UI components created and tested
- [ ] Widget components working in dashboard
- [ ] Integration with existing services complete
- [ ] End-to-end testing passing
- [ ] Documentation complete with examples
- [ ] Code review completed
- [ ] Performance optimized
- [ ] Security audit passed
- [ ] Ready for production deployment

## Next Steps

1. **Immediate**: Create container initialization scripts
2. **Day 1-2**: Implement SearchProviderFactory and providers
3. **Day 3-4**: Implement WebSearchService
4. **Day 5-7**: Implement scraping and embedding services
5. **Day 8-11**: Implement API endpoints
6. **Day 12-16**: Build UI components
7. **Day 17-19**: Integration and testing
8. **Day 20-21**: Documentation and polish

---

**Status**: Ready to begin Phase 2.1 (Foundation)

**Last Updated**: December 5, 2025
