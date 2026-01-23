/**
 * Team API Routes
 * REST endpoints for team management
 */
import type { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { AuditLogService } from '../services/audit/audit-log.service.js';
interface TeamRoutesOptions {
    monitoring: IMonitoringProvider;
    shardRepository: ShardRepository;
    shardTypeRepository: ShardTypeRepository;
    relationshipService: ShardRelationshipService;
    auditLogService?: AuditLogService;
}
/**
 * Register team routes
 */
export declare function registerTeamRoutes(server: FastifyInstance, options: TeamRoutesOptions): Promise<void>;
export {};
//# sourceMappingURL=teams.routes.d.ts.map