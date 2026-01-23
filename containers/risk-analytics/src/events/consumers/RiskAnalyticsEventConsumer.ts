/**
 * Event consumer for risk analytics
 * Consumes opportunity change events and triggers risk evaluation/scoring
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { publishRiskAnalyticsEvent } from '../publishers/RiskAnalyticsEventPublisher';
import { RiskEvaluationService } from '../../services/RiskEvaluationService';

let consumer: EventConsumer | null = null;
let riskEvaluationService: RiskEvaluationService | null = null;
// Note: Event consumer creates service without Fastify app - service will handle gracefully

/**
 * Initialize event consumer
 */
export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'risk-analytics' });
    return;
  }
  
  try {
    // Initialize risk evaluation service
    riskEvaluationService = new RiskEvaluationService();
    
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      bindings: config.rabbitmq.bindings,
    });

    // Handle opportunity change events
    consumer.on('integration.opportunity.updated', async (event) => {
      log.info('Opportunity change detected, starting risk evaluation', {
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'risk-analytics',
      });
      
      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }
      
      try {
        await riskEvaluationService.evaluateRisk({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          trigger: 'opportunity_updated',
          options: {
            includeHistorical: true,
            includeAI: true,
            includeSemanticDiscovery: false,
          },
        });
      } catch (error: any) {
        log.error('Failed to evaluate risk from opportunity update', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'risk-analytics',
        });
      }
    });

    // Handle workflow-triggered risk analysis
    consumer.on('workflow.risk.analysis.requested', async (event) => {
      log.info('Workflow risk analysis requested', {
        workflowId: event.data.workflowId,
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'risk-analytics',
      });
      
      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }
      
      try {
        await riskEvaluationService.evaluateRisk({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          workflowId: event.data.workflowId, // Forward workflowId
          trigger: 'workflow',
          options: {
            includeHistorical: true,
            includeAI: true,
            includeSemanticDiscovery: true,
          },
        });
      } catch (error: any) {
        log.error('Failed to evaluate risk from workflow', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'risk-analytics',
        });
      }
    });

    // Handle workflow-triggered risk scoring
    consumer.on('workflow.risk.scoring.requested', async (event) => {
      log.info('Workflow risk scoring requested', {
        workflowId: event.data.workflowId,
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'risk-analytics',
      });
      
      if (!riskEvaluationService) {
        log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
        return;
      }
      
      try {
        const modelSelection = await riskEvaluationService.getModelSelection(event.tenantId, 'risk-scoring');
        // Store workflowId in modelSelection for forwarding
        (modelSelection as any).workflowId = event.data.workflowId;
        await riskEvaluationService.performMLRiskScoring(
          event.data.opportunityId,
          event.tenantId,
          modelSelection
        );
      } catch (error: any) {
        log.error('Failed to perform risk scoring from workflow', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'risk-analytics',
        });
      }
    });

    // Handle shard updates
    consumer.on('shard.updated', async (event) => {
      // Only process opportunity-type shards
      if (event.data.shardType === 'opportunity' || event.data.shardTypeName === 'opportunity') {
        log.debug('Opportunity shard updated, triggering risk evaluation', {
          shardId: event.data.shardId,
          tenantId: event.tenantId,
          service: 'risk-analytics',
        });
        
        if (!riskEvaluationService) {
          log.error('Risk evaluation service not initialized', { service: 'risk-analytics' });
          return;
        }
        
        try {
          await riskEvaluationService.evaluateRisk({
            opportunityId: event.data.shardId,
            tenantId: event.tenantId,
            trigger: 'shard_created',
            options: {
              includeHistorical: true,
              includeAI: true,
            },
          });
        } catch (error: any) {
          log.error('Failed to evaluate risk from shard update', error, {
            shardId: event.data.shardId,
            tenantId: event.tenantId,
            service: 'risk-analytics',
          });
        }
      }
    });

    // Handle sync completion
    consumer.on('integration.sync.completed', async (event) => {
      log.info('Integration sync completed, triggering risk evaluation', {
        tenantId: event.tenantId,
        service: 'risk-analytics',
      });
      
      // Note: Sync completion doesn't specify opportunityId, so we skip evaluation
      // Individual opportunity updates will trigger evaluations via shard.updated events
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'risk-analytics' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'risk-analytics' });
    throw error;
  }
}


/**
 * Close event consumer
 */
export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    consumer = null;
  }
}
