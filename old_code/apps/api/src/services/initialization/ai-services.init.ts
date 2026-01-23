/**
 * AI Services Initialization
 * Initializes AI-related services (insights, conversations, context assembly, embeddings, etc.)
 * 
 * This module extracts AI service initialization from routes/index.ts to improve maintainability.
 * The initialization is complex with many dependencies and optional services.
 */

import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { MonitoringService } from '@castiel/monitoring';
import { config } from '../../config/env.js';
import { ServiceHealthTracker, extractErrorCode, extractDependencies } from '../../utils/service-health-tracker.js';
import { createMemoryContextService } from '../../services/memory-context.service.js';
import { ACLCacheService } from '../../services/acl-cache.service.js';

export interface AIServicesDependencies {
  monitoring: IMonitoringProvider;
  redis?: Redis | null;
  shardRepository: any;
  shardTypeRepository: any;
  relationshipService: any;
  cosmosDatabase?: any;
  cosmosClient?: any;
  configurationService?: any;
  aiConfigService?: any;
  aiConnectionService?: any;
  serviceRegistry?: any;
  serviceHealthTracker: ServiceHealthTracker;
}

export interface AIServicesResult {
  insightService?: any;
  conversationService?: any;
  contextTemplateService?: any;
  azureOpenAI?: any;
  embeddingTemplateService?: any;
  embeddingService?: any;
  shardEmbeddingService?: any;
  vectorSearchService?: any;
  aclService?: any;
  queueService?: any;
  toolExecutor?: any;
  unifiedAIClient?: any;
  aiModelSelection?: any;
  promptResolver?: any;
  promptRepository?: any;
  promptRenderer?: any;
  promptABTestService?: any;
  promptAnalytics?: any;
  modelRouter?: any;
  entityResolutionService?: any;
  contextAwareQueryParserService?: any;
  groundingService?: any;
  webSearchContextIntegration?: any;
  multimodalAssetService?: any;
  conversationSummarizationService?: any;
  conversationContextRetrievalService?: any;
  contextCacheService?: any;
  contextQualityService?: any;
  comprehensiveAuditTrailService?: any;
  piiDetectionService?: any;
  piiRedactionService?: any;
  fieldSecurityService?: any;
  citationValidationService?: any;
  promptInjectionDefenseService?: any;
  tenantProjectConfigService?: any;
  userFeedbackService?: any;
  conversionService?: any;
  conversationRealtimeService?: any;
  intentAnalyzer?: any;
}

/**
 * Initialize AI services
 * This is a complex initialization with many dependencies and optional services
 */
export async function initializeAIServices(
  server: FastifyInstance,
  dependencies: AIServicesDependencies
): Promise<AIServicesResult> {
  const {
    monitoring,
    redis,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    cosmosDatabase,
    cosmosClient,
    configurationService,
    aiConfigService,
    aiConnectionService,
    serviceRegistry,
    serviceHealthTracker,
  } = dependencies;

  const result: AIServicesResult = {};

  try {
    // Initialize ConversionService for PDF export (available early)
    try {
      const { ConversionService } = await import('../../services/content-generation/conversion.service.js');
      result.conversionService = new ConversionService(monitoring);
      server.decorate('conversionService', result.conversionService);
      server.log.info('✅ Conversion Service initialized');
      serviceHealthTracker.trackSuccess('Conversion Service', 'initialization', ['Monitoring']);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      server.log.error({ err }, '❌ Conversion Service initialization failed');
      monitoring.trackException(err instanceof Error ? err : new Error(errorMessage), {
        operation: 'service-initialization.conversion-service',
        criticality: 'optional',
      });
      serviceHealthTracker.trackFailure({
        serviceName: 'Conversion Service',
        operation: 'initialization',
        error: err,
        criticality: 'optional',
        dependencies: extractDependencies(err, { dependencies: ['Monitoring'] }),
        errorCode: extractErrorCode(err),
      });
    }

    // Initialize Conversation Realtime Service (if Redis available) - early initialization
    if (redis) {
      try {
        const { ConversationRealtimeService } = await import('../../services/conversation-realtime.service.js');
        result.conversationRealtimeService = new ConversationRealtimeService(redis, monitoring);
        server.log.info('✅ Conversation Realtime Service initialized (early)');
        serviceHealthTracker.trackSuccess('Conversation Realtime Service', 'initialization', ['Redis', 'Monitoring']);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        server.log.error({ err }, '❌ Conversation Realtime Service initialization failed');
        monitoring.trackException(err instanceof Error ? err : new Error(errorMessage), {
          operation: 'service-initialization.conversation-realtime-service',
          criticality: 'optional',
        });
        serviceHealthTracker.trackFailure({
          serviceName: 'Conversation Realtime Service',
          operation: 'initialization',
          error: err,
          criticality: 'optional',
          dependencies: extractDependencies(err, { dependencies: ['Redis', 'Monitoring'] }),
          errorCode: extractErrorCode(err),
        });
      }
    }

    // Get NotificationService and UserService if available (for conversation notifications)
    const notificationService = (server as any).notificationService;
    const userService = (server as any).userService;

    // Initialize Azure OpenAI service (requires config)
    const azureOpenAIConfig = configurationService
      ? {
          endpoint: configurationService.getValue('ai.azureOpenAI.endpoint', '') || '',
          apiKey: configurationService.getValue('ai.azureOpenAI.apiKey', '') || '',
          deploymentName: configurationService.getValue('ai.azureOpenAI.deploymentName', 'gpt-4o') || 'gpt-4o',
        }
      : {
          endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
          apiKey: process.env.AZURE_OPENAI_API_KEY || '',
          deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
        };

    result.azureOpenAI = new (await import('@castiel/api-core')).AzureOpenAIService(
      azureOpenAIConfig,
      monitoring
    );
    server.decorate('azureOpenAI', result.azureOpenAI);

    // Initialize EnrichmentService now that AzureOpenAIService is available
    if (cosmosDatabase && redis) {
      try {
        const { EnrichmentService } = await import('../../services/enrichment.service.js');
        const shardsContainer = cosmosDatabase.container(config.cosmosDb.containers.shards || 'shards');
        const enrichmentService = new EnrichmentService(
          shardsContainer,
          redis,
          result.azureOpenAI,
          monitoring
        );
        server.decorate('enrichmentService', enrichmentService);
        server.log.info('✅ EnrichmentService initialized');
        serviceHealthTracker.trackSuccess('Enrichment Service', 'initialization', ['CosmosDB', 'Redis', 'AzureOpenAI', 'Monitoring']);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        server.log.error({ err }, '❌ EnrichmentService initialization failed - enrichment features will be unavailable');
        monitoring.trackException(err instanceof Error ? err : new Error(errorMessage), {
          operation: 'service-initialization.enrichment-service',
          criticality: 'optional',
        });
        serviceHealthTracker.trackFailure({
          serviceName: 'Enrichment Service',
          operation: 'initialization',
          error: err,
          criticality: 'optional',
          dependencies: extractDependencies(err, { dependencies: ['CosmosDB', 'Redis', 'AzureOpenAI', 'Monitoring'] }),
          errorCode: extractErrorCode(err),
        });
      }
    }

    // Initialize Embedding Services Infrastructure
    const hasCosmosEmbeddingConfig = configurationService
      ? Boolean(
          configurationService.getValue('cosmosDb.endpoint') &&
          configurationService.getValue('cosmosDb.key')
        )
      : Boolean(process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY);

    // Initialize CosmosDbClient if needed (used by both embedding and web search services)
    let cosmosDbClient: any = undefined;
    if (hasCosmosEmbeddingConfig) {
      try {
        const { CosmosDbClient } = await import('@castiel/api-core');
        cosmosDbClient = new CosmosDbClient({
          endpoint: config.cosmosDb.endpoint,
          key: config.cosmosDb.key,
          database: config.cosmosDb.databaseId,
          usersContainer: config.cosmosDb.containers.users || 'users',
          rolesContainer: config.cosmosDb.containers.roles,
          tenantsContainer: config.cosmosDb.containers.tenants,
          ssoConfigsContainer: config.cosmosDb.containers.ssoConfigs,
          oauth2ClientsContainer: config.cosmosDb.containers.oauth2Clients,
          joinRequestsContainer: config.cosmosDb.containers.joinRequests,
          tenantInvitationsContainer: config.cosmosDb.containers.tenantInvitations,
        }, monitoring);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        server.log.error({ err }, '❌ Failed to initialize CosmosDbClient for embedding services');
        monitoring.trackException(err instanceof Error ? err : new Error(errorMessage), {
          operation: 'service-initialization.cosmos-db-client',
          criticality: 'optional',
        });
        serviceHealthTracker.trackFailure({
          serviceName: 'CosmosDbClient (Embedding)',
          operation: 'initialization',
          error: err,
          criticality: 'optional',
          dependencies: extractDependencies(err, { dependencies: ['CosmosDB', 'Monitoring'] }),
          errorCode: extractErrorCode(err),
        });
      }
    }

    // Initialize embedding services if config available
    if (hasCosmosEmbeddingConfig && cosmosDbClient) {
      try {
        const { EmbeddingTemplateService } = await import('../../services/embedding-template.service.js');
        const { EmbeddingService } = await import('../../services/ai-insights/embedding.service.js');
        const { ShardEmbeddingService } = await import('../../services/shard-embedding.service.js');
        const { VectorSearchService } = await import('@castiel/api-core');
        const { VectorSearchCacheService } = await import('../../services/vector-search-cache.service.js');
        const { ACLService } = await import('../../services/acl.service.js');
        const { ShardEmbeddingChangeFeedService } = await import('../../services/embedding-processor/change-feed.service.js');

        const database = cosmosDbClient.getDatabase();
        const shardsContainer = database.container(config.cosmosDb.containers.shards);

        // Initialize EmbeddingTemplateService
        result.embeddingTemplateService = new EmbeddingTemplateService(monitoring);
        server.log.info('✅ Embedding Template service initialized');

        // Initialize EmbeddingService
        result.embeddingService = new EmbeddingService(
          monitoring,
          configurationService
            ? (configurationService.getValue('ai.azureOpenAI.endpoint') || undefined)
            : (process.env.AZURE_OPENAI_ENDPOINT || undefined),
          configurationService
            ? (configurationService.getValue('ai.azureOpenAI.apiKey') || undefined)
            : (process.env.AZURE_OPENAI_API_KEY || undefined),
          configurationService
            ? (configurationService.getValue('ai.azureOpenAI.deploymentName', 'text-embedding-ada-002') || 'text-embedding-ada-002')
            : (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-ada-002')
        );
        server.log.info('✅ Embedding service initialized');

        // Initialize ACLService for vector search filtering
        let aclCacheService: ACLCacheService | null = null;
        if (redis && (server as any).cache && (server as any).cacheSubscriber) {
          aclCacheService = new ACLCacheService(
            (server as any).cache,
            (server as any).cacheSubscriber,
            monitoring
          );
        }
        result.aclService = new ACLService(
          shardRepository,
          aclCacheService,
          monitoring
        );
        server.decorate('aclService', result.aclService);

        // Initialize VectorSearchCacheService if Redis available
        let vectorSearchCacheService: any = undefined;
        if (redis) {
          vectorSearchCacheService = new VectorSearchCacheService(redis, monitoring);
          server.log.info('✅ Vector Search Cache service initialized');
        }

        // Get Phase 2 MetricsShardService from server if available
        const metricsShardService = (server as any).metricsShardService;

        // Initialize VectorSearchService with template support
        result.vectorSearchService = new VectorSearchService(
          shardsContainer,
          result.aclService,
          monitoring,
          result.azureOpenAI,
          vectorSearchCacheService,
          result.embeddingTemplateService,
          shardTypeRepository,
          shardRepository,
          metricsShardService
        );
        server.log.info('✅ Vector Search service initialized with embedding template support');

        // Initialize Embedding Content Hash Cache Service
        const { EmbeddingContentHashCacheService } = await import('../../services/embedding-content-hash-cache.service.js');
        const embeddingCache = redis ? new EmbeddingContentHashCacheService(redis, monitoring) : undefined;
        if (embeddingCache) {
          (server as any).embeddingCache = embeddingCache;
          server.log.info('✅ Embedding Content Hash Cache service initialized');
        }

        // Initialize ShardEmbeddingService
        result.shardEmbeddingService = new ShardEmbeddingService(
          result.embeddingTemplateService,
          result.embeddingService,
          shardTypeRepository,
          shardRepository,
          monitoring,
          embeddingCache
        );
        server.log.info('✅ Shard Embedding service initialized');

        // Initialize Queue Service (BullMQ) for embedding jobs
        try {
          const { config } = await import('../../config/env.js');
          const hasRedis = config.redis?.host || process.env.REDIS_URL || process.env.REDIS_HOST;

          if (hasRedis) {
            const { QueueService } = await import('../../services/queue.service.js');
            result.queueService = new QueueService(monitoring);
            server.log.info('✅ Queue Service (BullMQ) initialized for embedding jobs');
          } else {
            server.log.info('ℹ️  Redis not configured - embedding jobs will not be enqueued');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          server.log.error({ err: error }, '❌ Queue service initialization failed - embedding jobs will not be enqueued');
          monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
            operation: 'service-initialization.queue-service',
            criticality: 'optional',
          });
          serviceHealthTracker.trackFailure({
            serviceName: 'Queue Service (Embedding)',
            operation: 'initialization',
            error: error,
            criticality: 'optional',
            dependencies: extractDependencies(error, { dependencies: ['Redis', 'Monitoring'] }),
            errorCode: extractErrorCode(error),
          });
        }

        // Initialize Change Feed Service for automatic embedding generation
        const shardEmbeddingChangeFeedService = new ShardEmbeddingChangeFeedService(
          shardsContainer,
          result.shardEmbeddingService,
          monitoring,
          result.queueService,
          {
            maxItemCount: 100,
            pollInterval: 5000,
            maxConcurrency: 5,
            mode: result.queueService ? 'enqueue' : 'generate',
          }
        );

        // Start change feed processor in background
        shardEmbeddingChangeFeedService.start().then(() => {
          server.log.info('✅ Shard Embedding Change Feed processor started');
        }).catch((err: Error) => {
          server.log.error({ err }, '❌ Failed to start Shard Embedding Change Feed processor');
        });

        // Decorate server with embedding services for route access
        server.decorate('embeddingTemplateService', result.embeddingTemplateService);
        server.decorate('embeddingService', result.embeddingService);
        server.decorate('shardEmbeddingService', result.shardEmbeddingService);
        server.decorate('vectorSearchService', result.vectorSearchService);
        server.decorate('shardEmbeddingChangeFeedService', shardEmbeddingChangeFeedService);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        server.log.error({ err }, '❌ Embedding services not fully initialized - some features may be unavailable');
        monitoring.trackException(err instanceof Error ? err : new Error(errorMessage), {
          operation: 'service-initialization.embedding-services',
          criticality: 'optional',
        });
        serviceHealthTracker.trackFailure({
          serviceName: 'Embedding Services',
          operation: 'initialization',
          error: err,
          criticality: 'optional',
          dependencies: extractDependencies(err, { dependencies: ['CosmosDB', 'Redis', 'AzureOpenAI', 'Monitoring'] }),
          errorCode: extractErrorCode(err),
        });
      }
    } else {
      server.log.warn('⚠️ Embedding services skipped - COSMOS_DB_ENDPOINT or COSMOS_DB_KEY not set');
    }

    // Initialize Model Router Service (for intelligent model selection)
    const { ModelRouterService } = await import('../../services/model-router.service.js');
    result.modelRouter = new ModelRouterService(
      shardRepository,
      shardTypeRepository,
      redis || null,
      monitoring,
      aiConfigService
    );
    (server as any).modelRouter = result.modelRouter;

    // Initialize AI Model Selection Service (integrates connections with routing)
    if (aiConnectionService) {
      const { AIModelSelectionService } = await import('../../services/ai/ai-model-selection.service.js');
      result.aiModelSelection = new AIModelSelectionService(
        aiConnectionService,
        modelRouter,
        monitoring,
        aiConfigService
      );
      server.log.info('✅ AI Model Selection service initialized');

      // Initialize Unified AI Client (provider-agnostic LLM client)
      const { UnifiedAIClient } = await import('../../services/ai/unified-ai-client.service.js');
      result.unifiedAIClient = new UnifiedAIClient(monitoring);
      server.log.info('✅ Unified AI Client initialized');

      // Phase 5.1: Initialize ConversationSummarizationService
      const { ConversationSummarizationService } = await import('../../services/conversation-summarization.service.js');
      result.conversationSummarizationService = new ConversationSummarizationService(
        monitoring,
        result.unifiedAIClient
      );
      server.decorate('conversationSummarizationService', result.conversationSummarizationService);
      server.log.info('✅ Conversation Summarization Service initialized');

      // Phase 5.1: Initialize ConversationContextRetrievalService
      const { ConversationContextRetrievalService } = await import('../../services/conversation-context-retrieval.service.js');
      let memoryContextService = (server as any).memoryContextService;
      if (!memoryContextService && redis) {
        memoryContextService = createMemoryContextService(redis, monitoring);
        server.decorate('memoryContextService', memoryContextService);
      }
      result.conversationContextRetrievalService = new ConversationContextRetrievalService(
        monitoring,
        result.conversationService, // Will be set later
        memoryContextService,
        result.vectorSearchService
      );
      server.decorate('conversationContextRetrievalService', result.conversationContextRetrievalService);
      server.log.info('✅ Conversation Context Retrieval Service initialized');
    }

    // Initialize ContextTemplateService
    const { ContextTemplateService } = await import('../../services/context-template.service.js');
    result.contextTemplateService = new ContextTemplateService(
      monitoring,
      shardRepository,
      shardTypeRepository,
      relationshipService,
      redis || undefined,
      result.unifiedAIClient,
      aiConnectionService,
      result.vectorSearchService,
      result.aclService
    );

    // Initialize IntentAnalyzerService
    const { IntentAnalyzerService } = await import('../../services/intent-analyzer.service.js');
    result.intentAnalyzer = new IntentAnalyzerService(
      monitoring,
      shardRepository,
      shardTypeRepository,
      redis || undefined,
      result.aiModelSelection,
      result.unifiedAIClient
    );

    // Initialize ConversationService
    const { ConversationService } = await import('../../services/conversation.service.js');
    result.conversationService = new ConversationService(
      monitoring,
      shardRepository,
      shardTypeRepository,
      redis || undefined,
      result.unifiedAIClient,
      aiConnectionService,
      result.conversionService,
      relationshipService,
      result.conversationRealtimeService,
      notificationService,
      userService,
      result.conversationSummarizationService
    );

    // Initialize Prompt System (needed for InsightService)
    try {
      const { AIInsightsCosmosService } = await import('../../services/ai-insights/cosmos.service.js');
      const { PromptRepository } = await import('../../services/ai-insights/prompt.repository.js');
      const { PromptRendererService } = await import('../../services/ai-insights/prompt-renderer.service.js');
      const { PromptABTestService } = await import('../../services/prompt-ab-test.service.js');
      const { PromptResolverService } = await import('../../services/ai-insights/prompt-resolver.service.js');
      const { PromptAnalyticsService } = await import('../../services/prompt-analytics.service.js');

      const aiInsightsCosmosService = new AIInsightsCosmosService(monitoring);
      result.promptRepository = new PromptRepository(aiInsightsCosmosService);
      result.promptRenderer = new PromptRendererService();
      result.promptABTestService = new PromptABTestService(aiInsightsCosmosService, monitoring);

      // Initialize Prompt Analytics Service (optional, requires Redis)
      result.promptAnalytics = undefined;
      if (redis) {
        result.promptAnalytics = new PromptAnalyticsService(redis, monitoring);
        (server as any).promptAnalytics = result.promptAnalytics;
        server.log.info('✅ Prompt Analytics Service initialized');
      }

      result.promptResolver = new PromptResolverService(
        result.promptRepository,
        result.promptRenderer,
        result.promptABTestService,
        result.promptAnalytics
      );
      server.log.info('✅ Prompt Resolver Service initialized');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Prompt Resolver Service initialization failed - continuing with fallback prompts');
    }

    // Initialize Entity Resolution and Context-Aware Query Parser
    const { EntityResolutionService } = await import('../../services/entity-resolution.service.js');
    const { ContextAwareQueryParserService } = await import('../../services/context-aware-query-parser.service.js');

    result.entityResolutionService = new EntityResolutionService(
      shardRepository,
      monitoring,
      redis || undefined
    );
    server.log.info('✅ Entity Resolution service initialized');

    result.contextAwareQueryParserService = new ContextAwareQueryParserService(
      result.entityResolutionService,
      shardRepository,
      monitoring
    );
    server.log.info('✅ Context-Aware Query Parser service initialized');

    // Initialize GroundingService if LLM services are available
    try {
      if (result.azureOpenAI) {
        const { GroundingService } = await import('../../services/grounding.service.js');
        const { AzureOpenAILLMAdapter } = await import('../../services/llm.service.js');
        const llmAdapter = new AzureOpenAILLMAdapter(result.azureOpenAI);
        result.groundingService = new GroundingService(llmAdapter);
        server.log.info('✅ Grounding Service initialized with AzureOpenAI');
      }
    } catch (err) {
      server.log.warn({ err }, '⚠️ Grounding Service initialization failed - continuing without grounding');
    }

    // Initialize AI Tool Executor Service (for function calling)
    try {
      const { AIToolExecutorService } = await import('../../services/ai/ai-tool-executor.service.js');
      const emailService = (server as any).emailService;
      const roleManagementService = (server as any).roleManagementService;
      const comprehensiveAuditTrailServiceForTools = (server as any).comprehensiveAuditTrailService;

      result.toolExecutor = new AIToolExecutorService(
        monitoring,
        shardRepository,
        undefined, // webSearchService - will be set later if available
        emailService,
        roleManagementService,
        comprehensiveAuditTrailServiceForTools
      );
      server.log.info('✅ AI Tool Executor service initialized');
    } catch (err) {
      server.log.warn({ err }, '⚠️ AI Tool Executor Service initialization failed - continuing without function calling');
    }

    // Initialize additional services (ContextQuality, ComprehensiveAuditTrail, PII, etc.)
    try {
      const { ContextQualityService } = await import('../../services/context-quality.service.js');
      result.contextQualityService = new ContextQualityService();
      server.decorate('contextQualityService', result.contextQualityService);
      server.log.info('✅ Context Quality Service initialized');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Context Quality Service initialization failed');
    }

    try {
      const { ComprehensiveAuditTrailService } = await import('../../services/comprehensive-audit-trail.service.js');
      const { CosmosDBService } = await import('../../services/cosmos-db.service.js');
      const { ServiceCategory } = await import('../../types/service-registry.types.js');
      const cosmosDB = new CosmosDBService();
      result.comprehensiveAuditTrailService = new ComprehensiveAuditTrailService(cosmosDB, monitoring);
      server.decorate('comprehensiveAuditTrailService', result.comprehensiveAuditTrailService);

      if (serviceRegistry) {
        serviceRegistry.register('comprehensiveAuditTrailService', result.comprehensiveAuditTrailService, {
          name: 'comprehensiveAuditTrailService',
          category: ServiceCategory.MONITORING,
          required: false,
          dependencies: ['monitoring'],
          optionalDependencies: [],
          initializationPhase: 3,
          description: 'Comprehensive audit trail logging service',
        });
        serviceRegistry.markInitialized('comprehensiveAuditTrailService');
      }
      server.log.info('✅ Comprehensive Audit Trail Service initialized');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Comprehensive Audit Trail Service initialization failed');
    }

    // Phase 3.1: Initialize PII Detection and Redaction services
    try {
      const { PIIDetectionService } = await import('../../services/pii-detection.service.js');
      const { PIIRedactionService } = await import('../../services/pii-redaction.service.js');
      result.piiDetectionService = new PIIDetectionService(monitoring);
      result.piiRedactionService = new PIIRedactionService(monitoring);
      server.decorate('piiDetectionService', result.piiDetectionService);
      server.decorate('piiRedactionService', result.piiRedactionService);
      server.log.info('✅ PII Detection and Redaction Services initialized (Phase 3.1)');
    } catch (err) {
      server.log.warn({ err }, '⚠️ PII Detection and Redaction Services initialization failed');
    }

    // Phase 3.1: Initialize Field Security Service
    try {
      const { FieldSecurityService } = await import('../../services/field-security.service.js');
      result.fieldSecurityService = new FieldSecurityService(monitoring);
      server.decorate('fieldSecurityService', result.fieldSecurityService);
      server.log.info('✅ Field Security Service initialized (Phase 3.1)');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Field Security Service initialization failed');
    }

    // Phase 3.2: Initialize Citation Validation Service
    try {
      const { CitationValidationService } = await import('../../services/citation-validation.service.js');
      result.citationValidationService = new CitationValidationService(monitoring, shardRepository);
      server.decorate('citationValidationService', result.citationValidationService);
      server.log.info('✅ Citation Validation Service initialized (Phase 3.2)');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Citation Validation Service initialization failed');
    }

    // Phase 3.3: Initialize Prompt Injection Defense Service
    try {
      const { PromptInjectionDefenseService } = await import('../../services/prompt-injection-defense.service.js');
      result.promptInjectionDefenseService = new PromptInjectionDefenseService(monitoring, result.azureOpenAI);
      server.decorate('promptInjectionDefenseService', result.promptInjectionDefenseService);
      server.log.info('✅ Prompt Injection Defense Service initialized (Phase 3.3)');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Prompt Injection Defense Service initialization failed');
    }

    // Phase 5.2: Initialize Context Cache Service
    if (redis) {
      try {
        const { ContextCacheService } = await import('../../services/context-cache.service.js');
        result.contextCacheService = new ContextCacheService(redis, monitoring);
        server.decorate('contextCacheService', result.contextCacheService);
        server.log.info('✅ Context Cache Service initialized (Phase 5.2)');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Context Cache Service initialization failed');
      }
    }

    // Initialize TenantProjectConfigService
    try {
      const { TenantProjectConfigService } = await import('../../services/tenant-project-config.service.js');
      const { CosmosDBService } = await import('../../services/cosmos-db.service.js');
      const { CacheService } = await import('../../services/cache.service.js');
      const cosmosDB = new CosmosDBService();
      const cacheService = redis ? new CacheService(redis, monitoring) : null;
      result.tenantProjectConfigService = new TenantProjectConfigService(cosmosDB, cacheService, monitoring);
      server.log.info('✅ Tenant Project Config Service initialized');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Tenant Project Config Service initialization failed');
    }

    // Initialize InsightService (main AI service)
    const { InsightService } = await import('../../services/insight.service.js');
    result.insightService = new InsightService(
      monitoring,
      shardRepository,
      shardTypeRepository,
      result.intentAnalyzer,
      result.contextTemplateService,
      result.conversationService,
      result.azureOpenAI,
      result.groundingService,
      result.vectorSearchService,
      result.webSearchContextIntegration,
      redis || undefined,
      result.aiModelSelection,
      result.unifiedAIClient,
      aiConnectionService,
      relationshipService,
      result.promptResolver,
      result.contextAwareQueryParserService,
      result.toolExecutor,
      aiConfigService,
      result.tenantProjectConfigService,
      result.multimodalAssetService,
      result.contextQualityService,
      result.comprehensiveAuditTrailService,
      result.piiDetectionService,
      result.piiRedactionService,
      result.fieldSecurityService,
      result.citationValidationService,
      result.promptInjectionDefenseService,
      result.conversationSummarizationService,
      result.conversationContextRetrievalService,
      result.contextCacheService,
      (server as any).riskEvaluationService
    );

    server.decorate('insightService', result.insightService);

    // Set ACLService on InsightService for ProjectContextService permission checks
    if (result.aclService) {
      result.insightService.setACLService(result.aclService);
    }

    // Phase 6.2: Initialize User Feedback Service
    if (redis) {
      try {
        const { FeedbackLearningService } = await import('../../services/feedback-learning.service.js');
        const { UserFeedbackService } = await import('../../services/user-feedback.service.js');
        const feedbackLearningService = new FeedbackLearningService(redis, monitoring);
        result.userFeedbackService = new UserFeedbackService(
          monitoring,
          feedbackLearningService,
          result.promptResolver,
          result.insightService
        );
        server.decorate('userFeedbackService', result.userFeedbackService);
        server.log.info('✅ User Feedback Service initialized (Phase 6.2)');

        // Re-initialize ConversationService with UserFeedbackService
        result.conversationService = new ConversationService(
          monitoring,
          shardRepository,
          shardTypeRepository,
          redis || undefined,
          result.unifiedAIClient,
          aiConnectionService,
          result.conversionService,
          relationshipService,
          result.conversationRealtimeService,
          notificationService,
          userService,
          result.conversationSummarizationService,
          result.userFeedbackService
        );
        server.log.info('✅ Conversation Service updated with User Feedback Service');
      } catch (err) {
        server.log.warn({ err }, '⚠️ User Feedback Service initialization failed');
      }
    }

    server.log.info('✅ AI Services initialized successfully');
  } catch (err) {
    server.log.error({ err }, '❌ AI Services initialization failed');
    throw err;
  }

  return result;
}
