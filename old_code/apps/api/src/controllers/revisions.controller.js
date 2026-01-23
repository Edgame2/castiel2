/**
 * Revisions Controller
 *
 * REST API endpoints for managing shard revisions.
 * Provides revision history, comparison, and revert functionality.
 */
import { PermissionLevel } from '../types/shard.types.js';
import { ChangeType, RevisionStorageStrategy } from '../types/revision.types.js';
export class RevisionsController {
    revisionRepository;
    shardRepository;
    shardCacheService;
    aclService;
    monitoring;
    constructor(revisionRepository, shardRepository, shardCacheService, aclService, monitoring) {
        this.revisionRepository = revisionRepository;
        this.shardRepository = shardRepository;
        this.shardCacheService = shardCacheService;
        this.aclService = aclService;
        this.monitoring = monitoring;
    }
    /**
     * GET /api/v1/shards/:shardId/revisions
     * List all revisions for a shard
     */
    async listRevisions(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = request.params;
            const { changeType, changedBy, fromDate, toDate, limit, continuationToken } = request.query;
            // Check READ permission on the shard
            const permissionCheck = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.READ,
            });
            if (!permissionCheck.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to view revisions' });
            }
            // Parse limit
            const parsedLimit = limit ? parseInt(limit, 10) : 50;
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
                return reply.code(400).send({ error: 'Invalid limit (must be between 1 and 100)' });
            }
            // List revisions
            const result = await this.revisionRepository.list({
                filter: {
                    shardId,
                    tenantId: authRequest.user.tenantId,
                    changeType: changeType,
                    changedBy,
                    timestampAfter: fromDate ? new Date(fromDate) : undefined,
                    timestampBefore: toDate ? new Date(toDate) : undefined,
                },
                limit: parsedLimit,
                continuationToken,
            });
            this.monitoring.trackMetric('revisions-list-request', 1, {
                duration: Date.now() - startTime,
                count: result.revisions.length,
            });
            return reply.code(200).send({
                revisions: result.revisions,
                continuationToken: result.continuationToken,
                count: result.revisions.length,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'revisions-list-controller',
                shardId: request.params.shardId,
            });
            return reply.code(500).send({ error: 'Failed to list revisions' });
        }
    }
    /**
     * GET /api/v1/shards/:shardId/revisions/:revisionNumber
     * Get a specific revision by number
     */
    async getRevision(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId, revisionNumber } = request.params;
            // Parse revision number
            const parsedRevisionNumber = parseInt(revisionNumber, 10);
            if (isNaN(parsedRevisionNumber) || parsedRevisionNumber < 1) {
                return reply.code(400).send({ error: 'Invalid revision number' });
            }
            // Check READ permission on the shard
            const permissionCheck = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.READ,
            });
            if (!permissionCheck.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to view revision' });
            }
            // Get revision
            const revision = await this.revisionRepository.findByRevisionNumber(shardId, authRequest.user.tenantId, parsedRevisionNumber);
            if (!revision) {
                return reply.code(404).send({ error: 'Revision not found' });
            }
            this.monitoring.trackMetric('revisions-get-request', 1, {
                duration: Date.now() - startTime,
            });
            return reply.code(200).send(revision);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'revisions-get-controller',
                shardId: request.params.shardId,
                revisionNumber: request.params.revisionNumber,
            });
            return reply.code(500).send({ error: 'Failed to get revision' });
        }
    }
    /**
     * GET /api/v1/shards/:shardId/revisions/latest
     * Get the latest revision for a shard
     */
    async getLatestRevision(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = request.params;
            // Check READ permission on the shard
            const permissionCheck = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.READ,
            });
            if (!permissionCheck.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to view revision' });
            }
            // Get latest revision
            const revision = await this.revisionRepository.getLatestRevision(shardId, authRequest.user.tenantId);
            if (!revision) {
                return reply.code(404).send({ error: 'No revisions found for this shard' });
            }
            this.monitoring.trackMetric('revisions-get-latest-request', 1, {
                duration: Date.now() - startTime,
            });
            return reply.code(200).send(revision);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'revisions-get-latest-controller',
                shardId: request.params.shardId,
            });
            return reply.code(500).send({ error: 'Failed to get latest revision' });
        }
    }
    /**
     * POST /api/v1/shards/:shardId/revisions/compare
     * Compare two revisions
     */
    async compareRevisions(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = request.params;
            const { fromRevisionNumber, toRevisionNumber } = request.body;
            // Validate revision numbers
            if (!fromRevisionNumber || !toRevisionNumber) {
                return reply.code(400).send({
                    error: 'Both fromRevisionNumber and toRevisionNumber are required',
                });
            }
            if (fromRevisionNumber < 1 || toRevisionNumber < 1) {
                return reply.code(400).send({ error: 'Revision numbers must be positive integers' });
            }
            // Check READ permission on the shard
            const permissionCheck = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.READ,
            });
            if (!permissionCheck.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to compare revisions' });
            }
            // Compare revisions
            // First, get the revision IDs
            const fromRevision = await this.revisionRepository.findByRevisionNumber(shardId, authRequest.user.tenantId, fromRevisionNumber);
            const toRevision = await this.revisionRepository.findByRevisionNumber(shardId, authRequest.user.tenantId, toRevisionNumber);
            if (!fromRevision || !toRevision) {
                return reply.code(404).send({ error: 'One or both revisions not found' });
            }
            const comparison = await this.revisionRepository.compareRevisions(fromRevision.id, toRevision.id, authRequest.user.tenantId);
            if (!comparison) {
                return reply.code(404).send({ error: 'One or both revisions not found' });
            }
            this.monitoring.trackMetric('revisions-compare-request', 1, {
                duration: Date.now() - startTime,
                changesCount: comparison.changes.length,
            });
            return reply.code(200).send(comparison);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'revisions-compare-controller',
                shardId: request.params.shardId,
            });
            return reply.code(500).send({ error: 'Failed to compare revisions' });
        }
    }
    /**
     * POST /api/v1/shards/:shardId/revert/:revisionNumber
     * Revert shard to a specific revision
     */
    async revertToRevision(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId, revisionNumber } = request.params;
            // Parse revision number
            const parsedRevisionNumber = parseInt(revisionNumber, 10);
            if (isNaN(parsedRevisionNumber) || parsedRevisionNumber < 1) {
                return reply.code(400).send({ error: 'Invalid revision number' });
            }
            // Check WRITE permission on the shard (revert is a write operation)
            const permissionCheck = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.WRITE,
            });
            if (!permissionCheck.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to revert shard' });
            }
            // Get the target revision
            const targetRevision = await this.revisionRepository.findByRevisionNumber(shardId, authRequest.user.tenantId, parsedRevisionNumber);
            if (!targetRevision) {
                return reply.code(404).send({ error: 'Target revision not found' });
            }
            // Get current shard
            const currentShard = await this.shardRepository.findById(shardId, authRequest.user.tenantId);
            if (!currentShard) {
                return reply.code(404).send({ error: 'Shard not found' });
            }
            // Extract data from target revision
            let revertData;
            if (targetRevision.data.strategy === 'FULL_SNAPSHOT') {
                revertData = targetRevision.data.snapshot;
            }
            else {
                // For delta revisions, we need to reconstruct the full state
                // This is a simplified approach - in production, you'd want to apply all deltas
                return reply.code(400).send({
                    error: 'Cannot revert to delta revision. Please revert to a snapshot revision.',
                });
            }
            if (!revertData) {
                return reply.code(400).send({ error: 'Invalid revision data' });
            }
            // Update shard with reverted data
            const updatedShard = await this.shardRepository.update(shardId, authRequest.user.tenantId, {
                structuredData: revertData.structuredData || currentShard.structuredData,
                unstructuredData: revertData.unstructuredData || currentShard.unstructuredData,
                metadata: revertData.metadata || currentShard.metadata,
            });
            if (!updatedShard) {
                return reply.code(500).send({ error: 'Failed to update shard' });
            }
            // Invalidate cache
            if (this.shardCacheService) {
                await this.shardCacheService.invalidateShardCache(shardId, authRequest.user.tenantId, true);
            }
            // Create a RESTORED revision
            const nextRevisionNumber = await this.revisionRepository.getNextRevisionNumber(shardId, authRequest.user.tenantId);
            await this.revisionRepository.create({
                shardId,
                tenantId: authRequest.user.tenantId,
                revisionNumber: nextRevisionNumber,
                changeType: ChangeType.RESTORED,
                changedBy: authRequest.user.id,
                data: {
                    strategy: RevisionStorageStrategy.FULL_SNAPSHOT,
                    snapshot: {
                        structuredData: updatedShard.structuredData,
                        unstructuredData: updatedShard.unstructuredData,
                        metadata: updatedShard.metadata,
                        status: updatedShard.status,
                    },
                },
                metadata: {
                    changeDescription: `Reverted to revision ${parsedRevisionNumber}`,
                },
            });
            this.monitoring.trackMetric('revisions-revert-request', 1, {
                duration: Date.now() - startTime,
                targetRevisionNumber: parsedRevisionNumber,
            });
            return reply.code(200).send({
                success: true,
                message: `Successfully reverted to revision ${parsedRevisionNumber}`,
                shard: updatedShard,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'revisions-revert-controller',
                shardId: request.params.shardId,
                revisionNumber: request.params.revisionNumber,
            });
            return reply.code(500).send({ error: 'Failed to revert to revision' });
        }
    }
    /**
     * GET /api/v1/shards/:shardId/revisions/stats
     * Get revision statistics for a shard
     */
    async getRevisionStats(request, reply) {
        const startTime = Date.now();
        const authRequest = request;
        try {
            // Validate authentication
            if (!authRequest.user) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const { shardId } = request.params;
            // Check READ permission on the shard
            const permissionCheck = await this.aclService.checkPermission({
                userId: authRequest.user.id,
                tenantId: authRequest.user.tenantId,
                shardId,
                requiredPermission: PermissionLevel.READ,
            });
            if (!permissionCheck.hasAccess) {
                return reply.code(403).send({ error: 'Insufficient permissions to view statistics' });
            }
            // Get revision statistics
            const stats = await this.revisionRepository.getStats(shardId, authRequest.user.tenantId);
            this.monitoring.trackMetric('revisions-stats-request', 1, {
                duration: Date.now() - startTime,
            });
            return reply.code(200).send(stats);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'revisions-stats-controller',
                shardId: request.params.shardId,
            });
            return reply.code(500).send({ error: 'Failed to get revision statistics' });
        }
    }
}
//# sourceMappingURL=revisions.controller.js.map