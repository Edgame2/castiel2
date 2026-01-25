/**
 * Route registration for workflow-orchestrator module
 */

import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { WorkflowOrchestratorService } from '../services/WorkflowOrchestratorService';
import * as HitlApprovalService from '../services/HitlApprovalService';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const workflowOrchestratorService = new WorkflowOrchestratorService();

    // Get workflow status
    fastify.get<{ Params: { workflowId: string } }>(
      '/api/v1/workflows/:workflowId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get workflow status',
          tags: ['Workflows'],
          security: [{ bearerAuth: [] }],
          params: {
            type: 'object',
            properties: {
              workflowId: { type: 'string' },
            },
            required: ['workflowId'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { workflowId } = request.params;
          const tenantId = request.user!.tenantId;

          const workflow = await workflowOrchestratorService.getWorkflow(workflowId, tenantId);

          if (!workflow) {
            return reply.status(404).send({
              error: {
                code: 'WORKFLOW_NOT_FOUND',
                message: 'Workflow not found',
              },
            });
          }

          return reply.send(workflow);
        } catch (error: any) {
          log.error('Failed to get workflow', error, { service: 'workflow-orchestrator' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'WORKFLOW_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve workflow',
            },
          });
        }
      }
    );

    // Get workflows for opportunity
    fastify.get<{ Querystring: { opportunityId: string } }>(
      '/api/v1/workflows',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get workflows for opportunity',
          tags: ['Workflows'],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: 'object',
            properties: {
              opportunityId: { type: 'string' },
            },
            required: ['opportunityId'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { opportunityId } = request.query;
          const tenantId = request.user!.tenantId;

          const workflows = await workflowOrchestratorService.getWorkflowsForOpportunity(opportunityId, tenantId);

          return reply.send({
            workflows,
            total: workflows.length,
          });
        } catch (error: any) {
          log.error('Failed to list workflows', error, { service: 'workflow-orchestrator' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'WORKFLOW_LISTING_FAILED',
              message: error.message || 'Failed to list workflows',
            },
          });
        }
      }
    );

    // --- HITL Approvals (Plan §972, hitl-approval-flow runbook) ---
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/hitl/approvals/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get HITL approval by id',
          tags: ['HITL'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;
        const approval = await HitlApprovalService.getById(id, tenantId);
        if (!approval) return reply.status(404).send({ error: { code: 'HITL_APPROVAL_NOT_FOUND', message: 'HITL approval not found' } });
        return reply.send(approval);
      }
    );

    fastify.post<{ Params: { id: string }; Body: { decidedBy: string; comment?: string } }>(
      '/api/v1/hitl/approvals/:id/approve',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Approve HITL request (Plan §972)',
          tags: ['HITL'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          body: { type: 'object', properties: { decidedBy: { type: 'string' }, comment: { type: 'string' } }, required: ['decidedBy'] },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const body = request.body ?? {};
          if (!body.decidedBy) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'decidedBy is required' } });
          const approval = await HitlApprovalService.approve(id, tenantId, { decidedBy: body.decidedBy, comment: body.comment });
          return reply.send(approval);
        } catch (e: unknown) {
          const err = e as Error & { statusCode?: number };
          if (err.statusCode === 404) return reply.status(404).send({ error: { code: 'HITL_APPROVAL_NOT_FOUND', message: err.message } });
          if (err.statusCode === 409) return reply.status(409).send({ error: { code: 'HITL_APPROVAL_NOT_PENDING', message: err.message } });
          log.error('HITL approve failed', err, { service: 'workflow-orchestrator' });
          return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to approve' } });
        }
      }
    );

    fastify.post<{ Params: { id: string }; Body: { decidedBy: string; comment?: string } }>(
      '/api/v1/hitl/approvals/:id/reject',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Reject HITL request (Plan §972)',
          tags: ['HITL'],
          security: [{ bearerAuth: [] }],
          params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          body: { type: 'object', properties: { decidedBy: { type: 'string' }, comment: { type: 'string' } }, required: ['decidedBy'] },
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const tenantId = request.user!.tenantId;
          const body = request.body ?? {};
          if (!body.decidedBy) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'decidedBy is required' } });
          const approval = await HitlApprovalService.reject(id, tenantId, { decidedBy: body.decidedBy, comment: body.comment });
          return reply.send(approval);
        } catch (e: unknown) {
          const err = e as Error & { statusCode?: number };
          if (err.statusCode === 404) return reply.status(404).send({ error: { code: 'HITL_APPROVAL_NOT_FOUND', message: err.message } });
          if (err.statusCode === 409) return reply.status(409).send({ error: { code: 'HITL_APPROVAL_NOT_PENDING', message: err.message } });
          log.error('HITL reject failed', err, { service: 'workflow-orchestrator' });
          return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reject' } });
        }
      }
    );

    // Retry failed workflow
    fastify.post<{ Params: { workflowId: string } }>(
      '/api/v1/workflows/:workflowId/retry',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Retry failed workflow',
          tags: ['Workflows'],
          security: [{ bearerAuth: [] }],
          params: {
            type: 'object',
            properties: {
              workflowId: { type: 'string' },
            },
            required: ['workflowId'],
          },
        },
      },
      async (request, reply) => {
        try {
          const { workflowId } = request.params;
          const tenantId = request.user!.tenantId;

          const workflow = await workflowOrchestratorService.retryWorkflow(workflowId, tenantId);

          return reply.send({
            workflowId: workflow.workflowId,
            status: workflow.status,
            message: 'Workflow retry initiated',
          });
        } catch (error: any) {
          log.error('Failed to retry workflow', error, { service: 'workflow-orchestrator' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'WORKFLOW_RETRY_FAILED',
              message: error.message || 'Failed to retry workflow',
            },
          });
        }
      }
    );

    log.info('Workflow orchestrator routes registered', { service: 'workflow-orchestrator' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'workflow-orchestrator' });
    throw error;
  }
}
