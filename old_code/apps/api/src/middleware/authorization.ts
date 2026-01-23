import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, UnauthorizedError } from './error-handler.js';
import { getUser, isAuthenticated } from './authenticate.js';
import type { AuthUser } from '../types/auth.types.js';
import type { SessionService } from '../services/auth/session.service.js';
import type { TenantService } from '@castiel/api-core';

/**
 * Roles that grant global/super admin privileges
 * Supports various naming conventions
 */
const GLOBAL_ADMIN_ROLES = ['global_admin', 'super-admin', 'super_admin', 'superadmin'];

/**
 * Check if user has global admin privileges
 */
export function isGlobalAdmin(user: AuthUser): boolean {
  return GLOBAL_ADMIN_ROLES.some(role => user.roles?.includes(role));
}

/**
 * Require authentication middleware
 * Ensures user is authenticated before proceeding
 */
export function requireAuth() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      throw new UnauthorizedError('Authentication required');
    }
  };
}

/**
 * Require specific role middleware
 * @param roles Required roles (user must have at least one)
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    
    if (!user.roles || user.roles.length === 0) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const hasRole = roles.some(role => user.roles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenError(`Requires one of: ${roles.join(', ')}`);
    }
  };
}

/**
 * Require all specified roles
 * @param roles Required roles (user must have all)
 */
export function requireAllRoles(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    
    if (!user.roles || user.roles.length === 0) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const hasAllRoles = roles.every(role => user.roles.includes(role));
    
    if (!hasAllRoles) {
      throw new ForbiddenError(`Requires all of: ${roles.join(', ')}`);
    }
  };
}

/**
 * Require user to belong to specific tenant
 * @param tenantId Tenant ID to check
 */
export function requireTenant(tenantId: string) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    
    if (user.tenantId !== tenantId) {
      throw new ForbiddenError('Access denied to this tenant');
    }
  };
}

/**
 * Require super admin role
 */
export function requireSuperAdmin() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    
    if (!isGlobalAdmin(user)) {
      throw new ForbiddenError('Super admin access required');
    }
    
    // Require MFA for admin users
    const { requireMFAForAdmin } = await import('./mfa-required.js');
    await requireMFAForAdmin()(request, _reply);
  };
}

/**
 * Require tenant admin role (admin or super admin)
 */
export function requireTenantAdmin() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    
    const isAdmin = isGlobalAdmin(user) || 
                   user.roles?.some(role => 
                     ['admin', 'tenant_admin', 'tenant-admin'].includes(role.toLowerCase())
                   );
    
    if (!isAdmin) {
      throw new ForbiddenError('Tenant admin access required');
    }
    
    // Require MFA for admin users
    const { requireMFAForAdmin } = await import('./mfa-required.js');
    await requireMFAForAdmin()(request, _reply);
  };
}

/**
 * Require user to belong to same tenant as resource
 * Expects tenantId in request params or query
 */
export function requireSameTenant() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    
    const resourceTenantId = params.tenantId || query.tenantId;
    
    if (!resourceTenantId) {
      throw new ForbiddenError('Tenant ID not provided');
    }
    
    if (user.tenantId !== resourceTenantId) {
      throw new ForbiddenError('Access denied to this tenant resource');
    }
  };
}

/**
 * Require tenant ownership/admin access or allow global admins to bypass tenant match
 */
export function requireTenantOrGlobalAdmin() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    const body = (request.body as { tenantId?: string } | undefined) || {};

    const targetTenantId = params?.tenantId || query?.tenantId || body?.tenantId;

    // Global/super admins can access any tenant
    if (isGlobalAdmin(user)) {
      return;
    }

    if (!targetTenantId) {
      throw new ForbiddenError('Tenant ID not provided');
    }

    if (user.tenantId !== targetTenantId) {
      throw new ForbiddenError('Access denied to this tenant resource');
    }
  };
}

/**
 * Require global admin role
 * Accepts multiple role name conventions
 */
export function requireGlobalAdmin() {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = getUser(request);
    
    if (!isGlobalAdmin(user)) {
      throw new ForbiddenError('Global admin access required');
    }
  };
}

/**
 * Check if user has role
 * @param user AuthUser object
 * @param role Role to check
 * @returns true if user has role
 */
export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles?.includes(role) || false;
}

/**
 * Check if user has director role
 * Directors have department-level (tenant-wide) access for strategic visibility
 */
export function isDirector(user: AuthUser): boolean {
  return user.roles?.includes('director') || false;
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
 * Check if user has any of the specified roles
 * @param user AuthUser object
 * @param roles Roles to check
 * @returns true if user has at least one role
 */
export function hasAnyRole(user: AuthUser, roles: string[]): boolean {
  return roles.some(role => user.roles?.includes(role)) || false;
}

/**
 * Check if user has all specified roles
 * @param user AuthUser object
 * @param roles Roles to check
 * @returns true if user has all roles
 */
export function hasAllRoles(user: AuthUser, roles: string[]): boolean {
  return roles.every(role => user.roles?.includes(role));
}

/**
 * Check if user is owner (has 'owner' role)
 * @param user AuthUser object
 * @returns true if user is owner
 */
export function isOwner(user: AuthUser): boolean {
  return hasRole(user, 'owner');
}

/**
 * Check if user is admin (has 'admin' role)
 * @param user AuthUser object
 * @returns true if user is admin
 */
export function isAdmin(user: AuthUser): boolean {
  return hasRole(user, 'admin');
}

/**
 * Require owner or admin role
 */
export function requireOwnerOrAdmin() {
  return requireRole('owner', 'admin');
}

/**
 * Session idle timeout middleware factory
 * Checks if the user's session has been idle for too long based on tenant settings
 */
export function createSessionIdleTimeoutMiddleware(
  sessionService: SessionService,
  tenantService: TenantService
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      return; // Let requireAuth handle this
    }

    const user = getUser(request);
    
    // Get session ID from the JWT token
    const sessionId = user.sessionId;
    if (!sessionId) {
      return; // No session tracking for this request
    }

    try {
      // Get tenant settings
      const tenant = await tenantService.getTenant(user.tenantId);
      if (!tenant) {
        return; // Tenant not found, skip check
      }

      const idleTimeoutMinutes = tenant.settings?.security?.sessionIdleTimeoutMinutes;
      
      // If no idle timeout configured or set to 0, skip check
      if (!idleTimeoutMinutes || idleTimeoutMinutes <= 0) {
        // Still update last activity
        await sessionService.touchSession(user.tenantId, user.id, sessionId);
        return;
      }

      // Check if session is idle
      const idleCheck = await sessionService.checkSessionIdleTimeout(
        user.tenantId,
        user.id,
        sessionId,
        idleTimeoutMinutes
      );

      if (!idleCheck.valid) {
        // Session has been idle for too long
        const requireReauth = tenant.settings?.security?.requireReauthOnIdle ?? true;
        
        if (requireReauth) {
          // Invalidate the session
          await sessionService.deleteSession(user.tenantId, user.id, sessionId);
          
          throw new UnauthorizedError(
            `Session expired due to inactivity (idle for ${idleCheck.idleMinutes} minutes). Please log in again.`
          );
        }
      }

      // Update last activity timestamp
      await sessionService.touchSession(user.tenantId, user.id, sessionId);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      // Log error but don't block request for non-critical failures
      request.log.warn({ error, userId: user.id }, 'Failed to check session idle timeout');
    }
  };
}

/**
 * IP allowlist middleware factory
 * Checks if the request IP is in the tenant's allowlist
 */
export function createIPAllowlistMiddleware(tenantService: TenantService) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!isAuthenticated(request)) {
      return; // Let requireAuth handle this
    }

    const user = getUser(request);

    try {
      // Get tenant settings
      const tenant = await tenantService.getTenant(user.tenantId);
      if (!tenant) {
        return; // Tenant not found, skip check
      }

      const securitySettings = tenant.settings?.security;
      
      // Check if IP allowlist is enabled
      if (!securitySettings?.ipAllowlistEnabled || !securitySettings?.ipAllowlist?.length) {
        return; // IP allowlist not configured or empty
      }

      const clientIP = request.ip;
      const allowlist = securitySettings.ipAllowlist;

      // Check if client IP is in allowlist
      const isAllowed = allowlist.some(allowedIP => {
        // Support for CIDR notation could be added here
        // For now, just do exact match or wildcard
        if (allowedIP === '*') {return true;}
        if (allowedIP === clientIP) {return true;}
        
        // Simple wildcard support (e.g., 192.168.1.*)
        if (allowedIP.endsWith('.*')) {
          const prefix = allowedIP.slice(0, -2);
          return clientIP.startsWith(prefix);
        }
        
        return false;
      });

      if (!isAllowed) {
        throw new ForbiddenError(
          `Access denied. Your IP address (${clientIP}) is not in the allowed list for this organization.`
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      // Log error but don't block request for non-critical failures
      request.log.warn({ error, userId: user.id }, 'Failed to check IP allowlist');
    }
  };
}
