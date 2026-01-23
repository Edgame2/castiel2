import { EventConsumer } from '@coder/shared';
import { getNotificationEngine } from '../services/NotificationEngineFactory';
import { mapEventToNotificationInput } from './eventMapper';
import { NotificationService } from '../services/NotificationService';

const notificationService = new NotificationService();
const notificationEngine = getNotificationEngine();

export async function startEventConsumer() {
  const consumer = new EventConsumer(
    'coder.events',
    'notification-manager-queue',
    ['#'] // Consume all events
  );

  await consumer.start(async (event) => {
    try {
      // Map event to notification input
      const notificationInput = mapEventToNotificationInput(event);
      
      if (!notificationInput) {
        // Skip events that don't map to notifications
        return;
      }

      // Process notification through engine
      await notificationEngine.processNotification(notificationInput, {
        eventData: event.data || {},
      });
    } catch (error: any) {
      // Log error but don't fail the event processing
      console.error(`Failed to process notification for event ${event.type}:`, error);
      
      // Fallback to basic notification creation
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
  });

  console.log('Notification Manager event consumer started');
}
