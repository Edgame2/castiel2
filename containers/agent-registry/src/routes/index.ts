/**
 * Route Registration
 * Agent Registry routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { AgentService } from '../services/AgentService';
import { AgentSelectorService } from '../services/AgentSelectorService';
import { AgentExecutionService } from '../services/AgentExecutionService';
import {
  CreateAgentInput,
  UpdateAgentInput,
  ExecuteAgentInput,
  AgentSelectionCriteria,
  AgentType,
  AgentScope,
  AgentStatus,
} from '../types/agent.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const agentService = new AgentService();
  const selectorService = new AgentSelectorService(agentService);
  const executionService = new AgentExecutionService(agentService);

  // ===== AGENT ROUTES =====

  /**
   * Create agent
   * POST /api/v1/agents
   */
  app.post<{ Body: Omit<CreateAgentInput, 'tenantId' | 'userId'> }>(
    '/api/v1/agents',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new agent',
        tags: ['Agents'],
        body: {
          type: 'object',
          required: ['name', 'description', 'type', 'scope', 'instructions'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['architecture', 'security', 'performance', 'testing', 'documentation', 'refactoring', 'database', 'api_design', 'ui_ux', 'devops', 'code_review', 'migration', 'quality', 'observability', 'custom'] },
            scope: { type: 'string', enum: ['global', 'project', 'user', 'ephemeral'] },
            ownerId: { type: 'string' },
            instructions: {
              type: 'object',
              required: ['systemPrompt'],
              properties: {
                systemPrompt: { type: 'string' },
                dynamicPromptRefs: { type: 'array', items: { type: 'string' } },
              },
            },
            capabilities: { type: 'object' },
            constraints: { type: 'object' },
            memory: { type: 'object' },
            triggers: { type: 'object' },
            outputs: { type: 'object' },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Agent created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateAgentInput = {
        ...request.body,
        tenantId,
        userId,
        type: request.body.type as any,
        scope: request.body.scope as any,
      };

      const agent = await agentService.create(input);
      reply.code(201).send(agent);
    }
  );

  /**
   * Get agent by ID
   * GET /api/v1/agents/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/agents/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get agent by ID',
        tags: ['Agents'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Agent details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const agent = await agentService.getById(request.params.id, tenantId);
      reply.send(agent);
    }
  );

  /**
   * Update agent
   * PUT /api/v1/agents/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateAgentInput }>(
    '/api/v1/agents/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update agent',
        tags: ['Agents'],
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
            status: { type: 'string', enum: ['active', 'inactive', 'deprecated', 'maintenance'] },
            instructions: { type: 'object' },
            capabilities: { type: 'object' },
            constraints: { type: 'object' },
            memory: { type: 'object' },
            triggers: { type: 'object' },
            outputs: { type: 'object' },
            metadata: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Agent updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const agent = await agentService.update(request.params.id, tenantId, request.body);
      reply.send(agent);
    }
  );

  /**
   * Delete agent
   * DELETE /api/v1/agents/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/agents/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete agent',
        tags: ['Agents'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Agent deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await agentService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List agents
   * GET /api/v1/agents
   */
  app.get<{
    Querystring: {
      type?: string;
      scope?: string;
      status?: string;
      ownerId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/agents',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List agents',
        tags: ['Agents'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            scope: { type: 'string' },
            status: { type: 'string' },
            ownerId: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of agents',
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
      const result = await agentService.list(tenantId, {
        type: request.query.type as any,
        scope: request.query.scope as any,
        status: request.query.status as any,
        ownerId: request.query.ownerId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== AGENT SELECTION ROUTES =====

  /**
   * Select agent for task
   * POST /api/v1/agents/select
   */
  app.post<{ Body: AgentSelectionCriteria }>(
    '/api/v1/agents/select',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Select best agent for a task',
        tags: ['Agent Selection'],
        body: {
          type: 'object',
          required: ['task'],
          properties: {
            task: { type: 'string' },
            taskType: { type: 'string' },
            requiredCapabilities: { type: 'array', items: { type: 'string' } },
            preferredAgentTypes: { type: 'array', items: { type: 'string' } },
            scope: { type: 'string', enum: ['global', 'project', 'user', 'ephemeral'] },
            maxTokens: { type: 'number' },
            timeout: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Selected agent',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const agent = await selectorService.selectAgent(
        {
          ...request.body,
          scope: request.body.scope as any,
        },
        tenantId
      );
      reply.send(agent || { message: 'No suitable agent found' });
    }
  );

  /**
   * Get agents by type
   * GET /api/v1/agents/type/:type
   */
  app.get<{ Params: { type: string }; Querystring: { scope?: string } }>(
    '/api/v1/agents/type/:type',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get agents by type',
        tags: ['Agents'],
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            scope: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of agents of specified type',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const agents = await selectorService.getAgentsByType(
        request.params.type as any,
        tenantId,
        request.query.scope as any
      );
      reply.send(agents);
    }
  );

  // ===== AGENT EXECUTION ROUTES =====

  /**
   * Execute agent
   * POST /api/v1/agents/:id/execute
   */
  app.post<{ Params: { id: string }; Body: Omit<ExecuteAgentInput, 'tenantId' | 'userId' | 'agentId'> }>(
    '/api/v1/agents/:id/execute',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Execute an agent',
        tags: ['Agent Execution'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['task'],
          properties: {
            task: { type: 'string' },
            input: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Agent execution started',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: ExecuteAgentInput = {
        tenantId,
        userId,
        agentId: request.params.id,
        ...request.body,
      };

      const execution = await executionService.execute(input);
      reply.code(201).send(execution);
    }
  );

  /**
   * Get execution by ID
   * GET /api/v1/agents/executions/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/agents/executions/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get agent execution by ID',
        tags: ['Agent Execution'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Execution details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const execution = await executionService.getById(request.params.id, tenantId);
      reply.send(execution);
    }
  );

  /**
   * List executions
   * GET /api/v1/agents/executions
   */
  app.get<{
    Querystring: {
      agentId?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/agents/executions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List agent executions',
        tags: ['Agent Execution'],
        querystring: {
          type: 'object',
          properties: {
            agentId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of executions',
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
      const result = await executionService.list(tenantId, {
        agentId: request.query.agentId,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );
}

