/**
 * Event consumer for workflow orchestrator
 * Consumes opportunity change events and coordinates parallel workflows
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { WorkflowOrchestratorService } from '../../services/WorkflowOrchestratorService';
import { WorkflowStepType } from '../../types/workflow.types';

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
      bindings: config.rabbitmq.bindings,
    });

    // Handle opportunity change events from integration-manager
    consumer.on('integration.opportunity.updated', async (event) => {
      log.info('Opportunity change detected, starting analysis workflow', {
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'workflow-orchestrator',
      });
      
      if (!workflowOrchestratorService) {
        log.error('Workflow orchestrator service not initialized', { service: 'workflow-orchestrator' });
        return;
      }
      
      try {
        await workflowOrchestratorService.startOpportunityAnalysisWorkflow(
          event.data.opportunityId,
          event.tenantId
        );
      } catch (error: any) {
        log.error('Failed to start workflow from opportunity update', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'workflow-orchestrator',
        });
      }
    });

    // Handle shard updates (opportunity type)
    consumer.on('shard.updated', async (event) => {
      // Only process opportunity-type shards
      if (event.data.shardType === 'opportunity' || event.data.shardTypeName === 'opportunity') {
        log.info('Opportunity shard updated, starting analysis workflow', {
          shardId: event.data.shardId,
          tenantId: event.tenantId,
          service: 'workflow-orchestrator',
        });
        
        if (!workflowOrchestratorService) {
          log.error('Workflow orchestrator service not initialized', { service: 'workflow-orchestrator' });
          return;
        }
        
        try {
          await workflowOrchestratorService.startOpportunityAnalysisWorkflow(
            event.data.shardId,
            event.tenantId
          );
        } catch (error: any) {
          log.error('Failed to start workflow from shard update', error, {
            shardId: event.data.shardId,
            tenantId: event.tenantId,
            service: 'workflow-orchestrator',
          });
        }
      }
    });

    // Handle risk evaluation completion
    consumer.on('risk.evaluation.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      
      // Extract workflowId from event data
      const workflowId = event.data.workflowId;
      if (workflowId) {
        await workflowOrchestratorService.handleStepCompletion(
          workflowId,
          'risk_analysis',
          {
            evaluationId: event.data.evaluationId,
            riskScore: event.data.riskScore,
            detectedRisks: event.data.detectedRisks,
          },
          event.tenantId
        );
      }
    });

    // Handle risk scoring completion
    consumer.on('risk.scoring.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      
      const workflowId = event.data.workflowId;
      if (workflowId) {
        await workflowOrchestratorService.handleStepCompletion(
          workflowId,
          'risk_scoring',
          {
            scoringId: event.data.scoringId,
            mlRiskScore: event.data.mlRiskScore,
            modelId: event.data.modelId,
            confidence: event.data.confidence,
          },
          event.tenantId
        );
      }
    });

    // Handle forecast completion
    consumer.on('forecast.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      
      const workflowId = event.data.workflowId;
      if (workflowId) {
        await workflowOrchestratorService.handleStepCompletion(
          workflowId,
          'forecast',
          {
            forecastId: event.data.forecastId,
            revenueForecast: event.data.revenueForecast,
            confidence: event.data.confidence,
          },
          event.tenantId
        );
      }
    });

    // Handle recommendation completion
    consumer.on('recommendation.generation.completed', async (event) => {
      if (!workflowOrchestratorService) return;
      
      const workflowId = event.data.workflowId;
      if (workflowId) {
        await workflowOrchestratorService.handleStepCompletion(
          workflowId,
          'recommendation',
          {
            recommendationId: event.data.recommendationId,
            recommendations: event.data.recommendations,
            count: event.data.recommendations?.length || 0,
          },
          event.tenantId
        );
      }
    });

    // Handle workflow step failures
    consumer.on('risk.evaluation.failed', async (event) => {
      if (!workflowOrchestratorService) return;
      
      const workflowId = event.data.workflowId;
      if (workflowId) {
        await workflowOrchestratorService.handleStepFailure(
          workflowId,
          'risk_analysis',
          event.data.error || 'Risk evaluation failed',
          event.tenantId
        );
      }
    });

    consumer.on('recommendation.generation.failed', async (event) => {
      if (!workflowOrchestratorService) return;
      
      const workflowId = event.data.workflowId;
      if (workflowId) {
        await workflowOrchestratorService.handleStepFailure(
          workflowId,
          'recommendation',
          event.data.error || 'Recommendation generation failed',
          event.tenantId
        );
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
    consumer = null;
  }
}
