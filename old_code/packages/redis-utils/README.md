# @castiel/redis-utils

Redis utilities for caching and pub/sub functionality in Castiel services.

## Features

- 🔌 **Connection Management** - Automatic retry logic, health checks, connection pooling
- 💾 **Cache Service** - High-level caching with TTL, pattern invalidation, bulk operations
- 📡 **Pub/Sub Service** - Cross-instance cache invalidation with pattern matching
- 🏥 **Health Checks** - Monitor Redis connection status and latency
- 🔄 **Graceful Fallback** - Handle Redis unavailability gracefully
- 🔒 **Multi-tenant Isolation** - Tenant-based cache keys from shared-types

## Installation

This is a workspace package and is automatically available to other packages/services in the monorepo.

## Usage

### 1. Initialize Connection Manager

```typescript
import { RedisConnectionManager } from '@castiel/redis-utils';

const connectionManager = new RedisConnectionManager({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true',
});
```

### 2. Cache Service

```typescript
import { RedisCacheService } from '@castiel/redis-utils';
import { CACHE_KEYS, CACHE_TTL } from '@castiel/shared-types';

const cache = new RedisCacheService(connectionManager);

// Set with TTL
await cache.set(CACHE_KEYS.user('tenant1', 'user123'), userData, CACHE_TTL.USER_PROFILE);

// Get
const user = await cache.get(CACHE_KEYS.user('tenant1', 'user123'));

// Delete
await cache.delete(CACHE_KEYS.user('tenant1', 'user123'));

// Delete by pattern
await cache.deletePattern('tenant:tenant1:user:*');

// Bulk operations
await cache.mset([
  { key: 'key1', value: 'value1', ttl: 60 },
  { key: 'key2', value: 'value2', ttl: 120 },
]);

const values = await cache.mget(['key1', 'key2']);

// Counters
await cache.increment('counter:key', 1);
await cache.decrement('counter:key', 1);

// TTL management
await cache.expire('key', 300);
const remaining = await cache.ttl('key');

// Check existence
const exists = await cache.exists('key');

// Stats
const stats = await cache.getStats();
console.log(`Cache has ${stats.keys} keys, using ${stats.memory}`);
```

### 3. Pub/Sub Service

```typescript
import { RedisPubSubService } from '@castiel/redis-utils';

const pubsub = new RedisPubSubService(connectionManager);
await pubsub.initialize();

// Subscribe to specific channel
await pubsub.subscribe('cache:invalidate:user:tenant1:user123', (channel, message) => {
  console.log(`Received on ${channel}:`, message);
  // Invalidate local cache
});

// Subscribe with pattern
await pubsub.subscribe('cache:invalidate:shard:*', (channel, message) => {
  const data = JSON.parse(message);
  // Handle invalidation
});

// Publish message
await pubsub.publish('cache:invalidate:user:tenant1:user123', JSON.stringify({
  action: 'invalidate',
  timestamp: new Date().toISOString(),
}));

// Invalidate cache (convenience method)
await pubsub.invalidate('tenant1', 'shard', 'shard456');

// Unsubscribe
await pubsub.unsubscribe('cache:invalidate:user:tenant1:user123');

// List subscriptions
const subs = pubsub.getSubscriptions();
```

### 4. Health Checks

```typescript
const health = await connectionManager.healthCheck();

console.log({
  status: health.status,        // 'healthy' | 'degraded' | 'unhealthy'
  connected: health.connected,  // true | false
  latency: health.latency,      // milliseconds
  error: health.error,          // error message if any
});
```

### 5. Common Patterns

#### Cache-Aside Pattern

```typescript
async function getUser(tenantId: string, userId: string) {
  const key = CACHE_KEYS.user(tenantId, userId);
  
  // Try cache first
  let user = await cache.get(key);
  if (user) return user;
  
  // Cache miss - fetch from database
  user = await database.users.findOne({ id: userId });
  
  // Cache for next time
  await cache.set(key, user, CACHE_TTL.USER_PROFILE);
  
  return user;
}
```

#### Write-Through with Invalidation

```typescript
async function updateUser(tenantId: string, userId: string, updates: any) {
  // Update database
  await database.users.update({ id: userId }, updates);
  
  // Invalidate cache locally
  const key = CACHE_KEYS.user(tenantId, userId);
  await cache.delete(key);
  
  // Notify other instances
  await pubsub.invalidate(tenantId, 'user', userId);
}
```

#### Rate Limiting

```typescript
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const attempts = await cache.increment(key, 1);
  
  if (attempts === 1) {
    await cache.expire(key, 900); // 15 minutes
  }
  
  return attempts <= 5; // Max 5 attempts per 15 minutes
}
```

#### Session Management

```typescript
import { CACHE_KEYS, CACHE_TTL } from '@castiel/shared-types';

async function createSession(tenantId: string, userId: string, sessionId: string, data: any) {
  const key = CACHE_KEYS.session(tenantId, userId, sessionId);
  await cache.set(key, data, CACHE_TTL.SESSION); // 9 hours
}

async function getSession(tenantId: string, userId: string, sessionId: string) {
  const key = CACHE_KEYS.session(tenantId, userId, sessionId);
  return await cache.get(key);
}

async function deleteSession(tenantId: string, userId: string, sessionId: string) {
  const key = CACHE_KEYS.session(tenantId, userId, sessionId);
  await cache.delete(key);
}
```

## Environment Variables

```bash
REDIS_HOST=your-redis-cache.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true
```

## Testing

The package includes comprehensive tests. See `src/redis.test.ts` for examples.

## API Reference

### RedisConnectionManager

- `getClient()` - Get or create Redis client
- `healthCheck()` - Check Redis health
- `disconnect()` - Close connection
- `getStatus()` - Get connection status string
- `isConnected()` - Check if connected

### RedisCacheService

- `get<T>(key)` - Get value
- `set(key, value, ttl?)` - Set value with optional TTL
- `delete(key)` - Delete key
- `deletePattern(pattern)` - Delete keys matching pattern
- `exists(key)` - Check if key exists
- `mget<T>(keys)` - Get multiple keys
- `mset(entries)` - Set multiple keys
- `increment(key, by)` - Increment counter
- `decrement(key, by)` - Decrement counter
- `expire(key, ttl)` - Set TTL on key
- `ttl(key)` - Get remaining TTL
- `flushAll()` - Clear all cache (use with caution!)
- `getStats()` - Get cache statistics

### RedisPubSubService

- `initialize()` - Initialize pub/sub clients
- `subscribe(channel, handler)` - Subscribe to channel
- `unsubscribe(channel, handler?)` - Unsubscribe from channel
- `publish(channel, message)` - Publish message
- `invalidate(tenantId, resourceType, resourceId?)` - Publish cache invalidation
- `getSubscriptions()` - Get active subscriptions
- `disconnect()` - Close pub/sub connections

## License

UNLICENSED
