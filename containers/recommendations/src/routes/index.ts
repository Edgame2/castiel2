/**
 * Route registration for recommendations module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { RecommendationsService } from '../services/RecommendationsService';
import { rankMitigationActions } from '../services/MitigationRankingService';
import {
  createWorkflow,
  getWorkflow,
  getWorkflowsByOpportunity,
  completeStep,
  cancelWorkflow,
} from '../services/RemediationWorkflowService';
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

    // ——— Mitigation actions (Plan §428, §927) ———
    // GET /api/v1/opportunities/:id/mitigation-actions
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/opportunities/:id/mitigation-actions',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get ranked mitigation actions for an opportunity (Plan §428, §927). Uses MitigationRankingService.rankMitigationActions.',
          tags: ['Mitigation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: {
            200: {
              type: 'object',
              properties: {
                opportunityId: { type: 'string' },
                tenantId: { type: 'string' },
                actions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      actionId: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      rank: { type: 'number' },
                      estimatedImpact: { type: 'string', enum: ['high', 'medium', 'low'] },
                      estimatedEffort: { type: 'string', enum: ['low', 'medium', 'high'] },
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
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const result = await rankMitigationActions(id, tenantId);
          return reply.send(result);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get mitigation actions failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return reply.status(statusCode).send({ error: { code: 'MITIGATION_ACTIONS_FAILED', message: msg } });
        }
      }
    );

    // ——— Remediation workflows (Plan §927–929) ———
    // POST /api/v1/remediation-workflows
    fastify.post<{ Body: { opportunityId: string; riskId?: string; assignedTo?: string; steps: { actionId: string; description: string; estimatedEffort?: string }[] } }>(
      '/api/v1/remediation-workflows',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create a remediation workflow (Plan §927–929)',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            required: ['opportunityId', 'steps'],
            properties: {
              opportunityId: { type: 'string' },
              riskId: { type: 'string' },
              assignedTo: { type: 'string' },
              steps: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  required: ['actionId', 'description'],
                  properties: {
                    actionId: { type: 'string' },
                    description: { type: 'string' },
                    estimatedEffort: { type: 'string' },
                  },
                },
              },
            },
          },
          response: { 201: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const tenantId = request.user!.tenantId;
          const w = await createWorkflow(tenantId, request.body);
          return reply.status(201).send(w);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Create remediation workflow failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return reply.status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_CREATE_FAILED', message: msg } });
        }
      }
    );

    // GET /api/v1/remediation-workflows?opportunityId=
    fastify.get<{ Querystring: { opportunityId?: string } }>(
      '/api/v1/remediation-workflows',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List remediation workflows, optionally by opportunityId (Plan §928)',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          querystring: { type: 'object', properties: { opportunityId: { type: 'string' } } },
          response: { 200: { type: 'object', properties: { workflows: { type: 'array' } } } },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.query;
          const tenantId = request.user!.tenantId;
          if (!opportunityId) {
            return reply.status(400).send({ error: { code: 'MISSING_OPPORTUNITY_ID', message: 'opportunityId is required' } });
          }
          const workflows = await getWorkflowsByOpportunity(opportunityId, tenantId);
          return reply.send({ workflows });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('List remediation workflows failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return reply.status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_LIST_FAILED', message: msg } });
        }
      }
    );

    // GET /api/v1/remediation-workflows/:id
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/remediation-workflows/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get a remediation workflow by ID (Plan §928)',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const w = await getWorkflow(id, tenantId);
          if (!w) return reply.status(404).send({ error: { code: 'REMEDIATION_WORKFLOW_NOT_FOUND', message: 'Remediation workflow not found' } });
          return reply.send(w);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Get remediation workflow failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return reply.status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_GET_FAILED', message: msg } });
        }
      }
    );

    // POST /api/v1/remediation-workflows/:id/steps/:stepNumber/complete
    fastify.post<{ Params: { id: string; stepNumber: string }; Body: { completedBy?: string } }>(
      '/api/v1/remediation-workflows/:id/steps/:stepNumber/complete',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Complete a remediation workflow step (Plan §928). Publishes remediation.step.completed or remediation.workflow.completed when all done.',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' }, stepNumber: { type: 'string' } }, required: ['id', 'stepNumber'] },
          body: { type: 'object', properties: { completedBy: { type: 'string' } } },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { id, stepNumber } = request.params;
          const stepNum = parseInt(stepNumber, 10);
          if (Number.isNaN(stepNum) || stepNum < 1) {
            return reply.status(400).send({ error: { code: 'INVALID_STEP_NUMBER', message: 'stepNumber must be a positive integer' } });
          }
          const tenantId = request.user!.tenantId;
          const completedBy = request.body?.completedBy ?? request.user!.id;
          const w = await completeStep(id, stepNum, tenantId, completedBy);
          return reply.send(w);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Complete remediation step failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return reply.status(statusCode).send({ error: { code: 'REMEDIATION_STEP_COMPLETE_FAILED', message: msg } });
        }
      }
    );

    // PUT /api/v1/remediation-workflows/:id/cancel (Plan §928, §435)
    fastify.put<{ Params: { id: string } }>(
      '/api/v1/remediation-workflows/:id/cancel',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Cancel a remediation workflow (Plan §928, §435). Sets status to cancelled. No-op if already cancelled.',
          tags: ['Remediation'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const w = await cancelWorkflow(id, tenantId);
          return reply.send(w);
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
          const msg = error instanceof Error ? error.message : String(error);
          log.error('Cancel remediation workflow failed', error instanceof Error ? error : new Error(msg), { service: 'recommendations' });
          return reply.status(statusCode).send({ error: { code: 'REMEDIATION_WORKFLOW_CANCEL_FAILED', message: msg } });
        }
      }
    );

    log.info('Recommendations routes registered', { service: 'recommendations' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'recommendations' });
    throw error;
  }
}
