/**
 * ML Field Aggregation Consumer
 * Consumes shard.created events (Opportunity), calculates relationship counts, and updates opportunity shards
 * @module integration-processors/consumers
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { BaseConsumer, ConsumerDependencies } from './index';

interface ShardCreatedEvent {
  shardId?: string;
  id?: string;
  tenantId?: string;
  shardTypeId: string;
  shardTypeName?: string;
  opportunityId?: string;
}

interface RelationshipCounts {
  documentCount: number;
  emailCount: number;
  meetingCount: number;
  callCount: number;
  competitorCount: number;
  stakeholderCount: number;
}

export class MLFieldAggregationConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, ML field aggregation consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    this.consumer = new EventConsumer({
      url: this.config.rabbitmq.url,
      exchange: this.config.rabbitmq.exchange || 'coder_events',
      queue: 'shard_ml_aggregation',
      routingKeys: ['shard.created'],
      prefetch: this.config.mapping?.prefetch || 20,
    });

    // Register handler for shard.created events
    this.consumer.on('shard.created', async (event) => {
      await this.handleShardCreated(event);
    });

    await this.consumer.connect();
    await this.consumer.start();

    log.info('ML Field Aggregation Consumer started', {
      queue: 'shard_ml_aggregation',
      service: 'integration-processors',
    });
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
  private async handleShardCreated(event: any): Promise<void> {
    const data = event.data as ShardCreatedEvent | undefined;
    const shardId = data?.shardId ?? data?.id;
    const tenantId = event.tenantId ?? data?.tenantId;
    const shardTypeId = data?.shardTypeId;
    const shardTypeName = data?.shardTypeName;

    if (!shardId || !tenantId) {
      log.warn('shard.created missing shardId or tenantId', {
        hasData: !!data,
        tenantId: event.tenantId,
        service: 'integration-processors',
      });
      return;
    }

    // Only process Opportunity shards
    if (shardTypeId !== 'opportunity' && shardTypeName !== 'Opportunity') {
      return; // Not an opportunity, skip
    }

    const opportunityId = data?.opportunityId ?? shardId;

    log.debug('Processing opportunity shard for ML field aggregation', {
      shardId,
      opportunityId,
      tenantId,
      service: 'integration-processors',
    });

    try {
      // Get current opportunity shard to check existing counts
      const opportunityShard = await this.getOpportunityShard(shardId, tenantId);
      if (!opportunityShard) {
        log.warn('Opportunity shard not found', { shardId, tenantId, service: 'integration-processors' });
        return;
      }

      // Calculate relationship counts
      const newCounts = await this.calculateRelationshipCounts(shardId, tenantId);

      // Get old counts from shard
      const oldCounts: RelationshipCounts = {
        documentCount: opportunityShard.structuredData?.documentCount || 0,
        emailCount: opportunityShard.structuredData?.emailCount || 0,
        meetingCount: opportunityShard.structuredData?.meetingCount || 0,
        callCount: opportunityShard.structuredData?.callCount || 0,
        competitorCount: opportunityShard.structuredData?.competitorCount || 0,
        stakeholderCount: opportunityShard.structuredData?.stakeholderCount || 0,
      };

      // Check if significant change
      const hasSignificantChange = this.hasSignificantChange(oldCounts, newCounts);
      const isNewOpportunity = !oldCounts.documentCount && !oldCounts.emailCount && !oldCounts.meetingCount;

      // Always update shard with new counts (even if no significant change)
      await this.updateOpportunityShard(shardId, tenantId, newCounts);

      // Only publish event if significant change or new opportunity
      if (hasSignificantChange || isNewOpportunity) {
        await this.publishMLFieldsUpdated(opportunityId, tenantId, oldCounts, newCounts, {
          shardId,
          reason: isNewOpportunity ? 'new_opportunity' : 'recalculation',
        });

        log.info('Published ML fields update', {
          opportunityId,
          shardId,
          hasSignificantChange,
          isNewOpportunity,
          service: 'integration-processors',
        });
      } else {
        log.debug('Skipped event - no significant change', {
          opportunityId,
          shardId,
          oldCounts,
          newCounts,
          service: 'integration-processors',
        });
      }
    } catch (error) {
      log.error('Failed to process ML field aggregation', error, {
        shardId,
        opportunityId,
        tenantId,
        service: 'integration-processors',
      });
      // Don't throw - allow other events to process
    }
  }

  /**
   * Get opportunity shard
   */
  private async getOpportunityShard(shardId: string, tenantId: string): Promise<any> {
    try {
      const response = await this.deps.shardManager.get(`/api/v1/shards/${shardId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
      return response;
    } catch (error) {
      log.error('Failed to get opportunity shard', error, {
        shardId,
        tenantId,
        service: 'integration-processors',
      });
      throw error;
    }
  }

  /**
   * Calculate relationship counts for an opportunity
   */
  private async calculateRelationshipCounts(
    opportunityShardId: string,
    tenantId: string
  ): Promise<RelationshipCounts> {
    // Query related shards by type
    const [documents, emails, meetings, contacts] = await Promise.all([
      this.countRelatedShards(opportunityShardId, tenantId, 'document'),
      this.countRelatedShards(opportunityShardId, tenantId, 'email'),
      this.countRelatedShards(opportunityShardId, tenantId, 'meeting'),
      this.countRelatedShards(opportunityShardId, tenantId, 'contact'),
    ]);

    // Separate meetings into meetings and calls
    // Note: This requires checking the meeting shard's structuredData.type field
    // For now, we'll count all meetings and set callCount to 0 (will be refined later)
    const meetingCount = meetings.length;
    const callCount = meetings.filter((m: any) => m.shard?.structuredData?.type === 'call').length;

    // Separate contacts into competitors and stakeholders
    // Note: This requires checking the contact shard's structuredData fields
    const competitorCount = contacts.filter(
      (c: any) => c.shard?.structuredData?.isCompetitor === true
    ).length;
    const stakeholderCount = contacts.filter(
      (c: any) => c.shard?.structuredData?.isStakeholder === true
    ).length;

    return {
      documentCount: documents.length,
      emailCount: emails.length,
      meetingCount: meetingCount - callCount, // Exclude calls from meetings
      callCount,
      competitorCount,
      stakeholderCount,
    };
  }

  /**
   * Count related shards of a specific type
   * Returns array of { edge, shard } objects from the API
   */
  private async countRelatedShards(
    shardId: string,
    tenantId: string,
    targetShardTypeId: string
  ): Promise<Array<{ edge: any; shard: any }>> {
    try {
      const response = await this.deps.shardManager.get(
        `/api/v1/shards/${shardId}/related?targetShardTypeId=${targetShardTypeId}&direction=both`,
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Response is an array of { edge, shard } objects
      return Array.isArray(response) ? response : [];
    } catch (error) {
      log.warn('Failed to count related shards', error, {
        shardId,
        targetShardTypeId,
        tenantId,
        service: 'integration-processors',
      });
      return []; // Return empty array on error
    }
  }

  /**
   * Check if counts have changed significantly
   * - For counts < 10: any change is significant
   * - For counts >= 10: >= 10% change is significant
   */
  private hasSignificantChange(oldCounts: RelationshipCounts, newCounts: RelationshipCounts): boolean {
    const THRESHOLD = 0.1; // 10% change

    for (const key of Object.keys(newCounts) as Array<keyof RelationshipCounts>) {
      const oldValue = oldCounts[key] || 0;
      const newValue = newCounts[key] || 0;

      // If count is small, any change is significant
      if (oldValue < 10) {
        if (oldValue !== newValue) {
          return true;
        }
      } else {
        // For larger counts, check percentage change
        const percentChange = Math.abs(newValue - oldValue) / oldValue;
        if (percentChange >= THRESHOLD) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update opportunity shard with new ML field counts
   */
  private async updateOpportunityShard(
    shardId: string,
    tenantId: string,
    counts: RelationshipCounts
  ): Promise<void> {
    try {
      // Get current shard to preserve other fields
      const currentShard = await this.getOpportunityShard(shardId, tenantId);

      // Update structuredData with new counts
      const updatedStructuredData = {
        ...currentShard.structuredData,
        documentCount: counts.documentCount,
        emailCount: counts.emailCount,
        meetingCount: counts.meetingCount,
        callCount: counts.callCount,
        competitorCount: counts.competitorCount,
        stakeholderCount: counts.stakeholderCount,
      };

      await this.deps.shardManager.put(
        `/api/v1/shards/${shardId}`,
        {
          structuredData: updatedStructuredData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      log.debug('Updated opportunity shard with ML field counts', {
        shardId,
        counts,
        service: 'integration-processors',
      });
    } catch (error) {
      log.error('Failed to update opportunity shard', error, {
        shardId,
        tenantId,
        service: 'integration-processors',
      });
      throw error;
    }
  }

  /**
   * Publish integration.opportunity.ml_fields_updated event
   */
  private async publishMLFieldsUpdated(
    opportunityId: string,
    tenantId: string,
    oldCounts: RelationshipCounts,
    newCounts: RelationshipCounts,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.deps.eventPublisher.publish(
        'integration.opportunity.ml_fields_updated',
        tenantId,
        {
          opportunityId,
          tenantId,
          oldCounts,
          newCounts,
          fieldsUpdated: Object.keys(newCounts).filter(
            (key) => oldCounts[key as keyof RelationshipCounts] !== newCounts[key as keyof RelationshipCounts]
          ),
          ...metadata,
        }
      );
    } catch (error) {
      log.error('Failed to publish ML fields updated event', error, {
        opportunityId,
        tenantId,
        service: 'integration-processors',
      });
      // Don't throw - non-critical
    }
  }
}
