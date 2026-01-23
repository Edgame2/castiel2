/**
 * AI Routes Registration
 * Registers all AI-related routes (insights, conversations, embeddings, etc.)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';
import { registerEmbeddingTemplateRoutes } from '../embedding-template.routes.js';
import { registerEmbeddingTemplateGenerationRoutes } from '../embedding-template-generation.routes.js';
import { registerEmbeddingRoutes } from '../embedding.routes.js';
import { registerEmbeddingJobRoutes } from '../embedding-jobs.routes.js';
import { registerAIRecommendationRoutes } from '../ai-recommendation.routes.js';
import { registerAIConnectionsRoutes } from '../ai-connections.routes.js';
import { registerAIToolsRoutes } from '../ai-tools.routes.js';
import { registerIntentPatternRoutes } from '../intent-patterns.routes.js';
import { aiSettingsRoutes } from '../ai-settings.routes.js';
import { aiModelsRoutes } from '../ai-models.routes.js';
import { aiAnalyticsRoutes } from '../ai-analytics.routes.js';
import { customIntegrationRoutes, customIntegrationWebhookRoutes } from '../custom-integration.routes.js';
import { insightsRoutes } from '../insights.routes.js';
import { promptsRoutes } from '../prompts.routes.js';
import { promptABTestRoutes } from '../prompt-ab-test.routes.js';
import { registerProactiveInsightsRoutes, registerDeliveryPreferencesRoutes } from '../proactive-insights.routes.js';
import { registerProactiveTriggersRoutes } from '../proactive-triggers.routes.js';
import { registerInsightsSearchRoutes } from '../ai-insights/search.routes.js';

export interface AIRoutesDependencies {
  insightService: any;
  conversationService: any;
  contextTemplateService: any;
  entityResolutionService: any;
  contextAwareQueryParserService: any;
  conversationRealtimeService?: any;
  multimodalAssetService?: any;
  embeddingTemplateService?: any;
  embeddingService?: any;
  shardEmbeddingService?: any;
  vectorSearchService?: any;
  azureOpenAI?: any;
  unifiedAIClient?: any;
  aiConnectionService?: any;
  aiModelSelection?: any;
  toolExecutor?: any;
  promptResolver?: any;
  promptRepository?: any;
  promptRenderer?: any;
  promptABTestService?: any;
  promptAnalytics?: any;
  modelRouter?: any;
  redis?: any;
  monitoring: IMonitoringProvider;
  authenticate: any;
  tokenValidationCache?: any;
}

/**
 * Register AI-related routes
 */
export async function registerAIRoutes(
  server: FastifyInstance,
  dependencies: AIRoutesDependencies
): Promise<void> {
  const tracker = getRouteRegistrationTracker();
  const {
    insightService,
    conversationService,
    contextTemplateService,
    entityResolutionService,
    contextAwareQueryParserService,
    conversationRealtimeService,
    multimodalAssetService,
    embeddingTemplateService,
    embeddingService,
    shardEmbeddingService,
    vectorSearchService,
    azureOpenAI,
    unifiedAIClient,
    aiConnectionService,
    aiModelSelection,
    toolExecutor,
    promptResolver,
    promptRepository,
    promptRenderer,
    promptABTestService,
    promptAnalytics,
    modelRouter,
    redis,
    monitoring,
    authenticate,
    tokenValidationCache,
  } = dependencies;

  try {
    // Embedding Template management routes
    if (embeddingTemplateService) {
      try {
        await server.register(async (tmplServer) => {
          await registerEmbeddingTemplateRoutes(tmplServer, monitoring);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Embedding template routes registered');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Embedding template routes failed to register');
      }

      // Embedding Template generation routes (with prompt integration)
      try {
        await server.register(async (genServer) => {
          await registerEmbeddingTemplateGenerationRoutes(genServer, monitoring);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Embedding template generation routes registered');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Embedding template generation routes failed to register');
      }
    }

    // Embedding Management routes
    if (shardEmbeddingService) {
      await server.register(async (embeddingServer) => {
        await registerEmbeddingRoutes(embeddingServer, monitoring);
      }, { prefix: '/api/v1' });
      server.log.info('✅ Embedding management routes registered');

      // Register embedding job routes
      await server.register(async (jobServer) => {
        await registerEmbeddingJobRoutes(jobServer, monitoring);
      }, { prefix: '/api/v1' });
      server.log.info('✅ Embedding job routes registered');
    }

    // AI Insights routes (main chat/conversation routes)
    if (insightService && conversationService && contextTemplateService) {
      try {
        await server.register(insightsRoutes, {
          prefix: '/api/v1',
          insightService,
          conversationService,
          contextTemplateService,
          entityResolutionService,
          contextAwareQueryParserService,
          conversationRealtimeService,
          multimodalAssetService,
          authenticate,
          tokenValidationCache,
        });
        server.log.info('✅ AI Insights routes registered with prefix /api/v1');
        tracker.record('AI Insights', true, {
          prefix: '/api/v1',
          dependencies: ['insightService', 'conversationService', 'AzureOpenAI', 'CosmosDB', 'Redis']
        });
      } catch (err) {
        server.log.warn({ err }, '⚠️ AI Insights routes failed to register');
        tracker.record('AI Insights', false, {
          prefix: '/api/v1',
          reason: err instanceof Error ? err.message : 'Registration failed',
          dependencies: ['insightService', 'conversationService']
        });
      }
    }

    // Prompt System routes
    if (promptRepository && promptResolver && promptRenderer) {
      await server.register(promptsRoutes, {
        prefix: '/api/v1/prompts',
        promptRepository,
        promptResolver,
        promptRenderer
      });
      server.log.info('✅ Prompt System routes registered');

      // Register Prompt A/B Testing routes
      if (promptABTestService) {
        await server.register(promptABTestRoutes, {
          prefix: '/api/v1',
          abTestService: promptABTestService,
        });
        server.log.info('✅ Prompt A/B Testing routes registered');
      }
    }

    // AI Recommendation routes
    if (azureOpenAI && promptResolver) {
      try {
        const { AIRecommendationService } = await import('../../services/ai-insights/ai-recommendation.service.js');
        const aiRecommendationService = new AIRecommendationService(
          azureOpenAI,
          promptResolver,
          promptRenderer || new (await import('../../services/ai-insights/prompt-renderer.service.js')).PromptRendererService(),
          monitoring
        );

        await server.register(async (aiRecServer) => {
          await registerAIRecommendationRoutes(aiRecServer, aiRecommendationService);
        }, { prefix: '/api/v1' });

        server.log.info('✅ AI Recommendation routes registered');
      } catch (err) {
        server.log.warn({ err }, '⚠️ AI Recommendation routes failed to register');
      }
    }

    // AI Settings routes (Super Admin & Tenant Admin)
    await server.register(aiSettingsRoutes, {
      prefix: '/api/v1',
      monitoring,
      shardRepository: (server as any).shardRepository,
      shardTypeRepository: (server as any).shardTypeRepository,
    });
    server.log.info('✅ AI Settings routes registered');

    // AI Connections routes (Super Admin & Tenant Admin)
    if (aiConnectionService) {
      await server.register(async (fastify) => {
        registerAIConnectionsRoutes(fastify, aiConnectionService, unifiedAIClient, monitoring);
      }, { prefix: '/api/v1' });
      server.log.info('✅ AI Connections routes registered');
    } else {
      server.log.warn('⚠️ AI Connections routes not registered - AI Connection service not available');
    }

    // AI Models Catalog routes (Super Admin)
    await server.register(aiModelsRoutes, {
      prefix: '/api/v1',
      monitoring,
    });
    server.log.info('✅ AI Models Catalog routes registered');

    // AI Tools Management routes (Super Admin)
    // Set comprehensive audit trail service on tool executor if available
    if (toolExecutor && (server as any).comprehensiveAuditTrailService) {
      toolExecutor.setComprehensiveAuditTrailService((server as any).comprehensiveAuditTrailService);
    }

    if (toolExecutor) {
      try {
        await registerAIToolsRoutes(server, toolExecutor, monitoring);
        server.log.info('✅ AI Tools Management routes registered');
      } catch (err) {
        server.log.warn({ err }, '⚠️ AI Tools Management routes failed to register');
      }
    } else {
      server.log.warn('⚠️ AI Tools Management routes not registered - Tool Executor not available');
    }

    // Intent Pattern Management routes (Super Admin)
    if (unifiedAIClient && aiConnectionService) {
      try {
        const { IntentPatternService } = await import('../../services/intent-pattern.service.js');
        const intentPatternService = new IntentPatternService(
          monitoring,
          unifiedAIClient,
          aiConnectionService
        );
        await intentPatternService.initialize();
        await registerIntentPatternRoutes(server, intentPatternService, monitoring);
        server.log.info('✅ Intent Pattern routes registered');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Intent Pattern routes failed to register');
      }
    } else {
      server.log.warn('⚠️ Intent Pattern routes not registered - UnifiedAIClient or AIConnectionService not available');
    }

    // Custom Integration routes
    await server.register(customIntegrationRoutes, {
      prefix: '/api/v1',
      monitoring,
      shardRepository: (server as any).shardRepository,
      shardTypeRepository: (server as any).shardTypeRepository,
    });
    server.log.info('✅ Custom Integration routes registered');

    // Custom Integration Webhook receiver (public)
    await server.register(customIntegrationWebhookRoutes, {
      prefix: '/api/v1',
      monitoring,
      shardRepository: (server as any).shardRepository,
      shardTypeRepository: (server as any).shardTypeRepository,
    });
    server.log.info('✅ Custom Integration Webhook routes registered');

    // AI Analytics routes
    if (redis) {
      await server.register(aiAnalyticsRoutes, {
        prefix: '/api/v1',
        monitoring,
        redis,
        promptAnalytics,
        modelRouter,
      });
      server.log.info('✅ AI Analytics routes registered');
    }

    // AI Insights web/deep search routes
    try {
      await server.register(registerInsightsSearchRoutes, { prefix: '/api/v1', monitoring });
      server.log.info('✅ AI Insights search routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ AI Insights search routes not registered');
    }

    // Proactive Insights routes (if available)
    const proactiveInsightService = (server as any).proactiveInsightService;
    const deliveryPreferencesRepository = (server as any).deliveryPreferencesRepository;
    const proactiveInsightsAnalyticsService = (server as any).proactiveInsightsAnalyticsService;

    if (proactiveInsightService) {
      try {
        await registerProactiveInsightsRoutes(
          server,
          proactiveInsightService,
          deliveryPreferencesRepository,
          proactiveInsightsAnalyticsService
        );
        server.log.info('✅ Proactive Insights routes registered');

        if (deliveryPreferencesRepository) {
          try {
            await registerDeliveryPreferencesRoutes(server, deliveryPreferencesRepository, proactiveInsightsAnalyticsService);
            server.log.info('✅ Delivery Preferences routes registered');
          } catch (err) {
            server.log.warn({ err }, '⚠️ Delivery Preferences routes failed to register');
          }
        }

        // Proactive Triggers routes
        const proactiveTriggersRepository = (server as any).proactiveTriggersRepository;
        if (proactiveTriggersRepository) {
          try {
            await registerProactiveTriggersRoutes(server, proactiveTriggersRepository, proactiveInsightService);
            server.log.info('✅ Proactive Triggers routes registered');
          } catch (err) {
            server.log.warn({ err }, '⚠️ Proactive Triggers routes failed to register');
          }
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Proactive Insights routes failed to register');
      }
    }

    server.log.info('✅ AI Routes registration completed');
  } catch (err) {
    server.log.error({ err }, '❌ AI Routes registration failed');
    throw err;
  }
}
