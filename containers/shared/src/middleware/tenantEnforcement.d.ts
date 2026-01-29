/**
 * Tenant enforcement middleware
 * Validates X-Tenant-ID header and ensures tenant isolation
 * @module @coder/shared/middleware/tenantEnforcement
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
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
export declare function extractTenantId(request: FastifyRequest): string | null;
/**
 * Tenant enforcement middleware factory
 * Validates tenant ID and adds to request context
 */
export declare function tenantEnforcementMiddleware(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Get tenant context from request
 */
export declare function getTenantContext(request: FastifyRequest): TenantContext | null;
/**
 * Require tenant context (throws if not present)
 */
export declare function requireTenantContext(request: FastifyRequest): TenantContext;
//# sourceMappingURL=tenantEnforcement.d.ts.map