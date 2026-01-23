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
      bindings: config.rabbitmq.bindings,
    });

    // Handle opportunity updates
    consumer.on('opportunity.updated', async (event) => {
      log.info('Opportunity updated, generating forecast', {
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'forecasting',
      });
      
      if (!forecastingService) {
        log.error('Forecasting service not initialized', { service: 'forecasting' });
        return;
      }
      
      try {
        await forecastingService.generateForecast({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          includeDecomposition: true,
          includeConsensus: true,
          includeCommitment: true,
        });
      } catch (error: any) {
        log.error('Failed to generate forecast from opportunity update', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'forecasting',
        });
      }
    });

    // Handle risk evaluation completion
    consumer.on('risk.evaluation.completed', async (event) => {
      log.info('Risk evaluation completed, generating forecast', {
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'forecasting',
      });
      
      if (!forecastingService) {
        log.error('Forecasting service not initialized', { service: 'forecasting' });
        return;
      }
      
      try {
        await forecastingService.generateForecast({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          includeDecomposition: true,
          includeConsensus: true,
          includeCommitment: true,
        });
      } catch (error: any) {
        log.error('Failed to generate forecast from risk evaluation', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'forecasting',
        });
      }
    });

    // Handle sync completion
    consumer.on('integration.sync.completed', async (event) => {
      log.info('Integration sync completed, may trigger forecasts', {
        tenantId: event.tenantId,
        service: 'forecasting',
      });
      // Note: Sync completion doesn't specify opportunityId
      // Individual opportunity updates will trigger forecasts via opportunity.updated events
    });

    // Handle workflow-triggered forecasts
    consumer.on('workflow.forecast.requested', async (event) => {
      log.info('Workflow forecast requested', {
        workflowId: event.data.workflowId,
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'forecasting',
      });
      
      if (!forecastingService) {
        log.error('Forecasting service not initialized', { service: 'forecasting' });
        return;
      }
      
      try {
        await forecastingService.generateForecast({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          includeDecomposition: true,
          includeConsensus: true,
          includeCommitment: true,
        });
      } catch (error: any) {
        log.error('Failed to generate forecast from workflow', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'forecasting',
        });
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
    consumer = null;
  }
}
