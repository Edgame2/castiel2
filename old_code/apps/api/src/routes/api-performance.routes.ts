/**
 * API Performance Monitoring Routes
 * Provides endpoints to query API performance statistics
 */

import type { FastifyInstance } from 'fastify';
import type { APIPerformanceMonitoringService } from '../services/api-performance-monitoring.service.js';

export function registerAPIPerformanceRoutes(server: FastifyInstance): void {
  const performanceMonitoring = (server as any).apiPerformanceMonitoring as APIPerformanceMonitoringService | undefined;

  if (!performanceMonitoring) {
    server.log.warn('API Performance Monitoring service not available');
    return;
  }

  /**
   * GET /api/admin/performance/endpoints
   * Get performance statistics for all endpoints
   */
  server.get('/api/admin/performance/endpoints', {
    schema: {
      description: 'Get performance statistics for all endpoints',
      tags: ['admin', 'performance'],
      response: {
        200: {
          type: 'object',
          properties: {
            endpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  endpoint: { type: 'string' },
                  method: { type: 'string' },
                  totalRequests: { type: 'number' },
                  avgResponseTime: { type: 'number' },
                  p50: { type: 'number' },
                  p95: { type: 'number' },
                  p99: { type: 'number' },
                  minResponseTime: { type: 'number' },
                  maxResponseTime: { type: 'number' },
                  errorRate: { type: 'number' },
                  successRate: { type: 'number' },
                  lastUpdated: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const stats = performanceMonitoring.getAllEndpointStats();
    return reply.send({ endpoints: stats });
  });

  /**
   * GET /api/admin/performance/endpoints/:endpoint
   * Get performance statistics for a specific endpoint
   */
  server.get<{ Params: { endpoint: string; method?: string } }>(
    '/api/admin/performance/endpoints/:endpoint',
    {
      schema: {
        description: 'Get performance statistics for a specific endpoint',
        tags: ['admin', 'performance'],
        params: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            method: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { endpoint } = request.params;
      const method = (request.query as any)?.method || 'GET';
      
      const stats = performanceMonitoring.getEndpointStats(endpoint, method);
      
      if (!stats) {
        return reply.status(404).send({
          error: 'Endpoint not found',
          endpoint,
          method,
        });
      }
      
      return reply.send(stats);
    }
  );

  /**
   * GET /api/admin/performance/slow
   * Get slow endpoints (exceeding targets)
   */
  server.get('/api/admin/performance/slow', {
    schema: {
      description: 'Get slow endpoints that exceed performance targets',
      tags: ['admin', 'performance'],
      response: {
        200: {
          type: 'object',
          properties: {
            slowEndpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  endpoint: { type: 'string' },
                  method: { type: 'string' },
                  p95: { type: 'number' },
                  p99: { type: 'number' },
                  avgResponseTime: { type: 'number' },
                  requestCount: { type: 'number' },
                  severity: { type: 'string', enum: ['warning', 'critical'] },
                  exceedsTarget: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const slowEndpoints = performanceMonitoring.getSlowEndpoints();
    return reply.send({ slowEndpoints });
  });

  /**
   * GET /api/admin/performance/baselines
   * Get performance baselines for all endpoints
   */
  server.get('/api/admin/performance/baselines', {
    schema: {
      description: 'Get performance baselines and targets for all endpoints',
      tags: ['admin', 'performance'],
      response: {
        200: {
          type: 'object',
          properties: {
            baselines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  endpoint: { type: 'string' },
                  method: { type: 'string' },
                  targetP95: { type: 'number' },
                  targetP99: { type: 'number' },
                  currentP95: { type: 'number' },
                  currentP99: { type: 'number' },
                  status: { type: 'string', enum: ['healthy', 'warning', 'critical'] },
                  recommendations: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const baselines = performanceMonitoring.getPerformanceBaselines();
    return reply.send({ baselines });
  });

  /**
   * GET /api/admin/performance/summary
   * Get summary statistics
   */
  server.get('/api/admin/performance/summary', {
    schema: {
      description: 'Get summary performance statistics',
      tags: ['admin', 'performance'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalEndpoints: { type: 'number' },
            healthyEndpoints: { type: 'number' },
            warningEndpoints: { type: 'number' },
            criticalEndpoints: { type: 'number' },
            avgP95AcrossEndpoints: { type: 'number' },
            avgP99AcrossEndpoints: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const summary = performanceMonitoring.getSummaryStats();
    return reply.send(summary);
  });

  /**
   * POST /api/admin/performance/reset
   * Reset performance statistics (admin only)
   */
  server.post<{ Body: { endpoint?: string; method?: string } }>(
    '/api/admin/performance/reset',
    {
      schema: {
        description: 'Reset performance statistics',
        tags: ['admin', 'performance'],
        body: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            method: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { endpoint, method } = request.body || {};
      
      if (endpoint && method) {
        performanceMonitoring.resetEndpointStats(endpoint, method);
        return reply.send({
          message: 'Endpoint statistics reset',
          endpoint,
          method,
        });
      } else {
        performanceMonitoring.resetAllStats();
        return reply.send({
          message: 'All statistics reset',
        });
      }
    }
  );
}








