import type { FastifyRequest } from 'fastify';
/**
 * User information from JWT token
 */
export interface AuthUser {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
    permissions?: string[];
    organizationId?: string;
    sessionId?: string;
    isDefaultTenant?: boolean;
    iat?: number;
    exp?: number;
}
/**
 * Extended FastifyRequest with user information
 */
export interface AuthenticatedRequest extends FastifyRequest {
    user: AuthUser;
}
/**
 * JWT payload structure
 */
export interface JWTPayload {
    sub: string;
    email: string;
    tenantId: string;
    roles: string[];
    permissions?: string[];
    organizationId?: string;
    sessionId?: string;
    isDefaultTenant?: boolean;
    type: 'access' | 'refresh' | 'mfa_challenge';
    role?: string;
    iat: number;
    exp: number;
    iss?: string;
    aud?: string;
}
/**
 * Token validation result
 */
export interface TokenValidationResult {
    valid: boolean;
    user?: AuthUser;
    error?: string;
    cached?: boolean;
}
//# sourceMappingURL=auth.types.d.ts.map