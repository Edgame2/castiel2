/**
 * Activity Aggregation Consumer
 * Consumes shard.created events (Email, Meeting, Message) and creates Activity and Interaction shards
 * @module integration-processors/consumers
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { BaseConsumer, ConsumerDependencies } from './index.js';
import { ActivityAggregationService, SourceShardData } from '../services/ActivityAggregationService.js';

interface ShardCreatedEvent {
  shardId: string;
  tenantId: string;
  shardTypeId: string;
  shardTypeName: string;
  structuredData: any;
}

/**
 * Activity Aggregation Consumer
 * Creates Activity and Interaction shards from Email, Meeting, and Message shards
 */
export class ActivityAggregationConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private activityAggregationService: ActivityAggregationService;

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
    this.activityAggregationService = new ActivityAggregationService(deps.shardManager);
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, activity aggregation consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    try {
      this.consumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: 'activity_aggregation',
        routingKeys: ['shard.created'],
        prefetch: 10, // Medium processing speed
      });

      // Handle shard.created events
      this.consumer.on('shard.created', async (event) => {
        await this.handleShardCreatedEvent(event.data as ShardCreatedEvent);
      });

      await this.consumer.connect();
      await this.consumer.start();

      log.info('Activity aggregation consumer started', {
        queue: 'activity_aggregation',
        service: 'integration-processors',
      });
    } catch (error: any) {
      log.error('Failed to start activity aggregation consumer', error, {
        service: 'integration-processors',
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop();
      this.consumer = null;
    }
  }

  /**
   * Handle shard.created event
   */
  private async handleShardCreatedEvent(event: ShardCreatedEvent): Promise<void> {
    const startTime = process.hrtime.bigint();
    const { shardId, tenantId, shardTypeName, structuredData } = event;

    // Only process Email, Meeting, and Message shards
    if (!['Email', 'Meeting', 'Message'].includes(shardTypeName)) {
      return; // Skip other shard types
    }

    try {
      log.info('Processing shard for activity aggregation', {
        shardId,
        shardTypeName,
        tenantId,
        service: 'integration-processors',
      });

      // Step 1: Create Activity shard from source shard
      const sourceShard: SourceShardData = {
        shardId,
        shardType: shardTypeName as 'Email' | 'Meeting' | 'Message',
        structuredData,
        tenantId,
      };

      const { shardId: activityShardId, structuredData: activityStructuredData } =
        await this.activityAggregationService.createActivityFromShard(sourceShard);

      log.info('Activity shard created', {
        activityShardId,
        sourceShardId: shardId,
        tenantId,
        service: 'integration-processors',
      });

      // Step 2: Create Interaction shards from Activity (using structuredData we already have)
      const interactionIds = await this.activityAggregationService.createInteractionsFromActivity(
        activityShardId,
        activityStructuredData,
        tenantId
      );

      log.info('Interactions created from activity', {
        activityShardId,
        interactionCount: interactionIds.length,
        tenantId,
        service: 'integration-processors',
      });

      // Step 4: Publish activity.created event
      await this.deps.eventPublisher.publish('activity.created', tenantId, {
        activityId: activityShardId,
        sourceShardId: shardId,
        sourceShardType: shardTypeName,
        interactionCount: interactionIds.length,
        tenantId,
      });

      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.info('Activity aggregation completed', {
        activityShardId,
        interactionCount: interactionIds.length,
        duration: durationMs,
        service: 'integration-processors',
      });
    } catch (error: any) {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e9;
      log.error('Failed to aggregate activity', error, {
        shardId,
        shardTypeName,
        tenantId,
        duration: durationMs,
        service: 'integration-processors',
      });

      // Publish activity aggregation failed event
      await this.deps.eventPublisher.publish('activity.aggregation.failed', tenantId, {
        shardId,
        shardTypeName,
        tenantId,
        error: error.message,
      });

      // Don't throw - allow other activities to be processed
    }
  }
}
