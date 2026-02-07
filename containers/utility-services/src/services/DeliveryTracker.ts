/**
 * Delivery Tracker
 * 
 * Tracks delivery status for notifications
 * Will be fully implemented in Phase 4
 */

import { getDatabaseClient } from '@coder/shared';
import { NotificationChannel } from '../types/notification';

export class DeliveryTracker {
  private db = getDatabaseClient() as any;

  /**
   * Track a delivery attempt
   */
  async trackDelivery(
    notificationId: string,
    channel: NotificationChannel,
    success: boolean,
    messageId?: string,
    error?: string
  ): Promise<void> {
    await this.db.notification_delivery_logs.create({
      data: {
        notificationId,
        channel,
        providerId: 'default', // TODO: Get from provider
        status: success ? 'SENT' : 'FAILED',
        providerMessageId: messageId,
        attemptedAt: new Date(),
        deliveredAt: success ? new Date() : undefined,
        failedAt: success ? undefined : new Date(),
        lastError: error,
        retryCount: 0,
      },
    });
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    deliveryLogId: string,
    status: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED',
    providerResponse?: any
  ): Promise<void> {
    await this.db.notification_delivery_logs.update({
      where: { id: deliveryLogId },
      data: {
        status,
        providerResponse,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        failedAt: status === 'FAILED' || status === 'BOUNCED' || status === 'REJECTED' 
          ? new Date() 
          : undefined,
        updatedAt: new Date(),
      },
    });
  }
}

