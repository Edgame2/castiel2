import { FastifyRequest, FastifyReply } from 'fastify';
import { IntegrationRateLimiter } from '../services/integration-rate-limiter.service.js';
/**
 * Rate Limiting Middleware for Fastify
 *
 * Integrates IntegrationRateLimiter with API routes
 * Automatically enforces rate limits based on:
 * - Integration being accessed (Salesforce, Notion, etc.)
 * - Tenant making the request
 * - Operation being performed (create, update, fetch, delete)
 */
export declare class RateLimitingMiddleware {
    private rateLimiter;
    constructor(rateLimiter: IntegrationRateLimiter);
    /**
     * Register middleware with Fastify app
     */
    registerMiddleware(app: any): void;
    /**
     * Middleware for specific routes
     */
    rateLimitEndpoint(operation: 'create' | 'update' | 'delete' | 'fetch'): (req: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
    /**
     * Get current rate limit status for endpoint
     */
    getStatus(req: FastifyRequest): Promise<import("../services/integration-rate-limiter.service.js").RateLimitStatus>;
    private checkRateLimit;
    private extractIntegrationInfo;
    private inferOperation;
}
/**
 * Register rate limiting routes for admin
 */
export declare function registerRateLimitingRoutes(app: any, // FastifyInstance
rateLimiter: IntegrationRateLimiter, middleware: RateLimitingMiddleware): void;
//# sourceMappingURL=rate-limiting.middleware.d.ts.map