/**
 * Template Management Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TemplateService } from '../services/TemplateService';
import { authenticateRequest } from '@coder/shared';
import { NotificationChannel } from '../types/notification';

export async function templateRoutes(fastify: FastifyInstance) {
  const templateService = new TemplateService();

  // Register authentication middleware
  fastify.addHook('preHandler', authenticateRequest);

  // List templates
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as any;
      
      const templates = await templateService.listTemplates({
        organizationId: query.organizationId || user.organizationId,
        eventType: query.eventType,
        channel: query.channel as NotificationChannel | undefined,
        locale: query.locale,
        enabled: query.enabled !== undefined ? query.enabled === 'true' : undefined,
      });

      reply.send({ data: templates });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Get template by ID
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      const template = await templateService.getTemplate(id);
      reply.send({ data: template });
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        reply.code(404).send({ error: error.message });
      } else {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  // Create template
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = request.body as any;
      
      const template = await templateService.createTemplate({
        organizationId: body.organizationId || user.organizationId,
        name: body.name,
        eventType: body.eventType,
        channel: body.channel,
        subject: body.subject,
        body: body.body,
        bodyHtml: body.bodyHtml,
        variables: body.variables,
        locale: body.locale || 'en',
        enabled: body.enabled !== false,
      });

      reply.code(201).send({ data: template });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  // Update template
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      
      const template = await templateService.updateTemplate(id, {
        name: body.name,
        subject: body.subject,
        body: body.body,
        bodyHtml: body.bodyHtml,
        variables: body.variables,
        enabled: body.enabled,
      });

      reply.send({ data: template });
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        reply.code(404).send({ error: error.message });
      } else {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  // Delete template
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      
      await templateService.deleteTemplate(id);
      reply.code(204).send();
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        reply.code(404).send({ error: error.message });
      } else {
        reply.code(400).send({ error: error.message });
      }
    }
  });
}

