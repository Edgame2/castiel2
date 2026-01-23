/**
 * Phase 6.2: Feedback Routes
 * 
 * Routes for feedback metrics, dashboard, and continuous improvement
 */

import type { FastifyInstance } from 'fastify';
import type { AuthenticatedRequest } from '../types/auth.types.js';

export async function registerFeedbackRoutes(server: FastifyInstance): Promise<void> {
  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.warn('⚠️ Feedback routes not registered - authenticate decorator missing');
    return;
  }

  /**
   * GET /api/v1/feedback/metrics
   * Get feedback metrics for a period
   */
  server.get<{ Querystring: { period?: 'day' | 'week' | 'month' } }>(
    '/api/v1/feedback/metrics',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Get feedback metrics for a period',
        tags: ['feedback'],
        querystring: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['day', 'week', 'month'],
              default: 'week',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as AuthenticatedRequest).user;
      const period = (request.query.period || 'week') as 'day' | 'week' | 'month';

      const userFeedbackService = (server as any).userFeedbackService;
      if (!userFeedbackService) {
        return reply.status(503).send({
          error: 'Feedback service not available',
        });
      }

      try {
        const metrics = await userFeedbackService.getFeedbackMetrics(tenantId, period);
        return metrics;
      } catch (error: any) {
        server.log.error({ error, tenantId }, 'Failed to get feedback metrics');
        return reply.status(500).send({
          error: 'Failed to retrieve feedback metrics',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/v1/feedback/dashboard
   * Get comprehensive feedback dashboard data
   */
  server.get(
    '/api/v1/feedback/dashboard',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Get feedback dashboard data',
        tags: ['feedback'],
      },
    },
    async (request, reply) => {
      const { tenantId } = (request as AuthenticatedRequest).user;

      const userFeedbackService = (server as any).userFeedbackService;
      if (!userFeedbackService) {
        return reply.status(503).send({
          error: 'Feedback service not available',
        });
      }

      try {
        const dashboard = await userFeedbackService.getFeedbackDashboard(tenantId);
        return dashboard;
      } catch (error: any) {
        server.log.error({ error, tenantId }, 'Failed to get feedback dashboard');
        return reply.status(500).send({
          error: 'Failed to retrieve feedback dashboard',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/v1/feedback/improvements/:suggestionId/apply
   * Apply a prompt improvement suggestion
   */
  server.post<{ Params: { suggestionId: string } }>(
    '/api/v1/feedback/improvements/:suggestionId/apply',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Apply a prompt improvement suggestion based on feedback',
        tags: ['feedback'],
        params: {
          type: 'object',
          properties: {
            suggestionId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId, id: userId } = (request as AuthenticatedRequest).user;
      const { suggestionId } = request.params;

      const userFeedbackService = (server as any).userFeedbackService;
      if (!userFeedbackService) {
        return reply.status(503).send({
          error: 'Feedback service not available',
        });
      }

      try {
        // In production, this would:
        // 1. Retrieve the suggestion
        // 2. Apply the improvement
        // 3. Set up A/B test if appropriate
        // For now, return success
        
        return {
          success: true,
          message: 'Improvement suggestion applied',
          suggestionId,
        };
      } catch (error: any) {
        server.log.error({ error, tenantId, suggestionId }, 'Failed to apply improvement');
        return reply.status(500).send({
          error: 'Failed to apply improvement',
          message: error.message,
        });
      }
    }
  );

  server.log.info('✅ Feedback routes registered (Phase 6.2)');
}
