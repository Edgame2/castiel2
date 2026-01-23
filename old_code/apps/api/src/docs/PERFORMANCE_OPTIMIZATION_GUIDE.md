# Performance Optimization Guide

## Overview

This document provides performance optimization strategies for the Castiel platform, addressing potential performance issues in large service files, database queries, and cache management.

## Large Service Files

### Current Large Services

1. **conversation.service.ts** - 5,313 lines
2. **insight.service.ts** - 5,120 lines
3. **risk-evaluation.service.ts** - 3,205 lines

### Performance Impact

Large service files can impact performance through:
- **Memory Usage**: Larger memory footprint per service instance
- **Startup Time**: Slower service initialization
- **Code Loading**: Slower module loading and parsing
- **Maintainability**: Harder to optimize and refactor

### Optimization Strategies

#### 1. Service Decomposition

**Strategy**: Break large services into smaller, focused services

**Example**:
```typescript
// Before: insight.service.ts (5,120 lines)
class InsightService {
  // All insight-related functionality
}

// After: Decomposed services
class InsightService {
  // Core insight logic
}

class InsightContextService {
  // Context assembly
}

class InsightAnalysisService {
  // Analysis logic
}

class InsightCacheService {
  // Caching logic
}
```

**Benefits**:
- Smaller, focused services
- Better testability
- Easier optimization
- Reduced memory footprint

#### 2. Lazy Loading

**Strategy**: Load heavy dependencies only when needed

**Example**:
```typescript
class InsightService {
  private aiService?: AIService;
  
  private async getAIService(): Promise<AIService> {
    if (!this.aiService) {
      this.aiService = await import('./ai.service.js').then(m => new m.AIService());
    }
    return this.aiService;
  }
}
```

**Benefits**:
- Faster startup time
- Reduced initial memory usage
- Load dependencies on-demand

#### 3. Method Extraction

**Strategy**: Extract complex methods into separate utility classes

**Example**:
```typescript
// Extract complex logic into utilities
class InsightQueryBuilder {
  static buildComplexQuery(params: InsightParams): Query {
    // Complex query building logic
  }
}

class InsightResponseFormatter {
  static formatResponse(data: InsightData): FormattedResponse {
    // Complex formatting logic
  }
}
```

**Benefits**:
- Smaller service files
- Reusable utilities
- Better testability

## Database Query Optimization

### Query Patterns

#### 1. Index Usage

**Best Practice**: Ensure queries use appropriate indexes

```typescript
// Good: Uses indexed field
const shards = await repository.query({
  filter: { tenantId, shardTypeId }, // Both indexed
  limit: 100,
});

// Bad: Full table scan
const shards = await repository.query({
  filter: { description: { contains: 'search' } }, // Not indexed
  limit: 100,
});
```

#### 2. Pagination

**Best Practice**: Always use pagination for large result sets

```typescript
// Good: Paginated query
const result = await repository.list({
  filter: { tenantId },
  limit: 50,
  continuationToken: request.continuationToken,
});

// Bad: Loading all results
const allShards = await repository.findAll({ tenantId }); // Could be thousands
```

#### 3. Field Selection

**Best Practice**: Select only needed fields

```typescript
// Good: Select specific fields
const shards = await repository.query({
  filter: { tenantId },
  select: ['id', 'name', 'shardTypeId'], // Only needed fields
  limit: 100,
});

// Bad: Load all fields
const shards = await repository.query({
  filter: { tenantId },
  // Loads all fields including large unstructuredData
  limit: 100,
});
```

#### 4. Query Batching

**Best Practice**: Batch related queries

```typescript
// Good: Batch queries
const [shards, relationships, metadata] = await Promise.all([
  repository.findShards(ids),
  relationshipRepository.findRelationships(ids),
  metadataRepository.findMetadata(ids),
]);

// Bad: Sequential queries
const shards = await repository.findShards(ids);
const relationships = await relationshipRepository.findRelationships(ids);
const metadata = await metadataRepository.findMetadata(ids);
```

### Cosmos DB Specific Optimizations

#### 1. Partition Key Strategy

**Best Practice**: Use tenantId as partition key for multi-tenant queries

```typescript
// Good: Queries within partition
const shards = await container.items
  .query({
    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
    parameters: [{ name: '@tenantId', value: tenantId }],
  })
  .fetchAll();

// Bad: Cross-partition query
const shards = await container.items
  .query({
    query: 'SELECT * FROM c WHERE c.name = @name', // No partition key
    parameters: [{ name: '@name', value: name }],
  })
  .fetchAll();
```

#### 2. Request Units (RU) Optimization

**Best Practice**: Minimize RU consumption

```typescript
// Good: Efficient query with limit
const result = await container.items
  .query({
    query: 'SELECT TOP 10 * FROM c WHERE c.tenantId = @tenantId',
    parameters: [{ name: '@tenantId', value: tenantId }],
  })
  .fetchAll();

// Bad: Inefficient query
const result = await container.items
  .query({
    query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
    parameters: [{ name: '@tenantId', value: tenantId }],
  })
  .fetchAll(); // Loads all results, high RU cost
```

#### 3. Composite Indexes

**Best Practice**: Use composite indexes for common query patterns

```typescript
// Define composite index in container creation
compositeIndexes: [
  [
    { path: '/tenantId', order: 'ascending' },
    { path: '/shardTypeId', order: 'ascending' },
    { path: '/createdAt', order: 'descending' },
  ],
]
```

## Cache Management

### Cache Strategies

#### 1. Cache-Aside Pattern

**Best Practice**: Check cache first, then database

```typescript
async getShard(id: string, tenantId: string): Promise<Shard | null> {
  // 1. Check cache
  const cacheKey = `shard:${tenantId}:${id}`;
  const cached = await this.cache.get(cacheKey);
  if (cached) {
    return cached as Shard;
  }

  // 2. Load from database
  const shard = await this.repository.findById(id, tenantId);
  if (shard) {
    // 3. Store in cache
    await this.cache.set(cacheKey, shard, { ttl: 300 }); // 5 minutes
  }

  return shard;
}
```

#### 2. Cache Invalidation

**Best Practice**: Invalidate cache on updates

```typescript
async updateShard(id: string, tenantId: string, updates: Partial<Shard>): Promise<Shard> {
  // 1. Update in database
  const updated = await this.repository.update(id, tenantId, updates);

  // 2. Invalidate cache
  const cacheKey = `shard:${tenantId}:${id}`;
  await this.cache.del(cacheKey);

  // 3. Invalidate related caches
  await this.cache.del(`shard-list:${tenantId}`);
  await this.cache.del(`shard-type:${tenantId}:${updated.shardTypeId}`);

  return updated;
}
```

#### 3. Cache Warming

**Best Practice**: Pre-populate cache for frequently accessed data

```typescript
async warmCache(tenantId: string): Promise<void> {
  // Load frequently accessed shards
  const popularShards = await this.repository.findPopular(tenantId, { limit: 100 });
  
  for (const shard of popularShards) {
    const cacheKey = `shard:${tenantId}:${shard.id}`;
    await this.cache.set(cacheKey, shard, { ttl: 600 }); // 10 minutes
  }
}
```

#### 4. Cache TTL Strategy

**Best Practice**: Use appropriate TTL based on data volatility

```typescript
const CACHE_TTL = {
  STATIC: 3600,        // 1 hour - rarely changes (shard types)
  SEMI_STATIC: 600,    // 10 minutes - occasionally changes (shards)
  DYNAMIC: 60,         // 1 minute - frequently changes (analytics)
  REAL_TIME: 5,        // 5 seconds - near real-time (live data)
};
```

### Cache Invalidation Patterns

#### 1. Time-Based Invalidation

```typescript
// Invalidate after TTL expires
await cache.set(key, value, { ttl: 300 }); // Auto-invalidates after 5 minutes
```

#### 2. Event-Based Invalidation

```typescript
// Invalidate on specific events
eventBus.on('shard.updated', async (event) => {
  await cache.del(`shard:${event.tenantId}:${event.shardId}`);
  await cache.del(`shard-list:${event.tenantId}`);
});
```

#### 3. Tag-Based Invalidation

```typescript
// Invalidate by tags
await cache.set(key, value, { tags: ['shard', `tenant:${tenantId}`] });
await cache.invalidateByTag('shard'); // Invalidates all shard caches
```

## Performance Monitoring

### Key Metrics

1. **Response Time**: Track P50, P95, P99 response times
2. **Database Query Time**: Monitor query execution time
3. **Cache Hit Rate**: Track cache hit/miss ratio
4. **Memory Usage**: Monitor service memory consumption
5. **Request Rate**: Track requests per second

### Monitoring Implementation

```typescript
// Track performance metrics
const startTime = Date.now();
try {
  const result = await performOperation();
  const duration = Date.now() - startTime;
  
  monitoring.trackMetric('operation.duration', duration, {
    operation: 'getShard',
    success: true,
  });
  
  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  monitoring.trackMetric('operation.duration', duration, {
    operation: 'getShard',
    success: false,
  });
  throw error;
}
```

## Best Practices Summary

### Service Design

1. ✅ Keep services focused and small (< 2,000 lines)
2. ✅ Use lazy loading for heavy dependencies
3. ✅ Extract complex logic into utilities
4. ✅ Decompose large services into smaller ones

### Database Queries

1. ✅ Always use pagination
2. ✅ Select only needed fields
3. ✅ Use appropriate indexes
4. ✅ Batch related queries
5. ✅ Use partition keys effectively

### Caching

1. ✅ Use cache-aside pattern
2. ✅ Invalidate cache on updates
3. ✅ Use appropriate TTL values
4. ✅ Monitor cache hit rates
5. ✅ Implement cache warming for hot data

### Monitoring

1. ✅ Track response times
2. ✅ Monitor database query performance
3. ✅ Track cache hit rates
4. ✅ Monitor memory usage
5. ✅ Set up alerts for performance degradation

## Performance Checklist

### Service Optimization

- [ ] Service files < 2,000 lines (or decomposed)
- [ ] Heavy dependencies loaded lazily
- [ ] Complex logic extracted to utilities
- [ ] Services are focused and single-purpose

### Query Optimization

- [ ] All queries use pagination
- [ ] Only needed fields are selected
- [ ] Appropriate indexes are defined
- [ ] Queries use partition keys
- [ ] Related queries are batched

### Cache Optimization

- [ ] Cache-aside pattern implemented
- [ ] Cache invalidation on updates
- [ ] Appropriate TTL values set
- [ ] Cache hit rates monitored
- [ ] Cache warming for hot data

### Monitoring

- [ ] Response times tracked
- [ ] Database query times monitored
- [ ] Cache hit rates tracked
- [ ] Memory usage monitored
- [ ] Performance alerts configured

## Related Documentation

- [Service Architecture](../ARCHITECTURE.md)
- [Database Schema](../DATABASE_SCHEMA.md)
- [Caching Strategy](../CACHING_STRATEGY.md)
- [Monitoring Guide](../MONITORING.md)

---

**Last Updated**: 2025-01-28  
**Maintained By**: Platform Team
