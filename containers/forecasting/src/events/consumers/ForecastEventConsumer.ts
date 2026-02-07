/**
 * Event consumer for forecasting
 * Consumes opportunity/risk events and generates forecasts
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { log } from '../../utils/logger';
import { ForecastingService } from '../../services/ForecastingService';

let consumer: EventConsumer | null = null;
let forecastingService: ForecastingService | null = null;

export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  
  if (!config.rabbitmq.url) {
    log.warn('RabbitMQ URL not configured, event consumption disabled', { service: 'forecasting' });
    return;
  }
  
  try {
    // Initialize forecasting service
    forecastingService = new ForecastingService();
    
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      routingKeys: (config.rabbitmq as { bindings?: string[] }).bindings ?? ['#'],
    });

    // Handle opportunity updates
    consumer.on('opportunity.updated', async (event) => {
      const opportunityId = event.data?.opportunityId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('opportunity.updated missing opportunityId or tenantId', { hasData: !!event.data, service: 'forecasting' });
        return;
      }
      log.info('Opportunity updated, generating forecast', { opportunityId, tenantId, service: 'forecasting' });

      if (!forecastingService) {
        log.error('Forecasting service not initialized', { service: 'forecasting' });
        return;
      }

      try {
        await forecastingService.generateForecast({
          opportunityId,
          tenantId,
          includeDecomposition: true,
          includeConsensus: true,
          includeCommitment: true,
        });
      } catch (error: unknown) {
        log.error('Failed to generate forecast from opportunity update', error instanceof Error ? error : new Error(String(error)), { opportunityId, tenantId, service: 'forecasting' });
      }
    });

    // Handle integration opportunity updates
    // Note: Sequential processing after risk evaluation is ensured by risk.evaluation.completed handler below
    // This handler processes integration.opportunity.updated events, but forecasting will be triggered
    // after risk evaluation completes via risk.evaluation.completed event
    consumer.on('integration.opportunity.updated', async (event) => {
      const data = event?.data ?? {};
      const opportunityId = data.opportunityId;
      const tenantId = event.tenantId ?? data.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('integration.opportunity.updated missing opportunityId or tenantId', { hasData: !!event?.data, service: 'forecasting' });
        return;
      }
      log.info('Integration opportunity updated, will generate forecast after risk evaluation', {
        opportunityId,
        tenantId,
        service: 'forecasting',
      });

      // Note: We don't generate forecast immediately here because:
      // 1. Risk evaluation is triggered by integration.opportunity.updated in risk-analytics
      // 2. Risk evaluation publishes risk.evaluation.completed when done
      // 3. Our risk.evaluation.completed handler will generate the forecast sequentially
      // This ensures forecasts are generated with the latest risk data
      
      // If risk evaluation is disabled or not available, we can generate forecast directly
      // For now, we wait for risk.evaluation.completed to ensure sequential processing
      log.debug('Waiting for risk.evaluation.completed before generating forecast', {
        opportunityId,
        tenantId,
        service: 'forecasting',
      });
    });

    // Handle risk evaluation completion
    consumer.on('risk.evaluation.completed', async (event) => {
      const opportunityId = event.data?.opportunityId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      if (!opportunityId || !tenantId) {
        log.warn('risk.evaluation.completed missing opportunityId or tenantId', { hasData: !!event.data, service: 'forecasting' });
        return;
      }
      log.info('Risk evaluation completed, generating forecast', { opportunityId, tenantId, service: 'forecasting' });

      if (!forecastingService) {
        log.error('Forecasting service not initialized', { service: 'forecasting' });
        return;
      }

      try {
        await forecastingService.generateForecast({
          opportunityId,
          tenantId,
          includeDecomposition: true,
          includeConsensus: true,
          includeCommitment: true,
        });
      } catch (error: unknown) {
        log.error('Failed to generate forecast from risk evaluation', error instanceof Error ? error : new Error(String(error)), { opportunityId, tenantId, service: 'forecasting' });
      }
    });

    // Handle sync completion
    consumer.on('integration.sync.completed', async (event) => {
      const tenantId = event.tenantId ?? event.data?.tenantId;
      log.info('Integration sync completed, may trigger forecasts', { tenantId, service: 'forecasting' });
      // Note: Sync completion doesn't specify opportunityId; individual opportunity updates trigger forecasts via opportunity.updated
    });

    // Handle workflow-triggered forecasts
    consumer.on('workflow.forecast.requested', async (event) => {
      const opportunityId = event.data?.opportunityId;
      const tenantId = event.tenantId ?? event.data?.tenantId;
      const workflowId = event.data?.workflowId;
      if (!opportunityId || !tenantId) {
        log.warn('workflow.forecast.requested missing opportunityId or tenantId', { hasData: !!event.data, service: 'forecasting' });
        return;
      }
      log.info('Workflow forecast requested', { workflowId, opportunityId, tenantId, service: 'forecasting' });

      if (!forecastingService) {
        log.error('Forecasting service not initialized', { service: 'forecasting' });
        return;
      }

      try {
        await forecastingService.generateForecast({
          opportunityId,
          tenantId,
          workflowId,
          includeDecomposition: true,
          includeConsensus: true,
          includeCommitment: true,
        });
      } catch (error: unknown) {
        log.error('Failed to generate forecast from workflow', error instanceof Error ? error : new Error(String(error)), { opportunityId, tenantId, service: 'forecasting' });
      }
    });

    await consumer.start();
    log.info('Event consumer initialized and started', { service: 'forecasting' });
  } catch (error) {
    log.error('Failed to initialize event consumer', error, { service: 'forecasting' });
    throw error;
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    consumer = null;
  }
}
