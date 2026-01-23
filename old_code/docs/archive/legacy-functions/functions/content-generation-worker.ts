/**
 * Content Generation Worker Azure Function
 * 
 * Processes content generation jobs from Service Bus queue.
 * Handles document generation from templates with placeholder replacement.
 * 
 * Trigger: Service Bus Queue (content-generation-jobs)
 * Processing:
 * 1. Receive generation job from Service Bus
 * 2. Load template from Cosmos DB
 * 3. Generate content for all placeholders using AI
 * 4. Duplicate and rewrite document
 * 5. Create c_document Shard
 * 6. Send notification (success/error)
 * 
 * Output: Updated job status in Cosmos DB, generated document Shard
 */

import { app, ServiceBusQueueTrigger } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { MonitoringService } from '@castiel/monitoring';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { GenerationJob, GenerationResult } from '../../apps/api/src/services/content-generation/types/generation.types.js';

interface ContentGenerationWorkerConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  redisUrl?: string;
  keyVaultUrl?: string;
  azureOpenAIEndpoint?: string;
  azureOpenAIKey?: string;
  azureOpenAIDeploymentName?: string;
  credentialEncryptionKey?: string;
}

interface GenerationJobMessage extends GenerationJob {
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

class ContentGenerationWorker {
  private cosmosClient: CosmosClient;
  private monitoring: IMonitoringProvider;
  private config: ContentGenerationWorkerConfig;
  private processorService: any; // GenerationProcessorService - will be initialized lazily

  constructor(config: ContentGenerationWorkerConfig) {
    this.config = config;
    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    // Initialize monitoring
    this.monitoring = MonitoringService.initialize({
      enabled: true,
      provider: 'azure',
      applicationInsightsKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    });
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
      // Note: Adjust import paths based on your deployment structure
      // These paths assume functions are in src/functions/ and services are in apps/api/src/
      const { DocumentTemplateService } = await import('../../apps/api/src/services/content-generation/services/document-template.service.js');
      const { DocumentRewriterFactory } = await import('../../apps/api/src/services/content-generation/rewriters/rewriter-factory.js');
      const { InsightService } = await import('../../apps/api/src/services/insight.service.js');
      const { ContextTemplateService } = await import('../../apps/api/src/services/context-template.service.js');
      const { ShardRepository } = await import('../../apps/api/src/repositories/shard.repository.js');
      const { ShardTypeRepository } = await import('../../apps/api/src/repositories/shard-type.repository.js');
      const { GenerationProcessorService } = await import('../../apps/api/src/services/content-generation/services/generation-processor.service.js');
      const { RelationshipService } = await import('../../apps/api/src/services/relationship.service.js');

      // Initialize Cosmos DB containers
      const database = this.cosmosClient.database(this.config.databaseId);
      
      // Initialize repositories
      const shardRepository = new ShardRepository(this.monitoring);
      const shardTypeRepository = new ShardTypeRepository(this.monitoring);
      
      // Initialize relationship service
      const relationshipService = new RelationshipService(this.monitoring, shardRepository);
      await relationshipService.initialize();

      // Initialize context template service
      const contextTemplateService = new ContextTemplateService(
        this.monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        null // Redis - optional
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
      if (this.config.azureOpenAIEndpoint && this.config.azureOpenAIKey) {
        const { AzureOpenAIService } = await import('../../apps/api/src/services/azure-openai.service.js');
        const azureOpenAI = new AzureOpenAIService(
          {
            endpoint: this.config.azureOpenAIEndpoint,
            apiKey: this.config.azureOpenAIKey,
            deploymentName: this.config.azureOpenAIDeploymentName || 'gpt-4o',
          },
          this.monitoring
        );

        // Initialize InsightService with minimal dependencies
        // Note: This is a simplified initialization - full setup may require more dependencies
        insightService = new InsightService(
          this.monitoring,
          shardRepository,
          shardTypeRepository,
          azureOpenAI,
          undefined, // UnifiedAIClient - optional
          undefined, // AIConfigService - optional
          contextTemplateService,
          undefined, // PromptResolver - optional
          undefined  // Redis - optional
        );
      }

      // Initialize processor service
      this.processorService = new GenerationProcessorService(
        this.monitoring,
        documentTemplateService,
        rewriterFactory,
        insightService!,
        contextTemplateService,
        shardRepository,
        undefined // NotificationService - optional
      );

      return this.processorService;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'content_generation_worker.initialize',
      });
      throw new Error(`Failed to initialize GenerationProcessorService: ${(error as Error).message}`);
    }
  }

  /**
   * Main message handler
   * Processes a generation job from Service Bus
   */
  async handleMessage(
    message: ServiceBusQueueTrigger,
    context: any
  ): Promise<void> {
    const startTime = Date.now();
    const executionId = context.invocationId;

    let jobMessage: GenerationJobMessage;

    try {
      // Parse message
      jobMessage = JSON.parse(message.body || '{}') as GenerationJobMessage;

      context.log(
        `[${executionId}] Processing generation job: ${jobMessage.id} for template: ${jobMessage.templateId}`
      );

      // Validate message
      if (!jobMessage.id || !jobMessage.templateId || !jobMessage.tenantId) {
        throw new Error('Invalid generation job message: missing required fields');
      }

      // Check retry count before processing
      // Note: Service Bus handles retries automatically, but we track retryCount in our job repository
      // The job's retryCount should be updated by the processor service, but we check here for safety
      if (jobMessage.retryCount !== undefined && jobMessage.maxRetries !== undefined) {
        if (jobMessage.retryCount >= jobMessage.maxRetries) {
          context.log.warn(
            `[${executionId}] Generation job ${jobMessage.id} has exceeded max retries (${jobMessage.retryCount}/${jobMessage.maxRetries}). Skipping.`
          );
          this.monitoring.trackEvent('content_generation_worker.max_retries_exceeded', {
            jobId: jobMessage.id,
            retryCount: jobMessage.retryCount,
            maxRetries: jobMessage.maxRetries,
          });
          // Don't throw - let Service Bus move to DLQ if configured
          return;
        }
      }

      // Initialize processor service
      const processor = await this.initializeProcessorService();

      // Process the job
      const result: GenerationResult = await processor.processJob(jobMessage);

      const duration = Date.now() - startTime;

      if (result.status === 'completed') {
        context.log(
          `[${executionId}] Generation job completed successfully in ${duration}ms. ` +
          `Document: ${result.generatedDocumentId}, Shard: ${result.shardId}`
        );
      } else if (result.status === 'failed') {
        context.log.warn(
          `[${executionId}] Generation job failed after ${duration}ms. ` +
          `Errors: ${result.errors?.map(e => `${e.placeholderName}: ${e.error}`).join(', ')}`
        );
      }

      this.monitoring.trackEvent('content_generation_worker.job_processed', {
        jobId: jobMessage.id,
        status: result.status,
        duration,
        placeholdersFilled: result.placeholdersFilled,
        placeholdersTotal: result.placeholdersTotal,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log.error(
        `[${executionId}] Error processing generation job after ${duration}ms: ${errorMessage}`
      );

      this.monitoring.trackException(error as Error, {
        operation: 'content_generation_worker.handle_message',
        jobId: jobMessage?.id,
        duration,
      });

      // Re-throw to trigger retry/DLQ handling
      throw error;
    }
  }
}

// Initialize function with config from environment
const config: ContentGenerationWorkerConfig = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT || '',
  cosmosKey: process.env.COSMOS_DB_KEY || process.env.COSMOS_KEY || '',
  databaseId: process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DATABASE || 'castiel',
  redisUrl: process.env.REDIS_URL,
  keyVaultUrl: process.env.KEY_VAULT_URL,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
  credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY,
};

const worker = new ContentGenerationWorker(config);

// Register Service Bus queue trigger
const queueName = process.env.AZURE_SERVICE_BUS_CONTENT_GENERATION_QUEUE || 'content-generation-jobs';

app.serviceBusQueue('content-generation-worker', {
  connection: 'AZURE_SERVICE_BUS_CONNECTION_STRING',
  queueName,
  cardinality: 'one',
  handler: async (message: ServiceBusQueueTrigger, context: any) => {
    await worker.handleMessage(message, context);
  },
});

