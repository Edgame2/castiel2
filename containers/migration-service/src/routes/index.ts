/**
 * Route Registration
 * Migration Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { MigrationService } from '../services/MigrationService';
import { MigrationStepService } from '../services/MigrationStepService';
import { MigrationExecutorService } from '../services/MigrationExecutorService';
import {
  CreateMigrationInput,
  UpdateMigrationInput,
  CreateMigrationStepInput,
  ExecuteMigrationInput,
  MigrationType,
  MigrationStatus,
} from '../types/migration.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const migrationService = new MigrationService();
  const stepService = new MigrationStepService(migrationService);
  const executorService = new MigrationExecutorService(migrationService, stepService);

  // ===== MIGRATION ROUTES =====

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
            source: {
              type: 'object',
              properties: {
                version: { type: 'string' },
                stack: { type: 'string' },
                framework: { type: 'string' },
              },
            },
            target: {
              type: 'object',
              properties: {
                version: { type: 'string' },
                stack: { type: 'string' },
                framework: { type: 'string' },
              },
            },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Migration details',
          },
        },
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
            status: { type: 'string', enum: ['draft', 'planned', 'running', 'completed', 'failed', 'rolled_back', 'cancelled'] },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Migration updated successfully',
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Migration deleted successfully',
          },
        },
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
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            status: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of migrations',
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['order', 'name', 'type', 'transformation'],
          properties: {
            order: { type: 'number', minimum: 0 },
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['transform', 'replace', 'refactor', 'update', 'delete', 'create'] },
            transformation: {
              type: 'object',
              properties: {
                pattern: { type: 'string' },
                replacement: { type: 'string' },
                script: { type: 'string' },
                rules: { type: 'array' },
              },
            },
            validation: {
              type: 'object',
              properties: {
                checks: { type: 'array', items: { type: 'string' } },
                required: { type: 'boolean' },
              },
            },
            rollback: {
              type: 'object',
              properties: {
                pattern: { type: 'string' },
                replacement: { type: 'string' },
                script: { type: 'string' },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Migration step created successfully',
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of migration steps',
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Migration step deleted successfully',
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            dryRun: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Migration execution started',
          },
        },
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Migration rolled back successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const migration = await executorService.rollback(request.params.id, tenantId);
      reply.send(migration);
    }
  );
}

