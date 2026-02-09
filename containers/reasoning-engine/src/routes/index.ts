/**
 * Route Registration
 * Reasoning Engine routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ReasoningService } from '../services/ReasoningService';
import {
  CreateReasoningTaskInput,
  UpdateReasoningTaskInput,
  ReasoningType,
  ReasoningStatus,
} from '../types/reasoning.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const reasoningService = new ReasoningService();

  // ===== SYNC REASON (inline, no task persisted) — dataflow §10.1 =====
  app.post<{ Body: { query: string; context?: string[]; type?: string } }>(
    '/api/v1/reasoning/reason',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Synchronous reasoning: return steps and conclusion without creating a task',
        tags: ['Reasoning'],
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
            context: { type: 'array', items: { type: 'string' } },
            type: {
              type: 'string',
              enum: ['chain_of_thought', 'tree_of_thought', 'analogical', 'counterfactual', 'causal', 'probabilistic', 'meta_reasoning', 'custom'],
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Reasoning result (steps, reasoning, conclusion, confidence)',
            properties: {
              steps: { type: 'array' },
              reasoning: { type: 'string' },
              conclusion: { type: 'string' },
              confidence: { type: 'number' },
              alternatives: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const body = request.body;
      const result = await reasoningService.reasonSync(tenantId, {
        query: body.query,
        context: body.context,
        type: body.type as any,
      });
      reply.send(result);
    }
  );

  // ===== REASONING TASK ROUTES =====

  /**
   * Create reasoning task
   * POST /api/v1/reasoning/tasks
   */
  app.post<{ Body: Omit<CreateReasoningTaskInput, 'tenantId' | 'userId'> }>(
    '/api/v1/reasoning/tasks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new reasoning task',
        tags: ['Reasoning'],
        body: {
          type: 'object',
          required: ['type', 'input'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['chain_of_thought', 'tree_of_thought', 'analogical', 'counterfactual', 'causal', 'probabilistic', 'meta_reasoning', 'custom'] },
            input: {
              type: 'object',
              required: ['query'],
              properties: {
                query: { type: 'string' },
                context: { type: 'array', items: { type: 'string' } },
                constraints: { type: 'object' },
                examples: { type: 'array', items: { type: 'string' } },
              },
            },
            options: {
              type: 'object',
              properties: {
                maxDepth: { type: 'number' },
                maxBranches: { type: 'number' },
                includeAlternatives: { type: 'boolean' },
                minConfidence: { type: 'number', minimum: 0, maximum: 1 },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Reasoning task created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateReasoningTaskInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const task = await reasoningService.create(input);
      reply.code(201).send(task);
    }
  );

  /**
   * Get task by ID
   * GET /api/v1/reasoning/tasks/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/reasoning/tasks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get reasoning task by ID',
        tags: ['Reasoning'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Reasoning task details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const task = await reasoningService.getById(request.params.id, tenantId);
      reply.send(task);
    }
  );

  /**
   * Update task
   * PUT /api/v1/reasoning/tasks/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateReasoningTaskInput }>(
    '/api/v1/reasoning/tasks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update reasoning task',
        tags: ['Reasoning'],
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
            status: { type: 'string', enum: ['pending', 'reasoning', 'completed', 'failed', 'cancelled'] },
            output: { type: 'object' },
            metadata: { type: 'object' },
            error: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Reasoning task updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const task = await reasoningService.updateStatus(
        request.params.id,
        tenantId,
        request.body.status || ReasoningStatus.PENDING,
        {
          output: request.body.output,
          metadata: request.body.metadata,
          error: request.body.error,
        }
      );
      reply.send(task);
    }
  );

  /**
   * Cancel task
   * POST /api/v1/reasoning/tasks/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/reasoning/tasks/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel reasoning task',
        tags: ['Reasoning'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Reasoning task cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const task = await reasoningService.cancel(request.params.id, tenantId);
      reply.send(task);
    }
  );

  /**
   * List tasks
   * GET /api/v1/reasoning/tasks
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/reasoning/tasks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List reasoning tasks',
        tags: ['Reasoning'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'reasoning', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of reasoning tasks',
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
      const result = await reasoningService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

