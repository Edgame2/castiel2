/**
 * Tenant enforcement middleware
 * Validates X-Tenant-ID header and ensures tenant isolation
 * @module @coder/shared/middleware/tenantEnforcement
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { validateTenantId } from '../utils/validation';

/**
 * Tenant context interface
 */
export interface TenantContext {
  tenantId: string;
  userId?: string;
}

/**
 * Extract tenant ID from request headers
 * The gateway injects X-Tenant-ID header (immutable, from JWT)
 */
export function extractTenantId(request: FastifyRequest): string | null {
  const tenantId = request.headers['x-tenant-id'] as string | undefined;
  return tenantId || null;
}

/**
 * Tenant enforcement middleware factory
 * Validates tenant ID and adds to request context
 */
export function tenantEnforcementMiddleware() {
  return async (
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> => {
    const tenantId = extractTenantId(request);

    if (!tenantId) {
      throw new UnauthorizedError('Tenant ID is required');
    }

    if (!validateTenantId(tenantId)) {
      throw new ForbiddenError('Invalid tenant ID format');
    }

    // Add tenant context to request
    (request as FastifyRequest & { tenantContext: TenantContext }).tenantContext =
      {
        tenantId,
        userId: (request.user as { userId?: string })?.userId,
      };
  };
}

/**
 * Get tenant context from request
 */
export function getTenantContext(
  request: FastifyRequest
): TenantContext | null {
  return (request as FastifyRequest & { tenantContext?: TenantContext })
    .tenantContext || null;
}

/**
 * Require tenant context (throws if not present)
 */
export function requireTenantContext(request: FastifyRequest): TenantContext {
  const context = getTenantContext(request);
  if (!context) {
    throw new UnauthorizedError('Tenant context is required');
  }
  return context;
}

