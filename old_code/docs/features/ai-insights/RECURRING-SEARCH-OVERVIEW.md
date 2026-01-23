# AI Insights: Recurring Search - Overview

## Overview

The Recurring Search system enables users, Tenant Admins, and Super Admins to configure automated searches that run on predefined schedules (hourly, daily, weekly, monthly, quarterly, or yearly). The system automatically detects significant changes in results using LLM-based analysis and notifies users of important updates through multiple channels.

**Key Capabilities:**
- **Automated Execution**: Schedule searches to run automatically at specified intervals
- **Multi-Source Search**: Query internal RAG (Cosmos DB), web search providers, or both
- **Deep Web Search**: Automatically scrape and analyze content from search results (3 pages by default)
- **AI-Powered Alerts**: LLM analyzes result deltas and identifies significant changes
- **Learning System**: Continuously improves alert accuracy based on user feedback
- **Multi-Channel Notifications**: Email, in-app, webhook, push notifications, Slack, Teams
- **Quota Management**: Configurable limits per tenant with Super Admin overrides
- **Team Collaboration**: Share recurring searches with team members
- **Comprehensive Analytics**: Track alert accuracy, false positives, and search performance

## Table of Contents

1. [Architecture](#architecture)
2. [System Components](#system-components)
3. [Search Execution Flow](#search-execution-flow)
4. [Search Types](#search-types)
5. [Deep Web Search](#deep-web-search)
6. [Scheduling System](#scheduling-system)
7. [Data Sources](#data-sources)
8. [Quota System](#quota-system)
9. [Access Control](#access-control)
10. [Data Retention](#data-retention)
11. [Integration Points](#integration-points)
12. [Related Documentation](#related-documentation)

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Recurring Search System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Schedule   │      │   Search     │      │    Alert     │  │
│  │   Manager    │─────▶│   Executor   │─────▶│   Detector   │  │
│  │ (Azure Func) │      │   (Queue)    │      │    (LLM)     │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      │          │
│         ▼                      ▼                      ▼          │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │  Recurring   │      │    Search    │      │    Alert     │  │
│  │  Searches    │      │   Results    │      │ Notifications│  │
│  │  Container   │      │  (c_search)  │      │  Container   │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                    ┌─────────▼─────────┐
                    │  Notification     │
                    │  Dispatcher       │
                    │  (Multi-Channel)  │
                    └───────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐
    │  Email   │        │  In-App  │       │ Webhook  │
    └──────────┘        └──────────┘       └──────────┘
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐
    │   Push   │        │  Slack   │       │  Teams   │
    └──────────┘        └──────────┘       └──────────┘
```

### Component Interaction

**1. Schedule Manager (Azure Functions Timer Trigger)**
- Runs every minute to check for due searches
- Queries `recurringSearches` container for active searches
- Enqueues search execution jobs
- Handles timezone conversions
- Tracks execution history

**2. Search Executor (Queue-Based Worker)**
- Processes search execution jobs from queue
- Routes to appropriate data source (RAG, web, or hybrid)
- Always fetches fresh results for web searches (no cache)
- Implements retry logic with exponential backoff
- Stores results in c_search shards
- Triggers alert detection after successful execution

**3. Alert Detector (LLM-Based Analysis)**
- Compares new results with previous execution
- Uses LLM to perform delta analysis
- Applies user-defined detection prompts
- Calculates confidence scores (0-1)
- Checks volume thresholds
- Generates AI summaries of changes
- Creates alert records if criteria met

**4. Learning System**
- Collects user feedback (relevant/irrelevant)
- Analyzes feedback patterns across searches
- Refines alert detection prompts automatically
- Adjusts sensitivity levels (low/medium/high)
- Tracks false positive rates
- Provides recommendations to Tenant Admins

**5. Notification Dispatcher**
- Reads alert records from database
- Routes to appropriate notification channels
- Handles delivery failures with retries
- Supports digest mode (batched notifications)
- Tracks delivery status
- Manages user notification preferences

## System Components

### Core Services

#### RecurringSearchService
**Location**: `apps/api/src/services/recurring-search.service.ts`

**Responsibilities**:
- CRUD operations for recurring searches
- Schedule validation and management
- Search execution orchestration
- Result history retrieval
- Quota enforcement
- Access control (user ownership, team sharing)

**Key Methods**:
- `createRecurringSearch()`: Validates config, checks quota, creates record
- `updateRecurringSearch()`: Updates search configuration
- `pauseSearch()` / `resumeSearch()`: Controls execution
- `deleteSearch()`: Removes search and cleans up data
- `executeSearch()`: Orchestrates search execution
- `getExecutionHistory()`: Retrieves past results

#### AlertAnalysisService
**Location**: `apps/api/src/services/alert-analysis.service.ts`

**Responsibilities**:
- Delta analysis between search results
- LLM-based change detection
- Confidence score calculation
- Alert record creation
- User feedback processing
- Prompt refinement based on learning

**Key Methods**:
- `analyzeSearchResults()`: Main delta analysis entry point
- `calculateConfidence()`: Computes alert confidence score
- `processUserFeedback()`: Records and learns from feedback
- `refineDetectionPrompts()`: Updates prompts based on patterns
- `generateAlertSummary()`: Creates human-readable alert text

#### NotificationService
**Location**: `apps/api/src/services/notification.service.ts`

**Responsibilities**:
- Multi-channel notification delivery
- User preference management
- Digest mode compilation
- Delivery tracking
- Retry handling

**Key Methods**:
- `sendAlertNotification()`: Delivers alert through user's preferred channels
- `sendDigest()`: Sends batched notifications
- `trackDelivery()`: Records delivery status
- `retryFailed()`: Reprocesses failed notifications

See: [NOTIFICATIONS.md](./NOTIFICATIONS.md) for detailed notification system documentation.

### Azure Functions

#### RecurringSearchScheduler
**Trigger**: Timer (every 1 minute)
**Location**: `apps/api/src/functions/recurring-search-scheduler.ts`

```typescript
import { app, Timer } from '@azure/functions';

app.timer('recurringSearchScheduler', {
  schedule: '0 * * * * *', // Every minute
  handler: async (timer: Timer, context) => {
    // 1. Get current time in UTC
    const now = new Date();
    
    // 2. Query for active searches that are due
    const dueSearches = await recurringSearchService.getDueSearches(now);
    
    // 3. Enqueue execution jobs
    for (const search of dueSearches) {
      await searchQueue.enqueue({
        searchId: search.id,
        tenantId: search.tenantId,
        userId: search.userId,
        scheduledTime: now.toISOString()
      });
    }
    
    context.log(`Enqueued ${dueSearches.length} searches`);
  }
});
```

#### SearchExecutionWorker
**Trigger**: Queue (searchExecutionQueue)
**Location**: `apps/api/src/functions/search-execution-worker.ts`

```typescript
import { app, InvocationContext } from '@azure/functions';

app.storageQueue('searchExecutionWorker', {
  queueName: 'search-execution-queue',
  connection: 'AzureWebJobsStorage',
  handler: async (queueItem: any, context: InvocationContext) => {
    const { searchId, tenantId, userId, scheduledTime } = queueItem;
    
    try {
      // 1. Execute search
      const results = await recurringSearchService.executeSearch(
        searchId, 
        tenantId, 
        userId
      );
      
      // 2. Trigger alert detection
      await alertAnalysisService.analyzeSearchResults(
        searchId,
        results
      );
      
      context.log(`Successfully executed search ${searchId}`);
    } catch (error) {
      context.log.error(`Failed to execute search ${searchId}:`, error);
      throw error; // Trigger queue retry
    }
  }
});
```

## Search Execution Flow

### Complete Execution Sequence

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. SCHEDULE CHECK (Every Minute)                                 │
│    - Azure Function Timer Trigger fires                          │
│    - Query recurringSearches for active searches                 │
│    - Filter by nextExecutionTime <= now                          │
│    - Consider tenant timezone offset                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. JOB ENQUEUE                                                   │
│    - Create execution job record                                 │
│    - Add to Azure Storage Queue                                  │
│    - Update nextExecutionTime on search                          │
│    - Increment executionCount                                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. SEARCH EXECUTION (Queue Worker)                               │
│    - Dequeue job from queue                                      │
│    - Load search configuration                                   │
│    - Determine data sources (RAG, web, hybrid)                   │
│    - Execute queries:                                            │
│      • RAG: Query relevant c_* shards (including c_search)       │
│      • Web: Query configured providers (always fresh)            │
│      • Hybrid: Merge RAG + Web results                           │
│    - Apply filters and ranking                                   │
│    - Store results in c_search shard                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. ALERT DETECTION                                               │
│    - Load previous execution results                             │
│    - Perform LLM delta analysis:                                 │
│      • Compare new vs. previous results                          │
│      • Apply search type-specific detection logic                │
│      • Use user-defined detection prompts                        │
│      • Calculate confidence score                                │
│    - Check thresholds:                                           │
│      • Confidence >= configured threshold                        │
│      • Result count change >= volume threshold                   │
│    - Generate AI summary if alert triggered                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. NOTIFICATION DISPATCH (if alert triggered)                    │
│    - Create alert record in notifications container              │
│    - Determine notification channels from user preferences       │
│    - Check digest mode setting:                                  │
│      • Immediate: Send notifications now                         │
│      • Digest: Add to daily batch                                │
│    - Send through each channel:                                  │
│      • Email: Azure Communication Services                       │
│      • In-App: Write to notifications container                  │
│      • Webhook: HTTP POST to user URL                            │
│      • Push: APNs/FCM via Azure Notification Hubs                │
│      • Slack: Slack Web API                                      │
│      • Teams: Microsoft Graph API                                │
│    - Track delivery status                                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. STATISTICS UPDATE                                             │
│    - Increment execution counters                                │
│    - Update alert metrics                                        │
│    - Calculate performance stats                                 │
│    - Update quota usage                                          │
│    - Record costs                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Error Handling & Retries

**Queue Processing**:
- **Max Retry Attempts**: 5
- **Backoff Strategy**: Exponential (1s, 2s, 4s, 8s, 16s)
- **Poison Queue**: After max retries, move to `search-execution-queue-poison`
- **Dead Letter Processing**: Separate function to analyze failures

**Search Provider Failures**:
- Use fallback chain for web search providers
- If all providers fail, log error and retry entire job
- Do not create alert on search failure

**Notification Failures**:
- Retry each channel independently up to 3 times
- Mark channel as failed after max retries
- Continue with other channels
- Notify user via alternative channel if primary fails

## Search Types

The system supports different search types, each with optimized detection logic:

### 1. Sales Opportunity
**Purpose**: Detect new business opportunities, buyer signals, expansion possibilities

**Detection Focus**:
- New company mentions or initiatives
- Budget announcements
- Technology adoption signals
- Hiring patterns
- Partnership announcements

**Example Queries**:
- "companies adopting [technology] in [region]"
- "[industry] companies seeking [solution]"
- "organizations with [budget] for [category]"

### 2. Risk Detection
**Purpose**: Identify threats, negative sentiment, competitive risks

**Detection Focus**:
- Negative news mentions
- Security incidents
- Regulatory investigations
- Customer complaints
- Service outages

**Example Queries**:
- "security breaches in [industry]"
- "lawsuits against [company]"
- "negative reviews of [product]"

### 3. Competitor Threat
**Purpose**: Monitor competitive activities, product launches, market moves

**Detection Focus**:
- Product announcements
- Pricing changes
- New partnerships
- Market expansion
- Customer wins/losses

**Example Queries**:
- "[competitor] new product launch"
- "[competitor] partnership with [company]"
- "[competitor] pricing changes"

### 4. Regulatory
**Purpose**: Track compliance changes, new regulations, policy updates

**Detection Focus**:
- New legislation
- Regulatory announcements
- Compliance deadlines
- Industry standards updates
- Policy changes

**Example Queries**:
- "GDPR enforcement actions [date]"
- "new [industry] regulations [region]"
- "[regulatory body] announcements"

### 5. Custom
**Purpose**: User-defined search types with custom detection logic

**Detection Focus**: User-specified

**Configuration**: Users provide custom detection prompts and thresholds

## Deep Web Search

### Overview

Deep Web Search automatically scrapes and analyzes content from search results, providing comprehensive page content rather than just search snippets. This enables more intelligent alert detection based on full-page context and content-based embeddings.

**Key Features:**
- **Automatic Page Scraping**: Extract full content from top search results
- **Default 3-Page Deep Dive**: Scrape first 3 pages by default (configurable)
- **Async Scraping**: Initial search results return quickly (<1s), scraping happens in background
- **Content Embeddings**: Generate vector embeddings for chunked page content
- **Semantic Search**: Find relevant content using vector similarity search
- **Real-Time Progress**: WebSocket/SSE updates for long-running scraping operations
- **Smart Content Extraction**: Clean text only, removing HTML, scripts, navigation

### How Deep Search Works

**Execution Sequence:**

```
1. USER INITIATES SEARCH
   └─ Recurring search execution triggered
   
2. INITIAL SEARCH (Synchronous, <1s)
   └─ Query SerpAPI or Bing
   └─ Return search snippets to user
   └─ Begin async scraping phase
   
3. BACKGROUND SCRAPING (Async, 5-8s total)
   └─ For each of top 3 results:
      ├─ Fetch full page HTML (Axios)
      ├─ Extract clean text (Cheerio)
      ├─ Split into 512-token chunks
      ├─ Generate embeddings (OpenAI)
      └─ Store as c_webpages shard
   
4. REAL-TIME UPDATES
   └─ Send WebSocket messages as pages complete
   └─ Client displays progress: "Scraping page 2 of 3..."
   └─ User can interact with initial results meanwhile
   
5. ALERT DETECTION ENHANCED
   └─ LLM analysis now uses full page content
   └─ Vector search finds semantic similarities
   └─ Higher confidence alert scores
   └─ Better contextual summaries with citations
```

### Configuration Options

**Deep Search Settings** (per recurring search):

```typescript
interface DeepSearchConfig {
  enabled: boolean;              // Enable/disable deep search
  pageDepth: number;             // How many pages to scrape (default: 3, max: 10)
  extractionMethod: 'text-only'  // Current: text-only (no HTML structure)
  chunkSize: number;             // Token limit per chunk (default: 512)
  minContentLength: number;       // Skip pages with <100 chars of content
  timeout: number;               // Max 30s per page (default: 10s)
}
```

**Example Configuration:**

```typescript
// Competitor monitoring with aggressive deep search
const deepSearchConfig: DeepSearchConfig = {
  enabled: true,
  pageDepth: 5,        // Scrape top 5 pages
  chunkSize: 512,
  minContentLength: 200,
  timeout: 15000       // 15 second timeout per page
};

// Default risk detection (moderate deep search)
const riskDeepSearch: DeepSearchConfig = {
  enabled: true,
  pageDepth: 3,        // Standard 3 pages
  chunkSize: 512,
  minContentLength: 100,
  timeout: 10000
};
```

### Content Storage (c_webpages Shards)

Deep search results are stored in `c_webpages` shard type with the following structure:

```typescript
interface WebPageShard {
  // Shard metadata
  id: string;
  shardType: 'c_webpages';
  tenantId: string;
  projectId: string;
  
  // Partition key components
  sourceQuery: string;     // Original search query
  
  // Page data
  url: string;
  title?: string;
  author?: string;
  publishDate?: string;
  
  // Content
  structuredData: {
    url: string;
    content: string;       // Clean text, no HTML
    contentLength: number;
  };
  
  // Embeddings
  embedding: {
    model: 'text-embedding-3-small';
    dimensions: 1536;
    chunks: Array<{
      text: string;        // Chunk text (max 512 tokens)
      embedding: number[]; // Vector [1536 dimensions]
      startIndex: number;  // Position in original content
      tokenCount: number;  // Actual token count
    }>;
  };
  
  // Metadata
  metadata: {
    searchType: 'google' | 'bing' | 'news' | 'finance' | 'web';
    scrapedAt: Date;
    scrapeDuration: number;      // ms to scrape
    extractionSuccess: boolean;
  };
  
  // Lifecycle
  expiresAt: Date;        // +30 days from creation
  ttl: number;            // 2592000 (30 days in seconds)
  
  // Relationships
  recurringSearchId?: string;
  conversationId?: string;
  executionId: string;    // Link to search execution
}
```

**Partition Key Strategy:**

```
Hierarchical Partition Key: [tenantId, projectId, sourceQuery]
```

**Benefits:**
- **Multi-tenant isolation**: Data scoped to tenant
- **Project organization**: Group pages by project/search area
- **Query optimization**: Range queries on source query for deduplication
- **Hot partition prevention**: Even distribution across [tenantId, projectId] combinations
- **Dynamic page limits**: Easily implement per-search page limits without reindexing

### Search Type Support

Deep search is **enabled by default** for web search in all recurring search types:

| Search Type | Deep Search | Use Case |
|------------|-------------|----------|
| Sales Opportunity | ✅ Enabled | Extract detailed company info, initiative details |
| Risk Detection | ✅ Enabled | Analyze negative news articles, incident reports |
| Competitor Threat | ✅ Enabled | Deep dive on competitor announcements, product pages |
| Regulatory | ✅ Enabled | Extract regulatory text, compliance requirements |
| Custom | ✅ Enabled | User-defined deep search behavior |

### Performance Characteristics

**Latency:**
- **Initial search result**: <1 second (SerpAPI/Bing)
- **Per-page scraping**: 1-2 seconds (Cheerio)
- **Total for 3 pages**: 5-8 seconds (runs in background)
- **Embedding generation**: 2-3 seconds (batched)

**Throughput:**
- **Search rate**: 100 req/s (limited by provider)
- **Scraping rate**: 30 pages/s (Cheerio-based)
- **Embedding rate**: 50 pages/s (OpenAI API)

**Storage:**
- **Per page**: ~20-50 KB (average: 35 KB)
- **3 pages + embeddings**: ~150 KB per search execution
- **Monthly (10 searches/day)**: ~45 MB per tenant

### API Integration

When executing a recurring search with deep search enabled:

```typescript
// Recurring search execution
const execution = await recurringSearchService.executeSearch({
  searchId: 'recurring-123',
  tenantId: 'tenant-456',
  deepSearch: {
    enabled: true,
    pageDepth: 3
  }
});

// Returns immediately with initial results
{
  executionId: 'exec-789',
  status: 'initial-results-ready',
  snippets: [...],  // Quick search results
  scrapingStarted: true
}

// Client receives WebSocket updates:
// { type: 'scraping-progress', page: 1, status: 'completed' }
// { type: 'scraping-progress', page: 2, status: 'in-progress' }
// { type: 'scraping-progress', page: 3, status: 'in-progress' }
// { type: 'scraping-complete', totalPages: 3, totalContent: '150KB' }
```

### Cost Estimation

**API Costs** (per search execution):

| Component | Cost | Volume |
|-----------|------|--------|
| Search query (SerpAPI) | $0.002 | 1 req |
| Page scraping (Cheerio) | $0 | 3 pages |
| Embeddings (OpenAI) | $0.00003 | per token (~15K tokens) = $0.45 per 1M tokens |
| Storage (Cosmos DB) | $0.25/100GB | 150KB = negligible |
| **Total per execution** | **~$0.002** | — |
| **Daily (10 searches)** | **~$0.02** | — |
| **Monthly (300 searches)** | **~$0.60** | — |

### Related Documentation

- [WEB-SEARCH-DEEP-SEARCH.md](./WEB-SEARCH-DEEP-SEARCH.md) - Complete deep search system architecture
- [WEB-SEARCH.md](./WEB-SEARCH.md) - Web search provider configuration
- [RECURRING-SEARCH-DATABASE.md](./RECURRING-SEARCH-DATABASE.md) - c_webpages container schema

## Scheduling System

### Supported Frequencies

| Frequency | Cron Expression | Example |
|-----------|----------------|---------|
| Hourly | `0 * * * *` | Every hour at :00 |
| Daily | `0 9 * * *` | Every day at 9:00 AM |
| Weekly | `0 9 * * 1` | Every Monday at 9:00 AM |
| Monthly | `0 9 1 * *` | First day of month at 9:00 AM |
| Quarterly | `0 9 1 1,4,7,10 *` | First day of Jan/Apr/Jul/Oct at 9:00 AM |
| Yearly | `0 9 1 1 *` | January 1st at 9:00 AM |

### Timezone Handling

- All searches execute in the **tenant's configured timezone**
- Stored as UTC offset in tenant settings
- Converted during schedule evaluation
- Users see schedules in their local timezone in UI

**Example**:
```typescript
// Tenant timezone: America/New_York (UTC-5)
// User sets daily search for 9:00 AM local time
// Stored as: "0 14 * * *" (UTC)
```

### Schedule Configuration

```typescript
interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time?: string;           // HH:mm in tenant timezone (e.g., "09:00")
  dayOfWeek?: number;      // 0-6 (Sunday-Saturday) for weekly
  dayOfMonth?: number;     // 1-31 for monthly
  monthsOfYear?: number[]; // [1,4,7,10] for quarterly
  timezone: string;        // IANA timezone (e.g., "America/New_York")
}
```

## Data Sources

### 1. Internal RAG (Cosmos DB Shards)

**Query Scope**: All accessible c_* shards for the tenant
- c_tenant (tenant information)
- c_user (user information)
- c_search (previous search results, web search cache)
- c_custom (custom uploaded documents)
- Other tenant-specific shards

**Advantages**:
- Fast retrieval
- No external API costs
- Private data access
- Historical context

**Use Cases**:
- Internal document monitoring
- CRM data tracking
- Knowledge base updates

### 2. Web Search (External Providers)

**Supported Providers**:
- Azure AI Search (Bing Web Search API)
- Google Custom Search API
- Serper API
- SerpAPI

**Always Fresh**: Web searches **always query providers** (no cached results used)

**Advantages**:
- Current information
- Wide coverage
- Public data access

**Use Cases**:
- Market monitoring
- Competitor tracking
- News monitoring
- Regulatory updates

### 3. Hybrid (RAG + Web)

**Query Process**:
1. Execute RAG query on internal shards
2. Execute web search on configured providers
3. Merge and deduplicate results
4. Apply unified ranking

**Advantages**:
- Best of both worlds
- Comprehensive coverage
- Internal + external context

**Use Cases**:
- Due diligence
- Comprehensive research
- Cross-source verification

## Quota System

### Default Quotas

| Metric | Default Limit | Super Admin Override |
|--------|--------------|---------------------|
| Recurring Searches per Tenant | 10 | ✅ Yes |
| Executions per Search per Day | 24 (hourly max) | ✅ Yes |
| Total Executions per Tenant per Day | 240 | ✅ Yes |
| Web Search Queries per Execution | 10 | ✅ Yes |
| Alert Notifications per Day | 100 | ✅ Yes |
| API Rate Limit (user) | 60/min | ✅ Yes |
| API Rate Limit (tenant) | 600/min | ✅ Yes |

### Quota Enforcement

**Creation Time**:
- Check tenant's current recurring search count
- Block creation if at limit
- Display quota usage in UI

**Execution Time**:
- Check daily execution count
- Skip execution if over limit
- Log quota exceeded event
- Notify Tenant Admin if repeatedly exceeded

**Web Search Quota**:
- Recurring searches share web search quota with interactive searches
- Each execution counts against tenant's web search quota
- Web search quota managed separately (see WEB-SEARCH.md)

### Super Admin Quota Management

**API Endpoint**: `PATCH /api/v1/superadmin/tenants/{id}/search-quota`

```typescript
{
  maxRecurringSearches: 50,
  maxExecutionsPerDay: 1000,
  maxWebQueriesPerExecution: 20,
  maxAlertNotificationsPerDay: 500
}
```

## Access Control

### Ownership & Visibility

**User (Owner)**:
- Creates recurring searches
- Searches are **private by default**
- Can share with specific team members
- Can view own alerts and feedback
- Cannot see other users' searches

**Tenant Admin**:
- **Views all recurring searches** in the tenant
- Cannot edit user searches
- Can configure tenant-wide settings:
  - Default confidence threshold
  - Data retention period
  - Digest mode settings
- Can view all alerts across tenant
- Can access analytics dashboard

**Super Admin**:
- Full access to all tenants
- Can set quota overrides
- Can configure global settings
- Can view learning system metrics
- Can customize detection prompts

### Team Sharing

Users can share recurring searches with team members:

```typescript
interface SearchSharing {
  searchId: string;
  sharedWith: string[];  // Array of user IDs
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}
```

**Shared Search Behavior**:
- Shared users receive alerts
- Shared users can provide feedback
- Original owner retains full control
- Team members see shared searches in their list

## Data Retention

### Configurable Retention

**Default Settings**:
- Search results: 30 days
- Alert notifications: 90 days
- Execution history: 180 days
- Statistics: 1 year

**Tenant Admin Configuration**:
```typescript
interface RetentionConfig {
  searchResultsDays: number;     // Default: 30
  alertNotificationsDays: number; // Default: 90
  executionHistoryDays: number;  // Default: 180
  statisticsDays: number;        // Default: 365
}
```

### TTL Implementation

Cosmos DB Time-To-Live (TTL) automatically deletes expired documents:

```typescript
// Example: Search result with 30-day TTL
{
  id: 'result-123',
  searchId: 'search-456',
  executedAt: '2025-01-01T09:00:00Z',
  results: [...],
  ttl: 2592000  // 30 days in seconds
}
```

### Manual Cleanup

Users can delete:
- Individual search results
- Entire recurring searches (cascading delete)
- Alert notifications (mark as read/deleted)

## Integration Points

### 1. Web Search Integration
**Reference**: [WEB-SEARCH.md](./WEB-SEARCH.md)

- Reuses web search providers and configuration
- Shares quota with interactive searches
- Results stored in same c_search shards
- Uses same provider fallback chains

**Integration Flow**:
```typescript
// Recurring search execution calls web search service
const webResults = await webSearchService.search({
  query: recurringSearch.query,
  providers: recurringSearch.webSearchProviders,
  count: recurringSearch.maxResults,
  filters: recurringSearch.filters,
  tenantId: recurringSearch.tenantId,
  userId: recurringSearch.userId
});
```

### 2. Intent Classification
**Reference**: [INTENT-CLASSIFICATION.md](./INTENT-CLASSIFICATION.md)

- Classifies recurring search types (sales, risk, competitor, regulatory)
- Used for type-specific alert detection
- Enables auto-learning of search patterns

**Integration Flow**:
```typescript
// Classify search type for optimized detection
const searchType = await intentClassifier.classifySearchType(
  recurringSearch.query,
  recurringSearch.description
);

// Use type-specific detection prompt
const detectionPrompt = await promptService.getDetectionPrompt(searchType);
```

### 3. Context Assembly
**Reference**: [CONTEXT-ASSEMBLY.md](./CONTEXT-ASSEMBLY.md)

- Assembles context for alert detection LLM
- Combines previous results + new results + user-defined prompts
- Enables RAG-enhanced delta analysis

**Integration Flow**:
```typescript
// Build context for alert analysis
const context = await contextAssembler.buildAlertContext({
  previousResults: previousExecution.results,
  newResults: currentExecution.results,
  searchType: recurringSearch.type,
  userPrompt: recurringSearch.alertDetectionPrompt,
  historicalAlerts: previousAlerts
});

// Use context in LLM analysis
const alertDecision = await llm.analyzeSearchDelta(context);
```

### 4. Prompt Management
**Reference**: [PROMPT-ENGINEERING.md](./PROMPT-ENGINEERING.md)

- Stores alert detection prompts
- Super Admin can customize system prompts
- Users can define search-specific prompts
- Learning system refines prompts automatically

**Integration Flow**:
```typescript
// Get base prompt for search type
const basePrompt = await promptService.getPrompt('alert-detection', searchType);

// Apply user customizations
const customPrompt = recurringSearch.alertDetectionPrompt || basePrompt;

// Use in LLM call
const alertDecision = await llm.complete({
  prompt: customPrompt,
  context: alertContext
});
```

### 5. Grounding & Citations
**Reference**: [GROUNDING.md](./GROUNDING.md)

- Alert summaries include citations from search results
- Confidence scores based on source reliability
- Users can verify alert sources

**Integration Flow**:
```typescript
// Generate alert with citations
const alert = await alertAnalyzer.createAlert({
  summary: 'New competitor product launched',
  confidence: 0.87,
  citations: [
    {
      title: 'Competitor announces Product X',
      url: 'https://example.com/news',
      source: 'Company Press Release',
      relevanceScore: 0.95
    }
  ]
});
```

## Related Documentation

### Core Documentation
- [WEB-SEARCH-DEEP-SEARCH.md](./WEB-SEARCH-DEEP-SEARCH.md) - Deep search system architecture and implementation
- [RECURRING-SEARCH-ALERTS.md](./RECURRING-SEARCH-ALERTS.md) - Alert detection system and learning
- [RECURRING-SEARCH-DATABASE.md](./RECURRING-SEARCH-DATABASE.md) - Database schema and HPK strategy
- [RECURRING-SEARCH-SERVICES.md](./RECURRING-SEARCH-SERVICES.md) - Service implementations
- [NOTIFICATIONS.md](./NOTIFICATIONS.md) - Global notification system
- [API.md](./API.md) - REST API endpoints
- [UI-SPECIFICATION.md](./UI-SPECIFICATION.md) - User interface specifications
- [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) - Implementation steps

### Integration Documentation
- [WEB-SEARCH.md](./WEB-SEARCH.md) - Web search provider integration
- [INTENT-CLASSIFICATION.md](./INTENT-CLASSIFICATION.md) - Search type classification
- [CONTEXT-ASSEMBLY.md](./CONTEXT-ASSEMBLY.md) - Context building for LLM
- [PROMPT-ENGINEERING.md](./PROMPT-ENGINEERING.md) - Prompt management
- [GROUNDING.md](./GROUNDING.md) - Citations and grounding

### General Documentation
- [README.md](./README.md) - AI Insights overview and permissions
- [ADVANCED-FEATURES.md](./ADVANCED-FEATURES.md) - Advanced feature descriptions
