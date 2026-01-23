/**
 * Notification Repository
 * Handles all Cosmos DB operations for notifications
 */

import { Container, CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  Notification,
  NotificationListOptions,
  NotificationListResult,
  NotificationStatus,
} from '../types/notification.types.js';

/**
 * Notification Repository
 */
export class NotificationRepository {
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
        kind: 'MultiHash' as any, // MultiHash requires type assertion
        version: 2,
      },
      defaultTtl: 7776000, // 90 days in seconds
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/' }, // Required: root path must be included
          { path: '/tenantId/?' },
          { path: '/userId/?' },
          { path: '/status/?' },
          { path: '/type/?' },
          { path: '/createdAt/?' },
          { path: '/createdBy/type/?' },
        ],
        excludedPaths: [
          { path: '/content/?' },
          { path: '/metadata/*' },
        ],
        compositeIndexes: [
          [
            { path: '/tenantId', order: 'ascending' },
            { path: '/userId', order: 'ascending' },
            { path: '/createdAt', order: 'descending' },
          ],
          [
            { path: '/tenantId', order: 'ascending' },
            { path: '/userId', order: 'ascending' },
            { path: '/status', order: 'ascending' },
            { path: '/createdAt', order: 'descending' },
          ],
        ],
      },
    });
    return container;
  }

  /**
   * Create a notification
   */
  async create(notification: Omit<Notification, 'id' | 'notificationId' | 'createdAt' | 'expiresAt'>): Promise<Notification> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

    const doc: Notification = {
      ...notification,
      id,
      notificationId: id, // Same as id for HPK
      createdAt: now,
      expiresAt,
    };

    // For HPK, partition key is an array [tenantId, userId, id]
    const partitionKey = [notification.tenantId, notification.userId, id];

    const { resource } = await this.container.item(id, partitionKey as any).replace(doc);

    if (!resource) {
      throw new Error('Failed to create notification');
    }

    return resource as Notification;
  }

  /**
   * Get notification by ID
   */
  async findById(id: string, tenantId: string, userId: string): Promise<Notification | null> {
    try {
      // For HPK, partition key is an array [tenantId, userId, id]
      const partitionKey = [tenantId, userId, id];
      const { resource } = await this.container.item(id, partitionKey).read<Notification>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List notifications for a user
   */
  async list(
    tenantId: string,
    userId: string,
    options: NotificationListOptions = {}
  ): Promise<NotificationListResult> {
    const {
      status,
      type,
      limit = 20,
      offset = 0,
    } = options;

    // Build query
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId';
    const parameters: { name: string; value: any }[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
    ];

    if (status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    if (type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: type });
    }

    query += ' ORDER BY c.createdAt DESC';

    // For HPK queries, don't pass partitionKey option
    // Cosmos DB automatically routes based on WHERE clause (tenantId and userId)

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
    const { resources: countResult } = await this.container.items
      .query<number>({ query: countQuery, parameters })
      .fetchAll();
    const total = countResult[0] || 0;

    // Get paginated results
    query += ` OFFSET ${offset} LIMIT ${limit}`;
    const { resources } = await this.container.items
      .query<Notification>({ query, parameters })
      .fetchAll();

    // Get unread count
    const unreadQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.status = @unreadStatus';
    const unreadParams = [
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
      { name: '@unreadStatus', value: 'unread' },
    ];
    const { resources: unreadResult } = await this.container.items
      .query<number>({ query: unreadQuery, parameters: unreadParams })
      .fetchAll();
    const unreadCount = unreadResult[0] || 0;

    return {
      notifications: resources,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      unreadCount,
    };
  }

  /**
   * Update notification status
   */
  async updateStatus(
    id: string,
    tenantId: string,
    userId: string,
    status: NotificationStatus
  ): Promise<Notification | null> {
    const existing = await this.findById(id, tenantId, userId);
    if (!existing) {
      return null;
    }

    const updated: Notification = {
      ...existing,
      status,
      readAt: status === 'read' ? new Date().toISOString() : undefined,
    };

    const partitionKey = [tenantId, userId, id];
    const { resource } = await this.container.item(id, partitionKey).replace(updated);

    return resource as Notification;
  }

  /**
   * Update notification (for delivery tracking and other updates)
   */
  async update(
    id: string,
    tenantId: string,
    userId: string,
    updates: Partial<Notification>
  ): Promise<Notification | null> {
    const existing = await this.findById(id, tenantId, userId);
    if (!existing) {
      return null;
    }

    const updated: Notification = {
      ...existing,
      ...updates,
    };

    const partitionKey = [tenantId, userId, id];
    const { resource } = await this.container.item(id, partitionKey).replace(updated);

    return resource as Notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    // Get all unread notifications
    const query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.status = @status';
    const parameters = [
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
      { name: '@status', value: 'unread' },
    ];

    // For HPK, don't pass partitionKey - Cosmos routes based on WHERE clause
    const { resources } = await this.container.items
      .query<Notification>({ query, parameters })
      .fetchAll();

    // Update each notification
    const now = new Date().toISOString();
    let count = 0;

    for (const notification of resources) {
      const updated: Notification = {
        ...notification,
        status: 'read',
        readAt: now,
      };
      const itemPartitionKey = [tenantId, userId, notification.id];
      await this.container.item(notification.id, itemPartitionKey).replace(updated);
      count++;
    }

    return count;
  }

  /**
   * Delete notification
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

  /**
   * Get unread count for a user
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const query = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.status = @status';
    const parameters = [
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
      { name: '@status', value: 'unread' },
    ];

    // For HPK, don't pass partitionKey - Cosmos routes based on WHERE clause
    const { resources } = await this.container.items
      .query<number>({ query, parameters })
      .fetchAll();

    return resources[0] || 0;
  }

  /**
   * Fetch multiple notifications by IDs
   * Used for digest compilation
   */
  async findByIds(
    ids: string[],
    tenantId: string,
    userId: string
  ): Promise<Notification[]> {
    if (ids.length === 0) {
      return [];
    }

    // Build query with IN clause
    const query: SqlQuerySpec = {
      query: `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND c.userId = @userId
          AND ARRAY_CONTAINS(@ids, c.id)
        ORDER BY c.createdAt DESC
      `,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@userId', value: userId },
        { name: '@ids', value: ids },
      ],
    };

    try {
      const { resources } = await this.container.items.query<Notification>(query).fetchAll();
      return resources;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'notification-repository.fetch-by-ids' });
      return [];
    }
  }
}







