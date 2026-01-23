/**
 * AI Settings API Routes
 * Super Admin routes for managing AI models and system configuration
 * Tenant Admin routes for tenant-specific AI settings
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
/**
 * Register AI Settings routes
 */
export declare function aiSettingsRoutes(fastify: FastifyInstance, options: {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
}): Promise<void>;
//# sourceMappingURL=ai-settings.routes.d.ts.map