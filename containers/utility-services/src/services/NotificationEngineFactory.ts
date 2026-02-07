/**
 * Notification Engine Factory
 * 
 * Creates and configures NotificationEngine instance
 */

import { NotificationEngine } from './NotificationEngine.js';
import { RoutingEngine } from './RoutingEngine.js';
import { PreferenceResolver } from './PreferenceResolver.js';
import { TemplateEngine } from './TemplateEngine.js';
import { VariableResolver } from './VariableResolver.js';
import { DeliveryManager } from './DeliveryManager.js';
import { PresenceTracker } from './PresenceTracker.js';
import { QuietHoursService } from './QuietHoursService.js';
import { DeliveryTracker } from './DeliveryTracker.js';
import { RetryService } from './RetryService.js';
import { DeduplicationService } from './DeduplicationService.js';
import { RateLimiter } from './RateLimiter.js';
import { getConfig } from '../config/index.js';

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
  const presenceTracker = config.notification?.features?.presence_aware
    ? new PresenceTracker()
    : undefined;
  const quietHoursService = config.notification?.features?.quiet_hours
    ? new QuietHoursService()
    : undefined;
  const routingEngine = new RoutingEngine(
    preferenceResolver,
    presenceTracker,
    quietHoursService
  );
  const templateEngine = new TemplateEngine();
  const variableResolver = new VariableResolver();
  const deliveryTracker = config.notification?.features?.delivery_tracking
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

