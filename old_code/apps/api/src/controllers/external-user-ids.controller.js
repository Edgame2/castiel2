/**
 * External User IDs Controller
 * Handles HTTP requests for external user ID management
 */
import { ForbiddenError } from '../middleware/error-handler.js';
function getUser(request) {
    const req = request;
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    return req.user;
}
export class ExternalUserIdsController {
    externalUserIdService;
    constructor(externalUserIdService) {
        this.externalUserIdService = externalUserIdService;
    }
    /**
     * GET /api/tenants/:tenantId/users/:userId/external-user-ids
     * Get all external user IDs for a user
     */
    async getUserExternalUserIds(request, reply) {
        try {
            const user = getUser(request);
            const { tenantId, userId } = request.params;
            // Check permissions: user can view their own, admin can view any user in their tenant
            const isOwnUser = user.id === userId;
            const isAdmin = user.roles?.some((role) => ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase()));
            if (!isOwnUser && !isAdmin) {
                throw new ForbiddenError('Insufficient permissions to view external user IDs');
            }
            // Ensure tenant matches
            if (user.tenantId !== tenantId) {
                throw new ForbiddenError('Cannot access users from different tenant');
            }
            const externalUserIds = await this.externalUserIdService.getAllExternalUserIds(userId, tenantId);
            reply.status(200).send({
                externalUserIds: externalUserIds.map((ext) => ({
                    integrationId: ext.integrationId,
                    externalUserId: ext.externalUserId,
                    integrationName: ext.integrationName,
                    connectionId: ext.connectionId,
                    connectedAt: ext.connectedAt.toISOString(),
                    lastSyncedAt: ext.lastSyncedAt?.toISOString(),
                    status: ext.status,
                    metadata: ext.metadata || {},
                })),
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get external user IDs');
            if (error instanceof ForbiddenError) {
                reply.status(403).send({
                    error: 'Forbidden',
                    message: error.message,
                });
            }
            else {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: error.message || 'Failed to get external user IDs',
                });
            }
        }
    }
    /**
     * POST /api/tenants/:tenantId/users/:userId/external-user-ids
     * Create or update external user ID
     */
    async createOrUpdateExternalUserId(request, reply) {
        try {
            const user = getUser(request);
            const { tenantId, userId } = request.params;
            const body = request.body;
            // Only admins can create/update external user IDs
            const isAdmin = user.roles?.some((role) => ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase()));
            if (!isAdmin) {
                throw new ForbiddenError('Admin access required to manage external user IDs');
            }
            // Ensure tenant matches
            if (user.tenantId !== tenantId) {
                throw new ForbiddenError('Cannot access users from different tenant');
            }
            // Check for conflicts
            const conflict = await this.externalUserIdService.checkConflict(tenantId, body.integrationId, body.externalUserId, userId);
            if (conflict.exists) {
                reply.status(409).send({
                    error: 'Conflict',
                    message: `External user ID already exists for another user (${conflict.email || conflict.userId})`,
                    conflict: {
                        userId: conflict.userId,
                        email: conflict.email,
                    },
                });
                return;
            }
            await this.externalUserIdService.storeExternalUserId(userId, tenantId, {
                integrationId: body.integrationId,
                externalUserId: body.externalUserId,
                integrationName: body.integrationName,
                connectionId: body.connectionId,
                metadata: body.metadata,
                status: body.status,
            });
            const externalUserId = await this.externalUserIdService.getExternalUserId(userId, tenantId, body.integrationId);
            reply.status(200).send({
                integrationId: externalUserId.integrationId,
                externalUserId: externalUserId.externalUserId,
                integrationName: externalUserId.integrationName,
                connectionId: externalUserId.connectionId,
                connectedAt: externalUserId.connectedAt.toISOString(),
                lastSyncedAt: externalUserId.lastSyncedAt?.toISOString(),
                status: externalUserId.status,
                metadata: externalUserId.metadata || {},
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create/update external user ID');
            if (error instanceof ForbiddenError) {
                reply.status(403).send({
                    error: 'Forbidden',
                    message: error.message,
                });
            }
            else {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: error.message || 'Failed to create/update external user ID',
                });
            }
        }
    }
    /**
     * PATCH /api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId
     * Update external user ID and metadata
     */
    async updateExternalUserId(request, reply) {
        try {
            const user = getUser(request);
            const { tenantId, userId, integrationId } = request.params;
            const body = request.body;
            // Only admins can update external user IDs
            const isAdmin = user.roles?.some((role) => ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase()));
            if (!isAdmin) {
                throw new ForbiddenError('Admin access required to update external user IDs');
            }
            // Ensure tenant matches
            if (user.tenantId !== tenantId) {
                throw new ForbiddenError('Cannot access users from different tenant');
            }
            // Check for conflicts if externalUserId is being updated
            if (body.externalUserId) {
                const conflict = await this.externalUserIdService.checkConflict(tenantId, integrationId, body.externalUserId, userId);
                if (conflict.exists) {
                    reply.status(409).send({
                        error: 'Conflict',
                        message: `External user ID already exists for another user (${conflict.email || conflict.userId})`,
                        conflict: {
                            userId: conflict.userId,
                            email: conflict.email,
                        },
                    });
                    return;
                }
            }
            await this.externalUserIdService.updateExternalUserId(userId, tenantId, integrationId, {
                externalUserId: body.externalUserId,
                integrationName: body.integrationName,
                connectionId: body.connectionId,
                metadata: body.metadata,
                status: body.status,
            });
            const externalUserId = await this.externalUserIdService.getExternalUserId(userId, tenantId, integrationId);
            reply.status(200).send({
                integrationId: externalUserId.integrationId,
                externalUserId: externalUserId.externalUserId,
                integrationName: externalUserId.integrationName,
                connectionId: externalUserId.connectionId,
                connectedAt: externalUserId.connectedAt.toISOString(),
                lastSyncedAt: externalUserId.lastSyncedAt?.toISOString(),
                status: externalUserId.status,
                metadata: externalUserId.metadata || {},
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update external user ID');
            if (error instanceof ForbiddenError) {
                reply.status(403).send({
                    error: 'Forbidden',
                    message: error.message,
                });
            }
            else {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: error.message || 'Failed to update external user ID',
                });
            }
        }
    }
    /**
     * DELETE /api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId
     * Remove external user ID
     */
    async deleteExternalUserId(request, reply) {
        try {
            const user = getUser(request);
            const { tenantId, userId, integrationId } = request.params;
            // Only admins can delete external user IDs
            const isAdmin = user.roles?.some((role) => ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase()));
            if (!isAdmin) {
                throw new ForbiddenError('Admin access required to delete external user IDs');
            }
            // Ensure tenant matches
            if (user.tenantId !== tenantId) {
                throw new ForbiddenError('Cannot access users from different tenant');
            }
            await this.externalUserIdService.removeExternalUserId(userId, tenantId, integrationId);
            reply.status(200).send({
                message: 'External user ID removed successfully',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete external user ID');
            if (error instanceof ForbiddenError) {
                reply.status(403).send({
                    error: 'Forbidden',
                    message: error.message,
                });
            }
            else {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: error.message || 'Failed to delete external user ID',
                });
            }
        }
    }
    /**
     * POST /api/tenants/:tenantId/users/:userId/external-user-ids/:integrationId/sync
     * Manually sync external user ID from integration
     */
    async syncExternalUserId(request, reply) {
        try {
            const user = getUser(request);
            const { tenantId, userId, integrationId } = request.params;
            // Only admins can sync external user IDs
            const isAdmin = user.roles?.some((role) => ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase()));
            if (!isAdmin) {
                throw new ForbiddenError('Admin access required to sync external user IDs');
            }
            // Ensure tenant matches
            if (user.tenantId !== tenantId) {
                throw new ForbiddenError('Cannot access users from different tenant');
            }
            // Get connection ID from existing external user ID if available
            const existing = await this.externalUserIdService.getExternalUserId(userId, tenantId, integrationId);
            if (!existing || !existing.connectionId) {
                reply.status(404).send({
                    error: 'Not Found',
                    message: 'External user ID or connection not found. Please create a connection first.',
                });
                return;
            }
            await this.externalUserIdService.syncExternalUserIdFromConnection(userId, tenantId, integrationId, existing.connectionId);
            const externalUserId = await this.externalUserIdService.getExternalUserId(userId, tenantId, integrationId);
            reply.status(200).send({
                integrationId: externalUserId.integrationId,
                externalUserId: externalUserId.externalUserId,
                integrationName: externalUserId.integrationName,
                connectionId: externalUserId.connectionId,
                connectedAt: externalUserId.connectedAt.toISOString(),
                lastSyncedAt: externalUserId.lastSyncedAt?.toISOString(),
                status: externalUserId.status,
                metadata: externalUserId.metadata || {},
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to sync external user ID');
            if (error instanceof ForbiddenError) {
                reply.status(403).send({
                    error: 'Forbidden',
                    message: error.message,
                });
            }
            else {
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: error.message || 'Failed to sync external user ID',
                });
            }
        }
    }
}
//# sourceMappingURL=external-user-ids.controller.js.map