/**
 * Request Context Utilities
 * 
 * Helper functions for extracting context from Fastify requests.
 */

import { FastifyRequest } from 'fastify';
import { SecretContext } from '../types';

/**
 * Extract secret context from request
 */
export function getSecretContext(request: FastifyRequest): SecretContext {
  const user = (request as any).user;
  
  return {
    userId: user?.id || 'anonymous',
    organizationId: user?.organizationId,
    teamId: user?.teamId,
    projectId: user?.projectId,
    consumerModule: (request.headers['x-consumer-module'] as string) || 'secret-management',
    consumerResourceId: (request.headers['x-consumer-resource-id'] as string),
  };
}

/**
 * Get request metadata for logging
 */
export function getRequestMetadata(request: FastifyRequest): {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
} {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    requestId: (request.headers['x-request-id'] as string) || request.id,
  };
}
