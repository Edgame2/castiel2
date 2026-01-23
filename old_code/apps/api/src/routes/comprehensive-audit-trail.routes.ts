/**
 * Comprehensive Audit Trail Routes
 * 
 * Provides REST endpoints for querying comprehensive audit logs:
 * - GET /api/v1/comprehensive-audit-logs - Query comprehensive audit logs
 * - GET /api/v1/comprehensive-audit-logs/stats - Get audit statistics
 * 
 * Phase 2: Robustness - Comprehensive Audit Trail
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { requireAuth } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';
import { ComprehensiveAuditTrailService } from '../services/comprehensive-audit-trail.service.js';
import type { ComprehensiveAuditLogQuery } from '../types/comprehensive-audit.types.js';
import { AuditOperation } from '../types/comprehensive-audit.types.js';
import type { DetectionMethod } from '../types/risk-analysis.types.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

interface QueryComprehensiveAuditLogsParams {
  Querystring: {
    traceId?: string;
    parentTraceId?: string;
    operation?: string | string[];
    userId?: string;
    startDate?: string;
    endDate?: string;
    success?: string; // 'true' | 'false'
    hasError?: string; // 'true' | 'false'
    minDurationMs?: string;
    maxDurationMs?: string;
    modelName?: string;
    provider?: string;
    detectionMethod?: string;
    riskId?: string;
    sourceSystem?: string;
    limit?: string;
    offset?: string;
    orderBy?: 'timestamp' | 'durationMs';
    orderDirection?: 'asc' | 'desc';
  };
}

interface GetComprehensiveAuditStatsParams {
  Querystring: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Register Comprehensive Audit Trail routes
 */
export async function registerComprehensiveAuditTrailRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<void> {
  // Get ComprehensiveAuditTrailService from server decoration
  const comprehensiveAuditTrailService = (server as any).comprehensiveAuditTrailService;

  if (!comprehensiveAuditTrailService) {
    server.log.warn('⚠️  Comprehensive Audit Trail routes not registered - ComprehensiveAuditTrailService missing');
    return;
  }

  // Get role service for permission checking
  const roleService = (server as any).roleManagementService;
  if (!roleService) {
    server.log.warn('⚠️  Comprehensive Audit Trail routes not registered - role service missing');
    return;
  }

  // Create permission guard
  const checkPerm = createPermissionGuard(roleService);

  // Base auth for all routes
  const baseGuard = [requireAuth()];

  /**
   * GET /api/v1/comprehensive-audit-logs
   * Query comprehensive audit logs (requires AUDIT.READ permission)
   */
  server.get(
    '/api/v1/comprehensive-audit-logs',
    {
      onRequest: [...baseGuard, checkPerm(SYSTEM_PERMISSIONS.AUDIT.READ)] as any,
      schema: {
        description: 'Query comprehensive audit logs',
        tags: ['comprehensive-audit-trail', 'phase-2'],
        querystring: {
          type: 'object',
          properties: {
            traceId: { type: 'string', description: 'Filter by trace ID' },
            parentTraceId: { type: 'string', description: 'Filter by parent trace ID' },
            operation: { 
              type: ['string', 'array'],
              items: { type: 'string' },
              description: 'Filter by operation type(s)',
              enum: [
                'risk_evaluation',
                'risk_detection',
                'risk_score_calculation',
                'ai_chat_generation',
                'ai_context_assembly',
                'ai_grounding',
                'ai_validation',
                'data_quality_check',
                'trust_level_calculation',
              ],
            },
            userId: { type: 'string', description: 'Filter by user ID' },
            startDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
            endDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
            success: { type: 'string', enum: ['true', 'false'], description: 'Filter by success status' },
            hasError: { type: 'string', enum: ['true', 'false'], description: 'Filter by error presence' },
            minDurationMs: { type: 'string', description: 'Minimum duration in milliseconds' },
            maxDurationMs: { type: 'string', description: 'Maximum duration in milliseconds' },
            modelName: { type: 'string', description: 'Filter by AI model name' },
            provider: { type: 'string', description: 'Filter by AI provider' },
            detectionMethod: { 
              type: 'string', 
              enum: ['rule', 'ai', 'historical', 'semantic'],
              description: 'Filter by detection method' 
            },
            riskId: { type: 'string', description: 'Filter by risk ID' },
            sourceSystem: { type: 'string', description: 'Filter by source system' },
            limit: { type: 'string', description: 'Maximum number of results (default: 100, max: 1000)' },
            offset: { type: 'string', description: 'Offset for pagination (default: 0)' },
            orderBy: { 
              type: 'string', 
              enum: ['timestamp', 'durationMs'],
              description: 'Field to order by (default: timestamp)' 
            },
            orderDirection: { 
              type: 'string', 
              enum: ['asc', 'desc'],
              description: 'Order direction (default: desc)' 
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              entries: {
                type: 'array',
                items: { type: 'object' },
              },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
              hasMore: { type: 'boolean' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<QueryComprehensiveAuditLogsParams>, reply: FastifyReply) => {
      try {
        const tenantId = (request as AuthenticatedRequest).user?.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const {
          traceId,
          parentTraceId,
          operation,
          userId,
          startDate,
          endDate,
          success,
          hasError,
          minDurationMs,
          maxDurationMs,
          modelName,
          provider,
          detectionMethod,
          riskId,
          sourceSystem,
          limit,
          offset,
          orderBy,
          orderDirection,
        } = request.query;

        // Build query object
        const query: ComprehensiveAuditLogQuery = {
          tenantId,
          traceId,
          parentTraceId,
          userId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          success: success === 'true' ? true : success === 'false' ? false : undefined,
          hasError: hasError === 'true' ? true : hasError === 'false' ? false : undefined,
          minDurationMs: minDurationMs ? parseInt(minDurationMs, 10) : undefined,
          maxDurationMs: maxDurationMs ? parseInt(maxDurationMs, 10) : undefined,
          modelName,
          provider,
          detectionMethod: detectionMethod as DetectionMethod | undefined,
          riskId,
          sourceSystem,
          limit: limit ? Math.min(parseInt(limit, 10), 1000) : 100, // Cap at 1000
          offset: offset ? parseInt(offset, 10) : 0,
          orderBy: orderBy || 'timestamp',
          orderDirection: orderDirection || 'desc',
        };

        // Handle operation filter (can be string or array)
        if (operation) {
          if (Array.isArray(operation)) {
            query.operation = operation as AuditOperation[];
          } else {
            query.operation = operation as AuditOperation;
          }
        }

        const result = await comprehensiveAuditTrailService.queryAuditLogs(query);

        return reply.status(200).send(result);
      } catch (error: any) {
        monitoring.trackException(error as Error, {
          component: 'ComprehensiveAuditTrailRoutes',
          operation: 'query',
          tenantId: (request as AuthenticatedRequest).user?.tenantId,
        });
        return reply.status(500).send({ error: 'Failed to query comprehensive audit logs' });
      }
    }
  );

  /**
   * GET /api/v1/comprehensive-audit-logs/stats
   * Get comprehensive audit log statistics (requires AUDIT.READ permission)
   */
  server.get(
    '/api/v1/comprehensive-audit-logs/stats',
    {
      onRequest: [...baseGuard, checkPerm(SYSTEM_PERMISSIONS.AUDIT.READ)] as any,
      schema: {
        description: 'Get comprehensive audit log statistics',
        tags: ['comprehensive-audit-trail', 'phase-2'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { 
              type: 'string', 
              format: 'date-time', 
              description: 'Start date (ISO 8601)' 
            },
            endDate: { 
              type: 'string', 
              format: 'date-time', 
              description: 'End date (ISO 8601)' 
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              totalEntries: { type: 'number' },
              operations: { type: 'object' },
              successRate: { type: 'number' },
              averageDurationMs: { type: 'number' },
              errorRate: { type: 'number' },
              byModel: { type: 'object' },
              byDetectionMethod: { type: 'object' },
              timeRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'date-time' },
                  end: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<GetComprehensiveAuditStatsParams>, reply: FastifyReply) => {
      try {
        const tenantId = (request as AuthenticatedRequest).user?.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const { startDate, endDate } = request.query;

        if (!startDate || !endDate) {
          return reply.status(400).send({ 
            error: 'Missing required query parameters: startDate and endDate are required' 
          });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return reply.status(400).send({ 
            error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)' 
          });
        }

        if (start > end) {
          return reply.status(400).send({ 
            error: 'startDate must be before endDate' 
          });
        }

        const stats = await comprehensiveAuditTrailService.getStats(tenantId, start, end);

        // Convert dates to ISO strings for JSON response
        return reply.status(200).send({
          ...stats,
          timeRange: {
            start: stats.timeRange.start.toISOString(),
            end: stats.timeRange.end.toISOString(),
          },
        });
      } catch (error: any) {
        monitoring.trackException(error as Error, {
          component: 'ComprehensiveAuditTrailRoutes',
          operation: 'getStats',
          tenantId: (request as AuthenticatedRequest).user?.tenantId,
        });
        return reply.status(500).send({ error: 'Failed to get comprehensive audit log statistics' });
      }
    }
  );

  server.log.info('✅ Comprehensive Audit Trail routes registered');
}
