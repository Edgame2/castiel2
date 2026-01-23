/**
 * Phase 2 Audit Trail Routes
 * 
 * Provides REST endpoints for querying shard-specific audit logs:
 * - GET /api/v1/audit-trail - Query audit logs for shards
 * - GET /api/v1/audit-trail/shard/:shardId - Get audit logs for a specific shard
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import { AuditEventType } from '../services/audit-trail.service.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import type { Shard } from '../types/shard.types.js';

interface QueryAuditTrailParams {
  Querystring: {
    targetShardId?: string;
    eventType?: AuditEventType;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
  };
}

interface GetShardAuditTrailParams {
  Params: {
    shardId: string;
  };
  Querystring: {
    eventType?: AuditEventType;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
  };
}

/**
 * Register Phase 2 Audit Trail routes
 */
export async function registerPhase2AuditTrailRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<void> {
  // Get AuditTrailService from server decoration
  const auditTrailService = (server as any).auditTrailService;

  if (!auditTrailService) {
    server.log.warn('⚠️  Phase 2 Audit Trail routes not registered - AuditTrailService missing');
    return;
  }

  /**
   * GET /api/v1/audit-trail
   * Query audit logs for shards (requires tenant-admin role)
   */
  server.get(
    '/api/v1/audit-trail',
    {
      preHandler: [requireAuth(), requireRole('tenant-admin', 'super-admin')] as any,
      schema: {
        description: 'Query audit logs for shards',
        tags: ['audit-trail', 'phase-2'],
        querystring: {
          type: 'object',
          properties: {
            targetShardId: { type: 'string', description: 'Filter by target shard ID' },
            eventType: { 
              type: 'string', 
              enum: ['create', 'update', 'delete', 'read', 'redacted_access', 'relationship_add', 'relationship_remove'],
              description: 'Filter by event type'
            },
            userId: { type: 'string', description: 'Filter by user ID' },
            startDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
            endDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
            limit: { type: 'string', description: 'Maximum number of results (default: 100)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              logs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    eventType: { type: 'string' },
                    targetShardId: { type: 'string' },
                    targetShardTypeId: { type: 'string' },
                    userId: { type: 'string' },
                    action: { type: 'string' },
                    changes: { type: 'array' },
                    metadata: { type: 'object' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<QueryAuditTrailParams>, reply: FastifyReply) => {
      try {
        const tenantId = (request as AuthenticatedRequest).user?.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const {
          targetShardId,
          eventType,
          userId,
          startDate,
          endDate,
          limit,
        } = request.query;

        const logs = await auditTrailService.queryAuditLogs({
          tenantId,
          targetShardId,
          eventType,
          userId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          limit: limit ? parseInt(limit, 10) : 100,
        });

        // Transform shards to audit log format
        const transformedLogs = logs.map((shard: Shard) => {
          const sd = shard.structuredData;
          return {
            id: shard.id,
            eventType: sd.eventType,
            targetShardId: sd.targetShardId,
            targetShardTypeId: sd.targetShardTypeId,
            userId: shard.userId,
            action: sd.action,
            changes: sd.changes,
            metadata: sd.metadata,
            createdAt: shard.createdAt.toISOString(),
          };
        });

        return reply.status(200).send({
          logs: transformedLogs,
          count: transformedLogs.length,
        });
      } catch (error: any) {
        monitoring.trackException(error as Error, {
          component: 'Phase2AuditTrailRoutes',
          operation: 'query',
          tenantId: (request as AuthenticatedRequest).user?.tenantId,
        });
        return reply.status(500).send({ error: 'Failed to query audit logs' });
      }
    }
  );

  /**
   * GET /api/v1/audit-trail/shard/:shardId
   * Get audit logs for a specific shard (requires tenant-admin role)
   */
  server.get(
    '/api/v1/audit-trail/shard/:shardId',
    {
      preHandler: [requireAuth(), requireRole('tenant-admin', 'super-admin')] as any,
      schema: {
        description: 'Get audit logs for a specific shard',
        tags: ['audit-trail', 'phase-2'],
        params: {
          type: 'object',
          required: ['shardId'],
          properties: {
            shardId: { type: 'string', description: 'Shard ID' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            eventType: { 
              type: 'string', 
              enum: ['create', 'update', 'delete', 'read', 'redacted_access', 'relationship_add', 'relationship_remove'],
            },
            userId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shardId: { type: 'string' },
              logs: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<GetShardAuditTrailParams>, reply: FastifyReply) => {
      try {
        const tenantId = (request as AuthenticatedRequest).user?.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const { shardId } = request.params;
        const {
          eventType,
          userId,
          startDate,
          endDate,
          limit,
        } = request.query;

        const logs = await auditTrailService.queryAuditLogs({
          tenantId,
          targetShardId: shardId,
          eventType,
          userId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          limit: limit ? parseInt(limit, 10) : 100,
        });

        // Transform shards to audit log format
        const transformedLogs = logs.map((shard: Shard) => {
          const sd = shard.structuredData;
          return {
            id: shard.id,
            eventType: sd.eventType,
            targetShardId: sd.targetShardId,
            targetShardTypeId: sd.targetShardTypeId,
            userId: shard.userId,
            action: sd.action,
            changes: sd.changes,
            metadata: sd.metadata,
            createdAt: shard.createdAt.toISOString(),
          };
        });

        return reply.status(200).send({
          shardId,
          logs: transformedLogs,
          count: transformedLogs.length,
        });
      } catch (error: any) {
        monitoring.trackException(error as Error, {
          component: 'Phase2AuditTrailRoutes',
          operation: 'get-shard-audit',
          tenantId: (request as AuthenticatedRequest).user?.tenantId,
          shardId: request.params.shardId,
        });
        return reply.status(500).send({ error: 'Failed to get audit logs for shard' });
      }
    }
  );

  server.log.info('✅ Phase 2 Audit Trail routes registered');
}






