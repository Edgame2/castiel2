/**
 * SCIM Routes
 * SCIM 2.0 compliant endpoints for user and group provisioning
 */
import type { FastifyInstance } from 'fastify';
import type { SCIMService } from '../services/auth/scim.service.js';
/**
 * Register SCIM 2.0 routes
 */
export declare function registerSCIMRoutes(server: FastifyInstance, scimService: SCIMService): Promise<void>;
//# sourceMappingURL=scim.routes.d.ts.map