/**
 * Comment Service
 * Handles message comments
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { MessageService } from './MessageService';
import {
  CreateCommentInput,
  MessageComment,
  ConversationMessage,
} from '../types/collaboration.types';

export class CommentService {
  private messageService: MessageService;

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  /**
   * Add comment to message
   */
  async addComment(input: CreateCommentInput): Promise<ConversationMessage> {
    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestError('content is required');
    }

    const message = await this.messageService.getById(input.messageId, input.tenantId);

    const comment: MessageComment = {
      id: uuidv4(),
      userId: input.userId,
      content: input.content,
      createdAt: new Date(),
      reactions: [],
    };

    const updatedComments = [...(message.comments || []), comment];

    const updated: ConversationMessage = {
      ...message,
      comments: updatedComments,
      updatedAt: new Date(),
    };

    const container = getContainer('collaboration_messages');
    const { resource } = await container.item(input.messageId, input.tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to add comment');
    }

    return resource as ConversationMessage;
  }

  /**
   * Update comment
   */
  async updateComment(
    tenantId: string,
    conversationId: string,
    messageId: string,
    commentId: string,
    userId: string,
    content: string
  ): Promise<ConversationMessage> {
    const message = await this.messageService.getById(messageId, tenantId);

    const comment = message.comments?.find((c) => c.id === commentId);
    if (!comment) {
      throw new NotFoundError('Comment', commentId);
    }

    if (comment.userId !== userId) {
      throw new BadRequestError('Only the comment author can update the comment');
    }

    const updatedComments = message.comments!.map((c) =>
      c.id === commentId
        ? {
            ...c,
            content,
            updatedAt: new Date(),
            edited: true,
          }
        : c
    );

    const updated: ConversationMessage = {
      ...message,
      comments: updatedComments,
      updatedAt: new Date(),
    };

    const container = getContainer('collaboration_messages');
    const { resource } = await container.item(messageId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to update comment');
    }

    return resource as ConversationMessage;
  }

  /**
   * Delete comment
   */
  async deleteComment(
    tenantId: string,
    messageId: string,
    commentId: string,
    userId: string
  ): Promise<ConversationMessage> {
    const message = await this.messageService.getById(messageId, tenantId);

    const comment = message.comments?.find((c) => c.id === commentId);
    if (!comment) {
      throw new NotFoundError('Comment', commentId);
    }

    if (comment.userId !== userId) {
      throw new BadRequestError('Only the comment author can delete the comment');
    }

    const updatedComments = message.comments!.filter((c) => c.id !== commentId);

    const updated: ConversationMessage = {
      ...message,
      comments: updatedComments,
      updatedAt: new Date(),
    };

    const container = getContainer('collaboration_messages');
    const { resource } = await container.item(messageId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to delete comment');
    }

    return resource as ConversationMessage;
  }
}

