/**
 * Data Routes Registration
 * Registers all data-related routes (shards, relationships, vector search, etc.)
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { getRouteRegistrationTracker } from '../../utils/route-registration-tracker.js';
import { registerShardsRoutes } from '../shards.routes.js';
import { registerShardTypesRoutes } from '../shard-types.routes.js';
import { registerShardBulkRoutes } from '../shard-bulk.routes.js';
import { registerACLRoutes } from '../acl.routes.js';
import { registerRevisionsRoutes } from '../revisions.routes.js';
import { registerVectorSearchRoutes } from '../vector-search.routes.js';
import { registerEmbeddingRoutes } from '../embedding.routes.js';
import { registerEmbeddingJobRoutes } from '../embedding-jobs.routes.js';
import { registerCollaborationRoutes } from '../collaboration.routes.js';
import { registerCollaborativeInsightsRoutes } from '../collaborative-insights.routes.js';
import { shardRelationshipRoutes, shardRelationshipSubRoutes } from '../shard-relationship.routes.js';
import { contextTemplateRoutes } from '../context-template.routes.js';
import { registerProjectResolverRoutes } from '../project-resolver.routes.js';
import {
  ShardRepository,
  ShardTypeRepository,
} from '@castiel/api-core';
import { ShardBulkController } from '../../controllers/shard-bulk.controller.js';

export interface DataRoutesDependencies {
  monitoring: IMonitoringProvider;
  shardRepository: any;
  shardTypeRepository: any;
  relationshipService: any;
  cacheService?: any;
  cacheSubscriber?: any;
  shardCacheService?: any;
  vectorSearchService?: any;
  embeddingTemplateService?: any;
  embeddingService?: any;
  shardEmbeddingService?: any;
  aclService?: any;
  redis?: any;
}

/**
 * Register data-related routes
 */
export async function registerDataRoutes(
  server: FastifyInstance,
  dependencies: DataRoutesDependencies
): Promise<void> {
  const tracker = getRouteRegistrationTracker();
  const {
    monitoring,
    shardRepository,
    shardTypeRepository,
    relationshipService,
    cacheService,
    cacheSubscriber,
    shardCacheService,
    vectorSearchService,
    embeddingTemplateService,
    embeddingService,
    shardEmbeddingService,
    aclService,
    redis,
  } = dependencies;

  try {
    // ShardTypes API routes
    await registerShardTypesRoutes(server, monitoring, undefined, shardRepository);
    server.log.info('✅ ShardTypes routes registered');
    tracker.record('ShardTypes', true, {
      prefix: '/api/v1',
      dependencies: ['ShardTypeRepository', 'CosmosDB']
    });

    // Shards API routes (with caching)
    if (cacheService && cacheSubscriber) {
      await registerShardsRoutes(server, monitoring, cacheService, cacheSubscriber);
      server.log.info('✅ Shards routes registered (with caching)');
      tracker.record('Shards', true, {
        prefix: '/api/v1',
        dependencies: ['ShardRepository', 'CacheService', 'CosmosDB']
      });

      // Shard Bulk Operations routes
      const eventService = (server as FastifyInstance & { shardEventService?: unknown }).shardEventService;
      const bulkController = new ShardBulkController(shardRepository, eventService);
      registerShardBulkRoutes(server, bulkController);
      server.log.info('✅ Shard bulk routes registered');
      tracker.record('Shard Bulk', true, {
        prefix: '/api/v1',
        dependencies: ['ShardRepository', 'CacheService', 'EventService']
      });

      // Collaboration/Y.js routes
      await registerCollaborationRoutes(server, monitoring, shardRepository);
      server.log.info('✅ Collaboration routes registered');
      tracker.record('Collaboration', true, {
        prefix: '/api/v1',
        dependencies: ['ShardRepository', 'CacheService', 'CosmosDB']
      });

      // Collaborative Insights routes
      try {
        const { createCollaborativeInsightsService } = await import('../../services/collaborative-insights.service.js');
        const { CollaborativeInsightsController } = await import('../../controllers/collaborative-insights.controller.js');
        const { CollaborativeInsightsRepository } = await import('../../repositories/collaborative-insights.repository.js');

        const cosmosClient = (server as any).cosmos as import('@azure/cosmos').CosmosClient | undefined;
        const databaseId = (server as any).cosmosDatabase?.id as string | undefined;

        if (cosmosClient && databaseId) {
          const configurationService = (server as any).configurationService;
          const containerId = configurationService
            ? (configurationService.getValue('cosmosDb.containers.collaborativeInsights', 'collaborative-insights') || 'collaborative-insights')
            : (process.env.COSMOS_DB_COLLABORATION_CONTAINER || 'collaborative-insights');
          await CollaborativeInsightsRepository.ensureContainer(cosmosClient, databaseId, containerId);
          const collaborativeInsightsRepository = new CollaborativeInsightsRepository(cosmosClient, databaseId, containerId);

          const collaborativeInsightsService = createCollaborativeInsightsService(
            collaborativeInsightsRepository,
            redis || null,
            monitoring
          );
          const collaborativeInsightsController = new CollaborativeInsightsController(collaborativeInsightsService);

          await registerCollaborativeInsightsRoutes(server, collaborativeInsightsController);
          server.log.info('✅ Collaborative Insights routes registered (with Cosmos DB + Redis cache)');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Collaborative Insights routes failed to initialize');
      }

      // Shard Relationship routes
      await server.register(shardRelationshipRoutes, {
        prefix: '/api/v1/relationships',
        monitoring,
        shardRepository,
      });
      await server.register(shardRelationshipSubRoutes, {
        prefix: '/api/v1/shards',
        monitoring,
        shardRepository,
      });
      server.log.info('✅ Shard relationship routes registered');

      // Context Template / AI routes
      const serverRedis = (server as any).cache as import('ioredis').Redis | undefined;
      await server.register(contextTemplateRoutes, {
        aclService: aclService,
        prefix: '/api/v1/ai',
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        redis: serverRedis || redis || undefined,
      });
      server.log.info('✅ Context template routes registered');

      // Also register templates route at root level for backward compatibility
      await server.register(async (rootServer) => {
        const authDecorator = (server as any).authenticate;
        const tokenValidationCache = (server as any).tokenValidationCache;

        if (authDecorator) {
          rootServer.addHook('onRequest', async (request, reply) => {
            if (request.url.startsWith('/templates') || request.url.startsWith('/context')) {
              await authDecorator(request, reply);
            }
          });
        }

        await rootServer.register(contextTemplateRoutes, {
          aclService: aclService,
          monitoring,
          shardRepository,
          shardTypeRepository,
          relationshipService,
          redis: serverRedis || redis || undefined,
        });
      });
      server.log.info('✅ Root-level template routes registered');

      // Phase 2: Project Resolver routes
      try {
        const { ContextAssemblyService } = await import('../../services/ai-context-assembly.service.js');
        const { CosmosDBService } = await import('../../services/cosmos-db.service.js');
        const { CacheService } = await import('../../services/cache.service.js');
        const { ShardLinkingService } = await import('../../services/shard-linking.service.js');
        const { ProjectActivityService } = await import('../../services/project-activity.service.js');
        const { PerformanceMonitoringService } = await import('../../services/performance-monitoring.service.js');

        const cosmosDB = new CosmosDBService();
        const localRedis = redis || undefined;
        const cacheService = localRedis ? new CacheService(localRedis, monitoring) : null;

        const { TenantProjectConfigService } = await import('../../services/tenant-project-config.service.js');
        const tenantProjectConfigService = new TenantProjectConfigService(cosmosDB, cacheService, monitoring);
        const shardLinkingService = new ShardLinkingService(shardRepository, monitoring);
        const projectActivityService = new ProjectActivityService(monitoring, shardRepository);
        const performanceMonitoring = new PerformanceMonitoringService(monitoring);

        let contextAssemblyService: any = undefined;
        if (cacheService && vectorSearchService) {
          contextAssemblyService = new ContextAssemblyService(
            cosmosDB,
            cacheService,
            vectorSearchService,
            shardLinkingService,
            projectActivityService,
            performanceMonitoring,
            monitoring
          );
          const aclServiceForContextAssembly = aclService;
          if (aclServiceForContextAssembly) {
            contextAssemblyService.setACLService(aclServiceForContextAssembly);
          }
          (server as any).contextAssemblyService = contextAssemblyService;
        }

        if (contextAssemblyService) {
          await registerProjectResolverRoutes(
            server,
            monitoring,
            cacheService,
            cacheSubscriber || null,
            contextAssemblyService
          );
          server.log.info('✅ Project resolver routes registered (Phase 2)');
        } else {
          server.log.warn('⚠️ Project resolver routes skipped - ContextAssemblyService not available');
          tracker.record('Project Resolver', false, {
            prefix: '/api/v1',
            reason: 'ContextAssemblyService not available',
            dependencies: ['ContextAssemblyService']
          });
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Project resolver routes failed to register');
        tracker.record('Project Resolver', false, {
          prefix: '/api/v1',
          reason: err instanceof Error ? err.message : 'Registration failed',
          dependencies: ['ContextAssemblyService']
        });
      }
    } else {
      server.log.warn('⚠️  Shards routes not registered - cache services not available');
      tracker.record('Shards', false, {
        prefix: '/api/v1',
        reason: 'Cache services not available',
        dependencies: ['CacheService']
      });
    }

    // ACL API routes (with caching)
    if (cacheService && cacheSubscriber) {
      await registerACLRoutes(server, monitoring, cacheService, cacheSubscriber);
      server.log.info('✅ ACL routes registered (with caching)');
    } else {
      await registerACLRoutes(server, monitoring);
      server.log.info('✅ ACL routes registered (without caching)');
    }

    // Revisions API routes (no caching - always fetch fresh)
    if (cacheService && cacheSubscriber) {
      await registerRevisionsRoutes(server, monitoring, cacheService, cacheSubscriber);
      server.log.info('✅ Revisions routes registered (with ACL and cache for shards)');
    } else {
      await registerRevisionsRoutes(server, monitoring);
      server.log.info('✅ Revisions routes registered (without caching)');
    }

    // Vector Search API routes (with caching)
    if (cacheService && cacheSubscriber) {
      await registerVectorSearchRoutes(server, monitoring, cacheService, cacheSubscriber);
      server.log.info('✅ Vector search routes registered (with caching)');
    } else {
      await registerVectorSearchRoutes(server, monitoring);
      server.log.info('✅ Vector search routes registered (without caching)');
    }

    // Embedding Management API routes
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
    } else {
      server.log.debug('ℹ️ Embedding routes not registered - ShardEmbeddingService not available');
    }

    server.log.info('✅ Data Routes registration completed');
  } catch (err) {
    server.log.error({ err }, '❌ Data Routes registration failed');
    throw err;
  }
}
