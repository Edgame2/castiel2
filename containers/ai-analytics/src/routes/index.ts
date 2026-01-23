/**
 * Route registration for ai_analytics module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { AIAnalyticsService } from '../services/AIAnalyticsService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const aiAnalyticsService = new AIAnalyticsService();

    // Get model analytics
    fastify.get<{ Querystring: { modelId?: string } }>(
      '/api/v1/ai-analytics/models',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get AI model analytics',
          tags: ['AI Analytics'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const { modelId } = request.query;

          const models = await aiAnalyticsService.getModelAnalytics(tenantId, modelId);

          return reply.send({ models });
        } catch (error: any) {
          log.error('Failed to get model analytics', error, { service: 'ai-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'ANALYTICS_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve model analytics',
            },
          });
        }
      }
    );

    log.info('AI analytics routes registered', { service: 'ai-analytics' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'ai-analytics' });
    throw error;
  }
}
