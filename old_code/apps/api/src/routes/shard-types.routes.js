import { ShardTypesController } from '../controllers/shard-types.controller.js';
/**
 * Register ShardTypes routes
 */
export async function registerShardTypesRoutes(fastify, monitoring, enrichmentService, shardRepository) {
    const controller = new ShardTypesController(monitoring, enrichmentService, shardRepository);
    // Initialize repository
    try {
        await controller.initialize();
    }
    catch (error) {
        fastify.log.warn('Failed to ensure Cosmos DB container for shard types - routes will still be registered');
        fastify.log.warn(error);
    }
    // POST /api/v1/shard-types - Create a new shard type
    fastify.post('/api/v1/shard-types', controller.createShardType);
    // GET /api/v1/shard-types - List shard types with filtering
    fastify.get('/api/v1/shard-types', controller.listShardTypes);
    // GET /api/v1/shard-types/:id - Get a single shard type
    fastify.get('/api/v1/shard-types/:id', controller.getShardType);
    // PUT /api/v1/shard-types/:id - Update a shard type
    fastify.put('/api/v1/shard-types/:id', controller.updateShardType);
    // DELETE /api/v1/shard-types/:id - Delete a shard type
    fastify.delete('/api/v1/shard-types/:id', controller.deleteShardType);
    // GET /api/v1/shard-types/:id/children - Get child types
    fastify.get('/api/v1/shard-types/:id/children', controller.getChildTypes);
    // GET /api/v1/shard-types/:id/usage - Get usage statistics
    fastify.get('/api/v1/shard-types/:id/usage', controller.getUsageStats);
    // POST /api/v1/shard-types/validate-schema - Validate JSON schema
    fastify.post('/api/v1/shard-types/validate-schema', controller.validateSchemaEndpoint);
    // POST /api/v1/shard-types/:id/clone - Clone a shard type
    fastify.post('/api/v1/shard-types/:id/clone', controller.cloneShardType);
    // GET /api/v1/shard-types/:id/relationships - Get shard type with resolved relationships
    fastify.get('/api/v1/shard-types/:id/relationships', controller.getWithRelationships);
    // POST /api/v1/shard-types/:id/enrich - Trigger enrichment for a shard type
    fastify.post('/api/v1/shard-types/:id/enrich', controller.triggerEnrichment);
    fastify.log.info('✅ ShardTypes routes registered');
    monitoring.trackEvent('shard-types-routes.registered');
}
//# sourceMappingURL=shard-types.routes.js.map