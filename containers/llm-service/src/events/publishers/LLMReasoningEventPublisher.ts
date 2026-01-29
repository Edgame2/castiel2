/**
 * Event publisher for llm.reasoning.* events (Plan W5 Layer 5)
 * Naming: llm.reasoning.requested | completed | failed
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  if (!config.rabbitmq?.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'llm-service' });
    return;
  }
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange ?? 'coder_events',
        exchangeType: 'topic',
      },
      'llm-service'
    );
    log.info('Event publisher initialized', { service: 'llm-service' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'llm-service' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  publisher = null;
}

export async function publishReasoningRequested(
  tenantId: string,
  data: { requestId: string; reasoningType: string; opportunityId: string; predictionId?: string; correlationId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('llm.reasoning.requested', tenantId, data);
  } catch (error) {
    log.error('Failed to publish llm.reasoning.requested', error, { service: 'llm-service' });
  }
}

export async function publishReasoningCompleted(
  tenantId: string,
  data: { requestId: string; output: unknown; latency: number; correlationId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('llm.reasoning.completed', tenantId, data);
  } catch (error) {
    log.error('Failed to publish llm.reasoning.completed', error, { service: 'llm-service' });
  }
}

export async function publishReasoningFailed(
  tenantId: string,
  data: { requestId: string; error: string; correlationId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('llm.reasoning.failed', tenantId, data);
  } catch (error) {
    log.error('Failed to publish llm.reasoning.failed', error, { service: 'llm-service' });
  }
}
