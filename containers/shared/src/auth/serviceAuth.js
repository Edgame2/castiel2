/**
 * Service-to-Service Authentication
 * @module @coder/shared/auth
 */
import { signToken } from './jwt';
/**
 * Generate service-to-service JWT token
 * Short-lived tokens (5-15 minutes) for service authentication
 */
export function generateServiceToken(server, payload) {
    const tokenPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    };
    return signToken(server, tokenPayload);
}
/**
 * Verify service token
 */
export function verifyServiceToken(server, token) {
    const payload = server.jwt.verify(token);
    // Validate service token structure
    if (!payload.serviceId || !payload.serviceName) {
        throw new Error('Invalid service token: missing serviceId or serviceName');
    }
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Service token expired');
    }
    return payload;
}
//# sourceMappingURL=serviceAuth.js.map