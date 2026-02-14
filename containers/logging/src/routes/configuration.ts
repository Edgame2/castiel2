/**
 * Configuration Routes
 * Per ModuleImplementationGuide Section 7: API Standards
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { log } from '../utils/logger';
import { getConfig } from '../config';

const updateConfigSchema = z.object({
  captureIpAddress: z.boolean().optional(),
  captureUserAgent: z.boolean().optional(),
  captureGeolocation: z.boolean().optional(),
  redactSensitiveData: z.boolean().optional(),
  redactionPatterns: z.array(z.string()).optional(),
  hashChainEnabled: z.boolean().optional(),
  alertsEnabled: z.boolean().optional(),
});

export async function registerConfigurationRoutes(app: FastifyInstance): Promise<void> {
  const configService = (app as any).configService;

  // Get data collection config (view-only; edits remain in YAML/env). Plan §1.6, §2.9.
  app.get('/config/data-collection', {
    schema: {
      description: 'Get data collection config (view-only). Controls what events are stored in audit log.',
      tags: ['Configuration'],
      summary: 'Get data collection config',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Filter by event_type or resource_type (client-side filter hint)' },
        },
      },
      response: {
        200: {
          description: 'Data collection section from config',
          type: 'object',
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const config = getConfig();
      const dataCollection = config.data_collection ?? null;
      return reply.send(dataCollection);
    } catch (error: any) {
      log.error('Failed to get data collection config', error);
      throw error;
    }
  });

  if (!configService) {
    throw new Error('ConfigurationService not available');
  }

  app.get('/configuration', {
    schema: {
      description: 'Get tenant configuration',
      tags: ['Configuration'],
      summary: 'Get config',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Tenant audit configuration',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;

      const config = await configService.getOrganizationConfig(tenantId);

      reply.send(config);
    } catch (error: any) {
      log.error('Failed to get configuration', error);
      throw error;
    }
  });

  app.put('/configuration', {
    schema: {
      description: 'Update tenant configuration',
      tags: ['Configuration'],
      summary: 'Update config',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          captureIpAddress: { type: 'boolean' },
          captureUserAgent: { type: 'boolean' },
          captureGeolocation: { type: 'boolean' },
          redactSensitiveData: { type: 'boolean' },
          redactionPatterns: { type: 'array', items: { type: 'string' } },
          hashChainEnabled: { type: 'boolean' },
          alertsEnabled: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Configuration updated',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;
      const body = updateConfigSchema.parse(request.body);

      const config = await configService.upsertOrganizationConfig(
        tenantId,
        body
      );

      reply.send(config);
    } catch (error: any) {
      log.error('Failed to update configuration', error);
      throw error;
    }
  });

  app.delete('/configuration', {
    schema: {
      description: 'Delete tenant configuration (revert to defaults)',
      tags: ['Configuration'],
      summary: 'Delete config',
      security: [{ bearerAuth: [] }],
      response: {
        204: {
          description: 'Configuration deleted',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenantId = user.tenantId;

      await configService.deleteOrganizationConfig(tenantId);

      reply.code(204).send();
    } catch (error: any) {
      log.error('Failed to delete configuration', error);
      throw error;
    }
  });
}

