/**
 * Lightweight Notification Service
 * 
 * Simplified notification service that works in Container Apps context.
 * Only supports system notifications (in-app), no email/webhook/push.
 * 
 * This is a minimal implementation for content generation worker.
 * For full notification features, use the main NotificationService in the API.
 */

import { CosmosClient, Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import type { IMonitoringProvider } from '@castiel/monitoring';
// Import from local types (now extracted to api-core)
import type {
  Notification,
  CreateSystemNotificationInput,
  NotificationType,
  NotificationPriority,
} from '../types/notification.types.js';

export class LightweightNotificationService {
  private container: Container;
  private monitoring: IMonitoringProvider;

  constructor(
    cosmosClient: CosmosClient,
    databaseId: string,
    containerId: string,
    monitoring: IMonitoringProvider
  ) {
    this.monitoring = monitoring;
    this.container = cosmosClient.database(databaseId).container(containerId);
  }

  /**
   * Create a system notification (in-app only)
   * This is a simplified version that only creates the notification in Cosmos DB.
   * Email/webhook/push delivery is handled by the main API service.
   */
  async createSystemNotification(
    input: CreateSystemNotificationInput
  ): Promise<Notification> {
    const startTime = Date.now();

    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

      const notification: Notification = {
        id,
        notificationId: id, // Same as id for HPK
        tenantId: input.tenantId,
        userId: input.userId,
        name: input.name,
        content: input.content,
        link: input.link,
        status: 'unread',
        type: input.type,
        priority: input.priority || 'medium',
        createdBy: {
          type: 'system',
        },
        metadata: input.metadata,
        createdAt: now,
        expiresAt,
      };

      // For HPK, partition key is an array [tenantId, userId, id]
      const partitionKey = [input.tenantId, input.userId, id];

      const { resource } = await this.container.items.create(notification, {
        partitionKey,
      } as any); // partitionKey is valid but not in RequestOptions type

      if (!resource) {
        throw new Error('Failed to create notification');
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('notification.created', {
        notificationId: id,
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        source: 'content_generation_worker',
        duration,
      });

      return resource as Notification;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        operation: 'lightweight_notification.create',
        tenantId: input.tenantId,
        userId: input.userId,
        duration,
      });

      // Don't throw - notification failure shouldn't fail the generation job
      // Log and return a mock notification
      this.monitoring.trackEvent('notification.create_failed', {
        tenantId: input.tenantId,
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return a mock notification so the caller doesn't fail
      return {
        id: uuidv4(),
        notificationId: uuidv4(),
        tenantId: input.tenantId,
        userId: input.userId,
        name: input.name,
        content: input.content,
        link: input.link,
        status: 'unread',
        type: input.type,
        priority: input.priority || 'medium',
        createdBy: {
          type: 'system',
        },
        metadata: input.metadata,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }
}

