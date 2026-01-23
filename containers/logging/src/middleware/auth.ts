/**
 * Authentication Middleware
 * Per ModuleImplementationGuide Section 11: Security
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  organizationId?: string;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);
    
    if (!token) {
      reply.code(401).send({ error: 'No authentication token provided' });
      return;
    }

    // Verify JWT token
    let decoded: { userId: string; email: string; organizationId?: string };
    try {
      decoded = (request.server as any).jwt.verify(token) as { userId: string; email: string; organizationId?: string };
    } catch (verifyError: any) {
      log.error('Token verification failed', verifyError);
      reply.code(401).send({ error: 'Invalid or expired token' });
      return;
    }
    
    // Get user from database
    const db = getDatabaseClient();
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      log.warn('User not found in database', { userId: decoded.userId });
      reply.code(401).send({ error: 'User not found' });
      return;
    }

    // Attach user to request
    (request as any).user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      organizationId: decoded.organizationId,
    } as AuthenticatedUser;
  } catch (error: any) {
    log.error('Unexpected authentication error', error);
    reply.code(401).send({ error: 'Authentication failed' });
  }
}

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
