/**
 * Redis Cache TTL Constants (in seconds)
 */
export const CACHE_TTL = {
  SHARD_STRUCTURED: 15 * 60, // 15 minutes
  USER_PROFILE: 60 * 60, // 1 hour
  ACL_CHECK: 10 * 60, // 10 minutes
  VECTOR_SEARCH: 30 * 60, // 30 minutes
  JWT_VALIDATION: 5 * 60, // 5 minutes
  SSO_CONFIG: 60 * 60, // 1 hour
  SESSION: 9 * 60 * 60, // 9 hours (matches access token)
  OAUTH_STATE: 10 * 60, // 10 minutes
} as const;

/**
 * Type-safe Redis cache key builders
 */
export const CACHE_KEYS = {
  shard: (tenantId: string, shardId: string) =>
    `tenant:${tenantId}:shard:${shardId}:structured`,
  
  user: (tenantId: string, userId: string) =>
    `tenant:${tenantId}:user:${userId}:profile`,
  
  acl: (tenantId: string, userId: string, shardId: string) =>
    `tenant:${tenantId}:acl:${userId}:${shardId}`,
  
  vectorSearch: (tenantId: string, queryHash: string) =>
    `tenant:${tenantId}:vsearch:${queryHash}`,
  
  session: (tenantId: string, userId: string, sessionId: string) =>
    `session:${tenantId}:${userId}:${sessionId}`,
  
  refreshToken: (tokenId: string) =>
    `refresh:${tokenId}:family`,
  
  tokenBlacklist: (jti: string) =>
    `token:blacklist:${jti}`,
  
  jwtValidation: (tokenHash: string) =>
    `jwt:valid:${tokenHash}`,
  
  ssoConfig: (orgId: string) =>
    `org:${orgId}:sso:config`,
} as const;

/**
 * Redis Pub/Sub channel names for cache invalidation
 */
export const CACHE_CHANNELS = {
  invalidateShard: (tenantId: string, shardId: string) =>
    `cache:invalidate:shard:${tenantId}:${shardId}`,
  
  invalidateUser: (tenantId: string, userId: string) =>
    `cache:invalidate:user:${tenantId}:${userId}`,
  
  invalidateAcl: (tenantId: string) =>
    `cache:invalidate:acl:${tenantId}:*`,
  
  invalidateVectorSearch: (tenantId: string) =>
    `cache:invalidate:vsearch:${tenantId}:*`,
} as const;

// Export types for the constants
export type CacheTTL = typeof CACHE_TTL;
export type CacheKeys = typeof CACHE_KEYS;
export type CacheChannels = typeof CACHE_CHANNELS;
