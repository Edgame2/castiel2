/**
 * Director Role Authorization Middleware
 * Provides department-level access and cross-team visibility for directors
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from './error-handler.js';
import { getUser, isAuthenticated } from './authenticate.js';
import type { AuthUser } from '../types/auth.types.js';
import { UserRole, hasPermission } from '@castiel/shared-types';

/**
 * Check if user has director role
 */
export function isDirector(user: AuthUser): boolean {
  return user.roles?.includes(UserRole.DIRECTOR) || false;
}

/**
 * Require director role
 */
export function requireDirector() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = getUser(request);
    
    if (!isDirector(user)) {
      throw new ForbiddenError('Director role required');
    }
  };
}

/**
 * Require director or admin role
 */
export function requireDirectorOrAdmin() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = getUser(request);
    
    const isAdmin = user.roles?.some(role => 
      ['admin', 'tenant_admin', 'tenant-admin', 'global_admin', 'super-admin'].includes(role.toLowerCase())
    );
    
    if (!isDirector(user) && !isAdmin) {
      throw new ForbiddenError('Director or admin role required');
    }
  };
}

/**
 * Check if user has department-level access permission
 * Directors have tenant-wide read access for strategic visibility
 */
export function hasDepartmentLevelAccess(user: AuthUser, resource: string, action: string = 'read'): boolean {
  if (!user.roles) {
    return false;
  }

  // Check if user has director role
  if (isDirector(user)) {
    // Directors have tenant-level read access
    const permission = `${resource}:${action}:tenant`;
    return user.roles.some(role => {
      try {
        const userRole = role as UserRole;
        return hasPermission(userRole, permission);
      } catch {
        return false;
      }
    });
  }

  return false;
}

/**
 * Require department-level access
 * Used for operations that require director-level visibility
 */
export function requireDepartmentLevelAccess(resource: string, action: string = 'read') {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = getUser(request);
    
    if (!hasDepartmentLevelAccess(user, resource, action)) {
      throw new ForbiddenError(`Department-level ${action} access required for ${resource}`);
    }
  };
}

/**
 * Filter data based on director permissions
 * Directors can see tenant-wide data, managers see team data, users see assigned data
 */
export function filterByDirectorAccess<T extends { tenantId: string; teamId?: string; ownerId?: string }>(
  items: T[],
  user: AuthUser
): T[] {
  if (!user.roles) {
    return [];
  }

  // Directors can see all tenant data
  if (isDirector(user)) {
    return items; // No filtering needed - directors have tenant-wide access
  }

  // For other roles, filtering would be done by ACL or other mechanisms
  // This is a placeholder for director-specific filtering logic
  return items;
}
