import { SessionManagementService } from '../services/auth/session-management.service.js';
import { ForbiddenError, UnauthorizedError } from '../middleware/error-handler.js';
import { SYSTEM_PERMISSIONS } from '@castiel/shared-types';
export class UserManagementController {
    userManagementService;
    cacheManager;
    userService;
    constructor(userManagementService, cacheManager, userService // Inject UserService
    ) {
        this.userManagementService = userManagementService;
        this.cacheManager = cacheManager;
        this.userService = userService;
    }
    /**
     * GET /api/tenants/:tenantId/users
     * List users
     */
    async listUsers(request, reply) {
        try {
            const { tenantId } = request.params;
            const { page = 1, limit = 20, search, role, status, sortBy, sortOrder } = request.query;
            const result = await this.userService.listUsers(tenantId, {
                page,
                limit,
                search,
                role,
                status,
                sortBy,
                sortOrder,
            });
            return reply.send({
                users: result.users,
                total: result.total,
                page,
                limit,
                hasMore: (page * limit) < result.total,
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to list users');
            return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to list users' });
        }
    }
    /**
     * GET /api/tenants/:tenantId/users/:userId
     * Get user details
     */
    async getUser(request, reply) {
        try {
            const { tenantId, userId } = request.params;
            const user = await this.userService.findById(userId, tenantId);
            if (!user) {
                return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
            }
            return reply.send(user);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to get user');
            return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to get user' });
        }
    }
    /**
     * POST /api/tenants/:tenantId/users
     * Create user
     */
    async createUser(request, reply) {
        try {
            const { tenantId } = request.params;
            const data = request.body;
            const user = await this.userManagementService.createUser(tenantId, data);
            return reply.code(201).send(user);
        }
        catch (error) {
            if (error.message === 'User with this email already exists') {
                return reply.code(409).send({ error: 'Conflict', message: error.message });
            }
            request.log.error({ err: error }, 'Failed to create user');
            return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to create user' });
        }
    }
    /**
     * PATCH /api/tenants/:tenantId/users/:userId
     * Update user
     */
    async updateUser(request, reply) {
        try {
            const { tenantId, userId } = request.params;
            const updates = request.body;
            const user = await this.userManagementService.updateUser(tenantId, userId, updates);
            if (!user) {
                return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
            }
            return reply.send(user);
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to update user');
            return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to update user' });
        }
    }
    /**
     * DELETE /api/tenants/:tenantId/users/:userId
     * Delete user
     */
    async deleteUser(request, reply) {
        try {
            const { tenantId, userId } = request.params;
            const success = await this.userService.deleteUser(userId, tenantId);
            if (!success) {
                return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
            }
            return reply.code(204).send();
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to delete user');
            return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to delete user' });
        }
    }
    /**
     * PATCH /api/users/:userId/status
     * Update user status (active, suspended, etc.)
     */
    async updateUserStatus(request, reply) {
        try {
            const { userId } = request.params;
            const { status } = request.body;
            const adminUser = request.user;
            if (!adminUser) {
                throw new UnauthorizedError('Authentication required');
            }
            // Update the user status
            const updatedUser = await this.userManagementService.updateUserStatus(userId, status, adminUser);
            if (!updatedUser) {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: 'User not found',
                });
            }
            // Log the status change
            request.server.monitoring?.trackEvent?.('user.status.changed', {
                userId,
                newStatus: status,
                changedBy: adminUser.id,
                tenantId: adminUser.tenantId,
            });
            return reply.code(200).send({
                message: `User status updated to ${status}`,
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    status: updatedUser.status,
                },
            });
        }
        catch (error) {
            if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
                throw error;
            }
            request.log.error({ err: error }, 'Failed to update user status');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to update user status',
            });
        }
    }
    /**
     * POST /api/tenants/:tenantId/users/bulk
     * Perform bulk operations on multiple users
     */
    async bulkOperation(request, reply) {
        try {
            const { tenantId } = request.params;
            const { action, userIds, role } = request.body;
            const adminUser = request.user;
            if (!adminUser) {
                throw new UnauthorizedError('Authentication required');
            }
            // Granular permission checks based on action
            const permissions = adminUser.permissions || [];
            switch (action) {
                case 'delete':
                    if (!permissions.includes(SYSTEM_PERMISSIONS.USERS.DELETE)) {
                        throw new ForbiddenError('Missing permission: ' + SYSTEM_PERMISSIONS.USERS.DELETE);
                    }
                    break;
                case 'activate':
                case 'deactivate':
                case 'add-role':
                case 'remove-role':
                case 'send-password-reset':
                    if (!permissions.includes(SYSTEM_PERMISSIONS.USERS.UPDATE)) {
                        throw new ForbiddenError('Missing permission: ' + SYSTEM_PERMISSIONS.USERS.UPDATE);
                    }
                    break;
            }
            const results = [];
            let successCount = 0;
            let failureCount = 0;
            for (const userId of userIds) {
                try {
                    switch (action) {
                        case 'activate':
                            await this.userManagementService.updateUserStatus(userId, 'active', adminUser);
                            results.push({ userId, success: true });
                            successCount++;
                            break;
                        case 'deactivate':
                            await this.userManagementService.updateUserStatus(userId, 'suspended', adminUser);
                            results.push({ userId, success: true });
                            successCount++;
                            break;
                        case 'delete':
                            await this.userManagementService.updateUserStatus(userId, 'deleted', adminUser);
                            results.push({ userId, success: true });
                            successCount++;
                            break;
                        case 'add-role':
                            if (!role) {
                                results.push({ userId, success: false, error: 'Role not specified' });
                                failureCount++;
                                break;
                            }
                            await this.userManagementService.addRoleToUser(userId, tenantId, role);
                            results.push({ userId, success: true });
                            successCount++;
                            break;
                        case 'remove-role':
                            if (!role) {
                                results.push({ userId, success: false, error: 'Role not specified' });
                                failureCount++;
                                break;
                            }
                            await this.userManagementService.removeRoleFromUser(userId, tenantId, role);
                            results.push({ userId, success: true });
                            successCount++;
                            break;
                        case 'send-password-reset':
                            await this.userManagementService.adminPasswordReset(tenantId, userId, true);
                            results.push({ userId, success: true });
                            successCount++;
                            break;
                        default:
                            results.push({ userId, success: false, error: `Unknown action: ${action}` });
                            failureCount++;
                    }
                }
                catch (error) {
                    results.push({ userId, success: false, error: error.message || 'Operation failed' });
                    failureCount++;
                }
            }
            // Log the bulk operation
            request.server.monitoring?.trackEvent?.('user.bulk_operation', {
                tenantId,
                action,
                totalUsers: userIds.length,
                successCount,
                failureCount,
                performedBy: adminUser.id,
            });
            return reply.code(200).send({
                message: `Bulk operation completed: ${successCount} succeeded, ${failureCount} failed`,
                successCount,
                failureCount,
                results,
            });
        }
        catch (error) {
            if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
                throw error;
            }
            request.log.error({ err: error }, 'Failed to perform bulk operation');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to perform bulk operation',
            });
        }
    }
    /**
     * POST /api/tenants/:tenantId/users/import
     * Import users from CSV
     */
    async importUsers(request, reply) {
        try {
            const { tenantId } = request.params;
            const { fileContent } = request.body;
            const adminUser = request.user;
            if (!adminUser) {
                throw new UnauthorizedError('Authentication required');
            }
            // Check permissions
            const permissions = adminUser.permissions || [];
            if (!permissions.includes(SYSTEM_PERMISSIONS.USERS.CREATE)) {
                throw new ForbiddenError('Missing permission: ' + SYSTEM_PERMISSIONS.USERS.CREATE);
            }
            if (!fileContent) {
                return reply.code(400).send({ error: 'Bad Request', message: 'Missing file content' });
            }
            // Decode base64
            let csvContent = '';
            try {
                const base64Data = fileContent.includes('base64,')
                    ? fileContent.split('base64,')[1]
                    : fileContent;
                csvContent = Buffer.from(base64Data, 'base64').toString('utf-8');
            }
            catch (e) {
                return reply.code(400).send({ error: 'Bad Request', message: 'Invalid file encoding' });
            }
            const result = await this.userManagementService.importUsers(tenantId, csvContent);
            request.server.monitoring?.trackEvent?.('user.import', {
                tenantId,
                adminId: adminUser.id,
                added: result.added,
                failed: result.failed,
            });
            return reply.code(200).send({
                message: `Import completed: ${result.added} added, ${result.failed} failed`,
                result
            });
        }
        catch (error) {
            if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
                throw error;
            }
            request.log.error({ err: error }, 'Failed to import users');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to import users',
            });
        }
    }
    /**
     * POST /api/tenants/:tenantId/users/:userId/impersonate
     * Issues temporary impersonation tokens for admins
     */
    async impersonateUser(request, reply) {
        try {
            const { tenantId, userId } = request.params;
            const adminUser = request.user;
            if (!adminUser) {
                throw new UnauthorizedError('Authentication required');
            }
            this.ensureAdminPrivileges(adminUser, tenantId, userId);
            await this.ensureMFA(request, adminUser);
            const body = request.body || {};
            const metadata = SessionManagementService.extractSessionMetadata(request);
            const impersonation = await this.userManagementService.impersonateUser(tenantId, userId, {
                adminId: adminUser.id,
                adminEmail: adminUser.email,
                reason: body.reason,
                expiryMinutes: body.expiryMinutes,
                metadata: {
                    ...metadata,
                    requestIp: request.ip,
                    userAgent: request.headers['user-agent'],
                },
            });
            const accessToken = request.server.jwt.sign({
                sub: impersonation.user.id,
                email: impersonation.user.email,
                tenantId: impersonation.user.tenantId,
                role: impersonation.user.roles?.[0] || 'user',
                roles: impersonation.user.roles || [],
                organizationId: impersonation.user.organizationId,
                impersonatedBy: adminUser.id,
                impersonationId: impersonation.impersonationId,
                type: 'access',
            }, {
                expiresIn: `${impersonation.expiresInSeconds}s`,
            });
            const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(impersonation.user.id, impersonation.user.tenantId, undefined, { ttlSeconds: impersonation.expiresInSeconds });
            await this.cacheManager.sessions.createSession(impersonation.user.id, impersonation.user.tenantId, {
                email: impersonation.user.email,
                name: this.getDisplayName(impersonation.user),
                provider: 'impersonation',
                deviceInfo: metadata.deviceInfo,
                locationInfo: metadata.locationInfo,
                metadata: {
                    impersonationId: impersonation.impersonationId,
                    impersonatedBy: adminUser.id,
                    adminEmail: adminUser.email,
                    reason: impersonation.reason,
                    expiresAt: impersonation.expiresAt,
                },
            });
            request.server.monitoring?.trackEvent?.('user.impersonation.started', {
                tenantId,
                adminId: adminUser.id,
                targetUserId: userId,
                impersonationId: impersonation.impersonationId,
            });
            const response = {
                accessToken,
                refreshToken: refreshTokenResult.token,
                expiresIn: impersonation.expiresInSeconds,
                expiresAt: impersonation.expiresAt,
                impersonationId: impersonation.impersonationId,
                message: 'Impersonation token issued',
                user: impersonation.user,
            };
            return reply.code(200).send(response);
        }
        catch (error) {
            if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
                throw error;
            }
            request.log.error({ err: error }, 'Failed to impersonate user');
            if (error instanceof Error) {
                if (error.message === 'User not found') {
                    return reply.code(404).send({
                        error: 'Not Found',
                        message: 'User not found',
                    });
                }
                if (error.message === 'User is not active' || error.message === 'Cannot impersonate yourself') {
                    return reply.code(400).send({
                        error: 'Bad Request',
                        message: error.message,
                    });
                }
            }
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to impersonate user',
            });
        }
    }
    ensureAdminPrivileges(user, tenantId, targetUserId) {
        if (user.tenantId !== tenantId) {
            throw new ForbiddenError('Access denied to this tenant');
        }
        if (user.id === targetUserId) {
            throw new ForbiddenError('Cannot impersonate your own account');
        }
        const roles = user.roles || [];
        const hasAdminRole = roles.includes('admin') || roles.includes('owner') || roles.includes('global_admin');
        if (!hasAdminRole) {
            throw new ForbiddenError('Admin role required for impersonation');
        }
    }
    async ensureMFA(request, user) {
        const headerValue = request.headers['x-mfa-verified'];
        if (typeof headerValue === 'string' && headerValue.toLowerCase() === 'true') {
            return;
        }
        if (user.sessionId) {
            try {
                const session = await this.cacheManager.sessions.getSession(user.tenantId, user.id, user.sessionId);
                if (session?.metadata?.mfaVerified || session?.metadata?.mfaCompletedAt) {
                    return;
                }
            }
            catch (error) {
                request.log.warn({ err: error }, 'Unable to verify MFA from session metadata');
            }
        }
        throw new ForbiddenError('MFA verification required for impersonation');
    }
    getDisplayName(user) {
        if (user.displayName) {
            return user.displayName;
        }
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return fullName || user.email;
    }
}
//# sourceMappingURL=user-management.controller.js.map