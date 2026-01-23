import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import {
  ShardEventType,
  ShardEventPayload,
  EventTriggerSource,
  FieldChange,
  EventSubscription,
} from '../types/shard-event.types.js';
import type { Shard } from '../types/shard.types.js';
import type { ServerResponse } from 'http';

// Redis channels for event distribution
const EVENT_CHANNEL_PREFIX = 'shard:events';
const SUBSCRIPTION_KEY_PREFIX = 'shard:subscriptions';

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
export class ShardEventService {
  private redis: Redis;
  private subscriber: Redis;
  private monitoring: IMonitoringProvider;
  private connections: Map<string, SSEConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isListening = false;

  constructor(redis: Redis, monitoring: IMonitoringProvider) {
    this.redis = redis;
    this.subscriber = redis.duplicate();
    this.monitoring = monitoring;
  }

  /**
   * Initialize the event service
   * Sets up Redis subscriber and heartbeat
   */
  async initialize(): Promise<void> {
    if (this.isListening) {return;}

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
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shardEvent.initialize',
      });
      throw error;
    }
  }

  /**
   * Shutdown the event service
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all SSE connections
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.response.end();
      } catch {
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
  async emit(
    eventType: ShardEventType,
    shard: Shard,
    options: EmitEventOptions
  ): Promise<ShardEventPayload> {
    const eventId = uuidv4();
    const timestamp = new Date();

    const payload: ShardEventPayload = {
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
        title: (shard.structuredData as any)?.title || (shard.structuredData as any)?.name,
        status: shard.status,
        structuredData: shard.structuredData,
        tags: (shard.structuredData as any)?.tags || [],
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
  async emitCreated(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload> {
    return this.emit(ShardEventType.CREATED, shard, { ...options, includeSnapshot: true });
  }

  /**
   * Emit an updated event with field changes
   */
  async emitUpdated(
    shard: Shard,
    previousShard: Shard,
    options: Omit<EmitEventOptions, 'previousState'>
  ): Promise<ShardEventPayload> {
    const changes = this.computeChanges(previousShard, shard);
    return this.emit(ShardEventType.UPDATED, shard, {
      ...options,
      changes,
      previousState: {
        structuredData: previousShard.structuredData,
        title: (previousShard.structuredData as any)?.title || (previousShard.structuredData as any)?.name,
        status: previousShard.status,
        tags: (previousShard.structuredData as any)?.tags || [],
      },
      includeSnapshot: true,
    });
  }

  /**
   * Emit a deleted event
   */
  async emitDeleted(shard: Shard, options: Omit<EmitEventOptions, 'changes'>): Promise<ShardEventPayload> {
    return this.emit(ShardEventType.DELETED, shard, {
      ...options,
      previousState: {
        structuredData: shard.structuredData,
        title: (shard.structuredData as any)?.title || (shard.structuredData as any)?.name,
        status: shard.status,
      },
    });
  }

  /**
   * Emit a restored event
   */
  async emitRestored(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload> {
    return this.emit(ShardEventType.RESTORED, shard, { ...options, includeSnapshot: true });
  }

  /**
   * Emit an archived event
   */
  async emitArchived(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload> {
    return this.emit(ShardEventType.ARCHIVED, shard, options);
  }

  /**
   * Emit a status changed event
   */
  async emitStatusChanged(
    shard: Shard,
    previousStatus: string,
    options: Omit<EmitEventOptions, 'changes' | 'previousState'>
  ): Promise<ShardEventPayload> {
    return this.emit(ShardEventType.STATUS_CHANGED, shard, {
      ...options,
      changes: [{ field: 'status', oldValue: previousStatus, newValue: shard.status }],
      previousState: { status: previousStatus },
    });
  }

  /**
   * Emit a relationship added event
   */
  async emitRelationshipAdded(
    shard: Shard,
    relatedShardId: string,
    relationshipType: string,
    options: Omit<EmitEventOptions, 'changes' | 'previousState'>
  ): Promise<ShardEventPayload> {
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
  async emitRelationshipRemoved(
    shard: Shard,
    relatedShardId: string,
    relationshipType: string,
    options: Omit<EmitEventOptions, 'changes' | 'previousState'>
  ): Promise<ShardEventPayload> {
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
  async emitEnriched(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload> {
    return this.emit(ShardEventType.ENRICHED, shard, options);
  }

  /**
   * Emit an ACL changed event
   */
  async emitACLChanged(shard: Shard, options: Omit<EmitEventOptions, 'changes' | 'previousState'>): Promise<ShardEventPayload> {
    return this.emit(ShardEventType.ACL_CHANGED, shard, options);
  }

  /**
   * Register an SSE connection
   */
  registerConnection(
    connectionId: string,
    tenantId: string,
    userId: string,
    response: ServerResponse,
    subscription?: Partial<EventSubscription>
  ): void {
    const connection: SSEConnection = {
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
  unregisterConnection(connectionId: string): void {
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
  updateSubscription(connectionId: string, subscription: Partial<EventSubscription>): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscription = { ...connection.subscription, ...subscription };
    }
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connections for a tenant
   */
  getConnectionsByTenant(tenantId: string): SSEConnection[] {
    return Array.from(this.connections.values()).filter(c => c.tenantId === tenantId);
  }

  /**
   * Handle incoming Redis message
   */
  private handleRedisMessage(channel: string, message: string): void {
    try {
      const payload = JSON.parse(message) as ShardEventPayload;
      this.broadcastToConnections(payload);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'shardEvent.handleRedisMessage',
        channel,
      });
    }
  }

  /**
   * Broadcast event to matching SSE connections
   */
  private broadcastToConnections(payload: ShardEventPayload): void {
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
      } catch (error) {
        // Connection likely closed, remove it
        this.monitoring.trackTrace(
          `Failed to send to connection ${connectionId}, removing`,
          'Warning' as any, // SeverityLevel
          {
            connectionId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
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
  private matchesSubscription(connection: SSEConnection, payload: ShardEventPayload): boolean {
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
  private sendHeartbeats(): void {
    const now = new Date();
    const heartbeatData = JSON.stringify({
      type: 'heartbeat',
      payload: { timestamp: now.toISOString() },
    });

    for (const [connectionId, connection] of this.connections) {
      try {
        connection.response.write(`data: ${heartbeatData}\n\n`);
        connection.lastHeartbeat = now;
      } catch {
        // Connection likely closed, remove it
        this.connections.delete(connectionId);
      }
    }
  }

  /**
   * Compute field changes between two shard versions
   */
  private computeChanges(oldShard: Shard, newShard: Shard): FieldChange[] {
    return ShardEventService.calculateChanges(oldShard, newShard);
  }

  /**
   * Static method to calculate field changes between two shard versions
   * Can be used without an instance of the service
   */
  static calculateChanges(oldShard: Shard, newShard: Shard): FieldChange[] {
    const changes: FieldChange[] = [];

    // Check title change
    if ((oldShard as any).title !== (newShard as any).title) {
      changes.push({ field: 'title', oldValue: (oldShard as any).title, newValue: (newShard as any).title });
    }

    // Check status change
    if (oldShard.status !== newShard.status) {
      changes.push({ field: 'status', oldValue: oldShard.status, newValue: newShard.status });
    }

    // Check tags change
    const oldTags = JSON.stringify((oldShard as any).tags || []);
    const newTags = JSON.stringify((newShard as any).tags || []);
    if (oldTags !== newTags) {
      changes.push({ field: 'tags', oldValue: (oldShard as any).tags, newValue: (newShard as any).tags });
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
  async queueForWebhooks(payload: ShardEventPayload): Promise<void> {
    const queueKey = `webhook:queue:${payload.tenantId}`;
    await this.redis.lpush(queueKey, JSON.stringify(payload));
    
    this.monitoring.trackEvent('shardEvent.queuedForWebhooks', {
      eventType: payload.eventType,
      tenantId: payload.tenantId,
      eventId: payload.eventId,
    });
  }
}
