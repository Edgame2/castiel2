/**
 * JWT Setup Utilities
 * @module @coder/shared/auth
 */
import { FastifyInstance } from 'fastify';
/**
 * JWT configuration options
 */
export interface JWTSetupOptions {
    secret: string;
    issuer?: string;
    audience?: string;
    expiresIn?: string;
    refreshExpiration?: string;
}
/**
 * Setup JWT authentication on Fastify instance
 * Registers @fastify/jwt plugin with configured options
 */
export declare function setupJWT(server: FastifyInstance, options: JWTSetupOptions): Promise<void>;
/**
 * Generate JWT token
 */
export declare function signToken(server: FastifyInstance, payload: Record<string, any>): string;
/**
 * Verify JWT token
 */
export declare function verifyToken(server: FastifyInstance, token: string): any;
//# sourceMappingURL=jwt.d.ts.map