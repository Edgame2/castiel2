/**
 * Vector Search Routes
 * REST API endpoints for vector search
 */
import { VectorSearchController } from '../controllers/vector-search.controller.js';
import { VectorSearchService } from '../services/vector-search.service.js';
import { VectorSearchCacheService } from '../services/vector-search-cache.service.js';
import { ACLService } from '../services/acl.service.js';
import { ACLCacheService } from '../services/acl-cache.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import { AzureOpenAIService } from '../services/azure-openai.service.js';
/**
 * Register vector search routes
 */
export async function registerVectorSearchRoutes(server, monitoring, cacheService, cacheSubscriber) {
    try {
        // Initialize shard repository (for ACL and Cosmos DB access)
        // Phase 2: Get Phase 2 services from server if available for project scoping
        const redactionService = server.redactionService;
        const auditTrailService = server.auditTrailService;
        const shardRepository = new ShardRepository(monitoring, undefined, // cacheService - not needed here
        undefined, // serviceBusService - not needed here
        redactionService, auditTrailService);
        try {
            await shardRepository.ensureContainer();
        }
        catch (error) {
            server.log.warn('Failed to ensure Cosmos DB container for vector search - routes will still be registered');
            server.log.warn(error);
        }
        // Get Cosmos DB container from repository
        const container = shardRepository.container;
        if (!container) {
            server.log.warn('Cosmos DB container not available for vector search');
        }
        // Initialize ACL cache service if cache is available
        let aclCacheService = null;
        if (cacheService && cacheSubscriber) {
            aclCacheService = new ACLCacheService(cacheService, cacheSubscriber, monitoring);
            monitoring.trackEvent('acl-cache-service-initialized');
        }
        // Initialize ACL service
        const aclService = new ACLService(shardRepository, aclCacheService, monitoring);
        // Initialize vector search cache service (optional)
        let vectorSearchCacheService;
        if (cacheService) {
            vectorSearchCacheService = new VectorSearchCacheService(cacheService.getClient(), monitoring);
            monitoring.trackEvent('vector-search-cache-initialized');
        }
        // Initialize Azure OpenAI service
        // Config is added by fastify-plugin - properly typed access
        const serverConfig = server.config;
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
        const metricsShardService = server.metricsShardService;
        // Initialize vector search service
        // Phase 2: Pass shardRepository for project scoping support
        const vectorSearchService = new VectorSearchService(container, aclService, monitoring, azureOpenAIService, vectorSearchCacheService, undefined, // embeddingTemplateService
        undefined, // shardTypeRepository
        shardRepository, // Phase 2: shardRepository for project scoping
        metricsShardService // Phase 2: MetricsShardService for hit ratio tracking
        );
        // Initialize controller
        // Initialize Vector Search UI Service (optional)
        let vectorSearchUIService;
        try {
            const cosmos = server.cosmos;
            if (cosmos) {
                const database = cosmos.database(server.config?.cosmosDb?.databaseId || process.env.COSMOS_DB_DATABASE_ID || 'castiel');
                const redis = server.redisClient;
                const { VectorSearchUIService } = await import('../services/vector-search-ui.service.js');
                vectorSearchUIService = new VectorSearchUIService(database, redis, monitoring);
                server.log.info('Vector Search UI Service initialized');
            }
        }
        catch (error) {
            server.log.warn({ error }, 'Vector Search UI Service not initialized - history and saved searches will be unavailable');
        }
        const controller = new VectorSearchController(vectorSearchService, monitoring, vectorSearchCacheService, vectorSearchUIService);
        // Register routes with authentication middleware
        // POST /api/v1/search/vector - Semantic search
        server.post('/api/v1/search/vector', { preHandler: requireAuth() }, async (request, reply) => controller.semanticSearch(request, reply));
        // POST /api/v1/search/hybrid - Hybrid search
        server.post('/api/v1/search/hybrid', { preHandler: requireAuth() }, async (request, reply) => controller.hybridSearch(request, reply));
        // POST /api/v1/search/vector/global - Global vector search (Super Admin only)
        server.post('/api/v1/search/vector/global', { preHandler: requireAuth() }, async (request, reply) => controller.globalSearch(request, reply));
        // GET /api/v1/search/stats - Get statistics
        server.get('/api/v1/search/stats', { preHandler: [requireAuth(), requireRole('admin', 'owner')] }, async (request, reply) => controller.getStats(request, reply));
        if (vectorSearchCacheService) {
            server.log.info('Vector search routes registered (with caching)');
        }
        else {
            server.log.info('Vector search routes registered (without caching)');
        }
    }
    catch (error) {
        monitoring.trackException(error, {
            component: 'VectorSearchRoutes',
            operation: 'registerVectorSearchRoutes',
        });
        server.log.error({ error }, 'Failed to register vector search routes');
        throw error;
    }
}
//# sourceMappingURL=vector-search.routes.js.map