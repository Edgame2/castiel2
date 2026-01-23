/**
 * Risk Analysis API Routes
 * REST endpoints for risk evaluation, catalog management, revenue at risk, and early warnings
 */
import type { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { VectorSearchService } from '../services/vector-search.service.js';
import { InsightService } from '../services/insight.service.js';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
interface RiskAnalysisRoutesOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
    revisionRepository: RevisionRepository;
    relationshipService: ShardRelationshipService;
    vectorSearchService: VectorSearchService;
    insightService: InsightService;
    queueService?: any;
    roleManagementService?: RoleManagementService;
}
/**
 * Register risk analysis routes
 */
export declare function registerRiskAnalysisRoutes(server: FastifyInstance, options: RiskAnalysisRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=risk-analysis.routes.d.ts.map