/**
 * Route Registration
 * Pattern Recognition routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { PatternService } from '../services/PatternService';
import { PatternMatcherService } from '../services/PatternMatcherService';
import {
  CreatePatternInput,
  UpdatePatternInput,
  ScanPatternsInput,
  PatternType,
  PatternCategory,
  PatternMatchSeverity,
} from '../types/pattern.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const patternService = new PatternService();
  const matcherService = new PatternMatcherService(patternService);

  // ===== PATTERN ROUTES =====

  /**
   * Create pattern
   * POST /api/v1/patterns
   */
  app.post<{ Body: Omit<CreatePatternInput, 'tenantId' | 'userId'> }>(
    '/api/v1/patterns',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new pattern',
        tags: ['Patterns'],
        body: {
          type: 'object',
          required: ['name', 'type', 'patternDefinition'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['design_pattern', 'anti_pattern', 'code_style', 'architecture', 'naming_convention', 'structure', 'custom'] },
            category: { type: 'string', enum: ['creational', 'structural', 'behavioral', 'concurrency', 'performance', 'security', 'style'] },
            language: { type: 'string' },
            patternDefinition: {
              type: 'object',
              properties: {
                ast: { type: 'object' },
                regex: { type: 'string' },
                structure: { type: 'object' },
                examples: { type: 'array', items: { type: 'string' } },
                antiExamples: { type: 'array', items: { type: 'string' } },
              },
            },
            metadata: { type: 'object' },
            enforcement: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Pattern created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreatePatternInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
        category: request.body.category as any,
      };

      const pattern = await patternService.create(input);
      reply.code(201).send(pattern);
    }
  );

  /**
   * Get pattern by ID
   * GET /api/v1/patterns/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/patterns/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get pattern by ID',
        tags: ['Patterns'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Pattern details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const pattern = await patternService.getById(request.params.id, tenantId);
      reply.send(pattern);
    }
  );

  /**
   * Update pattern
   * PUT /api/v1/patterns/:id
   */
  app.put<{ Params: { id: string }; Body: UpdatePatternInput }>(
    '/api/v1/patterns/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update pattern',
        tags: ['Patterns'],
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
            category: { type: 'string' },
            patternDefinition: { type: 'object' },
            metadata: { type: 'object' },
            enforcement: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Pattern updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const pattern = await patternService.update(request.params.id, tenantId, request.body);
      reply.send(pattern);
    }
  );

  /**
   * Delete pattern
   * DELETE /api/v1/patterns/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/patterns/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete pattern',
        tags: ['Patterns'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Pattern deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await patternService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List patterns
   * GET /api/v1/patterns
   */
  app.get<{
    Querystring: {
      type?: string;
      category?: string;
      language?: string;
      enabled?: boolean;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/patterns',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List patterns',
        tags: ['Patterns'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            category: { type: 'string' },
            language: { type: 'string' },
            enabled: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of patterns',
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
      const result = await patternService.list(tenantId, {
        type: request.query.type as any,
        category: request.query.category as any,
        language: request.query.language,
        enabled: request.query.enabled,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== PATTERN SCAN ROUTES =====

  /**
   * Scan for patterns
   * POST /api/v1/patterns/scan
   */
  app.post<{ Body: Omit<ScanPatternsInput, 'tenantId' | 'userId'> }>(
    '/api/v1/patterns/scan',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Scan codebase for patterns',
        tags: ['Pattern Scanning'],
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
            patterns: { type: 'array', items: { type: 'string', format: 'uuid' } },
            patternTypes: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Pattern scan started',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: ScanPatternsInput = {
        ...request.body,
        tenantId,
        userId,
        target: {
          ...request.body.target,
          type: request.body.target.type as any,
        },
        patternTypes: request.body.patternTypes as any,
      };

      const scan = await matcherService.scanPatterns(input);
      reply.code(201).send(scan);
    }
  );

  /**
   * Get scan by ID
   * GET /api/v1/patterns/scans/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/patterns/scans/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get pattern scan by ID',
        tags: ['Pattern Scanning'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Pattern scan details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const scan = await matcherService.getById(request.params.id, tenantId);
      reply.send(scan);
    }
  );

  /**
   * Get pattern matches
   * GET /api/v1/patterns/scans/:id/matches
   */
  app.get<{
    Params: { id: string };
    Querystring: {
      isAntiPattern?: boolean;
      severity?: string;
      patternType?: string;
      limit?: number;
    };
  }>(
    '/api/v1/patterns/scans/:id/matches',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get pattern matches for a scan',
        tags: ['Pattern Scanning'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            isAntiPattern: { type: 'boolean' },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            patternType: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 10000, default: 1000 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of pattern matches',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const matches = await matcherService.getMatches(request.params.id, tenantId, {
        isAntiPattern: request.query.isAntiPattern,
        severity: request.query.severity as any,
        patternType: request.query.patternType as any,
        limit: request.query.limit,
      });
      reply.send(matches);
    }
  );

  /**
   * List scans
   * GET /api/v1/patterns/scans
   */
  app.get<{
    Querystring: {
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/patterns/scans',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List pattern scans',
        tags: ['Pattern Scanning'],
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
            description: 'List of pattern scans',
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
      const result = await matcherService.list(tenantId, {
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

