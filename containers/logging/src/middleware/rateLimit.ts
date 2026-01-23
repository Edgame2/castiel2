/**
 * Rate Limiting Middleware
 * Per ModuleImplementationGuide Section 11: Security
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '../config';
import { log } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (for single-instance deployments)
// For multi-instance, use Redis or similar
const rateLimitStore: RateLimitStore = {};

/**
 * Rate limiting middleware
 * Uses token bucket algorithm
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();
  
  if (!config.rate_limit.enabled) {
    return; // Rate limiting disabled
  }

  // Get identifier (user ID, IP address, or organization ID)
  const user = (request as any).user;
  const identifier = user?.id || request.ip || 'anonymous';
  const key = `${request.method}:${request.url}:${identifier}`;

  const now = Date.now();
  const windowMs = 1000; // 1 second window
  const maxRequests = config.rate_limit.max_per_second;
  const burst = config.rate_limit.burst;

  // Get or create rate limit entry
  let entry = rateLimitStore[key];

  if (!entry || now > entry.resetTime) {
    // New window or expired entry
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore[key] = entry;
  }

  // Check rate limit
  if (entry.count >= maxRequests) {
    // Check burst allowance
    if (entry.count >= maxRequests + burst) {
      log.warn('Rate limit exceeded', {
        identifier,
        method: request.method,
        path: request.url,
        count: entry.count,
        limit: maxRequests + burst,
      });

      reply.code(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
      });
      return;
    }
  }

  // Increment counter
  entry.count++;

  // Clean up old entries periodically (every 60 seconds)
  if (Math.random() < 0.01) { // 1% chance on each request
    const cutoff = now - 60000; // 60 seconds ago
    Object.keys(rateLimitStore).forEach(k => {
      if (rateLimitStore[k].resetTime < cutoff) {
        delete rateLimitStore[k];
      }
    });
  }
}



