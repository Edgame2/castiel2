/**
 * Conversation Event Subscriber Service
 * Subscribes to Redis conversation channels and forwards events to SSE connections
 */
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ServerResponse } from 'http';
/**
 * Conversation Event Subscriber Service
 * Subscribes to Redis conversation channels and forwards events to SSE connections
 */
export declare class ConversationEventSubscriberService {
    private redis;
    private subscriber;
    private monitoring;
    private connections;
    private heartbeatInterval;
    private isListening;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Initialize the subscriber service
     * Sets up Redis subscriber for conversation events
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the subscriber service
     */
    shutdown(): Promise<void>;
    /**
     * Register an SSE connection for conversation events
     */
    registerConnection(connectionId: string, tenantId: string, userId: string, response: ServerResponse, conversationIds?: string[]): void;
    /**
     * Unregister an SSE connection
     */
    unregisterConnection(connectionId: string): void;
    /**
     * Subscribe a connection to specific conversations
     */
    subscribeToConversations(connectionId: string, conversationIds: string[]): void;
    /**
     * Unsubscribe a connection from specific conversations
     */
    unsubscribeFromConversations(connectionId: string, conversationIds: string[]): void;
    /**
     * Handle Redis message from conversation channel
     */
    private handleRedisMessage;
    /**
     * Broadcast event to matching SSE connections
     */
    private broadcastToConnections;
    /**
     * Send heartbeats to all connections
     */
    private sendHeartbeats;
}
//# sourceMappingURL=conversation-event-subscriber.service.d.ts.map