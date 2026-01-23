/**
 * Configuration Routes
 * Per ModuleImplementationGuide Section 7: API Standards
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { log } from '../utils/logger';

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
  
  if (!configService) {
    throw new Error('ConfigurationService not available');
  }

  // Get organization configuration
  app.get('/configuration', {
    schema: {
      description: 'Get organization configuration',
      tags: ['Configuration'],
      summary: 'Get config',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Organization configuration',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      const config = await configService.getOrganizationConfig(user.organizationId);

      reply.send(config);
    } catch (error: any) {
      log.error('Failed to get configuration', error);
      throw error;
    }
  });

  // Update organization configuration
  app.put('/configuration', {
    schema: {
      description: 'Update organization configuration',
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
      const body = updateConfigSchema.parse(request.body);

      const config = await configService.upsertOrganizationConfig(
        user.organizationId,
        body
      );

      reply.send(config);
    } catch (error: any) {
      log.error('Failed to update configuration', error);
      throw error;
    }
  });

  // Delete organization configuration (revert to defaults)
  app.delete('/configuration', {
    schema: {
      description: 'Delete organization configuration (revert to defaults)',
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

      await configService.deleteOrganizationConfig(user.organizationId);

      reply.code(204).send();
    } catch (error: any) {
      log.error('Failed to delete configuration', error);
      throw error;
    }
  });
}

