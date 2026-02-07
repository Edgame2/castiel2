/**
 * Scheduled Notification Job
 * 
 * Background job to process scheduled notifications and batches
 */

import { getNotificationEngine } from '../services/NotificationEngineFactory.js';
import { BatchProcessor } from '../services/BatchProcessor.js';
import { EscalationManager } from '../services/EscalationManager.js';
import { getDatabaseClient } from '@coder/shared';
import { getConfig } from '../config/index.js';

export class ScheduledNotificationJob {
  private db = getDatabaseClient() as any;
  private config = getConfig();
  private batchProcessor: BatchProcessor;
  private escalationManager: EscalationManager;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    const notificationEngine = getNotificationEngine();
    this.batchProcessor = new BatchProcessor(notificationEngine);
    this.escalationManager = new EscalationManager(notificationEngine);
  }

  /**
   * Start the scheduled job
   */
  start(): void {
    // Run every minute
    this.intervalId = setInterval(async () => {
      try {
        await this.processScheduledNotifications();
        await this.batchProcessor.processScheduledBatches();
        await this.batchProcessor.expireNotifications();
        await this.processEscalations();
      } catch (error) {
        console.error('Scheduled notification job error:', error);
      }
    }, 60000); // 1 minute

    console.log('Scheduled notification job started');
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Process scheduled notifications
   */
  private async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    
    const scheduledNotifications = await this.db.notification_notifications.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          lte: now,
        },
      },
    });

    const notificationEngine = getNotificationEngine();

    for (const notification of scheduledNotifications) {
      try {
        // Update status to processing
        await this.db.notification_notifications.update({
          where: { id: notification.id },
          data: { status: 'PROCESSING' },
        });

        // Process notification
        const input: any = {
          organizationId: notification.organizationId,
          eventType: notification.eventType,
          eventCategory: notification.eventCategory,
          sourceModule: notification.sourceModule,
          sourceResourceId: notification.sourceResourceId,
          sourceResourceType: notification.sourceResourceType,
          recipientId: notification.recipientId,
          recipientEmail: notification.recipientEmail,
          recipientPhone: notification.recipientPhone,
          title: notification.title,
          body: notification.body,
          bodyHtml: notification.bodyHtml,
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
          imageUrl: notification.imageUrl,
          metadata: notification.metadata as any,
          criticality: notification.criticality as any,
          channelsRequested: notification.channelsRequested as any,
          teamId: notification.teamId,
          projectId: notification.projectId,
          escalationChainId: notification.escalationChainId,
          deduplicationKey: notification.deduplicationKey,
        };

        await notificationEngine.processNotification(input, {
          eventData: {},
          skipDeduplication: true, // Already in database
        });
      } catch (error) {
        console.error(`Failed to process scheduled notification ${notification.id}:`, error);
        // Mark as failed
        await this.db.notification_notifications.update({
          where: { id: notification.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }

  /**
   * Process escalations
   */
  private async processEscalations(): Promise<void> {
    // Get notifications with escalation chains that need escalation
    const notifications = await this.db.notification_notifications.findMany({
      where: {
        escalationChainId: {
          not: null,
        },
        status: {
          in: ['DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED'],
        },
      },
      include: {
        escalationChain: true,
      },
    });

    for (const notification of notifications) {
      try {
        await this.escalationManager.processEscalation(notification.id);
      } catch (error) {
        console.error(`Failed to process escalation for notification ${notification.id}:`, error);
      }
    }
  }
}

