/**
 * Vector Search Routes
 * REST API endpoints for vector search
 */

import type { FastifyInstance } from 'fastify';
import { VectorSearchController } from '../controllers/vector-search.controller.js';
import {
  VectorSearchService,
  ShardRepository,
  AzureOpenAIService,
} from '@castiel/api-core';
import { VectorSearchCacheService } from '../services/vector-search-cache.service.js';
import { ACLService } from '../services/acl.service.js';
import { ACLCacheService } from '../services/acl-cache.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { requireAuth, requireRole } from '../middleware/authorization.js';

/**
 * Register vector search routes
 */
export async function registerVectorSearchRoutes(
  server: FastifyInstance,
  monitoring: IMonitoringProvider,
  cacheService?: any,
  cacheSubscriber?: any
): Promise<void> {
  try {
    // Initialize shard repository (for ACL and Cosmos DB access)
    // Phase 2: Get Phase 2 services from server if available for project scoping
    const redactionService = (server as any).redactionService;
    const auditTrailService = (server as any).auditTrailService;
    
    const shardRepository = new ShardRepository(
      monitoring,
      undefined, // cacheService - not needed here
      undefined, // serviceBusService - not needed here
      redactionService,
      auditTrailService
    );
    
    try {
      await shardRepository.ensureContainer();
    } catch (error) {
      server.log.warn('Failed to ensure Cosmos DB container for vector search - routes will still be registered');
      server.log.warn(error);
    }

    // Get Cosmos DB container from repository
    const container = (shardRepository as any).container;
    if (!container) {
      server.log.warn('Cosmos DB container not available for vector search');
    }

    // Initialize ACL cache service if cache is available
    let aclCacheService: ACLCacheService | null = null;
    if (cacheService && cacheSubscriber) {
      aclCacheService = new ACLCacheService(cacheService, cacheSubscriber, monitoring);
      monitoring.trackEvent('acl-cache-service-initialized');
    }

    // Initialize ACL service
    const aclService = new ACLService(shardRepository, aclCacheService, monitoring);

    // Initialize vector search cache service (optional)
    let vectorSearchCacheService: VectorSearchCacheService | undefined;
    if (cacheService) {
      vectorSearchCacheService = new VectorSearchCacheService(
        cacheService.getClient(),
        monitoring
      );
      monitoring.trackEvent('vector-search-cache-initialized');
    }

    // Initialize Azure OpenAI service
    // Config is added by fastify-plugin - properly typed access
    const serverConfig = (server as any).config as { ai?: { azureOpenAI?: any } } | undefined;
    const aiConfig = serverConfig?.ai?.azureOpenAI || {};

    const azureOpenAIConfig = {
      endpoint: aiConfig.endpoint || process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT_EMBEDDING || '',
      apiKey: aiConfig.apiKey || process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY_EMBEDDING || '',
      deploymentName: aiConfig.deploymentName || process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_NAME_EMBEDDING || 'text-embedding-ada-002',
      apiVersion: aiConfig.apiVersion || process.env.AZURE_OPENAI_API_VERSION || process.env.AZURE_OPENAI_API_VERSION_EMBEDDING || '2024-02-15-preview',
    };

    server.log.info({
      endpoint: azureOpenAIConfig.endpoint,
      deploymentName: azureOpenAIConfig.deploymentName,
      hasApiKey: !!azureOpenAIConfig.apiKey
    }, 'Initializing Azure OpenAI Service for Vector Search');

    if (!azureOpenAIConfig.endpoint || !azureOpenAIConfig.apiKey) {
      server.log.warn('Azure OpenAI not configured - vector search will fail if attempted');
    }

    const azureOpenAIService = new AzureOpenAIService(azureOpenAIConfig, monitoring);

    // Get Phase 2 MetricsShardService from server if available
    const metricsShardService = (server as any).metricsShardService;

    // Initialize vector search service
    // Phase 2: Pass shardRepository for project scoping support
    const vectorSearchService = new VectorSearchService(
      container,
      aclService,
      monitoring,
      azureOpenAIService,
      vectorSearchCacheService,
      undefined, // embeddingTemplateService
      undefined, // shardTypeRepository
      shardRepository, // Phase 2: shardRepository for project scoping
      metricsShardService // Phase 2: MetricsShardService for hit ratio tracking
    );

    // Initialize controller
    // Initialize Vector Search UI Service (optional)
    let vectorSearchUIService: import('../services/vector-search-ui.service.js').VectorSearchUIService | undefined;
    try {
      const cosmos = (server as any).cosmos;
      if (cosmos) {
        const database = cosmos.database((server as any).config?.cosmosDb?.databaseId || process.env.COSMOS_DB_DATABASE_ID || 'castiel');
        const redis = (server as any).redisClient;
        const { VectorSearchUIService } = await import('../services/vector-search-ui.service.js');
        vectorSearchUIService = new VectorSearchUIService(database, redis, monitoring);
        server.log.info('Vector Search UI Service initialized');
      }
    } catch (error) {
      server.log.warn({ error }, 'Vector Search UI Service not initialized - history and saved searches will be unavailable');
    }

    const controller = new VectorSearchController(
      vectorSearchService,
      monitoring,
      vectorSearchCacheService,
      vectorSearchUIService
    );

    // Register routes with authentication middleware


    // POST /api/v1/search/vector - Semantic search
    server.post(
      '/api/v1/search/vector',
      { preHandler: requireAuth() },
      async (request, reply) => controller.semanticSearch(request as any, reply)
    );

    // POST /api/v1/search/hybrid - Hybrid search
    server.post(
      '/api/v1/search/hybrid',
      { preHandler: requireAuth() },
      async (request, reply) => controller.hybridSearch(request as any, reply)
    );

    // POST /api/v1/search/vector/global - Global vector search (Super Admin only)
    server.post(
      '/api/v1/search/vector/global',
      { preHandler: requireAuth() },
      async (request, reply) => controller.globalSearch(request as any, reply)
    );

    // GET /api/v1/search/stats - Get statistics
    server.get(
      '/api/v1/search/stats',
      { preHandler: [requireAuth(), requireRole('admin', 'owner')] },
      async (request, reply) => controller.getStats(request as any, reply)
    );

    if (vectorSearchCacheService) {
      server.log.info('Vector search routes registered (with caching)');
    } else {
      server.log.info('Vector search routes registered (without caching)');
    }
  } catch (error) {
    monitoring.trackException(error as Error, {
      component: 'VectorSearchRoutes',
      operation: 'registerVectorSearchRoutes',
    });
    server.log.error({ error }, 'Failed to register vector search routes');
    throw error;
  }
}
