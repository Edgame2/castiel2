import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import type { Redis } from 'ioredis';

/**
 * CSRF Token Configuration
 */
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_TTL = 3600; // 1 hour
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'csrf-token';

/**
 * Safe HTTP methods that don't require CSRF protection
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Hash token for storage (prevents token theft from logs)
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Get Redis key for CSRF token
 */
function getRedisKey(hashedToken: string): string {
  return `csrf:token:${hashedToken}`;
}

/**
 * CSRF Protection Middleware
 * 
 * Generates CSRF tokens on safe requests (GET, HEAD, OPTIONS)
 * Validates CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE)
 */
export function createCsrfMiddleware(redis: Redis | null) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const method = request.method.toUpperCase();
    const isSafeMethod = SAFE_METHODS.includes(method);

    // Skip CSRF protection for safe methods or if Redis is not available
    if (isSafeMethod || !redis) {
      // Generate and return token on safe methods
      if (isSafeMethod && redis) {
        const token = generateToken();
        const hashedToken = hashToken(token);
        const redisKey = getRedisKey(hashedToken);

        // Store token in Redis with TTL
        await redis.setex(redisKey, CSRF_TOKEN_TTL, '1');

        // Set token in response header
        reply.header(CSRF_TOKEN_HEADER, token);

        // Also set as httpOnly cookie for additional security
        reply.setCookie(CSRF_TOKEN_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: CSRF_TOKEN_TTL,
        });
      }
      return;
    }

    // For state-changing methods, validate CSRF token
    const token = request.headers[CSRF_TOKEN_HEADER.toLowerCase()] as string ||
                  request.cookies[CSRF_TOKEN_COOKIE];

    if (!token) {
      reply.code(403).send({
        error: 'CSRF token missing',
        message: 'CSRF token is required for this operation. Please include X-CSRF-Token header or csrf-token cookie.',
        code: 'CSRF_TOKEN_MISSING',
      });
      return;
    }

    // Validate token exists in Redis
    const hashedToken = hashToken(token);
    const redisKey = getRedisKey(hashedToken);
    const exists = await redis.exists(redisKey);

    if (!exists) {
      reply.code(403).send({
        error: 'CSRF token invalid',
        message: 'CSRF token is invalid or expired. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_INVALID',
      });
      return;
    }

    // Token is valid - refresh TTL
    await redis.expire(redisKey, CSRF_TOKEN_TTL);

    // Continue with request
  };
}

/**
 * Register CSRF middleware globally
 */
export function registerCsrfMiddleware(
  server: any,
  redis: Redis | null
): void {
  const middleware = createCsrfMiddleware(redis);

  // Apply to all routes except health checks and public endpoints
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip CSRF for health checks and public endpoints
    const publicPaths = ['/health', '/ready', '/metrics', '/docs', '/docs/json', '/docs/yaml'];
    if (publicPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    await middleware(request, reply);
  });

  server.log.info('✅ CSRF protection middleware registered');
}
