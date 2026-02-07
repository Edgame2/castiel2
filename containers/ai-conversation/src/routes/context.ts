/**
 * Context routes
 */

import { FastifyInstance } from 'fastify';
import { AIConversationConfig } from '../types/config.types.js';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { ConversationService } from '../services/ConversationService.js';
import { ContextAssemblyService } from '../services/ContextAssemblyService.js';
import { GroundingService } from '../services/GroundingService.js';
import { IntentAnalyzerService } from '../services/IntentAnalyzerService.js';
import { log } from '../utils/logger.js';

/**
 * Register context routes
 */
export async function registerContextRoutes(fastify: FastifyInstance, config: AIConversationConfig): Promise<void> {
  const conversationService = new ConversationService(fastify);
  const contextAssemblyService = new ContextAssemblyService(fastify);
  const groundingService = new GroundingService(fastify);
  const intentAnalyzerService = new IntentAnalyzerService(fastify);

  // Get conversation context
  fastify.get<{ Params: { conversationId: string } }>(
    '/api/v1/conversations/:conversationId/context',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get assembled context for conversation',
        tags: ['Context'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
          },
          required: ['conversationId'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { conversationId } = request.params;
        const tenantId = (request as any).user!.tenantId;

        const conversation = await conversationService.getConversation(conversationId, tenantId);
        if (!conversation) {
          return reply.status(404).send({
            error: {
              code: 'CONVERSATION_NOT_FOUND',
              message: 'Conversation not found',
            },
          });
        }

        // Get context sources from latest messages
        const contextSources = conversation.structuredData.messages
          .filter(m => m.contextSources && m.contextSources.length > 0)
          .flatMap(m => m.contextSources || []);

        return reply.send({
          conversationId,
          contextSources,
          totalSources: contextSources.length,
        });
      } catch (error: any) {
        log.error('Failed to get conversation context', error, { service: 'ai-conversation' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONTEXT_RETRIEVAL_FAILED',
            message: error.message || 'Failed to retrieve conversation context',
          },
        });
      }
    }
  );

    // Assemble context
    fastify.post<{ Body: { query: string; projectId?: string; maxTokens?: number; minRelevance?: number } }>(
      '/api/v1/context/assemble',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Assemble context for query',
          tags: ['Context'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;
          const userId = (request as any).user!.id;
          const { query, projectId, maxTokens, minRelevance } = request.body;

          const context = await contextAssemblyService.assembleContext(tenantId, {
            query,
            projectId,
            userId,
            maxTokens,
            minRelevance,
          });

          return reply.send(context);
        } catch (error: any) {
          log.error('Failed to assemble context', error, { service: 'ai-conversation' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'CONTEXT_ASSEMBLY_FAILED',
              message: error.message || 'Failed to assemble context',
            },
          });
        }
      }
    );

    // Ground response
    fastify.post<{ Body: { response: string; contextId: string } }>(
      '/api/v1/context/ground',
      {
        preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
        schema: {
          description: 'Ground AI response with citations',
          tags: ['Context'],
          security: [{ bearerAuth: [] }],
        },
      },
      async (request, reply) => {
        try {
          const tenantId = (request as any).user!.tenantId;
          const { response, contextId } = request.body;

          // Get context
          const container = getContainer('conversation_contexts');
          const { resource: context } = await container.item(contextId, tenantId).read();

          if (!context) {
            return reply.status(404).send({
              error: {
                code: 'CONTEXT_NOT_FOUND',
                message: 'Context not found',
              },
            });
          }

          const grounded = await groundingService.ground(tenantId, response, context);

          return reply.send(grounded);
        } catch (error: any) {
          log.error('Failed to ground response', error, { service: 'ai-conversation' });
          return reply.status(error.statusCode || 500).send({
            error: {
              code: 'GROUNDING_FAILED',
              message: error.message || 'Failed to ground response',
            },
          });
        }
      }
    );

    log.info('Context routes registered', { service: 'ai-conversation' });
  }
