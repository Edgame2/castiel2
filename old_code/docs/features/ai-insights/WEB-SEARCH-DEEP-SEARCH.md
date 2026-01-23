# Web Search & Deep Search System

## Overview

The Web Search & Deep Search system provides intelligent web content retrieval with optional deep content extraction, embedding, and storage for Chat conversations and Recurring Searches.

### Key Capabilities
- **Primary Provider**: SerpAPI (Google, Bing, News, Finance)
- **Secondary Provider**: Bing Search API (fallback)
- **Deep Search**: Scrape first 3 pages by default
- **Content Extraction**: Clean text-only extraction from HTML
- **Content Embedding**: Automatic chunking (512 tokens) and vector embedding
- **Project-Scoped**: Content linked to specific projects in conversations
- **Async Scraping**: Non-blocking background processing with WebSocket/SSE updates
- **30-Day Retention**: Auto-cleanup via TTL on `c_webpages` container
- **Fallback Strategy**: SerpAPI → Bing Search API → Direct scraping

---

## Table of Contents

1. [Architecture](#architecture)
2. [c_webpages Shard Type](#c_webpages-shard-type)
3. [RecurringSearchService](#recurringsearchservice)
4. [Chat Deep Search Integration](#chat-deep-search-integration)
5. [Web Scraper Service](#web-scraper-service)
6. [Embedding & Chunking](#embedding--chunking)
7. [Provider Implementation](#provider-implementation)
8. [API Endpoints](#api-endpoints)
9. [Configuration](#configuration)
10. [Performance & Optimization](#performance--optimization)
11. [Monitoring & Alerts](#monitoring--alerts)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Chat / Recurring Search                          │
│                       User Request                                  │
│         "What are latest AI developments? (Deep search)"            │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │   Intent Analyzer            │
        │   - Detect search trigger    │
        │   - Extract search query     │
        │   - Check deepSearch flag    │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  RecurringSearchService      │
        │  - Determine search type     │
        │    (google/bing/news/finance)│
        │  - Route to provider         │
        │  - Get initial results       │
        └────────────┬─────────────────┘
                     │
         ┌───────────┴───────────┐
         │ (return immediately)  │
         │                       │
         ▼                       ▼
    ┌──────────────┐      ┌──────────────────┐
    │  Chat/Search │      │  START ASYNC     │
    │  Results     │      │  SCRAPING        │
    │  to Client   │      │  (Background)    │
    └──────────────┘      └────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
                 Page 1         Page 2         Page 3
             (SerpAPI top 3 URLs)
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ WebScraper   │ │ WebScraper   │ │ WebScraper   │
            │ - Fetch HTML │ │ - Fetch HTML │ │ - Fetch HTML │
            │ - Extract    │ │ - Extract    │ │ - Extract    │
            │   text       │ │   text       │ │   text       │
            └────────┬─────┘ └────────┬─────┘ └────────┬─────┘
                     │              │              │
                     ▼              ▼              ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ Chunking     │ │ Chunking     │ │ Chunking     │
            │ Service      │ │ Service      │ │ Service      │
            │ (512 tokens) │ │ (512 tokens) │ │ (512 tokens) │
            └────────┬─────┘ └────────┬─────┘ └────────┬─────┘
                     │              │              │
                     ▼              ▼              ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │  Embedding   │ │  Embedding   │ │  Embedding   │
            │  Service     │ │  Service     │ │  Service     │
            │ (text-embed) │ │ (text-embed) │ │ (text-embed) │
            └────────┬─────┘ └────────┬─────┘ └────────┬─────┘
                     │              │              │
                     ▼              ▼              ▼
            ┌──────────────────────────────────────────────────┐
            │  Store as c_webpages Shards                      │
            │  - Partition: [tenantId, projectId, sourceQuery] │
            │  - TTL: 30 days                                  │
            │  - Embedding: Vector + chunks                    │
            │  - Metadata: Title, author, publish date         │
            └────────┬─────────────────────────────────────────┘
                     │
                     ▼
            ┌──────────────────────────────────────────────────┐
            │  WebSocket/SSE Updates to Client                 │
            │  - emit('scraping_complete', { pageCount: 3 })   │
            │  - Chat receives updated context                 │
            └────────┬─────────────────────────────────────────┘
                     │
                     ▼
            ┌──────────────────────────────────────────────────┐
            │  Context Assembly                                │
            │  - Query c_webpages for relevant chunks          │
            │  - Use embedding similarity for ranking          │
            │  - Merge with other sources                      │
            └────────┬─────────────────────────────────────────┘
                     │
                     ▼
            ┌──────────────────────────────────────────────────┐
            │  LLM Response Generation                         │
            │  - Generate answer with context                  │
            │  - Citations from c_webpages                     │
            └─────────────────────────────────────────────────┘
```

### Data Flow

```
User enables deep search in chat
    ↓
Perform web search via SerpAPI/Bing
    ↓
Return search results immediately
    ↓ (async)
For each of first 3 URLs:
  ├─ Fetch and extract clean text
  ├─ Chunk content (512 tokens)
  ├─ Generate embeddings
  ├─ Store as c_webpages shard
  └─ Emit progress via WebSocket
    ↓
Use in context assembly
    ↓
Find relevant chunks via embedding similarity
    ↓
Generate response with citations
    ↓
Keep for 30 days for future queries
```

---

## c_webpages Shard Type

### Schema

```typescript
interface CWebpagesShard extends BaseShard {
  shardType: 'c_webpages';
  
  // Partition Key (HPK)
  partitionKey: [tenantId: string, projectId: string, sourceQuery: string];
  
  // Content Data
  structuredData: {
    url: string;              // Original webpage URL
    content: string;          // Clean extracted text (max 1.5 MB)
  };
  
  // Embeddings
  embedding: {
    vector: number[];         // Vector embedding (1536 dimensions)
    model: string;            // 'text-embedding-3-small' or equivalent
    chunkSize: number;        // 512 tokens
    chunks: Array<{
      text: string;           // Chunk text
      embedding: number[];    // Chunk vector
      startIndex: number;     // Character position in full content
    }>;
  };
  
  // Metadata
  metadata: {
    title: string;            // Page title/heading
    author?: string;          // Page author if available
    publishDate?: Date;       // Publication date if available
    sourceQuery: string;      // Search query that found this page
    searchType: 'google' | 'bing' | 'news' | 'finance' | 'web';
    scrapedAt: Date;
    scrapeDuration: number;   // ms
  };
  
  // Lifecycle
  expiresAt: Date;            // +30 days from scrapedAt (TTL)
  
  // Linking
  conversationId?: string;    // If from chat conversation
  recurringSearchId?: string; // If from recurring search
}
```

### Partition Key Strategy

**Key**: `[tenantId, projectId, sourceQuery]`

**Benefits:**
- ✅ **Multi-tenant isolation** - tenantId ensures separation
- ✅ **Project-scoped content** - Can have different searches per project
- ✅ **Query grouping** - All pages for "AI agents" query together
- ✅ **Prevents hot partitions** - Different queries distributed across partitions
- ✅ **Range queries** - "Get all pages for query X from last 7 days"
- ✅ **Efficient cleanup** - Query by sourceQuery for TTL deletion

### Container Configuration

```typescript
{
  id: 'webpages',
  partitionKeyDefinition: {
    paths: ['/tenantId', '/projectId', '/sourceQuery'],
    kind: 'MultiHash'  // Hierarchical Partition Key
  },
  defaultTtl: 2592000,  // 30 days in seconds
  throughput: {
    autoscale: {
      maxThroughput: 4000
    }
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/tenantId/*' },
      { path: '/projectId/*' },
      { path: '/sourceQuery/*' },
      { path: '/metadata/searchType/*' },
      { path: '/metadata/scrapedAt/*' },
      { path: '/embedding/vector/*' }  // Vector search index
    ],
    excludedPaths: [{ path: '/*' }]
  }
}
```

---

## RecurringSearchService

### Search Types

| Type | Provider | Use Case | Deep Search |
|------|----------|----------|-------------|
| `google` | SerpAPI → Bing | General web search | ✅ Yes |
| `bing` | Bing Search API | Microsoft ecosystem | ✅ Yes |
| `news` | SerpAPI News → Bing News | News articles, current events | ✅ Yes |
| `finance` | SerpAPI Finance | Stock prices, financial data | ✅ Yes |
| `web` | SerpAPI + Scraper | General web + deep scrape | ✅ Yes (default) |

### API

```typescript
interface RecurringSearchRequest {
  query: string;
  searchType: 'google' | 'bing' | 'news' | 'finance' | 'web';
  deepSearch?: boolean;        // Default: false
  deepSearchPages?: number;    // Default: 3 (max: 5)
  skipScraping?: boolean;      // Quick search without scraping
}

interface RecurringSearchResponse {
  searchId: string;
  results: SearchResult[];
  scrapedContent?: {
    pageCount: number;
    averageContentLength: number;
    embeddingsGenerated: number;
    startedAt: Date;
  };
  executedAt: Date;
  nextExecution?: Date;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: Date;
  
  // If deep search enabled (populated async):
  scraped?: {
    content: string;
    scrapedAt: Date;
    webpageShardId: string;
  };
}
```

### Service Implementation Pattern

```typescript
class RecurringSearchService {
  constructor(
    private cosmosService: CosmosService,
    private webScraperService: WebScraperService,
    private embeddingService: EmbeddingService,
    private intentAnalyzer: IntentAnalyzerService
  ) {}

  async search(
    tenantId: string,
    projectId: string,
    request: RecurringSearchRequest
  ): Promise<RecurringSearchResponse> {
    
    // 1. Get search provider based on type
    const provider = this.getProvider(request.searchType);
    
    // 2. Perform search
    const results = await provider.search(request.query);
    
    // 3. If deep search enabled, start scraping async
    if (request.deepSearch) {
      this.startDeepSearchAsync(
        tenantId,
        projectId,
        results.slice(0, request.deepSearchPages || 3),
        request.query,
        request.searchType
      );
    }
    
    // 4. Return initial results immediately
    return {
      searchId: uuid(),
      results,
      scrapedContent: request.deepSearch ? {
        pageCount: 0,
        averageContentLength: 0,
        embeddingsGenerated: 0,
        startedAt: new Date()
      } : undefined,
      executedAt: new Date()
    };
  }

  private async startDeepSearchAsync(
    tenantId: string,
    projectId: string,
    results: SearchResult[],
    query: string,
    searchType: string
  ): Promise<void> {
    // Runs in background, updates c_webpages
    for (const result of results) {
      try {
        const startTime = Date.now();
        
        // Extract clean text
        const content = await this.webScraperService.scrape(result.url);
        
        // Chunk content
        const chunks = await this.contentChunkingService.chunk(
          content.text,
          512  // tokens
        );
        
        // Generate embeddings
        const embeddings = await this.embeddingService.embed(chunks);
        
        // Create c_webpages shard
        await this.cosmosService.createShard<CWebpagesShard>({
          id: uuid(),
          tenantId,
          projectId,
          shardType: 'c_webpages',
          partitionKey: [tenantId, projectId, query],
          
          structuredData: {
            url: result.url,
            content: content.text
          },
          
          embedding: {
            vector: embeddings[0].vector,
            model: 'text-embedding-3-small',
            chunkSize: 512,
            chunks: chunks.map((chunk, i) => ({
              text: chunk,
              embedding: embeddings[i].vector,
              startIndex: content.text.indexOf(chunk)
            }))
          },
          
          metadata: {
            title: content.title,
            author: content.author,
            publishDate: content.publishDate,
            sourceQuery: query,
            searchType: searchType as any,
            scrapedAt: new Date(),
            scrapeDuration: Date.now() - startTime
          },
          
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
      } catch (error) {
        logger.warn(`Failed to scrape ${result.url}`, error);
        // Continue with next URL
      }
    }
  }

  private getProvider(searchType: string): SearchProvider {
    switch (searchType) {
      case 'google':
      case 'web':
        return this.serpApiProvider;
      case 'news':
        return this.serpApiNewsProvider;
      case 'finance':
        return this.serpApiFinanceProvider;
      case 'bing':
        return this.bingSearchProvider;
      default:
        throw new Error(`Unknown search type: ${searchType}`);
    }
  }
}
```

---

## Chat Deep Search Integration

### Deep Search in Chat

```typescript
interface ChatDeepSearchOptions {
  enabled: boolean;
  searchType?: 'google' | 'bing' | 'news' | 'finance' | 'web';
  deepSearchPages?: number;  // 1-5, default 3
}

interface ChatRequest {
  conversationId: string;
  projectId: string;          // Chat is project-scoped
  content: string;
  deepSearch?: ChatDeepSearchOptions;
  // ... other fields
}
```

### Chat Flow with Deep Search

```
1. User sends message with deepSearch.enabled = true
2. Intent Analysis (existing)
3. Context Assembly (existing)
4. PARALLEL:
   a. Web search via RecurringSearchService
   b. If deep search: Start scraping in background
5. WHILE scraping in progress:
   a. Return initial search results to chat
   b. Update via WebSocket/SSE as pages scraped
   c. Continuously update relevance scoring
6. Generate response:
   a. Use search results + scraped content
   b. Select most relevant chunks via embedding similarity
   c. Cite all sources
7. Store conversation + linked webpages via conversationId
```

### Context Assembly with Scraped Content

```typescript
async function assembleContextWithDeepSearch(
  tenantId: string,
  projectId: string,
  conversationId: string,
  userQuery: string,
  deepSearchOptions?: ChatDeepSearchOptions
): Promise<ContextAssemblyResult> {
  
  // Get regular context (from project shards)
  const baseContext = await contextAssemblyService.assemble({
    scope: { tenantId, projectId },
    query: userQuery
  });
  
  if (!deepSearchOptions?.enabled) {
    return baseContext;
  }
  
  // Perform web search
  const searchResults = await recurringSearchService.search(
    tenantId,
    projectId,
    {
      query: userQuery,
      searchType: deepSearchOptions.searchType || 'google',
      deepSearch: true,
      deepSearchPages: deepSearchOptions.deepSearchPages || 3
    }
  );
  
  // Query c_webpages for most recent content
  const scrapedPages = await cosmosService.queryShards<CWebpagesShard>({
    query: `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId
      AND c.projectId = @projectId
      AND c.shardType = 'c_webpages'
      AND c.metadata.sourceQuery = @query
      AND c.scrapedAt > @recentDate
      ORDER BY c.metadata.scrapedAt DESC
    `,
    parameters: [
      { name: '@tenantId', value: tenantId },
      { name: '@projectId', value: projectId },
      { name: '@query', value: userQuery },
      { name: '@recentDate', value: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    ]
  });
  
  // Find most relevant chunks using embedding similarity
  const userEmbedding = await embeddingService.embed([userQuery]);
  const relevantChunks = [];
  
  for (const page of scrapedPages.items) {
    for (const chunk of page.embedding.chunks) {
      const similarity = cosineSimilarity(
        userEmbedding[0].vector,
        chunk.embedding
      );
      
      if (similarity > 0.7) {  // Relevance threshold
        relevantChunks.push({
          text: chunk.text,
          similarity,
          source: page.structuredData.url,
          shardId: page.id,
          title: page.metadata.title
        });
      }
    }
  }
  
  // Sort by relevance
  relevantChunks.sort((a, b) => b.similarity - a.similarity);
  
  // Combine contexts
  return {
    ...baseContext,
    sources: [
      ...baseContext.sources,
      ...relevantChunks.slice(0, 10).map(c => ({  // Top 10 chunks
        type: 'webpage',
        content: c.text,
        source: c.source,
        similarity: c.similarity,
        shardId: c.shardId,
        title: c.title
      }))
    ],
    deepSearchInfo: {
      pagesScraped: scrapedPages.items.length,
      relevantChunksFound: relevantChunks.length,
      totalEmbeddings: scrapedPages.items.reduce(
        (sum, p) => sum + p.embedding.chunks.length,
        0
      )
    }
  };
}
```

---

## Web Scraper Service

### Implementation

```typescript
interface ScrapedContent {
  text: string;              // Clean text content
  title: string;
  author?: string;
  publishDate?: Date;
  url: string;
  statusCode: number;
}

class WebScraperService {
  constructor(
    private logger: ILogger
  ) {}

  async scrape(url: string): Promise<ScrapedContent> {
    try {
      // 1. Fetch page with timeout
      const response = await axios.get(url, {
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024,  // 10 MB max
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CastielBot/1.0)'
        }
      });
      
      // 2. Parse HTML with Cheerio
      const $ = cheerio.load(response.data);
      
      // 3. Remove non-content elements
      this.removeScripts($);
      this.removeStyles($);
      this.removeNavigationElements($);
      
      // 4. Extract clean text
      const content = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();
      
      // 5. Extract metadata
      const title = $('title').text() || $('h1').first().text();
      const author = $('meta[name="author"]').attr('content');
      const pubDate = $('meta[property="article:published_time"]').attr('content');
      
      return {
        text: content,
        title,
        author,
        publishDate: pubDate ? new Date(pubDate) : undefined,
        url,
        statusCode: response.status
      };
      
    } catch (error: any) {
      this.logger.error(`Failed to scrape ${url}`, error);
      throw new ScrapingError(`Could not scrape ${url}: ${error.message}`);
    }
  }
  
  private removeScripts($: any): void {
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
  }
  
  private removeStyles($: any): void {
    $('style').remove();
    $('[style]').removeAttr('style');
  }
  
  private removeNavigationElements($: any): void {
    $('nav').remove();
    $('footer').remove();
    $('[role="navigation"]').remove();
  }
}
```

### Stack Recommendation

- **Axios** - HTTP client with retry support and timeout handling
- **Cheerio** - Lightweight HTML DOM parsing (no headless browser overhead)
- **Langchain TextSplitter** - Semantic text chunking
- **OpenAI Embeddings** - Embedding generation

**Why not Puppeteer?** Too slow (~15s per page) vs Cheerio (~1-2s). Can add as option for JavaScript-heavy sites later.

---

## Embedding & Chunking

### Content Chunking Strategy

```typescript
class ContentChunkingService {
  async chunk(
    content: string,
    tokenLimit: number = 512
  ): Promise<string[]> {
    // Use token counter for accuracy
    const tokens = await this.countTokens(content);
    
    if (tokens <= tokenLimit) {
      return [content];
    }
    
    // Split by sentences first (semantic chunks)
    const sentences = this.splitBySentences(content);
    const chunks: string[] = [];
    let currentChunk = '';
    let currentTokens = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = await this.countTokens(sentence);
      
      if (currentTokens + sentenceTokens > tokenLimit) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        }
      } else {
        currentChunk += ' ' + sentence;
        currentTokens += sentenceTokens;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  private splitBySentences(text: string): string[] {
    // Match sentence boundaries
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }
  
  private async countTokens(text: string): Promise<number> {
    // Use Langchain TokenCounter or OpenAI API
    return await encoding.encode(text).length;
  }
}
```

### Embedding Generation

```typescript
class EmbeddingService {
  private embeddingModel: OpenAIEmbeddings;
  
  constructor() {
    this.embeddingModel = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small'  // 1536 dimensions
    });
  }
  
  async embed(
    chunks: string[]
  ): Promise<Array<{ vector: number[]; text: string; startIndex: number }>> {
    
    // Generate embeddings for all chunks
    const embeddings = await this.embeddingModel.embedDocuments(chunks);
    
    return chunks.map((chunk, i) => ({
      vector: embeddings[i],
      text: chunk,
      startIndex: 0  // Will be calculated by caller
    }));
  }
  
  // Similarity search
  cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, x, i) => sum + x * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
    const normB = Math.sqrt(b.reduce((sum, x) => sum + x * x, 0));
    return dotProduct / (normA * normB);
  }
}
```

---

## Provider Implementation

### SerpAPI Provider

```typescript
class SerpAPIProvider implements SearchProvider {
  constructor(
    private apiKey: string,
    private logger: ILogger
  ) {}
  
  async search(
    query: string,
    params?: SearchParams
  ): Promise<SearchResult[]> {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.apiKey,
          engine: params?.engine || 'google',
          num: params?.resultCount || 10,
          ...params
        }
      });
      
      return this.parseResults(response.data);
      
    } catch (error: any) {
      this.logger.error('SerpAPI search failed', error);
      throw new SearchProviderError('SerpAPI search failed', error);
    }
  }
  
  private parseResults(data: any): SearchResult[] {
    return (data.organic_results || []).map(result => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      source: new URL(result.link).hostname,
      publishedDate: result.date ? new Date(result.date) : undefined
    }));
  }
}
```

### Bing Search Provider (Fallback)

```typescript
class BingSearchProvider implements SearchProvider {
  constructor(
    private apiKey: string,
    private endpoint: string,
    private logger: ILogger
  ) {}
  
  async search(
    query: string,
    params?: SearchParams
  ): Promise<SearchResult[]> {
    try {
      const response = await axios.get(`${this.endpoint}/v7.0/search`, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        params: {
          q: query,
          count: params?.resultCount || 10
        }
      });
      
      return this.parseResults(response.data);
      
    } catch (error: any) {
      this.logger.error('Bing search failed', error);
      throw new SearchProviderError('Bing search failed', error);
    }
  }
  
  private parseResults(data: any): SearchResult[] {
    return (data.webPages?.value || []).map(result => ({
      title: result.name,
      url: result.url,
      snippet: result.snippet,
      source: new URL(result.url).hostname,
      publishedDate: result.datePublished ? new Date(result.datePublished) : undefined
    }));
  }
}
```

### Fallback Strategy

```typescript
class SearchProviderFactory {
  constructor(
    private serpApiProvider: SerpAPIProvider,
    private bingSearchProvider: BingSearchProvider,
    private logger: ILogger
  ) {}
  
  async searchWithFallback(
    query: string,
    searchType: string
  ): Promise<SearchResult[]> {
    
    const primaryProvider = this.getProvider(searchType);
    
    try {
      return await primaryProvider.search(query);
    } catch (error: any) {
      this.logger.warn(
        `Primary provider (${searchType}) failed, trying fallback`,
        error
      );
      
      try {
        return await this.bingSearchProvider.search(query);
      } catch (fallbackError: any) {
        this.logger.error('All search providers failed', fallbackError);
        throw new SearchProviderError('All search providers exhausted');
      }
    }
  }
  
  private getProvider(searchType: string): SearchProvider {
    switch (searchType) {
      case 'google':
      case 'web':
        return this.serpApiProvider;
      case 'bing':
        return this.bingSearchProvider;
      default:
        return this.serpApiProvider;  // Default to SerpAPI
    }
  }
}
```

---

## API Endpoints

### POST /api/v1/chat (Deep Search in Chat)

```yaml
POST /api/v1/chat
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "conversationId": "conv_123",
  "projectId": "proj_456",
  "content": "What are the latest AI developments?",
  "deepSearch": {
    "enabled": true,
    "searchType": "news",
    "deepSearchPages": 3
  }
}

Response (WebSocket stream):
{
  "type": "search_started",
  "searchId": "search_789"
}

... (search results after 500-1000ms)

{
  "type": "search_results",
  "results": [
    { "title": "...", "url": "...", "snippet": "..." },
    ...
  ]
}

... (scraping updates every 2-3 seconds)

{
  "type": "scraping_progress",
  "page": 1,
  "url": "...",
  "status": "completed",
  "chunksCreated": 15,
  "embeddingsGenerated": 15
}

... (response generation)

{
  "type": "response",
  "content": "Based on the latest news...",
  "citations": [
    { "url": "...", "title": "...", "similarity": 0.92 }
  ]
}
```

### POST /api/v1/recurring-search

```yaml
POST /api/v1/recurring-search
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "projectId": "proj_456",
  "query": "AI agents trends",
  "searchType": "news",
  "deepSearch": true,
  "deepSearchPages": 3,
  "schedule": "0 9 * * MON"  // Cron format (optional)
}

Response:
{
  "searchId": "search_789",
  "results": [
    {
      "title": "AI Agents Market Growth",
      "url": "https://...",
      "snippet": "New report shows 300% growth in...",
      "source": "techcrunch.com",
      "publishedDate": "2024-01-15T10:00:00Z"
    },
    ...
  ],
  "scrapedContent": {
    "pageCount": 3,
    "averageContentLength": 4500,
    "embeddingsGenerated": 45,
    "startedAt": "2024-01-15T09:00:00Z"
  },
  "executedAt": "2024-01-15T09:00:05Z"
}
```

---

## Configuration

### Environment Variables

```env
# SerpAPI
SERPAPI_API_KEY=your_key_here

# Bing Search
BING_SEARCH_API_KEY=your_key_here
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com

# OpenAI Embeddings
OPENAI_API_KEY=your_key_here
EMBEDDING_MODEL=text-embedding-3-small

# Scraping
WEB_SCRAPER_TIMEOUT=10000
WEB_SCRAPER_MAX_SIZE=10485760  // 10 MB
WEB_SCRAPER_USER_AGENT=Mozilla/5.0 (compatible; CastielBot/1.0)

# Chunking
CHUNK_SIZE_TOKENS=512

# Retention
WEBPAGES_TTL_DAYS=30

# Rate Limiting (optional)
SCRAPE_MAX_CONCURRENT=3
SCRAPE_RATE_LIMIT_MS=1000
```

### Container Configuration

```typescript
const webpagesContainerConfig = {
  id: 'webpages',
  partitionKeyDefinition: {
    paths: ['/tenantId', '/projectId', '/sourceQuery'],
    kind: 'MultiHash'
  },
  defaultTtl: 2592000,  // 30 days
  throughput: {
    autoscale: {
      maxThroughput: 4000
    }
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/tenantId/*' },
      { path: '/projectId/*' },
      { path: '/sourceQuery/*' },
      { path: '/metadata/searchType/*' },
      { path: '/metadata/scrapedAt/*' },
      { path: '/embedding/vector/*' }
    ],
    excludedPaths: [{ path: '/*' }]
  }
};
```

---

## Performance & Optimization

### Latency Profile

```
Chat Deep Search:
├─ Web Search: 500-1000ms
├─ Return to user: 500ms total
├─ Scraping (async in background):
│  ├─ Fetch page: 1000-2000ms per page
│  ├─ Parse HTML: 100-200ms per page
│  ├─ Embed chunks: 500-1000ms per page (depends on chunk count)
│  └─ Store in Cosmos: 100-200ms per page
├─ Total async: 5-8 seconds for 3 pages
└─ User impact: Only sees initial results, gets updates via WebSocket

Recurring Search (Sequential):
├─ Search: 500-1000ms
├─ Scraping (sequential): 10-15 seconds for 3 pages
└─ Total: 11-16 seconds
```

### Cost Optimization

```
Pricing Estimates:
├─ SerpAPI: $1-5 per 10,000 searches
├─ Bing Search API: $1-7 per 1,000 searches
├─ OpenAI Embeddings: ~$0.02 per 1M tokens
└─ Cosmos DB c_webpages: ~$10-20/month (autoscale)

For 1000 daily searches with 30% deep search rate:
├─ Web searches (1000): ~$0.10/day
├─ Deep searches (300 × 3 pages = 900 pages): ~$0.05/day
├─ Embeddings (900 pages × 50 chunks = 45,000): ~$0.0009/day
├─ Cosmos storage (30-day rolling): ~$10-20/month
└─ Total: ~$5-8/month (very cost-efficient)
```

### Query Optimization

```typescript
// Efficient HPK query for recent pages
const recentPages = await cosmosService.query<CWebpagesShard>({
  query: `
    SELECT c.id, c.structuredData.url, c.embedding.chunks,
           c.metadata.title, c.metadata.scrapedAt
    FROM c 
    WHERE c.tenantId = @tenantId
    AND c.projectId = @projectId
    AND c.shardType = 'c_webpages'
    AND c.metadata.sourceQuery = @query
    AND c.metadata.scrapedAt > @since
    ORDER BY c.metadata.scrapedAt DESC
  `,
  parameters: [
    { name: '@tenantId', value: tenantId },
    { name: '@projectId', value: projectId },
    { name: '@query', value: userQuery },
    { name: '@since', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  ]
});
```

---

## Monitoring & Alerts

### Key Metrics

```
- Scraping success rate (target: >95%)
- Average scraping time per page (target: <3s)
- Embedding generation time (target: <1s per page)
- Search result relevance (feedback-based)
- TTL cleanup effectiveness
- SerpAPI quota usage
- Average response latency with deep search (target: <15s total)
```

### Application Insights Logging

```typescript
// Log search performance
logger.info('deep_search_completed', {
  searchType: 'news',
  pagesRequested: 3,
  pagesScraped: 3,
  chunksCreated: 45,
  totalTime: 5000,
  scrapingTime: 4500,
  embeddingTime: 1200,
  storageUsed: '2.3MB',
  userEmbedding: 0.89  // Average relevance score
});

// Alert on failures
if (scrapingSuccessRate < 0.90) {
  alertService.send('Critical', 
    'Web scraping success rate dropped below 90%');
}

// Track costs
logger.info('search_cost_tracking', {
  searchType: 'google',
  costSerpAPI: 0.001,
  costEmbedding: 0.0015,
  totalCost: 0.0025,
  timestamp: new Date()
});
```

---

## Recommended Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0",
    "langchain": "^0.1.0",
    "openai": "^4.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/cheerio": "^0.22.31",
    "@types/node": "^20.0.0"
  }
}
```

---

## Summary

✅ **Architecture:**
- SerpAPI + Bing fallback for searches
- Cheerio + Axios for scraping
- Async background scraping with WebSocket updates
- 30-day TTL for automatic cleanup

✅ **Storage:**
- Dedicated `c_webpages` container
- HPK: [tenantId, projectId, sourceQuery]
- Embedded vectors for semantic search

✅ **Features:**
- Deep search (scrape first 3 pages)
- 512-token chunking
- Embedding generation
- Project-scoped content
- Conversation/Recurring Search linking

✅ **Performance:**
- Initial results in <1s
- Async scraping 5-8s for 3 pages
- Vectorsimilarity search for relevance ranking

✅ **Cost:**
- ~$5-8/month for 1000 daily searches with 30% deep search rate
