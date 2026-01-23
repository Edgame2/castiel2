/**
 * Route registration for collaboration_intelligence module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { CollaborationIntelligenceService } from '../services/CollaborationIntelligenceService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const collaborationIntelligenceService = new CollaborationIntelligenceService();

    // Generate collaborative insight
    fastify.post<{ Body: { context: any } }>(
      '/api/v1/collaboration/insights',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Generate collaborative insight',
          tags: ['Collaboration Intelligence'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { context } = request.body;
          const tenantId = request.user!.tenantId;

          const insight = await collaborationIntelligenceService.generateInsight(tenantId, context);

          return reply.status(201).send(insight);
        } catch (error: any) {
          log.error('Failed to generate collaborative insight', error, { service: 'collaboration-intelligence' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'INSIGHT_GENERATION_FAILED',
              message: error.message || 'Failed to generate collaborative insight',
            },
          });
        }
      }
    );

    log.info('Collaboration intelligence routes registered', { service: 'collaboration-intelligence' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'collaboration-intelligence' });
    throw error;
  }
}
