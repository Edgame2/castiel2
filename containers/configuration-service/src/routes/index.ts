/**
 * Route Registration
 * Configuration Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ConfigurationService } from '../services/ConfigurationService';
import { MigrationService } from '../services/MigrationService';
import { MigrationStepService } from '../services/MigrationStepService';
import { MigrationExecutorService } from '../services/MigrationExecutorService';
import {
  CreateConfigurationSettingInput,
  UpdateConfigurationSettingInput,
  BulkUpdateConfigurationSettingsInput,
  GetConfigurationValueInput,
  ConfigurationScope,
  ConfigurationValueType,
} from '../types/configuration.types';
import {
  CreateMigrationInput,
  UpdateMigrationInput,
  CreateMigrationStepInput,
  ExecuteMigrationInput,
  MigrationType,
  MigrationStatus,
} from '../types/migration.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const configurationService = new ConfigurationService();
  const migrationService = new MigrationService();
  const stepService = new MigrationStepService(migrationService);
  const executorService = new MigrationExecutorService(migrationService, stepService);

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

  // ===== MIGRATION ROUTES (from migration-service) =====

  /**
   * Create migration
   * POST /api/v1/migration/migrations
   */
  app.post<{ Body: Omit<CreateMigrationInput, 'tenantId' | 'userId'> }>(
    '/api/v1/migration/migrations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new migration',
        tags: ['Migrations'],
        body: {
          type: 'object',
          required: ['name', 'type', 'scope'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['version_upgrade', 'breaking_change', 'large_scale_refactoring', 'tech_stack', 'database', 'api', 'dependency', 'custom'] },
            source: { type: 'object' },
            target: { type: 'object' },
            scope: {
              type: 'object',
              required: ['type', 'paths'],
              properties: {
                type: { type: 'string', enum: ['file', 'directory', 'module', 'project'] },
                paths: { type: 'array', items: { type: 'string' }, minItems: 1 },
              },
            },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Migration created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateMigrationInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
        scope: {
          ...request.body.scope,
          type: request.body.scope.type as any,
        },
      };

      const migration = await migrationService.create(input);
      reply.code(201).send(migration);
    }
  );

  /**
   * Get migration by ID
   * GET /api/v1/migration/migrations/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/migration/migrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get migration by ID',
        tags: ['Migrations'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const migration = await migrationService.getById(request.params.id, tenantId);
      reply.send(migration);
    }
  );

  /**
   * Update migration
   * PUT /api/v1/migration/migrations/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateMigrationInput }>(
    '/api/v1/migration/migrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update migration',
        tags: ['Migrations'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const migration = await migrationService.update(request.params.id, tenantId, request.body);
      reply.send(migration);
    }
  );

  /**
   * Delete migration
   * DELETE /api/v1/migration/migrations/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/migration/migrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete migration',
        tags: ['Migrations'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await migrationService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List migrations
   * GET /api/v1/migration/migrations
   */
  app.get<{
    Querystring: {
      type?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/migration/migrations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List migrations',
        tags: ['Migrations'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await migrationService.list(tenantId, {
        type: request.query.type as any,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== MIGRATION STEP ROUTES =====

  /**
   * Create migration step
   * POST /api/v1/migration/migrations/:id/steps
   */
  app.post<{ Params: { id: string }; Body: Omit<CreateMigrationStepInput, 'tenantId' | 'userId' | 'migrationId'> }>(
    '/api/v1/migration/migrations/:id/steps',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a migration step',
        tags: ['Migration Steps'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateMigrationStepInput = {
        ...request.body,
        tenantId,
        userId,
        migrationId: request.params.id,
        type: request.body.type as any,
      };

      const step = await stepService.create(input);
      reply.code(201).send(step);
    }
  );

  /**
   * Get migration steps
   * GET /api/v1/migration/migrations/:id/steps
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/migration/migrations/:id/steps',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get migration steps',
        tags: ['Migration Steps'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const steps = await stepService.getByMigrationId(request.params.id, tenantId);
      reply.send(steps);
    }
  );

  /**
   * Delete migration step
   * DELETE /api/v1/migration/steps/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/migration/steps/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete migration step',
        tags: ['Migration Steps'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await stepService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  // ===== MIGRATION EXECUTION ROUTES =====

  /**
   * Execute migration
   * POST /api/v1/migration/migrations/:id/execute
   */
  app.post<{ Params: { id: string }; Body: { dryRun?: boolean } }>(
    '/api/v1/migration/migrations/:id/execute',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Execute migration',
        tags: ['Migration Execution'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: ExecuteMigrationInput = {
        tenantId,
        userId,
        migrationId: request.params.id,
        dryRun: request.body.dryRun,
      };

      const migration = await executorService.execute(input);
      reply.send(migration);
    }
  );

  /**
   * Rollback migration
   * POST /api/v1/migration/migrations/:id/rollback
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/migration/migrations/:id/rollback',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Rollback migration',
        tags: ['Migration Execution'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const migration = await executorService.rollback(request.params.id, tenantId);
      reply.send(migration);
    }
  );
}
