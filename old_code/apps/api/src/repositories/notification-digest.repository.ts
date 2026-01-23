/**
 * Notification Digest Repository
 * Handles all Cosmos DB operations for notification digests
 */

import { Container, CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  NotificationDigest,
  DigestSchedule,
  DeliveryChannel,
} from '../types/notification.types.js';

/**
 * Notification Digest Repository
 */
export class NotificationDigestRepository {
  private container: Container;
  private monitoring?: IMonitoringProvider;

  constructor(client: CosmosClient, databaseId: string, containerId: string, monitoring?: IMonitoringProvider) {
    this.container = client.database(databaseId).container(containerId);
    this.monitoring = monitoring;
  }

  /**
   * Ensure container exists with HPK
   */
  static async ensureContainer(
    client: CosmosClient,
    databaseId: string,
    containerId: string
  ): Promise<Container> {
    const database = client.database(databaseId);
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: {
        paths: ['/tenantId', '/userId', '/id'],
        kind: 'MultiHash' as any, // Cosmos DB SDK type definition may not include MultiHash
        version: 2,
      },
      defaultTtl: 2592000, // 30 days in seconds
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/' },
          { path: '/tenantId/?' },
          { path: '/userId/?' },
          { path: '/channel/?' },
          { path: '/status/?' },
          { path: '/schedule/?' },
          { path: '/periodEnd/?' },
          { path: '/createdAt/?' },
        ],
        excludedPaths: [
          { path: '/notificationIds/*' },
        ],
        compositeIndexes: [
          [
            { path: '/tenantId', order: 'ascending' },
            { path: '/userId', order: 'ascending' },
            { path: '/status', order: 'ascending' },
            { path: '/periodEnd', order: 'ascending' },
          ],
          [
            { path: '/tenantId', order: 'ascending' },
            { path: '/userId', order: 'ascending' },
            { path: '/channel', order: 'ascending' },
            { path: '/periodEnd', order: 'ascending' },
          ],
        ],
      },
    });
    return container;
  }

  /**
   * Create or update a digest
   * If a digest exists for the same user/channel/period, add notification IDs to it
   */
  async upsertDigest(
    tenantId: string,
    userId: string,
    channel: DeliveryChannel,
    schedule: DigestSchedule,
    periodEnd: string, // ISO 8601
    notificationIds: string[]
  ): Promise<NotificationDigest> {
    const now = new Date().toISOString();
    
    // Calculate period start based on schedule
    const periodEndDate = new Date(periodEnd);
    const periodStart = schedule === 'daily'
      ? new Date(periodEndDate.getTime() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
      : new Date(periodEndDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

    // Try to find existing digest for this period
    const existing = await this.findByPeriod(tenantId, userId, channel, periodEnd);
    
    if (existing) {
      // Merge notification IDs (avoid duplicates)
      const mergedIds = Array.from(new Set([...existing.notificationIds, ...notificationIds]));
      
      const updated: NotificationDigest = {
        ...existing,
        notificationIds: mergedIds,
        updatedAt: now,
      };

    const partitionKey = [tenantId, userId, existing.id];
    const { resource } = await this.container.item(existing.id, partitionKey).replace(updated);

    if (!resource) {
      throw new Error('Failed to update digest');
    }

    return resource as unknown as NotificationDigest;
    }

    // Create new digest
    const id = uuidv4();
    const digest: NotificationDigest = {
      id,
      tenantId,
      userId,
      channel,
      schedule,
      periodStart,
      periodEnd,
      notificationIds,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const partitionKey = [tenantId, userId, id];
    const { resource } = await this.container.items.create(digest, {
      partitionKey,
    } as any);

    if (!resource) {
      throw new Error('Failed to create digest');
    }

    return resource as NotificationDigest;
  }

  /**
   * Find digest by period (for a specific user, channel, and period end)
   */
  async findByPeriod(
    tenantId: string,
    userId: string,
    channel: DeliveryChannel,
    periodEnd: string
  ): Promise<NotificationDigest | null> {
    const query: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND c.userId = @userId
          AND c.channel = @channel
          AND c.periodEnd = @periodEnd
          AND c.status = 'pending'
        ORDER BY c.createdAt DESC
        OFFSET 0 LIMIT 1
      `,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@userId', value: userId },
        { name: '@channel', value: channel },
        { name: '@periodEnd', value: periodEnd },
      ],
    };

    try {
      const { resources } = await this.container.items.query<NotificationDigest>(query).fetchAll();
      return resources.length > 0 ? resources[0] : null;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'notification-digest.repository.find-by-period' });
      return null;
    }
  }

  /**
   * Find digests that are due to be sent (periodEnd <= now and status = 'pending')
   */
  async findDueDigests(limit: number = 100): Promise<NotificationDigest[]> {
    const now = new Date().toISOString();
    
    const query: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.status = 'pending'
          AND c.periodEnd <= @now
        ORDER BY c.periodEnd ASC
        OFFSET 0 LIMIT @limit
      `,
      parameters: [
        { name: '@now', value: now },
        { name: '@limit', value: limit },
      ],
    };

    try {
      const { resources } = await this.container.items.query<NotificationDigest>(query).fetchAll();
      return resources;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'notification-digest.repository.find-due-digests' });
      return [];
    }
  }

  /**
   * Get digest by ID
   */
  async findById(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<NotificationDigest | null> {
    try {
      const partitionKey = [tenantId, userId, id];
      const { resource } = await this.container.item(id, partitionKey).read<NotificationDigest>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update digest status
   */
  async updateStatus(
    id: string,
    tenantId: string,
    userId: string,
    status: NotificationDigest['status'],
    error?: string
  ): Promise<NotificationDigest | null> {
    const existing = await this.findById(id, tenantId, userId);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: NotificationDigest = {
      ...existing,
      status,
      updatedAt: now,
    };

    if (status === 'compiled') {
      updated.compiledAt = now;
    } else if (status === 'sent') {
      updated.sentAt = now;
    }

    if (error) {
      updated.error = error;
    }

    const partitionKey = [tenantId, userId, id];
    const { resource } = await this.container.item(id, partitionKey).replace(updated);

    if (!resource) {
      throw new Error('Failed to update digest status');
    }

    return resource as NotificationDigest;
  }

  /**
   * Delete digest (for cleanup)
   */
  async delete(id: string, tenantId: string, userId: string): Promise<boolean> {
    try {
      const partitionKey = [tenantId, userId, id];
      await this.container.item(id, partitionKey).delete();
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }
}

