/**
 * Message routes
 */

import { FastifyInstance } from 'fastify';
import { AIConversationConfig } from '../types/config.types.js';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ConversationService } from '../services/ConversationService.js';
import { SendMessageInput } from '../types/conversation.types.js';
import { log } from '../utils/logger.js';

/**
 * Register message routes
 */
export async function registerMessageRoutes(fastify: FastifyInstance, config: AIConversationConfig): Promise<void> {
  const conversationService = new ConversationService(fastify);

  // Send message
  fastify.post<{ Params: { conversationId: string }; Body: SendMessageInput }>(
    '/api/v1/conversations/:conversationId/messages',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Send a message in a conversation',
        tags: ['Messages'],
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
        const userId = (request as any).user!.id;
        const input = request.body as SendMessageInput;

        const message = await conversationService.sendMessage(conversationId, tenantId, userId, input);

        return reply.status(201).send(message);
      } catch (error: any) {
        log.error('Failed to send message', error, { service: 'ai-conversation' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'MESSAGE_SEND_FAILED',
            message: error.message || 'Failed to send message',
          },
        });
      }
    }
  );

  // Get messages for conversation
  fastify.get<{ Params: { conversationId: string }; Querystring: { limit?: number; offset?: number } }>(
    '/api/v1/conversations/:conversationId/messages',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get messages for a conversation',
        tags: ['Messages'],
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
            limit: { type: 'number', minimum: 1, maximum: 1000 },
            offset: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { conversationId } = request.params;
        const { limit, offset } = request.query;
        const tenantId = (request as any).user!.tenantId;

        const conversation = await conversationService.getConversation(conversationId, tenantId, {
          includeMessages: true,
          messageLimit: limit,
        });

        if (!conversation) {
          return reply.status(404).send({
            error: {
              code: 'CONVERSATION_NOT_FOUND',
              message: 'Conversation not found',
            },
          });
        }

        const messages = conversation.structuredData.messages || [];
        const paginatedMessages = offset
          ? messages.slice(offset, offset + (limit || 50))
          : messages.slice(-(limit || 50));

        return reply.send({
          messages: paginatedMessages,
          total: messages.length,
        });
      } catch (error: any) {
        log.error('Failed to get messages', error, { service: 'ai-conversation' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'MESSAGE_RETRIEVAL_FAILED',
            message: error.message || 'Failed to retrieve messages',
          },
        });
      }
    }
  );

  log.info('Message routes registered', { service: 'ai-conversation' });
}
