/**
 * Simulation API Routes
 * REST endpoints for risk simulation and scenario analysis
 */
import type { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { VectorSearchService } from '../services/vector-search.service.js';
import { InsightService } from '../services/insight.service.js';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
interface SimulationRoutesOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
    relationshipService: ShardRelationshipService;
    vectorSearchService: VectorSearchService;
    insightService: InsightService;
    roleManagementService?: RoleManagementService;
}
/**
 * Register simulation routes
 */
export declare function registerSimulationRoutes(server: FastifyInstance, options: SimulationRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=simulation.routes.d.ts.map