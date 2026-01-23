/**
 * Route registration for risk-analytics module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { RiskEvaluationService } from '../services/RiskEvaluationService';
import { getContainer } from '@coder/shared/database';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const riskEvaluationService = new RiskEvaluationService(fastify);

    // Get risk evaluation by ID
    fastify.get<{ Params: { evaluationId: string } }>(
      '/api/v1/risk/evaluations/:evaluationId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get risk evaluation by ID',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { evaluationId } = request.params;
          const tenantId = request.user!.tenantId;

          const container = getContainer('risk_evaluations');
          const { resource } = await container.item(evaluationId, tenantId).read();

          if (!resource) {
            return reply.status(404).send({
              error: {
                code: 'EVALUATION_NOT_FOUND',
                message: 'Risk evaluation not found',
              },
            });
          }

          return reply.send(resource);
        } catch (error: any) {
          log.error('Failed to get risk evaluation', error, { service: 'risk-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'EVALUATION_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve risk evaluation',
            },
          });
        }
      }
    );

    // Trigger risk evaluation (synchronous)
    fastify.post<{ Body: { opportunityId: string; options?: any } }>(
      '/api/v1/risk/evaluations',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Trigger risk evaluation for an opportunity',
          tags: ['Risk Evaluation'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId, options } = request.body;
          const tenantId = request.user!.tenantId;
          const userId = request.user!.id;

          const evaluation = await riskEvaluationService.evaluateRisk({
            opportunityId,
            tenantId,
            userId,
            trigger: 'manual',
            options,
          });

          return reply.status(202).send({
            evaluationId: evaluation.evaluationId,
            status: 'completed',
            evaluation,
          });
        } catch (error: any) {
          log.error('Failed to trigger risk evaluation', error, { service: 'risk-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'EVALUATION_FAILED',
              message: error.message || 'Failed to evaluate risk',
            },
          });
        }
      }
    );

    // Get revenue at risk
    fastify.get<{ Params: { opportunityId: string } }>(
      '/api/v1/revenue/at-risk/:opportunityId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get revenue at risk for opportunity',
          tags: ['Revenue'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.params;
          const tenantId = request.user!.tenantId;

          // Get latest evaluation
          const container = getContainer('risk_evaluations');
          const { resources } = await container.items
            .query({
              query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.calculatedAt DESC',
              parameters: [
                { name: '@opportunityId', value: opportunityId },
                { name: '@tenantId', value: tenantId },
              ],
            })
            .fetchNext();

          if (resources.length === 0) {
            return reply.status(404).send({
              error: {
                code: 'EVALUATION_NOT_FOUND',
                message: 'No risk evaluation found for this opportunity',
              },
            });
          }

          const evaluation = resources[0];
          const revenueAtRisk = evaluation.revenueAtRisk || 0;

          return reply.send({
            opportunityId,
            revenueAtRisk,
            riskScore: evaluation.riskScore,
            calculatedAt: evaluation.calculatedAt,
          });
        } catch (error: any) {
          log.error('Failed to get revenue at risk', error, { service: 'risk-analytics' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'REVENUE_CALCULATION_FAILED',
              message: error.message || 'Failed to calculate revenue at risk',
            },
          });
        }
      }
    );

    log.info('Risk analytics routes registered', { service: 'risk-analytics' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'risk-analytics' });
    throw error;
  }
}
