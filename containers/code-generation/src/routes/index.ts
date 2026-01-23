/**
 * Route Registration
 * Code Generation routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { CodeGenerationService } from '../services/CodeGenerationService';
import { GenerationTemplateService } from '../services/GenerationTemplateService';
import {
  CreateGenerationJobInput,
  UpdateGenerationJobInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  GenerationType,
  GenerationStatus,
} from '../types/generation.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const templateService = new GenerationTemplateService();
  const generationService = new CodeGenerationService(templateService);

  // ===== GENERATION JOB ROUTES =====

  /**
   * Create generation job
   * POST /api/v1/generate/jobs
   */
  app.post<{ Body: Omit<CreateGenerationJobInput, 'tenantId' | 'userId'> }>(
    '/api/v1/generate/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new code generation job',
        tags: ['Code Generation'],
        body: {
          type: 'object',
          required: ['type', 'input'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['ui_component', 'api_endpoint', 'database_schema', 'test_data', 'configuration', 'migration', 'iac', 'custom'] },
            templateId: { type: 'string', format: 'uuid' },
            input: {
              type: 'object',
              properties: {
                specification: { type: 'string' },
                requirements: { type: 'object' },
                context: { type: 'array', items: { type: 'string' } },
                examples: { type: 'array', items: { type: 'string' } },
              },
            },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Code generation job created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateGenerationJobInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const job = await generationService.create(input);
      reply.code(201).send(job);
    }
  );

  /**
   * Get job by ID
   * GET /api/v1/generate/jobs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/generate/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get code generation job by ID',
        tags: ['Code Generation'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Code generation job details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await generationService.getById(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * Cancel job
   * POST /api/v1/generate/jobs/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/generate/jobs/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel code generation job',
        tags: ['Code Generation'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Code generation job cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await generationService.cancel(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * List jobs
   * GET /api/v1/generate/jobs
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/generate/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List code generation jobs',
        tags: ['Code Generation'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'generating', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of code generation jobs',
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
      const result = await generationService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== TEMPLATE ROUTES =====

  /**
   * Create template
   * POST /api/v1/generate/templates
   */
  app.post<{ Body: Omit<CreateTemplateInput, 'tenantId' | 'userId'> }>(
    '/api/v1/generate/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new generation template',
        tags: ['Templates'],
        body: {
          type: 'object',
          required: ['name', 'type', 'template'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['ui_component', 'api_endpoint', 'database_schema', 'test_data', 'configuration', 'migration', 'iac', 'custom'] },
            template: {
              type: 'object',
              properties: {
                prompt: { type: 'string' },
                systemPrompt: { type: 'string' },
                codeTemplate: { type: 'string' },
                rules: { type: 'array', items: { type: 'string' } },
                constraints: { type: 'object' },
              },
            },
            examples: { type: 'array' },
            metadata: { type: 'object' },
            enabled: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Generation template created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateTemplateInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
      };

      const template = await templateService.create(input);
      reply.code(201).send(template);
    }
  );

  /**
   * Get template by ID
   * GET /api/v1/generate/templates/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/generate/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get generation template by ID',
        tags: ['Templates'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Generation template details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await templateService.getById(request.params.id, tenantId);
      reply.send(template);
    }
  );

  /**
   * Update template
   * PUT /api/v1/generate/templates/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateTemplateInput }>(
    '/api/v1/generate/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update generation template',
        tags: ['Templates'],
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
            template: { type: 'object' },
            examples: { type: 'array' },
            metadata: { type: 'object' },
            enabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Generation template updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await templateService.update(request.params.id, tenantId, request.body);
      reply.send(template);
    }
  );

  /**
   * Delete template
   * DELETE /api/v1/generate/templates/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/generate/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete generation template',
        tags: ['Templates'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Generation template deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await templateService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List templates
   * GET /api/v1/generate/templates
   */
  app.get<{
    Querystring: {
      type?: string;
      enabled?: boolean;
      language?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/generate/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List generation templates',
        tags: ['Templates'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            enabled: { type: 'boolean' },
            language: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of generation templates',
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
      const result = await templateService.list(tenantId, {
        type: request.query.type as any,
        enabled: request.query.enabled,
        language: request.query.language,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

