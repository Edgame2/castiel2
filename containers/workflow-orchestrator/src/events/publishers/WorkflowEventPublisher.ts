/**
 * Event publisher for workflow events
 */

import { trace } from '@opentelemetry/api';
import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'workflow-orchestrator' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'workflow-orchestrator'
    );
    log.info('Event publisher initialized', { service: 'workflow-orchestrator' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'workflow-orchestrator' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    publisher = null;
  }
}

export async function publishWorkflowEvent(
  eventType: string,
  tenantId: string,
  data: any,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'workflow-orchestrator' });
    return;
  }

  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'workflow-orchestrator' });
  }
}

/** System tenantId for job events (workflow.job.trigger, etc.) */
const SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Publish workflow.job.trigger for batch jobs (Plan §9.3). Payload: job, metadata, triggeredBy, timestamp.
 */
export async function publishJobTrigger(
  job: string,
  metadata?: { schedule?: string; triggeredAt?: string; from?: string; to?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping job trigger', { job, service: 'workflow-orchestrator' });
    return;
  }
  try {
    await publisher.publish('workflow.job.trigger', SYSTEM_TENANT_ID, {
      job,
      metadata: metadata || {},
      triggeredBy: 'scheduler',
      timestamp: new Date().toISOString(),
    });
    log.info('Published workflow.job.trigger', { job, metadata, service: 'workflow-orchestrator' });
    trace.getTracer('workflow-orchestrator').startSpan('workflow.job.trigger', { attributes: { job } }).end();
  } catch (error) {
    log.error('Failed to publish workflow.job.trigger', error, { job, service: 'workflow-orchestrator' });
    throw error;
  }
}
