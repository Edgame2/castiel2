/**
 * Event publisher for recommendation events
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'recommendations' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'recommendations'
    );
    log.info('Event publisher initialized', { service: 'recommendations' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'recommendations' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    publisher = null;
  }
}

export async function publishRecommendationEvent(
  eventType: string,
  tenantId: string,
  data: Record<string, unknown>,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'recommendations' });
    return;
  }

  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'recommendations' });
  }
}

/**
 * Publish remediation.workflow.created (Plan §7.1, §929). Consumers: notification-manager.
 */
export async function publishRemediationWorkflowCreated(
  tenantId: string,
  data: { workflowId: string; opportunityId: string; assignedTo: string }
): Promise<void> {
  await publishRecommendationEvent('remediation.workflow.created', tenantId, {
    workflowId: data.workflowId,
    opportunityId: data.opportunityId,
    assignedTo: data.assignedTo,
  });
}

/**
 * Publish remediation.step.completed (Plan §7.1, §929). Consumers: notification-manager.
 */
export async function publishRemediationStepCompleted(
  tenantId: string,
  data: { workflowId: string; stepNumber: number; completedBy: string; allStepsComplete: boolean }
): Promise<void> {
  await publishRecommendationEvent('remediation.step.completed', tenantId, {
    workflowId: data.workflowId,
    stepNumber: data.stepNumber,
    completedBy: data.completedBy,
    allStepsComplete: data.allStepsComplete,
  });
}

/**
 * Publish remediation.workflow.completed (Plan §10, §929). Consumed by logging MLAuditConsumer.
 * Call when RemediationWorkflowService completes a workflow (all steps done or workflow cancelled).
 */
export async function publishRemediationWorkflowCompleted(
  tenantId: string,
  data: { workflowId: string; opportunityId: string; status: 'completed' | 'cancelled'; completedAt?: string; userId?: string; duration?: number }
): Promise<void> {
  await publishRecommendationEvent('remediation.workflow.completed', tenantId, {
    workflowId: data.workflowId,
    opportunityId: data.opportunityId,
    status: data.status,
    completedAt: data.completedAt ?? new Date().toISOString(),
    userId: data.userId,
    duration: data.duration,
  });
}
