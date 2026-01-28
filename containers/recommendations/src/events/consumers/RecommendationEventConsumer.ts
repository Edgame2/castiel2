/**
 * Event consumer for recommendations
 * Consumes opportunity/risk/forecast events and generates recommendations
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { RecommendationsService } from '../../services/RecommendationsService';

let consumer: EventConsumer | null = null;
let recommendationsService: RecommendationsService | null = null;
// Note: Event consumer creates service without Fastify app - service will handle gracefully

export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'recommendations' });
    return;
  }
  
  try {
    // Initialize recommendations service
    recommendationsService = new RecommendationsService();
    
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      bindings: config.rabbitmq.bindings,
    });

    // Handle opportunity updates
    consumer.on('opportunity.updated', async (event) => {
      const opportunityId = event.data?.opportunityId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('opportunity.updated missing opportunityId or tenantId', { hasData: !!event.data, service: 'recommendations' });
        return;
      }
      log.info('Opportunity updated, generating recommendations', { opportunityId, tenantId, service: 'recommendations' });

      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }

      try {
        await recommendationsService.generateRecommendations({ opportunityId, tenantId, limit: 20 });
      } catch (error: unknown) {
        log.error('Failed to generate recommendations from opportunity update', error instanceof Error ? error : new Error(String(error)), { opportunityId, tenantId, service: 'recommendations' });
      }
    });

    // Handle integration opportunity updates
    // Note: Sequential processing after risk and forecast is ensured by risk.evaluation.completed and forecast.completed handlers below
    // This handler processes integration.opportunity.updated events, but recommendations will be triggered
    // after risk evaluation and forecast completion via their respective completion events
    consumer.on('integration.opportunity.updated', async (event) => {
      const data = event?.data ?? {};
      const opportunityId = data.opportunityId;
      const tenantId = event.tenantId ?? data.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('integration.opportunity.updated missing opportunityId or tenantId', { hasData: !!event?.data, service: 'recommendations' });
        return;
      }
      log.info('Integration opportunity updated, will generate recommendations after risk and forecast', {
        opportunityId,
        tenantId,
        service: 'recommendations',
      });

      // Note: We don't generate recommendations immediately here because:
      // 1. Risk evaluation is triggered by integration.opportunity.updated in risk-analytics
      // 2. Risk evaluation publishes risk.evaluation.completed when done
      // 3. Forecasting consumes risk.evaluation.completed and publishes forecast.completed when done
      // 4. Our forecast.completed handler will generate recommendations sequentially
      // This ensures recommendations are generated with the latest risk and forecast data
      
      // If risk/forecast evaluation is disabled or not available, we can generate recommendations directly
      // For now, we wait for forecast.completed to ensure sequential processing
      log.debug('Waiting for forecast.completed before generating recommendations', {
        opportunityId,
        tenantId,
        service: 'recommendations',
      });
    });

    // Handle risk evaluation completion
    consumer.on('risk.evaluation.completed', async (event) => {
      const opportunityId = event.data?.opportunityId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('risk.evaluation.completed missing opportunityId or tenantId', { hasData: !!event.data, service: 'recommendations' });
        return;
      }
      log.info('Risk evaluation completed, generating recommendations', { opportunityId, tenantId, service: 'recommendations' });

      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }

      try {
        await recommendationsService.generateRecommendations({ opportunityId, tenantId, limit: 20 });
      } catch (error: unknown) {
        log.error('Failed to generate recommendations from risk evaluation', error instanceof Error ? error : new Error(String(error)), { opportunityId, tenantId, service: 'recommendations' });
      }
    });

    // Handle forecast completion
    consumer.on('forecast.completed', async (event) => {
      const data = event?.data ?? {};
      const opportunityId = data.opportunityId;
      const tenantId = event.tenantId ?? data.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('forecast.completed missing opportunityId or tenantId', { hasData: !!event?.data, service: 'recommendations' });
        return;
      }
      log.info('Forecast completed, generating recommendations', { opportunityId, tenantId, service: 'recommendations' });

      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }

      try {
        await recommendationsService.generateRecommendations({ opportunityId, tenantId, limit: 20 });
      } catch (error: unknown) {
        log.error('Failed to generate recommendations from forecast', error instanceof Error ? error : new Error(String(error)), {
          opportunityId,
          tenantId,
          service: 'recommendations',
        });
      }
    });

    // Handle workflow-triggered recommendations
    consumer.on('workflow.recommendation.requested', async (event) => {
      const opportunityId = event.data?.opportunityId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      const workflowId = event.data?.workflowId;
      if (!opportunityId || !tenantId) {
        log.warn('workflow.recommendation.requested missing opportunityId or tenantId', { hasData: !!event.data, service: 'recommendations' });
        return;
      }
      log.info('Workflow recommendation requested', { workflowId, opportunityId, tenantId, service: 'recommendations' });

      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }

      try {
        await recommendationsService.generateRecommendations({ opportunityId, tenantId, workflowId, limit: 20 });
      } catch (error: unknown) {
        log.error('Failed to generate recommendations from workflow', error instanceof Error ? error : new Error(String(error)), { opportunityId, tenantId, service: 'recommendations' });
      }
    });

    // Handle shard updates
    consumer.on('shard.updated', async (event) => {
      const shardId = event.data?.shardId ?? event.data?.id;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!shardId || !tenantId) {
        log.warn('shard.updated missing shardId or tenantId', { hasData: !!event.data, service: 'recommendations' });
        return;
      }
      log.debug('Shard updated, may trigger contextual recommendations', { shardId, tenantId, service: 'recommendations' });
      // Note: Shard updates don't always trigger recommendations; only specific shard types (opportunity, etc.) would
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'recommendations' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'recommendations' });
    throw error;
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
}
