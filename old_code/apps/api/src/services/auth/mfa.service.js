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
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import argon2 from 'argon2';
/**
 * MFA Service for handling multi-factor authentication operations
 */
export class MFAService {
    server;
    redis;
    usersContainer;
    tenantsContainer;
    emailService;
    monitoring;
    constructor(server, redis, usersContainer, tenantsContainer, emailService, monitoring) {
        this.server = server;
        this.redis = redis;
        this.usersContainer = usersContainer;
        this.tenantsContainer = tenantsContainer;
        this.emailService = emailService;
        this.monitoring = monitoring;
    }
    // ============================================================================
    // TOTP (Authenticator App) Methods
    // ============================================================================
    /**
     * Enroll TOTP - Generate secret and QR code
     */
    async enrollTOTP(userId, tenantId) {
        this.server.log.info({ userId, tenantId }, 'Enrolling TOTP');
        // Check if user already has TOTP enabled
        const user = await this.getUser(userId, tenantId);
        const existingTOTP = user.mfaMethods?.find(m => m.type === 'totp' && m.status === 'active');
        if (existingTOTP) {
            throw new Error('TOTP is already enabled for this user');
        }
        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `Castiel (${user.email})`,
            issuer: 'Castiel',
            length: 32,
        });
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
        // Format manual entry code (add spaces every 4 characters for readability)
        const manualEntryCode = secret.base32.match(/.{1,4}/g)?.join(' ') || secret.base32;
        // Create enrollment token (valid for 10 minutes)
        const enrollmentToken = crypto.randomBytes(32).toString('hex');
        const enrollmentState = {
            userId,
            tenantId,
            method: 'totp',
            secret: secret.base32,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            attempts: 0,
        };
        // Store enrollment state in Redis
        await this.redis.setex(`mfa:enrollment:${enrollmentToken}`, 10 * 60, // 10 minutes
        JSON.stringify(enrollmentState));
        return {
            secret: secret.base32,
            qrCodeDataUrl,
            manualEntryCode,
            otpauthUrl: secret.otpauth_url,
            enrollmentToken,
        };
    }
    /**
     * Verify TOTP enrollment
     */
    async verifyTOTP(enrollmentToken, code, userId, tenantId) {
        this.server.log.info({ userId, tenantId }, 'Verifying TOTP enrollment');
        // Get enrollment state
        const stateStr = await this.redis.get(`mfa:enrollment:${enrollmentToken}`);
        if (!stateStr) {
            throw new Error('Invalid or expired enrollment token');
        }
        const state = JSON.parse(stateStr);
        // Validate user
        if (state.userId !== userId || state.tenantId !== tenantId || state.method !== 'totp') {
            throw new Error('Invalid enrollment token');
        }
        // Check attempts
        if (state.attempts >= 5) {
            await this.redis.del(`mfa:enrollment:${enrollmentToken}`);
            throw new Error('Too many failed attempts. Please start enrollment again.');
        }
        // Verify TOTP code
        const verified = speakeasy.totp.verify({
            secret: state.secret,
            encoding: 'base32',
            token: code,
            window: 2, // Allow 2 time steps before/after for clock drift
        });
        if (!verified) {
            // Increment attempts
            state.attempts++;
            await this.redis.setex(`mfa:enrollment:${enrollmentToken}`, 10 * 60, JSON.stringify(state));
            throw new Error('Invalid verification code');
        }
        // Encrypt secret before storing
        const encryptedSecret = this.encryptSecret(state.secret);
        // Save TOTP method to user
        const user = await this.getUser(userId, tenantId);
        const mfaMethod = {
            type: 'totp',
            status: 'active',
            enrolledAt: new Date(),
            verifiedAt: new Date(),
            secret: encryptedSecret,
        };
        if (!user.mfaMethods) {
            user.mfaMethods = [];
        }
        // Remove any pending TOTP methods
        user.mfaMethods = user.mfaMethods.filter(m => !(m.type === 'totp' && m.status === 'pending'));
        user.mfaMethods.push(mfaMethod);
        user.updatedAt = new Date();
        await this.updateUser(user);
        // Generate recovery codes if this is the first MFA method
        let recoveryCodes;
        if (user.mfaMethods.filter(m => m.status === 'active').length === 1) {
            recoveryCodes = await this.generateRecoveryCodesInternal(user);
        }
        // Delete enrollment state
        await this.redis.del(`mfa:enrollment:${enrollmentToken}`);
        // Invalidate user cache
        await this.invalidateUserCache(userId, tenantId);
        return {
            success: true,
            method: mfaMethod,
            recoveryCodes,
            message: 'TOTP successfully enrolled',
        };
    }
    /**
     * Verify TOTP code for login challenge
     */
    async verifyTOTPCode(user, code) {
        const totpMethod = user.mfaMethods?.find(m => m.type === 'totp' && m.status === 'active');
        if (!totpMethod || !totpMethod.secret) {
            return false;
        }
        const decryptedSecret = this.decryptSecret(totpMethod.secret);
        const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: code,
            window: 2,
        });
        if (verified) {
            // Update last used timestamp
            totpMethod.lastUsedAt = new Date();
            user.updatedAt = new Date();
            await this.updateUser(user);
            await this.invalidateUserCache(user.id, user.tenantId);
        }
        return verified;
    }
    // ============================================================================
    // SMS OTP Methods
    // ============================================================================
    /**
     * Enroll SMS OTP
     */
    async enrollSMS(userId, tenantId, phoneNumber) {
        this.server.log.info({ userId, tenantId, phoneNumber }, 'Enrolling SMS OTP');
        // Validate phone number format (E.164)
        if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
            throw new Error('Invalid phone number format. Use E.164 format (e.g., +14155552671)');
        }
        // Check if user already has SMS enabled
        const user = await this.getUser(userId, tenantId);
        const existingSMS = user.mfaMethods?.find(m => m.type === 'sms' && m.status === 'active');
        if (existingSMS) {
            throw new Error('SMS OTP is already enabled for this user');
        }
        // Generate 6-digit OTP
        const otp = this.generateOTP();
        // Create enrollment token
        const enrollmentToken = crypto.randomBytes(32).toString('hex');
        const enrollmentState = {
            userId,
            tenantId,
            method: 'sms',
            phoneNumber,
            otp: await this.hashOTP(otp),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            attempts: 0,
        };
        // Store enrollment state
        await this.redis.setex(`mfa:enrollment:${enrollmentToken}`, 10 * 60, JSON.stringify(enrollmentState));
        // Send SMS (TODO: Integrate with Twilio or similar)
        await this.sendSMS(phoneNumber, `Your Castiel verification code is: ${otp}`);
        return {
            maskedPhoneNumber: this.maskPhoneNumber(phoneNumber),
            enrollmentToken,
            expiresInSeconds: 600,
        };
    }
    /**
     * Verify SMS enrollment
     */
    async verifySMS(enrollmentToken, code, userId, tenantId) {
        this.server.log.info({ userId, tenantId }, 'Verifying SMS enrollment');
        // Get enrollment state
        const stateStr = await this.redis.get(`mfa:enrollment:${enrollmentToken}`);
        if (!stateStr) {
            throw new Error('Invalid or expired enrollment token');
        }
        const state = JSON.parse(stateStr);
        // Validate
        if (state.userId !== userId || state.tenantId !== tenantId || state.method !== 'sms') {
            throw new Error('Invalid enrollment token');
        }
        // Check attempts
        if (state.attempts >= 5) {
            await this.redis.del(`mfa:enrollment:${enrollmentToken}`);
            throw new Error('Too many failed attempts');
        }
        // Verify OTP
        const valid = await this.verifyOTPHash(code, state.otp);
        if (!valid) {
            state.attempts++;
            await this.redis.setex(`mfa:enrollment:${enrollmentToken}`, 10 * 60, JSON.stringify(state));
            throw new Error('Invalid verification code');
        }
        // Save SMS method to user
        const user = await this.getUser(userId, tenantId);
        const mfaMethod = {
            type: 'sms',
            status: 'active',
            enrolledAt: new Date(),
            verifiedAt: new Date(),
            phoneNumber: state.phoneNumber,
        };
        if (!user.mfaMethods) {
            user.mfaMethods = [];
        }
        user.mfaMethods = user.mfaMethods.filter(m => !(m.type === 'sms'));
        user.mfaMethods.push(mfaMethod);
        user.updatedAt = new Date();
        await this.updateUser(user);
        await this.redis.del(`mfa:enrollment:${enrollmentToken}`);
        await this.invalidateUserCache(userId, tenantId);
        return {
            success: true,
            method: mfaMethod,
            message: 'SMS OTP successfully enrolled',
        };
    }
    /**
     * Send SMS OTP for login challenge
     */
    async sendSMSOTP(user) {
        const smsMethod = user.mfaMethods?.find(m => m.type === 'sms' && m.status === 'active');
        if (!smsMethod || !smsMethod.phoneNumber) {
            throw new Error('SMS OTP not enabled for this user');
        }
        const otp = this.generateOTP();
        const otpHash = await this.hashOTP(otp);
        // Store OTP in Redis (5 minutes expiry)
        await this.redis.setex(`mfa:sms:${user.id}`, 5 * 60, JSON.stringify({ otp: otpHash, attempts: 0 }));
        await this.sendSMS(smsMethod.phoneNumber, `Your Castiel login code is: ${otp}`);
    }
    /**
     * Verify SMS OTP for login challenge
     */
    async verifySMSOTP(user, code) {
        const dataStr = await this.redis.get(`mfa:sms:${user.id}`);
        if (!dataStr) {
            return false;
        }
        const data = JSON.parse(dataStr);
        if (data.attempts >= 5) {
            await this.redis.del(`mfa:sms:${user.id}`);
            return false;
        }
        const valid = await this.verifyOTPHash(code, data.otp);
        if (!valid) {
            data.attempts++;
            await this.redis.setex(`mfa:sms:${user.id}`, 5 * 60, JSON.stringify(data));
            return false;
        }
        // Update last used
        const smsMethod = user.mfaMethods?.find(m => m.type === 'sms' && m.status === 'active');
        if (smsMethod) {
            smsMethod.lastUsedAt = new Date();
            user.updatedAt = new Date();
            await this.updateUser(user);
            await this.invalidateUserCache(user.id, user.tenantId);
        }
        await this.redis.del(`mfa:sms:${user.id}`);
        return true;
    }
    // ============================================================================
    // Email OTP Methods
    // ============================================================================
    /**
     * Enroll Email OTP
     */
    async enrollEmail(userId, tenantId) {
        this.server.log.info({ userId, tenantId }, 'Enrolling Email OTP');
        const user = await this.getUser(userId, tenantId);
        // Check if already enabled
        const existingEmail = user.mfaMethods?.find(m => m.type === 'email' && m.status === 'active');
        if (existingEmail) {
            throw new Error('Email OTP is already enabled');
        }
        // Generate OTP
        const otp = this.generateOTP();
        const enrollmentToken = crypto.randomBytes(32).toString('hex');
        const enrollmentState = {
            userId,
            tenantId,
            method: 'email',
            email: user.email,
            otp: await this.hashOTP(otp),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            attempts: 0,
        };
        await this.redis.setex(`mfa:enrollment:${enrollmentToken}`, 10 * 60, JSON.stringify(enrollmentState));
        // Send email
        await this.emailService.sendEmail({
            to: user.email,
            subject: 'Enable Email OTP - Verification Code',
            text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
        });
        return {
            maskedEmail: this.maskEmail(user.email),
            enrollmentToken,
            expiresInSeconds: 600,
        };
    }
    /**
     * Verify Email OTP enrollment
     */
    async verifyEmail(enrollmentToken, code, userId, tenantId) {
        this.server.log.info({ userId, tenantId }, 'Verifying Email OTP enrollment');
        const stateStr = await this.redis.get(`mfa:enrollment:${enrollmentToken}`);
        if (!stateStr) {
            throw new Error('Invalid or expired enrollment token');
        }
        const state = JSON.parse(stateStr);
        if (state.userId !== userId || state.tenantId !== tenantId || state.method !== 'email') {
            throw new Error('Invalid enrollment token');
        }
        if (state.attempts >= 5) {
            await this.redis.del(`mfa:enrollment:${enrollmentToken}`);
            throw new Error('Too many failed attempts');
        }
        const valid = await this.verifyOTPHash(code, state.otp);
        if (!valid) {
            state.attempts++;
            await this.redis.setex(`mfa:enrollment:${enrollmentToken}`, 10 * 60, JSON.stringify(state));
            throw new Error('Invalid verification code');
        }
        const user = await this.getUser(userId, tenantId);
        const mfaMethod = {
            type: 'email',
            status: 'active',
            enrolledAt: new Date(),
            verifiedAt: new Date(),
            email: user.email,
        };
        if (!user.mfaMethods) {
            user.mfaMethods = [];
        }
        user.mfaMethods = user.mfaMethods.filter(m => !(m.type === 'email'));
        user.mfaMethods.push(mfaMethod);
        user.updatedAt = new Date();
        await this.updateUser(user);
        await this.redis.del(`mfa:enrollment:${enrollmentToken}`);
        await this.invalidateUserCache(userId, tenantId);
        return {
            success: true,
            method: mfaMethod,
            message: 'Email OTP successfully enrolled',
        };
    }
    /**
     * Send Email OTP for login challenge
     */
    async sendEmailOTP(user) {
        const emailMethod = user.mfaMethods?.find(m => m.type === 'email' && m.status === 'active');
        if (!emailMethod) {
            throw new Error('Email OTP not enabled for this user');
        }
        const otp = this.generateOTP();
        const otpHash = await this.hashOTP(otp);
        await this.redis.setex(`mfa:email:${user.id}`, 5 * 60, JSON.stringify({ otp: otpHash, attempts: 0 }));
        await this.emailService.sendEmail({
            to: user.email,
            subject: 'Your Login Verification Code',
            text: `Your login code is: ${otp}\n\nThis code expires in 5 minutes.`,
            html: `<p>Your login code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
        });
    }
    /**
     * Verify Email OTP for login challenge
     */
    async verifyEmailOTP(user, code) {
        const dataStr = await this.redis.get(`mfa:email:${user.id}`);
        if (!dataStr) {
            return false;
        }
        const data = JSON.parse(dataStr);
        if (data.attempts >= 5) {
            await this.redis.del(`mfa:email:${user.id}`);
            return false;
        }
        const valid = await this.verifyOTPHash(code, data.otp);
        if (!valid) {
            data.attempts++;
            await this.redis.setex(`mfa:email:${user.id}`, 5 * 60, JSON.stringify(data));
            return false;
        }
        const emailMethod = user.mfaMethods?.find(m => m.type === 'email' && m.status === 'active');
        if (emailMethod) {
            emailMethod.lastUsedAt = new Date();
            user.updatedAt = new Date();
            await this.updateUser(user);
            await this.invalidateUserCache(user.id, user.tenantId);
        }
        await this.redis.del(`mfa:email:${user.id}`);
        return true;
    }
    // ============================================================================
    // Recovery Codes
    // ============================================================================
    /**
     * Generate recovery codes for a user
     */
    async generateRecoveryCodes(userId, tenantId, password, mfaCode) {
        this.server.log.info({ userId, tenantId }, 'Generating recovery codes');
        const user = await this.getUser(userId, tenantId);
        // Verify password or MFA code
        if (password) {
            if (!user.passwordHash) {
                throw new Error('Password verification not available');
            }
            const valid = await argon2.verify(user.passwordHash, password);
            if (!valid) {
                throw new Error('Invalid password');
            }
        }
        else if (mfaCode) {
            const totpMethod = user.mfaMethods?.find(m => m.type === 'totp' && m.status === 'active');
            if (!totpMethod) {
                throw new Error('TOTP not enabled');
            }
            const valid = await this.verifyTOTPCode(user, mfaCode);
            if (!valid) {
                throw new Error('Invalid MFA code');
            }
        }
        else {
            throw new Error('Password or MFA code required');
        }
        const recoveryCodes = await this.generateRecoveryCodesInternal(user);
        return {
            recoveryCodes,
            generatedAt: new Date(),
            message: 'Save these codes in a safe place. Each code can only be used once.',
        };
    }
    /**
     * Internal method to generate recovery codes
     */
    async generateRecoveryCodesInternal(user) {
        const codes = [];
        const hashedCodes = [];
        // Generate 10 recovery codes
        for (let i = 0; i < 10; i++) {
            const code = this.generateRecoveryCode();
            codes.push(code);
            const codeHash = await argon2.hash(code);
            hashedCodes.push({
                codeHash,
                used: false,
                createdAt: new Date(),
            });
        }
        user.mfaRecoveryCodes = hashedCodes;
        user.updatedAt = new Date();
        await this.updateUser(user);
        await this.invalidateUserCache(user.id, user.tenantId);
        return codes;
    }
    /**
     * Verify recovery code
     */
    async verifyRecoveryCode(user, code) {
        if (!user.mfaRecoveryCodes || user.mfaRecoveryCodes.length === 0) {
            return false;
        }
        // Find matching unused recovery code
        for (const recoveryCode of user.mfaRecoveryCodes) {
            if (recoveryCode.used) {
                continue;
            }
            const valid = await argon2.verify(recoveryCode.codeHash, code);
            if (valid) {
                // Mark as used
                recoveryCode.used = true;
                recoveryCode.usedAt = new Date();
                user.updatedAt = new Date();
                await this.updateUser(user);
                await this.invalidateUserCache(user.id, user.tenantId);
                return true;
            }
        }
        return false;
    }
    // ============================================================================
    // MFA Method Management
    // ============================================================================
    /**
     * List user's MFA methods
     */
    async listMFAMethods(userId, tenantId) {
        const user = await this.getUser(userId, tenantId);
        const methods = (user.mfaMethods || [])
            .filter(m => m.status === 'active')
            .map(m => ({
            type: m.type,
            status: m.status,
            enrolledAt: m.enrolledAt,
            lastUsedAt: m.lastUsedAt,
            maskedInfo: this.getMaskedInfo(m),
        }));
        const hasActiveMFA = methods.length > 0;
        const recoveryCodesRemaining = user.mfaRecoveryCodes?.filter(c => !c.used).length || 0;
        return {
            methods,
            hasActiveMFA,
            recoveryCodesRemaining,
        };
    }
    /**
     * Disable an MFA method
     */
    async disableMFAMethod(userId, tenantId, method, password, mfaCode) {
        this.server.log.info({ userId, tenantId, method }, 'Disabling MFA method');
        const user = await this.getUser(userId, tenantId);
        // Verify password or another MFA method
        if (password) {
            if (!user.passwordHash) {
                throw new Error('Password verification not available');
            }
            const valid = await argon2.verify(user.passwordHash, password);
            if (!valid) {
                throw new Error('Invalid password');
            }
        }
        else if (mfaCode) {
            // Verify using a different method than the one being disabled
            const otherMethod = user.mfaMethods?.find(m => m.type !== method && m.status === 'active');
            if (!otherMethod) {
                throw new Error('Another MFA method required for verification');
            }
            let valid = false;
            if (otherMethod.type === 'totp') {
                valid = await this.verifyTOTPCode(user, mfaCode);
            }
            if (!valid) {
                throw new Error('Invalid MFA code');
            }
        }
        else {
            throw new Error('Password or MFA code required');
        }
        // Disable the method
        if (!user.mfaMethods) {
            throw new Error('MFA method not found');
        }
        const methodIndex = user.mfaMethods.findIndex(m => m.type === method && m.status === 'active');
        if (methodIndex === -1) {
            throw new Error('MFA method not found');
        }
        user.mfaMethods[methodIndex].status = 'disabled';
        user.updatedAt = new Date();
        await this.updateUser(user);
        await this.invalidateUserCache(userId, tenantId);
    }
    // ============================================================================
    // Trusted Devices
    // ============================================================================
    /**
     * Add trusted device
     */
    async addTrustedDevice(userId, tenantId, fingerprint, userAgent, ipAddress) {
        const user = await this.getUser(userId, tenantId);
        const trustedDevice = {
            fingerprint,
            userAgent,
            ipAddress,
            createdAt: new Date(),
            lastSeenAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
        if (!user.trustedDevices) {
            user.trustedDevices = [];
        }
        // Remove expired devices
        user.trustedDevices = user.trustedDevices.filter(d => d.expiresAt > new Date());
        // Add new device
        user.trustedDevices.push(trustedDevice);
        user.updatedAt = new Date();
        await this.updateUser(user);
        await this.invalidateUserCache(userId, tenantId);
    }
    /**
     * Check if device is trusted
     */
    async isDeviceTrusted(userId, tenantId, fingerprint) {
        const user = await this.getUser(userId, tenantId);
        if (!user.trustedDevices) {
            return false;
        }
        const now = new Date();
        const device = user.trustedDevices.find(d => d.fingerprint === fingerprint && d.expiresAt > now);
        if (device) {
            // Update last seen
            device.lastSeenAt = new Date();
            user.updatedAt = new Date();
            await this.updateUser(user);
            await this.invalidateUserCache(userId, tenantId);
            return true;
        }
        return false;
    }
    // ============================================================================
    // MFA Policy Management
    // ============================================================================
    /**
     * Get tenant MFA policy
     */
    async getMFAPolicy(tenantId) {
        const { resource: tenant } = await this.tenantsContainer.item(tenantId, tenantId).read();
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        const policy = {
            tenantId,
            enforcement: tenant.settings?.mfaPolicy?.enforcement || 'off',
            gracePeriodDays: tenant.settings?.mfaPolicy?.gracePeriodDays,
            allowedMethods: tenant.settings?.mfaPolicy?.allowedMethods || ['totp', 'sms', 'email'],
            updatedAt: tenant.updatedAt,
        };
        return { policy };
    }
    /**
     * Update tenant MFA policy
     */
    async updateMFAPolicy(request) {
        this.server.log.info({ tenantId: request.tenantId }, 'Updating MFA policy');
        const { resource: tenant } = await this.tenantsContainer
            .item(request.tenantId, request.tenantId)
            .read();
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        if (!tenant.settings) {
            tenant.settings = {};
        }
        if (!tenant.settings.mfaPolicy) {
            tenant.settings.mfaPolicy = {
                enforcement: 'off',
                allowedMethods: ['totp', 'sms', 'email'],
            };
        }
        if (request.enforcement !== undefined) {
            tenant.settings.mfaPolicy.enforcement = request.enforcement;
        }
        if (request.gracePeriodDays !== undefined) {
            tenant.settings.mfaPolicy.gracePeriodDays = request.gracePeriodDays;
        }
        if (request.allowedMethods !== undefined) {
            tenant.settings.mfaPolicy.allowedMethods = request.allowedMethods;
        }
        tenant.updatedAt = new Date();
        await this.tenantsContainer.items.upsert(tenant);
        const policy = {
            tenantId: request.tenantId,
            enforcement: tenant.settings.mfaPolicy.enforcement,
            gracePeriodDays: tenant.settings.mfaPolicy.gracePeriodDays,
            allowedMethods: tenant.settings.mfaPolicy.allowedMethods,
            updatedAt: tenant.updatedAt,
            updatedBy: request.updatedBy,
        };
        return { policy };
    }
    /**
     * Check if user is required to have MFA based on tenant policy
     */
    async isMFARequired(userId, tenantId) {
        const { policy } = await this.getMFAPolicy(tenantId);
        if (policy.enforcement === 'required') {
            return true;
        }
        if (policy.enforcement === 'optional') {
            const user = await this.getUser(userId, tenantId);
            // Check if grace period has expired
            if (user.mfaEnforcedAt) {
                const gracePeriodMs = (policy.gracePeriodDays || 0) * 24 * 60 * 60 * 1000;
                const enforcedTime = new Date(user.mfaEnforcedAt).getTime();
                if (Date.now() > enforcedTime + gracePeriodMs) {
                    return true;
                }
            }
        }
        return false;
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    /**
     * Get user from database
     */
    async getUser(userId, tenantId) {
        // Try cache first
        const cachedUser = await this.redis.get(`user:${tenantId}:${userId}`);
        if (cachedUser) {
            return JSON.parse(cachedUser);
        }
        // Fetch from database
        const { resource: user } = await this.usersContainer
            .item(userId, tenantId)
            .read();
        if (!user) {
            throw new Error('User not found');
        }
        // Cache for 5 minutes
        await this.redis.setex(`user:${tenantId}:${userId}`, 5 * 60, JSON.stringify(user));
        return user;
    }
    /**
     * Update user in database
     */
    async updateUser(user) {
        await this.usersContainer.items.upsert(user);
    }
    /**
     * Invalidate user cache
     */
    async invalidateUserCache(userId, tenantId) {
        await this.redis.del(`user:${tenantId}:${userId}`);
    }
    /**
     * Encrypt secret for storage
     */
    encryptSecret(secret) {
        // In production, use Azure Key Vault or similar
        // For now, use simple base64 encoding (NOT SECURE FOR PRODUCTION)
        return Buffer.from(secret).toString('base64');
    }
    /**
     * Decrypt secret from storage
     */
    decryptSecret(encryptedSecret) {
        return Buffer.from(encryptedSecret, 'base64').toString('utf-8');
    }
    /**
     * Generate 6-digit OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    /**
     * Hash OTP for storage
     */
    async hashOTP(otp) {
        return argon2.hash(otp);
    }
    /**
     * Verify OTP against hash
     */
    async verifyOTPHash(otp, hash) {
        return argon2.verify(hash, otp);
    }
    /**
     * Generate recovery code (format: XXXX-XXXX-XXXX)
     */
    generateRecoveryCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous characters
        let code = '';
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 4 === 0) {
                code += '-';
            }
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    /**
     * Mask phone number for display
     */
    maskPhoneNumber(phone) {
        if (phone.length < 8) {
            return phone;
        }
        return `${phone.substring(0, 2)}***${phone.substring(phone.length - 4)}`;
    }
    /**
     * Mask email for display
     */
    maskEmail(email) {
        const [local, domain] = email.split('@');
        if (local.length <= 2) {
            return email;
        }
        return `${local[0]}***@${domain}`;
    }
    /**
     * Get masked info for MFA method
     */
    getMaskedInfo(method) {
        if (method.type === 'sms' && method.phoneNumber) {
            return this.maskPhoneNumber(method.phoneNumber);
        }
        if (method.type === 'email' && method.email) {
            return this.maskEmail(method.email);
        }
        if (method.type === 'totp') {
            return 'Authenticator App';
        }
        return undefined;
    }
    /**
     * Send SMS (placeholder - integrate with Twilio/AWS SNS)
     */
    async sendSMS(phoneNumber, message) {
        // TODO: Integrate with actual SMS provider
        this.server.log.info({ phoneNumber, message }, 'Sending SMS (mocked)');
        // In development, log the SMS content
        if (process.env.NODE_ENV !== 'production') {
            this.monitoring?.trackEvent('mfa.sms-sent-dev', { phoneNumber, messageLength: message.length });
        }
    }
    // ============================================================================
    // Phase 3 Setup Flow Helper Methods
    // ============================================================================
    /**
     * Get pending enrollment state
     */
    async getPendingEnrollment(userId, tenantId, method) {
        // Scan Redis for enrollment tokens (in production, store token in user session)
        const pattern = 'mfa:enrollment:*';
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            const stateStr = await this.redis.get(key);
            if (stateStr) {
                const state = JSON.parse(stateStr);
                if (state.userId === userId &&
                    state.tenantId === tenantId &&
                    state.method === method) {
                    const enrollmentToken = key.replace('mfa:enrollment:', '');
                    return { enrollmentToken };
                }
            }
        }
        return null;
    }
    /**
     * Get user's MFA methods (lightweight version)
     */
    async getUserMFAMethods(userId, tenantId) {
        const user = await this.getUser(userId, tenantId);
        return (user.mfaMethods || [])
            .filter((m) => m.status === 'active')
            .map((m) => ({
            id: m.id,
            method: m.type,
            createdAt: m.createdAt,
            status: m.status,
        }));
    }
    /**
     * Invalidate all recovery codes for a user
     */
    async invalidateRecoveryCodes(userId, tenantId) {
        const user = await this.getUser(userId, tenantId);
        // Mark all recovery codes as used
        if (user.mfaRecoveryCodes) {
            user.mfaRecoveryCodes = user.mfaRecoveryCodes.map((code) => ({
                ...code,
                used: true,
                usedAt: new Date(),
            }));
            await this.usersContainer.items.upsert(user);
        }
    }
}
//# sourceMappingURL=mfa.service.js.map