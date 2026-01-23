/**
 * Revisions Routes
 *
 * Registers all revision management endpoints for shards.
 */
import { RevisionsController } from '../controllers/revisions.controller.js';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { ACLService } from '../services/acl.service.js';
import { ACLCacheService } from '../services/acl-cache.service.js';
import { requireAuth } from '../middleware/authorization.js';
/**
 * Register revision routes
 */
export async function registerRevisionsRoutes(server, monitoring, cacheService, cacheSubscriber) {
    // Initialize repositories
    const revisionRepository = new RevisionRepository(monitoring);
    const shardRepository = new ShardRepository(monitoring);
    try {
        await revisionRepository.ensureContainer();
        await shardRepository.ensureContainer();
    }
    catch (error) {
        server.log.warn('Failed to ensure Cosmos DB containers for revisions - routes will still be registered');
        server.log.warn(error);
    }
    // Initialize cache service if available
    let shardCacheService = null;
    if (cacheService && cacheSubscriber) {
        shardCacheService = new ShardCacheService(cacheService, cacheSubscriber, monitoring);
    }
    // Initialize ACL cache service if available
    let aclCacheService = null;
    if (cacheService && cacheSubscriber) {
        aclCacheService = new ACLCacheService(cacheService, cacheSubscriber, monitoring);
    }
    // Initialize ACL service
    const aclService = new ACLService(shardRepository, aclCacheService, monitoring);
    // Initialize controller
    const controller = new RevisionsController(revisionRepository, shardRepository, shardCacheService, aclService, monitoring);
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️ Revisions routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // List revisions for a shard
    server.get('/api/v1/shards/:shardId/revisions', { onRequest: authGuards }, async (request, reply) => {
        return controller.listRevisions(request, reply);
    });
    // Get a specific revision by number
    server.get('/api/v1/shards/:shardId/revisions/:revisionNumber', { onRequest: authGuards }, async (request, reply) => {
        return controller.getRevision(request, reply);
    });
    // Get the latest revision
    server.get('/api/v1/shards/:shardId/revisions/latest', { onRequest: authGuards }, async (request, reply) => {
        return controller.getLatestRevision(request, reply);
    });
    // Compare two revisions
    server.post('/api/v1/shards/:shardId/revisions/compare', { onRequest: authGuards }, async (request, reply) => {
        return controller.compareRevisions(request, reply);
    });
    // Revert shard to a specific revision
    server.post('/api/v1/shards/:shardId/revert/:revisionNumber', { onRequest: authGuards }, async (request, reply) => {
        return controller.revertToRevision(request, reply);
    });
    // Get revision statistics
    server.get('/api/v1/shards/:shardId/revisions/stats', { onRequest: authGuards }, async (request, reply) => {
        return controller.getRevisionStats(request, reply);
    });
    monitoring.trackEvent('revisions-routes-registered', {
        cacheEnabled: shardCacheService !== null,
        aclEnabled: true,
    });
}
//# sourceMappingURL=revisions.routes.js.map