/**
 * Route Registration
 * Validation Engine routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ValidationRuleService } from '../services/ValidationRuleService';
import { ValidationService } from '../services/ValidationService';
import {
  CreateValidationRuleInput,
  UpdateValidationRuleInput,
  RunValidationInput,
  ValidationType,
  ValidationSeverity,
  ValidationStatus,
} from '../types/validation.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const ruleService = new ValidationRuleService();
  const validationService = new ValidationService(ruleService);

  // ===== VALIDATION RULE ROUTES =====

  /**
   * Create validation rule
   * POST /api/v1/validation/rules
   */
  app.post<{ Body: Omit<CreateValidationRuleInput, 'tenantId' | 'userId'> }>(
    '/api/v1/validation/rules',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new validation rule',
        tags: ['Validation Rules'],
        body: {
          type: 'object',
          required: ['name', 'type', 'severity', 'ruleDefinition'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['syntax', 'semantic', 'architecture', 'security', 'performance', 'consistency', 'standards', 'policy', 'custom'] },
            severity: { type: 'string', enum: ['error', 'warning', 'info'] },
            enabled: { type: 'boolean' },
            ruleDefinition: {
              type: 'object',
              properties: {
                language: { type: 'string' },
                pattern: { type: 'string' },
                condition: { type: 'string' },
                check: { type: 'string' },
              },
            },
            scope: {
              type: 'object',
              properties: {
                filePatterns: { type: 'array', items: { type: 'string' } },
                excludePatterns: { type: 'array', items: { type: 'string' } },
                paths: { type: 'array', items: { type: 'string' } },
              },
            },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Validation rule created successfully',
            properties: {
              id: { type: 'string' },
              tenantId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              severity: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateValidationRuleInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
        severity: request.body.severity as any,
      };

      const rule = await ruleService.create(input);
      reply.code(201).send(rule);
    }
  );

  /**
   * Get rule by ID
   * GET /api/v1/validation/rules/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/validation/rules/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get validation rule by ID',
        tags: ['Validation Rules'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Validation rule details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const rule = await ruleService.getById(request.params.id, tenantId);
      reply.send(rule);
    }
  );

  /**
   * Update rule
   * PUT /api/v1/validation/rules/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateValidationRuleInput }>(
    '/api/v1/validation/rules/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update validation rule',
        tags: ['Validation Rules'],
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
            severity: { type: 'string', enum: ['error', 'warning', 'info'] },
            enabled: { type: 'boolean' },
            ruleDefinition: { type: 'object' },
            scope: { type: 'object' },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Validation rule updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const rule = await ruleService.update(request.params.id, tenantId, request.body);
      reply.send(rule);
    }
  );

  /**
   * Delete rule
   * DELETE /api/v1/validation/rules/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/validation/rules/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete validation rule',
        tags: ['Validation Rules'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Validation rule deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await ruleService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List rules
   * GET /api/v1/validation/rules
   */
  app.get<{
    Querystring: {
      type?: string;
      severity?: string;
      enabled?: boolean;
      language?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/validation/rules',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List validation rules',
        tags: ['Validation Rules'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            severity: { type: 'string' },
            enabled: { type: 'boolean' },
            language: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of validation rules',
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
      const result = await ruleService.list(tenantId, {
        type: request.query.type as any,
        severity: request.query.severity as any,
        enabled: request.query.enabled,
        language: request.query.language,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== VALIDATION RUN ROUTES =====

  /**
   * Run validation
   * POST /api/v1/validation/run
   */
  app.post<{ Body: Omit<RunValidationInput, 'tenantId' | 'userId'> }>(
    '/api/v1/validation/run',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Run validation on target',
        tags: ['Validation'],
        body: {
          type: 'object',
          required: ['target'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            target: {
              type: 'object',
              required: ['type', 'path'],
              properties: {
                type: { type: 'string', enum: ['file', 'directory', 'module', 'project'] },
                path: { type: 'string' },
                language: { type: 'string' },
              },
            },
            validationTypes: { type: 'array', items: { type: 'string' } },
            rules: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Validation run started',
            properties: {
              id: { type: 'string' },
              tenantId: { type: 'string' },
              status: { type: 'string' },
              target: { type: 'object' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: RunValidationInput = {
        ...request.body,
        tenantId,
        userId,
        target: {
          ...request.body.target,
          type: request.body.target.type as any,
        },
        validationTypes: request.body.validationTypes as any,
      };

      const validationRun = await validationService.runValidation(input);
      reply.code(201).send(validationRun);
    }
  );

  /**
   * Get validation run by ID
   * GET /api/v1/validation/runs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/validation/runs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get validation run by ID',
        tags: ['Validation'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Validation run details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const validationRun = await validationService.getById(request.params.id, tenantId);
      reply.send(validationRun);
    }
  );

  /**
   * Get validation results
   * GET /api/v1/validation/runs/:id/results
   */
  app.get<{
    Params: { id: string };
    Querystring: {
      status?: string;
      severity?: string;
      limit?: number;
    };
  }>(
    '/api/v1/validation/runs/:id/results',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get validation results for a run',
        tags: ['Validation'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
            severity: { type: 'string', enum: ['error', 'warning', 'info'] },
            limit: { type: 'number', minimum: 1, maximum: 10000, default: 1000 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of validation results',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const results = await validationService.getResults(request.params.id, tenantId, {
        status: request.query.status as any,
        severity: request.query.severity as any,
        limit: request.query.limit,
      });
      reply.send(results);
    }
  );

  /**
   * List validation runs
   * GET /api/v1/validation/runs
   */
  app.get<{
    Querystring: {
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/validation/runs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List validation runs',
        tags: ['Validation'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of validation runs',
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
      const result = await validationService.list(tenantId, {
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

