/**
 * Super Admin Integration Catalog Routes
 *
 * REST API endpoints for managing the integration catalog
 * All routes require super admin authentication
 */
import { FastifyInstance } from 'fastify';
import { SuperAdminIntegrationCatalogController } from '../controllers/super-admin-integration-catalog.controller.js';
/**
 * Register super admin integration catalog routes
 */
export declare function registerSuperAdminIntegrationCatalogRoutes(fastify: FastifyInstance, controller: SuperAdminIntegrationCatalogController): Promise<void>;
//# sourceMappingURL=super-admin-integration-catalog.routes.d.ts.map