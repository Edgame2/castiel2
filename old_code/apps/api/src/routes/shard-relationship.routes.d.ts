import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
interface ShardRelationshipRoutesOptions extends FastifyPluginOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
}
/**
 * Register shard relationship routes
 */
export declare function shardRelationshipRoutes(server: FastifyInstance, options: ShardRelationshipRoutesOptions): Promise<void>;
/**
 * Register shard-specific relationship routes
 * These are mounted under /api/v1/shards/:shardId/...
 */
export declare function shardRelationshipSubRoutes(server: FastifyInstance, options: ShardRelationshipRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=shard-relationship.routes.d.ts.map