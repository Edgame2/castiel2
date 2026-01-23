/**
 * Magic Link Service
 *
 * Handles passwordless authentication via magic links (email-based login).
 * Magic links are single-use tokens that allow users to log in without a password.
 */
import type { FastifyInstance } from 'fastify';
import type { Redis as RedisType } from 'ioredis';
import type { User } from '../../types/user.types.js';
import type { UserService } from './user.service.js';
import type { EmailService } from './email.service.js';
/**
 * Request magic link response
 */
export interface RequestMagicLinkResponse {
    success: boolean;
    message: string;
    expiresInSeconds: number;
}
/**
 * Verify magic link response
 */
export interface VerifyMagicLinkResponse {
    valid: boolean;
    userId?: string;
    email?: string;
    tenantId?: string;
    returnUrl?: string;
}
/**
 * Magic Link Service
 */
export declare class MagicLinkService {
    private readonly server;
    private readonly redis;
    private readonly userService;
    private readonly emailService;
    private readonly frontendUrl;
    private readonly MAGIC_LINK_PREFIX;
    private readonly RATE_LIMIT_PREFIX;
    private readonly TOKEN_TTL;
    private readonly RATE_LIMIT_TTL;
    private readonly MAX_REQUESTS_PER_HOUR;
    constructor(server: FastifyInstance, redis: RedisType, userService: UserService, emailService: EmailService, frontendUrl: string);
    /**
     * Request a magic link for passwordless login
     */
    requestMagicLink(email: string, tenantId: string, returnUrl?: string): Promise<RequestMagicLinkResponse>;
    /**
     * Verify a magic link token
     */
    verifyMagicLink(token: string): Promise<VerifyMagicLinkResponse>;
    /**
     * Invalidate a magic link token
     */
    invalidateToken(token: string): Promise<void>;
    /**
     * Get user by ID for login completion
     */
    getUserById(userId: string, tenantId: string): Promise<User | null>;
    /**
     * Generate a secure random token
     */
    private generateToken;
    /**
     * Build the magic link URL
     */
    private buildMagicLinkUrl;
}
//# sourceMappingURL=magic-link.service.d.ts.map