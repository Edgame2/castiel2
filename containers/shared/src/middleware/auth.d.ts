/**
 * Authentication Middleware
 * Validates JWT tokens and injects user context
 * @module @coder/shared/middleware
 */
import { FastifyRequest, FastifyReply } from 'fastify';
/**
 * User context from JWT
 */
export interface AuthUser {
    id: string;
    userId: string;
    email: string;
    tenantId: string;
    organizationId?: string;
    type?: string;
    iat?: number;
    exp?: number;
}
/**
 * Authenticated request interface
 */
export interface AuthenticatedRequest extends FastifyRequest {
    user: AuthUser;
}
/**
 * Authentication middleware
 * Validates JWT tokens and injects user context
 */
export declare function authenticateRequest(): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Optional authentication middleware
 * Validates token if present, but doesn't require it
 */
export declare function optionalAuthenticate(): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map