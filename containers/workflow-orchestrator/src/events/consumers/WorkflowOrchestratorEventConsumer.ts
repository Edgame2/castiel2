/**
 * Event consumer for workflow orchestrator
 * Consumes opportunity change events and coordinates parallel workflows
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { WorkflowOrchestratorService } from '../../services/WorkflowOrchestratorService';
import { createFromEvent } from '../../services/HitlApprovalService';

let consumer: EventConsumer | null = null;
let workflowOrchestratorService: WorkflowOrchestratorService | null = null;

export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'workflow-orchestrator' });
    return;
  }
  
  try {
    // Initialize workflow orchestrator service
    workflowOrchestratorService = new WorkflowOrchestratorService();
    
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      routingKeys: config.rabbitmq.bindings ?? [],
    });

    // Handle opportunity change events from integration-manager
    consumer.on('integration.opportunity.updated', async (event) => {
      const opportunityId = event.data?.opportunityId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('integration.opportunity.updated missing opportunityId or tenantId', { hasData: !!event.data, service: 'workflow-orchestrator' });
        return;
      }
      log.info('Opportunity change detected, starting analysis workflow', { opportunityId, tenantId, service: 'workflow-orchestrator' });

      if (!workflowOrchestratorService) {
        log.error('Workflow orchestrator service not initialized', { service: 'workflow-orchestrator' });
        return;
      }

      try {
        await workflowOrchestratorService.startOpportunityAnalysisWorkflow(opportunityId, tenantId);
      } catch (error: unknown) {
        log.error('Failed to start workflow from opportunity update', error instanceof Error ? error : new Error(String(error)), { opportunityId, tenantId, service: 'workflow-orchestrator' });
      }
    });

    // Handle shard updates (opportunity type)
    consumer.on('shard.updated', async (event) => {
      if (!event.data) {
        log.warn('shard.updated missing event.data', { service: 'workflow-orchestrator' });
        return;
      }
      const shardId = event.data.shardId ?? event.data.id;
      const tenantId = event.tenantId ?? event.data.tenantId;
      if (!shardId || !tenantId) {
        log.warn('shard.updated missing shardId or tenantId', { hasData: true, service: 'workflow-orchestrator' });
        return;
      }
      if (event.data.shardType !== 'opportunity' && event.data.shardTypeName !== 'opportunity') return;

      log.info('Opportunity shard updated, starting analysis workflow', { shardId, tenantId, service: 'workflow-orchestrator' });

      if (!workflowOrchestratorService) {
        log.error('Workflow orchestrator service not initialized', { service: 'workflow-orchestrator' });
        return;
      }

      try {
        await workflowOrchestratorService.startOpportunityAnalysisWorkflow(shardId, tenantId);
      } catch (error: unknown) {
        log.error('Failed to start workflow from shard update', error instanceof Error ? error : new Error(String(error)), { shardId, tenantId, service: 'workflow-orchestrator' });
      }
    });

    // Handle risk evaluation completion
    consumer.on('risk.evaluation.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      const workflowId = event.data?.workflowId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!workflowId || !tenantId) return;
      await workflowOrchestratorService.handleStepCompletion(
        workflowId,
        'risk_analysis',
        {
          evaluationId: event.data?.evaluationId,
          riskScore: event.data?.riskScore,
          detectedRisks: event.data?.detectedRisks,
        },
        tenantId
      );
    });

    // Handle risk scoring completion
    consumer.on('risk.scoring.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      const workflowId = event.data?.workflowId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!workflowId || !tenantId) return;
      await workflowOrchestratorService.handleStepCompletion(
        workflowId,
        'risk_scoring',
        {
          scoringId: event.data?.scoringId,
          mlRiskScore: event.data?.mlRiskScore,
          modelId: event.data?.modelId,
          confidence: event.data?.confidence,
        },
        tenantId
      );
    });

    // Handle forecast completion
    consumer.on('forecast.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      const workflowId = event.data?.workflowId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!workflowId || !tenantId) return;
      await workflowOrchestratorService.handleStepCompletion(
        workflowId,
        'forecast',
        {
          forecastId: event.data?.forecastId,
          revenueForecast: event.data?.revenueForecast,
          confidence: event.data?.confidence,
        },
        tenantId
      );
    });

    // Handle recommendation completion
    consumer.on('recommendation.generation.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      const workflowId = event.data?.workflowId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!workflowId || !tenantId) return;
      await workflowOrchestratorService.handleStepCompletion(
        workflowId,
        'recommendation',
        {
          recommendationId: event.data?.recommendationId,
          recommendations: event.data?.recommendations,
          count: event.data?.recommendations?.length || 0,
        },
        tenantId
      );
    });

    // Handle workflow step failures
    consumer.on('risk.evaluation.failed', async (event) => {
      if (!workflowOrchestratorService) return;
      const workflowId = event.data?.workflowId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!workflowId || !tenantId) return;
      await workflowOrchestratorService.handleStepFailure(
        workflowId,
        'risk_analysis',
        event.data?.error || 'Risk evaluation failed',
        tenantId
      );
    });

    consumer.on('recommendation.generation.failed', async (event) => {
      if (!workflowOrchestratorService) return;
      const workflowId = event.data?.workflowId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!workflowId || !tenantId) return;
      await workflowOrchestratorService.handleStepFailure(
        workflowId,
        'recommendation',
        event.data?.error || 'Recommendation generation failed',
        tenantId
      );
    });

    // HITL (Plan §972, hitl-approval-flow runbook): create approval from hitl.approval.requested
    consumer.on('hitl.approval.requested', async (event) => {
      const tenantId = event.tenantId ?? event.data?.tenantId;
      const d = event.data;
      if (!tenantId || !d?.opportunityId || typeof d.riskScore !== 'number' || typeof d.amount !== 'number') {
        log.warn('hitl.approval.requested missing tenantId, opportunityId, riskScore or amount', { hasData: !!d, service: 'workflow-orchestrator' });
        return;
      }
      try {
        await createFromEvent(tenantId, {
          opportunityId: d.opportunityId,
          riskScore: d.riskScore,
          amount: d.amount,
          requestedAt: d.requestedAt ?? new Date().toISOString(),
          ownerId: d.ownerId,
          approverId: d.approverId,
          recipientId: d.recipientId,
          correlationId: d.correlationId,
          approvalUrl: d.approvalUrl,
        });
      } catch (error: unknown) {
        log.error('Failed to create HITL approval from hitl.approval.requested', error instanceof Error ? error : new Error(String(error)), {
          opportunityId: d.opportunityId,
          tenantId,
          service: 'workflow-orchestrator',
        });
      }
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'workflow-orchestrator' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'workflow-orchestrator' });
    throw error;
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
}
