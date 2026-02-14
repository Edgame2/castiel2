/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and attaches user context to requests
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient } from '@coder/shared';
import { validateSession } from '../services/SessionService';
import { log } from '../utils/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Extract token from request (Bearer, X-API-Key, or cookie)
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const apiKey = request.headers['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.trim()) {
    return apiKey.trim();
  }
  const cookieToken = (request as any).cookies?.accessToken;
  if (cookieToken) {
    return cookieToken;
  }
  return null;
}

/**
 * Authenticate request - validates JWT token and attaches user to request
 */
export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    log.debug('Authentication middleware called', { route: request.url, method: request.method, service: 'auth' });
    const token = extractToken(request);

    if (!token) {
      log.debug('No authentication token provided', { route: request.url, method: request.method, service: 'auth' });
      reply.code(401).send({ error: 'No authentication token provided' });
      return;
    }

    log.debug('Token found in request', { route: request.url, tokenLength: token.length, service: 'auth' });

    // API key auth (when feature enabled and token looks like API key)
    if (token.startsWith('ak_')) {
      const { getConfig } = await import('../config');
      if (getConfig().features?.api_keys) {
        const { ApiKeyService } = await import('../services/ApiKeyService');
        const result = await new ApiKeyService().validate(token);
        if (result) {
          (request as any).user = {
            id: result.userId,
            email: '',
            name: undefined,
          } as AuthenticatedUser;
          (request as any).tenantId = result.tenantId;
          (request as any).apiKeyAuth = true;
          log.debug('Request authenticated via API key', { userId: result.userId, route: request.url, service: 'auth' });
          return;
        }
      }
      reply.code(401).send({ error: 'Invalid or expired API key' });
      return;
    }

    // JWT/session auth
    const userAgent = request.headers['user-agent'] || null;
    const sessionData = await validateSession(token, userAgent, request.server);

    if (!sessionData) {
      log.warn('Invalid or expired session', { route: request.url, service: 'auth' });
      reply.code(401).send({ error: 'Invalid or expired token' });
      return;
    }

    // Get user from database
    const db = getDatabaseClient() as any;
    const user = await db.user.findUnique({
      where: { id: sessionData.userId },
      select: { 
        id: true, 
        email: true, 
        name: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      log.warn('User not found in database', { route: request.url, userId: sessionData.userId, service: 'auth' });
      reply.code(401).send({ error: 'User not found' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      log.warn('User account is deactivated', { route: request.url, userId: user.id, service: 'auth' });
      reply.code(403).send({ error: 'Account is deactivated' });
      return;
    }

    const tenantId = sessionData.tenantId;
    log.debug('User authenticated successfully', {
      route: request.url,
      userId: user.id,
      email: user.email,
      sessionId: sessionData.sessionId,
      tenantId,
      service: 'auth',
    });

    // Attach user and context to request (tenant-only)
    (request as any).user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    } as AuthenticatedUser;
    if (sessionData.sessionId) {
      (request as any).sessionId = sessionData.sessionId;
    }
    if (tenantId) {
      (request as any).tenantId = tenantId;
    }
  } catch (error: any) {
    log.error('Unexpected authentication error', error, { route: request.url, method: request.method, service: 'auth' });
    reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't fail if missing/invalid
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);

    if (token?.startsWith('ak_')) {
      const { getConfig } = await import('../config');
      if (getConfig().features?.api_keys) {
        const { ApiKeyService } = await import('../services/ApiKeyService');
        const result = await new ApiKeyService().validate(token);
        if (result) {
          (request as any).user = {
            id: result.userId,
            email: '',
            name: undefined,
          } as AuthenticatedUser;
          (request as any).tenantId = result.tenantId;
          (request as any).apiKeyAuth = true;
        }
      }
      return;
    }

    if (token) {
      const userAgent = request.headers['user-agent'] || null;
      const sessionData = await validateSession(token, userAgent, request.server);

      if (sessionData) {
        const db = getDatabaseClient() as any;
        const user = await db.user.findUnique({
          where: { id: sessionData.userId },
          select: { id: true, email: true, name: true },
        });

        if (user) {
          (request as any).user = {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
          } as AuthenticatedUser;
          if (sessionData.sessionId) {
            (request as any).sessionId = sessionData.sessionId;
          }
          const tenantId = sessionData.tenantId;
          if (tenantId) {
            (request as any).tenantId = tenantId;
          }
        }
      }
    }
  } catch (error) {
    // Optional auth - ignore errors
  }
}



