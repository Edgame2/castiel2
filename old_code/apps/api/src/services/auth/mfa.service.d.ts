/**
 * Multi-Factor Authentication Service
 *
 * Handles all MFA-related operations including:
 * - TOTP (Time-based One-Time Password) enrollment and verification
 * - SMS OTP enrollment and verification
 * - Email OTP enrollment and verification
 * - Recovery codes generation and verification
 * - Trusted device management
 * - MFA policy enforcement
 */
import type { FastifyInstance } from 'fastify';
import type { Container } from '@azure/cosmos';
import type { Redis as RedisType } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { User } from '@castiel/shared-types';
import type { MFAMethodType, EnrollTOTPResponse, EnrollSMSResponse, EnrollEmailResponse, MFAEnrollmentVerificationResponse, ListMFAMethodsResponse, GenerateRecoveryCodesResponse, MFAPolicyResponse, UpdateMFAPolicyRequest } from '../../types/mfa.types.js';
import type { EmailService } from './email.service.js';
/**
 * MFA Service for handling multi-factor authentication operations
 */
export declare class MFAService {
    private readonly server;
    private readonly redis;
    private readonly usersContainer;
    private readonly tenantsContainer;
    private readonly emailService;
    private readonly monitoring?;
    constructor(server: FastifyInstance, redis: RedisType, usersContainer: Container, tenantsContainer: Container, emailService: EmailService, monitoring?: IMonitoringProvider | undefined);
    /**
     * Enroll TOTP - Generate secret and QR code
     */
    enrollTOTP(userId: string, tenantId: string): Promise<EnrollTOTPResponse>;
    /**
     * Verify TOTP enrollment
     */
    verifyTOTP(enrollmentToken: string, code: string, userId: string, tenantId: string): Promise<MFAEnrollmentVerificationResponse>;
    /**
     * Verify TOTP code for login challenge
     */
    verifyTOTPCode(user: User, code: string): Promise<boolean>;
    /**
     * Enroll SMS OTP
     */
    enrollSMS(userId: string, tenantId: string, phoneNumber: string): Promise<EnrollSMSResponse>;
    /**
     * Verify SMS enrollment
     */
    verifySMS(enrollmentToken: string, code: string, userId: string, tenantId: string): Promise<MFAEnrollmentVerificationResponse>;
    /**
     * Send SMS OTP for login challenge
     */
    sendSMSOTP(user: User): Promise<void>;
    /**
     * Verify SMS OTP for login challenge
     */
    verifySMSOTP(user: User, code: string): Promise<boolean>;
    /**
     * Enroll Email OTP
     */
    enrollEmail(userId: string, tenantId: string): Promise<EnrollEmailResponse>;
    /**
     * Verify Email OTP enrollment
     */
    verifyEmail(enrollmentToken: string, code: string, userId: string, tenantId: string): Promise<MFAEnrollmentVerificationResponse>;
    /**
     * Send Email OTP for login challenge
     */
    sendEmailOTP(user: User): Promise<void>;
    /**
     * Verify Email OTP for login challenge
     */
    verifyEmailOTP(user: User, code: string): Promise<boolean>;
    /**
     * Generate recovery codes for a user
     */
    generateRecoveryCodes(userId: string, tenantId: string, password?: string, mfaCode?: string): Promise<GenerateRecoveryCodesResponse>;
    /**
     * Internal method to generate recovery codes
     */
    private generateRecoveryCodesInternal;
    /**
     * Verify recovery code
     */
    verifyRecoveryCode(user: User, code: string): Promise<boolean>;
    /**
     * List user's MFA methods
     */
    listMFAMethods(userId: string, tenantId: string): Promise<ListMFAMethodsResponse>;
    /**
     * Disable an MFA method
     */
    disableMFAMethod(userId: string, tenantId: string, method: MFAMethodType, password?: string, mfaCode?: string): Promise<void>;
    /**
     * Add trusted device
     */
    addTrustedDevice(userId: string, tenantId: string, fingerprint: string, userAgent?: string, ipAddress?: string): Promise<void>;
    /**
     * Check if device is trusted
     */
    isDeviceTrusted(userId: string, tenantId: string, fingerprint: string): Promise<boolean>;
    /**
     * Get tenant MFA policy
     */
    getMFAPolicy(tenantId: string): Promise<MFAPolicyResponse>;
    /**
     * Update tenant MFA policy
     */
    updateMFAPolicy(request: UpdateMFAPolicyRequest): Promise<MFAPolicyResponse>;
    /**
     * Check if user is required to have MFA based on tenant policy
     */
    isMFARequired(userId: string, tenantId: string): Promise<boolean>;
    /**
     * Get user from database
     */
    private getUser;
    /**
     * Update user in database
     */
    private updateUser;
    /**
     * Invalidate user cache
     */
    private invalidateUserCache;
    /**
     * Encrypt secret for storage
     */
    private encryptSecret;
    /**
     * Decrypt secret from storage
     */
    private decryptSecret;
    /**
     * Generate 6-digit OTP
     */
    private generateOTP;
    /**
     * Hash OTP for storage
     */
    private hashOTP;
    /**
     * Verify OTP against hash
     */
    private verifyOTPHash;
    /**
     * Generate recovery code (format: XXXX-XXXX-XXXX)
     */
    private generateRecoveryCode;
    /**
     * Mask phone number for display
     */
    private maskPhoneNumber;
    /**
     * Mask email for display
     */
    private maskEmail;
    /**
     * Get masked info for MFA method
     */
    private getMaskedInfo;
    /**
     * Send SMS (placeholder - integrate with Twilio/AWS SNS)
     */
    private sendSMS;
    /**
     * Get pending enrollment state
     */
    getPendingEnrollment(userId: string, tenantId: string, method: MFAMethodType): Promise<{
        enrollmentToken: string;
    } | null>;
    /**
     * Get user's MFA methods (lightweight version)
     */
    getUserMFAMethods(userId: string, tenantId: string): Promise<Array<{
        id: string;
        method: MFAMethodType;
        createdAt: Date;
        status: string;
    }>>;
    /**
     * Invalidate all recovery codes for a user
     */
    invalidateRecoveryCodes(userId: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=mfa.service.d.ts.map