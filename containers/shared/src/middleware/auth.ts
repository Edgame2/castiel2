/**
 * Authentication Middleware
 * Validates JWT tokens and injects user context
 * @module @coder/shared/middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors';

/**
 * User context from JWT
 */
export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  tenantId: string;
  organizationId?: string;
  type?: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated request interface
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

/**
 * Map JWT payload to AuthUser
 */
function mapPayloadToAuthUser(payload: any): AuthUser {
  return {
    id: payload.sub || payload.userId || payload.id,
    userId: payload.sub || payload.userId || payload.id,
    email: payload.email || '',
    tenantId: payload.tenantId || payload.organizationId || '',
    organizationId: payload.organizationId || payload.tenantId,
    type: payload.type || 'access',
    iat: payload.iat,
    exp: payload.exp,
  };
}

/**
 * Authentication middleware
 * Validates JWT tokens and injects user context
 */
export function authenticateRequest() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedError('Missing authorization header');
      }

      // Parse Bearer token
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new UnauthorizedError('Invalid authorization header format');
      }

      const token = parts[1];

      // Verify token using Fastify JWT plugin
      const jwtPlugin = (request.server as any).jwt;
      if (!jwtPlugin) {
        throw new UnauthorizedError('JWT plugin not configured');
      }

      let payload: any;
      try {
        payload = jwtPlugin.verify(token);
      } catch (error: any) {
        throw new UnauthorizedError(`Token verification failed: ${error.message}`);
      }

      if (!payload || payload.type !== 'access') {
        throw new UnauthorizedError(`Invalid token type: expected 'access', got '${payload?.type || 'undefined'}'`);
      }

      const user = mapPayloadToAuthUser(payload);

      // Validate tenantId
      if (!user.tenantId) {
        throw new UnauthorizedError('Token missing tenantId');
      }

      // Enforce tenant isolation - check X-Tenant-ID header matches token
      const headerTenant = request.headers['x-tenant-id'] as string | undefined;
      if (headerTenant && headerTenant !== user.tenantId) {
        throw new UnauthorizedError('Token tenant does not match X-Tenant-ID header');
      }

      // Inject user into request
      (request as AuthenticatedRequest).user = user;
      (request as any).auth = user; // For compatibility

    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Authentication failed';
      throw new UnauthorizedError(message);
    }
  };
}

/**
 * Optional authentication middleware
 * Validates token if present, but doesn't require it
 */
export function optionalAuthenticate() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return; // No token, continue without authentication
    }

    // If token is present, validate it
    try {
      await authenticateRequest()(request, reply);
    } catch (error) {
      // If validation fails, continue without authentication (optional)
      return;
    }
  };
}

