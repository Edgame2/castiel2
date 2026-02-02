/**
 * Error Handler Middleware
 * 
 * Centralized error handling for API routes.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { SecretError } from '../errors/SecretErrors';
import { getLoggingClient } from '../services/logging/LoggingClient';

export async function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as any).user;
  
  // Log error
  await getLoggingClient().sendLog({
    level: 'error',
    message: 'API request failed',
    service: 'secret-management',
    metadata: {
      method: request.method,
      path: request.url,
      error: error.message,
      errorStack: error.stack,
      userId: user?.id,
      organizationId: user?.organizationId,
      statusCode: error instanceof SecretError ? 400 : 500,
    },
  });
  
  // Determine status code
  let statusCode = 500;
  if (error instanceof SecretError) {
    switch (error.code) {
      // Not Found (404)
      case 'SECRET_NOT_FOUND':
      case 'VERSION_NOT_FOUND':
      case 'GRANT_NOT_FOUND':
      case 'KEY_NOT_FOUND':
      case 'VAULT_NOT_CONFIGURED':
        statusCode = 404;
        break;
      
      // Forbidden (403)
      case 'ACCESS_DENIED':
        statusCode = 403;
        break;
      
      // Gone (410) - Resource no longer available
      case 'SECRET_EXPIRED':
      case 'RECOVERY_PERIOD_EXPIRED':
        statusCode = 410;
        break;
      
      // Conflict (409) - Resource already exists
      case 'SECRET_ALREADY_EXISTS':
        statusCode = 409;
        break;
      
      // Bad Gateway (502) - External service error
      case 'VAULT_CONNECTION_FAILED':
        statusCode = 502;
        break;
      
      // Bad Request (400) - Client errors
      case 'INVALID_SECRET_TYPE':
      case 'INVALID_SECRET_VALUE':
      case 'INVALID_SCOPE':
      case 'INVALID_GRANTEE':
      case 'ENCRYPTION_FAILED':
      case 'DECRYPTION_FAILED':
      case 'ROTATION_FAILED':
      case 'IMPORT_FAILED':
      case 'EXPORT_FAILED':
      case 'MIGRATION_FAILED':
      case 'KEY_ROTATION_FAILED':
      default:
        statusCode = 400;
    }
  }
  
  // Return error response
  reply.code(statusCode).send({
    error: error.message,
    code: error instanceof SecretError ? error.code : 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
