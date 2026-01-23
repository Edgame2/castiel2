import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserService } from '../services/auth/user.service.js';
import type { EmailService } from '../services/auth/email.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { TenantService } from '../services/auth/tenant.service.js';
import type { TenantJoinRequestService } from '../services/auth/tenant-join-request.service.js';
import type { MFAController } from './mfa.controller.js';
import type { AuditLogService } from '../services/audit/audit-log.service.js';
import type { DeviceSecurityService } from '../services/security/device-security.service.js';
import type { RoleManagementService } from '../services/auth/role-management.service.js';
/**
 * Authentication controller
 */
export declare class AuthController {
    private userService;
    private emailService;
    private cacheManager;
    private publicApiUrl;
    private accessTokenExpiry;
    private mfaController?;
    private tenantService;
    private tenantJoinRequestService;
    private auditLogService?;
    private deviceSecurityService?;
    private roleManagementService?;
    private mfaPolicyService?;
    constructor(userService: UserService, emailService: EmailService, cacheManager: CacheManager, publicApiUrl: string, accessTokenExpiry: string | undefined, tenantService: TenantService, tenantJoinRequestService: TenantJoinRequestService, mfaController?: MFAController, auditLogService?: AuditLogService, deviceSecurityService?: DeviceSecurityService, roleManagementService?: RoleManagementService);
    /**
     * Log authentication event
     */
    private logAuthEvent;
    private getUserPermissions;
    /**
     * Register a new user
     * POST /auth/register
     */
    register(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Login with email and password
     * POST /auth/login
     */
    login(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Verify email address
     * GET /auth/verify-email/:token
     */
    verifyEmail(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Resend verification email
     * POST /auth/resend-verification
     */
    resendVerificationEmail(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Request password reset
     * POST /auth/forgot-password
     */
    forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Reset password with token
     * POST /auth/reset-password
     */
    resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Refresh access token
     * POST /auth/refresh
     */
    refreshToken(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Logout
     * POST /auth/logout
     */
    logout(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Revoke refresh token
     * POST /auth/revoke
     */
    revokeToken(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Token introspection (for resource servers)
     * POST /auth/introspect
     */
    introspectToken(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Complete MFA challenge and get access token
     * POST /auth/mfa/verify
     */
    completeMFAChallenge(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Generate device fingerprint from request metadata
     */
    private generateDeviceFingerprint;
    /**
     * Verify MFA code for login
     */
    private verifyMFACode;
    /**
     * Get current user profile
     * GET /auth/me
     */
    getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Update current user profile
     * PATCH /auth/me
     */
    updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * List tenant memberships for current user
     * GET /auth/tenants
     */
    listUserTenants(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Update default tenant for user
     * PATCH /auth/default-tenant
     */
    updateDefaultTenant(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Switch to a different tenant context
     * POST /auth/switch-tenant
     * Issues new tokens for the specified tenant
     */
    switchTenant(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    private extractDomainFromEmail;
    private normalizeDomain;
    private buildTenantMembershipResponse;
    private notifyTenantAdmins;
    /**
     * Check registration eligibility
     * POST /auth/check-registration
     *
     * Step 1 of 2-step registration process.
     * Checks email to determine registration flow:
     * - active_user: User is active in a tenant -> redirect to login
     * - pending_user: User exists but pending approval
     * - tenant_exists: Email domain matches existing tenant -> request to join
     * - no_tenant: No matching tenant -> create new tenant
     */
    checkRegistration(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map