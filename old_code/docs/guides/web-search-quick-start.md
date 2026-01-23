# Web Search Module - Quick Start Guide

## Installation

### 1. Install Dependencies
```bash
cd apps/api
npm install cheerio
npm install -D @types/cheerio
```

### 2. Initialize Database
```bash
pnpm --filter @castiel/api run init-web-search
```

### 3. Configure Environment (.env)
```bash
# Search Providers
SERPAPI_KEY=your_key_here
BING_SEARCH_KEY=your_key_here

# OpenAI Embeddings
OPENAI_API_KEY=your_key_here

# Cosmos DB (already configured)
COSMOS_DB_ENDPOINT=your_endpoint
COSMOS_DB_KEY=your_key
COSMOS_DB_DATABASE_ID=castiel
```

## Module Initialization

### In Application Startup
```typescript
import { CosmosClient } from '@azure/cosmos';
import { WebSearchModule } from './services/web-search/module.js';

// Get Cosmos DB instance (already configured)
const cosmosClient = new CosmosClient({ endpoint, key });
const database = cosmosClient.database(databaseId);

// Initialize web search module
const webSearchModule = new WebSearchModule({
  cosmosDb: database,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  serpApiKey: process.env.SERPAPI_KEY,
  bingSearchKey: process.env.BING_SEARCH_KEY,
  googleSearchKey: process.env.GOOGLE_SEARCH_KEY,
  googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
});

// Register routes
await registerWebSearchRoutes(server, monitoring, webSearchModule);
```

## API Usage Examples

### 1. Web Search
```bash
curl -X POST http://localhost:3000/api/v1/search \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "javascript async await",
    "maxResults": 10,
    "useCache": true
  }'
```

### 2. Deep Search (with Scraping)
```bash
curl -X POST http://localhost:3000/api/v1/search/deep \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "machine learning algorithms",
    "maxPages": 3,
    "maxResults": 10
  }'
```

### 3. Search History
```bash
curl -X GET "http://localhost:3000/api/v1/search/history?limit=20&offset=0" \
  -H "Authorization: Bearer TOKEN"
```

### 4. Search Statistics
```bash
curl -X GET http://localhost:3000/api/v1/search/stats \
  -H "Authorization: Bearer TOKEN"
```

### 5. WebSocket Progress Tracking
```typescript
const ws = new WebSocket('ws://localhost:3000/api/v1/search/deep/ws?q=your_query&maxPages=3', {
  headers: { Authorization: 'Bearer TOKEN' }
});

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'progress') {
    console.log(`Progress: ${message.data.progress}%`);
    console.log(`Status: ${message.data.status}`);
    console.log(`Current URL: ${message.data.currentUrl}`);
  }
  
  if (message.type === 'complete') {
    console.log('Search complete!', message.data);
  }
  
  if (message.type === 'error') {
    console.error('Error:', message.error);
  }
};
```

## Service Usage in Code

### Direct Service Access
```typescript
// Get services from the module
const webSearchService = webSearchModule.webSearchService;
const deepSearchService = webSearchModule.deepSearchService;
const cosmosService = webSearchModule.cosmosService;
const scraperService = webSearchModule.scraperService;
const embeddingService = webSearchModule.embeddingService;

// Use web search service
const result = await webSearchService.search(tenantId, 'your query', {
  maxResults: 10,
  useCache: true,
  forceRefresh: false,
});

console.log('Found results:', result.search.resultCount);
console.log('Cost:', result.costBreakdown.totalCost);

// Use deep search service
const deepResult = await deepSearchService.deepSearch(
  result.search.results, // Search results to scrape
  tenantId,
  projectId,
  'source query',
  {
    maxPages: 3,
    onProgress: (progress) => {
      console.log(`${progress.progress}% - ${progress.message}`);
    },
  }
);

console.log('Scraped pages:', deepResult.statistics.successfulPages);
console.log('Total chunks:', deepResult.statistics.totalChunks);
```

### Semantic Search
```typescript
// Create embedding for query
const queryEmbedding = await embeddingService.embed('your search query');

// Find similar content across scraped pages
const similarChunks = await deepSearchService.searchSimilarContent(
  tenantId,
  queryEmbedding.embedding,
  {
    limit: 10,
    threshold: 0.7, // 0-1, higher = more similar
  }
);

for (const result of similarChunks) {
  console.log('URL:', result.page.url);
  console.log('Content:', result.content);
  console.log('Similarity:', result.similarity);
}
```

## Configuration Options

### SearchOptions
```typescript
interface SearchOptions {
  maxResults?: number;        // 1-100, default 10
  useCache?: boolean;         // default true
  cacheDuration?: number;     // seconds, default 3600
  type?: 'web'|'news'|'academic'; // default 'web'
  location?: string;          // 'us', 'gb', etc
  language?: string;          // 'en', 'es', etc
  forceRefresh?: boolean;     // ignore cache
}
```

### DeepSearchOptions
```typescript
interface DeepSearchOptions {
  urls?: string[];            // Override search results
  maxPages?: number;          // 1-5, default 3
  selectors?: {               // Custom CSS selectors
    mainContent?: string;
    article?: string;
    body?: string;
  };
  renderJavaScript?: boolean; // Future feature
  timeout?: number;           // ms, default 10000
}
```

## Error Handling

### Common Errors
```typescript
try {
  const result = await webSearchService.search(tenantId, query);
} catch (error) {
  if (error.message.includes('All search providers failed')) {
    // All search providers failed - check API keys
    console.error('Search providers unavailable');
  } else if (error.message.includes('Failed to generate embedding')) {
    // OpenAI API error - check key and quota
    console.error('Embedding service error');
  } else if (error.message.includes('Failed to scrape')) {
    // Page scraping failed - might be blocked
    console.error('Cannot scrape this URL');
  } else {
    // Unknown error
    console.error('Search failed:', error.message);
  }
}
```

## Performance Tips

### 1. Use Caching
```typescript
// ✅ Good - uses cache
const result = await webSearchService.search(tenantId, query, {
  useCache: true,
  cacheDuration: 3600,
});

// ❌ Bad - always fresh
const result = await webSearchService.search(tenantId, query, {
  forceRefresh: true,
});
```

### 2. Limit Deep Search Pages
```typescript
// ✅ Good - reasonable limit
const result = await deepSearchService.deepSearch(
  searchResults,
  tenantId,
  projectId,
  sourceQuery,
  { maxPages: 3 }
);

// ❌ Bad - too many pages
const result = await deepSearchService.deepSearch(
  searchResults,
  tenantId,
  projectId,
  sourceQuery,
  { maxPages: 20 } // Will take 2+ minutes
);
```

### 3. Batch Embeddings
```typescript
// ✅ Good - batch embedding
const chunks = [...]; // 100 chunks
const embedded = await embeddingService.embedChunks(chunks);

// ❌ Bad - one at a time
for (const chunk of chunks) {
  await embeddingService.embedChunk(chunk);
}
```

## Cost Monitoring

### Get Cost Data
```typescript
// Per-tenant cost tracking
const costData = webSearchService.getCostData(tenantId);
console.log('Current session cost:', costData.totalCost);
console.log('Estimated monthly:', costData.estimatedMonthly);
```

### Cost Breakdown
```typescript
const result = await webSearchService.search(tenantId, query);

console.log('Search cost:', result.costBreakdown.searchCost);
console.log('Deep search cost:', result.costBreakdown.deepSearchCost);
console.log('Total cost:', result.costBreakdown.totalCost);
```

## Debugging

### Enable Detailed Logging
```typescript
// Check module status
const status = webSearchModule.getStatus();
console.log('Available providers:', status.providers);
console.log('Embedding model:', status.embeddingModel);

// Verify configuration
const verification = await webSearchModule.verify();
if (!verification.success) {
  console.error('Configuration errors:', verification.errors);
}
```

### Test Provider Availability
```typescript
const providers = webSearchModule.providerFactory.getRegisteredProviders();

for (const providerName of providers) {
  const provider = webSearchModule.providerFactory.getProvider(providerName);
  const isAvailable = await provider?.isAvailable();
  console.log(`${providerName}: ${isAvailable ? '✅' : '❌'}`);
}
```

## Next Steps

1. **Install cheerio**: `npm install cheerio`
2. **Initialize DB**: `pnpm --filter @castiel/api run init-web-search`
3. **Configure .env**: Add API keys for search and embeddings
4. **Start server**: `npm run dev`
5. **Test endpoints**: Use curl examples above
6. **Monitor costs**: Check cost tracking regularly

## Documentation Files

- `PHASE-2-PLAN.md` - Overall plan and timeline
- `PHASE-2-1-COMPLETION.md` - Database layer details
- `PHASE-2-SESSION-SUMMARY.md` - This session's work
- `WEB-SEARCH-DEEP-SEARCH.md` - Complete specification
- `RECURRING-SEARCH-SERVICES.md` - Service documentation

## Support

For issues or questions:
1. Check environment variables
2. Verify API key limits and quotas
3. Check Cosmos DB connectivity
4. Review service logs
5. Run `webSearchModule.verify()`

---

**Status**: ✅ Ready to use (after cheerio installation)
**Last Updated**: January 2025
**Maintained By**: Castiel Development Team

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Web search module fully implemented

#### Implemented Features (✅)

- ✅ Web search service
- ✅ Deep search with scraping
- ✅ Search history tracking
- ✅ Search statistics
- ✅ WebSocket progress tracking
- ✅ Semantic search
- ✅ Cosmos DB integration
- ✅ Multiple search provider support (SerpAPI, Bing, Google)

#### Known Limitations

- ⚠️ **Search Provider Configuration** - Some search providers may require additional configuration
  - **Recommendation:**
    1. Verify all search provider configurations
    2. Test search provider fallbacks
    3. Document provider-specific requirements

### Code References

- **Backend Services:**
  - `apps/api/src/services/web-search/module.ts` - Web search module
  - `apps/api/src/services/web-search/cosmos.service.ts` - Web search Cosmos service

- **API Routes:**
  - `/api/v1/web-search/*` - Web search endpoints

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [AI Insights Feature](../features/ai-insights/README.md) - Web search integration
