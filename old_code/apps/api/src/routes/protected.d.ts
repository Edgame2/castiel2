import type { FastifyInstance } from 'fastify';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
/**
 * Example protected routes
 * Demonstrates authentication and authorization
 */
export declare function registerProtectedRoutes(server: FastifyInstance, tokenValidationCache: TokenValidationCacheService | null): Promise<void>;
//# sourceMappingURL=protected.d.ts.map