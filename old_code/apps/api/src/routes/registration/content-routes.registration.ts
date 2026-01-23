/**
 * Content Routes Registration
 * Registers all content-related routes (templates, documents, content generation)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';
import { registerTemplateRoutes } from '../template.routes.js';
import { registerDocumentTemplateRoutes } from '../document-template.routes.js';
import { registerContentGenerationRoutes } from '../content-generation.routes.js';
import { registerDocumentRoutes } from '../document.routes.js';
import { registerCollectionRoutes } from '../collection.routes.js';
import { registerDocumentBulkRoutes } from '../document-bulk.routes.js';
import { registerMemoryRoutes } from '../memory.routes.js';
import { registerOnboardingRoutes } from '../onboarding.routes.js';
import { createMemoryContextService } from '../../services/memory-context.service.js';
import { TemplateService } from '../../services/content-generation/template.service.js';
import { TemplateController } from '../../controllers/template.controller.js';
import { DocumentTemplateService } from '../../services/content-generation/services/document-template.service.js';
import { DocumentTemplateController } from '../../controllers/document-template.controller.js';
import { PlaceholderPreviewService } from '../../services/content-generation/services/placeholder-preview.service.js';
import { DocumentGenerationService } from '../../services/content-generation/services/document-generation.service.js';
import { ContentGenerationService } from '../../services/content-generation/content-generation.service.js';
import { ContentGenerationController } from '../../controllers/content-generation.controller.js';
import { MemoryController } from '../../controllers/memory.controller.js';
import { OnboardingService } from '../../services/onboarding.service.js';
import { OnboardingController } from '../../controllers/onboarding.controller.js';
import {
  ShardRepository,
  ShardTypeRepository,
} from '@castiel/api-core';

export interface ContentRoutesDependencies {
  monitoring: IMonitoringProvider;
  redis?: any;
  cosmosClient?: any;
  cosmosDatabase?: any;
  insightService?: any;
  shardRepository?: any;
  shardTypeRepository?: any;
  contextTemplateService?: any;
  conversionService?: any;
  queueService?: any;
  unifiedAIClient?: any;
  aiConnectionService?: any;
  aiConfigService?: any;
  integrationService?: any;
  integrationConnectionService?: any;
  emailService?: any;
  contentGenerationEnabled?: boolean;
}

/**
 * Register content-related routes
 */
export async function registerContentRoutes(
  server: FastifyInstance,
  dependencies: ContentRoutesDependencies
): Promise<void> {
  const tracker = getRouteRegistrationTracker();
  const {
    monitoring,
    redis,
    cosmosClient,
    cosmosDatabase,
    insightService,
    shardRepository,
    shardTypeRepository,
    contextTemplateService,
    conversionService,
    queueService,
    unifiedAIClient,
    aiConnectionService,
    aiConfigService,
    integrationService,
    integrationConnectionService,
    emailService,
    contentGenerationEnabled = true,
  } = dependencies;

  try {
    // Document Management routes
    const documentController = (server as any).documentController;
    if (documentController) {
      await registerDocumentRoutes(server);
      server.log.info('✅ Document management routes registered');
      tracker.record('Documents', true, {
        prefix: '/api/v1',
        dependencies: ['documentController', 'AzureBlobStorage', 'CosmosDB']
      });
    } else {
      server.log.warn('⚠️  Document management routes not registered - controller missing');
      tracker.record('Documents', false, {
        prefix: '/api/v1',
        reason: 'documentController missing',
        dependencies: ['documentController']
      });
    }

    // Bulk Document Operations routes
    const documentBulkController = (server as any).documentBulkController;
    if (documentBulkController) {
      try {
        await registerDocumentBulkRoutes(server, documentBulkController);
        server.log.info('✅ Bulk document operations routes registered');
        tracker.record('Bulk Documents', true, {
          prefix: '/api/v1',
          dependencies: ['documentBulkController', 'CosmosDB', 'ShardRepository']
        });
      } catch (err) {
        server.log.warn({ err }, '⚠️  Bulk document operations routes failed to register');
        tracker.record('Bulk Documents', false, {
          prefix: '/api/v1',
          reason: err instanceof Error ? err.message : 'Registration failed',
          dependencies: ['documentBulkController']
        });
      }
    }

    // Collection Management routes
    const collectionController = (server as any).collectionController;
    if (collectionController) {
      await registerCollectionRoutes(server);
      server.log.info('✅ Collection management routes registered');
      tracker.record('Collections', true, {
        prefix: '/api/v1',
        dependencies: ['collectionController', 'CosmosDB']
      });
    } else {
      server.log.warn('⚠️  Collection management routes not registered - controller missing');
      tracker.record('Collections', false, {
        prefix: '/api/v1',
        reason: 'collectionController missing',
        dependencies: ['collectionController']
      });
    }

    // Content Generation Routes (Feature Flagged)
    if (contentGenerationEnabled) {
      try {
        // Initialize TemplateService (for simple content templates)
        const templateService = new TemplateService(monitoring, cosmosClient || (server as any).cosmos);
        const templateController = new TemplateController(templateService);

        await server.register(async (tplServer) => {
          await registerTemplateRoutes(tplServer, templateController);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Template routes registered');

        // Initialize Document Template Service (for placeholder-based document templates)
        const documentTemplateService = new DocumentTemplateService(
          monitoring,
          cosmosClient || (server as any).cosmos,
          integrationService,
          integrationConnectionService
        );

        // Initialize Placeholder Preview Service (if dependencies are available)
        let placeholderPreviewService: PlaceholderPreviewService | undefined;
        try {
          if (contextTemplateService && shardRepository && shardTypeRepository) {
            // Create minimal services needed for InsightService preview
            const { IntentAnalyzerService } = await import('../../services/intent-analyzer.service.js');
            const { ConversationService } = await import('../../services/conversation.service.js');
            const { AzureOpenAIService } = await import('../../services/azure-openai.service.js');
            const { ShardRelationshipService } = await import('../../services/shard-relationship.service.js');
            const { InsightService } = await import('../../services/insight.service.js');

            const intentAnalyzer = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepository, redis || undefined);
            const conversationService = new ConversationService(
              monitoring,
              shardRepository,
              shardTypeRepository,
              redis || undefined,
              undefined, // unifiedAIClient
              undefined, // aiConnectionService
              undefined, // conversionService
              undefined, // shardRelationshipService
              undefined, // conversationRealtimeService
              undefined, // notificationService
              undefined, // userService
              undefined // ConversationSummarizationService
            );
            const azureOpenAI = new AzureOpenAIService(
              {
                endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
                apiKey: process.env.AZURE_OPENAI_API_KEY || '',
                deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
              },
              monitoring
            );
            const relationshipService = new ShardRelationshipService(
              monitoring,
              shardRepository,
              (server as any).relationshipEvolutionService
            );
            await relationshipService.initialize();

            const contextQualityServiceForPreview = (server as any).contextQualityService;
            const comprehensiveAuditTrailServiceForPreview = (server as any).comprehensiveAuditTrailService;

            // Create InsightService instance for preview service
            const previewInsightService = new InsightService(
              monitoring,
              shardRepository,
              shardTypeRepository,
              intentAnalyzer,
              contextTemplateService,
              conversationService,
              azureOpenAI,
              undefined, // groundingService
              undefined, // vectorSearch
              undefined, // webSearchContextIntegration
              redis || undefined,
              undefined, // aiModelSelection
              undefined, // unifiedAIClient
              undefined, // aiConnectionService
              relationshipService,
              undefined, // promptResolver
              undefined, // contextAwareQueryParser
              undefined, // toolExecutor
              undefined, // aiConfigService
              undefined, // tenantProjectConfigService
              undefined, // multimodalAssetService
              contextQualityServiceForPreview,
              comprehensiveAuditTrailServiceForPreview,
              undefined, // piiDetectionService
              undefined, // piiRedactionService
              undefined, // fieldSecurityService
              undefined, // citationValidationService
              undefined, // promptInjectionDefenseService
              undefined, // ConversationSummarizationService
              undefined, // ConversationContextRetrievalService
              (server as any).contextCacheService,
              (server as any).riskEvaluationService
            );

            placeholderPreviewService = new PlaceholderPreviewService(
              monitoring,
              previewInsightService,
              contextTemplateService,
              documentTemplateService
            );
            server.log.info('✅ Placeholder Preview Service initialized');
          }
        } catch (error) {
          server.log.warn({ err: error }, '⚠️ Placeholder Preview Service initialization failed');
        }

        // Initialize Document Generation Service
        let documentGenerationService: DocumentGenerationService | undefined;
        try {
          if (queueService) {
            documentGenerationService = new DocumentGenerationService(
              monitoring,
              documentTemplateService,
              queueService,
              redis
            );
            server.log.info('✅ Document Generation Service initialized');
          } else {
            server.log.warn('⚠️ Document Generation Service not initialized - Queue Service not available');
          }
        } catch (error) {
          server.log.warn({ err: error }, '⚠️ Document Generation Service initialization failed');
        }

        // Create GenerationJobRepository for health checks
        const { GenerationJobRepository } = await import('../../repositories/generation-job.repository.js');
        const generationJobRepository = new GenerationJobRepository();

        const documentTemplateController = new DocumentTemplateController(
          documentTemplateService,
          documentGenerationService,
          queueService || undefined,
          generationJobRepository,
          placeholderPreviewService
        );

        await server.register(async (dtServer) => {
          await registerDocumentTemplateRoutes(dtServer, documentTemplateController);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Document Template routes registered');

        // Content Generation Service
        if (unifiedAIClient && aiConnectionService && aiConfigService && insightService && shardRepository && conversionService) {
          const contentGenerationService = new ContentGenerationService(
            monitoring,
            templateService,
            insightService,
            shardRepository,
            conversionService
          );

          const contentGenerationController = new ContentGenerationController(
            contentGenerationService,
            aiConnectionService
          );

          await server.register(async (cgServer) => {
            await registerContentGenerationRoutes(cgServer, contentGenerationController);
          }, { prefix: '/api/v1' });
          server.log.info('✅ Content Generation routes registered');
        } else {
          server.log.warn('⚠️ Content Generation routes not registered - missing dependencies');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Content Generation routes failed to register');
      }
    } else {
      server.log.info('ℹ️ Content Generation feature disabled');
    }

    // Memory routes (AI chat memory management)
    if (redis) {
      try {
        const memoryService = createMemoryContextService(redis, monitoring);
        const memoryController = new MemoryController(memoryService);
        await registerMemoryRoutes(server, memoryController);
        server.log.info('✅ Memory routes registered');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Memory routes failed to register');
      }
    } else {
      server.log.warn('⚠️ Memory routes not registered - Redis not available');
    }

    // Onboarding routes
    const onboardingCosmosClient = cosmosClient || (server as any).cosmos || (server as any).cosmosClient;
    const onboardingCosmosDatabase = cosmosDatabase || (server as any).cosmosDatabase;
    if (onboardingCosmosClient || onboardingCosmosDatabase) {
      try {
        let database;
        if (onboardingCosmosDatabase) {
          database = onboardingCosmosDatabase;
        } else if (onboardingCosmosClient) {
          const { config } = await import('../../config/env.js');
          database = onboardingCosmosClient.database(config.cosmosDb.databaseId);
        }

        if (emailService && database) {
          const onboardingService = new OnboardingService(
            database,
            emailService,
            monitoring
          );
          const onboardingController = new OnboardingController(onboardingService);
          await registerOnboardingRoutes(server, onboardingController);
          server.log.info('✅ Onboarding routes registered');
        } else {
          const missing = [];
          if (!emailService) { missing.push('Email service'); }
          if (!database) { missing.push('Database'); }
          server.log.debug(`ℹ️ Onboarding routes not registered - ${missing.join(' and ')} not available`);
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Onboarding routes failed to register');
      }
    } else {
      server.log.debug('ℹ️ Onboarding routes not registered - Cosmos DB not available');
    }

    server.log.info('✅ Content Routes registration completed');
  } catch (err) {
    server.log.error({ err }, '❌ Content Routes registration failed');
    throw err;
  }
}
