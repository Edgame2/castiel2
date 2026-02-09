/**
 * Per-IP rate limiting for public auth routes (login, register, forgot-password, etc.).
 * Uses Redis when config.redis.url is set; returns 429 when limit exceeded.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '../config';
import { log } from '../utils/logger';

const RATE_LIMIT_PATHS: Array<{ method: string; path: string }> = [
  { method: 'POST', path: '/api/v1/auth/login' },
  { method: 'POST', path: '/api/v1/auth/register' },
  { method: 'POST', path: '/api/v1/auth/forgot-password' },
  { method: 'POST', path: '/api/v1/auth/reset-password' },
  { method: 'POST', path: '/api/v1/auth/login/complete-mfa' },
  { method: 'POST', path: '/api/v1/auth/verify-email' },
  { method: 'POST', path: '/api/v1/auth/resend-verification' },
];

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return request.ip ?? 'unknown';
}

function isRateLimitedPath(method: string, pathname: string): boolean {
  return RATE_LIMIT_PATHS.some((p) => p.method === method && pathname === p.path);
}

/**
 * onRequest hook: enforces per-IP rate limit for configured auth paths.
 * When rate_limit.enabled is false or path not in list, does nothing.
 */
export async function rateLimitAuthRoutes(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();
  const rl = config.rate_limit;
  if (!rl?.enabled) {
    return;
  }

  const pathname = request.url.split('?')[0];
  if (!isRateLimitedPath(request.method, pathname)) {
    return;
  }

  const ip = getClientIp(request);
  const key = `auth_rlimit:ip:${ip}`;
  const windowSeconds = Math.max(1, rl.window_seconds ?? 60);
  const maxPerWindow = Math.max(1, rl.max_per_window ?? 30);

  try {
    const { redis } = await import('../utils/redis');
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    if (count > maxPerWindow) {
      log.warn('Auth rate limit exceeded', {
        ip,
        path: pathname,
        count,
        service: 'auth',
      });
      reply
        .status(429)
        .header('Retry-After', String(windowSeconds))
        .send({
          error: 'Too many requests. Please try again later.',
          retryAfter: windowSeconds,
        });
    }
  } catch (err) {
    log.error('Rate limit check failed', err as Error, { key, service: 'auth' });
    // Fail open: allow request when Redis errors
  }
}
