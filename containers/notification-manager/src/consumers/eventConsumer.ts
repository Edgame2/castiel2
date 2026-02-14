import { EventConsumer } from '@coder/shared';
import type { DomainEvent } from '@coder/shared';
import { getConfig } from '../config';
import { getNotificationEngine } from '../services/NotificationEngineFactory';
import { mapEventToNotificationInput } from './eventMapper';
import { NotificationService } from '../services/NotificationService';

const notificationService = new NotificationService();
const notificationEngine = getNotificationEngine();

const handler = async (event: DomainEvent<unknown>): Promise<void> => {
  try {
    const notificationInput = mapEventToNotificationInput(event);
    if (!notificationInput) return;
    await notificationEngine.processNotification(notificationInput, {
      eventData: event.data || {},
    });
  } catch (error: unknown) {
    console.error(`Failed to process notification for event ${event.type}:`, error);
    try {
      const notificationInput = mapEventToNotificationInput(event);
      if (notificationInput) {
        await notificationService.createNotification({
          userId: notificationInput.recipientId,
          tenantId: notificationInput.tenantId,
          type: notificationInput.eventType,
          title: notificationInput.title,
          message: notificationInput.body,
        });
      }
    } catch (fallbackError) {
      console.error('Fallback notification creation also failed:', fallbackError);
    }
  }
};

export async function startEventConsumer() {
  const config = getConfig();
  const url = (config as { rabbitmq?: { url?: string } }).rabbitmq?.url;
  if (!url) {
    console.warn('RabbitMQ URL not configured, skipping event consumer');
    return;
  }
  const consumer = new EventConsumer({
    url,
    exchange: 'coder.events',
    queue: 'notification-manager-queue',
    routingKeys: ['#'],
  });
  // Register handler for all event types we might receive (shared consumer matches by event.type)
  ['user.registered', 'hitl.approval.requested', 'anomaly.detected', 'organization.invitation.sent'].forEach((t) => consumer.on(t, handler));
  await consumer.start();
  console.log('Notification Manager event consumer started');
}
