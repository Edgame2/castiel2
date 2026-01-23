/**
 * MFA Controller
 *
 * HTTP handlers for Multi-Factor Authentication endpoints
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MFAService } from '../services/auth/mfa.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { MFAMethodType } from '../types/mfa.types.js';
/**
 * MFA Controller for handling multi-factor authentication requests
 */
export declare class MFAController {
    private readonly mfaService;
    private readonly userService?;
    private readonly cacheManager?;
    private readonly accessTokenExpiry;
    constructor(mfaService: MFAService, options?: {
        userService?: UserService;
        cacheManager?: CacheManager;
        accessTokenExpiry?: string;
    });
    /**
     * POST /api/auth/mfa/enroll/totp
     * Enroll TOTP - Generate secret and QR code
     */
    enrollTOTP(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/verify/totp
     * Verify TOTP enrollment
     */
    verifyTOTP(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/enroll/sms
     * Enroll SMS OTP
     */
    enrollSMS(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/verify/sms
     * Verify SMS enrollment
     */
    verifySMS(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/enroll/email
     * Enroll Email OTP
     */
    enrollEmail(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/verify/email
     * Verify Email OTP enrollment
     */
    verifyEmail(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/challenge
     * Complete MFA challenge during login
     */
    mfaChallenge(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/send-code
     * Send OTP code for SMS or Email MFA during login challenge
     */
    sendMFACode(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/auth/mfa/methods
     * List user's MFA methods
     */
    listMFAMethods(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/disable/:method
     * Disable an MFA method
     */
    disableMFAMethod(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/auth/mfa/recovery-codes/generate
     * Generate new recovery codes
     */
    generateRecoveryCodes(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * GET /api/tenants/:tenantId/mfa/policy
     * Get tenant MFA policy
     */
    getMFAPolicy(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * POST /api/tenants/:tenantId/mfa/policy
     * Update tenant MFA policy
     */
    updateMFAPolicy(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Helper: Check if user has active MFA
     * This will be used by auth controller during login
     */
    userHasActiveMFA(userId: string, tenantId: string): Promise<boolean>;
    /**
     * Helper: Send MFA code for specified method
     * This will be used by auth controller to send OTP during login
     */
    sendMFACodeHelper(userId: string, tenantId: string, method: MFAMethodType): Promise<void>;
    /**
     * Helper: Verify MFA code for login
     */
    verifyMFACodeForLogin(userId: string, tenantId: string, method: MFAMethodType | 'recovery', code: string, user: any): Promise<boolean>;
    /**
     * Helper: Check if device is trusted
     * This will be used by auth controller to skip MFA for trusted devices
     */
    checkTrustedDevice(userId: string, tenantId: string, deviceFingerprint: string): Promise<boolean>;
    /**
     * Helper: Get available MFA methods for login challenge
     * Returns array of method types that are active
     */
    getMFAMethodsForChallenge(userId: string, tenantId: string): Promise<MFAMethodType[]>;
    /**
     * Helper: Verify TOTP code during login
     */
    verifyTOTPForLogin(_userId: string, _tenantId: string, code: string, user: any): Promise<boolean>;
    /**
     * Helper: Verify OTP code (SMS/Email) during login
     */
    verifyOTPForLogin(_userId: string, _tenantId: string, method: 'sms' | 'email', code: string, user: any): Promise<boolean>;
    /**
     * Helper: Verify recovery code during login
     */
    verifyRecoveryCodeForLogin(_userId: string, _tenantId: string, code: string, user: any): Promise<boolean>;
    /**
     * Helper: Add trusted device
     * This will be used by auth controller after successful MFA
     */
    trustDevice(userId: string, tenantId: string, deviceFingerprint: string, userAgent?: string, ipAddress?: string): Promise<void>;
    private isTenantAdmin;
    /**
     * Initiate TOTP setup - wrapper around enrollTOTP
     */
    initiateTOTPSetup(userId: string, tenantId: string): Promise<import("../types/mfa.types.js").EnrollTOTPResponse>;
    /**
     * Complete TOTP setup - wrapper around verifyTOTP
     */
    completeTOTPSetup(userId: string, tenantId: string, code: string): Promise<{
        success: boolean;
    }>;
    /**
     * Initiate SMS setup
     */
    initiateSMSSetup(userId: string, tenantId: string, phoneNumber: string): Promise<import("../types/mfa.types.js").EnrollSMSResponse>;
    /**
     * Complete SMS setup
     */
    completeSMSSetup(userId: string, tenantId: string, code: string): Promise<{
        success: boolean;
    }>;
    /**
     * Initiate email setup
     */
    initiateEmailSetup(userId: string, tenantId: string): Promise<import("../types/mfa.types.js").EnrollEmailResponse>;
    /**
     * Complete email setup
     */
    completeEmailSetup(userId: string, tenantId: string, code: string): Promise<{
        success: boolean;
    }>;
    /**
     * Get user's active MFA methods
     */
    getUserMFAMethods(userId: string, tenantId: string): Promise<Array<{
        id: string;
        type: MFAMethodType;
        createdAt: Date;
    }>>;
    /**
     * Remove MFA method
     */
    removeMFAMethod(userId: string, tenantId: string, methodId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Generate backup codes
     */
    generateBackupCodes(userId: string, tenantId: string): Promise<string[]>;
    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes(userId: string, tenantId: string): Promise<string[]>;
}
//# sourceMappingURL=mfa.controller.d.ts.map