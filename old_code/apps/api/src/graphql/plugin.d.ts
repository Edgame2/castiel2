/**
 * GraphQL Plugin for Fastify
 * Integrates Mercurius GraphQL with Fastify, caching, and authentication
 */
import type { FastifyInstance } from 'fastify';
import type { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ShardCacheService } from '../services/shard-cache.service.js';
import type { ACLCacheService } from '../services/acl-cache.service.js';
import type { VectorSearchCacheService } from '../services/vector-search-cache.service.js';
export interface GraphQLPluginOptions {
    cosmosContainer: Container;
    redisClient?: Redis;
    monitoring?: IMonitoringProvider;
    shardCache?: ShardCacheService;
    aclCache?: ACLCacheService;
    vectorSearchCache?: VectorSearchCacheService;
}
/**
 * Register GraphQL plugin with Fastify
 */
export declare function registerGraphQLPlugin(fastify: FastifyInstance, options: GraphQLPluginOptions): Promise<void>;
//# sourceMappingURL=plugin.d.ts.map