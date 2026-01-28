/**
 * Admin monitoring routes
 * @module integration-processors/routes/monitoring
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { MonitoringService } from '../services/MonitoringService';

export async function monitoringRoutes(
  app: FastifyInstance,
  monitoringService: MonitoringService
): Promise<void> {
  // Get overall system health
  app.get(
    '/api/v1/admin/monitoring/health',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get overall system health (Super Admin only)',
        tags: ['Admin', 'Monitoring'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
              components: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const health = await monitoringService.getSystemHealth();
        return reply.send(health);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'HEALTH_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get system health',
          },
        });
      }
    }
  );

  // Get queue metrics
  app.get(
    '/api/v1/admin/monitoring/queues',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get queue metrics (Super Admin only)',
        tags: ['Admin', 'Monitoring'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              queues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    depth: { type: 'number' },
                    throughput: { type: 'number' },
                    errorRate: { type: 'number' },
                    avgProcessingTime: { type: 'number' },
                    oldestMessage: { type: ['string', 'null'], format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const queues = await monitoringService.getQueueMetrics();
        return reply.send({ queues });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'QUEUE_METRICS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get queue metrics',
          },
        });
      }
    }
  );

  // Get DLQ metrics
  app.get(
    '/api/v1/admin/monitoring/dlq',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get dead-letter queue metrics (Super Admin only)',
        tags: ['Admin', 'Monitoring'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              dlq: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const dlqMetrics = await monitoringService.getDLQMetrics();
        return reply.send({ dlq: dlqMetrics });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'DLQ_METRICS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get DLQ metrics',
          },
        });
      }
    }
  );

  // Get processor status
  app.get(
    '/api/v1/admin/monitoring/processors',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get processor status (Super Admin only)',
        tags: ['Admin', 'Monitoring'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              processors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['light', 'heavy'] },
                    instanceId: { type: 'string' },
                    cpuUsage: { type: 'number' },
                    memoryUsage: { type: 'number' },
                    messagesProcessed: { type: 'number' },
                    errorCount: { type: 'number' },
                    uptime: { type: 'number' },
                    status: { type: 'string', enum: ['running', 'starting', 'stopping', 'error'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const processors = monitoringService.getProcessorStatus();
        return reply.send({ processors });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'PROCESSOR_STATUS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get processor status',
          },
        });
      }
    }
  );

  // Get integration health across tenants
  app.get<{
    Querystring: {
      status?: string;
      limit?: number;
    };
  }>(
    '/api/v1/admin/monitoring/integrations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration health across all tenants (Super Admin only)',
        tags: ['Admin', 'Monitoring'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              integrations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tenantId: { type: 'string' },
                    tenantName: { type: 'string' },
                    integrationId: { type: 'string' },
                    integrationType: { type: 'string' },
                    status: {
                      type: 'string',
                      enum: ['healthy', 'degraded', 'unhealthy', 'disconnected'],
                    },
                    lastSync: { type: ['string', 'null'], format: 'date-time' },
                    successRate: { type: 'number' },
                    errorCount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const integrations = await monitoringService.getIntegrationHealth({
          status: request.query.status,
          limit: request.query.limit,
        });
        return reply.send({ integrations });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_HEALTH_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get integration health',
          },
        });
      }
    }
  );

  // Get error analytics
  app.get<{
    Querystring: {
      timeRange?: string;
      groupBy?: string;
    };
  }>(
    '/api/v1/admin/monitoring/errors',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get error analytics (Super Admin only)',
        tags: ['Admin', 'Monitoring'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            timeRange: { type: 'string' },
            groupBy: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    errorType: { type: 'string' },
                    count: { type: 'number' },
                    affectedTenants: { type: 'number' },
                    firstOccurrence: { type: 'string', format: 'date-time' },
                    lastOccurrence: { type: 'string', format: 'date-time' },
                    topAffectedIntegrations: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              totalErrors: { type: 'number' },
              errorRate: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const analytics = monitoringService.getErrorAnalytics({
          timeRange: request.query.timeRange,
          groupBy: request.query.groupBy,
        });
        return reply.send(analytics);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ERROR_ANALYTICS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get error analytics',
          },
        });
      }
    }
  );

  // Get performance metrics
  app.get<{
    Querystring: {
      timeRange?: string;
    };
  }>(
    '/api/v1/admin/monitoring/performance',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get performance metrics (Super Admin only)',
        tags: ['Admin', 'Monitoring'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            timeRange: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              metrics: {
                type: 'object',
                properties: {
                  avgProcessingTime: { type: 'number' },
                  p95ProcessingTime: { type: 'number' },
                  p99ProcessingTime: { type: 'number' },
                  throughput: { type: 'number' },
                  successRate: { type: 'number' },
                  byProcessorType: {
                    type: 'object',
                    properties: {
                      light: {
                        type: 'object',
                        properties: {
                          avgTime: { type: 'number' },
                          throughput: { type: 'number' },
                        },
                      },
                      heavy: {
                        type: 'object',
                        properties: {
                          avgTime: { type: 'number' },
                          throughput: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add super admin role check
        const metrics = monitoringService.getPerformanceMetrics();
        return reply.send({ metrics });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'PERFORMANCE_METRICS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get performance metrics',
          },
        });
      }
    }
  );
}
