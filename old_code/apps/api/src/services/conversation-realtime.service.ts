/**
 * Conversation Real-Time Service
 * Handles real-time broadcasting of conversation events via Redis pub/sub
 */

import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ConversationMessage } from '../types/conversation.types.js';

/**
 * Conversation event types
 */
export type ConversationEventType =
  | 'conversation.message.added'
  | 'conversation.message.edited'
  | 'conversation.message.deleted'
  | 'conversation.typing.start'
  | 'conversation.typing.stop'
  | 'conversation.updated';

/**
 * Conversation event payload
 */
export interface ConversationEventPayload {
  type: ConversationEventType;
  conversationId: string;
  tenantId: string;
  userId: string;
  timestamp: string;
  data?: {
    message?: ConversationMessage;
    messageId?: string;
    typingUserId?: string;
    typingUserName?: string;
  };
}

/**
 * Conversation Real-Time Service
 * Broadcasts conversation events to connected clients via Redis pub/sub
 */
export class ConversationRealtimeService {
  private redis: Redis;
  private monitoring: IMonitoringProvider;

  constructor(redis: Redis, monitoring: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;
  }

  /**
   * Broadcast message added event
   */
  async broadcastMessageAdded(
    conversationId: string,
    tenantId: string,
    userId: string,
    message: ConversationMessage
  ): Promise<void> {
    await this.broadcast({
      type: 'conversation.message.added',
      conversationId,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: { message },
    });
  }

  /**
   * Broadcast message edited event
   */
  async broadcastMessageEdited(
    conversationId: string,
    tenantId: string,
    userId: string,
    message: ConversationMessage
  ): Promise<void> {
    await this.broadcast({
      type: 'conversation.message.edited',
      conversationId,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: { message },
    });
  }

  /**
   * Broadcast message deleted event
   */
  async broadcastMessageDeleted(
    conversationId: string,
    tenantId: string,
    userId: string,
    messageId: string
  ): Promise<void> {
    await this.broadcast({
      type: 'conversation.message.deleted',
      conversationId,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: { messageId },
    });
  }

  /**
   * Broadcast typing start event
   */
  async broadcastTypingStart(
    conversationId: string,
    tenantId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.broadcast({
      type: 'conversation.typing.start',
      conversationId,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: { typingUserId: userId, typingUserName: userName },
    });
  }

  /**
   * Broadcast typing stop event
   */
  async broadcastTypingStop(
    conversationId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.broadcast({
      type: 'conversation.typing.stop',
      conversationId,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: { typingUserId: userId },
    });
  }

  /**
   * Broadcast conversation updated event
   */
  async broadcastConversationUpdated(
    conversationId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.broadcast({
      type: 'conversation.updated',
      conversationId,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast event to conversation participants
   */
  private async broadcast(payload: ConversationEventPayload): Promise<void> {
    try {
      const channel = `conversation:${payload.tenantId}:${payload.conversationId}`;
      await this.redis.publish(channel, JSON.stringify(payload));

      this.monitoring.trackMetric('conversation.realtime.broadcast', 1, {
        eventType: payload.type,
        conversationId: payload.conversationId,
        tenantId: payload.tenantId,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'conversation.realtime.broadcast',
        conversationId: payload.conversationId,
        tenantId: payload.tenantId,
      });
    }
  }

  /**
   * Set typing indicator (with TTL to auto-expire)
   */
  async setTypingIndicator(
    conversationId: string,
    tenantId: string,
    userId: string,
    userName: string,
    ttlSeconds = 5
  ): Promise<void> {
    const key = `conversation:typing:${tenantId}:${conversationId}:${userId}`;
    await this.redis.setex(key, ttlSeconds, JSON.stringify({ userId, userName, timestamp: Date.now() }));
  }

  /**
   * Get active typing indicators for a conversation
   */
  async getTypingIndicators(
    conversationId: string,
    tenantId: string
  ): Promise<Array<{ userId: string; userName: string; timestamp: number }>> {
    const pattern = `conversation:typing:${tenantId}:${conversationId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length === 0) {
      return [];
    }

    const values = await this.redis.mget(keys);
    const indicators = values
      .filter((v): v is string => v !== null)
      .map(v => JSON.parse(v))
      .filter((indicator: any) => indicator && indicator.userId);

    return indicators;
  }

  /**
   * Clear typing indicator
   */
  async clearTypingIndicator(
    conversationId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const key = `conversation:typing:${tenantId}:${conversationId}:${userId}`;
    await this.redis.del(key);
  }
}






