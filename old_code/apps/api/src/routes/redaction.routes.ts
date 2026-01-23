/**
 * Redaction Configuration Routes (Phase 2)
 * 
 * Provides REST endpoints for configuring PII redaction policies:
 * - GET /api/v1/redaction/config - Get redaction configuration
 * - PUT /api/v1/redaction/config - Configure redaction
 * - DELETE /api/v1/redaction/config - Disable redaction
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

interface RedactionConfigRequest {
  fields: string[];
  redactionValue?: string;
}

/**
 * Register Redaction Configuration routes
 */
export async function registerRedactionRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider
): Promise<void> {
  // Get RedactionService from server decoration
  const redactionService = (server as any).redactionService;

  if (!redactionService) {
    server.log.warn('⚠️  Redaction routes not registered - RedactionService missing');
    server.log.info('  ℹ️  RedactionService is a Phase 2 feature and may not be initialized if Phase 2 services failed to start');
    server.log.info('  ℹ️  This is normal if Cosmos DB is not configured or if there was an error during Phase 2 service initialization');
    return;
  }

  /**
   * GET /api/v1/redaction/config
   * Get redaction configuration for current tenant
   */
  (server.get as any)(
    '/api/v1/redaction/config',
    {
      onRequest: [requireAuth()] as any,
      schema: {
        description: 'Get redaction configuration for current tenant',
        tags: ['redaction'],
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              fields: { type: 'array', items: { type: 'string' } },
              redactionValue: { type: 'string' },
              updatedAt: { type: 'string', format: 'date-time' },
              updatedBy: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user?.tenantId;
        if (!tenantId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant context' });
        }

        const config = redactionService.getRedactionConfig(tenantId);

        if (!config) {
          return reply.status(200).send({
            enabled: false,
            fields: [],
            redactionValue: '[REDACTED]',
            updatedAt: null,
            updatedBy: null,
          });
        }

        return reply.status(200).send({
          enabled: config.enabled,
          fields: config.fields,
          redactionValue: config.redactionValue,
          updatedAt: config.updatedAt.toISOString(),
          updatedBy: config.updatedBy,
        });
      } catch (error: unknown) {
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'RedactionRoutes',
            operation: 'get-config',
            tenantId: request.user?.tenantId,
          }
        );
        return reply.status(500).send({ error: 'Failed to get redaction configuration' });
      }
    }
  );

  /**
   * PUT /api/v1/redaction/config
   * Configure redaction for current tenant (requires tenant-admin role)
   */
  server.put(
    '/api/v1/redaction/config',
    {
      onRequest: [requireAuth(), requireRole('tenant-admin', 'super-admin')] as any,
      schema: {
        description: 'Configure redaction for current tenant',
        tags: ['redaction'],
        body: {
          type: 'object',
          required: ['fields'],
          properties: {
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Field paths to redact (e.g., ["structuredData.email", "structuredData.phone"])',
            },
            redactionValue: {
              type: 'string',
              default: '[REDACTED]',
              description: 'Value to use for redacted fields',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RedactionConfigRequest }>, reply: FastifyReply) => {
      try {
        const tenantId = (request as AuthenticatedRequest).user?.tenantId;
        const userId = (request as AuthenticatedRequest).user?.id;

        if (!tenantId || !userId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        const { fields, redactionValue = '[REDACTED]' } = request.body;

        // Validate fields array
        if (!Array.isArray(fields)) {
          return reply.status(400).send({ error: 'Fields must be an array of strings' });
        }

        // Validate field paths (basic validation)
        for (const field of fields) {
          if (typeof field !== 'string' || field.trim().length === 0) {
            return reply.status(400).send({ error: 'All field paths must be non-empty strings' });
          }
        }

        await redactionService.configureRedaction(
          tenantId,
          fields,
          redactionValue,
          userId
        );

        monitoring.trackEvent('redaction.config-updated-via-api', {
          tenantId,
          userId,
          fieldCount: fields.length,
        });

        return reply.status(200).send({
          success: true,
          message: 'Redaction configuration updated successfully',
        });
      } catch (error: unknown) {
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'RedactionRoutes',
            operation: 'configure',
            tenantId: (request as AuthenticatedRequest).user?.tenantId,
          }
        );
        return reply.status(500).send({ error: 'Failed to configure redaction' });
      }
    }
  );

  /**
   * DELETE /api/v1/redaction/config
   * Disable redaction for current tenant (requires tenant-admin role)
   */
  (server.delete as any)(
    '/api/v1/redaction/config',
    {
      onRequest: [requireAuth(), requireRole('tenant-admin', 'super-admin')] as any,
      schema: {
        description: 'Disable redaction for current tenant',
        tags: ['redaction'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user?.tenantId;
        const userId = request.user?.id;

        if (!tenantId || !userId) {
          return reply.status(401).send({ error: 'Unauthorized: Missing tenant or user context' });
        }

        // Disable redaction by setting empty fields array
        await redactionService.configureRedaction(
          tenantId,
          [],
          '[REDACTED]',
          userId
        );

        monitoring.trackEvent('redaction.config-disabled-via-api', {
          tenantId,
          userId,
        });

        return reply.status(200).send({
          success: true,
          message: 'Redaction disabled successfully',
        });
      } catch (error: unknown) {
        monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'RedactionRoutes',
            operation: 'disable',
            tenantId: request.user?.tenantId,
          }
        );
        return reply.status(500).send({ error: 'Failed to disable redaction' });
      }
    }
  );

  server.log.info('✅ Redaction configuration routes registered');
}




