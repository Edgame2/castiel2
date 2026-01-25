/**
 * Route Registration
 * Context Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ContextService } from '../services/ContextService';
import { ContextAssemblerService } from '../services/ContextAssemblerService';
import { FastifyInstance } from 'fastify';
import { DependencyService } from '../services/DependencyService';
import { CallGraphService } from '../services/CallGraphService';
import {
  CreateContextInput,
  UpdateContextInput,
  AssembleContextInput,
  ContextType,
  ContextScope,
} from '../types/context.types';

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
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

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
      const tenantId = request.user!.tenantId;
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
          200: {
            type: 'object',
            description: 'Context details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const path = decodeURIComponent(request.params.path);
      const context = await contextService.getByPath(path, tenantId);
      if (!context) {
        reply.code(404).send({ error: 'Context not found' });
        return;
      }
      reply.send(context);
    }
  );

  /**
   * Update context
   * PUT /api/v1/context/contexts/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateContextInput }>(
    '/api/v1/context/contexts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update context',
        tags: ['Contexts'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            metadata: { type: 'object' },
            ast: { type: 'object' },
            dependencies: { type: 'array', items: { type: 'string' } },
            dependents: { type: 'array', items: { type: 'string' } },
            callers: { type: 'array', items: { type: 'string' } },
            callees: { type: 'array', items: { type: 'string' } },
            embeddings: { type: 'object' },
            relevanceScore: { type: 'number' },
            tokenCount: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Context updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const context = await contextService.update(request.params.id, tenantId, request.body);
      reply.send(context);
    }
  );

  /**
   * Delete context
   * DELETE /api/v1/context/contexts/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/context/contexts/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete context',
        tags: ['Contexts'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Context deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await contextService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List contexts
   * GET /api/v1/context/contexts
   */
  app.get<{
    Querystring: {
      type?: string;
      scope?: string;
      path?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
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
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of contexts',
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
      const result = await contextService.list(tenantId, {
        type: request.query.type as any,
        scope: request.query.scope as any,
        path: request.query.path,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== CONTEXT ASSEMBLY ROUTES =====

  /**
   * Assemble context
   * POST /api/v1/context/assemble
   */
  app.post<{ Body: AssembleContextInput }>(
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
            includeTypes: { type: 'array', items: { type: 'string' } },
            excludeTypes: { type: 'array', items: { type: 'string' } },
            maxTokens: { type: 'number' },
            maxFiles: { type: 'number' },
            includeDependencies: { type: 'boolean' },
            includeCallers: { type: 'boolean' },
            includeCallees: { type: 'boolean' },
            relevanceThreshold: { type: 'number' },
            compression: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Context assembly created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const assembly = await assemblerService.assemble(
        {
          ...request.body,
          scope: request.body.scope as any,
        },
        tenantId,
        userId
      );
      reply.code(201).send(assembly);
    }
  );

  /**
   * Get assembly by ID
   * GET /api/v1/context/assemblies/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/context/assemblies/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get context assembly by ID',
        tags: ['Context Assembly'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Context assembly details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const assembly = await assemblerService.getById(request.params.id, tenantId);
      reply.send(assembly);
    }
  );

  // ===== DEPENDENCY ROUTES =====

  /**
   * Build dependency tree
   * POST /api/v1/context/dependencies/tree
   */
  app.post<{
    Body: {
      rootPath: string;
      maxDepth?: number;
    };
  }>(
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
            maxDepth: { type: 'number', default: 10 },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Dependency tree created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const tree = await dependencyService.buildTree(
        request.body.rootPath,
        tenantId,
        request.body.maxDepth
      );
      reply.code(201).send(tree);
    }
  );

  /**
   * Get dependency tree by ID
   * GET /api/v1/context/dependencies/tree/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/context/dependencies/tree/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get dependency tree by ID',
        tags: ['Dependencies'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Dependency tree details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const tree = await dependencyService.getById(request.params.id, tenantId);
      reply.send(tree);
    }
  );

  // ===== CALL GRAPH ROUTES =====

  /**
   * Build call graph
   * POST /api/v1/context/call-graphs
   */
  app.post<{
    Body: {
      scope: string;
      rootFunction?: string;
    };
  }>(
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
            description: 'Call graph created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const graph = await callGraphService.buildGraph(
        request.body.scope as any,
        tenantId,
        request.body.rootFunction
      );
      reply.code(201).send(graph);
    }
  );

  /**
   * Get call graph by ID
   * GET /api/v1/context/call-graphs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/context/call-graphs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get call graph by ID',
        tags: ['Call Graphs'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Call graph details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const graph = await callGraphService.getById(request.params.id, tenantId);
      reply.send(graph);
    }
  );

  /**
   * Get callers of a function
   * GET /api/v1/context/call-graphs/callers/:path
   */
  app.get<{ Params: { path: string } }>(
    '/api/v1/context/call-graphs/callers/:path',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get callers of a function',
        tags: ['Call Graphs'],
        params: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of callers',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const path = decodeURIComponent(request.params.path);
      const callers = await callGraphService.getCallers(path, tenantId);
      reply.send(callers);
    }
  );

  /**
   * Get callees of a function
   * GET /api/v1/context/call-graphs/callees/:path
   */
  app.get<{ Params: { path: string } }>(
    '/api/v1/context/call-graphs/callees/:path',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get callees of a function',
        tags: ['Call Graphs'],
        params: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of callees',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const path = decodeURIComponent(request.params.path);
      const callees = await callGraphService.getCallees(path, tenantId);
      reply.send(callees);
    }
  );

  // ===== AI CONTEXT ASSEMBLY ROUTES =====

  /**
   * Assemble context for AI query
   * POST /api/v1/context/assemble-ai
   */
  app.post<{ Body: ContextAssemblyRequest }>(
    '/api/v1/context/assemble-ai',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Assemble context for AI query with topic extraction',
        tags: ['Context Assembly'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const assemblyRequest: ContextAssemblyRequest = {
        ...request.body,
        userId,
      };

      const result = await assemblerService.assembleContextForAI(tenantId, assemblyRequest);
      reply.send(result);
    }
  );

  /**
   * Extract topics from content
   * POST /api/v1/context/extract-topics
   */
  app.post<{ Body: TopicExtractionRequest }>(
    '/api/v1/context/extract-topics',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Extract topics from content',
        tags: ['Context Assembly'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const topics = await (assemblerService as any).extractTopics(tenantId, request.body);
      reply.send({ topics });
    }
  );
}

