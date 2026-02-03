/**
 * Event publisher for dashboard analytics events (merged from dashboard-analytics container).
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';

let publisher: EventPublisher | null = null;

export async function initializeDashboardAnalyticsEventPublisher(): Promise<void> {
  const config = loadConfig();
  const url = config.rabbitmq?.url;
  if (!url) {
    console.warn('[dashboard] RabbitMQ URL not configured, dashboard analytics event publishing disabled');
    return;
  }
  try {
    publisher = new EventPublisher(
      {
        url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'dashboard_analytics'
    );
    console.info('[dashboard] Dashboard analytics event publisher initialized');
  } catch (error) {
    console.error('[dashboard] Failed to initialize dashboard analytics event publisher:', error);
    throw error;
  }
}

export async function closeDashboardAnalyticsEventPublisher(): Promise<void> {
  publisher = null;
}

export async function publishDashboardAnalyticsEvent(
  eventType: string,
  tenantId: string,
  data: Record<string, unknown>,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish(eventType, tenantId, data, metadata);
  } catch (error) {
    console.error('[dashboard] Failed to publish event', eventType, error);
  }
}
