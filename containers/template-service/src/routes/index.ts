/**
 * Route Registration
 * Template Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { TemplateService } from '../services/TemplateService';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  RenderTemplateInput,
} from '../types/template.types';

export async function registerRoutes(app: FastifyInstance, _config: any): Promise<void> {
  const templateService = new TemplateService();

  // ===== TEMPLATE ROUTES =====

  /**
   * Create template
   * POST /api/v1/templates
   */
  app.post<{ Body: Omit<CreateTemplateInput, 'tenantId' | 'userId'> }>(
    '/api/v1/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new template',
        tags: ['Templates'],
        body: {
          type: 'object',
          required: ['name', 'type', 'content'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['context', 'email', 'document', 'code', 'report'] },
            category: { type: 'string' },
            content: { type: 'string', minLength: 1 },
            variables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] },
                  required: { type: 'boolean' },
                  defaultValue: { type: ['string', 'number', 'boolean', 'object', 'array'] },
                  description: { type: 'string' },
                },
              },
            },
            organizationId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            subject: { type: 'string' },
            htmlContent: { type: 'string' },
            textContent: { type: 'string' },
            format: { type: 'string', enum: ['html', 'pdf', 'docx', 'markdown'] },
            contextType: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  content: { type: 'string' },
                  order: { type: 'number' },
                  required: { type: 'boolean' },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Template created successfully',
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
   * GET /api/v1/templates/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get template by ID',
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
            description: 'Template details',
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
   * PUT /api/v1/templates/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateTemplateInput }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update template',
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
            category: { type: 'string' },
            content: { type: 'string' },
            variables: { type: 'array' },
            status: { type: 'string', enum: ['draft', 'active', 'archived', 'deprecated'] },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            subject: { type: 'string' },
            htmlContent: { type: 'string' },
            textContent: { type: 'string' },
            format: { type: 'string', enum: ['html', 'pdf', 'docx', 'markdown'] },
            contextType: { type: 'string' },
            sections: { type: 'array' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Template updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const template = await templateService.update(request.params.id, tenantId, userId, request.body);
      reply.send(template);
    }
  );

  /**
   * Delete template
   * DELETE /api/v1/templates/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete template',
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
            description: 'Template deleted successfully',
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
   * GET /api/v1/templates
   */
  app.get<{
    Querystring: {
      type?: string;
      category?: string;
      status?: string;
      organizationId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List templates',
        tags: ['Templates'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['context', 'email', 'document', 'code', 'report'] },
            category: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'active', 'archived', 'deprecated'] },
            organizationId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of templates',
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
        category: request.query.category,
        status: request.query.status as any,
        organizationId: request.query.organizationId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Render template
   * POST /api/v1/templates/:id/render
   */
  app.post<{ Params: { id: string }; Body: Omit<RenderTemplateInput, 'tenantId' | 'templateId'> }>(
    '/api/v1/templates/:id/render',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Render template with variables',
        tags: ['Templates'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['variables'],
          properties: {
            variables: { type: 'object', additionalProperties: true },
            organizationId: { type: 'string', format: 'uuid' },
            version: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Rendered template',
            properties: {
              rendered: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: RenderTemplateInput = {
        tenantId,
        templateId: request.params.id,
        ...request.body,
      };

      const rendered = await templateService.render(input);
      reply.send({ rendered });
    }
  );

  /**
   * Get template versions
   * GET /api/v1/templates/:id/versions
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id/versions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all versions of a template',
        tags: ['Templates'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of template versions',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const versions = await templateService.getVersions(tenantId, request.params.id);
      reply.send(versions);
    }
  );
}
