/**
 * Event publisher for feedback.recorded, outcome.recorded, feedback.trend.alert (Plan W6 Layer 7)
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config/index.js';
import { log } from '../../utils/logger.js';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  if (!config.rabbitmq?.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'learning-service' });
    return;
  }
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange ?? 'coder_events',
        exchangeType: 'topic',
      },
      'learning-service'
    );
    log.info('Event publisher initialized', { service: 'learning-service' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'learning-service' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  publisher = null;
}

export async function publishFeedbackRecorded(
  tenantId: string,
  data: { feedbackId: string; modelId: string; feedbackType: string; predictionId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('feedback.recorded', tenantId, data);
  } catch (error) {
    log.error('Failed to publish feedback.recorded', error, { service: 'learning-service' });
  }
}

export async function publishOutcomeRecorded(
  tenantId: string,
  data: { outcomeId: string; modelId: string; outcomeType: string; success: boolean; predictionId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('outcome.recorded', tenantId, data);
  } catch (error) {
    log.error('Failed to publish outcome.recorded', error, { service: 'learning-service' });
  }
}

export async function publishFeedbackTrendAlert(
  tenantId: string,
  data: { modelId: string; message: string; period: { from: string; to: string } }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('feedback.trend.alert', tenantId, data);
  } catch (error) {
    log.error('Failed to publish feedback.trend.alert', error, { service: 'learning-service' });
  }
}
