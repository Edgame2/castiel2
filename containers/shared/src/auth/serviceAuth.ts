/**
 * Service-to-Service Authentication
 * @module @coder/shared/auth
 */

import { FastifyInstance } from 'fastify';
import { signToken } from './jwt';

/**
 * Service token payload
 */
export interface ServiceTokenPayload {
  serviceId: string;
  serviceName: string;
  permissions?: string[];
  tenantId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate service-to-service JWT token
 * Short-lived tokens (5-15 minutes) for service authentication
 */
export function generateServiceToken(
  server: FastifyInstance,
  payload: Omit<ServiceTokenPayload, 'iat' | 'exp'>
): string {
  const tokenPayload: ServiceTokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
  };

  return signToken(server, tokenPayload);
}

/**
 * Verify service token
 */
export function verifyServiceToken(server: FastifyInstance, token: string): ServiceTokenPayload {
  const payload = server.jwt.verify<ServiceTokenPayload>(token);

  // Validate service token structure
  if (!payload.serviceId || !payload.serviceName) {
    throw new Error('Invalid service token: missing serviceId or serviceName');
  }

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Service token expired');
  }

  return payload;
}

