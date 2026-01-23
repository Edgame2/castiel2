# Cache Optimization Summary

## Overview

This document summarizes the cache optimization strategies implemented to improve performance and reduce database load.

## Cache TTL Optimization

### TTL Values by Resource Type

| Resource Type | TTL | Rationale |
|--------------|-----|-----------|
| Shard Structured Data | 15-30 min | Frequently read, updates less common |
| Shard Types | 2 hours | Rarely change, frequently accessed for validation |
| User Profiles | 1 hour | Change infrequently, reduces auth-broker calls |
| ACL Checks | 10 min | Security-sensitive, permission changes need quick propagation |
| Vector Search | 30 min | Expensive computations, results stable for similar queries |
| Dashboard Data | 15 min | Can change but not too frequently |
| Tenant Config | 1 hour | Changes rarely |
| Fiscal Year | 24 hours | Changes very rarely |

### TTL Jitter

All cache TTLs now include **±10% jitter** to prevent thundering herd problems when multiple cache entries expire simultaneously.

**Benefits:**
- Prevents simultaneous cache misses
- Reduces database load spikes
- Improves overall system stability

**Implementation:**
```typescript
import { applyTTLJitter } from '../utils/cache-ttl-helpers.js';

// Apply jitter to base TTL
const ttlWithJitter = applyTTLJitter(CacheTTL.SHARD_STRUCTURED);
await cacheService.set(key, data, ttlWithJitter);
```

## Cache Key Patterns

All cache keys follow a consistent, hierarchical pattern:

```
tenant:{tenantId}:{resource}:{resourceId}[:{subresource}]
```

**Examples:**
- `tenant:123:shard:abc:structured`
- `tenant:123:shardtype:xyz`
- `tenant:123:acl:user456:shard789`

**Benefits:**
- Easy pattern matching for bulk invalidation
- Clear tenant isolation
- Consistent across all cache services

## Cache Warming

Cache warming preloads frequently accessed data on startup or on-demand.

### Supported Resources

1. **Shards** - Most frequently accessed shards
2. **ACL Entries** - Permissions for frequently accessed shards
3. **Shard Types** - All active shard types (tenant-specific and global)

### Warming Strategies

- **Frequency**: Most accessed items (requires access logs)
- **Recency**: Most recently updated items
- **Hybrid**: Combination of recent and frequently updated

### Usage

```typescript
const config: CacheWarmingConfig = {
  enabled: true,
  strategy: 'hybrid',
  topN: 100,
  includeShards: true,
  includeACL: true,
  includeShardTypes: true,
  maxDurationMs: 300000, // 5 minutes
};

await cacheWarmingService.warmCache(config);
```

## Cache Invalidation

### Automatic Invalidation

Cache entries are automatically invalidated on:
- **Shard updates/deletes** → Shard cache invalidated
- **Shard type updates/deletes** → Shard type cache invalidated
- **Permission changes** → ACL cache invalidated
- **User profile updates** → User profile cache invalidated

### Distributed Invalidation

Cache invalidation events are published via Redis pub/sub to ensure all service instances invalidate their caches.

## Cache Metrics

All cache operations are tracked with metrics:

- `cache.hit` - Cache hit count
- `cache.miss` - Cache miss count
- `cache.set` - Cache write count
- `cache.delete` - Cache invalidation count
- `cache.hit_rate` - Overall hit rate percentage

### Target Metrics

- **Hit Rate**: >80% target
- **Latency**: <5ms for cache operations
- **Memory Usage**: Monitor Redis memory usage

## Optimization Utilities

### TTL Helpers

Located in `apps/api/src/utils/cache-ttl-helpers.ts`:

- `applyTTLJitter()` - Apply jitter to TTL values
- `getOptimizedTTL()` - Get optimized TTL based on access patterns
- `getTTLWithJitter()` - Get TTL with jitter for resource type
- `TTL_RATIONALE` - Documentation of TTL choices

### Cache Key Builders

Located in `apps/api/src/utils/cache-keys.ts`:

- Consistent key patterns
- Pattern matching for invalidation
- Tenant isolation helpers

## Best Practices

1. **Use TTL Jitter**: Always apply jitter to prevent thundering herd
2. **Monitor Hit Rates**: Track cache hit rates and optimize TTLs accordingly
3. **Warm Frequently Accessed Data**: Use cache warming for startup optimization
4. **Invalidate on Updates**: Always invalidate cache on data mutations
5. **Use Consistent Key Patterns**: Follow established key naming conventions
6. **Monitor Memory Usage**: Track Redis memory to prevent evictions

## Performance Impact

### Expected Improvements

- **Database Load**: 30-50% reduction in database queries
- **Response Time**: 20-40% improvement for cached resources
- **Throughput**: 2-3x increase in requests per second
- **Cost**: Reduced Cosmos DB RU consumption

### Monitoring

Monitor these metrics to validate optimization:
- Cache hit rate (target: >80%)
- Database query reduction
- API response time improvement
- Redis memory usage

## Related Documentation

- [Caching Guide](../guides/caching.md)
- [Performance Budgets](./PERFORMANCE_BUDGETS.md)
- [Database Query Optimization](./DATABASE_QUERY_OPTIMIZATION_ANALYSIS.md)
