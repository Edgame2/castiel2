/**
 * Reaction Service
 * Handles message reactions
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MessageService } from './MessageService';
import {
  CreateReactionInput,
  MessageReaction,
  ConversationMessage,
} from '../types/collaboration.types';

export class ReactionService {
  private messageService: MessageService;

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  /**
   * Add reaction to message
   */
  async addReaction(input: CreateReactionInput): Promise<ConversationMessage> {
    if (!input.emoji) {
      throw new BadRequestError('emoji is required');
    }

    const message = await this.messageService.getById(input.messageId, input.tenantId);

    // Check if user already reacted with this emoji
    const existingReaction = (message.reactions || []).find(
      (r) => r.userId === input.userId && r.emoji === input.emoji
    );

    if (existingReaction) {
      throw new BadRequestError('User has already reacted with this emoji');
    }

    const reaction: MessageReaction = {
      id: uuidv4(),
      userId: input.userId,
      emoji: input.emoji,
      createdAt: new Date(),
    };

    const updated: ConversationMessage = {
      ...message,
      reactions: [...(message.reactions || []), reaction],
      updatedAt: new Date(),
    };

    const container = getContainer('collaboration_messages');
    const { resource } = await container.item(input.messageId, input.tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to add reaction');
    }

    return resource as ConversationMessage;
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    tenantId: string,
    messageId: string,
    reactionId: string,
    userId: string
  ): Promise<ConversationMessage> {
    const message = await this.messageService.getById(messageId, tenantId);

    // Find and remove reaction
    const updatedReactions = (message.reactions || []).filter(
      (r) => !(r.id === reactionId && r.userId === userId)
    );

    const updated: ConversationMessage = {
      ...message,
      reactions: updatedReactions,
      updatedAt: new Date(),
    };

    const container = getContainer('collaboration_messages');
    const { resource } = await container.item(messageId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to remove reaction');
    }

    return resource as ConversationMessage;
  }
}

