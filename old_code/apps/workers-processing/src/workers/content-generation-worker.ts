/**
 * Content Generation Worker
 * 
 * Processes content generation jobs from BullMQ queue.
 * Generates documents from templates using AI services.
 */

import { Job } from 'bullmq';
import { QueueName, BaseWorker, getWorkerConfigFromEnv, DEFAULT_WORKER_CONFIG } from '@castiel/queue';
import type { GenerationJobMessage } from '@castiel/queue';
import type { Redis, Cluster } from 'ioredis';
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { createRedisConnection } from '@castiel/queue';
import type { GenerationJob, GenerationResult, NotificationService } from '@castiel/api-core';
import { LightweightNotificationService } from '@castiel/api-core';

interface ContentGenerationWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  redisUrl?: string;
  keyVaultUrl?: string;
  openaiEndpoint?: string;
  openaiKey?: string;
  openaiDeploymentName?: string;
  credentialEncryptionKey?: string;
}

interface ExtendedGenerationJobMessage extends GenerationJob {
  template?: {
    id: string;
    name: string;
    documentFormat: string;
    sourceDocumentId: string;
    placeholders?: Array<{ name: string; type: string }>;
    placeholderConfigs?: Array<any>;
    dominantColors?: string[];
  };
  userToken?: string; // Encrypted OAuth token
}

export class ContentGenerationWorker extends BaseWorker<GenerationJobMessage> {
  private cosmosClient: CosmosClient;
  private config: ContentGenerationWorkerConfig;
  private processorService: any; // GenerationProcessorService - will be initialized lazily
  private notificationService: LightweightNotificationService | undefined;

  constructor(
    config: ContentGenerationWorkerConfig,
    monitoring: IMonitoringProvider,
    redis: Redis | Cluster
  ) {
    // Get standardized worker config from environment
    const workerConfig = getWorkerConfigFromEnv('content-generation-jobs', {
      ...DEFAULT_WORKER_CONFIG,
      concurrency: parseInt(process.env.CONTENT_GENERATION_CONCURRENCY || '3', 10),
    });

    // Initialize base worker
    super(
      {
        queueName: QueueName.CONTENT_GENERATION_JOBS,
        redis,
        monitoring,
        concurrency: workerConfig.concurrency,
        removeOnComplete: workerConfig.removeOnComplete,
        removeOnFail: workerConfig.removeOnFail,
        workerName: 'content-generation-worker',
      },
      async (job: Job<GenerationJobMessage>) => {
        return this.processGenerationJob(job);
      }
    );

    this.config = config;

    // Initialize Cosmos DB
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize lightweight notification service
    try {
      const databaseId = config.databaseId || 'castiel';
      const notificationContainerId = process.env.COSMOS_NOTIFICATIONS_CONTAINER || 'notifications';
      this.notificationService = new LightweightNotificationService(
        this.cosmosClient,
        databaseId,
        notificationContainerId,
        monitoring
      );
    } catch (error) {
      monitoring.trackException(error as Error, {
        operation: 'content_generation_worker.init_notification_service',
      });
      // Continue without notification service - it's optional
      this.notificationService = undefined;
    }
  }

  /**
   * Override to provide custom job context
   */
  protected getJobContext(job: Job<GenerationJobMessage>): Record<string, any> {
    return {
      ...super.getJobContext(job),
      generationJobId: job.data.id,
    };
  }

  /**
   * Initialize GenerationProcessorService with all dependencies
   * This is done lazily to avoid initialization errors if dependencies are missing
   */
  private async initializeProcessorService(): Promise<any> {
    if (this.processorService) {
      return this.processorService;
    }

    try {
      // Import services dynamically to handle missing dependencies gracefully
      const {
        DocumentTemplateService,
        DocumentRewriterFactory,
        InsightService,
        ContextTemplateService,
        ShardRepository,
        ShardTypeRepository,
        GenerationProcessorService,
        ShardRelationshipService,
      } = await import('@castiel/api-core');

      // Initialize Cosmos DB containers
      const database = this.cosmosClient.database(this.config.databaseId);
      
      // Initialize repositories
      const shardRepository = new ShardRepository(this.monitoring);
      const shardTypeRepository = new ShardTypeRepository(this.monitoring);
      
      // Initialize relationship service
      const relationshipService = new ShardRelationshipService(this.monitoring, shardRepository);
      await relationshipService.initialize();

      // Initialize context template service
      const contextTemplateService = new ContextTemplateService(
        this.monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        undefined // Redis - optional
      );

      // Initialize document template service
      const documentTemplateService = new DocumentTemplateService(
        this.monitoring,
        this.cosmosClient,
        undefined, // IntegrationService - optional
        undefined  // IntegrationConnectionService - optional
      );

      // Initialize rewriter factory
      const rewriterFactory = new DocumentRewriterFactory(this.monitoring);

      // Initialize InsightService (requires AI configuration)
      let insightService: any = undefined;
      if (this.config.openaiEndpoint && this.config.openaiKey) {
        const { AzureOpenAIService } = await import('@castiel/api-core');
        const azureOpenAI = new AzureOpenAIService(
          {
            endpoint: this.config.openaiEndpoint,
            apiKey: this.config.openaiKey,
            deploymentName: this.config.openaiDeploymentName || 'gpt-4o',
          },
          this.monitoring
        );

        // Create IntentAnalyzerService first (required by InsightService)
        const { IntentAnalyzerService } = await import('@castiel/api-core');
        const intentAnalyzer = new IntentAnalyzerService(
          this.monitoring,
          shardRepository,
          shardTypeRepository,
          undefined // Redis - optional
        );
        
        // Create ConversationService (required by InsightService)
        const { ConversationService } = await import('@castiel/api-core');
        const conversationService = new ConversationService(
          this.monitoring,
          shardRepository,
          shardTypeRepository,
          undefined, // Redis - optional
          undefined, // UnifiedAIClient - optional
          undefined, // AIConnectionService - optional
          undefined, // ConversionService - optional
          relationshipService, // ShardRelationshipService
          undefined, // ConversationRealtimeService - optional
          undefined, // NotificationService - optional
          undefined  // UserService - optional
        );
        
        insightService = new InsightService(
          this.monitoring,
          shardRepository,
          shardTypeRepository,
          intentAnalyzer,
          contextTemplateService,
          conversationService,
          azureOpenAI,
          undefined, // GroundingService - optional
          undefined, // VectorSearch - optional
          undefined, // WebSearchContextIntegration - optional
          undefined, // Redis - optional
          undefined, // AIModelSelectionService - optional
          undefined, // UnifiedAIClient - optional
          undefined, // AIConnectionService - optional
          relationshipService, // ShardRelationshipService
          undefined, // PromptResolver - optional
          undefined, // ContextAwareQueryParser - optional
          undefined, // AIToolExecutorService - optional
          undefined, // AIConfigService - optional
          undefined  // TenantProjectConfigService - optional
        );
      }

      // Initialize processor service with lightweight notification service
      // Cast to NotificationService interface (they're compatible for createSystemNotification)
      const notificationService = this.notificationService as any as NotificationService | undefined;

      this.processorService = new GenerationProcessorService(
        this.monitoring,
        documentTemplateService,
        rewriterFactory,
        insightService!,
        contextTemplateService,
        shardRepository,
        notificationService // Pass lightweight notification service
      );

      return this.processorService;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'content_generation_worker.initialize',
      });
      throw new Error(`Failed to initialize GenerationProcessorService: ${(error as Error).message}`);
    }
  }

  private async processGenerationJob(
    job: Job<GenerationJobMessage>
  ): Promise<void> {
    const startTime = Date.now();
    const jobMessage = job.data as ExtendedGenerationJobMessage;

    try {
      this.monitoring.trackEvent('content-generation-worker.started', {
        jobId: job.id,
        generationJobId: jobMessage.id,
        tenantId: jobMessage.tenantId,
        templateId: jobMessage.templateId,
      });

      // Validate message
      if (!jobMessage.id || !jobMessage.templateId || !jobMessage.tenantId) {
        throw new Error('Invalid generation job message: missing required fields');
      }

      // Check retry count before processing
      if (jobMessage.retryCount !== undefined && jobMessage.maxRetries !== undefined) {
        if (jobMessage.retryCount >= jobMessage.maxRetries) {
          this.monitoring.trackEvent('content_generation_worker.max_retries_exceeded', {
            jobId: jobMessage.id,
            retryCount: jobMessage.retryCount,
            maxRetries: jobMessage.maxRetries,
          });
          // Don't throw - let BullMQ handle retries
          return;
        }
      }

      // Initialize processor service
      const processor = await this.initializeProcessorService();

      // Process the job
      const result: GenerationResult = await processor.processJob(jobMessage);

      const duration = Date.now() - startTime;

      if (result.status === 'completed') {
        this.monitoring.trackEvent('content-generation-worker.job_completed', {
          jobId: job.id,
          generationJobId: jobMessage.id,
          tenantId: jobMessage.tenantId,
          duration,
          documentId: result.generatedDocumentId,
          shardId: result.shardId,
        });
      } else if (result.status === 'failed') {
        this.monitoring.trackEvent('content-generation-worker.job_failed', {
          jobId: job.id,
          generationJobId: jobMessage.id,
          tenantId: jobMessage.tenantId,
          duration,
          errors: result.errors?.map(e => `${e.placeholderName}: ${e.error}`).join(', '),
        });
      }

      this.monitoring.trackEvent('content-generation-worker.job_processed', {
        jobId: jobMessage.id,
        status: result.status,
        duration,
        placeholdersFilled: result.placeholdersFilled,
        placeholdersTotal: result.placeholdersTotal,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        context: 'ContentGenerationWorker.processGenerationJob',
        jobId: job.id,
        generationJobId: jobMessage?.id,
        tenantId: jobMessage?.tenantId,
        duration,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

