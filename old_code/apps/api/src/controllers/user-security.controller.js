/**
 * User Security Controller
 *
 * Admin endpoints for managing user security settings
 */
import { UserStatus } from '../types/user.types.js';
import crypto from 'crypto';
const ADMIN_ROLES = ['owner', 'admin', 'tenant-admin', 'super-admin'];
/**
 * User Security Controller
 */
export class UserSecurityController {
    userService;
    mfaService;
    cacheManager;
    emailService;
    frontendUrl;
    constructor(userService, mfaService, cacheManager, emailService, frontendUrl) {
        this.userService = userService;
        this.mfaService = mfaService;
        this.cacheManager = cacheManager;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
    }
    /**
     * POST /api/admin/users/:userId/force-password-reset
     * Force a password reset for a user
     */
    async forcePasswordReset(request, reply) {
        try {
            const admin = request.user;
            if (!admin) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            if (!this.isAdmin(admin)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required',
                });
            }
            const { userId } = request.params;
            const { sendEmail = true } = request.body || {};
            // Get the target user - need tenantId first, try admin's tenant
            const user = await this.userService.findById(userId, admin.tenantId);
            if (!user) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'User not found',
                });
            }
            // Check tenant access
            if (user.tenantId !== admin.tenantId && !admin.roles?.includes('super-admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Cannot manage users from other tenants',
                });
            }
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            // Update user with reset token and require password change
            await this.userService.updateUser(userId, user.tenantId, {
                passwordResetToken: resetToken,
                passwordResetTokenExpiry: resetExpiry,
                metadata: {
                    ...user.metadata,
                    mustChangePassword: true,
                },
            });
            // Revoke all existing sessions
            await this.cacheManager.sessions.deleteAllUserSessions(user.tenantId, userId);
            // Send password reset email if requested
            if (sendEmail && user.email) {
                const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
                await this.emailService.sendPasswordResetEmail(user.email, resetToken, this.frontendUrl);
            }
            request.log.info({ userId, adminId: admin.id }, 'Password reset forced by admin');
            return reply.code(200).send({
                success: true,
                message: 'Password reset initiated',
                resetToken: sendEmail ? undefined : resetToken, // Only return token if not sending email
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to force password reset');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to force password reset',
            });
        }
    }
    /**
     * POST /api/admin/users/:userId/revoke-sessions
     * Revoke all sessions for a user
     */
    async revokeSessions(request, reply) {
        try {
            const admin = request.user;
            if (!admin) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            if (!this.isAdmin(admin)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required',
                });
            }
            const { userId } = request.params;
            // Get the target user - need tenantId first, try admin's tenant
            const user = await this.userService.findById(userId, admin.tenantId);
            if (!user) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'User not found',
                });
            }
            // Check tenant access
            if (user.tenantId !== admin.tenantId && !admin.roles?.includes('super-admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Cannot manage users from other tenants',
                });
            }
            // Revoke all sessions
            await this.cacheManager.sessions.deleteAllUserSessions(user.tenantId, userId);
            // Also invalidate refresh tokens
            await this.cacheManager.tokens.revokeAllUserTokens(user.tenantId, userId);
            request.log.info({ userId, adminId: admin.id }, 'All sessions revoked by admin');
            return reply.code(200).send({
                success: true,
                message: 'All sessions revoked',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to revoke sessions');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to revoke sessions',
            });
        }
    }
    /**
     * POST /api/admin/users/:userId/disable-mfa
     * Disable MFA for a user (admin action)
     */
    async disableMFA(request, reply) {
        try {
            const admin = request.user;
            if (!admin) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            if (!this.isAdmin(admin)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required',
                });
            }
            const { userId } = request.params;
            const { method } = request.body || {};
            // Get the target user - need tenantId first, try admin's tenant
            const user = await this.userService.findById(userId, admin.tenantId);
            if (!user) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'User not found',
                });
            }
            // Check tenant access
            if (user.tenantId !== admin.tenantId && !admin.roles?.includes('super-admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Cannot manage users from other tenants',
                });
            }
            // Disable MFA
            if (method) {
                // Disable specific method
                await this.mfaService.disableMFAMethod(userId, user.tenantId, method);
            }
            else {
                // Disable all MFA - store in metadata since User type doesn't have these fields
                await this.userService.updateUser(userId, user.tenantId, {
                    metadata: {
                        ...user.metadata,
                        mfaEnabled: false,
                        mfaMethods: [],
                    },
                });
            }
            request.log.info({ userId, adminId: admin.id, method }, 'MFA disabled by admin');
            return reply.code(200).send({
                success: true,
                message: method ? `MFA method ${method} disabled` : 'All MFA disabled',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to disable MFA');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to disable MFA',
            });
        }
    }
    /**
     * POST /api/admin/users/:userId/lock
     * Lock a user account
     */
    async lockAccount(request, reply) {
        try {
            const admin = request.user;
            if (!admin) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            if (!this.isAdmin(admin)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required',
                });
            }
            const { userId } = request.params;
            const { reason } = request.body || {};
            // Get the target user - need tenantId first, try admin's tenant
            const user = await this.userService.findById(userId, admin.tenantId);
            if (!user) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'User not found',
                });
            }
            // Check tenant access
            if (user.tenantId !== admin.tenantId && !admin.roles?.includes('super-admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Cannot manage users from other tenants',
                });
            }
            // Don't allow locking yourself or other super admins
            if (userId === admin.id) {
                return reply.code(400).send({
                    error: 'BadRequest',
                    message: 'Cannot lock your own account',
                });
            }
            if (user.roles?.includes('super-admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Cannot lock super admin accounts',
                });
            }
            // Lock the account
            await this.userService.updateUser(userId, user.tenantId, {
                status: UserStatus.SUSPENDED,
                metadata: {
                    ...user.metadata,
                    lockedAt: new Date().toISOString(),
                    lockedBy: admin.id,
                    lockReason: reason || 'Locked by administrator',
                },
            });
            // Revoke all sessions
            await this.cacheManager.sessions.deleteAllUserSessions(user.tenantId, userId);
            await this.cacheManager.tokens.revokeAllUserTokens(user.tenantId, userId);
            request.log.info({ userId, adminId: admin.id, reason }, 'Account locked by admin');
            return reply.code(200).send({
                success: true,
                message: 'Account locked',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to lock account');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to lock account',
            });
        }
    }
    /**
     * POST /api/admin/users/:userId/unlock
     * Unlock a user account
     */
    async unlockAccount(request, reply) {
        try {
            const admin = request.user;
            if (!admin) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            if (!this.isAdmin(admin)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required',
                });
            }
            const { userId } = request.params;
            // Get the target user - need tenantId first, try admin's tenant
            const user = await this.userService.findById(userId, admin.tenantId);
            if (!user) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'User not found',
                });
            }
            // Check tenant access
            if (user.tenantId !== admin.tenantId && !admin.roles?.includes('super-admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Cannot manage users from other tenants',
                });
            }
            // Unlock the account
            const metadata = { ...user.metadata };
            delete metadata.lockedAt;
            delete metadata.lockedBy;
            delete metadata.lockReason;
            delete metadata.failedLoginAttempts;
            delete metadata.lastFailedLogin;
            await this.userService.updateUser(userId, user.tenantId, {
                status: UserStatus.ACTIVE,
                metadata,
            });
            request.log.info({ userId, adminId: admin.id }, 'Account unlocked by admin');
            return reply.code(200).send({
                success: true,
                message: 'Account unlocked',
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to unlock account');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to unlock account',
            });
        }
    }
    /**
     * GET /api/admin/users/:userId/security
     * Get user security status
     */
    async getUserSecurity(request, reply) {
        try {
            const admin = request.user;
            if (!admin) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            if (!this.isAdmin(admin)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Admin role required',
                });
            }
            const { userId } = request.params;
            // Get the target user - need tenantId first, try admin's tenant
            const user = await this.userService.findById(userId, admin.tenantId);
            if (!user) {
                return reply.code(404).send({
                    error: 'NotFound',
                    message: 'User not found',
                });
            }
            // Check tenant access
            if (user.tenantId !== admin.tenantId && !admin.roles?.includes('super-admin')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Cannot access users from other tenants',
                });
            }
            // Get active sessions count
            const sessions = await this.cacheManager.sessions.getUserSessions(user.tenantId, userId);
            return reply.code(200).send({
                userId: user.id,
                email: user.email,
                status: user.status,
                mfaEnabled: user.metadata?.mfaEnabled || false,
                mfaMethods: user.metadata?.mfaMethods || [],
                activeSessions: sessions?.length || 0,
                lastLogin: user.lastLoginAt,
                failedLoginAttempts: user.metadata?.failedLoginAttempts || 0,
                lockedAt: user.metadata?.lockedAt,
                lockReason: user.metadata?.lockReason,
                mustChangePassword: user.metadata?.mustChangePassword || false,
                passwordLastChanged: user.lastPasswordChangeAt,
                createdAt: user.createdAt,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get user security');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to get user security status',
            });
        }
    }
    isAdmin(user) {
        return ADMIN_ROLES.some((role) => user.roles?.includes(role));
    }
}
//# sourceMappingURL=user-security.controller.js.map