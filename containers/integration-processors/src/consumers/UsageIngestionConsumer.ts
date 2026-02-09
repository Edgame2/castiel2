/**
 * Usage Ingestion Consumer (dataflow Phase 2.1)
 * Subscribes to usage.ingested and creates c_usage shards via Shard Manager.
 * Idempotency: in-process Set for (tenantId, accountId, date); replay may create duplicates until DB idempotency is added.
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { BaseConsumer, ConsumerDependencies } from './index.js';

export interface UsageIngestedEvent {
  tenantId: string;
  accountId?: string;
  opportunityId?: string;
  level?: string;
  features?: Record<string, unknown>;
  trends?: Record<string, unknown>;
  lastActive?: string;
  adoptionScore?: number;
  correlationId?: string;
  [key: string]: unknown;
}

/** In-process idempotency: key = tenantId:accountId:YYYY-MM-DD. */
const seenKeys = new Set<string>();

function idempotencyKey(tenantId: string, accountId: string | undefined): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${tenantId}:${accountId ?? 'global'}:${dateStr}`;
}

export class UsageIngestionConsumer implements BaseConsumer {
  private consumer: EventConsumer | null = null;
  private config: ReturnType<typeof loadConfig>;

  constructor(private deps: ConsumerDependencies) {
    this.config = loadConfig();
  }

  async start(): Promise<void> {
    if (!this.config.rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, usage ingestion consumer disabled', {
        service: 'integration-processors',
      });
      return;
    }

    try {
      this.consumer = new EventConsumer({
        url: this.config.rabbitmq.url,
        exchange: this.config.rabbitmq.exchange || 'coder_events',
        queue: 'usage_ingestion',
        routingKeys: ['usage.ingested'],
        prefetch: 10,
      });

      this.consumer.on('usage.ingested', async (event) => {
        await this.handleUsageIngested(event.data as UsageIngestedEvent);
      });

      await this.consumer.connect();
      await this.consumer.start();

      log.info('Usage ingestion consumer started', {
        queue: 'usage_ingestion',
        service: 'integration-processors',
      });
    } catch (error: unknown) {
      log.error('Failed to start usage ingestion consumer', error as Error, {
        service: 'integration-processors',
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop();
      this.consumer = null;
    }
  }

  private async handleUsageIngested(event: UsageIngestedEvent): Promise<void> {
    const { tenantId, accountId, opportunityId, level, features, trends, lastActive, adoptionScore } = event;

    const key = idempotencyKey(tenantId, accountId);
    if (seenKeys.has(key)) {
      log.debug('Skipping duplicate usage.ingested (in-process idempotency)', {
        tenantId,
        accountId,
        service: 'integration-processors',
      });
      return;
    }

    try {
      const structuredData = {
        tenantId,
        accountId: accountId ?? undefined,
        opportunityId: opportunityId ?? undefined,
        level: level ?? undefined,
        features: features ?? undefined,
        trends: trends ?? undefined,
        lastActive: lastActive ?? new Date().toISOString(),
        adoptionScore: adoptionScore ?? undefined,
        createdAt: new Date().toISOString(),
      };

      await this.deps.shardManager.post<{ id: string }>(
        '/api/v1/shards',
        {
          tenantId,
          shardTypeId: 'c_usage',
          shardTypeName: 'c_usage',
          structuredData,
        },
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        }
      );

      seenKeys.add(key);
      if (seenKeys.size > 10000) {
        const first = seenKeys.values().next().value;
        if (first) seenKeys.delete(first);
      }

      log.info('c_usage shard created from usage.ingested', {
        tenantId,
        accountId,
        service: 'integration-processors',
      });
    } catch (error: unknown) {
      log.error('Failed to create c_usage shard from usage.ingested', error as Error, {
        tenantId,
        accountId,
        service: 'integration-processors',
      });
      throw error;
    }
  }
}
