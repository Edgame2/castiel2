/**
 * Service-to-Service Authentication
 * @module @coder/shared/auth
 */
import { FastifyInstance } from 'fastify';
/**
 * Service token payload
 */
export interface ServiceTokenPayload {
    serviceId: string;
    serviceName: string;
    permissions?: string[];
    tenantId?: string;
    iat?: number;
    exp?: number;
}
/**
 * Generate service-to-service JWT token
 * Short-lived tokens (5-15 minutes) for service authentication
 */
export declare function generateServiceToken(server: FastifyInstance, payload: Omit<ServiceTokenPayload, 'iat' | 'exp'>): string;
/**
 * Verify service token
 */
export declare function verifyServiceToken(server: FastifyInstance, token: string): ServiceTokenPayload;
//# sourceMappingURL=serviceAuth.d.ts.map