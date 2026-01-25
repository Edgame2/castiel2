/**
 * Proactive Insight Service
 * Handles automated proactive insight generation
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  ProactiveInsight,
  ProactiveInsightStatus,
  DeliveryChannel,
  InsightDelivery,
} from '../types/insight.types';

export class ProactiveInsightService {
  private containerName = 'ai_proactive_insights';

  /**
   * Create a new proactive insight
   */
  async create(input: {
    tenantId: string;
    triggerId: string;
    triggerName: string;
    type: string;
    priority: string;
    shardId: string;
    shardName: string;
    shardTypeId: string;
    title: string;
    summary: string;
    detailedContent?: string;
    matchedConditions: any[];
    suggestedActions?: any[];
    relatedShards?: any[];
    targetUserIds?: string[];
    expiresAt?: Date;
  }): Promise<ProactiveInsight> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.triggerId) {
      throw new BadRequestError('triggerId is required');
    }
    if (!input.shardId) {
      throw new BadRequestError('shardId is required');
    }

    const insight: ProactiveInsight = {
      id: uuidv4(),
      tenantId: input.tenantId,
      triggerId: input.triggerId,
      triggerName: input.triggerName,
      type: input.type as any,
      priority: input.priority as any,
      status: ProactiveInsightStatus.NEW,
      shardId: input.shardId,
      shardName: input.shardName,
      shardTypeId: input.shardTypeId,
      title: input.title,
      summary: input.summary,
      detailedContent: input.detailedContent,
      matchedConditions: input.matchedConditions,
      suggestedActions: input.suggestedActions || [],
      relatedShards: input.relatedShards,
      targetUserIds: input.targetUserIds,
      deliveries: [],
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(insight, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create proactive insight');
      }

      return resource as ProactiveInsight;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Proactive insight with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get proactive insight by ID
   */
  async getById(insightId: string, tenantId: string): Promise<ProactiveInsight> {
    if (!insightId || !tenantId) {
      throw new BadRequestError('insightId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(insightId, tenantId).read<ProactiveInsight>();

      if (!resource) {
        throw new NotFoundError(`Proactive insight ${insightId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Proactive insight ${insightId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update proactive insight
   */
  async update(
    insightId: string,
    tenantId: string,
    input: {
      status?: ProactiveInsightStatus;
      acknowledgedBy?: string;
      dismissedBy?: string;
      dismissReason?: string;
      actionedBy?: string;
    }
  ): Promise<ProactiveInsight> {
    const existing = await this.getById(insightId, tenantId);

    const updated: ProactiveInsight = {
      ...existing,
      ...input,
      acknowledgedAt: input.acknowledgedBy ? new Date() : existing.acknowledgedAt,
      dismissedAt: input.dismissedBy ? new Date() : existing.dismissedAt,
      actionedAt: input.actionedBy ? new Date() : existing.actionedAt,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(insightId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update proactive insight');
      }

      return resource as ProactiveInsight;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Proactive insight ${insightId} not found`);
      }
      throw error;
    }
  }

  /**
   * Record delivery
   */
  async recordDelivery(
    insightId: string,
    tenantId: string,
    delivery: InsightDelivery
  ): Promise<ProactiveInsight> {
    const existing = await this.getById(insightId, tenantId);

    const updated: ProactiveInsight = {
      ...existing,
      deliveries: [...(existing.deliveries || []), delivery],
      updatedAt: new Date(),
    };

    const container = getContainer(this.containerName);
    const { resource } = await container.item(insightId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to record delivery');
    }

    return resource as ProactiveInsight;
  }

  /**
   * List proactive insights
   */
  async list(
    tenantId: string,
    filters?: {
      status?: ProactiveInsightStatus;
      type?: string;
      priority?: string;
      triggerId?: string;
      limit?: number;
    }
  ): Promise<ProactiveInsight[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.priority) {
      query += ' AND c.priority = @priority';
      parameters.push({ name: '@priority', value: filters.priority });
    }

    if (filters?.triggerId) {
      query += ' AND c.triggerId = @triggerId';
      parameters.push({ name: '@triggerId', value: filters.triggerId });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<ProactiveInsight>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list proactive insights: ${error.message}`);
    }
  }
}

