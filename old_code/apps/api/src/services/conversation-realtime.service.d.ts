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
export type ConversationEventType = 'conversation.message.added' | 'conversation.message.edited' | 'conversation.message.deleted' | 'conversation.typing.start' | 'conversation.typing.stop' | 'conversation.updated';
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
export declare class ConversationRealtimeService {
    private redis;
    private monitoring;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Broadcast message added event
     */
    broadcastMessageAdded(conversationId: string, tenantId: string, userId: string, message: ConversationMessage): Promise<void>;
    /**
     * Broadcast message edited event
     */
    broadcastMessageEdited(conversationId: string, tenantId: string, userId: string, message: ConversationMessage): Promise<void>;
    /**
     * Broadcast message deleted event
     */
    broadcastMessageDeleted(conversationId: string, tenantId: string, userId: string, messageId: string): Promise<void>;
    /**
     * Broadcast typing start event
     */
    broadcastTypingStart(conversationId: string, tenantId: string, userId: string, userName: string): Promise<void>;
    /**
     * Broadcast typing stop event
     */
    broadcastTypingStop(conversationId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * Broadcast conversation updated event
     */
    broadcastConversationUpdated(conversationId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * Broadcast event to conversation participants
     */
    private broadcast;
    /**
     * Set typing indicator (with TTL to auto-expire)
     */
    setTypingIndicator(conversationId: string, tenantId: string, userId: string, userName: string, ttlSeconds?: number): Promise<void>;
    /**
     * Get active typing indicators for a conversation
     */
    getTypingIndicators(conversationId: string, tenantId: string): Promise<Array<{
        userId: string;
        userName: string;
        timestamp: number;
    }>>;
    /**
     * Clear typing indicator
     */
    clearTypingIndicator(conversationId: string, tenantId: string, userId: string): Promise<void>;
}
//# sourceMappingURL=conversation-realtime.service.d.ts.map