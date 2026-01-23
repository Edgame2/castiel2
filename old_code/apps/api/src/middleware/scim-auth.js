/**
 * SCIM Authentication Middleware
 * Validates SCIM bearer tokens for SCIM 2.0 endpoints
 */
import { UnauthorizedError } from './error-handler.js';
/**
 * Extract tenant ID from request
 * SCIM implementations typically use:
 * 1. Custom header (X-Tenant-ID or X-SCIM-Tenant-ID)
 * 2. Query parameter (tenantId)
 * 3. Path parameter (if using tenant-scoped paths)
 */
function extractTenantId(request) {
    // Priority 1: Custom header (most common in SCIM)
    const headerTenantId = request.headers['x-tenant-id'] ||
        request.headers['x-scim-tenant-id'] ||
        request.headers['x-organization-id'];
    if (headerTenantId && typeof headerTenantId === 'string') {
        return headerTenantId;
    }
    // Priority 2: Query parameter
    const query = request.query;
    if (query.tenantId) {
        return query.tenantId;
    }
    // Priority 3: Path parameter (if using tenant-scoped paths like /scim/v2/{tenantId}/Users)
    const pathMatch = request.url.match(/^\/scim\/v2\/([^\/]+)\//);
    if (pathMatch) {
        return pathMatch[1];
    }
    return null;
}
/**
 * SCIM Authentication Middleware
 * Validates SCIM bearer token and extracts tenant ID
 */
export function scimAuthenticate(scimService) {
    return async (request, reply) => {
        try {
            // Extract token from Authorization header
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                throw new UnauthorizedError('Missing authorization header');
            }
            // Parse Bearer token
            const parts = authHeader.split(' ');
            if (parts.length !== 2 || parts[0] !== 'Bearer') {
                throw new UnauthorizedError('Invalid authorization header format');
            }
            const token = parts[1];
            // Extract tenant ID from request
            const tenantId = extractTenantId(request);
            if (!tenantId) {
                throw new UnauthorizedError('Tenant ID not found in request. Provide X-Tenant-ID header or tenantId query parameter.');
            }
            // Verify token
            const isValid = await scimService.verifyToken(tenantId, token);
            if (!isValid) {
                throw new UnauthorizedError('Invalid SCIM token');
            }
            // Attach tenant ID to request for use in handlers
            request.scimTenantId = tenantId;
        }
        catch (error) {
            if (error instanceof UnauthorizedError) {
                reply.status(401).send({
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: error.message,
                    status: '401',
                });
                return;
            }
            throw error;
        }
    };
}
//# sourceMappingURL=scim-auth.js.map