/**
 * MFA Controller
 *
 * HTTP handlers for Multi-Factor Authentication endpoints
 */
import { SessionManagementService } from '../services/auth/session-management.service.js';
const TENANT_ADMIN_ROLES = ['owner', 'admin', 'tenant-admin'];
/**
 * MFA Controller for handling multi-factor authentication requests
 */
export class MFAController {
    mfaService;
    userService;
    cacheManager;
    accessTokenExpiry;
    constructor(mfaService, options) {
        this.mfaService = mfaService;
        this.userService = options?.userService;
        this.cacheManager = options?.cacheManager;
        this.accessTokenExpiry = options?.accessTokenExpiry || '9h';
    }
    // ============================================================================
    // TOTP (Authenticator App) Endpoints
    // ============================================================================
    /**
     * POST /api/auth/mfa/enroll/totp
     * Enroll TOTP - Generate secret and QR code
     */
    async enrollTOTP(request, reply) {
        try {
            const authUser = request.user;
            if (!authUser) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            // Get full user object from database
            const user = await this.userService?.findById(authUser.id, authUser.tenantId);
            if (!user) {
                return reply.code(401).send({
                    error: 'UserNotFound',
                    message: 'User not found',
                });
            }
            const result = await this.mfaService.enrollTOTP(user.id, user.tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to enroll TOTP');
            return reply.code(400).send({
                error: 'EnrollmentFailed',
                message: error.message || 'Failed to enroll TOTP',
            });
        }
    }
    /**
     * POST /api/auth/mfa/verify/totp
     * Verify TOTP enrollment
     */
    async verifyTOTP(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const body = request.body;
            const result = await this.mfaService.verifyTOTP(body.enrollmentToken, body.code, user.id, user.tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to verify TOTP');
            return reply.code(400).send({
                error: 'VerificationFailed',
                message: error.message || 'Failed to verify TOTP',
            });
        }
    }
    // ============================================================================
    // SMS OTP Endpoints
    // ============================================================================
    /**
     * POST /api/auth/mfa/enroll/sms
     * Enroll SMS OTP
     */
    async enrollSMS(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const body = request.body;
            // Ensure user has required fields for MFA service (shared-types compatibility)
            const mfaUser = {
                ...user,
                providers: user.providers || [],
                metadata: user.metadata || {},
            };
            const result = await this.mfaService.enrollSMS(mfaUser.id, user.tenantId, body.phoneNumber);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to enroll SMS');
            return reply.code(400).send({
                error: 'EnrollmentFailed',
                message: error.message || 'Failed to enroll SMS OTP',
            });
        }
    }
    /**
     * POST /api/auth/mfa/verify/sms
     * Verify SMS enrollment
     */
    async verifySMS(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const body = request.body;
            const result = await this.mfaService.verifySMS(body.enrollmentToken, body.code, user.id, user.tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to verify SMS');
            return reply.code(400).send({
                error: 'VerificationFailed',
                message: error.message || 'Failed to verify SMS OTP',
            });
        }
    }
    // ============================================================================
    // Email OTP Endpoints
    // ============================================================================
    /**
     * POST /api/auth/mfa/enroll/email
     * Enroll Email OTP
     */
    async enrollEmail(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            // Ensure user has required fields for MFA service (shared-types compatibility)
            const mfaUser = {
                ...user,
                providers: user.providers || [],
                metadata: user.metadata || {},
            };
            const result = await this.mfaService.enrollEmail(mfaUser.id, mfaUser.tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to enroll Email OTP');
            return reply.code(400).send({
                error: 'EnrollmentFailed',
                message: error.message || 'Failed to enroll Email OTP',
            });
        }
    }
    /**
     * POST /api/auth/mfa/verify/email
     * Verify Email OTP enrollment
     */
    async verifyEmail(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const body = request.body;
            const result = await this.mfaService.verifyEmail(body.enrollmentToken, body.code, user.id, user.tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to verify Email OTP');
            return reply.code(400).send({
                error: 'VerificationFailed',
                message: error.message || 'Failed to verify Email OTP',
            });
        }
    }
    // ============================================================================
    // MFA Challenge (Login) Endpoint
    // ============================================================================
    /**
     * POST /api/auth/mfa/challenge
     * Complete MFA challenge during login
     */
    async mfaChallenge(request, reply) {
        try {
            const body = request.body;
            // Verify that we have the required dependencies
            if (!this.userService || !this.cacheManager) {
                request.log.error('MFA challenge requires userService and cacheManager');
                return reply.code(500).send({
                    error: 'ConfigurationError',
                    message: 'MFA challenge is not properly configured',
                });
            }
            // Verify challenge token
            let challengePayload;
            try {
                challengePayload = request.server.jwt.verify(body.challengeToken);
                if (challengePayload.type !== 'mfa_challenge') {
                    throw new Error('Invalid challenge token type');
                }
            }
            catch (error) {
                request.log.warn({ error }, 'Invalid MFA challenge token');
                return reply.code(401).send({
                    error: 'InvalidToken',
                    message: 'Invalid or expired challenge token',
                });
            }
            const { sub: userId, email, tenantId } = challengePayload;
            // Get user from database
            const user = await this.userService.findById(userId, tenantId);
            if (!user) {
                request.log.warn({ userId, tenantId }, 'User not found for MFA challenge');
                return reply.code(401).send({
                    error: 'UserNotFound',
                    message: 'User not found',
                });
            }
            // Verify the MFA code based on method
            let isValid = false;
            const method = body.method;
            // Ensure user has required fields for MFA service (shared-types compatibility)
            const mfaUser = {
                ...user,
                providers: user.providers || [],
                metadata: user.metadata || {},
            }; // Type assertion needed due to shared-types vs local types mismatch
            try {
                if (method === 'recovery') {
                    // Verify recovery code
                    isValid = await this.mfaService.verifyRecoveryCode(mfaUser, body.code);
                    if (isValid) {
                        request.log.info({ userId, email }, 'MFA recovery code used successfully');
                    }
                }
                else if (method === 'totp') {
                    // Verify TOTP code
                    isValid = await this.mfaService.verifyTOTPCode(mfaUser, body.code);
                }
                else if (method === 'sms') {
                    // Verify SMS OTP - need to send code first if not already sent
                    isValid = await this.mfaService.verifySMSOTP(mfaUser, body.code);
                }
                else if (method === 'email') {
                    // Verify Email OTP - need to send code first if not already sent
                    isValid = await this.mfaService.verifyEmailOTP(mfaUser, body.code);
                }
                else {
                    return reply.code(400).send({
                        error: 'InvalidMethod',
                        message: `Invalid MFA method: ${method}`,
                    });
                }
            }
            catch (error) {
                request.log.warn({ error, userId, method }, 'MFA verification error');
                return reply.code(400).send({
                    error: 'VerificationFailed',
                    message: error.message || 'Failed to verify MFA code',
                });
            }
            if (!isValid) {
                request.log.warn({ userId, email, method }, 'Invalid MFA code');
                return reply.code(401).send({
                    error: 'InvalidCode',
                    message: 'Invalid verification code',
                });
            }
            // Trust device if requested
            const deviceFingerprint = body.deviceFingerprint || challengePayload.deviceFingerprint;
            const shouldTrustDevice = body.trustDevice ?? challengePayload.rememberDevice;
            if (shouldTrustDevice && deviceFingerprint) {
                try {
                    const userAgent = request.headers['user-agent'];
                    const ipAddress = request.ip;
                    await this.mfaService.addTrustedDevice(userId, tenantId, deviceFingerprint, userAgent, ipAddress);
                    request.log.info({ userId, deviceFingerprint: deviceFingerprint.substring(0, 8) }, 'Device trusted');
                }
                catch (error) {
                    // Non-critical error, continue with login
                    request.log.warn({ error }, 'Failed to add trusted device');
                }
            }
            // Generate full access token
            const accessToken = request.server.jwt.sign({
                sub: user.id,
                email: user.email,
                tenantId: user.tenantId,
                isDefaultTenant: user.isDefaultTenant ?? false,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.roles?.[0] || 'user',
                roles: user.roles || [],
                organizationId: user.organizationId,
                status: user.status,
                type: 'access',
                mfaVerified: true,
            }, {
                expiresIn: this.accessTokenExpiry,
            });
            // Create refresh token and store in Redis
            const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(user.id, user.tenantId);
            // Extract device and location metadata from request
            const metadata = SessionManagementService.extractSessionMetadata(request);
            // Create session with device tracking
            await this.cacheManager.sessions.createSession(user.id, user.tenantId, {
                email: user.email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                provider: 'email',
                deviceInfo: metadata.deviceInfo,
                locationInfo: metadata.locationInfo,
            });
            request.log.info({ userId, email, method }, 'MFA challenge completed successfully');
            const response = {
                accessToken,
                refreshToken: refreshTokenResult.token,
                expiresIn: this.accessTokenExpiry,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    tenantId: user.tenantId,
                },
            };
            return reply.code(200).send(response);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to complete MFA challenge');
            return reply.code(400).send({
                error: 'ChallengeFailed',
                message: error.message || 'Failed to complete MFA challenge',
            });
        }
    }
    /**
     * POST /api/auth/mfa/send-code
     * Send OTP code for SMS or Email MFA during login challenge
     */
    async sendMFACode(request, reply) {
        try {
            const { challengeToken, method } = request.body;
            // Verify that we have the required dependencies
            if (!this.userService) {
                return reply.code(500).send({
                    error: 'ConfigurationError',
                    message: 'MFA send code is not properly configured',
                });
            }
            // Verify challenge token
            let challengePayload;
            try {
                challengePayload = request.server.jwt.verify(challengeToken);
                if (challengePayload.type !== 'mfa_challenge') {
                    throw new Error('Invalid challenge token type');
                }
            }
            catch (error) {
                return reply.code(401).send({
                    error: 'InvalidToken',
                    message: 'Invalid or expired challenge token',
                });
            }
            // Check if the requested method is available for this user
            if (!challengePayload.availableMethods.includes(method)) {
                return reply.code(400).send({
                    error: 'MethodNotAvailable',
                    message: `MFA method '${method}' is not available for this user`,
                });
            }
            const { sub: userId, tenantId } = challengePayload;
            // Get user from database
            const user = await this.userService.findById(userId, tenantId);
            if (!user) {
                return reply.code(401).send({
                    error: 'UserNotFound',
                    message: 'User not found',
                });
            }
            // Ensure user has required fields for MFA service (shared-types compatibility)
            const mfaUser = {
                ...user,
                providers: user.providers || [],
                metadata: user.metadata || {},
            };
            // Send the code based on method
            try {
                if (method === 'sms') {
                    await this.mfaService.sendSMSOTP(mfaUser);
                    request.log.info({ userId, method: 'sms' }, 'SMS OTP sent for MFA challenge');
                }
                else if (method === 'email') {
                    await this.mfaService.sendEmailOTP(mfaUser);
                    request.log.info({ userId, method: 'email' }, 'Email OTP sent for MFA challenge');
                }
                return reply.code(200).send({
                    success: true,
                    method,
                    message: `Verification code sent via ${method.toUpperCase()}`,
                    expiresInSeconds: 300, // 5 minutes
                });
            }
            catch (error) {
                request.log.error({ error, userId, method }, 'Failed to send MFA code');
                return reply.code(400).send({
                    error: 'SendFailed',
                    message: error.message || `Failed to send ${method.toUpperCase()} code`,
                });
            }
        }
        catch (error) {
            request.log.error({ error }, 'Failed to process send MFA code request');
            return reply.code(400).send({
                error: 'RequestFailed',
                message: error.message || 'Failed to send MFA code',
            });
        }
    }
    // ============================================================================
    // MFA Method Management
    // ============================================================================
    /**
     * GET /api/auth/mfa/methods
     * List user's MFA methods
     */
    async listMFAMethods(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const result = await this.mfaService.listMFAMethods(user.id, user.tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list MFA methods');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to list MFA methods',
            });
        }
    }
    /**
     * POST /api/auth/mfa/disable/:method
     * Disable an MFA method
     */
    async disableMFAMethod(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { method } = request.params;
            const body = request.body;
            await this.mfaService.disableMFAMethod(user.id, user.tenantId, method, body.password, body.mfaCode);
            return reply.code(200).send({
                success: true,
                message: `${method.toUpperCase()} has been disabled`,
            });
        }
        catch (error) {
            request.log.error({ error }, 'Failed to disable MFA method');
            return reply.code(400).send({
                error: 'DisableFailed',
                message: error.message || 'Failed to disable MFA method',
            });
        }
    }
    // ============================================================================
    // Recovery Codes
    // ============================================================================
    /**
     * POST /api/auth/mfa/recovery-codes/generate
     * Generate new recovery codes
     */
    async generateRecoveryCodes(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const body = request.body;
            const result = await this.mfaService.generateRecoveryCodes(user.id, user.tenantId, body.password, body.mfaCode);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to generate recovery codes');
            return reply.code(400).send({
                error: 'GenerationFailed',
                message: error.message || 'Failed to generate recovery codes',
            });
        }
    }
    // ============================================================================
    // Tenant MFA Policy (Admin Endpoints)
    // ============================================================================
    /**
     * GET /api/tenants/:tenantId/mfa/policy
     * Get tenant MFA policy
     */
    async getMFAPolicy(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId } = request.params;
            // Verify user has access to this tenant
            if (user.tenantId !== tenantId) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied to this tenant',
                });
            }
            if (!this.isTenantAdmin(user, tenantId)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Tenant administrator role required',
                });
            }
            const result = await this.mfaService.getMFAPolicy(tenantId);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get MFA policy');
            return reply.code(500).send({
                error: 'InternalError',
                message: 'Failed to get MFA policy',
            });
        }
    }
    /**
     * POST /api/tenants/:tenantId/mfa/policy
     * Update tenant MFA policy
     */
    async updateMFAPolicy(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }
            const { tenantId } = request.params;
            // Verify user has access to this tenant
            if (user.tenantId !== tenantId) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Access denied to this tenant',
                });
            }
            if (!this.isTenantAdmin(user, tenantId)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Tenant administrator role required',
                });
            }
            const body = request.body;
            const updateRequest = {
                tenantId,
                enforcement: body.enforcement,
                gracePeriodDays: body.gracePeriodDays,
                allowedMethods: body.allowedMethods,
                updatedBy: user.id,
            };
            const result = await this.mfaService.updateMFAPolicy(updateRequest);
            return reply.code(200).send(result);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update MFA policy');
            return reply.code(400).send({
                error: 'UpdateFailed',
                message: error.message || 'Failed to update MFA policy',
            });
        }
    }
    // ============================================================================
    // Helper Methods for Auth Controller Integration
    // ============================================================================
    /**
     * Helper: Check if user has active MFA
     * This will be used by auth controller during login
     */
    async userHasActiveMFA(userId, tenantId) {
        try {
            const methods = await this.mfaService.listMFAMethods(userId, tenantId);
            return methods.hasActiveMFA;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Helper: Send MFA code for specified method
     * This will be used by auth controller to send OTP during login
     */
    async sendMFACodeHelper(userId, tenantId, method) {
        if (!this.userService || !this.mfaService) {
            throw new Error('MFA service not properly configured');
        }
        const user = await this.userService.findById(userId, tenantId);
        if (!user) {
            throw new Error('User not found');
        }
        // Ensure user has required fields for MFA service (shared-types compatibility)
        const mfaUser = {
            ...user,
            providers: user.providers || [],
            metadata: user.metadata || {},
        };
        if (method === 'sms') {
            await this.mfaService.sendSMSOTP(mfaUser);
        }
        else if (method === 'email') {
            await this.mfaService.sendEmailOTP(mfaUser);
        }
        else {
            throw new Error(`MFA method ${method} does not support code sending`);
        }
    }
    /**
     * Helper: Verify MFA code for login
     */
    async verifyMFACodeForLogin(userId, tenantId, method, code, user) {
        if (method === 'recovery') {
            return this.verifyRecoveryCodeForLogin(userId, tenantId, code, user);
        }
        if (method === 'totp') {
            return this.verifyTOTPForLogin(userId, tenantId, code, user);
        }
        if (method === 'sms' || method === 'email') {
            return this.verifyOTPForLogin(userId, tenantId, method, code, user);
        }
        return false;
    }
    /**
     * Helper: Check if device is trusted
     * This will be used by auth controller to skip MFA for trusted devices
     */
    async checkTrustedDevice(userId, tenantId, deviceFingerprint) {
        try {
            return await this.mfaService.isDeviceTrusted(userId, tenantId, deviceFingerprint);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Helper: Get available MFA methods for login challenge
     * Returns array of method types that are active
     */
    async getMFAMethodsForChallenge(userId, tenantId) {
        try {
            const result = await this.mfaService.listMFAMethods(userId, tenantId);
            return result.methods
                .filter((m) => m.status === 'active')
                .map((m) => m.type);
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Helper: Verify TOTP code during login
     */
    async verifyTOTPForLogin(_userId, _tenantId, code, user) {
        try {
            return await this.mfaService.verifyTOTPCode(user, code);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Helper: Verify OTP code (SMS/Email) during login
     */
    async verifyOTPForLogin(_userId, _tenantId, method, code, user) {
        try {
            if (method === 'sms') {
                return await this.mfaService.verifySMSOTP(user, code);
            }
            else {
                return await this.mfaService.verifyEmailOTP(user, code);
            }
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Helper: Verify recovery code during login
     */
    async verifyRecoveryCodeForLogin(_userId, _tenantId, code, user) {
        try {
            return await this.mfaService.verifyRecoveryCode(user, code);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Helper: Add trusted device
     * This will be used by auth controller after successful MFA
     */
    async trustDevice(userId, tenantId, deviceFingerprint, userAgent, ipAddress) {
        await this.mfaService.addTrustedDevice(userId, tenantId, deviceFingerprint, userAgent, ipAddress);
    }
    isTenantAdmin(user, tenantId) {
        if (!user || user.tenantId !== tenantId) {
            return false;
        }
        return TENANT_ADMIN_ROLES.some((role) => user.roles?.includes(role));
    }
    // ============================================================================
    // Setup Flow Helper Methods (Phase 3)
    // ============================================================================
    /**
     * Initiate TOTP setup - wrapper around enrollTOTP
     */
    async initiateTOTPSetup(userId, tenantId) {
        return this.mfaService.enrollTOTP(userId, tenantId);
    }
    /**
     * Complete TOTP setup - wrapper around verifyTOTP
     */
    async completeTOTPSetup(userId, tenantId, code) {
        try {
            // Get pending enrollment
            const enrollment = await this.mfaService.getPendingEnrollment(userId, tenantId, 'totp');
            if (!enrollment) {
                return { success: false };
            }
            const result = await this.mfaService.verifyTOTP(enrollment.enrollmentToken, code, userId, tenantId);
            return { success: result.success };
        }
        catch (error) {
            return { success: false };
        }
    }
    /**
     * Initiate SMS setup
     */
    async initiateSMSSetup(userId, tenantId, phoneNumber) {
        return this.mfaService.enrollSMS(userId, tenantId, phoneNumber);
    }
    /**
     * Complete SMS setup
     */
    async completeSMSSetup(userId, tenantId, code) {
        try {
            const enrollment = await this.mfaService.getPendingEnrollment(userId, tenantId, 'sms');
            if (!enrollment) {
                return { success: false };
            }
            const result = await this.mfaService.verifySMS(enrollment.enrollmentToken, code, userId, tenantId);
            return { success: result.success };
        }
        catch (error) {
            return { success: false };
        }
    }
    /**
     * Initiate email setup
     */
    async initiateEmailSetup(userId, tenantId) {
        return this.mfaService.enrollEmail(userId, tenantId);
    }
    /**
     * Complete email setup
     */
    async completeEmailSetup(userId, tenantId, code) {
        try {
            const enrollment = await this.mfaService.getPendingEnrollment(userId, tenantId, 'email');
            if (!enrollment) {
                return { success: false };
            }
            const result = await this.mfaService.verifyEmail(enrollment.enrollmentToken, code, userId, tenantId);
            return { success: result.success };
        }
        catch (error) {
            return { success: false };
        }
    }
    /**
     * Get user's active MFA methods
     */
    async getUserMFAMethods(userId, tenantId) {
        const methods = await this.mfaService.getUserMFAMethods(userId, tenantId);
        return methods.map(m => ({
            id: m.id,
            type: m.method,
            createdAt: m.createdAt
        }));
    }
    /**
     * Remove MFA method
     */
    async removeMFAMethod(userId, tenantId, methodId) {
        try {
            // methodId should be the method type (totp, sms, email)
            await this.mfaService.disableMFAMethod(userId, tenantId, methodId);
            return { success: true };
        }
        catch (error) {
            return { success: false };
        }
    }
    /**
     * Generate backup codes
     */
    async generateBackupCodes(userId, tenantId) {
        const result = await this.mfaService.generateRecoveryCodes(userId, tenantId);
        return result.recoveryCodes;
    }
    /**
     * Regenerate backup codes
     */
    async regenerateBackupCodes(userId, tenantId) {
        // First, invalidate existing codes
        await this.mfaService.invalidateRecoveryCodes(userId, tenantId);
        // Then generate new ones
        const result = await this.mfaService.generateRecoveryCodes(userId, tenantId);
        return result.recoveryCodes;
    }
}
//# sourceMappingURL=mfa.controller.js.map