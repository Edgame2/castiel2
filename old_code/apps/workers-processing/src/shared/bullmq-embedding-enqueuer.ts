/**
 * BullMQ Embedding Enqueuer
 * 
 * Replaces Service Bus-based EmbeddingEnqueuerService with BullMQ
 */

import { QueueProducerService } from '@castiel/queue';
import type { EmbeddingJobMessage } from '@castiel/queue';

export class BullMQEmbeddingEnqueuer {
  private queueProducer: QueueProducerService;

  constructor(queueProducer: QueueProducerService) {
    this.queueProducer = queueProducer;
  }

  async enqueueEmbeddingJobs(
    chunkShardIds: string[],
    tenantId: string
  ): Promise<{ enqueuedCount: number; failedCount: number }> {
    let enqueuedCount = 0;
    let failedCount = 0;

    for (const shardId of chunkShardIds) {
      try {
        await this.queueProducer.enqueueEmbeddingJob({
          shardId,
          tenantId,
          shardTypeId: 'c_documentChunk',
          revisionNumber: 1,
          dedupeKey: `shard-create-${shardId}-1`,
        });

        enqueuedCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to enqueue embedding job for ${shardId}:`, error);
      }
    }

    return { enqueuedCount, failedCount };
  }

  async close(): Promise<void> {
    // QueueProducerService manages its own lifecycle
    // No cleanup needed here
  }
}



