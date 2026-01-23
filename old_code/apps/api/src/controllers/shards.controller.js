import { ShardRepository } from '../repositories/shard.repository.js';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { LazyMigrationService } from '../services/lazy-migration.service.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardStatus, PermissionLevel, } from '../types/shard.types.js';
import { ChangeType, RevisionStorageStrategy, } from '../types/revision.types.js';
import { ShardError, ShardErrors, ShardErrorCode, } from '../types/shard-errors.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
// AuthContext declaration moved to types/fastify.d.ts
/**
 * Shards Controller
 * Handles all REST API operations for Shards with caching
 * Cache: Only structuredData (15-30 min TTL)
 */
export class ShardsController {
    repository;
    revisionRepository;
    monitoring;
    eventService;
    lazyMigrationService;
    shardTypeRepository;
    riskEvaluationService;
    serverInstance; // Store server instance for lazy service retrieval
    constructor(monitoring, cacheService, eventService, enableLazyMigration = true, serviceBusService, redactionService, // Phase 2: RedactionService
    auditTrailService, // Phase 2: AuditTrailService
    riskEvaluationService, // Optional - for automatic risk evaluation
    serverInstance) {
        this.monitoring = monitoring;
        this.repository = new ShardRepository(monitoring, cacheService, serviceBusService, redactionService, auditTrailService);
        this.revisionRepository = new RevisionRepository(monitoring);
        this.shardTypeRepository = new ShardTypeRepository(monitoring);
        this.eventService = eventService;
        this.riskEvaluationService = riskEvaluationService;
        this.serverInstance = serverInstance;
        // Initialize lazy migration service if enabled
        if (enableLazyMigration) {
            const shardTypeRepository = new ShardTypeRepository(monitoring);
            this.lazyMigrationService = new LazyMigrationService(monitoring, this.repository, shardTypeRepository);
        }
    }
    /**
     * Emit event and queue for webhooks (non-blocking)
     */
    async emitEvent(emitFn, operation) {
        if (!this.eventService) {
            return;
        }
        try {
            const payload = await emitFn();
            // Queue for webhook delivery
            await this.eventService.queueForWebhooks(payload);
        }
        catch (error) {
            // Don't fail the main operation if event emission fails
            this.monitoring.trackException(error, {
                operation: `shards.emitEvent.${operation}`,
            });
        }
    }
    /**
     * Get RiskEvaluationService (lazy retrieval from server if not already available)
     */
    getRiskEvaluationService() {
        // Return if already set
        if (this.riskEvaluationService) {
            return this.riskEvaluationService;
        }
        // Try to retrieve from server if server instance is available
        if (this.serverInstance) {
            const service = this.serverInstance.riskEvaluationService;
            if (service) {
                this.riskEvaluationService = service; // Cache for future use
                return service;
            }
        }
        return undefined;
    }
    /**
     * Queue risk evaluation for opportunity shards (non-blocking)
     */
    async queueRiskEvaluationIfOpportunity(shard, tenantId, userId, trigger) {
        // Get RiskEvaluationService (lazy retrieval)
        const riskEvaluationService = this.getRiskEvaluationService();
        if (!riskEvaluationService) {
            return;
        }
        // Check if this is an opportunity shard
        try {
            const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
            if (!shardType || shardType.name !== CORE_SHARD_TYPE_NAMES.OPPORTUNITY) {
                return; // Not an opportunity, skip risk evaluation
            }
            // Queue risk evaluation (non-blocking, errors are logged but don't fail the operation)
            try {
                await riskEvaluationService.queueRiskEvaluation(shard.id, tenantId, userId, trigger, 'normal', {
                    includeHistorical: true,
                    includeAI: true,
                    includeSemanticDiscovery: true,
                });
                this.monitoring.trackEvent('shards.risk-evaluation.queued', {
                    shardId: shard.id,
                    tenantId,
                    trigger,
                });
            }
            catch (error) {
                // Log but don't fail - risk evaluation queueing is optional
                this.monitoring.trackException(error, {
                    operation: 'shards.queueRiskEvaluationIfOpportunity',
                    shardId: shard.id,
                    tenantId,
                    trigger,
                });
            }
        }
        catch (error) {
            // Log but don't fail - shard type lookup failure shouldn't block shard operations
            this.monitoring.trackException(error, {
                operation: 'shards.queueRiskEvaluationIfOpportunity.shardTypeLookup',
                shardId: shard.id,
                tenantId,
            });
        }
    }
    /**
     * Initialize repositories
     */
    async initialize() {
        await this.repository.ensureContainer();
        await this.revisionRepository.ensureContainer();
        if (this.lazyMigrationService) {
            await this.lazyMigrationService.initialize();
        }
    }
    /**
     * Helper to send error responses using ShardError
     */
    sendError(reply, error) {
        reply.status(error.statusCode).send(error.toJSON());
    }
    /**
     * Helper to handle errors consistently
     */
    handleError(error, reply, operation, context) {
        if (ShardError.isShardError(error)) {
            this.monitoring.trackEvent(`api.shards.${operation}.error`, {
                code: error.code,
                ...context,
            });
            this.sendError(reply, error);
            return;
        }
        // Handle unknown errors
        this.monitoring.trackException(error, {
            operation: `shards.controller.${operation}`,
            ...context,
        });
        const shardError = new ShardError(ShardErrorCode.SHARD_VALIDATION_FAILED, `Failed to ${operation.replace('.', ' ')} shard`, { cause: error instanceof Error ? error : undefined });
        reply.status(500).send(shardError.toJSON());
    }
    /**
     * Helper to check if user has required permission
     */
    async hasPermission(shardId, tenantId, userId, requiredPermission) {
        const check = await this.repository.checkPermission(shardId, tenantId, userId);
        if (!check.hasAccess) {
            return false;
        }
        return check.permissions.includes(requiredPermission);
    }
    /**
     * POST /api/v1/shards
     * Create a new shard with automatic caching
     */
    createShard = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth || req.user;
            const userId = auth?.id || auth?.userId;
            const tenantId = auth?.tenantId;
            if (!tenantId || !userId) {
                throw new ShardError(ShardErrorCode.SHARD_ACCESS_DENIED, 'Unauthorized: Missing tenant or user context');
            }
            const { shardTypeId, structuredData, unstructuredData, metadata, internal_relationships, external_relationships, parentShardId, } = req.body;
            // Validation
            if (!shardTypeId) {
                throw ShardErrors.requiredFieldMissing('shardTypeId');
            }
            const shardType = await this.shardTypeRepository.findById(shardTypeId, tenantId);
            if (!shardType) {
                throw ShardErrors.notFound(`ShardType ${shardTypeId}`);
            }
            // Create input with default ACL (creator has full access)
            const input = {
                tenantId,
                shardTypeId,
                shardTypeName: shardType.name,
                structuredData: structuredData || {},
                unstructuredData: unstructuredData || {},
                metadata: metadata || {},
                internal_relationships: internal_relationships || [],
                external_relationships: external_relationships || [],
                parentShardId,
                createdBy: userId,
                acl: [
                    {
                        userId,
                        permissions: [
                            PermissionLevel.READ,
                            PermissionLevel.WRITE,
                            PermissionLevel.DELETE,
                            PermissionLevel.ADMIN,
                        ],
                        grantedBy: userId,
                        grantedAt: new Date(),
                    },
                ],
            };
            // Create shard (repository handles caching)
            const shard = await this.repository.create(input);
            // Create initial revision
            const revisionNumber = await this.revisionRepository.getNextRevisionNumber(shard.id, tenantId);
            await this.revisionRepository.create({
                shardId: shard.id,
                tenantId,
                revisionNumber,
                data: {
                    strategy: RevisionStorageStrategy.FULL_SNAPSHOT,
                    snapshot: shard,
                },
                changeType: ChangeType.CREATED,
                changedBy: userId,
                metadata: {
                    changeDescription: 'Initial creation',
                },
            });
            // Emit created event (non-blocking)
            this.emitEvent(() => this.eventService.emitCreated(shard, {
                triggeredBy: userId,
                triggerSource: 'api',
            }), 'create');
            // Queue risk evaluation if this is an opportunity (non-blocking)
            this.queueRiskEvaluationIfOpportunity(shard, tenantId, userId, 'shard_created')
                .catch((error) => {
                // Already handled in queueRiskEvaluationIfOpportunity, but catch to prevent unhandled rejection
                this.monitoring.trackException(error, {
                    operation: 'shards.create.queueRiskEvaluation',
                    shardId: shard.id,
                    tenantId,
                });
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.create.duration', duration);
            this.monitoring.trackEvent('api.shards.create.success', {
                shardId: shard.id,
                tenantId,
                shardTypeId: shard.shardTypeId,
            });
            reply.status(201).send(shard);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.create.duration', duration);
            this.handleError(error, reply, 'create', { tenantId: req.auth?.tenantId });
        }
    };
    /**
     * GET /api/v1/shards
     * List shards with filtering and pagination
     */
    listShards = async (req, reply) => {
        const startTime = Date.now();
        try {
            const auth = req.auth || req.user;
            const userId = auth?.id || auth?.userId;
            const tenantId = auth?.tenantId;
            if (!tenantId || !userId) {
                throw new ShardError(ShardErrorCode.SHARD_ACCESS_DENIED, 'Unauthorized: Missing tenant or user context');
            }
            const { shardTypeId, status, parentShardId, userId: filterUserId, tags, category, priority, createdAfter, createdBefore, updatedAfter, updatedBefore, limit = '50', continuationToken, orderBy = 'createdAt', orderDirection = 'desc', managerId, teamMemberId, } = req.query;
            const result = await this.repository.list({
                filter: {
                    tenantId,
                    shardTypeId,
                    status,
                    parentShardId,
                    userId: filterUserId,
                    tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
                    category,
                    priority,
                    createdAfter: createdAfter ? new Date(createdAfter) : undefined,
                    createdBefore: createdBefore ? new Date(createdBefore) : undefined,
                    updatedAfter: updatedAfter ? new Date(updatedAfter) : undefined,
                    updatedBefore: updatedBefore ? new Date(updatedBefore) : undefined,
                    managerId,
                    teamMemberId,
                },
                limit: (() => {
                    const parsed = parseInt(limit, 10);
                    return isNaN(parsed) || parsed < 1 ? 50 : Math.min(parsed, 1000); // Max 1000 items per page
                })(),
                continuationToken,
                orderBy,
                orderDirection: orderDirection,
            });
            // Filter by ACL permissions (user must have at least READ permission)
            const accessibleShards = [];
            for (const shard of result.shards) {
                const hasReadAccess = await this.hasPermission(shard.id, tenantId, userId, PermissionLevel.READ);
                if (hasReadAccess) {
                    accessibleShards.push(shard);
                }
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.list.duration', duration);
            this.monitoring.trackEvent('api.shards.list.success', {
                tenantId,
                count: accessibleShards.length,
                filteredCount: result.shards.length - accessibleShards.length,
            });
            reply.status(200).send({
                shards: accessibleShards,
                continuationToken: result.continuationToken,
                count: accessibleShards.length,
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.list.duration', duration);
            this.handleError(error, reply, 'list', { tenantId: req.auth?.tenantId });
        }
    };
    /**
     * GET /api/v1/shards/:id
     * Get a single shard with cache-aside pattern
     */
    getShard = async (req, reply) => {
        const startTime = Date.now();
        const { id } = req.params;
        try {
            const auth = req.auth || req.user;
            const userId = auth?.id || auth?.userId;
            const tenantId = auth?.tenantId;
            if (!tenantId || !userId) {
                throw new ShardError(ShardErrorCode.SHARD_ACCESS_DENIED, 'Unauthorized: Missing tenant or user context');
            }
            if (!id) {
                throw ShardErrors.requiredFieldMissing('id');
            }
            // Check permission first
            const hasReadAccess = await this.hasPermission(id, tenantId, userId, PermissionLevel.READ);
            if (!hasReadAccess) {
                throw ShardErrors.insufficientPermissions(id, 'READ');
            }
            // Get shard (repository handles cache-aside pattern)
            let shard = await this.repository.findById(id, tenantId);
            if (!shard) {
                throw ShardErrors.notFound(id);
            }
            // Apply lazy migration if needed
            let wasMigrated = false;
            if (this.lazyMigrationService) {
                try {
                    const migrationResult = await this.lazyMigrationService.checkAndMigrate(shard);
                    shard = migrationResult.shard;
                    wasMigrated = migrationResult.wasMigrated;
                }
                catch (migrationError) {
                    // Log but don't fail the request if migration fails
                    this.monitoring.trackException(migrationError, {
                        operation: 'shards.lazyMigration',
                        shardId: id,
                        tenantId,
                    });
                }
            }
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.get.duration', duration);
            this.monitoring.trackEvent('api.shards.get.success', {
                shardId: id,
                tenantId,
                wasMigrated,
            });
            reply.status(200).send(shard);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.get.duration', duration);
            this.handleError(error, reply, 'get', { shardId: id, tenantId: req.auth?.tenantId });
        }
    };
    /**
     * PUT /api/v1/shards/:id
     * Full update with cache invalidation and revision creation
     */
    updateShard = async (req, reply) => {
        const startTime = Date.now();
        const { id } = req.params;
        try {
            const auth = req.auth || req.user;
            const userId = auth?.id || auth?.userId;
            const tenantId = auth?.tenantId;
            if (!tenantId || !userId) {
                throw new ShardError(ShardErrorCode.SHARD_ACCESS_DENIED, 'Unauthorized: Missing tenant or user context');
            }
            if (!id) {
                throw ShardErrors.requiredFieldMissing('id');
            }
            // Check permission
            const hasWriteAccess = await this.hasPermission(id, tenantId, userId, PermissionLevel.WRITE);
            if (!hasWriteAccess) {
                throw ShardErrors.insufficientPermissions(id, 'WRITE');
            }
            // Get existing shard for revision
            const existing = await this.repository.findById(id, tenantId);
            if (!existing) {
                throw ShardErrors.notFound(id);
            }
            const { structuredData, unstructuredData, metadata, status, } = req.body;
            const input = {
                structuredData,
                unstructuredData,
                metadata,
                status,
            };
            // Update shard (repository handles cache invalidation and pub/sub)
            const updated = await this.repository.update(id, tenantId, input);
            if (!updated) {
                throw ShardErrors.notFound(id);
            }
            // Create revision
            const revisionNumber = await this.revisionRepository.getNextRevisionNumber(id, tenantId);
            await this.revisionRepository.create({
                shardId: id,
                tenantId,
                revisionNumber,
                data: {
                    strategy: RevisionStorageStrategy.FULL_SNAPSHOT,
                    snapshot: updated,
                },
                changeType: ChangeType.UPDATED,
                changedBy: userId,
                metadata: {
                    changeDescription: 'Full update',
                },
            });
            // Emit updated event (non-blocking)
            this.emitEvent(() => this.eventService.emitUpdated(updated, existing, {
                triggeredBy: userId,
                triggerSource: 'api',
            }), 'update');
            // Queue risk evaluation if this is an opportunity (non-blocking)
            this.queueRiskEvaluationIfOpportunity(updated, tenantId, userId, 'opportunity_updated')
                .catch((error) => {
                // Already handled in queueRiskEvaluationIfOpportunity, but catch to prevent unhandled rejection
                this.monitoring.trackException(error, {
                    operation: 'shards.update.queueRiskEvaluation',
                    shardId: id,
                    tenantId,
                });
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.update.duration', duration);
            this.monitoring.trackEvent('api.shards.update.success', {
                shardId: id,
                tenantId,
            });
            reply.status(200).send(updated);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.update.duration', duration);
            this.handleError(error, reply, 'update', { shardId: id, tenantId: req.auth?.tenantId });
        }
    };
    /**
     * PATCH /api/v1/shards/:id
     * Partial update with cache invalidation
     */
    patchShard = async (req, reply) => {
        const startTime = Date.now();
        const { id } = req.params;
        try {
            const auth = req.auth || req.user;
            const userId = auth?.id || auth?.userId;
            const tenantId = auth?.tenantId;
            if (!tenantId || !userId) {
                throw new ShardError(ShardErrorCode.SHARD_ACCESS_DENIED, 'Unauthorized: Missing tenant or user context');
            }
            if (!id) {
                throw ShardErrors.requiredFieldMissing('id');
            }
            // Check permission
            const hasWriteAccess = await this.hasPermission(id, tenantId, userId, PermissionLevel.WRITE);
            if (!hasWriteAccess) {
                throw ShardErrors.insufficientPermissions(id, 'WRITE');
            }
            // Get existing for partial update
            const existing = await this.repository.findById(id, tenantId);
            if (!existing) {
                throw ShardErrors.notFound(id);
            }
            const patches = req.body;
            // Merge patches with existing data
            const input = {
                structuredData: patches.structuredData
                    ? { ...existing.structuredData, ...patches.structuredData }
                    : undefined,
                unstructuredData: patches.unstructuredData
                    ? { ...existing.unstructuredData, ...patches.unstructuredData }
                    : undefined,
                metadata: patches.metadata
                    ? { ...existing.metadata, ...patches.metadata }
                    : undefined,
                internal_relationships: patches.internal_relationships ?? undefined,
                external_relationships: patches.external_relationships ?? undefined,
                status: patches.status,
            };
            const updated = await this.repository.update(id, tenantId, input);
            if (!updated) {
                throw ShardErrors.notFound(id);
            }
            // Create revision
            const revisionNumber = await this.revisionRepository.getNextRevisionNumber(id, tenantId);
            await this.revisionRepository.create({
                shardId: id,
                tenantId,
                revisionNumber,
                data: {
                    strategy: RevisionStorageStrategy.FULL_SNAPSHOT,
                    snapshot: updated,
                },
                changeType: ChangeType.UPDATED,
                changedBy: userId,
                metadata: {
                    changeDescription: 'Partial update (PATCH)',
                },
            });
            // Emit updated event (non-blocking)
            this.emitEvent(() => this.eventService.emitUpdated(updated, existing, {
                triggeredBy: userId,
                triggerSource: 'api',
            }), 'patch');
            // Queue risk evaluation if this is an opportunity (non-blocking)
            this.queueRiskEvaluationIfOpportunity(updated, tenantId, userId, 'opportunity_updated')
                .catch((error) => {
                // Already handled in queueRiskEvaluationIfOpportunity, but catch to prevent unhandled rejection
                this.monitoring.trackException(error, {
                    operation: 'shards.patch.queueRiskEvaluation',
                    shardId: id,
                    tenantId,
                });
            });
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.patch.duration', duration);
            this.monitoring.trackEvent('api.shards.patch.success', {
                shardId: id,
                tenantId,
            });
            reply.status(200).send(updated);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.patch.duration', duration);
            this.handleError(error, reply, 'patch', { shardId: id, tenantId: req.auth?.tenantId });
        }
    };
    /**
     * DELETE /api/v1/shards/:id
     * Soft delete with cache invalidation
     */
    deleteShard = async (req, reply) => {
        const startTime = Date.now();
        const { id } = req.params;
        const { hard = 'false' } = req.query;
        try {
            const auth = req.auth || req.user;
            const userId = auth?.id || auth?.userId;
            const tenantId = auth?.tenantId;
            if (!tenantId || !userId) {
                throw new ShardError(ShardErrorCode.SHARD_ACCESS_DENIED, 'Unauthorized: Missing tenant or user context');
            }
            if (!id) {
                throw ShardErrors.requiredFieldMissing('id');
            }
            // Check permission
            const hasDeleteAccess = await this.hasPermission(id, tenantId, userId, PermissionLevel.DELETE);
            if (!hasDeleteAccess) {
                throw ShardErrors.insufficientPermissions(id, 'DELETE');
            }
            // Get existing for revision
            const existing = await this.repository.findById(id, tenantId);
            if (!existing) {
                throw ShardErrors.notFound(id);
            }
            // Check if already deleted (for soft delete)
            const hardDelete = hard === 'true';
            if (!hardDelete && existing.status === ShardStatus.DELETED) {
                throw ShardErrors.alreadyDeleted(id);
            }
            const success = await this.repository.delete(id, tenantId, hardDelete);
            if (!success) {
                throw ShardErrors.notFound(id);
            }
            // Create revision for soft delete only
            if (!hardDelete) {
                const revisionNumber = await this.revisionRepository.getNextRevisionNumber(id, tenantId);
                await this.revisionRepository.create({
                    shardId: id,
                    tenantId,
                    revisionNumber,
                    data: {
                        strategy: RevisionStorageStrategy.FULL_SNAPSHOT,
                        snapshot: { ...existing, status: ShardStatus.DELETED },
                    },
                    changeType: ChangeType.DELETED,
                    changedBy: userId,
                    metadata: {
                        changeDescription: 'Soft delete',
                    },
                });
            }
            // Emit deleted event (non-blocking)
            this.emitEvent(() => this.eventService.emitDeleted(existing, {
                triggeredBy: userId,
                triggerSource: 'api',
                previousState: {
                    structuredData: existing.structuredData,
                    status: existing.status,
                },
            }), 'delete');
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.delete.duration', duration);
            this.monitoring.trackEvent('api.shards.delete.success', {
                shardId: id,
                tenantId,
                hardDelete,
            });
            reply.status(204).send();
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.monitoring.trackMetric('api.shards.delete.duration', duration);
            this.handleError(error, reply, 'delete', { shardId: id, tenantId: req.auth?.tenantId });
        }
    };
}
//# sourceMappingURL=shards.controller.js.map