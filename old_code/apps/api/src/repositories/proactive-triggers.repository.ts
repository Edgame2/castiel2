/**
 * Proactive Triggers Repository
 * Handles Cosmos DB operations for proactive triggers
 */

import { Container, CosmosClient } from '@azure/cosmos';
import {
  ProactiveTrigger,
  ProactiveInsightType,
} from '../types/proactive-insights.types.js';

export interface ListTriggersOptions {
  shardTypeId?: string;
  type?: ProactiveInsightType;
  isActive?: boolean;
  isSystem?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'triggerCount';
  order?: 'asc' | 'desc';
}

/**
 * Proactive Triggers Repository
 */
export class ProactiveTriggersRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string) {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Create or update a trigger
   */
  async upsertTrigger(trigger: ProactiveTrigger): Promise<ProactiveTrigger> {
    // Convert Date objects to ISO strings for Cosmos DB
    const doc = {
      ...trigger,
      createdAt: trigger.createdAt instanceof Date ? trigger.createdAt.toISOString() : trigger.createdAt,
      updatedAt: trigger.updatedAt instanceof Date ? trigger.updatedAt.toISOString() : trigger.updatedAt,
      lastTriggeredAt: trigger.lastTriggeredAt instanceof Date ? trigger.lastTriggeredAt.toISOString() : trigger.lastTriggeredAt,
    };

    const { resource } = await this.container.item(trigger.id, trigger.tenantId).replace(doc);

    if (!resource) {
      throw new Error('Failed to upsert proactive trigger');
    }

    // Convert back to Date objects
    return this.deserializeTrigger(resource as any);
  }

  /**
   * Get trigger by ID
   */
  async getTrigger(triggerId: string, tenantId: string): Promise<ProactiveTrigger | null> {
    try {
      const { resource } = await this.container.item(triggerId, tenantId).read<ProactiveTrigger>();

      if (!resource) {
        return null;
      }

      return this.deserializeTrigger(resource as any);
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List triggers for a tenant with filters
   */
  async listTriggers(
    tenantId: string,
    options?: ListTriggersOptions
  ): Promise<{ triggers: ProactiveTrigger[]; total: number; hasMore: boolean }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'createdAt';
    const order = options?.order || 'desc';

    // Build query
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    // Add filters
    if (options?.shardTypeId) {
      query += ' AND c.shardTypeId = @shardTypeId';
      parameters.push({ name: '@shardTypeId', value: options.shardTypeId });
    }

    if (options?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: options.type });
    }

    if (options?.isActive !== undefined) {
      query += ' AND c.isActive = @isActive';
      parameters.push({ name: '@isActive', value: options.isActive });
    }

    if (options?.isSystem !== undefined) {
      query += ' AND c.isSystem = @isSystem';
      parameters.push({ name: '@isSystem', value: options.isSystem });
    }

    // Add ordering
    query += ` ORDER BY c.${orderBy} ${order.toUpperCase()}`;

    // Execute query
    const { resources, hasMoreResults } = await this.container.items
      .query<ProactiveTrigger>({
        query,
        parameters,
      })
      .fetchNext();

    const triggers = resources.map(r => this.deserializeTrigger(r as any));
    const total = triggers.length; // Note: Cosmos DB doesn't provide total count efficiently

    return {
      triggers: triggers.slice(offset, offset + limit),
      total,
      hasMore: hasMoreResults || triggers.length > offset + limit,
    };
  }

  /**
   * Delete trigger
   */
  async deleteTrigger(triggerId: string, tenantId: string): Promise<void> {
    await this.container.item(triggerId, tenantId).delete();
  }

  /**
   * Update trigger statistics
   */
  async updateTriggerStats(
    triggerId: string,
    tenantId: string,
    updates: {
      lastTriggeredAt?: Date;
      triggerCount?: number;
    }
  ): Promise<ProactiveTrigger> {
    const trigger = await this.getTrigger(triggerId, tenantId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    if (updates.lastTriggeredAt !== undefined) {
      trigger.lastTriggeredAt = updates.lastTriggeredAt;
    }
    if (updates.triggerCount !== undefined) {
      trigger.triggerCount = updates.triggerCount;
    }
    trigger.updatedAt = new Date();

    return this.upsertTrigger(trigger);
  }

  /**
   * Deserialize trigger from Cosmos DB format (convert ISO strings back to Dates)
   */
  private deserializeTrigger(doc: any): ProactiveTrigger {
    return {
      ...doc,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      lastTriggeredAt: doc.lastTriggeredAt ? new Date(doc.lastTriggeredAt) : undefined,
    };
  }
}








