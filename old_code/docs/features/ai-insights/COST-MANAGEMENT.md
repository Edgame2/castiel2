# AI Insights Cost Management

## Overview

This guide helps you track, optimize, and control costs associated with AI Insights, including LLM API usage, web search providers, and Azure infrastructure.

## Cost Structure

### 1. LLM Model Costs

| Model | Input Cost | Output Cost | Use Case |
|-------|-----------|-------------|----------|
| gpt-4o | $2.50 / 1M tokens | $10.00 / 1M tokens | Complex analysis, reasoning |
| gpt-4o-mini | $0.15 / 1M tokens | $0.60 / 1M tokens | Summaries, translations, simple tasks |
| gpt-4-turbo | $10.00 / 1M tokens | $30.00 / 1M tokens | Legacy, not recommended |
| o1-preview | $15.00 / 1M tokens | $60.00 / 1M tokens | Advanced reasoning (limited access) |

**Estimated Costs per Operation**:
```typescript
const estimatedCosts = {
  chat_simple: {
    model: 'gpt-4o-mini',
    avgInputTokens: 500,
    avgOutputTokens: 200,
    costPerRequest: 0.000195  // ~$0.0002
  },
  chat_complex: {
    model: 'gpt-4o',
    avgInputTokens: 2000,
    avgOutputTokens: 1000,
    costPerRequest: 0.015  // ~$0.015
  },
  analysis: {
    model: 'gpt-4o',
    avgInputTokens: 3000,
    avgOutputTokens: 1500,
    costPerRequest: 0.0225  // ~$0.023
  }
};
```

### 2. Web Search Provider Costs

| Provider | Cost Model | Typical Cost |
|----------|-----------|--------------|
| Azure Bing Search | $3 per 1000 queries (S1) | $0.003/query |
| Azure Bing Search | $250 per 1M queries (S9) | $0.00025/query |
| Tavily | $0.01 per search | $0.01/query |
| Serper | $0.001 per search | $0.001/query |

### 3. Azure Infrastructure Costs

| Service | SKU | Monthly Cost | Notes |
|---------|-----|--------------|-------|
| Cosmos DB | 1000 RU/s | ~$58 | Autoscale 100-1000 |
| Redis Cache | Basic C1 | ~$16 | 1GB cache |
| App Service | P1v3 | ~$146 | 2 cores, 8GB RAM |
| Application Insights | Pay-as-you-go | ~$30 | 5GB/month |
| Azure Functions | Consumption | ~$20 | Recurring searches |

**Total Base Infrastructure**: ~$270/month

## Cost Tracking

### 1. Track Usage per Tenant

```typescript
interface TenantUsage {
  tenantId: string;
  period: string;  // '2025-12'
  metrics: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    breakdown: {
      modelCosts: number;
      webSearchCosts: number;
      infraCosts: number;
    };
    byModel: Record<string, {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>;
  };
}

// Track usage
export async function trackUsage(
  tenantId: string,
  operation: string,
  usage: UsageMetrics
): Promise<void> {
  const key = `usage:${tenantId}:${getCurrentMonth()}`;
  
  // Increment counters
  await redis.hincrby(key, 'totalRequests', 1);
  await redis.hincrby(key, 'totalTokens', usage.tokens);
  await redis.hincrbyfloat(key, 'totalCost', usage.cost);
  await redis.hincrbyfloat(key, `model:${usage.model}:cost`, usage.cost);
  
  // Set expiry (keep 12 months)
  await redis.expire(key, 365 * 24 * 60 * 60);
  
  // Log to Application Insights
  appInsights.trackMetric({
    name: 'ai_insights_cost',
    value: usage.cost,
    properties: {
      tenantId,
      operation,
      model: usage.model
    }
  });
}
```

### 2. Per-User Quota Enforcement

```typescript
interface UserQuota {
  userId: string;
  period: 'daily' | 'monthly';
  limits: {
    maxRequests: number;
    maxTokens: number;
    maxCost: number;
  };
  current: {
    requests: number;
    tokens: number;
    cost: number;
  };
}

export class QuotaManager {
  async checkQuota(userId: string): Promise<boolean> {
    const quota = await this.getQuota(userId);
    
    if (quota.current.requests >= quota.limits.maxRequests) {
      throw new QuotaExceededError('Request limit exceeded');
    }
    
    if (quota.current.cost >= quota.limits.maxCost) {
      throw new QuotaExceededError('Cost limit exceeded');
    }
    
    return true;
  }
  
  async recordUsage(userId: string, usage: UsageMetrics): Promise<void> {
    const key = `quota:${userId}:${this.getPeriod()}`;
    
    await redis.hincrby(key, 'requests', 1);
    await redis.hincrby(key, 'tokens', usage.tokens);
    await redis.hincrbyfloat(key, 'cost', usage.cost);
    
    // Set TTL based on period
    const ttl = this.getTTL('daily');  // 24 hours
    await redis.expire(key, ttl);
  }
  
  private getPeriod(): string {
    return new Date().toISOString().split('T')[0];  // YYYY-MM-DD
  }
  
  private getTTL(period: 'daily' | 'monthly'): number {
    return period === 'daily' 
      ? 24 * 60 * 60  // 24 hours
      : 31 * 24 * 60 * 60;  // 31 days
  }
}
```

### 3. Budget Alerts

```typescript
export class BudgetAlertManager {
  private thresholds = [0.5, 0.75, 0.9, 1.0];  // Alert at 50%, 75%, 90%, 100%
  
  async checkBudget(tenantId: string): Promise<void> {
    const usage = await this.getUsage(tenantId);
    const budget = await this.getBudget(tenantId);
    
    const utilizationRate = usage.totalCost / budget.monthlyLimit;
    
    for (const threshold of this.thresholds) {
      if (utilizationRate >= threshold && !this.hasAlerted(tenantId, threshold)) {
        await this.sendAlert(tenantId, {
          threshold,
          current: usage.totalCost,
          limit: budget.monthlyLimit,
          percentage: utilizationRate * 100
        });
        
        // Mark as alerted
        await this.markAlerted(tenantId, threshold);
      }
    }
    
    // Auto-disable if exceeded
    if (utilizationRate >= 1.0 && budget.autoDisable) {
      await this.disableAIInsights(tenantId);
      logger.error('AI Insights auto-disabled due to budget', { tenantId });
    }
  }
  
  private async sendAlert(tenantId: string, alert: BudgetAlert): Promise<void> {
    // Send email to tenant admins
    const admins = await getTenantAdmins(tenantId);
    
    await emailService.send({
      to: admins.map(a => a.email),
      subject: `AI Insights Budget Alert: ${alert.percentage}% used`,
      template: 'budget-alert',
      data: {
        tenantId,
        current: alert.current.toFixed(2),
        limit: alert.limit.toFixed(2),
        percentage: alert.percentage.toFixed(1),
        recommendations: this.getRecommendations(alert)
      }
    });
  }
  
  private getRecommendations(alert: BudgetAlert): string[] {
    if (alert.percentage < 75) {
      return [
        'Your AI Insights usage is on track',
        'Continue monitoring usage patterns'
      ];
    } else if (alert.percentage < 90) {
      return [
        'Consider reviewing model routing rules',
        'Enable caching for repeated queries',
        'Use gpt-4o-mini for simple tasks'
      ];
    } else {
      return [
        'Urgent: Review and optimize usage immediately',
        'Consider implementing stricter quotas',
        'Disable non-essential features',
        'Contact support to discuss budget increase'
      ];
    }
  }
}
```

## Cost Optimization Strategies

### 1. Model Selection

```typescript
// Intelligent model routing based on complexity
export class ModelRouter {
  route(request: ChatRequest, context: Context): ModelConfig {
    const complexity = this.estimateComplexity(request, context);
    
    // Use cheaper models for simple tasks
    if (complexity < 0.3) {
      return {
        model: 'gpt-4o-mini',
        maxTokens: 500,
        temperature: 0.3,
        estimatedCost: 0.0002  // Very low cost
      };
    }
    
    // Medium complexity
    if (complexity < 0.7) {
      return {
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.5,
        estimatedCost: 0.0004
      };
    }
    
    // High complexity - use premium model
    return {
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.5,
      estimatedCost: 0.015  // Higher cost justified
    };
  }
  
  private estimateComplexity(request: ChatRequest, context: Context): number {
    const factors = {
      // Query complexity
      queryLength: Math.min(request.content.length / 1000, 0.3),
      
      // Context size
      contextSize: Math.min(context.shards.length / 30, 0.3),
      
      // Relationship depth
      hasRelationships: context.shards.some(s => s.relationships?.length) ? 0.2 : 0,
      
      // Requires reasoning
      requiresReasoning: this.detectReasoning(request.content) ? 0.2 : 0
    };
    
    return Math.min(
      Object.values(factors).reduce((a, b) => a + b, 0),
      1.0
    );
  }
  
  private detectReasoning(query: string): boolean {
    const reasoningKeywords = [
      'why', 'how', 'analyze', 'explain', 'compare',
      'evaluate', 'assess', 'determine', 'calculate'
    ];
    
    const lowerQuery = query.toLowerCase();
    return reasoningKeywords.some(keyword => lowerQuery.includes(keyword));
  }
}
```

**Savings**: Using `gpt-4o-mini` for 60% of queries can reduce costs by **~85%**.

### 2. Context Optimization

```typescript
// Minimize context size while maintaining quality
export class ContextOptimizer {
  optimize(context: Shard[], maxTokens: number = 2000): Shard[] {
    // Calculate token count for each shard
    const shardsWithTokens = context.map(shard => ({
      shard,
      tokens: this.estimateTokens(shard),
      relevance: shard.relevanceScore || 0
    }));
    
    // Sort by relevance
    shardsWithTokens.sort((a, b) => b.relevance - a.relevance);
    
    // Select shards within token budget
    const selected: Shard[] = [];
    let totalTokens = 0;
    
    for (const item of shardsWithTokens) {
      if (totalTokens + item.tokens <= maxTokens) {
        selected.push(item.shard);
        totalTokens += item.tokens;
      } else {
        break;
      }
    }
    
    logger.debug('Context optimized', {
      original: context.length,
      optimized: selected.length,
      tokens: totalTokens
    });
    
    return selected;
  }
  
  private estimateTokens(shard: Shard): number {
    // Rough estimation: 1 token ≈ 4 characters
    const content = JSON.stringify({
      title: shard.title,
      content: shard.content,
      metadata: shard.metadata
    });
    
    return Math.ceil(content.length / 4);
  }
}
```

**Savings**: Reducing context from 50 to 10 shards can save **~70% on input tokens**.

### 3. Caching Strategy

```typescript
// Multi-level caching to reduce API calls
export class CostOptimizedCache {
  // L1: In-memory cache (fastest, most expensive)
  private memoryCache = new Map<string, CachedResponse>();
  
  // L2: Redis cache (fast, moderate cost)
  // L3: Cosmos DB (slower, cheapest for long-term storage)
  
  async get(key: string): Promise<CachedResponse | null> {
    // Check L1 (memory)
    const memCached = this.memoryCache.get(key);
    if (memCached && !this.isExpired(memCached)) {
      return memCached;
    }
    
    // Check L2 (Redis)
    const redisCached = await redis.get(`cache:${key}`);
    if (redisCached) {
      const parsed = JSON.parse(redisCached);
      // Promote to L1
      this.memoryCache.set(key, parsed);
      return parsed;
    }
    
    // Check L3 (Cosmos DB for long-term cache)
    const dbCached = await cosmosDb.container('c_cache')
      .item(key, key)
      .read();
    
    if (dbCached.resource) {
      // Promote to L2 and L1
      await redis.setex(`cache:${key}`, 300, JSON.stringify(dbCached.resource));
      this.memoryCache.set(key, dbCached.resource);
      return dbCached.resource;
    }
    
    return null;
  }
  
  async set(key: string, value: CachedResponse, ttl: number): Promise<void> {
    // Store in all levels
    this.memoryCache.set(key, value);
    await redis.setex(`cache:${key}`, ttl, JSON.stringify(value));
    
    // Store in Cosmos DB for long-term cache (24 hours)
    if (ttl > 3600) {
      await cosmosDb.container('c_cache').items.create({
        id: key,
        pk: key,
        ...value,
        expiresAt: Date.now() + (ttl * 1000)
      });
    }
  }
}
```

**Savings**: 70% cache hit rate can reduce API costs by **~70%**.

### 4. Batch Processing

```typescript
// Process multiple queries together to reduce overhead
export class BatchProcessor {
  private queue: QueryRequest[] = [];
  private batchSize = 10;
  private batchTimeout = 1000;  // 1 second
  
  async enqueue(request: QueryRequest): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...request, resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else {
        // Process after timeout
        setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }
  
  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      // Combine contexts for all queries
      const contexts = await Promise.all(
        batch.map(q => this.getContext(q))
      );
      
      // Single LLM call for all queries
      const responses = await this.batchInference(
        batch.map((q, i) => ({ query: q.content, context: contexts[i] }))
      );
      
      // Resolve all promises
      batch.forEach((req, i) => {
        req.resolve(responses[i]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach(req => req.reject(error));
    }
  }
}
```

**Savings**: Batching can reduce overhead by **~30%** for high-volume scenarios.

## Cost Monitoring Dashboard

### Key Metrics to Track

```typescript
interface CostMetrics {
  // Real-time metrics
  currentMonthCost: number;
  projectedMonthCost: number;
  budgetUtilization: number;
  
  // Breakdown by service
  breakdown: {
    llmCosts: number;
    webSearchCosts: number;
    infraCosts: number;
  };
  
  // Breakdown by tenant
  topTenants: Array<{
    tenantId: string;
    cost: number;
    requests: number;
    avgCostPerRequest: number;
  }>;
  
  // Efficiency metrics
  cacheHitRate: number;
  avgTokensPerRequest: number;
  modelDistribution: Record<string, number>;
  
  // Alerts
  activeAlerts: Alert[];
  budgetExceeded: boolean;
}
```

### Application Insights Queries

```kusto
// Total cost by day
customMetrics
| where name == "ai_insights_cost"
| where timestamp > ago(30d)
| summarize TotalCost = sum(value) by bin(timestamp, 1d)
| render timechart

// Cost by tenant
customMetrics
| where name == "ai_insights_cost"
| where timestamp > ago(30d)
| extend tenantId = tostring(customDimensions.tenantId)
| summarize TotalCost = sum(value), RequestCount = count() by tenantId
| extend AvgCostPerRequest = TotalCost / RequestCount
| order by TotalCost desc
| take 10

// Model usage distribution
customMetrics
| where name == "ai_insights_cost"
| where timestamp > ago(7d)
| extend model = tostring(customDimensions.model)
| summarize RequestCount = count(), TotalCost = sum(value) by model
| render piechart

// Cache hit rate
customMetrics
| where name == "cache_hit" or name == "cache_miss"
| where timestamp > ago(1d)
| summarize Hits = countif(name == "cache_hit"), 
            Misses = countif(name == "cache_miss")
| extend HitRate = Hits * 100.0 / (Hits + Misses)
```

## Cost Optimization Checklist

### Immediate Actions
- [ ] Enable caching for web search results
- [ ] Implement model routing rules
- [ ] Set up per-tenant usage tracking
- [ ] Configure budget alerts
- [ ] Review and optimize context templates

### Short-term (1 week)
- [ ] Analyze usage patterns by tenant
- [ ] Optimize expensive queries
- [ ] Implement user quotas
- [ ] Set up cost dashboard
- [ ] Review model selection logic

### Medium-term (1 month)
- [ ] Implement batch processing
- [ ] Optimize context assembly
- [ ] Add cost estimation to UI
- [ ] Set up automated cost reports
- [ ] Review and adjust budgets

### Long-term (Ongoing)
- [ ] Monitor cache hit rates monthly
- [ ] Review model pricing changes
- [ ] Analyze ROI by feature
- [ ] Optimize infrastructure costs
- [ ] Plan capacity based on growth

## Pricing Tiers

### Recommended Tenant Pricing

| Tier | Monthly Fee | Included | Overage |
|------|------------|----------|---------|
| **Starter** | $99 | 10K requests, 5M tokens | $0.01/request |
| **Professional** | $299 | 50K requests, 25M tokens | $0.005/request |
| **Enterprise** | $999 | 250K requests, 125M tokens | $0.002/request |
| **Custom** | Contact | Unlimited | Custom pricing |

### Cost Calculator

```typescript
export function calculateMonthlyCost(usage: UsageEstimate): CostEstimate {
  const llmCost = 
    (usage.inputTokens * 2.5 / 1_000_000) +  // gpt-4o input
    (usage.outputTokens * 10 / 1_000_000);   // gpt-4o output
  
  const webSearchCost = usage.webSearches * 0.003;  // Bing API
  
  const infraCost = 270;  // Base infrastructure
  
  const totalCost = llmCost + webSearchCost + infraCost;
  
  return {
    totalCost,
    breakdown: {
      llm: llmCost,
      webSearch: webSearchCost,
      infrastructure: infraCost
    },
    recommendedTier: this.selectTier(usage.requests)
  };
}
```
