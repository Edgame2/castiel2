/**
 * Route Registration
 * Configuration Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ConfigurationService } from '../services/ConfigurationService';
import {
  CreateConfigurationSettingInput,
  UpdateConfigurationSettingInput,
  BulkUpdateConfigurationSettingsInput,
  GetConfigurationValueInput,
  ConfigurationScope,
  ConfigurationValueType,
} from '../types/configuration.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const configurationService = new ConfigurationService();

  // ===== CONFIGURATION SETTING ROUTES =====

  /**
   * Create configuration setting
   * POST /api/v1/configuration/settings
   */
  app.post<{ Body: Omit<CreateConfigurationSettingInput, 'tenantId' | 'userId'> }>(
    '/api/v1/configuration/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new configuration setting',
        tags: ['Configuration'],
        body: {
          type: 'object',
          required: ['key', 'value', 'scope'],
          properties: {
            key: { type: 'string', minLength: 1 },
            value: { type: ['string', 'number', 'boolean', 'object', 'array'] },
            valueType: { type: 'string', enum: ['string', 'number', 'boolean', 'json', 'array', 'object'] },
            scope: { type: 'string', enum: ['global', 'organization', 'team', 'project', 'environment'] },
            organizationId: { type: 'string', format: 'uuid' },
            teamId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            environmentId: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
            isSecret: { type: 'boolean' },
            validation: {
              type: 'object',
              properties: {
                required: { type: 'boolean' },
                min: { type: 'number' },
                max: { type: 'number' },
                pattern: { type: 'string' },
                enum: { type: 'array' },
              },
            },
            defaultValue: { type: ['string', 'number', 'boolean', 'object', 'array'] },
            impact: { type: 'string' },
            category: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Configuration setting created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateConfigurationSettingInput = {
        ...request.body,
        tenantId,
        userId,
        valueType: request.body.valueType as any,
        scope: request.body.scope as any,
      };

      const setting = await configurationService.create(input);
      reply.code(201).send(setting);
    }
  );

  /**
   * Get configuration setting by ID
   * GET /api/v1/configuration/settings/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/configuration/settings/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get configuration setting by ID',
        tags: ['Configuration'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Configuration setting details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const setting = await configurationService.getById(request.params.id, tenantId);
      reply.send(setting);
    }
  );

  /**
   * Get configuration value by key
   * GET /api/v1/configuration/values/:key
   */
  app.get<{
    Params: { key: string };
    Querystring: {
      scope?: string;
      organizationId?: string;
      teamId?: string;
      projectId?: string;
      environmentId?: string;
    };
  }>(
    '/api/v1/configuration/values/:key',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get configuration value by key (with fallback hierarchy)',
        tags: ['Configuration'],
        params: {
          type: 'object',
          properties: {
            key: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['global', 'organization', 'team', 'project', 'environment'] },
            organizationId: { type: 'string', format: 'uuid' },
            teamId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            environmentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Configuration value',
            properties: {
              key: { type: 'string' },
              value: { type: ['string', 'number', 'boolean', 'object', 'array'] },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input: GetConfigurationValueInput = {
        tenantId,
        key: request.params.key,
        scope: request.query.scope as any,
        organizationId: request.query.organizationId,
        teamId: request.query.teamId,
        projectId: request.query.projectId,
        environmentId: request.query.environmentId,
      };

      const value = await configurationService.getValue(input);
      reply.send({ key: request.params.key, value });
    }
  );

  /**
   * Update configuration setting
   * PUT /api/v1/configuration/settings/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateConfigurationSettingInput }>(
    '/api/v1/configuration/settings/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update configuration setting',
        tags: ['Configuration'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            value: { type: ['string', 'number', 'boolean', 'object', 'array'] },
            valueType: { type: 'string', enum: ['string', 'number', 'boolean', 'json', 'array', 'object'] },
            description: { type: 'string' },
            isSecret: { type: 'boolean' },
            validation: {
              type: 'object',
              properties: {
                required: { type: 'boolean' },
                min: { type: 'number' },
                max: { type: 'number' },
                pattern: { type: 'string' },
                enum: { type: 'array' },
              },
            },
            defaultValue: { type: ['string', 'number', 'boolean', 'object', 'array'] },
            impact: { type: 'string' },
            category: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Configuration setting updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const setting = await configurationService.update(
        request.params.id,
        tenantId,
        userId,
        request.body
      );
      reply.send(setting);
    }
  );

  /**
   * Delete configuration setting
   * DELETE /api/v1/configuration/settings/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/configuration/settings/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete configuration setting',
        tags: ['Configuration'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Configuration setting deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await configurationService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List configuration settings
   * GET /api/v1/configuration/settings
   */
  app.get<{
    Querystring: {
      scope?: string;
      organizationId?: string;
      teamId?: string;
      projectId?: string;
      environmentId?: string;
      category?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/configuration/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List configuration settings',
        tags: ['Configuration'],
        querystring: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['global', 'organization', 'team', 'project', 'environment'] },
            organizationId: { type: 'string', format: 'uuid' },
            teamId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            environmentId: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of configuration settings',
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
      const result = await configurationService.list(tenantId, {
        scope: request.query.scope as any,
        organizationId: request.query.organizationId,
        teamId: request.query.teamId,
        projectId: request.query.projectId,
        environmentId: request.query.environmentId,
        category: request.query.category,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Bulk update configuration settings
   * POST /api/v1/configuration/settings/bulk
   */
  app.post<{ Body: Omit<BulkUpdateConfigurationSettingsInput, 'tenantId' | 'userId'> }>(
    '/api/v1/configuration/settings/bulk',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Bulk update configuration settings',
        tags: ['Configuration'],
        body: {
          type: 'object',
          required: ['settings'],
          properties: {
            settings: {
              type: 'array',
              items: {
                type: 'object',
                required: ['key', 'value'],
                properties: {
                  key: { type: 'string', minLength: 1 },
                  value: { type: ['string', 'number', 'boolean', 'object', 'array'] },
                  scope: { type: 'string', enum: ['global', 'organization', 'team', 'project', 'environment'] },
                  organizationId: { type: 'string', format: 'uuid' },
                  teamId: { type: 'string', format: 'uuid' },
                  projectId: { type: 'string', format: 'uuid' },
                  environmentId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'Updated configuration settings',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: BulkUpdateConfigurationSettingsInput = {
        tenantId,
        userId,
        settings: request.body.settings,
      };

      const results = await configurationService.bulkUpdate(input);
      reply.send(results);
    }
  );
}
