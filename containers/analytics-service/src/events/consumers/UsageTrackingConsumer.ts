/**
 * Usage Tracking Consumer (Plan §10, §3.5).
 * Subscribes to ml.prediction.completed, llm.inference.completed, embedding.generated;
 * appends to Cosmos analytics_usage_ml for billing aggregation.
 */

import { randomUUID } from 'crypto';
import { EventConsumer } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../../config';

let consumer: EventConsumer | null = null;

type UsageEvent = {
  tenantId?: string;
  data?: { modelId?: string; opportunityId?: string; [k: string]: unknown };
  [k: string]: unknown;
};

function extractTenantId(ev: UsageEvent): string | null {
  const t = ev.tenantId ?? (ev.data as Record<string, unknown>)?.tenantId;
  return typeof t === 'string' && t ? t : null;
}

async function recordUsage(
  eventType: string,
  ev: UsageEvent
): Promise<void> {
  const tenantId = extractTenantId(ev);
  if (!tenantId) {
    console.warn('UsageTrackingConsumer: missing tenantId, skipping', { eventType });
    return;
  }
  const d = (ev.data ?? {}) as Record<string, unknown>;
  const modelId = typeof d.modelId === 'string' ? d.modelId : undefined;
  const opportunityId = typeof d.opportunityId === 'string' ? d.opportunityId : undefined;
  const inferenceMs = typeof d.inferenceMs === 'number' ? d.inferenceMs : undefined;
  const inferredAt =
    (typeof d.timestamp === 'string' ? d.timestamp : null) ??
    (typeof ev.timestamp === 'string' ? ev.timestamp : null) ??
    new Date().toISOString();

  const doc = {
    id: randomUUID(),
    tenantId,
    eventType,
    modelId,
    opportunityId,
    inferenceMs,
    inferredAt,
    source: typeof ev.source === 'string' ? ev.source : undefined,
  };

  const container = getContainer('usage_ml');
  await container.items.create(doc, { partitionKey: tenantId });
}

export async function initializeUsageTrackingConsumer(): Promise<void> {
  const config = loadConfig();
  const mq = config.rabbitmq;
  const bindings = Array.isArray(mq?.bindings) ? mq.bindings : [];

  if (!mq?.url || bindings.length === 0) {
    return;
  }

  try {
    consumer = new EventConsumer({
      url: mq.url,
      exchange: mq.exchange || 'coder_events',
      queue: mq.queue,
      bindings,
    });

    consumer.on('ml.prediction.completed', async (ev: UsageEvent) => {
      try {
        await recordUsage('ml.prediction.completed', ev);
      } catch (e: unknown) {
        console.error('UsageTrackingConsumer ml.prediction.completed', e);
        throw e;
      }
    });
    consumer.on('llm.inference.completed', async (ev: UsageEvent) => {
      try {
        await recordUsage('llm.inference.completed', ev);
      } catch (e: unknown) {
        console.error('UsageTrackingConsumer llm.inference.completed', e);
        throw e;
      }
    });
    consumer.on('embedding.generated', async (ev: UsageEvent) => {
      try {
        await recordUsage('embedding.generated', ev);
      } catch (e: unknown) {
        console.error('UsageTrackingConsumer embedding.generated', e);
        throw e;
      }
    });

    await consumer.start();
    console.info('UsageTrackingConsumer started', { queue: mq.queue, bindings });
  } catch (e: unknown) {
    console.error('UsageTrackingConsumer start failed', e);
    throw e;
  }
}

export async function closeUsageTrackingConsumer(): Promise<void> {
  if (consumer) {
    try {
      await consumer.stop();
    } catch (e: unknown) {
      console.warn('UsageTrackingConsumer stop error', e);
    }
    consumer = null;
    console.info('UsageTrackingConsumer stopped');
  }
}
