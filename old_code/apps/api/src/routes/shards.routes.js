import { ShardsController } from '../controllers/shards.controller.js';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { QueueService } from '../services/queue.service.js';
import { config } from '../config/env.js';
/**
 * Register Shards routes
 */
export async function registerShardsRoutes(fastify, monitoring, cacheService, cacheSubscriber) {
    // Initialize shard cache service
    const shardCacheService = new ShardCacheService(cacheService, cacheSubscriber, monitoring);
    // Get event service from server if available
    const eventService = fastify.shardEventService;
    // Initialize Queue service (BullMQ) if configured
    let serviceBusService;
    try {
        const hasRedis = fastify.config?.redis?.host || process.env.REDIS_URL;
        fastify.log.debug({
            hasFastifyRedis: !!fastify.config?.redis,
            hasEnvRedis: !!process.env.REDIS_URL,
        }, 'Checking Redis configuration for queue service');
        if (hasRedis) {
            serviceBusService = new QueueService(monitoring);
            fastify.log.info('✅ Queue service (BullMQ) initialized for embedding jobs');
            monitoring.trackEvent('shards-routes.queue-service-initialized', {
                hasRedis: true,
            });
        }
        else {
            fastify.log.warn('⚠️  Redis not configured - embedding jobs will not be enqueued');
            monitoring.trackEvent('shards-routes.queue-service-unavailable', {
                reason: 'Redis not configured',
            });
        }
    }
    catch (error) {
        fastify.log.warn('⚠️  Queue service initialization failed - embedding jobs will not be enqueued');
        fastify.log.warn(error);
        monitoring.trackException(error, {
            context: 'shards-routes.queue-service-initialization',
        });
    }
    // Get Phase 2 services from server if available
    const redactionService = fastify.redactionService;
    const auditTrailService = fastify.auditTrailService;
    // Get or initialize RiskEvaluationService if dependencies are available (for automatic risk evaluation)
    let riskEvaluationService = fastify.riskEvaluationService;
    // Try to initialize if not already available and dependencies exist
    if (!riskEvaluationService) {
        try {
            const shardRepository = fastify.shardRepository;
            const shardTypeRepository = fastify.shardTypeRepository;
            const relationshipService = fastify.relationshipService;
            const vectorSearchService = fastify.vectorSearchService;
            const insightService = fastify.insightService;
            const queueService = serviceBusService; // Use the queue service we just initialized
            // Check if all required dependencies are available
            if (shardRepository && shardTypeRepository && relationshipService && vectorSearchService && insightService) {
                const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
                const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
                const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
                riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService, queueService || undefined);
                // Store on server for future use
                fastify.riskEvaluationService = riskEvaluationService;
                fastify.log.info('✅ RiskEvaluationService initialized in shards routes');
            }
            else {
                fastify.log.debug('ℹ️ RiskEvaluationService not initialized - some dependencies missing (will be available after risk analysis routes register)');
            }
        }
        catch (error) {
            // Log but don't fail - risk evaluation is optional
            fastify.log.warn('⚠️ Failed to initialize RiskEvaluationService in shards routes (will be available after risk analysis routes register)');
            fastify.log.warn(error);
            monitoring.trackException(error, {
                context: 'shards-routes.riskEvaluationService-initialization',
            });
        }
    }
    const controller = new ShardsController(monitoring, shardCacheService, eventService, true, serviceBusService, redactionService, auditTrailService, riskEvaluationService, // Optional - for automatic risk evaluation on opportunity create/update
    fastify // Pass server instance for lazy service retrieval
    );
    // Initialize repositories
    try {
        await controller.initialize();
    }
    catch (error) {
        fastify.log.warn('Failed to ensure Cosmos DB container for shards - routes will still be registered');
        fastify.log.warn(error);
    }
    // POST /api/v1/shards - Create a new shard
    fastify.post('/api/v1/shards', controller.createShard);
    // GET /api/v1/shards - List shards with filtering
    fastify.get('/api/v1/shards', controller.listShards);
    // GET /api/v1/shards/vector-search - Vector search adapter (must be before /:id route)
    // Converts GET query params to POST body format for /api/v1/search/vector
    fastify.get('/api/v1/shards/vector-search', async (request, reply) => {
        const { q, limit, shardTypeId, minScore } = request.query;
        const req = request;
        if (!q || typeof q !== 'string') {
            return reply.status(400).send({ error: 'Query parameter "q" is required' });
        }
        if (!req.user || !req.user.tenantId) {
            return reply.status(401).send({ error: 'Authentication required' });
        }
        // Build filter object
        const filter = { tenantId: req.user.tenantId };
        if (shardTypeId) {
            filter.shardTypeId = shardTypeId;
        }
        // Convert to vector search request format
        const vectorSearchRequest = {
            query: q,
            filter,
            topK: limit ? parseInt(limit, 10) : 10,
            minScore: minScore ? parseFloat(minScore) : undefined,
        };
        // Forward to vector search endpoint
        // Use config public URL or construct from request
        const nodeEnv = config.nodeEnv || 'development';
        const apiBaseUrl = config.api?.publicUrl ||
            (nodeEnv === 'production'
                ? (() => { throw new Error('PUBLIC_API_BASE_URL is required in production'); })()
                : `http://localhost:${config.port || 3001}`);
        try {
            const response = await fetch(`${apiBaseUrl}/api/v1/search/vector`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': request.headers.authorization || '',
                },
                body: JSON.stringify(vectorSearchRequest),
            });
            const data = await response.json();
            if (!response.ok) {
                return reply.status(response.status).send(data);
            }
            // Transform response to match expected format
            return reply.status(200).send({
                items: data.results || [],
                total: data.results?.length || 0,
                page: 1,
                pageSize: vectorSearchRequest.topK,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(500).send({ error: 'Vector search failed', details: errorMessage });
        }
    });
    // GET /api/v1/shards/:id - Get a single shard
    fastify.get('/api/v1/shards/:id', controller.getShard);
    // PUT /api/v1/shards/:id - Full update
    fastify.put('/api/v1/shards/:id', controller.updateShard);
    // PATCH /api/v1/shards/:id - Partial update
    fastify.patch('/api/v1/shards/:id', controller.patchShard);
    // DELETE /api/v1/shards/:id - Delete shard
    fastify.delete('/api/v1/shards/:id', controller.deleteShard);
    fastify.log.info('✅ Shards routes registered');
    monitoring.trackEvent('shards-routes.registered');
}
//# sourceMappingURL=shards.routes.js.map