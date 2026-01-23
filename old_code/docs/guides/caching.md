# Castiel API - Caching Strategy Documentation

## Table of Contents
1. [Overview](#overview)
2. [Cache Strategy](#cache-strategy)
3. [Cache Key Naming Conventions](#cache-key-naming-conventions)
4. [TTL Configuration](#ttl-configuration)
5. [Cache Invalidation Flows](#cache-invalidation-flows)
6. [Cache Warming Strategy](#cache-warming-strategy)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Performance Tuning](#performance-tuning)
9. [Redis Monitoring](#redis-monitoring)

---

## Overview

Castiel API uses **Azure Cache for Redis** (Standard C2 tier) to provide:
- **Multi-tenant data isolation** with tenant-scoped cache keys
- **High performance** with sub-millisecond response times
- **Scalability** with horizontal scaling across instances
- **Reliability** with built-in replication and persistence

### What We Cache

✅ **Shard Structured Data** (15-30 min TTL)
- High read frequency relative to writes
- Structured data only (unstructured data and vectors are too large)
- Invalidated on any shard update/delete

✅ **User Profiles** (1 hour TTL)
- Reduces calls to auth-broker service
- Invalidated on user profile updates

✅ **ACL Permission Checks** (10 min TTL)
- Security-sensitive but frequently accessed
- Invalidated on permission changes
- Supports hierarchical permission resolution

✅ **Vector Search Results** (30 min TTL)
- Expensive similarity computations
- Cached by query parameters and tenant
- Automatically invalidated on shard updates

✅ **JWT Token Validation** (5 min TTL)
- Balances security and performance
- Includes token blacklist for revocation

✅ **User Sessions** (Sliding expiration)
- Replaces database-backed sessions
- Extended on each request

✅ **SSO Configurations** (1 hour TTL)
- Rarely changes
- Critical for auth flows

### What We DON'T Cache

❌ **Shard Unstructured Data** - Too large (can be GBs)
❌ **Shard Vectors** - Too large (1536 dimensions × 4 bytes)
✅ **ShardTypes** - Cached with 2-hour TTL (rarely change, frequently accessed)
❌ **Revisions** - Always fetch fresh for data integrity
❌ **Shard Lists** - Too dynamic (can use short TTL if needed)

---

## Cache Strategy

### Cache-Aside (Lazy Loading) Pattern

We use the **cache-aside** pattern across all cached resources:

```typescript
async function getShard(shardId: string, tenantId: string): Promise<Shard> {
  // 1. Try to get from cache
  const cacheKey = `tenant:${tenantId}:shard:${shardId}:structured`;
  const cached = await cacheService.get<Shard>(cacheKey);
  
  if (cached) {
    monitoring.trackMetric('cache.hit', 1, { resource: 'shard' });
    return cached;
  }
  
  // 2. Cache miss - fetch from database
  monitoring.trackMetric('cache.miss', 1, { resource: 'shard' });
  const shard = await database.getShard(shardId, tenantId);
  
  // 3. Store in cache for future requests
  await cacheService.set(cacheKey, shard, TTL.SHARD_STRUCTURED_DATA);
  
  return shard;
}
```

**Benefits:**
- Only cache data that's actually requested
- No cache preloading overhead
- Simple to implement and reason about
- Automatic cache population

**Trade-offs:**
- First request always misses cache (mitigated by cache warming)
- Potential "thundering herd" on cache expiry (mitigated by TTL jitter)

---

## Cache Key Naming Conventions

All cache keys follow a consistent, hierarchical naming pattern:

### Pattern Structure
```
tenant:{tenantId}:{resource}:{resourceId}[:{subresource}]
```

### Key Examples

| Resource | Key Pattern | Example |
|----------|-------------|---------|
| Shard Structured Data | `tenant:{tenantId}:shard:{shardId}:structured` | `tenant:123:shard:abc:structured` |
| User Profile | `tenant:{tenantId}:user:{userId}:profile` | `tenant:123:user:456:profile` |
| ACL Permissions | `tenant:{tenantId}:acl:{shardId}:{userId}` | `tenant:123:acl:abc:456` |
| Vector Search | `tenant:{tenantId}:search:vector:{hash}` | `tenant:123:search:vector:a1b2c3` |
| JWT Validation | `auth:jwt:validation:{userId}:{jti}` | `auth:jwt:validation:456:xyz` |
| Token Blacklist | `auth:token:blacklist:{jti}` | `auth:token:blacklist:xyz` |
| User Session | `auth:session:{sessionId}` | `auth:session:sess_123` |
| SSO Config | `tenant:{tenantId}:sso:config:{provider}` | `tenant:123:sso:config:okta` |

### Key Design Principles

1. **Tenant Isolation**: Always prefix with `tenant:{tenantId}` for tenant-scoped data
2. **Resource Type**: Include resource type for clarity and pattern matching
3. **Unique Identifier**: Use stable IDs (UUID, hash) for uniqueness
4. **Hierarchical**: Organize from general to specific
5. **Consistency**: Use consistent naming across the codebase

### Pattern Matching for Invalidation

```typescript
// Invalidate all shards for a tenant
await cache.deleteByPattern(`tenant:${tenantId}:shard:*`);

// Invalidate all ACL entries for a shard
await cache.deleteByPattern(`tenant:${tenantId}:acl:${shardId}:*`);

// Invalidate all vector searches for a tenant
await cache.deleteByPattern(`tenant:${tenantId}:search:vector:*`);
```

---

## TTL Configuration

Time-to-Live (TTL) values balance **freshness** vs **performance**:

### TTL Table

| Resource | TTL | Rationale |
|----------|-----|-----------|
| **Shard Structured Data** | 15-30 min | High read:write ratio, balance freshness |
| **User Profiles** | 1 hour | Infrequent updates, reduces auth-broker load |
| **ACL Permissions** | 10 min | Security-sensitive, moderate freshness needs |
| **Vector Search Results** | 30 min | Expensive to compute, tolerate staleness |
| **JWT Token Validation** | 5 min | Security vs performance balance |
| **User Sessions** | Sliding (9 hours) | Extends on activity, expires on inactivity |
| **Token Blacklist** | Token expiry | Exactly matches token lifetime |
| **SSO Configurations** | 1 hour | Rarely changes, critical for auth |

### TTL Jitter

To prevent "thundering herd" on cache expiry, we add random jitter:

```typescript
const TTL_JITTER = 0.1; // 10% jitter

function getTTLWithJitter(baseTTL: number): number {
  const jitter = baseTTL * TTL_JITTER;
  return baseTTL + Math.random() * jitter * 2 - jitter;
}

// Example: 30 min TTL → 27-33 min range
const ttl = getTTLWithJitter(30 * 60); // seconds
```

### Configuring TTLs

TTL constants are defined in `src/cache/redis.ts`:

```typescript
export const TTL = {
  SHARD_STRUCTURED_DATA: 30 * 60,        // 30 minutes
  SHARD_STRUCTURED_DATA_MIN: 15 * 60,    // 15 minutes
  USER_PROFILE: 60 * 60,                 // 1 hour
  ACL_PERMISSION: 10 * 60,               // 10 minutes
  VECTOR_SEARCH: 30 * 60,                // 30 minutes
  JWT_VALIDATION: 5 * 60,                // 5 minutes
  SSO_CONFIG: 60 * 60,                   // 1 hour
  SESSION: 9 * 60 * 60,                  // 9 hours
};
```

---

## Cache Invalidation Flows

Cache invalidation ensures **data consistency** across instances.

### Write-Through Invalidation

On any write operation (CREATE, UPDATE, DELETE), we immediately invalidate related cache entries:

```typescript
async function updateShard(shardId: string, tenantId: string, data: Partial<Shard>) {
  // 1. Update database
  const updated = await database.updateShard(shardId, tenantId, data);
  
  // 2. Invalidate cache
  await cache.delete(`tenant:${tenantId}:shard:${shardId}:structured`);
  
  // 3. Invalidate related caches
  await cache.deleteByPattern(`tenant:${tenantId}:search:vector:*`);
  
  // 4. Publish invalidation event for other instances
  await redis.publish('cache:invalidate:shard', JSON.stringify({
    tenantId,
    shardId,
  }));
  
  return updated;
}
```

### Pub/Sub Cross-Instance Sync

For multi-instance deployments, we use **Redis Pub/Sub** to synchronize cache invalidation:

**Publisher (on write):**
```typescript
await redis.publish('cache:invalidate:shard', JSON.stringify({
  tenantId: '123',
  shardId: 'abc',
}));
```

**Subscriber (on all instances):**
```typescript
redis.subscribe('cache:invalidate:shard');

redis.on('message', async (channel, message) => {
  const { tenantId, shardId } = JSON.parse(message);
  await cache.delete(`tenant:${tenantId}:shard:${shardId}:structured`);
});
```

**Channels:**
- `cache:invalidate:shard` - Shard updates
- `cache:invalidate:user` - User profile updates
- `cache:invalidate:acl` - ACL permission changes
- `cache:invalidate:sso` - SSO configuration changes

### Invalidation Strategies

1. **Immediate Invalidation**: Delete cache entry on write
2. **Pattern-based Invalidation**: Delete multiple related entries (e.g., all searches)
3. **Cross-instance Sync**: Pub/Sub to notify other instances
4. **TTL Expiration**: Automatic cleanup after TTL expires

### Invalidation Example: Shard Update

```
User Request (Update Shard)
    ↓
Main API Instance 1
    ↓
1. Update Cosmos DB
2. Delete local cache: tenant:123:shard:abc:structured
3. Delete search cache: tenant:123:search:vector:*
4. Publish: cache:invalidate:shard {tenantId: 123, shardId: abc}
    ↓
Redis Pub/Sub
    ↓
    ├─→ Main API Instance 2 (receives message, invalidates cache)
    └─→ Main API Instance 3 (receives message, invalidates cache)
```

---

## Cache Warming Strategy

Cache warming **pre-populates** frequently accessed data to avoid cold starts.

### When to Warm Cache

- **Application Startup**: Warm critical tenant data
- **After Deployment**: Prevent performance degradation
- **Scheduled Jobs**: Warm during off-peak hours
- **On-Demand**: Manual trigger via admin endpoint

### What to Warm

1. **Hot Tenants**: Top 20% by request volume
2. **Critical Data**: SSO configs, frequently accessed shards
3. **Predictable Access**: Daily reports, dashboards

### Cache Warming Implementation

**Automatic warming on startup:**
```typescript
async function warmCache() {
  const hotTenants = await getHotTenants(); // Top 20% by traffic
  
  for (const tenantId of hotTenants) {
    // Warm SSO config
    const ssoConfig = await database.getSSOConfig(tenantId);
    await cache.set(`tenant:${tenantId}:sso:config`, ssoConfig, TTL.SSO_CONFIG);
    
    // Warm frequently accessed shards
    const topShards = await database.getTopShards(tenantId, 100);
    for (const shard of topShards) {
      await cache.set(
        `tenant:${tenantId}:shard:${shard.id}:structured`,
        shard.structuredData,
        TTL.SHARD_STRUCTURED_DATA
      );
    }
  }
}
```

**Manual warming via admin endpoint:**
```bash
POST /api/admin/cache/warm
Authorization: Bearer <admin-token>

{
  "tenantId": "123",
  "resources": ["shards", "sso"]
}
```

### Warming Best Practices

- **Prioritize**: Warm most critical data first
- **Limit Scope**: Don't warm everything (defeats lazy loading)
- **Monitor**: Track warming time and success rate
- **Off-Peak**: Schedule warming during low-traffic periods
- **Gradual**: Warm in batches to avoid overwhelming Redis/DB

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Low Cache Hit Rate

**Symptoms:**
- Hit rate below 60%
- High database load
- Slow response times

**Diagnosis:**
```bash
# Check cache stats
curl -H "Authorization: Bearer <token>" \
  http://localhost:4001/api/admin/cache/stats

# Response:
{
  "hits": 1000,
  "misses": 9000,
  "hitRate": 0.10,  # 10% - Too low!
  "sets": 1000,
  "deletes": 500
}
```

**Solutions:**
1. **Check TTLs**: May be too short
2. **Review Invalidation**: May be too aggressive
3. **Identify Hot Keys**: Use Redis `MONITOR` or key analysis
4. **Warm Cache**: Pre-populate frequently accessed data
5. **Increase TTLs**: If staleness is acceptable

#### Issue: Stale Data in Cache

**Symptoms:**
- Users see outdated data
- Cache doesn't reflect recent updates

**Diagnosis:**
```bash
# Check if key exists
redis-cli GET "tenant:123:shard:abc:structured"

# Check TTL
redis-cli TTL "tenant:123:shard:abc:structured"
# Returns seconds remaining
```

**Solutions:**
1. **Manual Invalidation**: Delete specific key
   ```bash
   curl -X DELETE \
     -H "Authorization: Bearer <admin-token>" \
     http://localhost:4001/api/admin/cache/tenant/123/shard/abc
   ```

2. **Pattern Invalidation**: Clear all related keys
   ```bash
   curl -X DELETE \
     -H "Authorization: Bearer <admin-token>" \
     http://localhost:4001/api/admin/cache/tenant/123/shards
   ```

3. **Check Pub/Sub**: Ensure cache subscriber is running
   ```bash
   # Check logs for subscriber initialization
   grep "Cache subscriber initialized" logs/main-api.log
   ```

#### Issue: Redis Connection Failures

**Symptoms:**
- `ECONNREFUSED` errors
- Requests bypass cache (performance degradation)

**Diagnosis:**
```bash
# Check Redis health
redis-cli PING
# Should return: PONG

# Check connection from app
curl http://localhost:4001/health
# Should show Redis: healthy
```

**Solutions:**
1. **Verify Credentials**: Check `.env` file
   ```
   REDIS_HOST=your-cache.redis.cache.windows.net
   REDIS_PORT=6380
   REDIS_PASSWORD=your-password
   REDIS_TLS_ENABLED=true
   ```

2. **Check Network**: Verify firewall/NSG rules allow Redis port

3. **Restart Redis**: If self-hosted
   ```bash
   sudo systemctl restart redis
   ```

4. **Graceful Degradation**: App should continue without cache
   ```typescript
   try {
     cached = await cache.get(key);
   } catch (err) {
     logger.warn('Cache unavailable, fetching from DB');
     return await database.get(id);
   }
   ```

#### Issue: Memory Pressure (Redis OOM)

**Symptoms:**
- Redis evictions increasing
- `OOM` errors in logs

**Diagnosis:**
```bash
# Check memory usage
redis-cli INFO memory

# Check eviction policy
redis-cli CONFIG GET maxmemory-policy
# Should be: allkeys-lru
```

**Solutions:**
1. **Increase Redis Memory**: Scale up to larger tier
2. **Lower TTLs**: Reduce memory footprint
3. **Reduce Cached Data**: Remove large items
4. **Check for Memory Leaks**: Monitor key count growth
   ```bash
   redis-cli DBSIZE
   ```

#### Issue: Cache Invalidation Not Working

**Symptoms:**
- Updates not reflected in cache
- Different instances show different data

**Diagnosis:**
```bash
# Check Pub/Sub subscribers
redis-cli PUBSUB NUMSUB cache:invalidate:shard

# Check Pub/Sub messages
redis-cli SUBSCRIBE cache:invalidate:shard
# (Make an update and see if message appears)
```

**Solutions:**
1. **Verify Subscriber**: Ensure `CacheSubscriberService` is initialized
   ```bash
   grep "Cache subscriber initialized" logs/main-api.log
   ```

2. **Check Redis Pub/Sub**: May need separate Redis connection
   ```typescript
   const subscriber = new Redis(config.redis);
   await subscriber.subscribe('cache:invalidate:shard');
   ```

3. **Manual Flush**: Emergency cache clear
   ```bash
   curl -X DELETE \
     -H "Authorization: Bearer <admin-token>" \
     http://localhost:4001/api/admin/cache/flush
   ```

### Emergency Procedures

#### Full Cache Flush
```bash
# Flush all cache (USE WITH CAUTION)
redis-cli FLUSHDB

# Or via API
curl -X DELETE \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:4001/api/admin/cache/flush

# Then warm cache
curl -X POST \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:4001/api/admin/cache/warm
```

#### Tenant-specific Flush
```bash
# Safer: Flush only one tenant
curl -X DELETE \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:4001/api/admin/cache/tenant/123/flush
```

---

## Performance Tuning

### Optimize Cache Hit Rate

**Target**: 70-80% hit rate for production

**Strategies:**
1. **Increase TTLs** for stable data
2. **Warm cache** on startup/deployment
3. **Reduce invalidation frequency** if acceptable
4. **Monitor hot keys** and prioritize caching

### Optimize Redis Performance

1. **Use Pipelining** for batch operations
   ```typescript
   const pipeline = redis.pipeline();
   keys.forEach(key => pipeline.get(key));
   const results = await pipeline.exec();
   ```

2. **Use Connection Pooling** (ioredis default)
   ```typescript
   const redis = new Redis({
     ...config.redis,
     maxRetriesPerRequest: 3,
     enableReadyCheck: true,
     lazyConnect: false,
   });
   ```

3. **Monitor Slow Commands**
   ```bash
   redis-cli SLOWLOG GET 10
   ```

4. **Optimize Serialization** (use msgpack for smaller payloads)
   ```typescript
   import msgpack from 'msgpack-lite';
   
   await redis.set(key, msgpack.encode(data));
   const data = msgpack.decode(await redis.getBuffer(key));
   ```

### Optimize Network Latency

1. **Co-locate Redis**: Same region as app servers
2. **Enable TLS Session Reuse**: Reduce TLS handshake overhead
3. **Use Premium Redis Tier**: Lower latency, higher throughput

---

## Redis Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Cache Hit Rate** | 70-80% | < 60% |
| **Memory Usage** | < 80% | > 85% |
| **Evictions/sec** | 0 | > 10 |
| **Connected Clients** | Stable | Sudden spikes |
| **Commands/sec** | Baseline | 10x increase |
| **Network I/O** | Baseline | Saturation |

### Monitoring with Azure Monitor

**Enable Diagnostics:**
```bash
az redis update \
  --resource-group castiel-rg \
  --name castiel-redis \
  --set enableNonSslPort=false \
  --set diagnosticsEnabled=true
```

**Key Alerts:**
1. **High Memory Usage**: > 85%
2. **Low Hit Rate**: < 60%
3. **High Evictions**: > 10/sec
4. **Connection Failures**: Any

**Dashboards:**
- Azure Portal → Your Redis → Metrics
- Application Insights → Custom Metrics
- Grafana (if using custom monitoring)

### Application-Level Monitoring

Track cache metrics in your app:

```typescript
monitoring.trackMetric('cache.hit', 1, { resource: 'shard', tenant: tenantId });
monitoring.trackMetric('cache.miss', 1, { resource: 'shard', tenant: tenantId });
monitoring.trackMetric('cache.latency', latencyMs, { operation: 'get' });
```

**Query in Application Insights:**
```kusto
customMetrics
| where name == "cache.hit" or name == "cache.miss"
| summarize hits = sumif(value, name == "cache.hit"),
            misses = sumif(value, name == "cache.miss")
| extend hitRate = hits / (hits + misses)
```

---

## Best Practices Summary

✅ **Always** use tenant-scoped cache keys
✅ **Always** invalidate cache on writes
✅ **Always** handle cache failures gracefully
✅ **Monitor** cache hit rates and adjust TTLs
✅ **Warm** cache after deployments
✅ **Use** Redis Pub/Sub for multi-instance sync
✅ **Test** cache invalidation in staging
✅ **Document** new cache patterns

❌ **Never** cache sensitive data (passwords, tokens)
❌ **Never** rely solely on cache (always have DB fallback)
❌ **Never** cache unbounded data (lists without limits)
❌ **Never** use cache as primary data store

---

## Additional Resources

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Azure Cache for Redis Documentation](https://docs.microsoft.com/azure/redis-cache/)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [Fastify Caching](https://www.fastify.io/docs/latest/Guides/Getting-Started/#caching)

---

**Last Updated**: January 2025
**Maintained By**: Castiel API Team

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Caching strategy fully documented and implemented

#### Implemented Features (✅)

- ✅ Cache-aside pattern
- ✅ Tenant-scoped cache keys
- ✅ TTL configuration
- ✅ Cache invalidation flows
- ✅ Cache warming strategy
- ✅ Redis monitoring
- ✅ Performance tuning guidelines

#### Known Limitations

- ⚠️ **Cache Invalidation** - Some invalidation paths may not be fully implemented
  - **Code Reference:**
    - Cache invalidation may need review across all services
  - **Recommendation:**
    1. Audit all cache invalidation paths
    2. Ensure consistent invalidation
    3. Test invalidation scenarios

- ⚠️ **Cache Monitoring** - Cache monitoring may not be fully automated
  - **Recommendation:**
    1. Set up automated cache monitoring
    2. Configure cache alerts
    3. Document monitoring procedures

### Code References

- **Backend Services:**
  - `apps/api/src/services/cache.service.ts` - Cache service
  - `apps/api/src/services/dashboard-cache.service.ts` - Dashboard caching
  - `apps/api/src/services/acl-cache.service.ts` - ACL caching

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Backend Documentation](../backend/README.md) - Backend implementation
