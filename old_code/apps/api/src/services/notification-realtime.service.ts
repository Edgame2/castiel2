/**
 * Notification Real-Time Service
 * Handles real-time broadcasting of notifications via WebSocket/SSE
 */

import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Notification } from '../types/notification.types.js';

/**
 * Notification Real-Time Service
 * Broadcasts notifications to connected clients via Redis pub/sub
 */
export class NotificationRealtimeService {
  private redis: Redis;
  private monitoring: IMonitoringProvider;

  constructor(redis: Redis, monitoring: IMonitoringProvider) {
    this.redis = redis;
    this.monitoring = monitoring;
  }

  /**
   * Broadcast notification to a specific user
   */
  async broadcastToUser(notification: Notification): Promise<void> {
    try {
      const channel = `notification:${notification.tenantId}:${notification.userId}`;
      const payload = {
        type: 'notification',
        notification: {
          id: notification.id,
          name: notification.name,
          content: notification.content,
          type: notification.type,
          link: notification.link,
          status: notification.status,
          priority: notification.priority,
          createdAt: notification.createdAt,
          metadata: notification.metadata,
        },
      };

      await this.redis.publish(channel, JSON.stringify(payload));

      this.monitoring.trackMetric('notification.broadcast', 1, {
        tenantId: notification.tenantId,
        userId: notification.userId,
        type: notification.type,
      });
    } catch (error) {
      this.monitoring.trackTrace(`Failed to broadcast notification: ${error}`, 3 as any); // SeverityLevel.Error
      throw error;
    }
  }

  /**
   * Broadcast notification to multiple users
   */
  async broadcastToUsers(notification: Notification, userIds: string[]): Promise<void> {
    const promises = userIds.map(userId => {
      const userNotification: Notification = {
        ...notification,
        userId,
      };
      return this.broadcastToUser(userNotification);
    });

    await Promise.allSettled(promises);
  }

  /**
   * Broadcast unread count update to a user
   */
  async broadcastUnreadCount(tenantId: string, userId: string, count: number): Promise<void> {
    try {
      const channel = `notification:${tenantId}:${userId}`;
      const payload = {
        type: 'unread_count',
        count,
      };

      await this.redis.publish(channel, JSON.stringify(payload));

      this.monitoring.trackMetric('notification.unread_count.broadcast', 1, {
        tenantId,
        userId,
      });
    } catch (error) {
      this.monitoring.trackTrace(`Failed to broadcast unread count: ${error}`, 3 as any); // SeverityLevel.Error
      // Don't throw - unread count updates are not critical
    }
  }
}







