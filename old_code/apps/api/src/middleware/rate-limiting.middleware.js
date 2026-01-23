/**
 * Rate Limiting Middleware for Fastify
 *
 * Integrates IntegrationRateLimiter with API routes
 * Automatically enforces rate limits based on:
 * - Integration being accessed (Salesforce, Notion, etc.)
 * - Tenant making the request
 * - Operation being performed (create, update, fetch, delete)
 */
export class RateLimitingMiddleware {
    rateLimiter;
    constructor(rateLimiter) {
        this.rateLimiter = rateLimiter;
    }
    /**
     * Register middleware with Fastify app
     */
    registerMiddleware(app) {
        // Add rate limiting middleware to all integration endpoints
        app.addHook('preHandler', async (req, reply) => {
            // Only rate limit integration endpoints
            if (!req.url.includes('/integrations/')) {
                return;
            }
            const result = await this.checkRateLimit(req);
            if (!result.allowed) {
                return reply.status(429).send({
                    error: 'Rate limit exceeded',
                    retryAfterSeconds: result.retryAfterSeconds,
                    resetAt: new Date(result.resetAt),
                    message: result.message,
                });
            }
            // Add rate limit headers to response
            reply.header('X-RateLimit-Limit', result.limit?.toString() ?? '0');
            reply.header('X-RateLimit-Remaining', result.remaining?.toString() ?? '0');
            reply.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
        });
        // Intercept responses to update adaptive limits
        app.addHook('onResponse', async (req, reply) => {
            // Only for integration endpoints
            if (!req.url.includes('/integrations/')) {
                return;
            }
            const { integrationId, tenantId } = this.extractIntegrationInfo(req);
            if (integrationId && tenantId) {
                // Update adaptive limits based on provider response
                const headers = Object.fromEntries(Object.entries(reply.getHeaders()).map(([k, v]) => [
                    k.toLowerCase(),
                    v?.toString() ?? '',
                ]));
                await this.rateLimiter.updateAdaptiveLimit(integrationId, tenantId, headers);
            }
        });
    }
    /**
     * Middleware for specific routes
     */
    rateLimitEndpoint(operation) {
        return async (req, reply) => {
            const result = await this.checkRateLimit(req, operation);
            if (!result.allowed) {
                return reply.status(429).send({
                    error: 'Rate limit exceeded',
                    retryAfterSeconds: result.retryAfterSeconds,
                    resetAt: new Date(result.resetAt),
                    message: result.message,
                });
            }
            // Add rate limit headers
            reply.header('X-RateLimit-Limit', result.limit?.toString() ?? '0');
            reply.header('X-RateLimit-Remaining', result.remaining?.toString() ?? '0');
            reply.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
        };
    }
    /**
     * Get current rate limit status for endpoint
     */
    async getStatus(req) {
        const { integrationId, tenantId } = this.extractIntegrationInfo(req);
        if (!integrationId || !tenantId) {
            throw new Error('Unable to extract integration info from request');
        }
        return this.rateLimiter.getStatus({
            integrationId,
            tenantId,
        });
    }
    // Private methods
    async checkRateLimit(req, operation) {
        const { integrationId, tenantId } = this.extractIntegrationInfo(req);
        if (!integrationId || !tenantId) {
            // Can't rate limit without identifying integration and tenant
            return {
                allowed: true,
                resetAt: Date.now() + 60000,
            };
        }
        // Infer operation from HTTP method if not provided
        const inferredOperation = operation || this.inferOperation(req.method, req.url);
        const config = {
            integrationId,
            tenantId,
            operation: inferredOperation,
        };
        const result = await this.rateLimiter.checkRateLimit(config);
        // Get status for limit value
        const status = await this.rateLimiter.getStatus(config);
        return {
            allowed: result.allowed && !result.queued,
            remaining: result.remaining,
            resetAt: result.resetAt,
            retryAfterSeconds: result.retryAfterSeconds,
            limit: status.requestsPerMinute,
            message: result.message,
        };
    }
    extractIntegrationInfo(req) {
        // Extract from URL: /integrations/{integrationId}/...
        const match = req.url.match(/\/integrations\/([^\/]+)/);
        const integrationId = match?.[1];
        // Extract tenant from user context or header
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return { integrationId: integrationId, tenantId: tenantId };
    }
    inferOperation(method, url) {
        // Infer operation from HTTP method and URL pattern
        switch (method.toUpperCase()) {
            case 'POST':
                // Check if creating new resource
                if (!url.match(/\/[^\/]+\/\d+/)) {
                    return 'create';
                }
                return 'fetch'; // Might be a custom endpoint
            case 'PUT':
            case 'PATCH':
                return 'update';
            case 'DELETE':
                return 'delete';
            case 'GET':
                return 'fetch';
            default:
                return undefined;
        }
    }
}
/**
 * Register rate limiting routes for admin
 */
export function registerRateLimitingRoutes(app, // FastifyInstance
rateLimiter, middleware) {
    /**
     * GET /rate-limits/:integrationId/status
     * Get current rate limit status
     */
    app.get('/rate-limits/:integrationId/status', async (req, reply) => {
        try {
            const { integrationId } = req.params;
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const status = await rateLimiter.getStatus({
                integrationId,
                tenantId,
            });
            return reply.status(200).send(status);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.status(500).send({ error: errorMessage });
        }
    });
    /**
     * GET /rate-limits/:integrationId/queue
     * Get queued requests count
     */
    app.get('/rate-limits/:integrationId/queue', async (req, reply) => {
        try {
            const { integrationId } = req.params;
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const status = await rateLimiter.getStatus({
                integrationId,
                tenantId,
            });
            return reply.status(200).send({
                integrationId,
                tenantId,
                queuedRequests: status.queuedRequests,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.status(500).send({ error: errorMessage });
        }
    });
    /**
     * POST /rate-limits/:integrationId/process-queue
     * Process queued requests
     */
    app.post('/rate-limits/:integrationId/process-queue', async (req, reply) => {
        try {
            const { integrationId } = req.params;
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            const processed = await rateLimiter.processQueue(integrationId, tenantId);
            return reply.status(200).send({
                integrationId,
                tenantId,
                requestsProcessed: processed,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.status(500).send({ error: errorMessage });
        }
    });
    /**
     * POST /rate-limits/:integrationId/reset
     * Reset rate limit counters
     */
    app.post('/rate-limits/:integrationId/reset', async (req, reply) => {
        try {
            const { integrationId } = req.params;
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            await rateLimiter.resetIntegration(integrationId, tenantId);
            return reply.status(200).send({
                message: `Rate limit reset for ${integrationId}`,
                integrationId,
                tenantId,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.status(500).send({ error: errorMessage });
        }
    });
    /**
     * PUT /rate-limits/:integrationId/limit
     * Set custom rate limit
     */
    app.put('/rate-limits/:integrationId/limit', async (req, reply) => {
        try {
            const { integrationId } = req.params;
            const { requestsPerMinute } = req.body;
            if (!requestsPerMinute || requestsPerMinute < 1) {
                return reply.status(400).send({
                    error: 'requestsPerMinute must be at least 1',
                });
            }
            rateLimiter.setIntegrationLimit(integrationId, requestsPerMinute);
            return reply.status(200).send({
                message: `Rate limit set for ${integrationId}`,
                integrationId,
                requestsPerMinute,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.status(500).send({ error: errorMessage });
        }
    });
    /**
     * PUT /rate-limits/tenant/:tenantId/limit
     * Set custom rate limit for tenant
     */
    app.put('/rate-limits/tenant/:tenantId/limit', async (req, reply) => {
        try {
            const { tenantId } = req.params;
            const { requestsPerMinute } = req.body;
            if (!requestsPerMinute || requestsPerMinute < 1) {
                return reply.status(400).send({
                    error: 'requestsPerMinute must be at least 1',
                });
            }
            rateLimiter.setTenantLimit(tenantId, requestsPerMinute);
            return reply.status(200).send({
                message: `Rate limit set for tenant ${tenantId}`,
                tenantId,
                requestsPerMinute,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return reply.status(500).send({ error: errorMessage });
        }
    });
}
//# sourceMappingURL=rate-limiting.middleware.js.map