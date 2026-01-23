/**
 * MFA Requirement Middleware
 * Enforces MFA for sensitive operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from './error-handler.js';
import { getUser, isAuthenticated } from './authenticate.js';
import type { AuthUser } from '../types/auth.types.js';

/**
 * Sensitive operations that require MFA
 */
export const SENSITIVE_OPERATIONS = [
  // Admin operations
  'admin',
  'user-management',
  'tenant-management',
  'role-management',
  'permission-management',
  
  // Data operations
  'export',
  'bulk-delete',
  'bulk-update',
  'data-export',
  
  // Security operations
  'password-reset',
  'api-key',
  'oauth-config',
  'sso-config',
  
  // Configuration operations
  'system-config',
  'feature-flags',
] as const;

/**
 * Check if user has active MFA enabled
 */
function hasActiveMFA(user: AuthUser): boolean {
  if (!user.mfaMethods || user.mfaMethods.length === 0) {
    return false;
  }
  
  // Check if user has at least one active MFA method
  return user.mfaMethods.some(
    method => method.status === 'active'
  );
}

/**
 * Require MFA for sensitive operations
 * Checks if user has MFA enabled and verified
 */
export function requireMFA() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = getUser(request);
    
    // Check if user has active MFA
    if (!hasActiveMFA(user)) {
      throw new ForbiddenError(
        'Multi-factor authentication is required for this operation. Please enable MFA in your account settings.'
      );
    }
    
    // Note: MFA verification for individual requests would typically be done
    // via session tokens or request headers. For now, we check that MFA is enabled.
    // Full MFA challenge verification would require additional session management.
  };
}

/**
 * Require MFA for admin users
 * Admin users must have MFA enabled
 */
export function requireMFAForAdmin() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = getUser(request);
    
    // Check if user is admin
    const isAdmin = user.roles?.some(role => 
      ['admin', 'tenant_admin', 'tenant-admin', 'global_admin', 'super-admin'].includes(role.toLowerCase())
    );
    
    if (isAdmin && !hasActiveMFA(user)) {
      throw new ForbiddenError(
        'Multi-factor authentication is required for admin users. Please enable MFA in your account settings.'
      );
    }
  };
}

/**
 * Check if operation is sensitive
 */
export function isSensitiveOperation(operation: string): boolean {
  return SENSITIVE_OPERATIONS.some(sensitive => 
    operation.toLowerCase().includes(sensitive.toLowerCase())
  );
}
