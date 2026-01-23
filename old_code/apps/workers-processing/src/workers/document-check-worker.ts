/**
 * Document Check Worker
 * 
 * Processes documents from the quarantine container:
 * 1. Validates file type (magic bytes)
 * 2. Validates file size
 * 3. Performs virus/malware scan (Microsoft Defender for Cloud)
 * 4. Moves documents to documents container if checks pass
 * 5. Deletes documents if security issues are detected
 * 6. Logs all results to Cosmos DB (audit and notifications)
 */

import { Job } from 'bullmq';
import { QueueName, BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { DocumentCheckJobMessage } from '@castiel/queue';
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Redis, Cluster } from 'ioredis';
import { DocumentCheckOrchestrator } from '@castiel/api-core';
import type { DocumentCheckMessage, SecurityCheckConfig } from '@castiel/api-core';
import { LoggerAdapter } from '../shared/logger-adapter.js';
import type { InvocationContext } from '@azure/functions';

interface DocumentCheckWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  blobStorageConnectionString: string;
  maxFileSizeMB: number;
  enableVirusScan: boolean;
}

/**
 * Security check configuration
 * Matches the configuration used in the original Azure Function
 */
const DEFAULT_SECURITY_CHECK_CONFIG: SecurityCheckConfig = {
  maxFileSizeMB: 100,
  allowedFileTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  enableVirusScan: true,
  enableContentFilter: true,
  maxRetries: 3,
  retryDelayMs: 1000,
};

export class DocumentCheckWorker extends BaseWorker<DocumentCheckJobMessage> {
  private cosmosClient: CosmosClient;
  private blobServiceClient: BlobServiceClient;
  private config: DocumentCheckWorkerConfig;

  constructor(
    config: DocumentCheckWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('document-check-jobs', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.DOCUMENT_CHECK_CONCURRENCY || '5', 10),
    });

    // Initialize base worker
    super(
      {
        queueName: QueueName.DOCUMENT_CHECK_JOBS,
        redis,
        monitoring,
        concurrency: workerConfig.concurrency,
        removeOnComplete: workerConfig.removeOnComplete,
        removeOnFail: workerConfig.removeOnFail,
        workerName: 'document-check-worker',
      },
      async (job: Job<DocumentCheckJobMessage>) => {
        return this.processDocumentCheck(job);
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
  }

  private async processDocumentCheck(
    job: Job<DocumentCheckJobMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const { shardId, tenantId, documentFileName, filePath } = job.data;

    try {
      this.monitoring.trackEvent('document-check-worker.started', {
        jobId: job.id,
        shardId,
        tenantId,
        documentFileName,
      });

      // Get blob containers
      const quarantineContainer = this.blobServiceClient.getContainerClient('quarantine');
      const documentsContainer = this.blobServiceClient.getContainerClient('documents');

      // Get Cosmos DB database
      const cosmosDatabase = this.cosmosClient.database(this.config.databaseId);

      // Create security check config (can be customized via environment variables)
      const securityCheckConfig: SecurityCheckConfig = {
        ...DEFAULT_SECURITY_CHECK_CONFIG,
        maxFileSizeMB: this.config.maxFileSizeMB,
        enableVirusScan: this.config.enableVirusScan,
      };

      // Create logger adapter
      const loggerAdapter = new LoggerAdapter(this.monitoring);

      // Create orchestrator
      const orchestrator = new DocumentCheckOrchestrator(
        loggerAdapter as unknown as InvocationContext,
        quarantineContainer,
        documentsContainer,
        cosmosDatabase,
        securityCheckConfig,
        securityCheckConfig.maxRetries
      );

      // Convert job data to DocumentCheckMessage format
      const checkMessage: DocumentCheckMessage = {
        shardId,
        tenantId,
        userId: job.data.userId,
        documentFileName,
        filePath: filePath || job.data.blobUrl || documentFileName, // Use filePath if available, fallback to blobUrl or documentFileName
        metadata: job.data.metadata,
        enqueuedAt: job.data.enqueuedAt || new Date().toISOString(),
      };

      // Process document check
      await orchestrator.checkAndProcessDocument(checkMessage);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('document-check-worker.completed', {
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'DocumentCheckWorker.processDocumentCheck',
        jobId: job.id,
        shardId,
        tenantId,
        duration,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

