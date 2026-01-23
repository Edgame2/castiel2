/**
 * Notification Engine Factory
 * 
 * Creates and configures NotificationEngine instance
 */

import { NotificationEngine } from './NotificationEngine';
import { RoutingEngine } from './RoutingEngine';
import { PreferenceResolver } from './PreferenceResolver';
import { TemplateEngine } from './TemplateEngine';
import { VariableResolver } from './VariableResolver';
import { DeliveryManager } from './DeliveryManager';
import { PresenceTracker } from './PresenceTracker';
import { QuietHoursService } from './QuietHoursService';
import { DeliveryTracker } from './DeliveryTracker';
import { RetryService } from './RetryService';
import { DeduplicationService } from './DeduplicationService';
import { RateLimiter } from './RateLimiter';
import { getConfig } from '../config';

let engineInstance: NotificationEngine | null = null;

/**
 * Get or create NotificationEngine instance
 */
export function getNotificationEngine(): NotificationEngine {
  if (engineInstance) {
    return engineInstance;
  }

  const config = getConfig();
  
  // Create dependencies
  const preferenceResolver = new PreferenceResolver();
  const presenceTracker = config.notification.features?.presence_aware 
    ? new PresenceTracker()
    : undefined;
  const quietHoursService = config.notification.features?.quiet_hours
    ? new QuietHoursService()
    : undefined;
  const routingEngine = new RoutingEngine(
    preferenceResolver,
    presenceTracker,
    quietHoursService
  );
  const templateEngine = new TemplateEngine();
  const variableResolver = new VariableResolver();
  const deliveryTracker = config.notification.features?.delivery_tracking
    ? new DeliveryTracker()
    : undefined;
  const retryService = new RetryService();
  const deliveryManager = new DeliveryManager(deliveryTracker, retryService);
  const deduplicationService = new DeduplicationService();
  const rateLimiter = new RateLimiter();

  // Create engine
  engineInstance = new NotificationEngine(
    routingEngine,
    preferenceResolver,
    templateEngine,
    variableResolver,
    deliveryManager,
    deduplicationService,
    rateLimiter
  );

  return engineInstance;
}

/**
 * Reset engine (useful for testing)
 */
export function resetNotificationEngine(): void {
  engineInstance = null;
}

