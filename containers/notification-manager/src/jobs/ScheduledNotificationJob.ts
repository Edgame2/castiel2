/**
 * Scheduled Notification Job
 * 
 * Background job to process scheduled notifications and batches
 */

import { getNotificationEngine } from '../services/NotificationEngineFactory';
import { BatchProcessor } from '../services/BatchProcessor';
import { EscalationManager } from '../services/EscalationManager';
import { getDatabaseClient } from '@coder/shared';
import { getConfig } from '../config';

/** Shape of a notification row when using Prisma-style API (findMany returns this[]) */
interface NotificationRow {
  id: string;
  tenantId?: string | null;
  eventType?: string | null;
  eventCategory?: string | null;
  sourceModule?: string | null;
  sourceResourceId?: string | null;
  sourceResourceType?: string | null;
  recipientId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  title?: string | null;
  body?: string | null;
  bodyHtml?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  imageUrl?: string | null;
  metadata?: unknown;
  criticality?: unknown;
  channelsRequested?: unknown;
  teamId?: string | null;
  projectId?: string | null;
  escalationChainId?: string | null;
  deduplicationKey?: string | null;
  [key: string]: unknown;
}

/** Prisma-style model: findMany + update (Cosmos client does not have this) */
type NotificationsModel = {
  findMany: (args: unknown) => Promise<NotificationRow[]>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
};

export class ScheduledNotificationJob {
  private get db() { return getDatabaseClient() as any; }
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
   * Note: getDatabaseClient() returns Cosmos DB; Prisma-style APIs (e.g. findMany) are not available.
   * When using Cosmos, this job no-ops until notification data is queried via getContainer().
   */
  private async processScheduledNotifications(): Promise<void> {
    const db = this.db as { notification_notifications?: { findMany: (args: unknown) => Promise<unknown[]> } };
    const notificationsModel = db?.notification_notifications;
    if (!notificationsModel || typeof notificationsModel.findMany !== 'function') {
      return; // Cosmos client: no Prisma-style API; skip to avoid crash
    }
    const model = notificationsModel as unknown as NotificationsModel;
    const now = new Date();

    const scheduledNotifications: NotificationRow[] = (await model.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          lte: now,
        },
      },
    })) as NotificationRow[];

    const notificationEngine = getNotificationEngine();

    for (const notification of scheduledNotifications) {
      try {
        await model.update({
          where: { id: notification.id },
          data: { status: 'PROCESSING' },
        });

        const input: any = {
          tenantId: notification.tenantId,
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
          metadata: notification.metadata,
          criticality: notification.criticality,
          channelsRequested: notification.channelsRequested,
          teamId: notification.teamId,
          projectId: notification.projectId,
          escalationChainId: notification.escalationChainId,
          deduplicationKey: notification.deduplicationKey,
        };

        await notificationEngine.processNotification(input, {
          eventData: {},
          skipDeduplication: true,
        });
      } catch (error) {
        console.error(`Failed to process scheduled notification ${notification.id}:`, error);
        try {
          await model.update({
            where: { id: notification.id },
            data: { status: 'FAILED' },
          });
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Process escalations
   */
  private async processEscalations(): Promise<void> {
    const db = this.db as { notification_notifications?: { findMany: (args: unknown) => Promise<unknown[]> } };
    const notificationsModel = db?.notification_notifications;
    if (!notificationsModel || typeof notificationsModel.findMany !== 'function') {
      return;
    }
    const model = notificationsModel as unknown as NotificationsModel;
    const notifications: NotificationRow[] = (await model.findMany({
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
    })) as NotificationRow[];

    for (const notification of notifications) {
      try {
        await this.escalationManager.processEscalation(notification.id);
      } catch (error) {
        console.error(`Failed to process escalation for notification ${notification.id}:`, error);
      }
    }
  }
}

