/**
 * Phase 2 Audit Trail Routes
 *
 * Provides REST endpoints for querying shard-specific audit logs:
 * - GET /api/v1/audit-trail - Query audit logs for shards
 * - GET /api/v1/audit-trail/shard/:shardId - Get audit logs for a specific shard
 */
import { FastifyInstance } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Register Phase 2 Audit Trail routes
 */
export declare function registerPhase2AuditTrailRoutes(server: FastifyInstance, monitoring: IMonitoringProvider): Promise<void>;
//# sourceMappingURL=phase2-audit-trail.routes.d.ts.map