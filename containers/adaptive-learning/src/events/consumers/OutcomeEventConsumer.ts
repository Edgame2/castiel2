/**
 * Event consumer for outcome collection (CAIS 3.2)
 * Consumes adaptive.learning.outcome.recorded from risk-analytics, forecasting, recommendations
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { OutcomeCollectorService } from '../../services/OutcomeCollectorService';

let consumer: EventConsumer | null = null;

export async function initializeEventConsumer(): Promise<void> {
  const config = loadConfig();
  if (!config.rabbitmq?.url) {
    console.warn('RabbitMQ URL not configured, outcome event consumption disabled');
    return;
  }
  const bindings = config.rabbitmq.bindings ?? ['adaptive.learning.outcome.recorded'];
  if (bindings.length === 0) return;

  try {
    const outcomeCollector = new OutcomeCollectorService();
    consumer = new EventConsumer({
      url: config.rabbitmq.url,
      exchange: config.rabbitmq.exchange || 'coder_events',
      queue: config.rabbitmq.queue,
      bindings,
    });

    consumer.on('adaptive.learning.outcome.recorded', async (event) => {
      const d = event.data ?? {};
      const component = (d as { component?: string }).component ?? 'unknown';
      const prediction = (d as { prediction?: number | Record<string, unknown> }).prediction;
      const context = (d as { context?: Record<string, unknown> }).context;
      try {
        await outcomeCollector.recordFromEvent(event.tenantId, {
          component,
          prediction: prediction ?? 0,
          context,
        });
      } catch (e) {
        console.warn('OutcomeEventConsumer.recordFromEvent failed', {
          error: (e as Error).message,
          component,
          tenantId: event.tenantId,
        });
      }
    });

    await consumer.start();
  } catch (error) {
    console.warn('Failed to start outcome event consumer', (error as Error).message);
  }
}

export async function closeEventConsumer(): Promise<void> {
  if (consumer) {
    consumer = null;
  }
}
