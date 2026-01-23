import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { EnrichmentService } from '../services/enrichment.service.js';
import type { ShardRepository } from '../repositories/shard.repository.js';
/**
 * Register ShardTypes routes
 */
export declare function registerShardTypesRoutes(fastify: FastifyInstance, monitoring: IMonitoringProvider, enrichmentService?: EnrichmentService, shardRepository?: ShardRepository): Promise<void>;
//# sourceMappingURL=shard-types.routes.d.ts.map