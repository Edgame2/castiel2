/**
 * Rate Limit Middleware
 * Fastify middleware for rate limiting requests
 */
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import type { RateLimiterService, InMemoryRateLimiterService } from '../services/security/rate-limiter.service.js';
export interface RateLimitMiddlewareOptions {
    action: string;
    getIdentifier?: (request: FastifyRequest) => string;
    onRateLimited?: (request: FastifyRequest, reply: FastifyReply, result: any) => Promise<void>;
}
/**
 * Create rate limit middleware for a specific action
 */
export declare function createRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService, options: RateLimitMiddlewareOptions): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Create rate limit check middleware (doesn't record, just checks)
 */
export declare function createRateLimitCheckMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService, options: RateLimitMiddlewareOptions): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Register rate limiter on Fastify instance
 */
export declare function registerRateLimiter(server: FastifyInstance, rateLimiter: RateLimiterService | InMemoryRateLimiterService): void;
/**
 * Reset rate limit after successful operation
 * Use this after successful login to clear failed attempt counts
 */
export declare function resetRateLimit(rateLimiter: RateLimiterService | InMemoryRateLimiterService, action: string, identifier: string): Promise<void>;
/**
 * Pre-configured middleware for login rate limiting
 */
export declare function createLoginRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for password reset rate limiting
 */
export declare function createPasswordResetRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for registration rate limiting
 */
export declare function createRegistrationRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for user connection operations rate limiting
 */
export declare function createUserConnectionRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService, action: 'userConnectionCreate' | 'userConnectionUpdate' | 'userConnectionDelete' | 'userConnectionTest'): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for user connection test rate limiting (more restrictive)
 */
export declare function createUserConnectionTestRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for user connection create rate limiting
 */
export declare function createUserConnectionCreateRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for user connection update rate limiting
 */
export declare function createUserConnectionUpdateRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for user connection delete rate limiting
 */
export declare function createUserConnectionDeleteRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for AI Insights chat rate limiting (per user)
 */
export declare function createAIInsightsChatRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for AI Insights chat rate limiting (per tenant)
 */
export declare function createAIInsightsChatTenantRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for AI Insights generate rate limiting (per user)
 */
export declare function createAIInsightsGenerateRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for AI Insights generate rate limiting (per tenant)
 */
export declare function createAIInsightsGenerateTenantRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for AI Insights quick rate limiting (per user)
 */
export declare function createAIInsightsQuickRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for AI Insights quick rate limiting (per tenant)
 */
export declare function createAIInsightsQuickTenantRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for token refresh rate limiting
 */
export declare function createTokenRefreshRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for logout rate limiting
 */
export declare function createLogoutRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for token revocation rate limiting
 */
export declare function createTokenRevokeRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for email verification rate limiting
 */
export declare function createEmailVerificationRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Pre-configured middleware for resend verification email rate limiting
 */
export declare function createResendVerificationRateLimitMiddleware(rateLimiter: RateLimiterService | InMemoryRateLimiterService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=rate-limit.middleware.d.ts.map