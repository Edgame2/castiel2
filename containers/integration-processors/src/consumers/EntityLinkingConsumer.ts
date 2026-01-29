/**
 * Entity Linking Consumer
 * Consumes shard.created events (Document, Email, Message, Meeting), performs deep entity linking, and creates relationships
 * @module integration-processors/consumers
 */

import { EventConsumer, EntityLinkingService, OpportunityEventDebouncer } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { BaseConsumer, ConsumerDependencies } from './index';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shard types that should be processed for entity linking
 */
const LINKABLE_SHARD_TYPES = ['document', 'email', 'message', 'meeting', 'calendarevent'];
const LINKABLE_SHARD_TYPE_NAMES = ['Document', 'Email', 'Message', 'Meeting', 'CalendarEvent'];

/**
 * Relationship types for different shard types
 * Maps source shard type to relationship type when linking to opportunities
 */
const RELATIONSHIP_TYPE_MAP: Record<string, string> = {
  document: 'attached_to', // Document attached to opportunity
  email: 'mentioned_in', // Email mentioned in opportunity context
  message: 'mentioned_in', // Message mentioned in opportunity context
  meeting: 'meeting_for', // Meeting for opportunity
  calendarevent: 'event_in_calendar', // Calendar event for opportunity
};

export class EntityLinkingConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;
  private entityLinkingService: EntityLinkingService;
  private opportunityDebouncer: OpportunityEventDebouncer;
  private opportunityEventBuffer: Map<string, { opportunityIds: Set<string>; timer: NodeJS.Timeout }> = new Map();

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
    this.entityLinkingService = new EntityLinkingService(deps.shardManager, deps.aiService);
    
    // Initialize opportunity event debouncer (Redis-based for distributed debouncing)
    this.opportunityDebouncer = new OpportunityEventDebouncer({
      debounceWindowMs: 5000, // 5 seconds
      useRedis: true,
      fallbackToMemory: true,
    });
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, entity linking consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    this.consumer = new EventConsumer({
      url: this.config.rabbitmq.url,
      exchange: this.config.rabbitmq.exchange || 'coder_events',
      queue: 'entity_linking',
      routingKeys: ['shard.created'],
      prefetch: this.config.mapping?.prefetch || 20,
    });

    // Register handler for shard.created events
    this.consumer.on('shard.created', async (event) => {
      await this.handleShardCreated(event);
    });

    await this.consumer.connect();
    await this.consumer.start();

    log.info('Entity Linking Consumer started', {
      queue: 'entity_linking',
      service: 'integration-processors',
    });
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop();
      this.consumer = null;
    }

    // Flush opportunity event buffer (from Redis debouncer)
    if (this.opportunityDebouncer) {
      const pendingEvents = await this.opportunityDebouncer.getAllPendingEvents();
      // Group by tenantId for batch publishing
      const byTenant = new Map<string, Set<string>>();
      for (const buffer of pendingEvents) {
        const tenantId = buffer.eventData.tenantId;
        if (!byTenant.has(tenantId)) {
          byTenant.set(tenantId, new Set());
        }
        byTenant.get(tenantId)!.add(buffer.opportunityId);
      }
      
      for (const [tenantId, opportunityIds] of byTenant.entries()) {
        await this.flushOpportunityEvents(tenantId, opportunityIds);
      }
      
      this.opportunityDebouncer.stop();
    }
    
    // Also flush in-memory buffer (legacy fallback)
    for (const [key, buffer] of this.opportunityEventBuffer.entries()) {
      clearTimeout(buffer.timer);
      await this.flushOpportunityEvents(key, buffer.opportunityIds);
    }
    this.opportunityEventBuffer.clear();
  }

  /**
   * Handle shard.created event
   */
  private async handleShardCreated(event: any): Promise<void> {
    const shardId = event.data?.shardId ?? event.data?.id;
    const tenantId = event.tenantId ?? event.data?.tenantId;
    const shardTypeId = event.data?.shardTypeId;
    const shardTypeName = event.data?.shardTypeName;

    if (!shardId || !tenantId) {
      log.warn('shard.created missing shardId or tenantId', {
        hasData: !!event.data,
        tenantId: event.tenantId,
        service: 'integration-processors',
      });
      return;
    }

    // Only process linkable shard types
    const isLinkable =
      LINKABLE_SHARD_TYPES.includes(shardTypeId?.toLowerCase()) ||
      LINKABLE_SHARD_TYPE_NAMES.includes(shardTypeName);

    if (!isLinkable) {
      return; // Not a linkable shard type, skip
    }

    log.debug('Processing shard for entity linking', {
      shardId,
      shardTypeId,
      shardTypeName,
      tenantId,
      service: 'integration-processors',
    });

    try {
      // Get shard data
      const shard = await this.getShard(shardId, tenantId);
      if (!shard) {
        log.warn('Shard not found', { shardId, tenantId, service: 'integration-processors' });
        return;
      }

      // Perform deep linking
      const links = await this.entityLinkingService.deepLink(shard, tenantId);

      // Merge with any existing fast links (from shard creation)
      // Note: Fast links would have been created during shard creation, but we don't have access to them here
      // This is fine - we'll just process deep links and create relationships/suggestions

      // Process links based on confidence
      const autoLinkedOpportunities: string[] = [];
      const suggestedLinks: Array<{ link: any; entityType: string }> = [];

      // Process opportunity links
      for (const link of links.opportunities) {
        if (link.confidence >= 0.8) {
          // Auto-link: Create relationship immediately
          await this.createRelationship(shardId, link.id, tenantId, shardTypeId, 'opportunity');
          autoLinkedOpportunities.push(link.id);
        } else if (link.confidence >= 0.6) {
          // Suggest: Store for user review
          suggestedLinks.push({ link, entityType: 'opportunity' });
        }
        // Ignore links with confidence < 60%
      }

      // Process account links
      for (const link of links.accounts) {
        if (link.confidence >= 0.8) {
          await this.createRelationship(shardId, link.id, tenantId, shardTypeId, 'account');
        } else if (link.confidence >= 0.6) {
          suggestedLinks.push({ link, entityType: 'account' });
        }
      }

      // Process contact links
      for (const link of links.contacts) {
        if (link.confidence >= 0.8) {
          await this.createRelationship(shardId, link.id, tenantId, shardTypeId, 'contact');
        } else if (link.confidence >= 0.6) {
          suggestedLinks.push({ link, entityType: 'contact' });
        }
      }

      // Store suggested links
      if (suggestedLinks.length > 0) {
        await this.storeSuggestedLinks(shardId, tenantId, suggestedLinks);
      }

      // Trigger opportunity ML field updates for auto-linked opportunities
      if (autoLinkedOpportunities.length > 0) {
        await this.scheduleOpportunityMLUpdate(tenantId, autoLinkedOpportunities);
      }

      log.info('Entity linking completed', {
        shardId,
        autoLinked: autoLinkedOpportunities.length,
        suggested: suggestedLinks.length,
        service: 'integration-processors',
      });
    } catch (error) {
      log.error('Failed to process entity linking', error, {
        shardId,
        tenantId,
        service: 'integration-processors',
      });
      // Don't throw - allow other events to process
    }
  }

  /**
   * Get shard data from shard-manager
   */
  private async getShard(shardId: string, tenantId: string): Promise<any> {
    try {
      const response = await this.deps.shardManager.get(`/api/v1/shards/${shardId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
      return response;
    } catch (error) {
      log.error('Failed to get shard', error, {
        shardId,
        tenantId,
        service: 'integration-processors',
      });
      throw error;
    }
  }

  /**
   * Create a relationship between two shards
   */
  private async createRelationship(
    sourceShardId: string,
    targetShardId: string,
    tenantId: string,
    sourceShardTypeId: string,
    _targetShardTypeId: string
  ): Promise<void> {
    try {
      const relationshipType = RELATIONSHIP_TYPE_MAP[sourceShardTypeId.toLowerCase()] || 'RELATED_TO';

      await this.deps.shardManager.post(
        '/api/v1/relationships',
        {
          sourceShardId,
          targetShardId,
          relationshipType,
          bidirectional: true,
          metadata: {
            autoLinked: true,
            source: 'entity_linking',
          },
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      log.debug('Created relationship', {
        sourceShardId,
        targetShardId,
        relationshipType,
        service: 'integration-processors',
      });
    } catch (error: any) {
      // Ignore if relationship already exists
      if (error.statusCode === 400 && error.message?.includes('already exists')) {
        log.debug('Relationship already exists', {
          sourceShardId,
          targetShardId,
          service: 'integration-processors',
        });
        return;
      }
      log.error('Failed to create relationship', error, {
        sourceShardId,
        targetShardId,
        tenantId,
        service: 'integration-processors',
      });
      throw error;
    }
  }

  /**
   * Store suggested links in Cosmos DB
   */
  private async storeSuggestedLinks(
    sourceShardId: string,
    tenantId: string,
    suggestedLinks: Array<{ link: any; entityType: string }>
  ): Promise<void> {
    try {
      const container = getContainer(this.config.cosmos_db.containers.suggested_links);

      for (const { link, entityType } of suggestedLinks) {
        const suggestedLink = {
          id: uuidv4(),
          tenantId,
          sourceShardId,
          targetShardId: link.id,
          targetShardTypeId: link.shardTypeId,
          targetShardTypeName: link.shardTypeName,
          entityType,
          confidence: link.confidence,
          strategy: link.strategy,
          status: 'pending_review',
          metadata: link.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
          // TTL: 30 days (2592000 seconds)
          ttl: 2592000,
        };

        await container.items.create(suggestedLink, { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]);
      }

      log.debug('Stored suggested links', {
        sourceShardId,
        count: suggestedLinks.length,
        service: 'integration-processors',
      });
    } catch (error) {
      log.error('Failed to store suggested links', error, {
        sourceShardId,
        tenantId,
        service: 'integration-processors',
      });
      // Don't throw - non-critical
    }
  }

  /**
   * Schedule opportunity ML field update (with Redis-based debouncing)
   */
  private async scheduleOpportunityMLUpdate(tenantId: string, opportunityIds: string[]): Promise<void> {
    // Use Redis-based debouncing for distributed coordination across consumer instances
    if (this.opportunityDebouncer) {
      // Schedule each opportunity individually (debouncer groups by opportunity)
      for (const opportunityId of opportunityIds) {
        const { shouldPublish } = await this.opportunityDebouncer.scheduleOpportunityEvent(
          opportunityId,
          opportunityId, // Use opportunityId as shardId for entity linking
          {
            integrationId: 'entity_linking',
            tenantId,
            syncTaskId: '',
            correlationId: '',
            metadata: { reason: 'entity_linking', trigger: 'entity_linked' },
          }
        );

        if (shouldPublish) {
          // No debouncing available - publish immediately
          await this.flushOpportunityEvents(tenantId, new Set([opportunityId]));
        }
        // Otherwise, event is debounced and will be published after 5-second window
      }
    } else {
      // Fallback to in-memory debouncing (legacy)
      const bufferKey = tenantId;
      const existing = this.opportunityEventBuffer.get(bufferKey);

      if (existing) {
        // Add new opportunity IDs to existing set
        opportunityIds.forEach((id) => existing.opportunityIds.add(id));
        // Clear existing timer
        clearTimeout(existing.timer);
      } else {
        // Create new buffer
        this.opportunityEventBuffer.set(bufferKey, {
          opportunityIds: new Set(opportunityIds),
          timer: null as any, // Will be set below
        });
      }

      const buffer = this.opportunityEventBuffer.get(bufferKey)!;

      // Set new timer (5-second window)
      buffer.timer = setTimeout(async () => {
        await this.flushOpportunityEvents(bufferKey, buffer.opportunityIds);
        this.opportunityEventBuffer.delete(bufferKey);
      }, 5000);
    }
  }

  /**
   * Flush opportunity events (publish ML field update events)
   */
  private async flushOpportunityEvents(tenantId: string, opportunityIds: Set<string>): Promise<void> {
    if (opportunityIds.size === 0) {
      return;
    }

    const ids = Array.from(opportunityIds);

    try {
      // Publish batch event for all opportunities
      await this.deps.eventPublisher.publish(
        'integration.opportunity.ml_fields_updated',
        tenantId,
        {
          tenantId,
          opportunityIds: ids,
          reason: 'entity_linking',
          trigger: 'entity_linked',
          batchSize: ids.length,
        }
      );

      log.info('Published opportunity ML fields update event', {
        tenantId,
        opportunityCount: ids.length,
        service: 'integration-processors',
      });
    } catch (error) {
      log.error('Failed to publish opportunity ML fields update event', error, {
        tenantId,
        opportunityCount: ids.length,
        service: 'integration-processors',
      });
    }
  }
}
