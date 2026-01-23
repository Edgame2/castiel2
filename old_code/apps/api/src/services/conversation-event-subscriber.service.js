/**
 * Conversation Event Subscriber Service
 * Subscribes to Redis conversation channels and forwards events to SSE connections
 */
/**
 * Conversation Event Subscriber Service
 * Subscribes to Redis conversation channels and forwards events to SSE connections
 */
export class ConversationEventSubscriberService {
    redis;
    subscriber;
    monitoring;
    connections = new Map();
    heartbeatInterval = null;
    isListening = false;
    constructor(redis, monitoring) {
        this.redis = redis;
        this.subscriber = redis.duplicate();
        this.monitoring = monitoring;
    }
    /**
     * Initialize the subscriber service
     * Sets up Redis subscriber for conversation events
     */
    async initialize() {
        if (this.isListening) {
            return;
        }
        try {
            // Subscribe to all conversation event channels using pattern matching
            await this.subscriber.psubscribe('conversation:*');
            // Handle incoming messages
            this.subscriber.on('pmessage', (_pattern, channel, message) => {
                this.handleRedisMessage(channel, message);
            });
            // Start heartbeat for SSE connections
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeats();
            }, 30000);
            this.isListening = true;
            this.monitoring.trackEvent('conversationEvent.subscriber.initialized');
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'conversationEvent.subscriber.initialize',
            });
            throw error;
        }
    }
    /**
     * Shutdown the subscriber service
     */
    async shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        // Unsubscribe from Redis
        try {
            await this.subscriber.punsubscribe('conversation:*');
            await this.subscriber.quit();
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'conversationEvent.subscriber.shutdown',
            });
        }
        // Close all SSE connections
        for (const [connectionId, connection] of this.connections) {
            try {
                connection.response.end();
            }
            catch {
                // Ignore errors during shutdown
            }
        }
        this.connections.clear();
        this.isListening = false;
    }
    /**
     * Register an SSE connection for conversation events
     */
    registerConnection(connectionId, tenantId, userId, response, conversationIds) {
        const connection = {
            id: connectionId,
            tenantId,
            userId,
            response,
            conversationIds: new Set(conversationIds || []),
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
        };
        this.connections.set(connectionId, connection);
        this.monitoring.trackEvent('conversationEvent.connection.registered', {
            connectionId,
            tenantId,
            userId,
            conversationCount: conversationIds?.length || 0,
        });
    }
    /**
     * Unregister an SSE connection
     */
    unregisterConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            this.connections.delete(connectionId);
            this.monitoring.trackEvent('conversationEvent.connection.unregistered', {
                connectionId,
                tenantId: connection.tenantId,
                userId: connection.userId,
            });
        }
    }
    /**
     * Subscribe a connection to specific conversations
     */
    subscribeToConversations(connectionId, conversationIds) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            conversationIds.forEach(id => connection.conversationIds.add(id));
            this.monitoring.trackEvent('conversationEvent.connection.subscribed', {
                connectionId,
                conversationCount: conversationIds.length,
            });
        }
    }
    /**
     * Unsubscribe a connection from specific conversations
     */
    unsubscribeFromConversations(connectionId, conversationIds) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            conversationIds.forEach(id => connection.conversationIds.delete(id));
            this.monitoring.trackEvent('conversationEvent.connection.unsubscribed', {
                connectionId,
                conversationCount: conversationIds.length,
            });
        }
    }
    /**
     * Handle Redis message from conversation channel
     */
    handleRedisMessage(channel, message) {
        try {
            // Parse channel: conversation:{tenantId}:{conversationId}
            const parts = channel.split(':');
            if (parts.length !== 3 || parts[0] !== 'conversation') {
                return; // Not a conversation channel
            }
            const tenantId = parts[1];
            const conversationId = parts[2];
            // Parse event payload
            const payload = JSON.parse(message);
            // Broadcast to matching connections
            this.broadcastToConnections(payload, tenantId, conversationId);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'conversationEvent.handleRedisMessage',
                channel,
            });
        }
    }
    /**
     * Broadcast event to matching SSE connections
     */
    broadcastToConnections(payload, tenantId, conversationId) {
        let sentCount = 0;
        for (const [connectionId, connection] of this.connections) {
            // Check if connection matches
            if (connection.tenantId !== tenantId) {
                continue; // Different tenant
            }
            // Check if connection is subscribed to this conversation
            // If conversationIds is empty, subscribe to all conversations for that tenant
            if (connection.conversationIds.size > 0 && !connection.conversationIds.has(conversationId)) {
                continue; // Not subscribed to this conversation
            }
            // Send event to connection
            try {
                const eventData = JSON.stringify({
                    type: payload.type,
                    payload,
                });
                connection.response.write(`event: ${payload.type}\n`);
                connection.response.write(`data: ${eventData}\n\n`);
                connection.lastHeartbeat = new Date();
                sentCount++;
            }
            catch (error) {
                // Connection likely closed, remove it
                this.monitoring.trackTrace(`Failed to send to connection ${connectionId}, removing`, 'warn');
                this.connections.delete(connectionId);
            }
        }
        this.monitoring.trackMetric('conversationEvent.broadcast', sentCount, {
            eventType: payload.type,
            conversationId,
            tenantId,
        });
    }
    /**
     * Send heartbeats to all connections
     */
    sendHeartbeats() {
        const now = new Date();
        const staleThreshold = 60000; // 60 seconds
        for (const [connectionId, connection] of this.connections) {
            try {
                // Check if connection is stale
                if (now.getTime() - connection.lastHeartbeat.getTime() > staleThreshold) {
                    // Connection appears stale, try to send heartbeat
                    connection.response.write(`data: ${JSON.stringify({
                        type: 'heartbeat',
                        payload: { timestamp: now.toISOString() }
                    })}\n\n`);
                    connection.lastHeartbeat = now;
                }
            }
            catch (error) {
                // Connection likely closed, remove it
                this.connections.delete(connectionId);
            }
        }
    }
}
//# sourceMappingURL=conversation-event-subscriber.service.js.map