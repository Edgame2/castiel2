/**
 * Cache Admin Routes
 * Admin endpoints for cache management and monitoring
 */
import type { FastifyInstance } from 'fastify';
import type { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ShardCacheService } from '../services/shard-cache.service.js';
import type { ACLCacheService } from '../services/acl-cache.service.js';
import type { VectorSearchCacheService } from '../services/vector-search-cache.service.js';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
export interface CacheAdminRouteDependencies {
    cosmosContainer: Container;
    redisClient?: Redis;
    monitoring?: IMonitoringProvider;
    shardCache?: ShardCacheService;
    aclCache?: ACLCacheService;
    vectorSearchCache?: VectorSearchCacheService;
    tokenValidationCache?: TokenValidationCacheService;
}
/**
 * Register cache admin routes
 */
export declare function registerCacheAdminRoutes(fastify: FastifyInstance, dependencies: CacheAdminRouteDependencies): Promise<void>;
//# sourceMappingURL=cache-admin.routes.d.ts.map