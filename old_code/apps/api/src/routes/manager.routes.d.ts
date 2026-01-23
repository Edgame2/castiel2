/**
 * Manager API Routes
 * REST endpoints for manager dashboard and team management
 */
import type { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { VectorSearchService } from '../services/vector-search.service.js';
import { InsightService } from '../services/insight.service.js';
interface ManagerRoutesOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
    relationshipService: ShardRelationshipService;
    vectorSearchService: VectorSearchService;
    insightService: InsightService;
}
/**
 * Register manager routes
 */
export declare function registerManagerRoutes(server: FastifyInstance, options: ManagerRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=manager.routes.d.ts.map