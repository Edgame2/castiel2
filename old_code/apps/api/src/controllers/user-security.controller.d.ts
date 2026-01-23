/**
 * User Security Controller
 *
 * Admin endpoints for managing user security settings
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserService } from '../services/auth/user.service.js';
import type { MFAService } from '../services/auth/mfa.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { UnifiedEmailService } from '../services/email/index.js';
/**
 * User Security Controller
 */
export declare class UserSecurityController {
    private readonly userService;
    private readonly mfaService;
    private readonly cacheManager;
    private readonly emailService;
    private readonly frontendUrl;
    constructor(userService: UserService, mfaService: MFAService, cacheManager: CacheManager, emailService: UnifiedEmailService, frontendUrl: string);
    /**
     * POST /api/admin/users/:userId/force-password-reset
     * Force a password reset for a user
     */
    forcePasswordReset(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/users/:userId/revoke-sessions
     * Revoke all sessions for a user
     */
    revokeSessions(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/users/:userId/disable-mfa
     * Disable MFA for a user (admin action)
     */
    disableMFA(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/users/:userId/lock
     * Lock a user account
     */
    lockAccount(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/admin/users/:userId/unlock
     * Unlock a user account
     */
    unlockAccount(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/admin/users/:userId/security
     * Get user security status
     */
    getUserSecurity(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    private isAdmin;
}
//# sourceMappingURL=user-security.controller.d.ts.map