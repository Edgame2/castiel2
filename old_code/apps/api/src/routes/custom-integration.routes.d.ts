/**
 * Custom Integration API Routes
 * Endpoints for managing and executing user-defined integrations
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
export declare function customIntegrationRoutes(fastify: FastifyInstance, options: {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
}): Promise<void>;
export declare function customIntegrationWebhookRoutes(fastify: FastifyInstance, options: {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
}): Promise<void>;
//# sourceMappingURL=custom-integration.routes.d.ts.map