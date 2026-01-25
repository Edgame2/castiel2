/**
 * Event publisher for risk analytics events
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';

let publisher: EventPublisher | null = null;

export async function initializeEventPublisher(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event publishing disabled', { service: 'risk-analytics' });
    return;
  }
  
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'risk-analytics'
    );
    log.info('Event publisher initialized', { service: 'risk-analytics' });
  } catch (error) {
    log.error('Failed to initialize event publisher', error, { service: 'risk-analytics' });
    throw error;
  }
}

export async function closeEventPublisher(): Promise<void> {
  if (publisher) {
    publisher = null;
  }
}

export async function publishRiskAnalyticsEvent(
  eventType: string,
  tenantId: string,
  data: any,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping event', { eventType, service: 'risk-analytics' });
    return;
  }

  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    log.error('Failed to publish event', error, { eventType, service: 'risk-analytics' });
  }
}

const SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Publish workflow.job.trigger (Plan §9.3, §915). For on-demand trigger of risk-clustering.
 * Consumer: BatchJobWorker (bi_batch_jobs). Payload: { job, metadata, triggeredBy, timestamp }.
 */
export async function publishJobTrigger(job: string, metadata?: Record<string, unknown>): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping workflow.job.trigger', { job, service: 'risk-analytics' });
    return;
  }
  try {
    await publisher.publish('workflow.job.trigger', SYSTEM_TENANT_ID, {
      job,
      metadata: metadata ?? {},
      triggeredBy: 'api',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    log.error('Failed to publish workflow.job.trigger', e instanceof Error ? e : new Error(String(e)), { job, service: 'risk-analytics' });
    throw e;
  }
}

export async function publishJobCompleted(job: string, completedAt?: string): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('workflow.job.completed', SYSTEM_TENANT_ID, {
      job,
      status: 'success',
      completedAt: completedAt || new Date().toISOString(),
    });
  } catch (e) {
    log.error('Failed to publish workflow.job.completed', e instanceof Error ? e : new Error(String(e)), { job, service: 'risk-analytics' });
  }
}

export async function publishJobFailed(job: string, error: string, failedAt?: string): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('workflow.job.failed', SYSTEM_TENANT_ID, {
      job,
      error,
      failedAt: failedAt || new Date().toISOString(),
    });
  } catch (e) {
    log.error('Failed to publish workflow.job.failed', e instanceof Error ? e : new Error(String(e)), { job, service: 'risk-analytics' });
  }
}

/**
 * Publish risk.prediction.generated (Plan §10). Emitted when EarlyWarningService.generatePredictions writes to risk_predictions.
 */
export async function publishRiskPredictionGenerated(
  tenantId: string,
  data: {
    predictionId: string;
    opportunityId: string;
    horizons: Record<string, { riskScore: number; confidence: number }>;
    modelId: string;
    predictionDate: string;
  }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('risk.prediction.generated', tenantId, data);
  } catch (e) {
    log.error('Failed to publish risk.prediction.generated', e instanceof Error ? e : new Error(String(e)), { opportunityId: data.opportunityId, service: 'risk-analytics' });
  }
}

/**
 * Publish opportunity.quick_action.requested (Plan §942, §11.10). create_task, log_activity, start_remediation.
 * Consumers: workflow-orchestrator, integration-manager, or recommendations (for start_remediation when POST /remediation-workflows exists).
 */
export async function publishOpportunityQuickActionRequested(
  tenantId: string,
  data: { opportunityId: string; userId: string; action: 'create_task' | 'log_activity' | 'start_remediation'; payload?: Record<string, unknown> }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping opportunity.quick_action.requested', { opportunityId: data.opportunityId, action: data.action, service: 'risk-analytics' });
    return;
  }
  try {
    await publisher.publish('opportunity.quick_action.requested', tenantId, { ...data, payload: data.payload ?? {} });
  } catch (e) {
    log.error('Failed to publish opportunity.quick_action.requested', e instanceof Error ? e : new Error(String(e)), { opportunityId: data.opportunityId, action: data.action, service: 'risk-analytics' });
  }
}

/**
 * Publish anomaly.detected (Plan §920, §676). Emit when AnomalyDetectionService detects and persists to risk_anomaly_alerts.
 * Consumers: notification-manager (high severity), logging.
 */
export async function publishAnomalyDetected(
  tenantId: string,
  data: { opportunityId: string; anomalyType: string; severity: string; description: string; detectedAt?: string; ownerId?: string }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping anomaly.detected', { opportunityId: data.opportunityId, service: 'risk-analytics' });
    return;
  }
  try {
    await publisher.publish('anomaly.detected', tenantId, { ...data, tenantId, detectedAt: data.detectedAt ?? new Date().toISOString() });
  } catch (e) {
    log.error('Failed to publish anomaly.detected', e instanceof Error ? e : new Error(String(e)), { opportunityId: data.opportunityId, service: 'risk-analytics' });
  }
}

/**
 * Publish hitl.approval.requested (Plan §972). When feature_flags.hitl_approvals and riskScore ≥ hitl_risk_min and amount ≥ hitl_deal_min.
 * Payload: tenantId, opportunityId, riskScore, amount, requestedAt; ownerId or approverId or recipientId for notification-manager.
 */
export async function publishHitlApprovalRequested(
  tenantId: string,
  data: {
    opportunityId: string;
    riskScore: number;
    amount: number;
    requestedAt: string;
    ownerId?: string;
    approverId?: string;
    recipientId?: string;
    correlationId?: string;
    approvalUrl?: string;
  }
): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping hitl.approval.requested', { opportunityId: data.opportunityId, service: 'risk-analytics' });
    return;
  }
  try {
    await publisher.publish('hitl.approval.requested', tenantId, {
      ...data,
      tenantId,
    });
  } catch (e) {
    log.error('Failed to publish hitl.approval.requested', e instanceof Error ? e : new Error(String(e)), { opportunityId: data.opportunityId, service: 'risk-analytics' });
  }
}

/** Publish opportunity.outcome.recorded (DATA_LAKE_LAYOUT §3). Payload: tenantId, opportunityId, outcome, competitorId?, closeDate, amount. */
export async function publishOpportunityOutcomeRecorded(payload: {
  tenantId: string;
  opportunityId: string;
  outcome: 'won' | 'lost';
  competitorId?: string | null;
  closeDate: string;
  amount: number;
}): Promise<void> {
  if (!publisher) {
    log.warn('Event publisher not initialized, skipping opportunity.outcome.recorded', { opportunityId: payload.opportunityId, service: 'risk-analytics' });
    return;
  }
  try {
    await publisher.publish('opportunity.outcome.recorded', payload.tenantId, {
      ...payload,
      competitorId: payload.competitorId ?? null,
    });
  } catch (e) {
    log.error('Failed to publish opportunity.outcome.recorded', e instanceof Error ? e : new Error(String(e)), { opportunityId: payload.opportunityId, service: 'risk-analytics' });
    throw e;
  }
}
