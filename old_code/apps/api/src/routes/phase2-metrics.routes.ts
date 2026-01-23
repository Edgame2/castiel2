/**
 * Phase 2 Metrics Routes
 * 
 * Provides REST endpoints for querying system metrics stored as shards:
 * - GET /api/v1/metrics - Query metrics
 * - GET /api/v1/metrics/aggregated - Get aggregated metrics (P50, P95, P99)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import { MetricType } from '../services/metrics-shard.service.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

interface QueryMetricsParams {
  Querystring: {
    metricType?: MetricType;
    startDate: string;
    endDate: string;
    period?: 'minute' | 'hour' | 'day';
    limit?: string;
  };
}

interface GetAggregatedMetricsParams {
  Querystring: {
    metricType: MetricType;
    startDate: string;
    endDate: string;
  };
}

/**
 * Register Phase 2 Metrics routes
 */
export async function registerPhase2MetricsRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<void> {
  // Get MetricsShardService from server decoration
  const metricsShardService = (server as any).metricsShardService;

  if (!metricsShardService) {
    server.log.warn('⚠️  Phase 2 Metrics routes not registered - MetricsShardService missing');
    return;
  }

  /**
   * GET /api/v1/metrics
   * Query metrics for a time period (requires tenant-admin role)
   */
  server.get(
    '/api/v1/metrics',
    {
      preHandler: [requireAuth(), requireRole('tenant-admin', 'super-admin')] as any,
      schema: {
        description: 'Query metrics for a time period',
        tags: ['metrics', 'phase-2'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            metricType: {
              type: 'string',
              enum: ['ingestion_lag', 'change_miss_rate', 'vector_hit_ratio', 'insight_confidence_drift'],
              description: 'Filter by metric type',
            },
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
            period: {
              type: 'string',
              enum: ['minute', 'hour', 'day'],
              description: 'Filter by period',
            },
            limit: { 
              type: 'string', 
              description: 'Maximum number of results (default: 1000)' 
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              metrics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    metricType: { type: 'string' },
                    value: { type: ['number', 'object'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    period: { type: 'string' },
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
    async (request: FastifyRequest<QueryMetricsParams>, reply: FastifyReply) => {
      try {
        const tenantId = (request as AuthenticatedRequest).user?.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const {
          metricType,
          startDate,
          endDate,
          period,
          limit,
        } = request.query;

        if (!startDate || !endDate) {
          return reply.status(400).send({ error: 'startDate and endDate are required' });
        }

        const metrics = await metricsShardService.queryMetrics({
          tenantId,
          metricType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          period,
          limit: limit ? parseInt(limit, 10) : 1000,
        });

        return reply.status(200).send({
          metrics,
          count: metrics.length,
        });
      } catch (error: any) {
        monitoring.trackException(error as Error, {
          component: 'Phase2MetricsRoutes',
          operation: 'query',
          tenantId: (request as AuthenticatedRequest).user?.tenantId,
        });
        return reply.status(500).send({ error: 'Failed to query metrics' });
      }
    }
  );

  /**
   * GET /api/v1/metrics/aggregated
   * Get aggregated metrics (P50, P95, P99) for a time period (requires tenant-admin role)
   */
  server.get(
    '/api/v1/metrics/aggregated',
    {
      preHandler: [requireAuth(), requireRole('tenant-admin', 'super-admin')] as any,
      schema: {
        description: 'Get aggregated metrics (P50, P95, P99) for a time period',
        tags: ['metrics', 'phase-2'],
        querystring: {
          type: 'object',
          required: ['metricType', 'startDate', 'endDate'],
          properties: {
            metricType: {
              type: 'string',
              enum: ['ingestion_lag', 'change_miss_rate', 'vector_hit_ratio', 'insight_confidence_drift'],
              description: 'Metric type',
            },
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
              metricType: { type: 'string' },
              p50: { type: 'number' },
              p95: { type: 'number' },
              p99: { type: 'number' },
              mean: { type: 'number' },
              min: { type: 'number' },
              max: { type: 'number' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<GetAggregatedMetricsParams>, reply: FastifyReply) => {
      try {
        const tenantId = (request as AuthenticatedRequest).user?.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const {
          metricType,
          startDate,
          endDate,
        } = request.query;

        if (!metricType || !startDate || !endDate) {
          return reply.status(400).send({ error: 'metricType, startDate, and endDate are required' });
        }

        const aggregated = await metricsShardService.getAggregatedMetrics({
          tenantId,
          metricType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });

        return reply.status(200).send({
          metricType,
          ...aggregated,
        });
      } catch (error: any) {
        monitoring.trackException(error as Error, {
          component: 'Phase2MetricsRoutes',
          operation: 'get-aggregated',
          tenantId: (request as AuthenticatedRequest).user?.tenantId,
        });
        return reply.status(500).send({ error: 'Failed to get aggregated metrics' });
      }
    }
  );

  server.log.info('✅ Phase 2 Metrics routes registered');
}






