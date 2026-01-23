/**
 * Document Chunk Worker
 * 
 * Processes documents from Azure Blob Storage:
 * 1. Extracts text using Azure Form Recognizer
 * 2. Normalizes extracted text
 * 3. Intelligently chunks document into semantic units
 * 4. Creates document chunk shards in Cosmos DB
 * 5. Enqueues embedding jobs for vector generation
 */

import { Job } from 'bullmq';
import { QueueName, QueueProducerService, BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { DocumentChunkJobMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Redis, Cluster } from 'ioredis';
import { LoggerAdapter } from '../shared/logger-adapter.js';
import { BullMQEmbeddingEnqueuer } from '../shared/bullmq-embedding-enqueuer.js';
import { DocumentChunkerOrchestratorWrapper } from '../shared/document-chunker-orchestrator-wrapper.js';
import type { InvocationContext } from '@azure/functions';

interface DocumentChunkWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  blobStorageConnectionString: string;
}

export class DocumentChunkWorker extends BaseWorker<DocumentChunkJobMessage> {
  private cosmosClient: CosmosClient;
  private blobServiceClient: BlobServiceClient;
  private config: DocumentChunkWorkerConfig;
  private queueProducer: QueueProducerService;

  constructor(
    config: DocumentChunkWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('document-chunk-jobs', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.DOCUMENT_CHUNK_CONCURRENCY || '3', 10),
    });

    // Initialize base worker
    super(
      {
        queueName: QueueName.DOCUMENT_CHUNK_JOBS,
        redis,
        monitoring,
        concurrency: workerConfig.concurrency,
        removeOnComplete: workerConfig.removeOnComplete,
        removeOnFail: workerConfig.removeOnFail,
        workerName: 'document-chunk-worker',
      },
      async (job: Job<DocumentChunkJobMessage>) => {
        return this.processDocumentChunk(job);
      }
    );

    this.config = config;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize Blob Storage
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      config.blobStorageConnectionString
    );

    // Initialize queue producer for embedding jobs
    this.queueProducer = new QueueProducerService({
      redis,
      monitoring,
    });
  }

  private async processDocumentChunk(
    job: Job<DocumentChunkJobMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { shardId, tenantId, documentFileName } = job.data;

    try {
      this.monitoring.trackEvent('document-chunk-worker.started', {
        jobId: job.id,
        shardId,
        tenantId,
        documentFileName,
      });

      // Create logger adapter for orchestrator
      const loggerAdapter = new LoggerAdapter(this.monitoring);
      
      // Create BullMQ embedding enqueuer
      const embeddingEnqueuer = new BullMQEmbeddingEnqueuer(this.queueProducer);
      
      // Create orchestrator wrapper that uses BullMQ instead of Service Bus
      const orchestrator = new DocumentChunkerOrchestratorWrapper(
        loggerAdapter as unknown as InvocationContext,
        embeddingEnqueuer
      );

      // Process document using orchestrator wrapper
      const result = await orchestrator.processDocument(job.data);
      
      this.monitoring.trackEvent('document-chunk-worker.completed', {
        jobId: job.id,
        shardId,
        tenantId,
        duration: Date.now() - startTime,
        chunkCount: result.chunkCount,
        status: result.status,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'DocumentChunkWorker.processDocumentChunk',
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await super.close();
    await this.queueProducer.close();
  }
}

