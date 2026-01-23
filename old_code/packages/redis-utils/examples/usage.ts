import { RedisConnectionManager, RedisCacheService, RedisPubSubService } from '@castiel/redis-utils';
import { CACHE_KEYS, CACHE_TTL } from '@castiel/shared-types';

/**
 * Example: Initialize Redis in a service
 */

// 1. Create connection manager
const connectionManager = new RedisConnectionManager({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true',
});

// 2. Create services
const cache = new RedisCacheService(connectionManager);
const pubsub = new RedisPubSubService(connectionManager);

// 3. Initialize pub/sub
await pubsub.initialize();

/**
 * Example: Cache user profile
 */
async function cacheUserProfile(tenantId: string, userId: string, profile: any) {
  const key = CACHE_KEYS.user(tenantId, userId);
  await cache.set(key, profile, CACHE_TTL.USER_PROFILE);
  console.log(`Cached user profile: ${key}`);
}

async function getUserProfile(tenantId: string, userId: string) {
  const key = CACHE_KEYS.user(tenantId, userId);
  const cached = await cache.get(key);
  
  if (cached) {
    console.log('Cache HIT:', key);
    return cached;
  }
  
  console.log('Cache MISS:', key);
  // Fetch from database...
  const profile = { id: userId, name: 'John Doe' }; // Example
  
  // Cache for next time
  await cacheUserProfile(tenantId, userId, profile);
  
  return profile;
}

/**
 * Example: Cache shard structured data
 */
async function cacheShardData(tenantId: string, shardId: string, structuredData: any) {
  const key = CACHE_KEYS.shard(tenantId, shardId);
  await cache.set(key, structuredData, CACHE_TTL.SHARD_STRUCTURED);
  console.log(`Cached shard data: ${key}`);
}

/**
 * Example: Invalidate cache and notify other instances
 */
async function updateShard(tenantId: string, shardId: string, newData: any) {
  // 1. Invalidate local cache
  const key = CACHE_KEYS.shard(tenantId, shardId);
  await cache.delete(key);
  
  // 2. Update database
  // ... database update code ...
  
  // 3. Notify other instances via pub/sub
  await pubsub.invalidate(tenantId, 'shard', shardId);
  
  console.log(`Updated shard ${shardId} and invalidated cache across all instances`);
}

/**
 * Example: Subscribe to cache invalidation events
 */
pubsub.subscribe('cache:invalidate:shard:*', async (channel, message) => {
  console.log(`Received invalidation on ${channel}:`, message);
  
  const data = JSON.parse(message);
  const key = CACHE_KEYS.shard(data.tenantId, data.resourceId);
  
  // Remove from local cache
  await cache.delete(key);
  console.log(`Local cache invalidated: ${key}`);
});

/**
 * Example: Health check endpoint
 */
async function healthCheck() {
  const health = await connectionManager.healthCheck();
  return {
    redis: health.status,
    latency: health.latency,
    connected: health.connected,
  };
}

/**
 * Example: Rate limiting with Redis
 */
async function checkRateLimit(userId: string, maxAttempts: number = 5, windowSeconds: number = 900): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const attempts = await cache.increment(key, 1);
  
  if (attempts === 1) {
    // First attempt, set expiry
    await cache.expire(key, windowSeconds);
  }
  
  if (attempts > maxAttempts) {
    console.log(`Rate limit exceeded for user ${userId}`);
    return false;
  }
  
  return true;
}

/**
 * Example: Session storage
 */
async function createSession(tenantId: string, userId: string, sessionId: string, sessionData: any) {
  const key = CACHE_KEYS.session(tenantId, userId, sessionId);
  await cache.set(key, sessionData, CACHE_TTL.SESSION);
  console.log(`Created session: ${key}`);
}

async function getSession(tenantId: string, userId: string, sessionId: string) {
  const key = CACHE_KEYS.session(tenantId, userId, sessionId);
  return await cache.get(key);
}

async function deleteSession(tenantId: string, userId: string, sessionId: string) {
  const key = CACHE_KEYS.session(tenantId, userId, sessionId);
  await cache.delete(key);
  console.log(`Deleted session: ${key}`);
}

/**
 * Example: Token blacklist
 */
async function blacklistToken(jti: string, expiresIn: number) {
  const key = CACHE_KEYS.tokenBlacklist(jti);
  await cache.set(key, 'revoked', expiresIn);
  console.log(`Blacklisted token: ${jti}`);
}

async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const key = CACHE_KEYS.tokenBlacklist(jti);
  return await cache.exists(key);
}

/**
 * Example: Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await pubsub.disconnect();
  await connectionManager.disconnect();
  process.exit(0);
});

// Export for use in services
export {
  connectionManager,
  cache,
  pubsub,
  healthCheck,
  checkRateLimit,
  cacheUserProfile,
  getUserProfile,
  cacheShardData,
  updateShard,
  createSession,
  getSession,
  deleteSession,
  blacklistToken,
  isTokenBlacklisted,
};
