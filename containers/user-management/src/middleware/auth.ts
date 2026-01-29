/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and attaches user context to requests.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient } from '@coder/shared';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config';
import { log } from '../utils/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Extract token from request
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check cookies (when @fastify/cookie is registered)
  const cookieToken = (request as { cookies?: { accessToken?: string } }).cookies?.accessToken;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authenticate request using JWT token
 */
export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    log.debug('Authentication middleware called', { route: request.url, method: request.method, service: 'user-management' });
    const token = extractToken(request);
    
    if (!token) {
      log.debug('No authentication token provided', { route: request.url, method: request.method, service: 'user-management' });
      reply.code(401).send({ error: 'No authentication token provided' });
      return;
    }

    log.debug('Token found in request', { route: request.url, tokenLength: token.length, service: 'user-management' });

    // Verify JWT token
    let decoded: { userId: string; email: string; sessionId?: string; organizationId?: string };
    try {
      const config = getConfig();
      decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string; sessionId?: string; organizationId?: string };
      log.debug('Token verified successfully', { route: request.url, userId: decoded.userId, email: decoded.email, service: 'user-management' });
    } catch (verifyError: any) {
      log.error('Token verification failed', verifyError, { route: request.url, method: request.method, service: 'user-management' });
      reply.code(401).send({ error: 'Invalid or expired token' });
      return;
    }
    
    // Get user from database with session information (Prisma client - see server for DB wiring)
    const db = getDatabaseClient() as unknown as { user: { findUnique: (args: unknown) => Promise<{ id: string; email: string; name: string | null; isActive: boolean; isEmailVerified: boolean } | null> }; session: { findUnique: (args: unknown) => Promise<{ id: string; userId: string; organizationId: string; revokedAt: Date | null; expiresAt: Date } | null> } };
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        name: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      log.warn('User not found in database', { route: request.url, userId: decoded.userId, service: 'user-management' });
      reply.code(401).send({ error: 'User not found' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      log.warn('User account is deactivated', { route: request.url, userId: user.id, service: 'user-management' });
      reply.code(403).send({ error: 'Account is deactivated' });
      return;
    }

    // Extract session ID and organization ID from token
    const sessionId = decoded.sessionId;
    let organizationId = decoded.organizationId;
    
    // If session ID is available, verify session is still valid
    if (sessionId) {
      const session = await db.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          userId: true,
          organizationId: true,
          revokedAt: true,
          expiresAt: true,
        },
      });

      if (!session || session.userId !== user.id) {
        log.warn('Invalid session', { route: request.url, sessionId, userId: user.id, service: 'user-management' });
        reply.code(401).send({ error: 'Invalid session' });
        return;
      }

      if (session.revokedAt) {
        log.warn('Session has been revoked', { route: request.url, sessionId, userId: user.id, service: 'user-management' });
        reply.code(401).send({ error: 'Session has been revoked' });
        return;
      }

      if (session.expiresAt && session.expiresAt < new Date()) {
        log.warn('Session has expired', { route: request.url, sessionId, userId: user.id, service: 'user-management' });
        reply.code(401).send({ error: 'Session has expired' });
        return;
      }

      // Use organization ID from session if not in token
      if (!organizationId) {
        organizationId = session.organizationId || undefined;
      }
    }

    log.debug('User authenticated successfully', { 
      route: request.url, 
      userId: user.id, 
      email: user.email,
      sessionId,
      organizationId,
      service: 'user-management',
    });

    // Attach user and context to request
    (request as any).user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      sessionId,
    } as AuthenticatedUser & { sessionId?: string };
    
    // Attach session and organization context
    if (sessionId) {
      (request as any).sessionId = sessionId;
    }
    if (organizationId) {
      (request as any).organizationId = organizationId;
    }
  } catch (error: any) {
    log.error('Unexpected authentication error', error, { route: request.url, method: request.method, service: 'user-management' });
    reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't fail if missing
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);
    
    if (token) {
      try {
        const config = getConfig();
        const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; email: string };
        const db = getDatabaseClient() as unknown as { user: { findUnique: (args: unknown) => Promise<{ id: string; email: string; name: string | null } | null> } };
        const user = await db.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true },
        });

        if (user) {
          (request as any).user = {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
          } as AuthenticatedUser;
        }
      } catch (error) {
        // Optional auth - ignore errors
      }
    }
  } catch (error) {
    // Optional auth - ignore errors
  }
}

