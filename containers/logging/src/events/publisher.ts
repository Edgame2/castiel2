/**
 * Event Publisher
 * Publishes events from the logging module
 * Per ModuleImplementationGuide Section 9: Event-Driven Communication
 */

import { EventPublisher } from '@coder/shared';
import { getConfig } from '../config';
import { log } from '../utils/logger';

export interface LoggingEvent {
  type: string;
  organizationId?: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// Create shared event publisher instance
let publisher: EventPublisher | null = null;

function getPublisher(): EventPublisher {
  if (!publisher) {
    const config = getConfig();
    publisher = new EventPublisher(
      { url: config.rabbitmq.url, exchange: config.rabbitmq.exchange },
      'logging'
    );
  }
  return publisher;
}

/**
 * Publish an event from the logging module
 */
export async function publishEvent(
  eventType: string,
  data: Record<string, unknown>,
  organizationId?: string,
  userId?: string
): Promise<void> {
  const config = getConfig();
  
  if (!config.rabbitmq.url) {
    log.debug('RabbitMQ not configured, skipping event publish', { eventType });
    return;
  }

  try {
    // Use shared event publisher: publish(eventType, tenantId, data)
    const pub = getPublisher();
    await pub.publish(eventType, organizationId ?? '', data);

    log.debug('Event published', { eventType, organizationId });
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, organizationId });
    // Don't throw - event publishing failures shouldn't break the flow
  }
}

/**
 * Alert payload for publishing
 */
export interface AlertTriggeredPayload {
  ruleId: string;
  ruleName: string;
  organizationId?: string;
  triggeredAt: Date;
  matchCount: number;
  conditions: Record<string, unknown>;
  notificationChannels: string[];
}

/**
 * Publish alert triggered event
 */
export async function publishAlertTriggered(
  payload: AlertTriggeredPayload
): Promise<void> {
  await publishEvent('alert.triggered', {
    ruleId: payload.ruleId,
    ruleName: payload.ruleName,
    triggeredAt: payload.triggeredAt.toISOString(),
    matchCount: payload.matchCount,
    conditions: payload.conditions,
    notificationChannels: payload.notificationChannels,
  }, payload.organizationId);
}

/**
 * Publish hash chain verification failed event
 */
export async function publishVerificationFailed(
  organizationId: string,
  failedLogIds: string[],
  verifiedBy: string
): Promise<void> {
  await publishEvent('verification.failed', {
    failedLogIds,
    count: failedLogIds.length,
  }, organizationId, verifiedBy);
}

