/**
 * Conversation Service
 * Handles conversation management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  ShareConversationInput,
  ConversationStatus,
  ConversationVisibility,
  ParticipantRole,
} from '../types/collaboration.types';

export class ConversationService {
  private containerName = 'collaboration_conversations';

  /**
   * Create a new conversation
   */
  async create(input: CreateConversationInput): Promise<Conversation> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.userId) {
      throw new BadRequestError('userId is required');
    }

    const participants = [
      {
        userId: input.userId,
        role: ParticipantRole.OWNER,
        joinedAt: new Date(),
        isActive: true,
      },
      ...(input.participants || []).map((userId) => ({
        userId,
        role: ParticipantRole.PARTICIPANT,
        joinedAt: new Date(),
        isActive: true,
      })),
    ];

    const conversation: Conversation = {
      id: uuidv4(),
      tenantId: input.tenantId,
      title: input.title,
      status: ConversationStatus.ACTIVE,
      visibility: input.visibility || ConversationVisibility.PRIVATE,
      assistantId: input.assistantId,
      templateId: input.templateId,
      defaultModelId: input.defaultModelId,
      participants,
      messageCount: 0,
      participantCount: participants.length,
      tags: input.tags || [],
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(conversation, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create conversation');
      }

      return resource as Conversation;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Conversation with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getById(conversationId: string, tenantId: string): Promise<Conversation> {
    if (!conversationId || !tenantId) {
      throw new BadRequestError('conversationId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(conversationId, tenantId).read<Conversation>();

      if (!resource) {
        throw new NotFoundError(`Conversation ${conversationId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Conversation ${conversationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async update(
    conversationId: string,
    tenantId: string,
    input: UpdateConversationInput
  ): Promise<Conversation> {
    const existing = await this.getById(conversationId, tenantId);

    const updated: Conversation = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(conversationId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update conversation');
      }

      return resource as Conversation;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Conversation ${conversationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete conversation (soft delete)
   */
  async delete(conversationId: string, tenantId: string): Promise<void> {
    await this.update(conversationId, tenantId, {
      status: ConversationStatus.DELETED,
    });
  }

  /**
   * Share conversation with users
   */
  async share(input: ShareConversationInput): Promise<Conversation> {
    const existing = await this.getById(input.conversationId, input.tenantId);

    // Check if user has permission to share
    const userParticipant = existing.participants.find((p) => p.userId === input.userId);
    if (!userParticipant || userParticipant.role === ParticipantRole.VIEWER) {
      throw new BadRequestError('User does not have permission to share this conversation');
    }

    // Add new participants
    const newParticipants = input.userIds
      .filter((userId) => !existing.participants.some((p) => p.userId === userId))
      .map((userId) => ({
        userId,
        role: input.role || ParticipantRole.PARTICIPANT,
        joinedAt: new Date(),
        isActive: true,
      }));

    const updated: Conversation = {
      ...existing,
      participants: [...existing.participants, ...newParticipants],
      participantCount: existing.participants.length + newParticipants.length,
      visibility: ConversationVisibility.SHARED,
      updatedAt: new Date(),
    };

    const container = getContainer(this.containerName);
    const { resource } = await container.item(input.conversationId, input.tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to share conversation');
    }

    return resource as Conversation;
  }

  /**
   * List conversations
   */
  async list(
    tenantId: string,
    filters?: {
      status?: ConversationStatus;
      visibility?: ConversationVisibility;
      userId?: string; // Filter by participant
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Conversation[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    } else {
      // Exclude deleted by default
      query += ' AND c.status != @deleted';
      parameters.push({ name: '@deleted', value: ConversationStatus.DELETED });
    }

    if (filters?.visibility) {
      query += ' AND c.visibility = @visibility';
      parameters.push({ name: '@visibility', value: filters.visibility });
    }

    query += ' ORDER BY c.lastActivityAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Conversation>({
          query,
          parameters,
        })
        .fetchNext();

      // Filter by participant if specified
      let filtered = resources;
      if (filters?.userId) {
        filtered = resources.filter((conv) =>
          conv.participants.some((p) => p.userId === filters.userId && p.isActive)
        );
      }

      return {
        items: filtered.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }
  }
}

