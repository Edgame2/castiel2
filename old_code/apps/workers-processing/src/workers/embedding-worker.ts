/**
 * Embedding Worker
 * 
 * Processes embedding jobs from BullMQ queue.
 * Generates vector embeddings for shards using Azure OpenAI.
 */

import { Job } from 'bullmq';
import { QueueName, BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { EmbeddingJobMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import { AzureOpenAI } from 'openai';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Redis, Cluster } from 'ioredis';

interface EmbeddingWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  containerId: string;
  openaiEndpoint: string;
  openaiKey: string;
  embeddingDeployment: string;
  embeddingDimensions: number;
}

export class EmbeddingWorker extends BaseWorker<EmbeddingJobMessage> {
  private cosmosClient: CosmosClient;
  private openaiClient: AzureOpenAI;
  private config: EmbeddingWorkerConfig;

  constructor(
    config: EmbeddingWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('embedding-jobs', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.EMBEDDING_WORKER_CONCURRENCY || '3', 10),
    });

    // Initialize base worker
    super(
      {
        queueName: QueueName.EMBEDDING_JOBS,
        redis,
        monitoring,
        concurrency: workerConfig.concurrency,
        removeOnComplete: workerConfig.removeOnComplete,
        removeOnFail: workerConfig.removeOnFail,
        workerName: 'embedding-worker',
      },
      async (job: Job<EmbeddingJobMessage>) => {
        return this.processEmbeddingJob(job);
      }
    );

    this.config = config;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize Azure OpenAI
    this.openaiClient = new AzureOpenAI({
      endpoint: config.openaiEndpoint,
      apiKey: config.openaiKey,
      apiVersion: '2024-02-15-preview',
    });
  }

  /**
   * Override to provide custom job context
   */
  protected getJobContext(job: Job<EmbeddingJobMessage>): Record<string, any> {
    return {
      ...super.getJobContext(job),
      shardTypeId: job.data.shardTypeId,
      revisionNumber: job.data.revisionNumber,
    };
  }

  private async processEmbeddingJob(
    job: Job<EmbeddingJobMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { shardId, tenantId, shardTypeId, revisionNumber } = job.data;

    try {
      this.monitoring.trackEvent('embedding-worker.started', {
        jobId: job.id,
        shardId,
        tenantId,
        shardTypeId,
      });

      // Fetch shard from Cosmos DB
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container(this.config.containerId);

      const { resource: shard } = await container.item(shardId, tenantId).read();

      if (!shard) {
        throw new Error(`Shard ${shardId} not found`);
      }

      // Generate embedding text from shard
      const embeddingText = this.extractEmbeddingText(shard, shardTypeId);

      // Generate embedding using Azure OpenAI
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: this.config.embeddingDeployment,
        input: embeddingText,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Update shard with embedding
      const vectorEmbedding = {
        id: `embedding-${Date.now()}`,
        field: 'combined',
        model: this.config.embeddingDeployment,
        dimensions: this.config.embeddingDimensions,
        embedding,
        createdAt: new Date(),
      };

      // Update shard document
      const updatedShard = {
        ...shard,
        vectors: [...(shard.vectors || []), vectorEmbedding],
        updatedAt: new Date().toISOString(),
      };

      await container.items.upsert(updatedShard);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('embedding-worker.completed', {
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'EmbeddingWorker.processEmbeddingJob',
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
      throw error;
    }
  }

  private extractEmbeddingText(shard: any, shardTypeId: string): string {
    // Extract text from shard based on type
    const parts: string[] = [];

    if (shard.structuredData?.name) parts.push(shard.structuredData.name);
    if (shard.structuredData?.title) parts.push(shard.structuredData.title);
    if (shard.structuredData?.description) parts.push(shard.structuredData.description);
    if (shard.structuredData?.content) parts.push(shard.structuredData.content);
    if (shard.unstructuredData?.text) parts.push(shard.unstructuredData.text);

    return parts.filter(Boolean).join('\n');
  }

}



