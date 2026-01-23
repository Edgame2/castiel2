/**
 * Route Registration
 * Bug Detection routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { BugService } from '../services/BugService';
import { BugDetectionService } from '../services/BugDetectionService';
import { BugFixService } from '../services/BugFixService';
import {
  CreateBugInput,
  UpdateBugInput,
  ScanBugsInput,
  ApplyFixInput,
  BugType,
  BugSeverity,
  BugStatus,
  DetectionMethod,
} from '../types/bug.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const bugService = new BugService();
  const detectionService = new BugDetectionService(bugService);
  const fixService = new BugFixService(bugService);

  // ===== BUG ROUTES =====

  /**
   * Create bug
   * POST /api/v1/bugs
   */
  app.post<{ Body: Omit<CreateBugInput, 'tenantId' | 'userId'> }>(
    '/api/v1/bugs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new bug',
        tags: ['Bugs'],
        body: {
          type: 'object',
          required: ['title', 'type', 'severity', 'detectionMethod', 'location'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['syntax_error', 'runtime_error', 'logic_error', 'performance', 'security', 'memory_leak', 'race_condition', 'null_pointer', 'type_error', 'anomaly', 'regression', 'vulnerability', 'custom'] },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
            detectionMethod: { type: 'string', enum: ['static_analysis', 'runtime_monitoring', 'anomaly_detection', 'prediction', 'manual', 'ai_detection'] },
            location: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string' },
                line: { type: 'number' },
                column: { type: 'number' },
                function: { type: 'string' },
                module: { type: 'string' },
                code: { type: 'string' },
              },
            },
            rootCause: { type: 'object' },
            impact: { type: 'object' },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Bug created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateBugInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
        severity: request.body.severity as any,
        detectionMethod: request.body.detectionMethod as any,
      };

      const bug = await bugService.create(input);
      reply.code(201).send(bug);
    }
  );

  /**
   * Get bug by ID
   * GET /api/v1/bugs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/bugs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get bug by ID',
        tags: ['Bugs'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Bug details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const bug = await bugService.getById(request.params.id, tenantId);
      reply.send(bug);
    }
  );

  /**
   * Update bug
   * PUT /api/v1/bugs/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateBugInput }>(
    '/api/v1/bugs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update bug',
        tags: ['Bugs'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
            status: { type: 'string', enum: ['detected', 'confirmed', 'in_progress', 'fixed', 'verified', 'false_positive', 'wont_fix', 'closed'] },
            rootCause: { type: 'object' },
            impact: { type: 'object' },
            fix: { type: 'object' },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Bug updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const bug = await bugService.update(request.params.id, tenantId, request.body);
      reply.send(bug);
    }
  );

  /**
   * Delete bug
   * DELETE /api/v1/bugs/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/bugs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete bug',
        tags: ['Bugs'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Bug deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await bugService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List bugs
   * GET /api/v1/bugs
   */
  app.get<{
    Querystring: {
      type?: string;
      severity?: string;
      status?: string;
      detectionMethod?: string;
      file?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/bugs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List bugs',
        tags: ['Bugs'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            severity: { type: 'string' },
            status: { type: 'string' },
            detectionMethod: { type: 'string' },
            file: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of bugs',
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
      const result = await bugService.list(tenantId, {
        type: request.query.type as any,
        severity: request.query.severity as any,
        status: request.query.status as any,
        detectionMethod: request.query.detectionMethod as any,
        file: request.query.file,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== BUG DETECTION ROUTES =====

  /**
   * Scan for bugs
   * POST /api/v1/bugs/scan
   */
  app.post<{ Body: Omit<ScanBugsInput, 'tenantId' | 'userId'> }>(
    '/api/v1/bugs/scan',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Scan codebase for bugs',
        tags: ['Bug Detection'],
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
            detectionMethods: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Bug detection scan started',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: ScanBugsInput = {
        ...request.body,
        tenantId,
        userId,
        target: {
          ...request.body.target,
          type: request.body.target.type as any,
        },
        detectionMethods: request.body.detectionMethods as any,
      };

      const scan = await detectionService.scanBugs(input);
      reply.code(201).send(scan);
    }
  );

  /**
   * Get scan by ID
   * GET /api/v1/bugs/scans/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/bugs/scans/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get bug detection scan by ID',
        tags: ['Bug Detection'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Bug detection scan details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const scan = await detectionService.getById(request.params.id, tenantId);
      reply.send(scan);
    }
  );

  /**
   * List scans
   * GET /api/v1/bugs/scans
   */
  app.get<{
    Querystring: {
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/bugs/scans',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List bug detection scans',
        tags: ['Bug Detection'],
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
            description: 'List of bug detection scans',
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
      const result = await detectionService.list(tenantId, {
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== BUG FIX ROUTES =====

  /**
   * Apply fix to bug
   * POST /api/v1/bugs/:id/fix
   */
  app.post<{ Params: { id: string }; Body: { fixCode?: string; validate?: boolean } }>(
    '/api/v1/bugs/:id/fix',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Apply fix to bug',
        tags: ['Bug Fixes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            fixCode: { type: 'string' },
            validate: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Bug fix applied',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: ApplyFixInput = {
        tenantId,
        userId,
        bugId: request.params.id,
        fixCode: request.body.fixCode,
        validate: request.body.validate,
      };

      const bugFix = await fixService.applyFix(input);
      reply.code(201).send(bugFix);
    }
  );

  /**
   * Get fix by ID
   * GET /api/v1/bugs/fixes/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/bugs/fixes/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get bug fix by ID',
        tags: ['Bug Fixes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Bug fix details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const fix = await fixService.getById(request.params.id, tenantId);
      reply.send(fix);
    }
  );

  /**
   * Get fixes for a bug
   * GET /api/v1/bugs/:id/fixes
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/bugs/:id/fixes',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get fixes for a bug',
        tags: ['Bug Fixes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of bug fixes',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const fixes = await fixService.getByBugId(request.params.id, tenantId);
      reply.send(fixes);
    }
  );

  /**
   * Revert fix
   * POST /api/v1/bugs/fixes/:id/revert
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/bugs/fixes/:id/revert',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Revert bug fix',
        tags: ['Bug Fixes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Bug fix reverted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;
      const fix = await fixService.revertFix(request.params.id, tenantId, userId);
      reply.send(fix);
    }
  );
}

