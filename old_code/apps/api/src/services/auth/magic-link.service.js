/**
 * Magic Link Service
 *
 * Handles passwordless authentication via magic links (email-based login).
 * Magic links are single-use tokens that allow users to log in without a password.
 */
import crypto from 'crypto';
/**
 * Magic Link Service
 */
export class MagicLinkService {
    server;
    redis;
    userService;
    emailService;
    frontendUrl;
    MAGIC_LINK_PREFIX = 'magic_link:';
    RATE_LIMIT_PREFIX = 'magic_link_rate:';
    TOKEN_TTL = 15 * 60; // 15 minutes
    RATE_LIMIT_TTL = 60 * 60; // 1 hour
    MAX_REQUESTS_PER_HOUR = 5;
    constructor(server, redis, userService, emailService, frontendUrl) {
        this.server = server;
        this.redis = redis;
        this.userService = userService;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
    }
    /**
     * Request a magic link for passwordless login
     */
    async requestMagicLink(email, tenantId, returnUrl) {
        this.server.log.info({ email, tenantId }, 'Magic link requested');
        // Check rate limit
        const rateLimitKey = `${this.RATE_LIMIT_PREFIX}${email.toLowerCase()}`;
        const requestCount = await this.redis.incr(rateLimitKey);
        if (requestCount === 1) {
            await this.redis.expire(rateLimitKey, this.RATE_LIMIT_TTL);
        }
        if (requestCount > this.MAX_REQUESTS_PER_HOUR) {
            this.server.log.warn({ email }, 'Magic link rate limit exceeded');
            // Still return success to prevent email enumeration
            return {
                success: true,
                message: 'If an account exists with this email, a magic link has been sent.',
                expiresInSeconds: this.TOKEN_TTL,
            };
        }
        // Find user by email
        const user = await this.userService.findByEmail(email.toLowerCase(), tenantId);
        if (!user) {
            // Don't reveal if user exists - prevent enumeration
            this.server.log.info({ email }, 'Magic link requested for non-existent user');
            return {
                success: true,
                message: 'If an account exists with this email, a magic link has been sent.',
                expiresInSeconds: this.TOKEN_TTL,
            };
        }
        // Check if user is active
        if (user.status !== 'active' && user.status !== 'pending_verification') {
            this.server.log.warn({ email, status: user.status }, 'Magic link requested for inactive user');
            return {
                success: true,
                message: 'If an account exists with this email, a magic link has been sent.',
                expiresInSeconds: this.TOKEN_TTL,
            };
        }
        // Generate magic link token
        const token = this.generateToken();
        const now = Date.now();
        const expiresAt = now + this.TOKEN_TTL * 1000;
        const magicLinkData = {
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId,
            returnUrl,
            createdAt: now,
            expiresAt,
        };
        // Store token in Redis
        await this.redis.setex(`${this.MAGIC_LINK_PREFIX}${token}`, this.TOKEN_TTL, JSON.stringify(magicLinkData));
        // Build magic link URL
        const magicLinkUrl = this.buildMagicLinkUrl(token, returnUrl);
        // Send magic link email
        try {
            await this.emailService.sendMagicLinkEmail(user.email, magicLinkUrl, user.firstName || user.email);
            this.server.log.info({ email, userId: user.id }, 'Magic link email sent');
        }
        catch (error) {
            this.server.log.error({ error, email }, 'Failed to send magic link email');
            // Delete the token since email failed
            await this.redis.del(`${this.MAGIC_LINK_PREFIX}${token}`);
            throw new Error('Failed to send magic link email');
        }
        return {
            success: true,
            message: 'If an account exists with this email, a magic link has been sent.',
            expiresInSeconds: this.TOKEN_TTL,
        };
    }
    /**
     * Verify a magic link token
     */
    async verifyMagicLink(token) {
        this.server.log.info('Verifying magic link token');
        // Get token data from Redis
        const dataStr = await this.redis.get(`${this.MAGIC_LINK_PREFIX}${token}`);
        if (!dataStr) {
            this.server.log.warn('Invalid or expired magic link token');
            return { valid: false };
        }
        const data = JSON.parse(dataStr);
        // Check expiration (redundant since Redis TTL handles it, but extra safety)
        if (Date.now() > data.expiresAt) {
            await this.redis.del(`${this.MAGIC_LINK_PREFIX}${token}`);
            return { valid: false };
        }
        // Delete the token (single use)
        await this.redis.del(`${this.MAGIC_LINK_PREFIX}${token}`);
        this.server.log.info({ userId: data.userId, email: data.email }, 'Magic link verified');
        return {
            valid: true,
            userId: data.userId,
            email: data.email,
            tenantId: data.tenantId,
            returnUrl: data.returnUrl,
        };
    }
    /**
     * Invalidate a magic link token
     */
    async invalidateToken(token) {
        await this.redis.del(`${this.MAGIC_LINK_PREFIX}${token}`);
    }
    /**
     * Get user by ID for login completion
     */
    async getUserById(userId, tenantId) {
        return this.userService.findById(userId, tenantId);
    }
    /**
     * Generate a secure random token
     */
    generateToken() {
        return `ml_${crypto.randomBytes(32).toString('hex')}`;
    }
    /**
     * Build the magic link URL
     */
    buildMagicLinkUrl(token, returnUrl) {
        const url = new URL(`${this.frontendUrl}/magic-link/verify`);
        url.searchParams.set('token', token);
        if (returnUrl) {
            url.searchParams.set('returnUrl', returnUrl);
        }
        return url.toString();
    }
}
//# sourceMappingURL=magic-link.service.js.map