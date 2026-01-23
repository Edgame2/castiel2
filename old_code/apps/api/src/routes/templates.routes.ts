/**
 * Project Template Routes
 * Endpoints for template management, gallery, and instantiation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProjectTemplateService } from '../services/project-template.service.js';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  InstantiateTemplateInput,
  TemplateQueryParams,
  BatchInstantiateInput,
} from '../types/project-template.types.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

export async function registerTemplateRoutes(
  fastify: FastifyInstance,
  templateService: ProjectTemplateService,
) {
  /**
   * POST /api/v1/admin/templates
   * Create new template (super admin only)
   */
  fastify.post<{ Body: CreateTemplateInput }>(
    '/api/v1/admin/templates',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        // Verify super admin role
        if (!authRequest.user?.roles?.includes('super-admin')) {
          return reply.code(403).send({ error: 'Only super admins can create templates' });
        }

        const result = await templateService.createTemplate(
          authRequest.user.tenantId,
          request.body as CreateTemplateInput,
          authRequest.user.id,
        );

        reply.code(201).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * PATCH /api/v1/admin/templates/:templateId
   * Update template (super admin only)
   */
  fastify.patch<{ Params: { templateId: string }; Body: UpdateTemplateInput }>(
    '/api/v1/admin/templates/:templateId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        if (!authRequest.user?.roles?.includes('super-admin')) {
          return reply.code(403).send({ error: 'Only super admins can update templates' });
        }

        const { templateId } = request.params as { templateId: string };
        const result = await templateService.updateTemplate(
          templateId,
          request.body as UpdateTemplateInput,
          authRequest.user.id,
        );

        reply.code(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * DELETE /api/v1/admin/templates/:templateId
   * Delete template (super admin only)
   */
  fastify.delete<{ Params: { templateId: string } }>(
    '/api/v1/admin/templates/:templateId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        if (!authRequest.user?.roles?.includes('super-admin')) {
          return reply.code(403).send({ error: 'Only super admins can delete templates' });
        }

        const { templateId } = request.params as { templateId: string };
        await templateService.deleteTemplate(templateId);
        reply.code(204).send();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        fastify.log.error(error instanceof Error ? error : new Error(errorMessage));
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/templates/gallery?category=SALES&limit=20
   * Get template gallery with filtering
   */
  fastify.get<{ Querystring: TemplateQueryParams }>(
    '/api/v1/templates/gallery',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }
        
        const query = request.query as {
          category?: string;
          tags?: string;
          searchText?: string;
          difficulty?: string;
          page?: string;
          limit?: string;
          sortBy?: string;
          sortDirection?: string;
        };
        
        const params: TemplateQueryParams = {
          category: query.category as any,
          tags: query.tags ? query.tags.split(',') : undefined,
          searchText: query.searchText,
          difficulty: query.difficulty as any,
          page: query.page ? parseInt(query.page, 10) : 1,
          limit: query.limit ? parseInt(query.limit, 10) : 20,
          sortBy: query.sortBy as any,
          sortDirection: query.sortDirection as any,
        };

        const result = await templateService.getTemplateGallery(tenantId, params);
        reply.code(200).send(result);
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/templates/:templateId
   * Get template by ID
   */
  fastify.get<{ Params: { templateId: string } }>(
    '/api/v1/templates/:templateId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { templateId } = request.params as { templateId: string };
        const template = await templateService.getTemplate(templateId);
        if (!template) {
          return reply.code(404).send({ error: 'Template not found' });
        }

        reply.code(200).send(template);
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/templates/:templateId/preview
   * Get template preview with full details
   */
  fastify.get<{ Params: { templateId: string } }>(
    '/api/v1/templates/:templateId/preview',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { templateId } = request.params as { templateId: string };
        const preview = await templateService.getTemplatePreview(templateId);
        if (!preview) {
          return reply.code(404).send({ error: 'Template not found' });
        }

        reply.code(200).send(preview);
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * POST /api/v1/templates/:templateId/instantiate
   * Create new project from template
   */
  fastify.post<{
    Params: { templateId: string };
    Body: InstantiateTemplateInput;
  }>(
    '/api/v1/templates/:templateId/instantiate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const tenantId = authRequest.user?.tenantId;
        const userId = authRequest.user?.id;
        const displayName = authRequest.user?.email;
        
        if (!tenantId || !userId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const { templateId } = request.params as { templateId: string };
        const result = await templateService.instantiateTemplate(
          tenantId,
          templateId,
          request.body as InstantiateTemplateInput,
          userId,
          displayName || userId,
        );

        reply.code(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * POST /api/v1/templates/:templateId/instantiate-batch
   * Create multiple projects from template
   */
  fastify.post<{
    Params: { templateId: string };
    Body: BatchInstantiateInput;
  }>(
    '/api/v1/templates/:templateId/instantiate-batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const tenantId = authRequest.user?.tenantId;
        const userId = authRequest.user?.id;
        const displayName = authRequest.user?.email;
        
        if (!tenantId || !userId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const { templateId } = request.params as { templateId: string };
        const result = await templateService.batchInstantiateTemplate(
          tenantId,
          templateId,
          request.body as BatchInstantiateInput,
          userId,
          displayName || userId,
        );

        reply.code(200).send(result);
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * GET /api/v1/admin/templates/:templateId/statistics
   * Get template usage statistics
   */
  fastify.get<{ Params: { templateId: string } }>(
    '/api/v1/admin/templates/:templateId/statistics',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { templateId } = request.params as { templateId: string };
        const stats = await templateService.getTemplateStats(templateId);
        if (!stats) {
          return reply.code(404).send({ error: 'Template not found' });
        }

        reply.code(200).send(stats);
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reply.code(400).send({ error: errorMessage });
      }
    },
  );

  /**
   * POST /api/v1/templates/instances/:instanceId/setup-items/:itemId/complete
   * Mark setup item as complete
   */
  fastify.post<{
    Params: { instanceId: string; itemId: string };
  }>(
    '/api/v1/templates/instances/:instanceId/setup-items/:itemId/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const tenantId = authRequest.user?.tenantId;
        
        if (!tenantId) {
          return reply.code(401).send({ error: 'Unauthorized: Missing tenant context' });
        }
        
        const { instanceId, itemId } = request.params as { instanceId: string; itemId: string };
        await templateService.completeSetupItem(tenantId, instanceId, itemId);

        reply.code(200).send({ message: 'Setup item completed' });
      } catch (error) {
        fastify.log.error(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        reply.code(400).send({ error: errorMessage });
      }
    },
  );
}
