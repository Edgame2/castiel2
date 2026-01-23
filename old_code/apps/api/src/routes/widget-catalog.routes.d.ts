/**
 * Widget Catalog Routes
 * API routes for widget catalog management
 *
 * SuperAdmin Routes (/api/v1/admin/widget-catalog/*):
 * - POST   /api/v1/admin/widget-catalog           - Create widget type
 * - GET    /api/v1/admin/widget-catalog           - List widget types
 * - GET    /api/v1/admin/widget-catalog/:id       - Get widget type
 * - PATCH  /api/v1/admin/widget-catalog/:id       - Update widget type
 * - DELETE /api/v1/admin/widget-catalog/:id       - Delete widget type
 *
 * TenantAdmin Routes (/api/v1/admin/tenants/:tenantId/widget-access/*):
 * - GET    /api/v1/admin/tenants/:tenantId/widget-access      - Get config
 * - PUT    /api/v1/admin/tenants/:tenantId/widget-access      - Update config
 * - PATCH  /api/v1/admin/tenants/:tenantId/widget-access/:widgetId - Update access
 */
import type { FastifyInstance } from 'fastify';
export declare function widgetCatalogRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=widget-catalog.routes.d.ts.map