/**
 * Tenant Validation Middleware
 * Extracts tenantId from JWT and injects X-Tenant-ID header
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Parse accessToken from Cookie header (e.g. "accessToken=xyz; other=abc").
 * Supports session-based auth when Authorization: Bearer is not present.
 */
function parseAccessTokenFromCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/\baccessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1].trim()) : undefined;
}

/** Path prefixes that do not require a Bearer token (public auth/invitation endpoints). Client path = /api/v1/... per API_RULES. */
const PUBLIC_AUTH_PATH_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/google',
  '/api/v1/auth/oauth/github',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/sso/saml/initiate',
  '/api/v1/auth/sso/saml/callback',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/health',
  '/api/v1/invitations',
];

/**
 * Returns true if the request path is a public auth path (no tenant/JWT required).
 */
export function isPublicAuthPath(url: string): boolean {
  const pathname = url.split('?')[0];
  return PUBLIC_AUTH_PATH_PREFIXES.some(
    (p) => pathname === p || (pathname.startsWith(p) && (pathname.length === p.length || pathname[p.length] === '/'))
  );
}

/**
 * Tenant validation middleware
 * Extracts tenantId from JWT token and injects X-Tenant-ID header
 */
export async function tenantValidationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Skip for health checks and public endpoints
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }
    // Skip for public auth paths (login, register, callbacks, password-reset, etc.)
    if (isPublicAuthPath(request.url)) {
      return;
    }

    // Get JWT payload from request (set by JWT plugin)
    const user = (request as any).user;
    
    if (!user) {
      // Prefer Authorization: Bearer; fallback to accessToken cookie (session flow)
      let token: string | undefined;
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        const cookieToken = parseAccessTokenFromCookie(request.headers.cookie);
        if (cookieToken) token = cookieToken;
      }
      if (!token) {
        reply.code(401).send({ error: 'Missing or invalid authorization header' });
        return;
      }
      try {
        const server = request.server as unknown as { jwt: { verify: (t: string) => Promise<Record<string, unknown>> } };
        const decoded = await server.jwt.verify(token);
        (request as any).user = decoded;
        // Ensure Authorization is set so ProxyService forwards it to backends (user-management, etc.)
        if (!request.headers.authorization) {
          request.headers.authorization = `Bearer ${token}`;
        }

        const tenantId = typeof decoded.tenantId === 'string' ? decoded.tenantId : undefined;

        if (!tenantId) {
          reply.code(400).send({ error: 'Missing tenantId in token' });
          return;
        }

        // Validate tenantId format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId)) {
          reply.code(400).send({ error: 'Invalid tenantId format' });
          return;
        }

        // Inject X-Tenant-ID header (immutable, cannot be overridden)
        request.headers['x-tenant-id'] = tenantId;
        (request as any).tenantId = tenantId;
      } catch (error) {
        reply.code(401).send({ error: 'Invalid or expired token' });
        return;
      }
    } else {
      // User already verified, extract tenantId (tenant-only; no organizationId)
      const tenantId = typeof (user as Record<string, unknown>).tenantId === 'string'
        ? (user as Record<string, unknown>).tenantId as string
        : undefined;

      if (!tenantId) {
        reply.code(400).send({ error: 'Missing tenantId in token' });
        return;
      }

      // Validate tenantId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        reply.code(400).send({ error: 'Invalid tenantId format' });
        return;
      }

      // Inject X-Tenant-ID header
      request.headers['x-tenant-id'] = tenantId;
      (request as any).tenantId = tenantId;
    }
  } catch (error) {
    reply.code(500).send({ error: 'Tenant validation failed' });
  }
}

