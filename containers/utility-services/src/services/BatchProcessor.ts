/**
 * Batch Processor
 * 
 * Processes batch/digest notifications
 */

import { getDatabaseClient } from '@coder/shared';
import { NotificationInput, NotificationChannel } from '../types/notification';
import { NotificationEngine } from './NotificationEngine';
import { getConfig } from '../config/index.js';

export type DigestType = 'HOURLY' | 'DAILY' | 'WEEKLY';

export class BatchProcessor {
  private db = getDatabaseClient() as any;
  private config = getConfig();
  private notificationEngine: NotificationEngine;

  constructor(notificationEngine: NotificationEngine) {
    this.notificationEngine = notificationEngine;
  }

  /**
   * Create batch for digest notifications
   */
  async createBatch(
    tenantId: string,
    digestType: DigestType,
    scheduledFor: Date,
    notificationIds: string[]
  ): Promise<string> {
    const batch = await this.db.notification_batches.create({
      data: {
        tenantId,
        name: `${digestType} Digest - ${scheduledFor.toISOString()}`,
        digestType,
        scheduledFor,
        status: 'PENDING',
        notificationIds,
      },
    });

    return batch.id;
  }

  /**
   * Process scheduled batches
   */
  async processScheduledBatches(): Promise<void> {
    const now = new Date();
    
    const batches = await this.db.notification_batches.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        notifications: true,
      },
    });

    for (const batch of batches) {
      try {
        await this.processBatch(batch.id);
      } catch (error) {
        console.error(`Failed to process batch ${batch.id}:`, error);
        // Update batch status to failed
        await this.db.notification_batches.update({
          where: { id: batch.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }

  /**
   * Process a single batch
   */
  private async processBatch(batchId: string): Promise<void> {
    const batch = await this.db.notification_batches.findUnique({
      where: { id: batchId },
      include: {
        notifications: true,
      },
    });

    if (!batch || batch.status !== 'PENDING') {
      return;
    }

    // Update status to processing
    await this.db.notification_batches.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' },
    });

    // Group notifications by recipient
    const notificationsByRecipient = new Map<string, any[]>();
    
    for (const notification of batch.notifications) {
      const recipientId = notification.recipientId;
      if (!notificationsByRecipient.has(recipientId)) {
        notificationsByRecipient.set(recipientId, []);
      }
      notificationsByRecipient.get(recipientId)!.push(notification);
    }

    // Create digest notification for each recipient
    for (const [recipientId, notifications] of notificationsByRecipient.entries()) {
      const firstNotification = notifications[0];
      
      // Generate digest content
      const digestContent = this.generateDigestContent(notifications, batch.digestType);

      const digestInput: NotificationInput = {
        tenantId: (batch as { tenantId?: string }).tenantId ?? (batch as { organizationId?: string }).organizationId,
        eventType: `notification.digest.${batch.digestType.toLowerCase()}`,
        eventCategory: 'SYSTEM_ADMIN',
        sourceModule: 'notification-manager',
        recipientId,
        recipientEmail: firstNotification.recipientEmail,
        title: `${batch.digestType} Notification Digest`,
        body: digestContent.text,
        bodyHtml: digestContent.html,
        criticality: 'LOW',
        channelsRequested: ['EMAIL', 'IN_APP'],
      };

      await this.notificationEngine.processNotification(digestInput, {
        eventData: {
          batchId,
          notificationCount: notifications.length,
        },
      });
    }

    // Mark batch as sent
    await this.db.notification_batches.update({
      where: { id: batchId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Generate digest content from notifications
   */
  private generateDigestContent(notifications: any[], digestType: DigestType): { text: string; html: string } {
    const count = notifications.length;
    const text = `You have ${count} notification${count > 1 ? 's' : ''} in your ${digestType.toLowerCase()} digest:\n\n` +
      notifications.map(n => `- ${n.title}: ${n.body}`).join('\n');

    const html = `
      <h2>You have ${count} notification${count > 1 ? 's' : ''} in your ${digestType.toLowerCase()} digest</h2>
      <ul>
        ${notifications.map(n => `<li><strong>${n.title}</strong>: ${n.body}</li>`).join('\n')}
      </ul>
    `;

    return { text, html };
  }

  /**
   * Expire old notifications
   */
  async expireNotifications(): Promise<void> {
    const now = new Date();
    
    await this.db.notification_notifications.updateMany({
      where: {
        expiresAt: {
          lte: now,
        },
        status: {
          not: 'EXPIRED',
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }
}

