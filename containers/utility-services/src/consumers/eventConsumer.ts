import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../config';
import { getNotificationEngine } from '../services/NotificationEngineFactory';
import { mapEventToNotificationInput } from './eventMapper';
import { NotificationService } from '../services/NotificationService';

const notificationService = new NotificationService();
const notificationEngine = getNotificationEngine();

const EVENT_TYPES = [
  'user.registered',
  'user.password_reset_requested',
  'user.password_reset_success',
  'user.email_verification_requested',
  'user.email_verified',
  'user.password_changed',
  'planning.plan.created',
  'planning.plan.executed',
  'ai.completion.completed',
  'ai.completion.failed',
  'usage.event.recorded',
  'session.revoked',
  'sessions.bulk_revoked',
];

export async function startEventConsumer() {
  const config = loadConfig();
  if (!config.rabbitmq?.url) {
    console.warn('RabbitMQ URL not configured, event consumer disabled');
    return;
  }

  const consumer = new EventConsumer({
    url: config.rabbitmq.url,
    exchange: config.rabbitmq.exchange || 'coder.events',
    queue: config.rabbitmq.queue || 'notification-manager-queue',
    routingKeys: (config.rabbitmq as { bindings?: string[] }).bindings ?? ['#'],
  });

  const handler = async (event: any) => {
    try {
      const notificationInput = mapEventToNotificationInput(event);
      if (!notificationInput) return;
      await notificationEngine.processNotification(notificationInput, {
        eventData: event.data || {},
      });
    } catch (error: any) {
      console.error(`Failed to process notification for event ${event.type}:`, error);
      try {
        const notificationInput = mapEventToNotificationInput(event);
        if (notificationInput) {
          await notificationService.createNotification({
            userId: notificationInput.recipientId,
            organizationId: notificationInput.organizationId,
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

  EVENT_TYPES.forEach((type) => consumer.on(type, handler));
  await consumer.start();
  console.log('Notification Manager event consumer started');
}
