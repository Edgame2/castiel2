/**
 * Project Resolver Routes (Phase 2)
 *
 * API endpoints for project context resolution and relationship management
 */
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardCacheService } from '../services/shard-cache.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { UnauthorizedError } from '../middleware/error-handler.js';
import { v4 as uuidv4 } from 'uuid';
/**
 * Register Project Resolver routes
 */
export async function registerProjectResolverRoutes(fastify, monitoring, cacheService, cacheSubscriber, contextAssemblyService) {
    if (!cacheService) {
        fastify.log.warn('Project resolver routes skipped: CacheService not available');
        return;
    }
    if (!cacheSubscriber) {
        fastify.log.warn('Project resolver routes skipped: CacheSubscriberService not available');
        return;
    }
    // Initialize shard cache service
    const shardCacheService = new ShardCacheService(cacheService, cacheSubscriber, monitoring);
    // Get Phase 2 services from server if available
    const redactionService = fastify.redactionService;
    const auditTrailService = fastify.auditTrailService;
    const shardRepository = new ShardRepository(monitoring, shardCacheService, undefined, // serviceBusService - not needed here
    redactionService, auditTrailService);
    // Set shard repository on context assembly service
    contextAssemblyService.setShardRepository(shardRepository);
    /**
     * GET /api/v1/projects/:id/context
     * Resolve project context - returns scoped shard set via relationship traversal
     */
    fastify.get('/api/v1/projects/:id/context', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const req = request;
        if (!req.user || !req.user.tenantId) {
            throw new UnauthorizedError('Authentication required');
        }
        const projectId = request.params.id;
        const tenantId = req.user.tenantId;
        const options = {
            includeExternal: request.query.includeExternal === 'true',
            minConfidence: request.query.minConfidence ? parseFloat(request.query.minConfidence) : undefined,
            maxShards: request.query.maxShards ? parseInt(request.query.maxShards, 10) : undefined,
            limit: request.query.limit ? parseInt(request.query.limit, 10) : undefined,
            offset: request.query.offset ? parseInt(request.query.offset, 10) : undefined,
        };
        try {
            const result = await contextAssemblyService.resolveProjectContext(projectId, tenantId, options);
            return reply.status(200).send({
                project: result.project,
                linkedShards: result.linkedShards,
                totalCount: result.totalCount,
                hasMore: result.hasMore,
                pagination: {
                    limit: options.limit || 100,
                    offset: options.offset || 0,
                },
            });
        }
        catch (error) {
            fastify.log.error(`Error resolving project context: ${error.message}`);
            return reply.status(error.statusCode || 500).send({
                error: error.message || 'Internal server error',
            });
        }
    });
    /**
     * PATCH /api/v1/projects/:id/internal-relationships
     * Add or update internal relationships for a project
     */
    fastify.patch('/api/v1/projects/:id/internal-relationships', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const req = request;
        if (!req.user || !req.user.tenantId) {
            throw new UnauthorizedError('Authentication required');
        }
        const projectId = request.params.id;
        const tenantId = req.user.tenantId;
        const { relationships } = request.body;
        if (!Array.isArray(relationships) || relationships.length === 0) {
            return reply.status(400).send({
                error: 'relationships array is required and must not be empty',
            });
        }
        try {
            // Get project shard
            const project = await shardRepository.findById(projectId, tenantId);
            if (!project || project.shardTypeId !== 'c_project') {
                return reply.status(404).send({
                    error: 'Project not found',
                });
            }
            // Build internal relationships
            const internalRelationships = relationships.map(rel => ({
                shardId: rel.shardId,
                shardTypeId: rel.shardTypeId || '',
                shardTypeName: rel.shardTypeName,
                shardName: rel.shardName || '',
                createdAt: new Date(),
                metadata: rel.metadata,
            }));
            // Merge with existing relationships
            const existingRelationships = project.internal_relationships || [];
            const mergedRelationships = [...existingRelationships];
            // Update or add relationships
            for (const newRel of internalRelationships) {
                const existingIndex = mergedRelationships.findIndex(r => r.shardId === newRel.shardId);
                if (existingIndex >= 0) {
                    mergedRelationships[existingIndex] = newRel;
                }
                else {
                    mergedRelationships.push(newRel);
                }
            }
            // Update project shard
            await shardRepository.update(projectId, tenantId, {
                internal_relationships: mergedRelationships,
            });
            return reply.status(200).send({
                message: 'Internal relationships updated',
                relationshipCount: mergedRelationships.length,
            });
        }
        catch (error) {
            fastify.log.error(`Error updating internal relationships: ${error.message}`);
            return reply.status(error.statusCode || 500).send({
                error: error.message || 'Internal server error',
            });
        }
    });
    /**
     * PATCH /api/v1/projects/:id/external-relationships
     * Add or update external relationships for a project
     */
    fastify.patch('/api/v1/projects/:id/external-relationships', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const req = request;
        if (!req.user || !req.user.tenantId) {
            throw new UnauthorizedError('Authentication required');
        }
        const projectId = request.params.id;
        const tenantId = req.user.tenantId;
        const { relationships } = request.body;
        if (!Array.isArray(relationships) || relationships.length === 0) {
            return reply.status(400).send({
                error: 'relationships array is required and must not be empty',
            });
        }
        try {
            // Get project shard
            const project = await shardRepository.findById(projectId, tenantId);
            if (!project || project.shardTypeId !== 'c_project') {
                return reply.status(404).send({
                    error: 'Project not found',
                });
            }
            // Build external relationships
            const externalRelationships = relationships.map(rel => ({
                id: uuidv4(),
                system: rel.system,
                systemType: rel.systemType,
                externalId: rel.externalId,
                label: rel.label,
                syncStatus: (rel.syncStatus) || 'synced',
                syncDirection: (rel.syncDirection),
                lastSyncedAt: new Date(),
                createdAt: new Date(),
                createdBy: req.user.id || 'system',
                metadata: rel.metadata,
            }));
            // Merge with existing relationships
            const existingRelationships = project.external_relationships || [];
            const mergedRelationships = [...existingRelationships];
            // Update or add relationships
            for (const newRel of externalRelationships) {
                const existingIndex = mergedRelationships.findIndex(r => r.system === newRel.system && r.externalId === newRel.externalId);
                if (existingIndex >= 0) {
                    mergedRelationships[existingIndex] = newRel;
                }
                else {
                    mergedRelationships.push(newRel);
                }
            }
            // Update project shard
            await shardRepository.update(projectId, tenantId, {
                external_relationships: mergedRelationships,
            });
            return reply.status(200).send({
                message: 'External relationships updated',
                relationshipCount: mergedRelationships.length,
            });
        }
        catch (error) {
            fastify.log.error(`Error updating external relationships: ${error.message}`);
            return reply.status(error.statusCode || 500).send({
                error: error.message || 'Internal server error',
            });
        }
    });
    /**
     * GET /api/v1/projects/:id/insights
     * Get project insights with provenance
     */
    fastify.get('/api/v1/projects/:id/insights', {
        preHandler: [authenticate],
    }, async (request, reply) => {
        const req = request;
        if (!req.user || !req.user.tenantId) {
            throw new UnauthorizedError('Authentication required');
        }
        const projectId = request.params.id;
        const tenantId = req.user.tenantId;
        try {
            // Get project context to find linked shards
            const context = await contextAssemblyService.resolveProjectContext(projectId, tenantId, { includeExternal: false });
            // Find insight shards (c_insight_kpi) linked to project
            const insightShards = context.linkedShards.filter(shard => shard.shardTypeId === 'c_insight_kpi');
            // Filter insights with provenance (must have internal_relationships)
            const insightsWithProvenance = insightShards.filter(shard => {
                return shard.internal_relationships && shard.internal_relationships.length > 0;
            });
            // Build response with provenance references
            const insights = insightsWithProvenance.map(shard => ({
                id: shard.id,
                shardTypeId: shard.shardTypeId,
                structuredData: shard.structuredData,
                provenance: shard.internal_relationships?.map(rel => ({
                    shardId: rel.shardId,
                    shardTypeId: rel.shardTypeId,
                    shardName: rel.shardName,
                    confidence: rel.metadata?.confidence,
                })) || [],
                createdAt: shard.createdAt,
                updatedAt: shard.updatedAt,
            }));
            return reply.status(200).send({
                projectId,
                insights,
                totalCount: insights.length,
                filteredCount: insightShards.length - insights.length, // Insights without provenance
            });
        }
        catch (error) {
            fastify.log.error(`Error getting project insights: ${error.message}`);
            return reply.status(error.statusCode || 500).send({
                error: error.message || 'Internal server error',
            });
        }
    });
}
//# sourceMappingURL=project-resolver.routes.js.map