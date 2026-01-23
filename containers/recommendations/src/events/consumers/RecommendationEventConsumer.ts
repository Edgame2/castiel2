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
      log.info('Opportunity updated, generating recommendations', {
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'recommendations',
      });
      
      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }
      
      try {
        await recommendationsService.generateRecommendations({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          limit: 20,
        });
      } catch (error: any) {
        log.error('Failed to generate recommendations from opportunity update', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'recommendations',
        });
      }
    });

    // Handle risk evaluation completion
    consumer.on('risk.evaluation.completed', async (event) => {
      log.info('Risk evaluation completed, generating recommendations', {
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'recommendations',
      });
      
      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }
      
      try {
        await recommendationsService.generateRecommendations({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          limit: 20,
        });
      } catch (error: any) {
        log.error('Failed to generate recommendations from risk evaluation', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'recommendations',
        });
      }
    });

    // Handle forecast completion
    consumer.on('forecast.completed', async (event) => {
      log.info('Forecast completed, generating recommendations', {
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'recommendations',
      });
      
      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }
      
      try {
        await recommendationsService.generateRecommendations({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          limit: 20,
        });
      } catch (error: any) {
        log.error('Failed to generate recommendations from forecast', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'recommendations',
        });
      }
    });

    // Handle workflow-triggered recommendations
    consumer.on('workflow.recommendation.requested', async (event) => {
      log.info('Workflow recommendation requested', {
        workflowId: event.data.workflowId,
        opportunityId: event.data.opportunityId,
        tenantId: event.tenantId,
        service: 'recommendations',
      });
      
      if (!recommendationsService) {
        log.error('Recommendations service not initialized', { service: 'recommendations' });
        return;
      }
      
      try {
        await recommendationsService.generateRecommendations({
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          workflowId: event.data.workflowId, // Forward workflowId
          limit: 20,
        });
      } catch (error: any) {
        log.error('Failed to generate recommendations from workflow', error, {
          opportunityId: event.data.opportunityId,
          tenantId: event.tenantId,
          service: 'recommendations',
        });
      }
    });

    // Handle shard updates
    consumer.on('shard.updated', async (event) => {
      log.debug('Shard updated, may trigger contextual recommendations', {
        shardId: event.data.shardId,
        tenantId: event.tenantId,
        service: 'recommendations',
      });
      // Note: Shard updates don't always trigger recommendations
      // Only specific shard types (opportunity, etc.) trigger recommendations
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
    consumer = null;
  }
}
