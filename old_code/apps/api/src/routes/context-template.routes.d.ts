import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { Redis } from 'ioredis';
interface ContextTemplateRoutesOptions extends FastifyPluginOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
    relationshipService: ShardRelationshipService;
    redis?: Redis;
}
/**
 * Register context template routes
 */
export declare function contextTemplateRoutes(server: FastifyInstance, options: ContextTemplateRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=context-template.routes.d.ts.map