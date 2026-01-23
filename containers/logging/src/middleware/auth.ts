/**
 * Authentication Middleware
 * Per ModuleImplementationGuide Section 11: Security
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '.prisma/logging-client';
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
    
    // Get Prisma client from app (attached in server.ts)
    const prisma = (request.server as any).prisma as PrismaClient;
    
    // Note: Logging service doesn't have a user table - user data comes from JWT
    // In a production system, you might want to call user-management service to verify user
    // For now, we trust the JWT token (already verified above)
    // If Prisma is not available, we still proceed with JWT data
    
    // Attach user to request from JWT (trusted after verification)
    (request as any).user = {
      id: decoded.userId,
      email: decoded.email,
      name: undefined, // Not available in JWT, would need to call user-management service
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
