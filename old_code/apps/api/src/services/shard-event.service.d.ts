import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardEventType, ShardEventPayload, EventTriggerSource, FieldChange, EventSubscription } from '../types/shard-event.types.js';
import type { Shard } from '../types/shard.types.js';
import type { ServerResponse } from 'http';
/**
 * Connected SSE client
 */
interface SSEConnection {
    id: string;
    tenantId: string;
    userId: string;
    response: ServerResponse;
    subscription: Partial<EventSubscription>;
    connectedAt: Date;
    lastHeartbeat: Date;
}
/**
 * Options for emitting events
 */
export interface EmitEventOptions {
    triggerSource: EventTriggerSource;
    triggeredBy: string;
    changes?: FieldChange[];
    previousState?: Record<string, any>;
    includeSnapshot?: boolean;
}
/**
 * Shard Event Service
 * Handles event emission, distribution via Redis pub/sub, and SSE broadcasting
 */
export declare class ShardEventService {
    private redis;
    private subscriber;
    private monitoring;
    private connections;
    private heartbeatInterval;
    private isListening;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Initialize the event service
     * Sets up Redis subscriber and heartbeat
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the event service
     */
    shutdown(): Promise<void>;
    /**
     * Emit a shard event
     * Publishes to Redis for distribution across instances
     */
    emit(eventType: ShardEventType, shard: Shard, options: EmitEventOptions): Promise<ShardEventPayload>;
    /**
     * Emit a created event
     */
    emitCreated(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit an updated event with field changes
     */
    emitUpdated(shard: Shard, previousShard: Shard, options: Omit<EmitEventOptions, 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit a deleted event
     */
    emitDeleted(shard: Shard, options: Omit<EmitEventOptions, 'changes'>): Promise<ShardEventPayload>;
    /**
     * Emit a restored event
     */
    emitRestored(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit an archived event
     */
    emitArchived(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit a status changed event
     */
    emitStatusChanged(shard: Shard, previousStatus: string, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit a relationship added event
     */
    emitRelationshipAdded(shard: Shard, relatedShardId: string, relationshipType: string, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit a relationship removed event
     */
    emitRelationshipRemoved(shard: Shard, relatedShardId: string, relationshipType: string, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit an enriched event
     */
    emitEnriched(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Emit an ACL changed event
     */
    emitACLChanged(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload>;
    /**
     * Register an SSE connection
     */
    registerConnection(connectionId: string, tenantId: string, userId: string, response: ServerResponse, subscription?: Partial<EventSubscription>): void;
    /**
     * Unregister an SSE connection
     */
    unregisterConnection(connectionId: string): void;
    /**
     * Update connection subscription filters
     */
    updateSubscription(connectionId: string, subscription: Partial<EventSubscription>): void;
    /**
     * Get connection count
     */
    getConnectionCount(): number;
    /**
     * Get connections for a tenant
     */
    getConnectionsByTenant(tenantId: string): SSEConnection[];
    /**
     * Handle incoming Redis message
     */
    private handleRedisMessage;
    /**
     * Broadcast event to matching SSE connections
     */
    private broadcastToConnections;
    /**
     * Check if a connection's subscription matches the event
     */
    private matchesSubscription;
    /**
     * Send heartbeats to all connections
     */
    private sendHeartbeats;
    /**
     * Compute field changes between two shard versions
     */
    private computeChanges;
    /**
     * Static method to calculate field changes between two shard versions
     * Can be used without an instance of the service
     */
    static calculateChanges(oldShard: Shard, newShard: Shard): FieldChange[];
    /**
     * Queue event for webhook delivery (called by webhook delivery service)
     */
    queueForWebhooks(payload: ShardEventPayload): Promise<void>;
}
export {};
//# sourceMappingURL=shard-event.service.d.ts.map