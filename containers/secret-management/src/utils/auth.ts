/**
 * Authentication Utilities
 * 
 * Helper functions for service-to-service authentication.
 */

import { FastifyRequest } from 'fastify';
import { AccessDeniedError } from '../errors/SecretErrors';

/**
 * Verify service-to-service authentication
 */
export function verifyServiceAuth(request: FastifyRequest): {
  serviceToken: string;
  requestingService: string;
  organizationId?: string;
} {
  const serviceToken = request.headers['x-service-token'] as string;
  const requestingService = request.headers['x-requesting-service'] as string;
  const organizationId = request.headers['x-organization-id'] as string;

  if (!serviceToken || serviceToken !== process.env.SERVICE_AUTH_TOKEN) {
    throw new AccessDeniedError('', 'system', 'SERVICE_AUTH', 'Invalid service token');
  }

  if (!requestingService) {
    throw new AccessDeniedError('', 'system', 'SERVICE_AUTH', 'Missing requesting service');
  }

  return {
    serviceToken,
    requestingService,
    organizationId,
  };
}

/**
 * Verify service is authorized for operation
 */
export function verifyServiceAuthorized(
  requestingService: string,
  allowedServices: string[]
): void {
  if (!allowedServices.includes(requestingService)) {
    throw new AccessDeniedError(
      '',
      'system',
      'SERVICE_AUTH',
      `Service ${requestingService} is not authorized for this operation`
    );
  }
}
