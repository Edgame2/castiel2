/**
 * AI Tools Management Routes
 * Super Admin routes for managing AI function calling tools
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { AIToolExecutorService } from '../services/ai/ai-tool-executor.service.js';
import { isGlobalAdmin } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';

/**
 * Register AI Tools routes
 */
export async function registerAIToolsRoutes(
  fastify: FastifyInstance,
  toolExecutor: AIToolExecutorService,
  monitoring: IMonitoringProvider
): Promise<void> {
  /**
   * List all available AI tools
   * GET /api/v1/admin/ai/tools
   */
  fastify.get(
    '/api/v1/admin/ai/tools',
    {
      preHandler: fastify.authenticate ? [fastify.authenticate] : [],
      schema: {
        description: 'List all available AI function calling tools (Super Admin only)',
        tags: ['ai-admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              tools: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    requiresPermission: { type: 'string' },
                    enabledByDefault: { type: 'boolean' },
                    parameters: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getUser(request);
        if (!isGlobalAdmin(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Super Admin privileges required',
          });
        }

        const tools = toolExecutor.listTools();

        monitoring.trackEvent('ai-tools.list', {
          tenantId: user.tenantId,
          userId: user.id,
          toolCount: tools.length,
        });

        return reply.send({ tools });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to list AI tools');
        return reply.status(500).send({
          error: 'Failed to list AI tools',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get a specific AI tool
   * GET /api/v1/admin/ai/tools/:toolName
   */
  fastify.get<{
    Params: { toolName: string };
  }>(
    '/api/v1/admin/ai/tools/:toolName',
    {
      preHandler: fastify.authenticate ? [fastify.authenticate] : [],
      schema: {
        description: 'Get information about a specific AI tool (Super Admin only)',
        tags: ['ai-admin'],
        params: {
          type: 'object',
          required: ['toolName'],
          properties: {
            toolName: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              requiresPermission: { type: 'string' },
              enabledByDefault: { type: 'boolean' },
              parameters: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { toolName: string } }>, reply: FastifyReply) => {
      try {
        const user = getUser(request);
        if (!isGlobalAdmin(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Super Admin privileges required',
          });
        }

        const { toolName } = request.params;
        const tool = toolExecutor.getTool(toolName);

        if (!tool) {
          return reply.status(404).send({
            error: 'Tool not found',
            message: `Tool "${toolName}" does not exist`,
          });
        }

        monitoring.trackEvent('ai-tools.get', {
          tenantId: user.tenantId,
          userId: user.id,
          toolName,
        });

        return reply.send(tool);
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get AI tool');
        return reply.status(500).send({
          error: 'Failed to get AI tool',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}








