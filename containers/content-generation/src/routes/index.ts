/**
 * Route Registration
 * Content Generation routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ContentGenerationService } from '../services/ContentGenerationService';
import { ContentTemplateService } from '../services/ContentTemplateService';
import {
  CreateContentJobInput,
  GenerateContentRequest,
  CreateContentTemplateInput,
  UpdateContentTemplateInput,
  GenerationJobStatus,
  OutputFormat,
  TemplateCategory,
  DocumentType,
} from '../types/content.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const contentGenerationService = new ContentGenerationService(
    config.services.ai_service.url,
    config.services.shard_manager.url
  );
  const contentTemplateService = new ContentTemplateService();

  // ===== CONTENT GENERATION JOB ROUTES =====

  /**
   * Generate content (synchronous)
   * POST /api/v1/content/generate
   */
  app.post<{ Body: GenerateContentRequest }>(
    '/api/v1/content/generate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Generate content using AI (synchronous)',
        tags: ['Content Generation'],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 10000 },
            templateId: { type: 'string', format: 'uuid' },
            context: {
              type: 'object',
              properties: {
                projectId: { type: 'string', format: 'uuid' },
                shardId: { type: 'string', format: 'uuid' },
                shardTypeId: { type: 'string' },
                variables: { type: 'object', additionalProperties: { type: 'string' } },
              },
            },
            options: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                format: { type: 'string', enum: ['html', 'pdf', 'docx', 'pptx', 'markdown'] },
                connectionId: { type: 'string' },
                variables: { type: 'object', additionalProperties: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Generated content job',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const requestBody: GenerateContentRequest = {
        ...request.body,
        tenantId,
        userId,
      };

      const job = await contentGenerationService.generate(requestBody);
      reply.send(job);
    }
  );

  /**
   * Create content generation job (asynchronous)
   * POST /api/v1/content/jobs
   */
  app.post<{ Body: CreateContentJobInput }>(
    '/api/v1/content/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create content generation job (asynchronous)',
        tags: ['Content Generation'],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 10000 },
            templateId: { type: 'string', format: 'uuid' },
            context: {
              type: 'object',
              properties: {
                projectId: { type: 'string', format: 'uuid' },
                shardId: { type: 'string', format: 'uuid' },
                shardTypeId: { type: 'string' },
                variables: { type: 'object', additionalProperties: { type: 'string' } },
              },
            },
            options: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                format: { type: 'string', enum: ['html', 'pdf', 'docx', 'pptx', 'markdown'] },
                connectionId: { type: 'string' },
                skipPlaceholders: { type: 'array', items: { type: 'string' } },
                notifyOnComplete: { type: 'boolean' },
              },
            },
            requestId: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Content generation job created',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateContentJobInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const job = await contentGenerationService.create(input);
      reply.code(201).send(job);
    }
  );

  /**
   * Get content generation job by ID
   * GET /api/v1/content/jobs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/content/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get content generation job by ID',
        tags: ['Content Generation'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Content generation job details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await contentGenerationService.getById(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * Cancel content generation job
   * POST /api/v1/content/jobs/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/content/jobs/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel content generation job',
        tags: ['Content Generation'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Job cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await contentGenerationService.cancel(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * List content generation jobs
   * GET /api/v1/content/jobs
   */
  app.get<{
    Querystring: {
      status?: string;
      userId?: string;
      templateId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/content/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List content generation jobs',
        tags: ['Content Generation'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            userId: { type: 'string', format: 'uuid' },
            templateId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of content generation jobs',
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
      const result = await contentGenerationService.list(tenantId, {
        status: request.query.status as any,
        userId: request.query.userId,
        templateId: request.query.templateId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== CONTENT TEMPLATE ROUTES =====

  /**
   * Create content template
   * POST /api/v1/content/templates
   */
  app.post<{ Body: CreateContentTemplateInput }>(
    '/api/v1/content/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create content template',
        tags: ['Content Templates'],
        body: {
          type: 'object',
          required: ['name', 'category', 'documentType', 'templateContent'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['sales', 'report', 'proposal', 'executive', 'technical', 'training', 'marketing', 'general'] },
            documentType: { type: 'string', enum: ['presentation', 'document', 'webpage'] },
            tags: { type: 'array', items: { type: 'string' } },
            templateContent: { type: 'string' },
            defaultTheme: { type: 'object' },
            requiredFields: { type: 'array', items: { type: 'object' } },
            aiConfig: { type: 'object' },
            isSystemTemplate: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Content template created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateContentTemplateInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const template = await contentTemplateService.create(input);
      reply.code(201).send(template);
    }
  );

  /**
   * Get content template by ID
   * GET /api/v1/content/templates/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get content template by ID',
        tags: ['Content Templates'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Content template details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await contentTemplateService.getById(request.params.id, tenantId);
      reply.send(template);
    }
  );

  /**
   * Update content template
   * PUT /api/v1/content/templates/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateContentTemplateInput }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update content template',
        tags: ['Content Templates'],
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
            category: { type: 'string', enum: ['sales', 'report', 'proposal', 'executive', 'technical', 'training', 'marketing', 'general'] },
            documentType: { type: 'string', enum: ['presentation', 'document', 'webpage'] },
            tags: { type: 'array', items: { type: 'string' } },
            templateContent: { type: 'string' },
            defaultTheme: { type: 'object' },
            requiredFields: { type: 'array', items: { type: 'object' } },
            aiConfig: { type: 'object' },
            isActive: { type: 'boolean' },
            version: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Content template updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await contentTemplateService.update(request.params.id, tenantId, request.body);
      reply.send(template);
    }
  );

  /**
   * Delete content template
   * DELETE /api/v1/content/templates/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete content template',
        tags: ['Content Templates'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Content template deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await contentTemplateService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List content templates
   * GET /api/v1/content/templates
   */
  app.get<{
    Querystring: {
      category?: string;
      documentType?: string;
      isActive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/content/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List content templates',
        tags: ['Content Templates'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['sales', 'report', 'proposal', 'executive', 'technical', 'training', 'marketing', 'general'] },
            documentType: { type: 'string', enum: ['presentation', 'document', 'webpage'] },
            isActive: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of content templates',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const templates = await contentTemplateService.list(tenantId, {
        category: request.query.category,
        documentType: request.query.documentType,
        isActive: request.query.isActive,
        limit: request.query.limit,
      });
      reply.send(templates);
    }
  );
}
