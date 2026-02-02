/**
 * Route Registration
 * Multi-Modal Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { MultiModalService } from '../services/MultiModalService';
import {
  CreateMultiModalJobInput,
  UpdateMultiModalJobInput,
  ProcessingStatus,
} from '../types/multimodal.types';

export async function registerRoutes(app: FastifyInstance, _config: unknown): Promise<void> {
  const multiModalService = new MultiModalService();

  // ===== MULTI-MODAL JOB ROUTES =====

  /**
   * Create multi-modal job
   * POST /api/v1/multimodal/jobs
   */
  app.post<{ Body: Omit<CreateMultiModalJobInput, 'tenantId' | 'userId'> }>(
    '/api/v1/multimodal/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new multi-modal processing job',
        tags: ['Multi-Modal'],
        body: {
          type: 'object',
          required: ['type', 'input'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['image', 'diagram', 'audio', 'video', 'whiteboard', 'custom'] },
            input: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                data: { type: 'string' },
                mimeType: { type: 'string' },
                metadata: { type: 'object' },
              },
            },
            options: {
              type: 'object',
              properties: {
                generateCode: { type: 'boolean' },
                extractText: { type: 'boolean' },
                transcribe: { type: 'boolean' },
                analyze: { type: 'boolean' },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Multi-modal job created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateMultiModalJobInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const job = await multiModalService.create(input);
      reply.code(201).send(job);
    }
  );

  /**
   * Get job by ID
   * GET /api/v1/multimodal/jobs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/multimodal/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get multi-modal job by ID',
        tags: ['Multi-Modal'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Multi-modal job details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await multiModalService.getById(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * Update job
   * PUT /api/v1/multimodal/jobs/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateMultiModalJobInput }>(
    '/api/v1/multimodal/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update multi-modal job',
        tags: ['Multi-Modal'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
            output: { type: 'object' },
            analysis: { type: 'object' },
            error: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Multi-modal job updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await multiModalService.updateStatus(
        request.params.id,
        tenantId,
        request.body.status || ProcessingStatus.PENDING,
        {
          output: request.body.output,
          analysis: request.body.analysis,
          error: request.body.error,
        }
      );
      reply.send(job);
    }
  );

  /**
   * Cancel job
   * POST /api/v1/multimodal/jobs/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/multimodal/jobs/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel multi-modal job',
        tags: ['Multi-Modal'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Multi-modal job cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await multiModalService.cancel(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * List jobs
   * GET /api/v1/multimodal/jobs
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/multimodal/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List multi-modal jobs',
        tags: ['Multi-Modal'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of multi-modal jobs',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await multiModalService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

