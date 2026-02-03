/**
 * Event publisher for llm.reasoning.* events (merged from llm-service – Plan W5 Layer 5)
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

export async function initializeLLMReasoningEventPublisher(): Promise<void> {
  const config = loadConfig();
  if (!config.rabbitmq?.url) {
    log.warn('RabbitMQ URL not configured, LLM reasoning event publishing disabled', { service: 'ai-service' });
    return;
  }
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange ?? 'coder_events',
        exchangeType: 'topic',
      },
      'ai-service'
    );
    log.info('LLM reasoning event publisher initialized', { service: 'ai-service' });
  } catch (error) {
    log.error('Failed to initialize LLM reasoning event publisher', error as Error, { service: 'ai-service' });
    throw error;
  }
}

export async function closeLLMReasoningEventPublisher(): Promise<void> {
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
    log.error('Failed to publish llm.reasoning.requested', error as Error, { service: 'ai-service' });
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
    log.error('Failed to publish llm.reasoning.completed', error as Error, { service: 'ai-service' });
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
    log.error('Failed to publish llm.reasoning.failed', error as Error, { service: 'ai-service' });
  }
}
