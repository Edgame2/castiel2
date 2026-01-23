/**
 * Rate Limiting Middleware
 * Implements rate limiting per user and per tenant
 */

import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  max: number;
  timeWindow: number; // milliseconds
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * In-memory rate limit store (should use Redis in production)
 */
const rateLimitStore: RateLimitStore = {};

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Skip for health checks
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }

    // Get identifier (user ID or IP address)
    const user = (request as any).user;
    const identifier = user?.userId || user?.id || request.ip || 'unknown';
    const tenantId = (request as any).tenantId || 'unknown';

    // Create rate limit key (per user and per tenant)
    const key = `rate_limit:${tenantId}:${identifier}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore[key];
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.timeWindow,
      };
      rateLimitStore[key] = entry;
    }

    // Increment count
    entry.count++;

    // Check limit
    if (entry.count > config.max) {
      reply.code(429).send({
        error: 'Too many requests',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', config.max.toString());
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - entry.count).toString());
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
  };
}

