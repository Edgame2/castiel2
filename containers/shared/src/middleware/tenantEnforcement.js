/**
 * Tenant enforcement middleware
 * Validates X-Tenant-ID header and ensures tenant isolation
 * @module @coder/shared/middleware/tenantEnforcement
 */
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { validateTenantId } from '../utils/validation';
/**
 * Extract tenant ID from request headers
 * The gateway injects X-Tenant-ID header (immutable, from JWT)
 */
export function extractTenantId(request) {
    const tenantId = request.headers['x-tenant-id'];
    return tenantId || null;
}
/**
 * Tenant enforcement middleware factory
 * Validates tenant ID and adds to request context
 */
export function tenantEnforcementMiddleware() {
    return async (request, _reply) => {
        const tenantId = extractTenantId(request);
        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID is required');
        }
        if (!validateTenantId(tenantId)) {
            throw new ForbiddenError('Invalid tenant ID format');
        }
        // Add tenant context to request
        request.tenantContext =
            {
                tenantId,
                userId: request.user?.userId,
            };
    };
}
/**
 * Get tenant context from request
 */
export function getTenantContext(request) {
    return request
        .tenantContext || null;
}
/**
 * Require tenant context (throws if not present)
 */
export function requireTenantContext(request) {
    const context = getTenantContext(request);
    if (!context) {
        throw new UnauthorizedError('Tenant context is required');
    }
    return context;
}
//# sourceMappingURL=tenantEnforcement.js.map