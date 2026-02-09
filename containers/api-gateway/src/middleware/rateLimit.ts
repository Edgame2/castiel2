/**
 * Rate Limiting Middleware
 * Implements rate limiting per user and per tenant.
 * Uses in-memory store by default; pass a store (e.g. Redis) for multi-instance.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import type { IRateLimitStore } from './rateLimitStore';

export interface RateLimitConfig {
  max: number;
  timeWindow: number; // milliseconds
}

/**
 * Rate limiting middleware. Store is in-memory (single instance) or Redis (shared across instances).
 */
export function createRateLimitMiddleware(config: RateLimitConfig, store: IRateLimitStore) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }

    const user = (request as any).user;
    const identifier = user?.userId || user?.id || request.ip || 'unknown';
    const tenantId = (request as any).tenantId || 'unknown';
    const key = `rate_limit:${tenantId}:${identifier}`;

    const { count, resetTime } = await store.increment(key, config.timeWindow);
    const now = Date.now();

    if (count > config.max) {
      reply.code(429).send({
        error: 'Too many requests',
        retryAfter: Math.ceil((resetTime - now) / 1000),
      });
      return;
    }

    reply.header('X-RateLimit-Limit', config.max.toString());
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - count).toString());
    reply.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  };
}

