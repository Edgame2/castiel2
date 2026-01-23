import { v4 as uuidv4 } from 'uuid';
import { ShardEventType, } from '../types/shard-event.types.js';
// Redis channels for event distribution
const EVENT_CHANNEL_PREFIX = 'shard:events';
const SUBSCRIPTION_KEY_PREFIX = 'shard:subscriptions';
/**
 * Shard Event Service
 * Handles event emission, distribution via Redis pub/sub, and SSE broadcasting
 */
export class ShardEventService {
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
     * Initialize the event service
     * Sets up Redis subscriber and heartbeat
     */
    async initialize() {
        if (this.isListening) {
            return;
        }
        try {
            // Subscribe to shard events channel
            await this.subscriber.subscribe(`${EVENT_CHANNEL_PREFIX}:*`);
            // Handle incoming messages
            this.subscriber.on('pmessage', (_pattern, channel, message) => {
                this.handleRedisMessage(channel, message);
            });
            // Actually use pattern subscribe
            await this.subscriber.psubscribe(`${EVENT_CHANNEL_PREFIX}:*`);
            // Start heartbeat for SSE connections
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeats();
            }, 30000);
            this.isListening = true;
            this.monitoring.trackEvent('shardEvent.service.initialized');
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shardEvent.initialize',
            });
            throw error;
        }
    }
    /**
     * Shutdown the event service
     */
    async shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        // Close all SSE connections
        for (const [connectionId, connection] of this.connections) {
            try {
                connection.response.end();
            }
            catch {
                // Ignore errors during shutdown
            }
            this.connections.delete(connectionId);
        }
        await this.subscriber.punsubscribe(`${EVENT_CHANNEL_PREFIX}:*`);
        this.subscriber.disconnect();
        this.isListening = false;
        this.monitoring.trackEvent('shardEvent.service.shutdown');
    }
    /**
     * Emit a shard event
     * Publishes to Redis for distribution across instances
     */
    async emit(eventType, shard, options) {
        const eventId = uuidv4();
        const timestamp = new Date();
        const payload = {
            eventId,
            eventType,
            timestamp,
            tenantId: shard.tenantId,
            shardId: shard.id,
            shardTypeId: shard.shardTypeId,
            shardTypeName: shard.shardTypeName,
            triggeredBy: options.triggeredBy,
            triggerSource: options.triggerSource,
            changes: options.changes,
            previousState: options.previousState,
        };
        // Optionally include full shard snapshot
        if (options.includeSnapshot) {
            payload.shardSnapshot = {
                id: shard.id,
                tenantId: shard.tenantId,
                shardTypeId: shard.shardTypeId,
                shardTypeName: shard.shardTypeName,
                title: shard.structuredData?.title || shard.structuredData?.name,
                status: shard.status,
                structuredData: shard.structuredData,
                tags: shard.structuredData?.tags || [],
                createdAt: shard.createdAt,
                updatedAt: shard.updatedAt,
            };
        }
        // Publish to Redis channel for the tenant
        const channel = `${EVENT_CHANNEL_PREFIX}:${shard.tenantId}`;
        await this.redis.publish(channel, JSON.stringify(payload));
        this.monitoring.trackEvent('shardEvent.emitted', {
            eventType,
            tenantId: shard.tenantId,
            shardId: shard.id,
            triggerSource: options.triggerSource,
        });
        return payload;
    }
    /**
     * Emit a created event
     */
    async emitCreated(shard, options) {
        return this.emit(ShardEventType.CREATED, shard, { ...options, includeSnapshot: true });
    }
    /**
     * Emit an updated event with field changes
     */
    async emitUpdated(shard, previousShard, options) {
        const changes = this.computeChanges(previousShard, shard);
        return this.emit(ShardEventType.UPDATED, shard, {
            ...options,
            changes,
            previousState: {
                structuredData: previousShard.structuredData,
                title: previousShard.structuredData?.title || previousShard.structuredData?.name,
                status: previousShard.status,
                tags: previousShard.structuredData?.tags || [],
            },
            includeSnapshot: true,
        });
    }
    /**
     * Emit a deleted event
     */
    async emitDeleted(shard, options) {
        return this.emit(ShardEventType.DELETED, shard, {
            ...options,
            previousState: {
                structuredData: shard.structuredData,
                title: shard.structuredData?.title || shard.structuredData?.name,
                status: shard.status,
            },
        });
    }
    /**
     * Emit a restored event
     */
    async emitRestored(shard, options) {
        return this.emit(ShardEventType.RESTORED, shard, { ...options, includeSnapshot: true });
    }
    /**
     * Emit an archived event
     */
    async emitArchived(shard, options) {
        return this.emit(ShardEventType.ARCHIVED, shard, options);
    }
    /**
     * Emit a status changed event
     */
    async emitStatusChanged(shard, previousStatus, options) {
        return this.emit(ShardEventType.STATUS_CHANGED, shard, {
            ...options,
            changes: [{ field: 'status', oldValue: previousStatus, newValue: shard.status }],
            previousState: { status: previousStatus },
        });
    }
    /**
     * Emit a relationship added event
     */
    async emitRelationshipAdded(shard, relatedShardId, relationshipType, options) {
        return this.emit(ShardEventType.RELATIONSHIP_ADDED, shard, {
            ...options,
            changes: [
                { field: 'relationship', oldValue: null, newValue: { relatedShardId, type: relationshipType } },
            ],
        });
    }
    /**
     * Emit a relationship removed event
     */
    async emitRelationshipRemoved(shard, relatedShardId, relationshipType, options) {
        return this.emit(ShardEventType.RELATIONSHIP_REMOVED, shard, {
            ...options,
            changes: [
                { field: 'relationship', oldValue: { relatedShardId, type: relationshipType }, newValue: null },
            ],
        });
    }
    /**
     * Emit an enriched event
     */
    async emitEnriched(shard, options) {
        return this.emit(ShardEventType.ENRICHED, shard, options);
    }
    /**
     * Emit an ACL changed event
     */
    async emitACLChanged(shard, options) {
        return this.emit(ShardEventType.ACL_CHANGED, shard, options);
    }
    /**
     * Register an SSE connection
     */
    registerConnection(connectionId, tenantId, userId, response, subscription) {
        const connection = {
            id: connectionId,
            tenantId,
            userId,
            response,
            subscription: subscription || {},
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
        };
        this.connections.set(connectionId, connection);
        this.monitoring.trackEvent('shardEvent.connection.registered', {
            connectionId,
            tenantId,
            userId,
            totalConnections: this.connections.size,
        });
    }
    /**
     * Unregister an SSE connection
     */
    unregisterConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            this.connections.delete(connectionId);
            this.monitoring.trackEvent('shardEvent.connection.unregistered', {
                connectionId,
                tenantId: connection.tenantId,
                userId: connection.userId,
                totalConnections: this.connections.size,
            });
        }
    }
    /**
     * Update connection subscription filters
     */
    updateSubscription(connectionId, subscription) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.subscription = { ...connection.subscription, ...subscription };
        }
    }
    /**
     * Get connection count
     */
    getConnectionCount() {
        return this.connections.size;
    }
    /**
     * Get connections for a tenant
     */
    getConnectionsByTenant(tenantId) {
        return Array.from(this.connections.values()).filter(c => c.tenantId === tenantId);
    }
    /**
     * Handle incoming Redis message
     */
    handleRedisMessage(channel, message) {
        try {
            const payload = JSON.parse(message);
            this.broadcastToConnections(payload);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shardEvent.handleRedisMessage',
                channel,
            });
        }
    }
    /**
     * Broadcast event to matching SSE connections
     */
    broadcastToConnections(payload) {
        let sentCount = 0;
        for (const [connectionId, connection] of this.connections) {
            // Check if connection matches the event
            if (!this.matchesSubscription(connection, payload)) {
                continue;
            }
            // Send event to connection
            try {
                const eventData = JSON.stringify({
                    type: 'shard_event',
                    payload,
                });
                connection.response.write(`data: ${eventData}\n\n`);
                sentCount++;
            }
            catch (error) {
                // Connection likely closed, remove it
                this.monitoring.trackTrace(`Failed to send to connection ${connectionId}, removing`, 'Warning', // SeverityLevel
                {
                    connectionId,
                    error: error instanceof Error ? error.message : String(error),
                });
                this.connections.delete(connectionId);
            }
        }
        this.monitoring.trackMetric('shardEvent.broadcast', sentCount, {
            eventType: payload.eventType,
            tenantId: payload.tenantId,
        });
    }
    /**
     * Check if a connection's subscription matches the event
     */
    matchesSubscription(connection, payload) {
        const { tenantId, subscription } = connection;
        // Must be same tenant
        if (tenantId !== payload.tenantId) {
            return false;
        }
        // Check event type filter
        if (subscription.events && subscription.events.length > 0) {
            if (!subscription.events.includes(payload.eventType)) {
                return false;
            }
        }
        // Check shard type filter
        if (subscription.shardTypeIds && subscription.shardTypeIds.length > 0) {
            if (!subscription.shardTypeIds.includes(payload.shardTypeId)) {
                return false;
            }
        }
        // Check specific shard filter
        if (subscription.shardIds && subscription.shardIds.length > 0) {
            if (!subscription.shardIds.includes(payload.shardId)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Send heartbeats to all connections
     */
    sendHeartbeats() {
        const now = new Date();
        const heartbeatData = JSON.stringify({
            type: 'heartbeat',
            payload: { timestamp: now.toISOString() },
        });
        for (const [connectionId, connection] of this.connections) {
            try {
                connection.response.write(`data: ${heartbeatData}\n\n`);
                connection.lastHeartbeat = now;
            }
            catch {
                // Connection likely closed, remove it
                this.connections.delete(connectionId);
            }
        }
    }
    /**
     * Compute field changes between two shard versions
     */
    computeChanges(oldShard, newShard) {
        return ShardEventService.calculateChanges(oldShard, newShard);
    }
    /**
     * Static method to calculate field changes between two shard versions
     * Can be used without an instance of the service
     */
    static calculateChanges(oldShard, newShard) {
        const changes = [];
        // Check title change
        if (oldShard.title !== newShard.title) {
            changes.push({ field: 'title', oldValue: oldShard.title, newValue: newShard.title });
        }
        // Check status change
        if (oldShard.status !== newShard.status) {
            changes.push({ field: 'status', oldValue: oldShard.status, newValue: newShard.status });
        }
        // Check tags change
        const oldTags = JSON.stringify(oldShard.tags || []);
        const newTags = JSON.stringify(newShard.tags || []);
        if (oldTags !== newTags) {
            changes.push({ field: 'tags', oldValue: oldShard.tags, newValue: newShard.tags });
        }
        // Check structured data changes
        if (oldShard.structuredData && newShard.structuredData) {
            const oldData = oldShard.structuredData;
            const newData = newShard.structuredData;
            const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
            for (const key of allKeys) {
                const oldValue = oldData[key];
                const newValue = newData[key];
                const oldJson = JSON.stringify(oldValue);
                const newJson = JSON.stringify(newValue);
                if (oldJson !== newJson) {
                    changes.push({ field: `structuredData.${key}`, oldValue, newValue });
                }
            }
        }
        return changes;
    }
    /**
     * Queue event for webhook delivery (called by webhook delivery service)
     */
    async queueForWebhooks(payload) {
        const queueKey = `webhook:queue:${payload.tenantId}`;
        await this.redis.lpush(queueKey, JSON.stringify(payload));
        this.monitoring.trackEvent('shardEvent.queuedForWebhooks', {
            eventType: payload.eventType,
            tenantId: payload.tenantId,
            eventId: payload.eventId,
        });
    }
}
//# sourceMappingURL=shard-event.service.js.map