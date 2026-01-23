/**
 * Tenant Provisioning Routes
 * Management endpoints for tenant SCIM provisioning configuration
 */
import type { FastifyInstance } from 'fastify';
import type { SCIMService } from '../services/auth/scim.service.js';
/**
 * Register tenant provisioning routes
 */
export declare function registerTenantProvisioningRoutes(server: FastifyInstance, scimService: SCIMService): Promise<void>;
//# sourceMappingURL=tenant-provisioning.routes.d.ts.map