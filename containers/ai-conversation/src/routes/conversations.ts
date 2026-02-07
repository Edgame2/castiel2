/**
 * Conversation routes
 */

import { FastifyInstance } from 'fastify';
import { AIConversationConfig } from '../types/config.types.js';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ConversationService } from '../services/ConversationService.js';
import { CreateConversationInput, ConversationVisibility, ConversationStatus } from '../types/conversation.types.js';
import { log } from '../utils/logger.js';

/**
 * Register conversation routes
 */
export async function registerConversationRoutes(fastify: FastifyInstance, config: AIConversationConfig): Promise<void> {
  const conversationService = new ConversationService(fastify);

  // List conversations
  fastify.get<{ Querystring: { limit?: number; offset?: number; status?: ConversationStatus } }>(
    '/api/v1/conversations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List conversations for current user',
        tags: ['Conversations'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
            status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).user!.tenantId;
        const userId = (request as any).user!.id;
        const { limit, offset, status } = request.query;

        const result = await conversationService.listConversations(tenantId, userId, {
          limit,
          offset,
          status,
        });

        return reply.send(result);
      } catch (error: any) {
        log.error('Failed to list conversations', error, { service: 'ai-conversation' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONVERSATION_LIST_FAILED',
            message: error.message || 'Failed to list conversations',
          },
        });
      }
    }
  );

  // Get conversation by ID
  fastify.get<{ Params: { conversationId: string }; Querystring: { includeMessages?: boolean; messageLimit?: number } }>(
    '/api/v1/conversations/:conversationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get conversation by ID',
        tags: ['Conversations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
          },
          required: ['conversationId'],
        },
        querystring: {
          type: 'object',
          properties: {
            includeMessages: { type: 'boolean', default: true },
            messageLimit: { type: 'number', minimum: 1, maximum: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { conversationId } = request.params;
        const { includeMessages, messageLimit } = request.query;
        const tenantId = (request as any).user!.tenantId;

        const conversation = await conversationService.getConversation(conversationId, tenantId, {
          includeMessages,
          messageLimit,
        });

        if (!conversation) {
          return reply.status(404).send({
            error: {
              code: 'CONVERSATION_NOT_FOUND',
              message: 'Conversation not found',
            },
          });
        }

        return reply.send(conversation);
      } catch (error: any) {
        log.error('Failed to get conversation', error, { service: 'ai-conversation' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONVERSATION_RETRIEVAL_FAILED',
            message: error.message || 'Failed to retrieve conversation',
          },
        });
      }
    }
  );

  // Create conversation
  fastify.post<{ Body: CreateConversationInput }>(
    '/api/v1/conversations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new conversation',
        tags: ['Conversations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const tenantId = (request as any).user!.tenantId;
        const userId = (request as any).user!.id;
        const input = request.body as CreateConversationInput;

        const conversation = await conversationService.createConversation(tenantId, userId, input);

        return reply.status(201).send(conversation);
      } catch (error: any) {
        log.error('Failed to create conversation', error, { service: 'ai-conversation' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONVERSATION_CREATION_FAILED',
            message: error.message || 'Failed to create conversation',
          },
        });
      }
    }
  );

  // Update conversation
  fastify.put<{
    Params: { conversationId: string };
    Body: { title?: string; visibility?: ConversationVisibility; status?: ConversationStatus; tags?: string[] };
  }>(
    '/api/v1/conversations/:conversationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update conversation',
        tags: ['Conversations'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { conversationId } = request.params;
        const tenantId = (request as any).user!.tenantId;
        const updates = request.body;

        const conversation = await conversationService.updateConversation(conversationId, tenantId, updates);

        return reply.send(conversation);
      } catch (error: any) {
        log.error('Failed to update conversation', error, { service: 'ai-conversation' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONVERSATION_UPDATE_FAILED',
            message: error.message || 'Failed to update conversation',
          },
        });
      }
    }
  );

  log.info('Conversation routes registered', { service: 'ai-conversation' });
}
