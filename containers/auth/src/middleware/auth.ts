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
 * Extract token from request
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check cookies
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

    // Validate session using session service
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

    log.debug('User authenticated successfully', { 
      route: request.url, 
      userId: user.id, 
      email: user.email,
      sessionId: sessionData.sessionId,
      organizationId: sessionData.organizationId,
      service: 'auth',
    });

    // Attach user and context to request
    (request as any).user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    } as AuthenticatedUser;
    
    // Attach session and organization context
    if (sessionData.sessionId) {
      (request as any).sessionId = sessionData.sessionId;
    }
    if (sessionData.organizationId) {
      (request as any).organizationId = sessionData.organizationId;
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
          if (sessionData.organizationId) {
            (request as any).organizationId = sessionData.organizationId;
          }
        }
      }
    }
  } catch (error) {
    // Optional auth - ignore errors
  }
}



