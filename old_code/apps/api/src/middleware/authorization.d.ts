import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '../types/auth.types.js';
import type { SessionService } from '../services/auth/session.service.js';
import type { TenantService } from '../services/auth/tenant.service.js';
/**
 * Check if user has global admin privileges
 */
export declare function isGlobalAdmin(user: AuthUser): boolean;
/**
 * Require authentication middleware
 * Ensures user is authenticated before proceeding
 */
export declare function requireAuth(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require specific role middleware
 * @param roles Required roles (user must have at least one)
 */
export declare function requireRole(...roles: string[]): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require all specified roles
 * @param roles Required roles (user must have all)
 */
export declare function requireAllRoles(...roles: string[]): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require user to belong to specific tenant
 * @param tenantId Tenant ID to check
 */
export declare function requireTenant(tenantId: string): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require super admin role
 */
export declare function requireSuperAdmin(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require tenant admin role (admin or super admin)
 */
export declare function requireTenantAdmin(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require user to belong to same tenant as resource
 * Expects tenantId in request params or query
 */
export declare function requireSameTenant(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require tenant ownership/admin access or allow global admins to bypass tenant match
 */
export declare function requireTenantOrGlobalAdmin(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Require global admin role
 * Accepts multiple role name conventions
 */
export declare function requireGlobalAdmin(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Check if user has role
 * @param user AuthUser object
 * @param role Role to check
 * @returns true if user has role
 */
export declare function hasRole(user: AuthUser, role: string): boolean;
/**
 * Check if user has any of the specified roles
 * @param user AuthUser object
 * @param roles Roles to check
 * @returns true if user has at least one role
 */
export declare function hasAnyRole(user: AuthUser, roles: string[]): boolean;
/**
 * Check if user has all specified roles
 * @param user AuthUser object
 * @param roles Roles to check
 * @returns true if user has all roles
 */
export declare function hasAllRoles(user: AuthUser, roles: string[]): boolean;
/**
 * Check if user is owner (has 'owner' role)
 * @param user AuthUser object
 * @returns true if user is owner
 */
export declare function isOwner(user: AuthUser): boolean;
/**
 * Check if user is admin (has 'admin' role)
 * @param user AuthUser object
 * @returns true if user is admin
 */
export declare function isAdmin(user: AuthUser): boolean;
/**
 * Require owner or admin role
 */
export declare function requireOwnerOrAdmin(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Session idle timeout middleware factory
 * Checks if the user's session has been idle for too long based on tenant settings
 */
export declare function createSessionIdleTimeoutMiddleware(sessionService: SessionService, tenantService: TenantService): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * IP allowlist middleware factory
 * Checks if the request IP is in the tenant's allowlist
 */
export declare function createIPAllowlistMiddleware(tenantService: TenantService): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=authorization.d.ts.map