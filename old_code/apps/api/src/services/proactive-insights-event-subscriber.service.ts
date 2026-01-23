/**
 * Proactive Insights Event Subscriber Service
 * 
 * Subscribes to shard events via Redis pub/sub and evaluates event-driven triggers
 * for proactive insights. When a shard is created, updated, or deleted, this service
 * checks if any triggers have matching eventTriggers and evaluates them.
 */

import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { ProactiveInsightService } from './proactive-insight.service.js';
import { ShardEventType, ShardEventPayload } from '../types/shard-event.types.js';

// Redis channel prefix for shard events
const EVENT_CHANNEL_PREFIX = 'shard:events';

/**
 * Proactive Insights Event Subscriber Service
 */
export class ProactiveInsightsEventSubscriberService {
  private redis: Redis;
  private subscriber?: Redis;
  private monitoring: IMonitoringProvider;
  private proactiveInsightService: ProactiveInsightService;
  private isListening = false;

  constructor(
    redis: Redis,
    monitoring: IMonitoringProvider,
    proactiveInsightService: ProactiveInsightService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.proactiveInsightService = proactiveInsightService;
  }

  /**
   * Initialize the subscriber service
   * Sets up Redis subscriber for shard events
   */
  async initialize(): Promise<void> {
    if (this.isListening) {
      this.monitoring.trackEvent('proactive_insights_event_subscriber.already_listening');
      return;
    }

    try {
      // Create a duplicate Redis client for subscription
      // ioredis requires a separate client for pub/sub
      this.subscriber = this.redis.duplicate();

      // Setup message handlers
      this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
        this.handleRedisMessage(channel, message);
      });

      // Subscribe to all shard event channels using pattern matching
      await this.subscriber.psubscribe(`${EVENT_CHANNEL_PREFIX}:*`);

      this.isListening = true;
      this.monitoring.trackEvent('proactive_insights_event_subscriber.initialized');
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive_insights_event_subscriber.initialize',
      });
      throw error;
    }
  }

  /**
   * Shutdown the subscriber service
   */
  async shutdown(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      if (this.subscriber) {
        await this.subscriber.punsubscribe(`${EVENT_CHANNEL_PREFIX}:*`);
        await this.subscriber.quit();
      }

      this.isListening = false;
      this.monitoring.trackEvent('proactive_insights_event_subscriber.shutdown');
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive_insights_event_subscriber.shutdown',
      });
    }
  }

  /**
   * Handle incoming Redis message
   */
  private async handleRedisMessage(channel: string, message: string): Promise<void> {
    try {
      const payload: ShardEventPayload = JSON.parse(message);

      // Only process events that might trigger proactive insights
      // We're interested in CREATED and UPDATED events
      if (payload.eventType === ShardEventType.CREATED || payload.eventType === ShardEventType.UPDATED) {
        await this.processShardEvent(payload);
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive_insights_event_subscriber.handleMessage',
        channel,
      });
    }
  }

  /**
   * Process a shard event and evaluate event-driven triggers
   */
  private async processShardEvent(payload: ShardEventPayload): Promise<void> {
    const startTime = Date.now();

    try {
      const { tenantId, shardId, shardTypeId, eventType } = payload;

      // Map ShardEventType to event trigger string format
      const eventTriggerString = this.mapEventTypeToTriggerString(eventType);

      // Check triggers for this tenant that have matching eventTriggers
      // We'll evaluate triggers that:
      // 1. Are active
      // 2. Have eventTriggers that include this event type
      // 3. Apply to this shard type (or all shard types if not specified)

      // Get active triggers for tenant
      const triggers = await this.proactiveInsightService.getActiveTriggers(tenantId);

      // Filter triggers that match this event
      const matchingTriggers = triggers.filter((trigger) => {
        // Check if trigger has eventTriggers configured
        if (!trigger.eventTriggers || trigger.eventTriggers.length === 0) {
          return false;
        }

        // Check if event type matches
        if (!trigger.eventTriggers.includes(eventTriggerString)) {
          return false;
        }

        // Check if trigger applies to this shard type
        if (trigger.shardTypeId && trigger.shardTypeId !== shardTypeId) {
          return false;
        }

        return true;
      });

      if (matchingTriggers.length === 0) {
        // No matching triggers, nothing to do
        return;
      }

      this.monitoring.trackEvent('proactive_insights_event_subscriber.trigger_found', {
        tenantId,
        shardId,
        shardTypeId,
        eventType,
        matchingTriggersCount: matchingTriggers.length,
      });

      // Evaluate triggers for this specific shard
      // Use checkTriggers with shard-specific options
      const result = await this.proactiveInsightService.checkTriggers(tenantId, {
        triggerIds: matchingTriggers.map((t) => t.id),
        shardIds: [shardId],
        shardTypeIds: [shardTypeId],
      });

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('proactive_insights_event_subscriber.evaluation_duration_ms', duration, {
        tenantId,
        shardId,
        eventType,
      });

      this.monitoring.trackEvent('proactive_insights_event_subscriber.evaluation_completed', {
        tenantId,
        shardId,
        eventType,
        triggersEvaluated: result.triggersEvaluated,
        insightsGenerated: result.insightsGenerated.length,
        errors: result.errors.length,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        operation: 'proactive_insights_event_subscriber.processShardEvent',
        tenantId: payload.tenantId,
        shardId: payload.shardId,
        eventType: payload.eventType,
        durationMs: duration,
      });
    }
  }

  /**
   * Map ShardEventType enum to event trigger string format
   * Event triggers use strings like "shard.updated", "shard.created"
   */
  private mapEventTypeToTriggerString(eventType: ShardEventType): string {
    const mapping: Record<ShardEventType, string> = {
      [ShardEventType.CREATED]: 'shard.created',
      [ShardEventType.UPDATED]: 'shard.updated',
      [ShardEventType.DELETED]: 'shard.deleted',
      [ShardEventType.RESTORED]: 'shard.restored',
      [ShardEventType.ARCHIVED]: 'shard.archived',
      [ShardEventType.RELATIONSHIP_ADDED]: 'shard.relationship.added',
      [ShardEventType.RELATIONSHIP_REMOVED]: 'shard.relationship.removed',
      [ShardEventType.ENRICHED]: 'shard.enriched',
      [ShardEventType.STATUS_CHANGED]: 'shard.status.changed',
      [ShardEventType.ACL_CHANGED]: 'shard.acl.changed',
    };

    return mapping[eventType] || eventType;
  }

  /**
   * Check if the subscriber is listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }
}

