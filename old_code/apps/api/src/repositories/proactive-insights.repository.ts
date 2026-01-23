/**
 * Proactive Insights Repository
 * Handles Cosmos DB operations for proactive insights
 */

import { Container, CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ProactiveInsight,
  ProactiveInsightStatus,
  ProactiveInsightType,
  ProactiveInsightPriority,
} from '../types/proactive-insights.types.js';

/**
 * Proactive Insights Repository
 */
export class ProactiveInsightsRepository {
  private container: Container;
  private monitoring?: IMonitoringProvider;

  constructor(
    client: CosmosClient,
    databaseId: string,
    containerId: string,
    monitoring?: IMonitoringProvider
  ) {
    this.container = client.database(databaseId).container(containerId);
    this.monitoring = monitoring;
  }

  /**
   * Create or update a proactive insight
   */
  async upsertInsight(insight: ProactiveInsight): Promise<ProactiveInsight> {
    // Convert Date objects to ISO strings for Cosmos DB
    const doc = {
      ...insight,
      createdAt: insight.createdAt instanceof Date ? insight.createdAt.toISOString() : insight.createdAt,
      updatedAt: insight.updatedAt instanceof Date ? insight.updatedAt.toISOString() : insight.updatedAt,
      acknowledgedAt: insight.acknowledgedAt instanceof Date ? insight.acknowledgedAt.toISOString() : insight.acknowledgedAt,
      actionedAt: insight.actionedAt instanceof Date ? insight.actionedAt.toISOString() : insight.actionedAt,
      dismissedAt: insight.dismissedAt instanceof Date ? insight.dismissedAt.toISOString() : insight.dismissedAt,
      expiresAt: insight.expiresAt instanceof Date ? insight.expiresAt.toISOString() : insight.expiresAt,
      deliveries: insight.deliveries.map(d => ({
        ...d,
        scheduledAt: d.scheduledAt instanceof Date ? d.scheduledAt.toISOString() : d.scheduledAt,
        sentAt: d.sentAt instanceof Date ? d.sentAt.toISOString() : d.sentAt,
        failedAt: d.failedAt instanceof Date ? d.failedAt.toISOString() : d.failedAt,
      })),
    };

    const { resource } = await this.container.item(insight.id, insight.tenantId).replace(doc);

    if (!resource) {
      throw new Error('Failed to upsert proactive insight');
    }

    // Convert back to Date objects
    return this.deserializeInsight(resource as any);
  }

  /**
   * Get insight by ID
   */
  async getInsight(insightId: string, tenantId: string): Promise<ProactiveInsight | null> {
    try {
      const { resource } = await this.container.item(insightId, tenantId).read<ProactiveInsight>();

      if (!resource) {
        return null;
      }

      return this.deserializeInsight(resource as any);
    } catch (error: unknown) {
      const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: number }).code : undefined;
      if (errorCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List insights for a tenant with filters
   */
  async listInsights(
    tenantId: string,
    options?: {
      status?: ProactiveInsightStatus | ProactiveInsightStatus[];
      type?: ProactiveInsightType | ProactiveInsightType[];
      priority?: ProactiveInsightPriority | ProactiveInsightPriority[];
      shardId?: string;
      triggerId?: string;
      limit?: number;
      offset?: number;
      orderBy?: 'createdAt' | 'updatedAt' | 'priority';
      order?: 'asc' | 'desc';
    }
  ): Promise<{ insights: ProactiveInsight[]; total: number; hasMore: boolean }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    let orderBy: 'createdAt' | 'updatedAt' | 'priority' = options?.orderBy || 'createdAt';
    const order = options?.order || 'desc';
    
    // Validate orderBy field name to prevent SQL injection
    const sanitizedOrderBy = String(orderBy).trim();
    const validOrderByFields: Array<'createdAt' | 'updatedAt' | 'priority'> = ['createdAt', 'updatedAt', 'priority'];
    if (!sanitizedOrderBy || !validOrderByFields.includes(sanitizedOrderBy as any)) {
      // Log error using structured logging
      if (this.monitoring) {
        this.monitoring.trackTrace(
          `Invalid orderBy field name in proactive-insights.repository.list: ${sanitizedOrderBy}`,
          2, // Warning severity
          { sanitizedOrderBy, tenantId }
        );
      }
      orderBy = 'createdAt'; // Fallback to safe default
    } else {
      orderBy = sanitizedOrderBy as 'createdAt' | 'updatedAt' | 'priority';
    }

    // Build query
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    // Add filters
    if (options?.status) {
      if (Array.isArray(options.status) && options.status.length > 0) {
        // For arrays, use OR conditions (Cosmos DB doesn't support IN directly)
        const statusConditions = options.status.map((_, i) => `c.status = @status${i}`).join(' OR ');
        query += ` AND (${statusConditions})`;
        options.status.forEach((status, i) => {
          parameters.push({ name: `@status${i}`, value: status });
        });
      } else if (!Array.isArray(options.status)) {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: options.status });
      }
    }

    if (options?.type) {
      if (Array.isArray(options.type) && options.type.length > 0) {
        // For arrays, use OR conditions
        const typeConditions = options.type.map((_, i) => `c.type = @type${i}`).join(' OR ');
        query += ` AND (${typeConditions})`;
        options.type.forEach((type, i) => {
          parameters.push({ name: `@type${i}`, value: type });
        });
      } else if (!Array.isArray(options.type)) {
        query += ' AND c.type = @type';
        parameters.push({ name: '@type', value: options.type });
      }
    }

    if (options?.priority) {
      if (Array.isArray(options.priority) && options.priority.length > 0) {
        // For arrays, use OR conditions
        const priorityConditions = options.priority.map((_, i) => `c.priority = @priority${i}`).join(' OR ');
        query += ` AND (${priorityConditions})`;
        options.priority.forEach((priority, i) => {
          parameters.push({ name: `@priority${i}`, value: priority });
        });
      } else if (!Array.isArray(options.priority)) {
        query += ' AND c.priority = @priority';
        parameters.push({ name: '@priority', value: options.priority });
      }
    }

    if (options?.shardId) {
      query += ' AND c.shardId = @shardId';
      parameters.push({ name: '@shardId', value: options.shardId });
    }

    if (options?.triggerId) {
      query += ' AND c.triggerId = @triggerId';
      parameters.push({ name: '@triggerId', value: options.triggerId });
    }

    // Add ordering
    query += ` ORDER BY c.${orderBy} ${order.toUpperCase()}`;

    // Execute query
    const { resources, hasMoreResults } = await this.container.items
      .query<ProactiveInsight>({
        query,
        parameters,
      })
      .fetchNext();

    const insights = resources.map(r => this.deserializeInsight(r as any));
    const total = insights.length; // Note: Cosmos DB doesn't provide total count efficiently

    return {
      insights: insights.slice(offset, offset + limit),
      total,
      hasMore: hasMoreResults || insights.length > offset + limit,
    };
  }

  /**
   * Update insight status
   */
  async updateInsightStatus(
    insightId: string,
    tenantId: string,
    status: ProactiveInsightStatus,
    userId?: string,
    reason?: string
  ): Promise<ProactiveInsight> {
    const insight = await this.getInsight(insightId, tenantId);
    if (!insight) {
      throw new Error('Insight not found');
    }

    insight.status = status;
    insight.updatedAt = new Date();

    if (status === 'acknowledged' && userId) {
      insight.acknowledgedAt = new Date();
      insight.acknowledgedBy = userId;
    } else if (status === 'dismissed' && userId) {
      insight.dismissedAt = new Date();
      insight.dismissedBy = userId;
      insight.dismissReason = reason;
    } else if (status === 'actioned' && userId) {
      insight.actionedAt = new Date();
      insight.actionedBy = userId;
    }

    return this.upsertInsight(insight);
  }

  /**
   * Delete insight
   */
  async deleteInsight(insightId: string, tenantId: string): Promise<void> {
    await this.container.item(insightId, tenantId).delete();
  }

  /**
   * Deserialize insight from Cosmos DB format (convert ISO strings back to Dates)
   */
  private deserializeInsight(doc: any): ProactiveInsight {
    return {
      ...doc,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
      acknowledgedAt: doc.acknowledgedAt ? new Date(doc.acknowledgedAt) : undefined,
      actionedAt: doc.actionedAt ? new Date(doc.actionedAt) : undefined,
      dismissedAt: doc.dismissedAt ? new Date(doc.dismissedAt) : undefined,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : undefined,
      deliveries: doc.deliveries?.map((d: any) => ({
        ...d,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : new Date(),
        sentAt: d.sentAt ? new Date(d.sentAt) : undefined,
        failedAt: d.failedAt ? new Date(d.failedAt) : undefined,
      })) || [],
    };
  }
}

