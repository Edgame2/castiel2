/**
 * Proactive Insights Routes
 * 
 * API routes for managing proactive insights (list, get, acknowledge, dismiss, action)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProactiveInsightService } from '../services/proactive-insight.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuth } from '../middleware/authorization.js';
import type { ProactiveInsightsAnalyticsService } from '../services/proactive-insights-analytics.service.js';
import {
  ProactiveInsightStatus,
  ProactiveInsightType,
  ProactiveInsightPriority,
} from '../types/proactive-insights.types.js';

/**
 * Request validation schemas
 */
const listInsightsSchema = {
  description: 'List proactive insights for a tenant',
  tags: ['Proactive Insights'],
  querystring: {
    type: 'object',
    properties: {
      status: {
        oneOf: [
          { type: 'string', enum: ['pending', 'delivered', 'acknowledged', 'actioned', 'dismissed', 'expired'] },
          {
            type: 'array',
            items: { type: 'string', enum: ['pending', 'delivered', 'acknowledged', 'actioned', 'dismissed', 'expired'] },
          },
        ],
      },
      type: {
        oneOf: [
          { type: 'string', enum: ['deal_at_risk', 'milestone_approaching', 'stale_opportunity', 'missing_follow_up', 'relationship_cooling', 'action_required'] },
          {
            type: 'array',
            items: { type: 'string', enum: ['deal_at_risk', 'milestone_approaching', 'stale_opportunity', 'missing_follow_up', 'relationship_cooling', 'action_required'] },
          },
        ],
      },
      priority: {
        oneOf: [
          { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          {
            type: 'array',
            items: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          },
        ],
      },
      shardId: { type: 'string' },
      triggerId: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      orderBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'priority'], default: 'createdAt' },
      order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        insights: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
        total: { type: 'integer' },
        hasMore: { type: 'boolean' },
      },
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

const getInsightSchema = {
  description: 'Get a proactive insight by ID',
  tags: ['Proactive Insights'],
  params: {
    type: 'object',
    required: ['insightId'],
    properties: {
      insightId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

const acknowledgeInsightSchema = {
  description: 'Acknowledge a proactive insight',
  tags: ['Proactive Insights'],
  params: {
    type: 'object',
    required: ['insightId'],
    properties: {
      insightId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

const dismissInsightSchema = {
  description: 'Dismiss a proactive insight',
  tags: ['Proactive Insights'],
  params: {
    type: 'object',
    required: ['insightId'],
    properties: {
      insightId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      reason: { type: 'string', maxLength: 500 },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

const actionInsightSchema = {
  description: 'Mark a proactive insight as actioned',
  tags: ['Proactive Insights'],
  params: {
    type: 'object',
    required: ['insightId'],
    properties: {
      insightId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: true,
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

/**
 * Register Proactive Insights routes
 */
export async function registerProactiveInsightsRoutes(
  server: FastifyInstance,
  proactiveInsightService: ProactiveInsightService,
  deliveryPreferencesRepository?: any, // ProactiveInsightsDeliveryPreferencesRepository
  analyticsService?: ProactiveInsightsAnalyticsService
): Promise<void> {
  const authDecorator = (server as FastifyInstance & { authenticate?: any }).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️ Proactive Insights routes not registered - authentication decorator missing');
    return;
  }

  const authGuards = [authDecorator, requireAuth()];

  /**
   * GET /api/v1/proactive-insights
   * List proactive insights for the tenant
   */
  server.get<{
    Querystring: {
      status?: ProactiveInsightStatus | ProactiveInsightStatus[];
      type?: ProactiveInsightType | ProactiveInsightType[];
      priority?: ProactiveInsightPriority | ProactiveInsightPriority[];
      shardId?: string;
      triggerId?: string;
      limit?: number;
      offset?: number;
      orderBy?: 'createdAt' | 'updatedAt' | 'priority';
      order?: 'asc' | 'desc';
    };
  }>(
    '/api/v1/proactive-insights',
    {
      onRequest: authGuards,
      schema: listInsightsSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        if (!user || !user.tenantId) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        const { tenantId } = user;
        const query = request.query as {
          status?: ProactiveInsightStatus | ProactiveInsightStatus[];
          type?: ProactiveInsightType | ProactiveInsightType[];
          priority?: ProactiveInsightPriority | ProactiveInsightPriority[];
          shardId?: string;
          triggerId?: string;
          limit?: number;
          offset?: number;
          orderBy?: 'createdAt' | 'updatedAt' | 'priority';
          order?: 'asc' | 'desc';
        };

        // Normalize array parameters
        const status = Array.isArray(query.status) ? query.status : query.status ? [query.status] : undefined;
        const type = Array.isArray(query.type) ? query.type : query.type ? [query.type] : undefined;
        const priority = Array.isArray(query.priority) ? query.priority : query.priority ? [query.priority] : undefined;

        const result = await proactiveInsightService.listInsights(tenantId, {
          status: status as ProactiveInsightStatus[] | undefined,
          type: type as ProactiveInsightType[] | undefined,
          priority: priority as ProactiveInsightPriority[] | undefined,
          shardId: query.shardId,
          triggerId: query.triggerId,
          limit: query.limit,
          offset: query.offset,
          orderBy: query.orderBy,
          order: query.order,
        });

        return reply.status(200).send(result);
      } catch (error: any) {
        const errorDetails = {
          error,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack?.substring(0, 200),
          statusCode: error.statusCode,
          tenantId: (request as any).user?.tenantId,
        };
        
        server.log.error(errorDetails, 'Error listing proactive insights');
        
        const statusCode = error.statusCode || (error.message?.includes('not found') ? 404 : 500);
        return reply.status(statusCode).send({
          error: error.name || 'Internal Server Error',
          message: error.message || 'Failed to list proactive insights',
          ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
        });
      }
    }
  );

  /**
   * GET /api/v1/proactive-insights/:insightId
   * Get a specific proactive insight
   */
  server.get<{
    Params: { insightId: string };
  }>(
    '/api/v1/proactive-insights/:insightId',
    {
      onRequest: authGuards,
      schema: getInsightSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = (request as any).user!;
        const { insightId } = request.params as { insightId: string };

        const insight = await proactiveInsightService.getInsight(insightId, tenantId);

        if (!insight) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Proactive insight not found',
          });
        }

        return reply.status(200).send(insight);
      } catch (error: any) {
        server.log.error({ error }, 'Error getting proactive insight');
        return reply.status(500).send({
          error: 'Failed to get proactive insight',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/v1/proactive-insights/:insightId/acknowledge
   * Acknowledge a proactive insight
   */
  server.post<{
    Params: { insightId: string };
  }>(
    '/api/v1/proactive-insights/:insightId/acknowledge',
    {
      onRequest: authGuards,
      schema: acknowledgeInsightSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user!;
        const { insightId } = request.params as { insightId: string };

        const insight = await proactiveInsightService.acknowledgeInsight(insightId, tenantId, userId);

        return reply.status(200).send(insight);
      } catch (error: any) {
        if (error.message === 'Repository not initialized') {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Proactive insights repository not initialized',
          });
        }
        if (error.message === 'Insight not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Proactive insight not found',
          });
        }
        server.log.error({ error }, 'Error acknowledging proactive insight');
        return reply.status(500).send({
          error: 'Failed to acknowledge proactive insight',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/v1/proactive-insights/:insightId/dismiss
   * Dismiss a proactive insight
   */
  server.post<{
    Params: { insightId: string };
    Body: { reason?: string };
  }>(
    '/api/v1/proactive-insights/:insightId/dismiss',
    {
      onRequest: authGuards,
      schema: dismissInsightSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user!;
        const { insightId } = request.params as { insightId: string };
        const { reason } = request.body as { reason?: string };

        const insight = await proactiveInsightService.dismissInsight(insightId, tenantId, userId, reason);

        return reply.status(200).send(insight);
      } catch (error: any) {
        if (error.message === 'Repository not initialized') {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Proactive insights repository not initialized',
          });
        }
        if (error.message === 'Insight not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Proactive insight not found',
          });
        }
        server.log.error({ error }, 'Error dismissing proactive insight');
        return reply.status(500).send({
          error: 'Failed to dismiss proactive insight',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/v1/proactive-insights/:insightId/action
   * Mark a proactive insight as actioned
   */
  server.post<{
    Params: { insightId: string };
  }>(
    '/api/v1/proactive-insights/:insightId/action',
    {
      onRequest: authGuards,
      schema: actionInsightSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user!;
        const { insightId } = request.params as { insightId: string };

        const insight = await proactiveInsightService.actionInsight(insightId, tenantId, userId);

        return reply.status(200).send(insight);
      } catch (error: any) {
        if (error.message === 'Repository not initialized') {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Proactive insights repository not initialized',
          });
        }
        if (error.message === 'Insight not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Proactive insight not found',
          });
        }
        server.log.error({ error }, 'Error marking proactive insight as actioned');
        return reply.status(500).send({
          error: 'Failed to mark proactive insight as actioned',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/v1/proactive-insights/check-triggers
   * Manually trigger evaluation of proactive triggers (admin/testing)
   */
  const checkTriggersSchema = {
    description: 'Manually trigger evaluation of proactive triggers',
    tags: ['Proactive Insights'],
    body: {
      type: 'object',
      properties: {
        triggerIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific trigger IDs to evaluate (optional)',
        },
        shardTypeIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Only evaluate triggers for specific shard types (optional)',
        },
        shardIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Only evaluate triggers for specific shards (optional)',
        },
        generateAIContent: {
          type: 'boolean',
          default: true,
          description: 'Whether to generate AI content for insights',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Maximum insights to generate',
        },
        dryRun: {
          type: 'boolean',
          default: false,
          description: 'If true, evaluate but do not deliver insights',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        description: 'Trigger evaluation result',
        properties: {
          triggersEvaluated: { type: 'integer' },
          shardsEvaluated: { type: 'integer' },
          insightsGenerated: {
            type: 'array',
            items: { type: 'object' },
          },
          deliveryResults: {
            type: 'array',
            items: { type: 'object' },
          },
          errors: {
            type: 'array',
            items: { type: 'object' },
          },
          durationMs: { type: 'integer' },
          executedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  };

  server.post<{
    Body: {
      triggerIds?: string[];
      shardTypeIds?: string[];
      shardIds?: string[];
      generateAIContent?: boolean;
      limit?: number;
      dryRun?: boolean;
    };
  }>(
    '/api/v1/proactive-insights/check-triggers',
    {
      onRequest: authGuards,
      schema: checkTriggersSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).tenantId as string;
        const body = (request.body || {}) as {
          triggerIds?: string[];
          shardTypeIds?: string[];
          shardIds?: string[];
          generateAIContent?: boolean;
          limit?: number;
          dryRun?: boolean;
        };

        const result = await proactiveInsightService.checkTriggers(tenantId, {
          triggerIds: body.triggerIds,
          shardTypeIds: body.shardTypeIds,
          shardIds: body.shardIds,
          generateAIContent: body.generateAIContent !== false,
          limit: body.limit,
          dryRun: body.dryRun || false,
        });

        return reply.status(200).send(result);
      } catch (error: any) {
        server.log.error({ error }, 'Error checking triggers');
        return reply.status(500).send({
          error: 'Failed to check triggers',
          message: error.message,
        });
      }
    }
  );
}

/**
 * Register Delivery Preferences routes
 */
export async function registerDeliveryPreferencesRoutes(
  server: FastifyInstance,
  deliveryPreferencesRepository: any, // ProactiveInsightsDeliveryPreferencesRepository
  analyticsService?: ProactiveInsightsAnalyticsService
): Promise<void> {
  const authDecorator = (server as FastifyInstance & { authenticate?: any }).authenticate;
  const tokenValidationCache = (server as any).tokenValidationCache;

  if (!authDecorator) {
    server.log.warn('Authentication decorator not found, delivery preferences routes may not work');
  }

  const authGuards = authDecorator ? [authDecorator, requireAuth()] : [];

  /**
   * GET /api/v1/proactive-insights/delivery-preferences
   * Get current user's delivery preferences
   */
  server.get<{ Reply: any }>(
    '/api/v1/proactive-insights/delivery-preferences',
    {
      onRequest: authGuards,
      schema: {
        description: 'Get delivery preferences for the authenticated user',
        tags: ['Proactive Insights'],
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user!;

        const preferences = await deliveryPreferencesRepository.getPreferences(
          tenantId,
          userId
        );

        if (!preferences) {
          // Return defaults
          return reply.status(200).send({
            userId,
            tenantId,
            channels: {
              in_app: {
                enabled: true,
                pushThreshold: 'medium',
              },
              dashboard: {
                enabled: true,
                maxItems: 10,
                groupByType: false,
              },
              email: {
                enabled: true,
                immediateThreshold: 'high',
                digestFrequency: 'daily',
                digestTime: '09:00',
              },
              webhook: {
                enabled: false,
              },
            },
          });
        }

        return reply.status(200).send(preferences);
      } catch (error: any) {
        server.log.error({ error }, 'Error getting delivery preferences');
        return reply.status(500).send({
          error: 'Failed to get delivery preferences',
          message: error.message,
        });
      }
    }
  );

  /**
   * PUT /api/v1/proactive-insights/delivery-preferences
   * Update current user's delivery preferences
   */
  server.put<{
    Body: Partial<any>; // Partial<DeliveryPreferences>
    Reply: any;
  }>(
    '/api/v1/proactive-insights/delivery-preferences',
    {
      onRequest: authGuards,
      schema: {
        description: 'Update delivery preferences for the authenticated user',
        tags: ['Proactive Insights'],
        body: {
          type: 'object',
          properties: {
            channels: {
              type: 'object',
              properties: {
                in_app: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    pushThreshold: {
                      type: 'string',
                      enum: ['low', 'medium', 'high', 'critical'],
                    },
                  },
                },
                dashboard: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    maxItems: { type: 'integer' },
                    groupByType: { type: 'boolean' },
                  },
                },
                email: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    immediateThreshold: {
                      type: 'string',
                      enum: ['low', 'medium', 'high', 'critical'],
                    },
                    digestFrequency: {
                      type: 'string',
                      enum: ['immediate', 'hourly', 'daily', 'weekly'],
                    },
                    digestTime: { type: 'string' },
                  },
                },
                webhook: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    url: { type: 'string' },
                    headers: { type: 'object' },
                    secret: { type: 'string' },
                  },
                },
              },
            },
            quietHours: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                start: { type: 'string' },
                end: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user!;
        const body = request.body || {};

        const preferences = await deliveryPreferencesRepository.upsertPreferences(
          tenantId,
          userId,
          body
        );

        return reply.status(200).send(preferences);
      } catch (error: any) {
        server.log.error({ error }, 'Error updating delivery preferences');
        return reply.status(500).send({
          error: 'Failed to update delivery preferences',
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /api/v1/proactive-insights/delivery-preferences
   * Reset delivery preferences to defaults
   */
  server.delete<{ Reply: { message: string } }>(
    '/api/v1/proactive-insights/delivery-preferences',
    {
      onRequest: authGuards,
      schema: {
        description: 'Reset delivery preferences to defaults for the authenticated user',
        tags: ['Proactive Insights'],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user!;

        await deliveryPreferencesRepository.deletePreferences(tenantId, userId);

        return reply.status(200).send({
          message: 'Delivery preferences reset to defaults',
        });
      } catch (error: any) {
        server.log.error({ error }, 'Error resetting delivery preferences');
        return reply.status(500).send({
          error: 'Failed to reset delivery preferences',
          message: error.message,
        });
      }
    }
  );

  // ============================================
  // Analytics Endpoints
  // ============================================

  if (analyticsService) {
    /**
     * GET /api/v1/proactive-insights/analytics/metrics
     * Get delivery metrics for a time period
     */
    server.get<{
      Querystring: { period?: 'hour' | 'day' | 'week' | 'month' };
    }>(
      '/api/v1/proactive-insights/analytics/metrics',
      {
        onRequest: authGuards,
        schema: {
          description: 'Get proactive insights delivery and engagement metrics',
          tags: ['Proactive Insights Analytics'],
          querystring: {
            type: 'object',
            properties: {
              period: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
            },
          },
          response: {
            200: {
              type: 'object',
              additionalProperties: true,
            },
            401: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { tenantId } = (request as any).user!;
          const { period = 'day' } = request.query as { period?: 'hour' | 'day' | 'week' | 'month' };

          const metrics = await analyticsService.getDeliveryMetrics(tenantId, period);
          return reply.status(200).send(metrics);
        } catch (error: any) {
          server.log.error({ error }, 'Error getting delivery metrics');
          return reply.status(500).send({
            error: 'Failed to get delivery metrics',
            message: error.message,
          });
        }
      }
    );

    /**
     * GET /api/v1/proactive-insights/analytics/daily
     * Get daily metrics for a date range
     */
    server.get<{
      Querystring: { startDate: string; endDate: string };
    }>(
      '/api/v1/proactive-insights/analytics/daily',
      {
        onRequest: authGuards,
        schema: {
          description: 'Get daily proactive insights metrics for a date range',
          tags: ['Proactive Insights Analytics'],
          querystring: {
            type: 'object',
            required: ['startDate', 'endDate'],
            properties: {
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
            },
          },
          response: {
            200: {
              type: 'object',
              additionalProperties: true,
            },
            401: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { tenantId } = (request as any).user!;
          const { startDate, endDate } = request.query as { startDate: string; endDate: string };

          const dailyMetrics = await analyticsService.getDailyMetrics(
            tenantId,
            new Date(startDate),
            new Date(endDate)
          );

          return reply.status(200).send({ daily: dailyMetrics });
        } catch (error: any) {
          server.log.error({ error }, 'Error getting daily metrics');
          return reply.status(500).send({
            error: 'Failed to get daily metrics',
            message: error.message,
          });
        }
      }
    );

    /**
     * GET /api/v1/proactive-insights/analytics/triggers
     * Get trigger performance metrics
     */
    server.get<{
      Querystring: { triggerId?: string };
    }>(
      '/api/v1/proactive-insights/analytics/triggers',
      {
        onRequest: authGuards,
        schema: {
          description: 'Get trigger performance metrics',
          tags: ['Proactive Insights Analytics'],
          querystring: {
            type: 'object',
            properties: {
              triggerId: { type: 'string' },
            },
          },
          response: {
            200: {
              type: 'object',
              additionalProperties: true,
            },
            401: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { tenantId } = (request as any).user!;
          const { triggerId } = request.query as { triggerId?: string };

          const performance = await analyticsService.getTriggerPerformance(tenantId, triggerId);
          return reply.status(200).send({ triggers: performance });
        } catch (error: any) {
          server.log.error({ error }, 'Error getting trigger performance');
          return reply.status(500).send({
            error: 'Failed to get trigger performance',
            message: error.message,
          });
        }
      }
    );

    /**
     * GET /api/v1/proactive-insights/analytics/channels
     * Get channel performance metrics
     */
    server.get<{
      Querystring: { period?: 'hour' | 'day' | 'week' | 'month' };
    }>(
      '/api/v1/proactive-insights/analytics/channels',
      {
        onRequest: authGuards,
        schema: {
          description: 'Get delivery channel performance metrics',
          tags: ['Proactive Insights Analytics'],
          querystring: {
            type: 'object',
            properties: {
              period: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
            },
          },
          response: {
            200: {
              type: 'object',
              additionalProperties: true,
            },
            401: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { tenantId } = (request as any).user!;
          const { period = 'day' } = request.query as { period?: 'hour' | 'day' | 'week' | 'month' };

          const channelPerformance = await analyticsService.getChannelPerformance(tenantId, period);
          return reply.status(200).send({ channels: channelPerformance });
        } catch (error: any) {
          server.log.error({ error }, 'Error getting channel performance');
          return reply.status(500).send({
            error: 'Failed to get channel performance',
            message: error.message,
          });
        }
      }
    );
  }
}

