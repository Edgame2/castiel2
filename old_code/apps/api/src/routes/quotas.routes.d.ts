/**
 * Quota API Routes
 * REST endpoints for quota management and performance tracking
 */
import type { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { VectorSearchService } from '../services/vector-search.service.js';
import { InsightService } from '../services/insight.service.js';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
interface QuotaRoutesOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
    relationshipService: ShardRelationshipService;
    vectorSearchService: VectorSearchService;
    insightService: InsightService;
    roleManagementService?: RoleManagementService;
}
/**
 * Register quota routes
 */
export declare function registerQuotaRoutes(server: FastifyInstance, options: QuotaRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=quotas.routes.d.ts.map