/**
 * Email Template Routes
 * Route definitions for email template management
 */

import type { FastifyInstance } from 'fastify';
import { EmailTemplateController } from '../controllers/email-template.controller.js';
import { requireAuth, requireSuperAdmin } from '../middleware/authorization.js';

export async function registerEmailTemplateRoutes(server: FastifyInstance): Promise<void> {
  const controller = (server as FastifyInstance & { emailTemplateController?: EmailTemplateController })
    .emailTemplateController;

  if (!controller) {
    server.log.warn('⚠️  Email template routes not registered - controller missing');
    return;
  }

  if (!(server as any).authenticate) {
    server.log.warn('⚠️  Email template routes not registered - authentication decorator missing');
    return;
  }

  // Create template
  server.post(
    '/api/admin/email-templates',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.createTemplate(request as any, reply)
  );

  // List templates
  server.get(
    '/api/admin/email-templates',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.listTemplates(request as any, reply)
  );

  // Get template by ID
  server.get(
    '/api/admin/email-templates/:id',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.getTemplate(request as any, reply)
  );

  // Get template by name and language
  server.get(
    '/api/admin/email-templates/:name/:language',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.getTemplateByLanguage(request as any, reply)
  );

  // Get all language variants
  server.get(
    '/api/admin/email-templates/:name/languages',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.getTemplateLanguages(request as any, reply)
  );

  // Update template
  server.patch(
    '/api/admin/email-templates/:id',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.updateTemplate(request as any, reply)
  );

  // Delete template
  server.delete(
    '/api/admin/email-templates/:id',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.deleteTemplate(request as any, reply)
  );

  // Test template rendering
  server.post(
    '/api/admin/email-templates/:id/test',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.testTemplate(request as any, reply)
  );

  // Update template status
  server.patch(
    '/api/admin/email-templates/:id/status',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.updateTemplateStatus(request as any, reply)
  );

  // Duplicate template to another language
  server.post(
    '/api/admin/email-templates/:id/duplicate',
    {
      onRequest: [
        (server as any).authenticate,
        requireAuth(),
        requireSuperAdmin(),
      ],
    },
    (request, reply) => controller.duplicateTemplate(request as any, reply)
  );

  server.log.info('✅ Email template routes registered');
}







