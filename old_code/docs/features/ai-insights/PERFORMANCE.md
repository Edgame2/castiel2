# AI Insights Performance Optimization

## Overview

This guide covers optimization strategies to minimize latency, reduce costs, and improve scalability of AI Insights.

## Context Assembly Optimization

### 1. Optimize Context Templates

```typescript
// ❌ Bad: Retrieves too much data
const template = {
  maxResults: 100,  // Too many
  minRelevanceScore: 0.3,  // Too low threshold
  includeRelationships: true,
  maxRelationshipDepth: 5  // Too deep
};

// ✅ Good: Optimized for speed
const template = {
  maxResults: 10,  // Sufficient for most cases
  minRelevanceScore: 0.7,  // High quality only
  includeRelationships: false,  // Only if needed
  maxRelationshipDepth: 2  // Limit traversal
};
```

**Impact**:
- Reducing `maxResults` from 100 to 10: **~80% faster**
- Increasing `minRelevanceScore` from 0.3 to 0.7: **~60% faster**
- Disabling relationships: **~40% faster**

### 2. Use Hierarchical Partition Keys (HPK)

```typescript
// ❌ Bad: Searches entire tenant
const context = await assembler.assemble({
  scope: {
    tenantId: 'tenant_123'  // Cross-partition query
  }
});
// Query time: ~500ms for 10,000 shards

// ✅ Good: Limits search to specific project
const context = await assembler.assemble({
  scope: {
    tenantId: 'tenant_123',
    projectId: 'proj_456'  // Single partition
  }
});
// Query time: ~50ms for 1,000 shards
```

**Best Practices**:
- Always include most specific scope possible
- Use `projectId` when querying project-specific data
- Use `shardIds` array for exact shard retrieval

### 3. Optimize Vector Search

```typescript
// Configure vector search for speed vs accuracy trade-off
const vectorSearchConfig = {
  dimensions: 1536,  // Standard for ada-002
  similarityMetric: 'cosine',
  indexType: 'quantizedFlat',  // Fast for <1M vectors
  efSearch: 50,  // Lower = faster, higher = more accurate
  numCandidates: 100
};

// For datasets > 1M vectors, use HNSW
const hsnwConfig = {
  indexType: 'hnsw',
  m: 16,  // Lower = faster build, higher = better recall
  efConstruction: 100,
  efSearch: 50
};
```

### 4. Batch Context Retrieval

```typescript
// ❌ Bad: Sequential retrieval
for (const shardId of shardIds) {
  const shard = await getShard(shardId);
  context.push(shard);
}

// ✅ Good: Parallel batch retrieval
const shards = await Promise.all(
  shardIds.map(id => getShard(id))
);
context.push(...shards);

// ✅ Better: Use Cosmos DB bulk operations
const query = `
  SELECT * FROM c 
  WHERE c.id IN (@ids)
  AND c.tenantId = @tenantId
`;
const shards = await cosmosDb.query(query, {
  parameters: [
    { name: '@ids', value: shardIds },
    { name: '@tenantId', value: tenantId }
  ]
});
```

## Model Selection Optimization

### 1. Use Cheaper Models for Simple Tasks

```typescript
// Model routing rules based on intent
const routingRules = [
  {
    condition: (intent, complexity) => 
      intent === 'summary' && complexity < 0.5,
    model: 'gpt-4o-mini',  // $0.150 / 1M tokens
    maxTokens: 500,
    temperature: 0.3
  },
  {
    condition: (intent, complexity) => 
      intent === 'translation' || intent === 'formatting',
    model: 'gpt-4o-mini',  // Fast and cheap
    maxTokens: 1000,
    temperature: 0.1
  },
  {
    condition: (intent, complexity) => 
      intent === 'analysis' || complexity >= 0.7,
    model: 'gpt-4o',  // $2.50 / 1M tokens
    maxTokens: 2000,
    temperature: 0.5
  },
  {
    condition: (intent) => intent === 'code_generation',
    model: 'gpt-4o',  // Better for code
    maxTokens: 4000,
    temperature: 0.2
  }
];

// Estimate complexity
function estimateComplexity(query: string, context: Shard[]): number {
  const factors = {
    queryLength: query.length / 1000,  // Normalized
    contextSize: context.length / 20,
    hasRelationships: context.some(s => s.relationships?.length > 0) ? 0.3 : 0,
    requiresWebSearch: needsWebSearch(query) ? 0.2 : 0
  };
  
  return Math.min(
    factors.queryLength + 
    factors.contextSize + 
    factors.hasRelationships + 
    factors.requiresWebSearch,
    1.0
  );
}
```

**Cost Savings**:
- Using `gpt-4o-mini` for 60% of queries: **~85% cost reduction**
- Reducing `maxTokens` from 4000 to 1000: **~75% cost reduction**

### 2. Enable Streaming

```typescript
// ✅ Streaming reduces perceived latency
export async function* streamChat(request: ChatRequest) {
  const stream = await openai.chat.completions.create({
    model: request.model,
    messages: request.messages,
    stream: true  // ✅ Enable streaming
  });
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield {
        type: 'content_delta',
        delta,
        timestamp: Date.now()
      };
    }
  }
}

// Client-side perception
// Without streaming: User waits 3s for full response
// With streaming: User sees first tokens in 200ms
```

### 3. Implement Token Budget Management

```typescript
// Track and limit token usage
class TokenBudgetManager {
  private budgets = new Map<string, TokenBudget>();
  
  async checkBudget(userId: string, estimatedTokens: number): Promise<boolean> {
    const budget = await this.getBudget(userId);
    
    if (budget.used + estimatedTokens > budget.limit) {
      return false;
    }
    
    return true;
  }
  
  async recordUsage(userId: string, tokens: number, cost: number): Promise<void> {
    await redis.hincrby(`budget:${userId}`, 'tokens', tokens);
    await redis.hincrbyfloat(`budget:${userId}`, 'cost', cost);
  }
  
  async estimateTokens(request: ChatRequest): number {
    // Rough estimation: 1 token ≈ 4 characters
    const inputTokens = JSON.stringify(request.messages).length / 4;
    const outputTokens = request.maxTokens || 1000;
    return Math.ceil(inputTokens + outputTokens);
  }
}
```

## Caching Strategies

### 1. Cache Web Search Results

```typescript
import { createHash } from 'crypto';

class WebSearchCache {
  private ttl = 3600;  // 1 hour
  
  private getCacheKey(query: string, tenantId: string): string {
    const hash = createHash('sha256')
      .update(`${tenantId}:${query.toLowerCase()}`)
      .digest('hex');
    return `web_search:${hash}`;
  }
  
  async search(query: string, tenantId: string): Promise<SearchResult[]> {
    const cacheKey = this.getCacheKey(query, tenantId);
    
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Web search cache hit', { query });
      return JSON.parse(cached);
    }
    
    // Perform search
    const results = await this.provider.search(query);
    
    // Cache results
    await redis.setex(cacheKey, this.ttl, JSON.stringify(results));
    
    return results;
  }
}
```

**Cache Hit Rate Target**: >70%

### 2. Cache Context Assembly

```typescript
class ContextCache {
  private ttl = 300;  // 5 minutes
  
  async getOrAssemble(request: ContextRequest): Promise<Shard[]> {
    const cacheKey = this.getCacheKey(request);
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Assemble context
    const context = await this.assembler.assemble(request);
    
    // Cache if scope is specific enough
    if (this.isCacheable(request)) {
      await redis.setex(cacheKey, this.ttl, JSON.stringify(context));
    }
    
    return context;
  }
  
  private isCacheable(request: ContextRequest): boolean {
    // Only cache specific scopes
    return Boolean(
      request.scope.projectId || 
      request.scope.shardIds?.length
    );
  }
  
  private getCacheKey(request: ContextRequest): string {
    const key = {
      templateId: request.templateId,
      scope: request.scope,
      maxResults: request.maxResults
    };
    return `context:${createHash('sha256').update(JSON.stringify(key)).digest('hex')}`;
  }
}
```

### 3. Cache Intent Classification

```typescript
// Cache frequently asked questions
const intentCache = new Map<string, CachedIntent>();

async function classifyIntent(query: string): Promise<Intent> {
  const normalized = query.toLowerCase().trim();
  
  // Check cache
  const cached = intentCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < 3600000) {  // 1 hour
    return cached.intent;
  }
  
  // Classify
  const intent = await classifier.classify(query);
  
  // Cache
  intentCache.set(normalized, {
    intent,
    timestamp: Date.now()
  });
  
  return intent;
}
```

## Database Query Optimization

### 1. Use Efficient Queries

```typescript
// ❌ Bad: Multiple round trips
const project = await getProject(projectId);
const tasks = await getTasks(projectId);
const risks = await getRisks(projectId);

// ✅ Good: Single query with partition key
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
  AND c.pk = @pk
  AND c.type IN ('project', 'task', 'risk')
`;

const results = await cosmosDb.query(query, {
  parameters: [
    { name: '@tenantId', value: tenantId },
    { name: '@pk', value: `${tenantId}|${projectId}` }
  ],
  partitionKey: `${tenantId}|${projectId}`  // ✅ Single partition
});
```

### 2. Optimize Indexing

```typescript
// Cosmos DB indexing policy
const indexingPolicy = {
  indexingMode: 'consistent',
  automatic: true,
  includedPaths: [
    { path: '/tenantId/?' },
    { path: '/pk/?' },
    { path: '/type/?' },
    { path: '/lastModifiedAt/?' },
    { path: '/embedding/*' }  // Vector search
  ],
  excludedPaths: [
    { path: '/content/*' },  // Don't index large text
    { path: '/metadata/*' }   // Don't index dynamic metadata
  ],
  vectorIndexes: [
    {
      path: '/embedding',
      type: 'quantizedFlat'  // or 'diskANN' for large datasets
    }
  ]
};
```

### 3. Use Continuation Tokens for Pagination

```typescript
// ❌ Bad: Fetching all results
const query = 'SELECT * FROM c WHERE c.type = "task"';
const results = await cosmosDb.query(query).fetchAll();  // Slow!

// ✅ Good: Paginated fetching
async function* fetchPaginated(query: string, pageSize: number = 100) {
  let continuationToken: string | undefined;
  
  do {
    const response = await cosmosDb.query(query, {
      maxItemCount: pageSize,
      continuationToken
    });
    
    yield response.resources;
    continuationToken = response.continuationToken;
  } while (continuationToken);
}

// Usage
for await (const page of fetchPaginated(query)) {
  processPage(page);
}
```

## Monitoring & Profiling

### Key Performance Metrics

```typescript
// Track operation durations
interface PerformanceMetrics {
  operation: string;
  duration: number;
  breakdown: {
    contextAssembly: number;
    webSearch: number;
    intentClassification: number;
    modelInference: number;
    grounding: number;
  };
  resourceUsage: {
    tokens: number;
    cost: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

// Log slow operations
function logPerformance(metrics: PerformanceMetrics): void {
  if (metrics.duration > 3000) {  // >3s
    logger.warn('Slow AI Insights operation', metrics);
  }
  
  // Send to Application Insights
  appInsights.trackMetric({
    name: `ai_insights_${metrics.operation}_duration`,
    value: metrics.duration,
    properties: metrics.breakdown
  });
}
```

### Performance Targets

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| Chat message | 1.5s | 3s | 5s |
| Quick insight | 800ms | 1.5s | 2.5s |
| Context assembly | 200ms | 500ms | 1s |
| Web search | 500ms | 1s | 2s |
| Intent classification | 100ms | 200ms | 400ms |
| Vector search | 50ms | 150ms | 300ms |

### Cache Performance

| Cache Type | Hit Rate Target | TTL | Size Limit |
|------------|----------------|-----|------------|
| Web search | >70% | 1 hour | 10K entries |
| Context assembly | >60% | 5 min | 5K entries |
| Intent classification | >80% | 1 hour | 1K entries |

## Profiling Tools

### 1. Enable Detailed Diagnostics

```typescript
// Log Cosmos DB diagnostics
const response = await container.item(id, partitionKey).read();

if (response.requestCharge > 10) {  // High RU consumption
  logger.warn('Expensive Cosmos DB query', {
    id,
    requestCharge: response.requestCharge,
    diagnostics: response.diagnostics  // ✅ Includes query plan
  });
}
```

### 2. Use Application Insights

```typescript
// Track custom events
appInsights.trackEvent({
  name: 'AIInsightsQuery',
  properties: {
    tenantId: request.tenantId,
    intent: classifiedIntent,
    modelUsed: selectedModel,
    contextSize: context.length,
    webSearchEnabled: request.enableWebSearch
  },
  measurements: {
    duration: totalDuration,
    tokens: tokenUsage,
    cost: estimatedCost
  }
});
```

### 3. Profile with Node.js Inspector

```bash
# Start API with profiling
node --inspect src/index.ts

# Open Chrome DevTools
# Navigate to chrome://inspect
# Click "Open dedicated DevTools for Node"
# Use Performance and Memory tabs
```

## Load Testing

### Using Artillery

```yaml
# artillery-config.yml
config:
  target: 'https://api.castiel.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  processor: "./test-helpers.js"
  
scenarios:
  - name: "AI Insights Chat"
    flow:
      - post:
          url: "/api/v1/insights/chat"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"
          json:
            conversationId: "{{ conversationId }}"
            content: "What are the top risks in Project Alpha?"
            scope:
              tenantId: "{{ tenantId }}"
              projectId: "proj_alpha"
      - think: 2  # Wait 2s between requests
```

### Run Load Test

```bash
# Install Artillery
npm install -g artillery

# Run test
artillery run artillery-config.yml --output report.json

# Generate HTML report
artillery report report.json
```

## Optimization Checklist

### Development
- [ ] Use hierarchical partition keys
- [ ] Optimize context templates (maxResults ≤ 20)
- [ ] Enable streaming for better UX
- [ ] Implement caching for repeated queries
- [ ] Use cheaper models for simple tasks
- [ ] Batch database operations

### Production
- [ ] Enable Application Insights
- [ ] Set up performance alerts
- [ ] Monitor cache hit rates
- [ ] Track token usage per tenant
- [ ] Configure auto-scaling rules
- [ ] Regular load testing

### Cost Optimization
- [ ] Review model routing rules monthly
- [ ] Set token budgets per user/tenant
- [ ] Cache web search results
- [ ] Use gpt-4o-mini when possible
- [ ] Monitor and alert on high costs
- [ ] Optimize context assembly

## Performance Budget

Set and monitor performance budgets:

```typescript
const performanceBudget = {
  // Response time budget
  maxLatency: {
    p50: 2000,  // 2s
    p95: 4000,  // 4s
    p99: 6000   // 6s
  },
  
  // Cost budget (per 1000 requests)
  maxCost: {
    perUser: 0.50,      // $0.50
    perTenant: 50.00    // $50.00
  },
  
  // Resource budget
  maxTokens: {
    perRequest: 5000,
    perUserDaily: 100000
  }
};

// Alert when exceeding budget
if (metrics.p95Latency > performanceBudget.maxLatency.p95) {
  alertTeam('Performance budget exceeded', metrics);
}
```
