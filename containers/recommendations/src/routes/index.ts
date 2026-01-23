/**
 * Route registration for recommendations module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { RecommendationsService } from '../services/RecommendationsService';
import { FeedbackAction } from '../types/recommendations.types';
import { getContainer } from '@coder/shared/database';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const recommendationsService = new RecommendationsService(fastify);

    // Get recommendations for opportunity
    fastify.get<{ Querystring: { opportunityId?: string; userId?: string; limit?: number } }>(
      '/api/v1/recommendations',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get recommendations for opportunity or user',
          tags: ['Recommendations'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            properties: {
              opportunityId: { type: 'string' },
              userId: { type: 'string' },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            },
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId, userId, limit } = request.query;
          const tenantId = request.user!.tenantId;

          const batch = await recommendationsService.generateRecommendations({
            opportunityId,
            userId: userId || request.user!.id,
            tenantId,
            limit,
          });

          return reply.send(batch);
        } catch (error: any) {
          log.error('Failed to get recommendations', error, { service: 'recommendations' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RECOMMENDATION_GENERATION_FAILED',
              message: error.message || 'Failed to generate recommendations',
            },
          });
        }
      }
    );

    // Get recommendation by ID
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/recommendations/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get recommendation by ID',
          tags: ['Recommendations'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;

          const container = getContainer('recommendation_recommendations');
          const { resource } = await container.item(id, tenantId).read();

          if (!resource) {
            return reply.status(404).send({
              error: {
                code: 'RECOMMENDATION_NOT_FOUND',
                message: 'Recommendation not found',
              },
            });
          }

          return reply.send(resource);
        } catch (error: any) {
          log.error('Failed to get recommendation', error, { service: 'recommendations' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'RECOMMENDATION_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve recommendation',
            },
          });
        }
      }
    );

    // Submit feedback on recommendation
    fastify.post<{ Params: { id: string }; Body: { action: FeedbackAction; comment?: string } }>(
      '/api/v1/recommendations/:id/feedback',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Submit feedback on recommendation (accept/ignore/irrelevant) - Critical for CAIS learning',
          tags: ['Feedback'],
          security: [{ bearerAuth: [] }],
          params: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
          body: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['accept', 'ignore', 'irrelevant'],
              },
              comment: { type: 'string' },
            },
            required: ['action'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const { action, comment } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          await recommendationsService.recordFeedback({
            recommendationId: id,
            action,
            userId,
            tenantId,
            comment,
            timestamp: new Date(),
          });

          return reply.status(200).send({
            message: 'Feedback received',
            recommendationId: id,
            action,
          });
        } catch (error: any) {
          log.error('Failed to record feedback', error, { service: 'recommendations' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'FEEDBACK_RECORDING_FAILED',
              message: error.message || 'Failed to record feedback',
            },
          });
        }
      }
    );

    log.info('Recommendations routes registered', { service: 'recommendations' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'recommendations' });
    throw error;
  }
}
