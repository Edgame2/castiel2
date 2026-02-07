/**
 * Route registration for utility_services module
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { UtilityService } from '../services/UtilityService';
import { NotificationService } from '../services/NotificationService';
import { PreferenceService } from '../services/PreferenceService';
import { TemplateService } from '../services/TemplateService';
import { PreferenceScope, NotificationChannel } from '../types/notification';

/**
 * Register all routes
 */
export async function registerRoutes(fastify: FastifyInstance, config: ReturnType<typeof loadConfig>): Promise<void> {
  try {
    const utilityService = new UtilityService();
    const notificationService = new NotificationService();
    const preferenceService = new PreferenceService();
    const templateService = new TemplateService();

    // Get job status
    fastify.get<{ Params: { jobId: string }; Querystring: { jobType: 'import' | 'export' } }>(
      '/api/v1/utility/jobs/:jobId',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get utility job status',
          tags: ['Utility'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { jobId } = request.params;
          const { jobType } = request.query;
          const tenantId = (request as any).user!.tenantId;

          const job = await utilityService.getJobStatus(jobId, tenantId, jobType);

          if (!job) {
            return reply.status(404).send({
              error: {
                code: 'JOB_NOT_FOUND',
                message: 'Job not found',
              },
            });
          }

          return reply.send(job);
        } catch (error: any) {
          log.error('Failed to get job status', error, { service: 'utility-services' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'JOB_RETRIEVAL_FAILED',
              message: error.message || 'Failed to retrieve job status',
            },
          });
        }
      }
    );

    // Create import job
    fastify.post<{ Body: { importType: string; data: any } }>(
      '/api/v1/utility/import',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create import job',
          tags: ['Utility'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { importType, data } = request.body;
          const tenantId = (request as any).user!.tenantId;

          const job = await utilityService.createImportJob(tenantId, importType, data);

          return reply.status(202).send(job);
        } catch (error: any) {
          log.error('Failed to create import job', error, { service: 'utility-services' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'IMPORT_JOB_FAILED',
              message: error.message || 'Failed to create import job',
            },
          });
        }
      }
    );

    // Create export job
    fastify.post<{ Body: { exportType: string; filters?: any } }>(
      '/api/v1/utility/export',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create export job',
          tags: ['Utility'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { exportType, filters } = request.body;
          const tenantId = (request as any).user!.tenantId;

          const job = await utilityService.createExportJob(tenantId, exportType, filters);

          return reply.status(202).send(job);
        } catch (error: any) {
          log.error('Failed to create export job', error, { service: 'utility-services' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'EXPORT_JOB_FAILED',
              message: error.message || 'Failed to create export job',
            },
          });
        }
      }
    );

    // ===== NOTIFICATION ROUTES (from notification-manager) =====

    // Get notifications
    fastify.get<{ Querystring: { userId?: string; organizationId?: string; read?: string; limit?: string; offset?: string } }>(
      '/api/v1/notifications',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get notifications',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;
          const query = request.query as any;
          
          const notifications = await notificationService.getNotifications({
            userId: query.userId || user.id,
            organizationId: query.organizationId || user.organizationId,
            read: query.read === 'true' ? true : query.read === 'false' ? false : undefined,
            limit: query.limit ? parseInt(query.limit, 10) : 50,
            offset: query.offset ? parseInt(query.offset, 10) : 0,
          });

          return reply.send(notifications);
        } catch (error: any) {
          log.error('Failed to get notifications', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Mark notification as read
    fastify.put<{ Params: { id: string } }>(
      '/api/v1/notifications/:id/read',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Mark notification as read',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const user = (request as any).user;
          
          await notificationService.markAsRead(id, user.id);
          return reply.send({ success: true });
        } catch (error: any) {
          log.error('Failed to mark notification as read', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Mark all notifications as read
    fastify.put<{ Querystring: { organizationId?: string } }>(
      '/api/v1/notifications/read-all',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Mark all notifications as read',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;
          const query = request.query as any;
          
          await notificationService.markAllAsRead({
            userId: user.id,
            organizationId: query.organizationId || user.organizationId,
          });
          return reply.send({ success: true });
        } catch (error: any) {
          log.error('Failed to mark all notifications as read', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Delete notification
    fastify.delete<{ Params: { id: string } }>(
      '/api/v1/notifications/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete notification',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const user = (request as any).user;
          
          await notificationService.deleteNotification(id, user.id);
          return reply.code(204).send();
        } catch (error: any) {
          log.error('Failed to delete notification', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // ===== PREFERENCE ROUTES (from notification-manager) =====

    // Get effective preferences
    fastify.get<{ Querystring: { scope?: string; scopeId?: string } }>(
      '/api/v1/preferences',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get effective preferences',
          tags: ['Preferences'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;
          const query = request.query as any;
          
          const scope = (query.scope || 'USER') as PreferenceScope;
          const scopeId = query.scopeId || (scope === 'USER' ? user.id : undefined);
          
          if (!scopeId && scope !== 'GLOBAL') {
            return reply.status(400).send({ 
              error: 'scopeId is required for non-GLOBAL scopes' 
            });
          }

          const preferences = await preferenceService.getEffectivePreferences(
            scope,
            scopeId || '',
            user.organizationId
          );

          return reply.send({ data: preferences });
        } catch (error: any) {
          log.error('Failed to get preferences', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Get preference by scope
    fastify.get<{ Params: { scope: string; scopeId?: string } }>(
      '/api/v1/preferences/:scope/:scopeId?',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get preference by scope',
          tags: ['Preferences'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;
          const { scope, scopeId } = request.params;
          
          const effectiveScopeId = scopeId || (scope === 'USER' ? user.id : scopeId);
          
          const preferences = await preferenceService.getEffectivePreferences(
            scope as PreferenceScope,
            effectiveScopeId || '',
            user.organizationId
          );

          return reply.send({ data: preferences });
        } catch (error: any) {
          log.error('Failed to get preference by scope', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Create or update preference
    fastify.put<{ Params: { scope: string; scopeId?: string }; Body: any }>(
      '/api/v1/preferences/:scope/:scopeId?',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create or update preference',
          tags: ['Preferences'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;
          const { scope, scopeId } = request.params;
          const body = request.body as any;
          
          const effectiveScopeId = scopeId || (scope === 'USER' ? user.id : scopeId);
          
          const preference = await preferenceService.upsertPreference({
            scope: scope as PreferenceScope,
            scopeId: effectiveScopeId,
            organizationId: user.organizationId,
            channels: body.channels,
            categories: body.categories,
            quietHoursStart: body.quietHoursStart,
            quietHoursEnd: body.quietHoursEnd,
            timezone: body.timezone,
          });

          return reply.send({ data: preference });
        } catch (error: any) {
          log.error('Failed to upsert preference', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Delete preference
    fastify.delete<{ Params: { scope: string; scopeId?: string } }>(
      '/api/v1/preferences/:scope/:scopeId?',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete preference',
          tags: ['Preferences'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;
          const { scope, scopeId } = request.params;
          
          const preferences = await preferenceService.listPreferences(
            user.organizationId,
            scope as PreferenceScope
          );
          
          const effectiveScopeId = scopeId || (scope === 'USER' ? user.id : scopeId);
          const preference = preferences.find(p => 
            p.scope === scope && 
            (p.scopeId === effectiveScopeId || (scope === 'GLOBAL' && !p.scopeId))
          );

          if (preference) {
            await preferenceService.deletePreference(preference.id);
          }

          return reply.code(204).send();
        } catch (error: any) {
          log.error('Failed to delete preference', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // List all preferences
    fastify.get<{ Querystring: { scope?: string } }>(
      '/api/v1/preferences/list/all',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List all preferences for organization',
          tags: ['Preferences'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const user = (request as any).user;
          const query = request.query as any;
          
          const preferences = await preferenceService.listPreferences(
            user.organizationId,
            query.scope as PreferenceScope | undefined
          );

          return reply.send({ data: preferences });
        } catch (error: any) {
          log.error('Failed to list preferences', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // ===== TEMPLATE ROUTES (from notification-manager) =====

    // List templates
    fastify.get<{ Querystring: { organizationId?: string; eventType?: string; channel?: string; locale?: string; enabled?: string } }>(
      '/api/v1/templates',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'List templates',
          tags: ['Templates'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
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

          return reply.send({ data: templates });
        } catch (error: any) {
          log.error('Failed to list templates', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Get template by ID
    fastify.get<{ Params: { id: string } }>(
      '/api/v1/templates/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Get template by ID',
          tags: ['Templates'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          
          const template = await templateService.getTemplate(id);
          return reply.send({ data: template });
        } catch (error: any) {
          if (error.code === 'NOT_FOUND') {
            return reply.status(404).send({ error: error.message });
          }
          log.error('Failed to get template', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Create template
    fastify.post<{ Body: any }>(
      '/api/v1/templates',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Create template',
          tags: ['Templates'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
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

          return reply.code(201).send({ data: template });
        } catch (error: any) {
          log.error('Failed to create template', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Update template
    fastify.put<{ Params: { id: string }; Body: any }>(
      '/api/v1/templates/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Update template',
          tags: ['Templates'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          const body = request.body as any;
          
          const template = await templateService.updateTemplate(id, {
            name: body.name,
            subject: body.subject,
            body: body.body,
            bodyHtml: body.bodyHtml,
            variables: body.variables,
            enabled: body.enabled,
          });

          return reply.send({ data: template });
        } catch (error: any) {
          if (error.code === 'NOT_FOUND') {
            return reply.status(404).send({ error: error.message });
          }
          log.error('Failed to update template', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // Delete template
    fastify.delete<{ Params: { id: string } }>(
      '/api/v1/templates/:id',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Delete template',
          tags: ['Templates'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const { id } = request.params;
          
          await templateService.deleteTemplate(id);
          return reply.code(204).send();
        } catch (error: any) {
          if (error.code === 'NOT_FOUND') {
            return reply.status(404).send({ error: error.message });
          }
          log.error('Failed to delete template', error, { service: 'utility-services' });
          return reply.status(400).send({ error: error.message });
        }
      }
    );

    // ===== METRICS ROUTES (from notification-manager) =====

    // Metrics endpoint (no auth required for Prometheus)
    fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // TODO: Get metrics from MetricsCollector when integrated
        const metrics = `# Utility Services Metrics
# HELP notifications_sent_total Total notifications sent
# TYPE notifications_sent_total counter
notifications_sent_total{channel="email",status="delivered"} 0
notifications_sent_total{channel="email",status="failed"} 0
notifications_sent_total{channel="inapp",status="delivered"} 0
notifications_sent_total{channel="push",status="delivered"} 0

# HELP notification_duration_seconds Notification processing duration
# TYPE notification_duration_seconds histogram
notification_duration_seconds_sum{channel="email"} 0
notification_duration_seconds_count{channel="email"} 0
`;

        return reply.type('text/plain').send(metrics);
      } catch (error: any) {
        log.error('Failed to get metrics', error, { service: 'utility-services' });
        return reply.status(500).send({ error: error.message });
      }
    });

    log.info('Utility services routes registered', { service: 'utility-services' });
  } catch (error) {
    log.error('Failed to register routes', error, { service: 'utility-services' });
    throw error;
  }
}
