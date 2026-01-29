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
 * Publish ml.prediction.completed (Plan §7.1). Payload: modelId, opportunityId?, inferenceMs, requestId?.
 * Consumed by: logging (MLAuditConsumer), analytics-service (UsageTrackingConsumer).
 */
export async function publishMlPredictionCompleted(
  tenantId: string,
  data: { modelId: string; opportunityId?: string; inferenceMs: number; requestId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.prediction.completed', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.prediction.completed', e);
  }
}

/**
 * Publish ml.prediction.requested (W4 Layer 3). Payload: requestId, opportunityId?, modelId.
 */
export async function publishMlPredictionRequested(
  tenantId: string,
  data: { requestId: string; opportunityId?: string; modelId: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.prediction.requested', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.prediction.requested', e);
  }
}

/**
 * Publish ml.prediction.failed (W4 Layer 3). Payload: requestId?, opportunityId?, modelId, error, durationMs.
 */
export async function publishMlPredictionFailed(
  tenantId: string,
  data: { requestId?: string; opportunityId?: string; modelId: string; error: string; durationMs: number }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.prediction.failed', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.prediction.failed', e);
  }
}

/**
 * Publish ml.model.deployed (W4 Layer 3). Payload: modelId, version, tenantId.
 */
export async function publishMlModelDeployed(
  tenantId: string,
  data: { modelId: string; version: number }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.model.deployed', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.model.deployed', e);
  }
}

/**
 * Publish ml.model.health.degraded (W4 Layer 3). Payload: modelId, metric, value, threshold, message?.
 */
export async function publishMlModelHealthDegraded(
  tenantId: string,
  data: { modelId: string; metric: string; value: number; threshold: number; message?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.model.health.degraded', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.model.health.degraded', e);
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

/** Layer 2 (COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY). Payload: requestId, opportunityIds, tenantId, modelVersion, priority. */
export async function publishFeatureExtractionRequested(
  tenantId: string,
  data: { requestId: string; opportunityIds: string[]; modelVersion?: string; priority?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('feature.extraction.requested', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish feature.extraction.requested', e);
  }
}

/** Layer 2. Payload: requestId, opportunityId, features, success, duration. */
export async function publishFeatureExtractionCompleted(
  tenantId: string,
  data: { requestId: string; opportunityId: string; features?: Record<string, number>; success: boolean; durationMs: number }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('feature.extraction.completed', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish feature.extraction.completed', e);
  }
}

/** Layer 2. Payload: opportunityId, tenantId, reason?, timestamp. */
export async function publishFeatureCacheInvalidated(
  tenantId: string,
  data: { opportunityId: string; reason?: string; timestamp: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('feature.cache.invalidated', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish feature.cache.invalidated', e);
  }
}

/** Layer 2. Payload: featureName?, issue, severity, timestamp. */
export async function publishFeatureQualityAlert(
  tenantId: string,
  data: { featureName?: string; issue: string; severity: string; value?: number; threshold?: number; message: string; timestamp: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('feature.quality.alert', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish feature.quality.alert', e);
  }
}

/** W6 Layer 8 – Learning Loop. Payload: jobId, modelId?, tenantId. */
export async function publishMlTrainingStarted(
  tenantId: string,
  data: { jobId: string; modelId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.training.started', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.training.started', e);
  }
}

/** W6 Layer 8. Payload: jobId, modelId?, metrics?, durationMs. */
export async function publishMlTrainingCompleted(
  tenantId: string,
  data: { jobId: string; modelId?: string; metrics?: Record<string, unknown>; durationMs?: number }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.training.completed', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.training.completed', e);
  }
}

/** W6 Layer 8. Payload: jobId, modelId?, error. */
export async function publishMlTrainingFailed(
  tenantId: string,
  data: { jobId: string; modelId?: string; error: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.training.failed', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.training.failed', e);
  }
}

/** W6 Layer 8 – ml.drift.detected (plan name). Payload: modelId, metric, value, threshold?, segment?. */
export async function publishMlDriftDetected(
  tenantId: string,
  data: { modelId: string; metric: string; value: number; threshold?: number; segment?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.drift.detected', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.drift.detected', e);
  }
}

/** W6 Layer 8 – ContinuousLearningService. Payload: modelId, type, priority, reason, suggestedAction?. */
export async function publishMlImprovementSuggested(
  tenantId: string,
  data: { modelId: string; type: string; priority: string; reason: string; suggestedAction?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('ml.improvement.suggested', tenantId, data);
  } catch (e: unknown) {
    console.warn('ml-service: Failed to publish ml.improvement.suggested', e);
  }
}
