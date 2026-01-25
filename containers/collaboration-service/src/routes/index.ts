/**
 * Route Registration
 * Collaboration Service routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware } from '@coder/shared';
import { ConversationService } from '../services/ConversationService';
import { MessageService } from '../services/MessageService';
import { CommentService } from '../services/CommentService';
import { ReactionService } from '../services/ReactionService';
import { CollaborationIntelligenceService } from '../services/CollaborationIntelligenceService';
import {
  CreateConversationInput,
  UpdateConversationInput,
  ShareConversationInput,
  CreateMessageInput,
  CreateCommentInput,
  CreateReactionInput,
  ConversationStatus,
  ConversationVisibility,
  MessageRole,
} from '../types/collaboration.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const conversationService = new ConversationService();
  const messageService = new MessageService(conversationService);
  const commentService = new CommentService(messageService);
  const reactionService = new ReactionService(messageService);
  const collaborationIntelligenceService = new CollaborationIntelligenceService();

  // ===== CONVERSATION ROUTES =====

  /**
   * Create conversation
   * POST /api/v1/collaboration/conversations
   */
  app.post<{ Body: Omit<CreateConversationInput, 'tenantId' | 'userId'> }>(
    '/api/v1/collaboration/conversations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new conversation',
        tags: ['Conversations'],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            visibility: { type: 'string', enum: ['private', 'shared', 'public'] },
            assistantId: { type: 'string', format: 'uuid' },
            templateId: { type: 'string', format: 'uuid' },
            defaultModelId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            participants: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Conversation created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateConversationInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const conversation = await conversationService.create(input);
      reply.code(201).send(conversation);
    }
  );

  /**
   * Get conversation by ID
   * GET /api/v1/collaboration/conversations/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/collaboration/conversations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get conversation by ID',
        tags: ['Conversations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Conversation details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const conversation = await conversationService.getById(request.params.id, tenantId);
      reply.send(conversation);
    }
  );

  /**
   * Update conversation
   * PUT /api/v1/collaboration/conversations/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateConversationInput }>(
    '/api/v1/collaboration/conversations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update conversation',
        tags: ['Conversations'],
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
            summary: { type: 'string' },
            status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
            visibility: { type: 'string', enum: ['private', 'shared', 'public'] },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Conversation updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const conversation = await conversationService.update(
        request.params.id,
        tenantId,
        request.body
      );
      reply.send(conversation);
    }
  );

  /**
   * Delete conversation
   * DELETE /api/v1/collaboration/conversations/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/collaboration/conversations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete conversation (soft delete)',
        tags: ['Conversations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Conversation deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await conversationService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List conversations
   * GET /api/v1/collaboration/conversations
   */
  app.get<{
    Querystring: {
      status?: string;
      visibility?: string;
      userId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/collaboration/conversations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List conversations',
        tags: ['Conversations'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
            visibility: { type: 'string', enum: ['private', 'shared', 'public'] },
            userId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of conversations',
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
      const result = await conversationService.list(tenantId, {
        status: request.query.status as any,
        visibility: request.query.visibility as any,
        userId: request.query.userId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Share conversation
   * POST /api/v1/collaboration/conversations/:id/share
   */
  app.post<{ Params: { id: string }; Body: Omit<ShareConversationInput, 'tenantId' | 'userId' | 'conversationId'> }>(
    '/api/v1/collaboration/conversations/:id/share',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Share conversation with users',
        tags: ['Conversations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['userIds'],
          properties: {
            userIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            role: { type: 'string', enum: ['owner', 'participant', 'viewer'] },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Conversation shared successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: ShareConversationInput = {
        tenantId,
        userId,
        conversationId: request.params.id,
        userIds: request.body.userIds,
        role: request.body.role,
      };

      const conversation = await conversationService.share(input);
      reply.send(conversation);
    }
  );

  // ===== MESSAGE ROUTES =====

  /**
   * Create message
   * POST /api/v1/collaboration/conversations/:conversationId/messages
   */
  app.post<{ Params: { conversationId: string }; Body: Omit<CreateMessageInput, 'tenantId' | 'userId' | 'conversationId'> }>(
    '/api/v1/collaboration/conversations/:conversationId/messages',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new message in conversation',
        tags: ['Messages'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1 },
            contentType: { type: 'string', enum: ['text', 'markdown', 'code', 'json'] },
            parentId: { type: 'string', format: 'uuid' },
            attachments: { type: 'array', items: { type: 'object' } },
            mentions: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Message created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateMessageInput = {
        ...request.body,
        tenantId,
        userId,
        conversationId: request.params.conversationId,
      };

      const message = await messageService.create(input);
      reply.code(201).send(message);
    }
  );

  /**
   * Get message by ID
   * GET /api/v1/collaboration/messages/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/collaboration/messages/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get message by ID',
        tags: ['Messages'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Message details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const message = await messageService.getById(request.params.id, tenantId);
      reply.send(message);
    }
  );

  /**
   * Update message
   * PUT /api/v1/collaboration/messages/:id
   */
  app.put<{ Params: { id: string }; Body: { content?: string; status?: string; pinned?: boolean } }>(
    '/api/v1/collaboration/messages/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update message',
        tags: ['Messages'],
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
            status: { type: 'string', enum: ['pending', 'streaming', 'complete', 'error', 'cancelled'] },
            pinned: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Message updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const message = await messageService.update(request.params.id, tenantId, {
        ...request.body,
        userId,
      });
      reply.send(message);
    }
  );

  /**
   * Delete message
   * DELETE /api/v1/collaboration/messages/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/collaboration/messages/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete message',
        tags: ['Messages'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Message deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await messageService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List messages in conversation
   * GET /api/v1/collaboration/conversations/:conversationId/messages
   */
  app.get<{
    Params: { conversationId: string };
    Querystring: {
      parentId?: string;
      role?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/collaboration/conversations/:conversationId/messages',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List messages in conversation',
        tags: ['Messages'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            parentId: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['user', 'assistant', 'system'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of messages',
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
      const result = await messageService.list(tenantId, request.params.conversationId, {
        parentId: request.query.parentId,
        role: request.query.role as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== COMMENT ROUTES =====

  /**
   * Add comment to message
   * POST /api/v1/collaboration/conversations/:conversationId/messages/:messageId/comments
   */
  app.post<{ Params: { conversationId: string; messageId: string }; Body: { content: string } }>(
    '/api/v1/collaboration/conversations/:conversationId/messages/:messageId/comments',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Add comment to message',
        tags: ['Comments'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
            messageId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1 },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Comment added successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateCommentInput = {
        tenantId,
        userId,
        conversationId: request.params.conversationId,
        messageId: request.params.messageId,
        content: request.body.content,
      };

      const message = await commentService.addComment(input);
      reply.code(201).send(message);
    }
  );

  /**
   * Update comment
   * PUT /api/v1/collaboration/conversations/:conversationId/messages/:messageId/comments/:commentId
   */
  app.put<{ Params: { conversationId: string; messageId: string; commentId: string }; Body: { content: string } }>(
    '/api/v1/collaboration/conversations/:conversationId/messages/:messageId/comments/:commentId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update comment',
        tags: ['Comments'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
            messageId: { type: 'string', format: 'uuid' },
            commentId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Comment updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const message = await commentService.updateComment(
        tenantId,
        request.params.conversationId,
        request.params.messageId,
        request.params.commentId,
        userId,
        request.body.content
      );
      reply.send(message);
    }
  );

  /**
   * Delete comment
   * DELETE /api/v1/collaboration/conversations/:conversationId/messages/:messageId/comments/:commentId
   */
  app.delete<{ Params: { conversationId: string; messageId: string; commentId: string } }>(
    '/api/v1/collaboration/conversations/:conversationId/messages/:messageId/comments/:commentId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete comment',
        tags: ['Comments'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
            messageId: { type: 'string', format: 'uuid' },
            commentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Comment deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const message = await commentService.deleteComment(
        tenantId,
        request.params.messageId,
        request.params.commentId,
        userId
      );
      reply.send(message);
    }
  );

  // ===== REACTION ROUTES =====

  /**
   * Add reaction to message
   * POST /api/v1/collaboration/conversations/:conversationId/messages/:messageId/reactions
   */
  app.post<{ Params: { conversationId: string; messageId: string }; Body: { emoji: string } }>(
    '/api/v1/collaboration/conversations/:conversationId/messages/:messageId/reactions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Add reaction to message',
        tags: ['Reactions'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
            messageId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['emoji'],
          properties: {
            emoji: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Reaction added successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateReactionInput = {
        tenantId,
        userId,
        conversationId: request.params.conversationId,
        messageId: request.params.messageId,
        emoji: request.body.emoji,
      };

      const message = await reactionService.addReaction(input);
      reply.code(201).send(message);
    }
  );

  /**
   * Remove reaction from message
   * DELETE /api/v1/collaboration/conversations/:conversationId/messages/:messageId/reactions/:reactionId
   */
  app.delete<{ Params: { conversationId: string; messageId: string; reactionId: string } }>(
    '/api/v1/collaboration/conversations/:conversationId/messages/:messageId/reactions/:reactionId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Remove reaction from message',
        tags: ['Reactions'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
            messageId: { type: 'string', format: 'uuid' },
            reactionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Reaction removed successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const message = await reactionService.removeReaction(
        tenantId,
        request.params.messageId,
        request.params.reactionId,
        userId
      );
      reply.send(message);
    }
  );

  // ===== COLLABORATION INTELLIGENCE ROUTES (from collaboration-intelligence) =====

  /**
   * Generate collaborative insight
   * POST /api/v1/collaboration/insights
   */
  app.post<{ Body: { context: any } }>(
    '/api/v1/collaboration/insights',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Generate collaborative insight',
        tags: ['Collaboration Intelligence'],
        body: {
          type: 'object',
          required: ['context'],
          properties: {
            context: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Collaborative insight generated',
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { context } = request.body;
        const tenantId = request.user!.tenantId;
        const insight = await collaborationIntelligenceService.generateInsight(tenantId, context);
        return reply.status(201).send(insight);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INSIGHT_GENERATION_FAILED',
            message: error.message || 'Failed to generate collaborative insight',
          },
        });
      }
    }
  );
}
