/**
 * Event publisher for shard.embedding.generated (embeddings service)
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';

let publisher: EventPublisher | null = null;

export async function initializeShardEmbeddingPublisher(): Promise<void> {
  const config = loadConfig();
  if (!config.rabbitmq?.url) {
    return;
  }
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange ?? 'coder_events',
        exchangeType: 'topic',
      },
      'embeddings'
    );
    await publisher.connect();
  } catch {
    publisher = null;
  }
}

export async function publishShardEmbeddingGenerated(
  tenantId: string,
  data: { shardId: string; vectorsGenerated: number; templateUsed: string; model: string }
): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('shard.embedding.generated', tenantId, data);
  } catch {
    // best effort
  }
}

export async function closeShardEmbeddingPublisher(): Promise<void> {
  if (publisher) {
    await publisher.close();
    publisher = null;
  }
}
