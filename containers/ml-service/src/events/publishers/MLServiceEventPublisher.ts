/**
 * Event publisher for ml-service (Plan §7.1, §3.5).
 * Publishes ml.prediction.completed for logging (MLAuditConsumer) and Usage Tracking.
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  if (!config.rabbitmq?.url) {
    console.warn('ml-service: RabbitMQ URL not configured, event publishing disabled');
    return;
  }
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'ml-service'
    );
    console.info('ml-service: Event publisher initialized');
  } catch (e: unknown) {
    console.error('ml-service: Failed to initialize event publisher', e);
    throw e;
  }
}

export async function closeEventPublisher(): Promise<void> {
  publisher = null;
  console.info('ml-service: Event publisher closed');
}

/**
 * Publish ml.prediction.completed (Plan §7.1). Payload: modelId, opportunityId?, inferenceMs.
 * Consumed by: logging (MLAuditConsumer), analytics-service (UsageTrackingConsumer).
 */
export async function publishMlPredictionCompleted(
  tenantId: string,
  data: { modelId: string; opportunityId?: string; inferenceMs: number }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.prediction.completed', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.prediction.completed', e);
  }
}

/**
 * Publish ml.model.drift.detected (Plan §940, runbook §2). PSI or other drift metric exceeds threshold.
 * Payload: modelId, segment?, metric, delta. No-op if publisher not initialized.
 */
export async function publishMlModelDriftDetected(
  tenantId: string,
  data: { modelId: string; segment?: string; metric: string; delta: number }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.model.drift.detected', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.model.drift.detected', e);
  }
}

/**
 * Publish ml.model.performance.degraded (Plan §940, runbook §2). Brier/MAE exceeds threshold.
 * Payload: modelId, metric, value, threshold. No-op if publisher not initialized.
 */
export async function publishMlModelPerformanceDegraded(
  tenantId: string,
  data: { modelId: string; metric: string; value: number; threshold: number }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.model.performance.degraded', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.model.performance.degraded', e);
  }
}
