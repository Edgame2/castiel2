/**
 * ACL Routes
 *
 * Registers all ACL management endpoints for access control operations.
 */
import { ACLController } from '../controllers/acl.controller.js';
import { ACLService } from '../services/acl.service.js';
import { ACLCacheService } from '../services/acl-cache.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { requireAuth } from '../middleware/authorization.js';
/**
 * Register ACL routes
 */
export async function registerACLRoutes(server, monitoring, cacheService, cacheSubscriber) {
    // Initialize ACL cache service if cache is available
    let aclCacheService = null;
    if (cacheService && cacheSubscriber) {
        aclCacheService = new ACLCacheService(cacheService, cacheSubscriber, monitoring);
        monitoring.trackEvent('acl-cache-service-initialized');
    }
    else {
        monitoring.trackEvent('acl-cache-service-unavailable', {
            reason: 'Cache services not provided',
        });
    }
    // Initialize shard repository
    const shardRepository = new ShardRepository(monitoring);
    try {
        await shardRepository.ensureContainer();
    }
    catch (error) {
        server.log.warn('Failed to ensure Cosmos DB container for ACL - routes will still be registered');
        server.log.warn(error);
    }
    // Initialize ACL service
    const aclService = new ACLService(shardRepository, aclCacheService, monitoring);
    // Initialize controller
    const controller = new ACLController(aclService, monitoring);
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️ ACL routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // Grant permissions to a user or role
    server.post('/api/v1/acl/grant', { onRequest: authGuards }, async (request, reply) => {
        return controller.grantPermission(request, reply);
    });
    // Revoke permissions from a user or role
    server.post('/api/v1/acl/revoke', { onRequest: authGuards }, async (request, reply) => {
        return controller.revokePermission(request, reply);
    });
    // Update ACL for a shard (add/remove entries)
    server.put('/api/v1/acl/:shardId', { onRequest: authGuards }, async (request, reply) => {
        return controller.updateACL(request, reply);
    });
    // Get user permissions for a shard
    server.get('/api/v1/acl/:shardId/permissions', { onRequest: authGuards }, async (request, reply) => {
        return controller.getUserPermissions(request, reply);
    });
    // Check if user has permission on a shard
    server.post('/api/v1/acl/check', { onRequest: authGuards }, async (request, reply) => {
        return controller.checkPermission(request, reply);
    });
    // Batch check permissions for multiple shards
    server.post('/api/v1/acl/batch-check', { onRequest: authGuards }, async (request, reply) => {
        return controller.batchCheckPermissions(request, reply);
    });
    // Get ACL statistics (admin only)
    server.get('/api/v1/acl/stats', { onRequest: authGuards }, async (request, reply) => {
        return controller.getStats(request, reply);
    });
    // Invalidate ACL cache for a shard (admin only)
    server.post('/api/v1/acl/:shardId/invalidate-cache', { onRequest: authGuards }, async (request, reply) => {
        return controller.invalidateShardCache(request, reply);
    });
    monitoring.trackEvent('acl-routes-registered', {
        cacheEnabled: aclCacheService !== null,
    });
}
//# sourceMappingURL=acl.routes.js.map