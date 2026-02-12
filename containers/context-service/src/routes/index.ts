/**
 * Route Registration
 * Context Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ContextService } from '../services/ContextService';
import { ContextAssemblerService } from '../services/ContextAssemblerService';
import { DependencyService } from '../services/DependencyService';
import { CallGraphService } from '../services/CallGraphService';
import {
  CreateContextInput,
  UpdateContextInput,
  AssembleContextInput,
} from '../types/context.types';
import type { ContextAssemblyRequest, TopicExtractionRequest } from '../types/ai-context.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const contextService = new ContextService();
  const assemblerService = new ContextAssemblerService(contextService, app);
  const dependencyService = new DependencyService(contextService);
  const callGraphService = new CallGraphService(contextService);

  // ===== CONTEXT ROUTES =====

  /**
   * Create context
   * POST /api/v1/context/contexts
   */
  app.post<{ Body: Omit<CreateContextInput, 'tenantId' | 'userId'> }>(
    '/api/v1/context/contexts',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new context',
        tags: ['Contexts'],
        body: {
          type: 'object',
          required: ['type', 'scope', 'path', 'name'],
          properties: {
            type: { type: 'string', enum: ['file', 'function', 'module', 'class', 'interface', 'type', 'variable', 'dependency', 'call_graph', 'ast', 'codebase_graph'] },
            scope: { type: 'string', enum: ['file', 'module', 'package', 'project', 'workspace'] },
            path: { type: 'string' },
            name: { type: 'string' },
            content: { type: 'string' },
            metadata: { type: 'object' },
            ast: { type: 'object' },
            dependencies: { type: 'array', items: { type: 'string' } },
            dependents: { type: 'array', items: { type: 'string' } },
            callers: { type: 'array', items: { type: 'string' } },
            callees: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Context created successfully',
            properties: { id: { type: 'string' }, tenantId: { type: 'string' }, path: { type: 'string' } },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user!.tenantId;
      const userId = (request as any).user!.id;

      const input: CreateContextInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
        scope: request.body.scope as any,
      };

      const context = await contextService.create(input);
      reply.code(201).send(context);
    }
  );

  /**
   * Get context by ID
   * GET /api/v1/context/contexts/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/context/contexts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get context by ID',
        tags: ['Contexts'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Context details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user!.tenantId;
      const context = await contextService.getById(request.params.id, tenantId);
      reply.send(context);
    }
  );

  /**
   * Get context by path
   * GET /api/v1/context/contexts/path/:path
   */
  app.get<{ Params: { path: string } }>(
    '/api/v1/context/contexts/path/:path',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get context by path',
        tags: ['Contexts'],
        params: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', description: 'Context details', additionalProperties: true },
          404: { type: 'object', description: 'Not found' },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user!.tenantId;
      const context = await contextService.getByPath(request.params.path, tenantId);
      if (!context) return reply.code(404).send({ message: 'Context not found' });
      reply.send(context);
    }
  );

  /**
   * List contexts
   * GET /api/v1/context/contexts
   */
  app.get<{ Querystring: { type?: string; scope?: string; path?: string } }>(
    '/api/v1/context/contexts',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List contexts',
        tags: ['Contexts'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            scope: { type: 'string' },
            path: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user!.tenantId;
      const filters = request.query?.type || request.query?.scope || request.query?.path
        ? { type: request.query.type as any, scope: request.query.scope as any, path: request.query.path }
        : undefined;
      const { items } = await contextService.list(tenantId, filters);
      reply.send({ items });
    }
  );

  /**
   * Assemble context
   * POST /api/v1/context/assemble
   */
  app.post<{ Body: { task: string; scope: string; targetPath?: string; maxTokens?: number } }>(
    '/api/v1/context/assemble',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Assemble context for a task',
        tags: ['Context Assembly'],
        body: {
          type: 'object',
          required: ['task', 'scope'],
          properties: {
            task: { type: 'string' },
            scope: { type: 'string', enum: ['file', 'module', 'package', 'project', 'workspace'] },
            targetPath: { type: 'string' },
            maxTokens: { type: 'number' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: { id: { type: 'string' }, tenantId: { type: 'string' } },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user!.tenantId;
      const userId = (request as any).user!.id;
      const input: AssembleContextInput = {
        task: request.body.task,
        scope: request.body.scope as any,
        targetPath: request.body.targetPath,
        maxTokens: request.body.maxTokens,
      };
      const assembly = await assemblerService.assemble(input, tenantId, userId);
      reply.code(201).send(assembly);
    }
  );

  /**
   * Build dependency tree
   * POST /api/v1/context/dependencies/tree
   */
  app.post<{ Body: { rootPath: string; maxDepth?: number } }>(
    '/api/v1/context/dependencies/tree',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Build dependency tree for a path',
        tags: ['Dependencies'],
        body: {
          type: 'object',
          required: ['rootPath'],
          properties: {
            rootPath: { type: 'string' },
            maxDepth: { type: 'number' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: { id: { type: 'string' }, tenantId: { type: 'string' }, rootPath: { type: 'string' } },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user!.tenantId;
      const maxDepth = request.body.maxDepth ?? 10;
      const tree = await dependencyService.buildTree(request.body.rootPath, tenantId, maxDepth);
      reply.code(201).send(tree);
    }
  );

  /**
   * Build call graph
   * POST /api/v1/context/call-graphs
   */
  app.post<{ Body: { scope: string; rootFunction?: string } }>(
    '/api/v1/context/call-graphs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Build call graph for a scope',
        tags: ['Call Graphs'],
        body: {
          type: 'object',
          required: ['scope'],
          properties: {
            scope: { type: 'string', enum: ['file', 'module', 'package', 'project', 'workspace'] },
            rootFunction: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: { id: { type: 'string' }, tenantId: { type: 'string' } },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user!.tenantId;
      const graph = await callGraphService.buildGraph(
        request.body.scope as any,
        tenantId,
        request.body.rootFunction
      );
      reply.code(201).send(graph);
    }
  );
}
