/**
 * Message Service
 * Handles conversation message management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ConversationService } from './ConversationService';
import {
  ConversationMessage,
  CreateMessageInput,
  MessageStatus,
  MessageRole,
} from '../types/collaboration.types';

export class MessageService {
  private containerName = 'collaboration_messages';
  private conversationService: ConversationService;

  constructor(conversationService: ConversationService) {
    this.conversationService = conversationService;
  }

  /**
   * Create a new message
   */
  async create(input: CreateMessageInput): Promise<ConversationMessage> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.conversationId) {
      throw new BadRequestError('conversationId is required');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestError('content is required');
    }

    // Verify conversation exists and user is a participant
    const conversation = await this.conversationService.getById(
      input.conversationId,
      input.tenantId
    );
    const userParticipant = conversation.participants.find((p) => p.userId === input.userId);
    if (!userParticipant || !userParticipant.isActive) {
      throw new BadRequestError('User is not a participant in this conversation');
    }

    const message: ConversationMessage = {
      id: uuidv4(),
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      parentId: input.parentId,
      branchIndex: 0,
      role: MessageRole.USER,
      userId: input.userId,
      content: input.content,
      contentType: input.contentType || 'text',
      attachments: input.attachments || [],
      mentions: input.mentions || [],
      status: MessageStatus.COMPLETE,
      isRegenerated: false,
      regenerationCount: 0,
      comments: [],
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(message, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create message');
      }

      // Update conversation message count and last activity
      const updatedConversation = await this.conversationService.getById(
        input.conversationId,
        input.tenantId
      );
      await this.conversationService.update(input.conversationId, input.tenantId, {
        messageCount: updatedConversation.messageCount + 1,
      });

      return resource as ConversationMessage;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Message with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  async getById(messageId: string, tenantId: string): Promise<ConversationMessage> {
    if (!messageId || !tenantId) {
      throw new BadRequestError('messageId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(messageId, tenantId).read<ConversationMessage>();

      if (!resource) {
        throw new NotFoundError(`Message ${messageId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Message ${messageId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update message
   */
  async update(
    messageId: string,
    tenantId: string,
    input: {
      content?: string;
      status?: MessageStatus;
      pinned?: boolean;
    }
  ): Promise<ConversationMessage> {
    const existing = await this.getById(messageId, tenantId);

    // Only allow user who created the message to update it
    if (input.content && existing.userId && existing.userId !== (input as any).userId) {
      throw new BadRequestError('Only the message author can update the message');
    }

    const updated: ConversationMessage = {
      ...existing,
      ...input,
      pinnedAt: input.pinned ? new Date() : existing.pinnedAt,
      pinnedBy: input.pinned ? (input as any).userId : existing.pinnedBy,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(messageId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update message');
      }

      return resource as ConversationMessage;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Message ${messageId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete message
   */
  async delete(messageId: string, tenantId: string): Promise<void> {
    await this.getById(messageId, tenantId);

    const container = getContainer(this.containerName);
    await container.item(messageId, tenantId).delete();
  }

  /**
   * List messages in a conversation
   */
  async list(
    tenantId: string,
    conversationId: string,
    filters?: {
      parentId?: string;
      role?: MessageRole;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: ConversationMessage[]; continuationToken?: string }> {
    if (!tenantId || !conversationId) {
      throw new BadRequestError('tenantId and conversationId are required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.conversationId = @conversationId';
    const parameters: any[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@conversationId', value: conversationId },
    ];

    if (filters?.parentId) {
      query += ' AND c.parentId = @parentId';
      parameters.push({ name: '@parentId', value: filters.parentId });
    } else {
      // Only top-level messages by default
      query += ' AND (c.parentId = null OR c.parentId = undefined)';
    }

    if (filters?.role) {
      query += ' AND c.role = @role';
      parameters.push({ name: '@role', value: filters.role });
    }

    query += ' ORDER BY c.createdAt ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<ConversationMessage>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list messages: ${error.message}`);
    }
  }
}

