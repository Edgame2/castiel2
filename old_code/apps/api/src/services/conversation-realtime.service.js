/**
 * Conversation Real-Time Service
 * Handles real-time broadcasting of conversation events via Redis pub/sub
 */
/**
 * Conversation Real-Time Service
 * Broadcasts conversation events to connected clients via Redis pub/sub
 */
export class ConversationRealtimeService {
    redis;
    monitoring;
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    /**
     * Broadcast message added event
     */
    async broadcastMessageAdded(conversationId, tenantId, userId, message) {
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
    async broadcastMessageEdited(conversationId, tenantId, userId, message) {
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
    async broadcastMessageDeleted(conversationId, tenantId, userId, messageId) {
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
    async broadcastTypingStart(conversationId, tenantId, userId, userName) {
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
    async broadcastTypingStop(conversationId, tenantId, userId) {
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
    async broadcastConversationUpdated(conversationId, tenantId, userId) {
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
    async broadcast(payload) {
        try {
            const channel = `conversation:${payload.tenantId}:${payload.conversationId}`;
            await this.redis.publish(channel, JSON.stringify(payload));
            this.monitoring.trackMetric('conversation.realtime.broadcast', 1, {
                eventType: payload.type,
                conversationId: payload.conversationId,
                tenantId: payload.tenantId,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'conversation.realtime.broadcast',
                conversationId: payload.conversationId,
                tenantId: payload.tenantId,
            });
        }
    }
    /**
     * Set typing indicator (with TTL to auto-expire)
     */
    async setTypingIndicator(conversationId, tenantId, userId, userName, ttlSeconds = 5) {
        const key = `conversation:typing:${tenantId}:${conversationId}:${userId}`;
        await this.redis.setex(key, ttlSeconds, JSON.stringify({ userId, userName, timestamp: Date.now() }));
    }
    /**
     * Get active typing indicators for a conversation
     */
    async getTypingIndicators(conversationId, tenantId) {
        const pattern = `conversation:typing:${tenantId}:${conversationId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) {
            return [];
        }
        const values = await this.redis.mget(keys);
        const indicators = values
            .filter((v) => v !== null)
            .map(v => JSON.parse(v))
            .filter((indicator) => indicator && indicator.userId);
        return indicators;
    }
    /**
     * Clear typing indicator
     */
    async clearTypingIndicator(conversationId, tenantId, userId) {
        const key = `conversation:typing:${tenantId}:${conversationId}:${userId}`;
        await this.redis.del(key);
    }
}
//# sourceMappingURL=conversation-realtime.service.js.map