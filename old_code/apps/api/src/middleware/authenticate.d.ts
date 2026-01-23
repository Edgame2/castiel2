import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser, JWTPayload } from '../types/auth.types.js';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
export declare const mapPayloadToAuthUser: (payload: JWTPayload) => AuthUser;
/**
 * Authentication middleware
 * Validates JWT tokens and injects user context
 */
export declare function authenticate(tokenCache: TokenValidationCacheService | null): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Optional authentication middleware
 * Validates token if present, but doesn't require it
 */
export declare function optionalAuthenticate(tokenCache: TokenValidationCacheService | null): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
/**
 * Extract user from authenticated request
 * @param request Fastify request
 * @returns AuthUser or throws error
 */
export declare function getUser(request: FastifyRequest): AuthUser;
/**
 * Check if request is authenticated
 * @param request Fastify request
 * @returns true if authenticated
 */
export declare function isAuthenticated(request: FastifyRequest): boolean;
//# sourceMappingURL=authenticate.d.ts.map