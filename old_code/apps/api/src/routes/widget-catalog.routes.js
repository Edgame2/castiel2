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
import { MonitoringService } from '@castiel/monitoring';
import { WidgetCatalogService } from '../services/widget-catalog.service.js';
import { requireGlobalAdmin, requireAuth, requireRole, requireSameTenant } from '../middleware/authorization.js';
import { CreateWidgetCatalogEntrySchema, UpdateWidgetCatalogEntrySchema, UpdateTenantWidgetAccessSchema, UpdateTenantWidgetConfigSchema, ListWidgetCatalogSchema, } from '../schemas/widget-catalog.schemas.js';
export async function widgetCatalogRoutes(fastify) {
    const monitoring = MonitoringService.getInstance() || MonitoringService.initialize({
        enabled: false,
        provider: 'mock',
    });
    const service = new WidgetCatalogService(monitoring);
    // ============================================================================
    // SuperAdmin: Widget Catalog Entry Management
    // ============================================================================
    /**
     * POST /api/v1/admin/widget-catalog
     * Create widget catalog entry (SuperAdmin only)
     */
    fastify.post('/admin/widget-catalog', {
        preHandler: [requireAuth, requireGlobalAdmin],
        schema: {
            tags: ['admin', 'widget-catalog'],
            summary: 'Create widget catalog entry',
            description: 'SuperAdmin only. Create a new widget type in the system catalog.',
            body: {
                type: 'object',
                required: [
                    'widgetType',
                    'name',
                    'displayName',
                    'description',
                    'category',
                    'defaultSize',
                    'defaultConfig',
                    'visibilityLevel',
                ],
            },
        },
    }, async (request, reply) => {
        try {
            const validated = CreateWidgetCatalogEntrySchema.parse(request.body);
            const userId = request.user?.id || 'system';
            const entry = await service.createCatalogEntry(validated, userId);
            return reply.status(201).send({
                success: true,
                data: entry,
                message: 'Widget catalog entry created successfully',
            });
        }
        catch (error) {
            monitoring.trackException(error, { context: 'POST /api/v1/admin/widget-catalog' });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /api/v1/admin/widget-catalog
     * List widget catalog entries (SuperAdmin only)
     */
    fastify.get('/admin/widget-catalog', {
        preHandler: [requireAuth, requireGlobalAdmin],
        schema: {
            tags: ['admin', 'widget-catalog'],
            summary: 'List widget catalog entries',
            querystring: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    category: { type: 'string' },
                    visibilityLevel: { type: 'string' },
                    search: { type: 'string' },
                    sort: { type: 'string', enum: ['name', 'category', 'recent', 'featured'] },
                    page: { type: 'integer', minimum: 1 },
                    limit: { type: 'integer', minimum: 1, maximum: 100 },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const validated = ListWidgetCatalogSchema.parse(request.query);
            const result = await service.listCatalogEntries(validated);
            return reply.send({
                success: true,
                data: result,
            });
        }
        catch (error) {
            monitoring.trackException(error, { context: 'GET /api/v1/admin/widget-catalog' });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * GET /api/v1/admin/widget-catalog/:id
     * Get widget catalog entry (SuperAdmin only)
     */
    fastify.get('/admin/widget-catalog/:id', {
        preHandler: [requireAuth, requireGlobalAdmin],
        schema: {
            tags: ['admin', 'widget-catalog'],
            summary: 'Get widget catalog entry',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const entry = await service.getCatalogEntry(id);
            if (!entry) {
                return reply.status(404).send({
                    success: false,
                    error: 'Widget catalog entry not found',
                });
            }
            return reply.send({
                success: true,
                data: entry,
            });
        }
        catch (error) {
            monitoring.trackException(error, { context: 'GET /api/v1/admin/widget-catalog/:id' });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * PATCH /api/v1/admin/widget-catalog/:id
     * Update widget catalog entry (SuperAdmin only)
     */
    fastify.patch('/admin/widget-catalog/:id', {
        preHandler: [requireAuth, requireGlobalAdmin],
        schema: {
            tags: ['admin', 'widget-catalog'],
            summary: 'Update widget catalog entry',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const validated = UpdateWidgetCatalogEntrySchema.parse(request.body);
            const userId = request.user?.id || 'system';
            const entry = await service.updateCatalogEntry(id, validated, userId);
            return reply.send({
                success: true,
                data: entry,
                message: 'Widget catalog entry updated successfully',
            });
        }
        catch (error) {
            monitoring.trackException(error, { context: 'PATCH /api/v1/admin/widget-catalog/:id' });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * DELETE /api/v1/admin/widget-catalog/:id
     * Delete widget catalog entry (SuperAdmin only)
     */
    fastify.delete('/admin/widget-catalog/:id', {
        preHandler: [requireAuth, requireGlobalAdmin],
        schema: {
            tags: ['admin', 'widget-catalog'],
            summary: 'Delete widget catalog entry',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            await service.deleteCatalogEntry(id);
            return reply.send({
                success: true,
                message: 'Widget catalog entry deleted successfully',
            });
        }
        catch (error) {
            monitoring.trackException(error, { context: 'DELETE /api/v1/admin/widget-catalog/:id' });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    // ============================================================================
    // TenantAdmin: Widget Access & Visibility Customization
    // ============================================================================
    /**
     * GET /api/v1/admin/tenants/:tenantId/widget-access
     * Get tenant widget configuration (TenantAdmin only)
     */
    fastify.get('/admin/tenants/:tenantId/widget-access', {
        preHandler: [requireAuth, requireRole("admin", "owner", "global_admin"), requireSameTenant()],
        schema: {
            tags: ['admin', 'widget-access'],
            summary: 'Get tenant widget configuration',
            params: {
                type: 'object',
                properties: {
                    tenantId: { type: 'string' },
                },
                required: ['tenantId'],
            },
        },
    }, async (request, reply) => {
        try {
            const { tenantId } = request.params;
            const config = await service.getTenantWidgetConfig(tenantId);
            return reply.send({
                success: true,
                data: config,
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                context: 'GET /api/v1/admin/tenants/:tenantId/widget-access',
            });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * PUT /api/v1/admin/tenants/:tenantId/widget-access
     * Update tenant widget configuration (TenantAdmin only)
     * Visibility and role-based access customization
     */
    fastify.put('/admin/tenants/:tenantId/widget-access', {
        preHandler: [requireAuth, requireRole("admin", "owner", "global_admin"), requireSameTenant()],
        schema: {
            tags: ['admin', 'widget-access'],
            summary: 'Update tenant widget configuration',
            params: {
                type: 'object',
                properties: {
                    tenantId: { type: 'string' },
                },
                required: ['tenantId'],
            },
        },
    }, async (request, reply) => {
        try {
            const { tenantId } = request.params;
            const validated = UpdateTenantWidgetConfigSchema.parse(request.body);
            const userId = request.user?.id || 'system';
            const config = await service.updateTenantWidgetConfig(tenantId, validated, userId);
            return reply.send({
                success: true,
                data: config,
                message: 'Tenant widget configuration updated successfully',
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                context: 'PUT /api/v1/admin/tenants/:tenantId/widget-access',
            });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * PATCH /api/v1/admin/tenants/:tenantId/widget-access/:widgetId
     * Update widget access for specific widget (TenantAdmin only)
     * Customize visibility and role-based access for a single widget
     */
    fastify.patch('/admin/tenants/:tenantId/widget-access/:widgetId', {
        preHandler: [requireAuth, requireRole("admin", "owner", "global_admin"), requireSameTenant()],
        schema: {
            tags: ['admin', 'widget-access'],
            summary: 'Update widget access for tenant',
            params: {
                type: 'object',
                properties: {
                    tenantId: { type: 'string' },
                    widgetId: { type: 'string' },
                },
                required: ['tenantId', 'widgetId'],
            },
        },
    }, async (request, reply) => {
        try {
            const { tenantId, widgetId } = request.params;
            const body = request.body;
            const validated = UpdateTenantWidgetAccessSchema.parse({
                widgetCatalogEntryId: widgetId,
                ...body,
            });
            const userId = request.user?.id || 'system';
            const override = await service.updateTenantWidgetAccess(tenantId, validated, userId);
            return reply.send({
                success: true,
                data: override,
                message: 'Widget access updated successfully',
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                context: 'PATCH /api/v1/admin/tenants/:tenantId/widget-access/:widgetId',
            });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    /**
     * DELETE /api/v1/admin/tenants/:tenantId/widget-access/:widgetId
     * Delete widget access override (reset to default, TenantAdmin only)
     */
    fastify.delete('/admin/tenants/:tenantId/widget-access/:widgetId', {
        preHandler: [requireAuth, requireRole("admin", "owner", "global_admin"), requireSameTenant()],
        schema: {
            tags: ['admin', 'widget-access'],
            summary: 'Reset widget access to default',
            params: {
                type: 'object',
                properties: {
                    tenantId: { type: 'string' },
                    widgetId: { type: 'string' },
                },
                required: ['tenantId', 'widgetId'],
            },
        },
    }, async (request, reply) => {
        try {
            const { tenantId, widgetId } = request.params;
            await service.deleteTenantWidgetOverride(tenantId, widgetId);
            return reply.send({
                success: true,
                message: 'Widget access override deleted',
            });
        }
        catch (error) {
            monitoring.trackException(error, {
                context: 'DELETE /api/v1/admin/tenants/:tenantId/widget-access/:widgetId',
            });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
    // ============================================================================
    // User: Get Available Widgets (Public, Read-only)
    // ============================================================================
    /**
     * GET /api/v1/widget-catalog
     * Get available widgets for user (with tenant overrides applied)
     * Filters based on user role and tenant configuration
     */
    fastify.get('/widget-catalog', {
        preHandler: [requireAuth],
        schema: {
            tags: ['widget-catalog'],
            summary: 'Get available widgets for user',
            querystring: {
                type: 'object',
                properties: {
                    category: { type: 'string' },
                    search: { type: 'string' },
                    sort: { type: 'string', enum: ['name', 'category', 'recent', 'featured'] },
                    page: { type: 'integer', minimum: 1 },
                    limit: { type: 'integer', minimum: 1, maximum: 100 },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const tenantId = request.user?.tenantId || 'default';
            const userRoles = request.user?.roles || [];
            const result = await service.getUserWidgetCatalog(tenantId, userRoles, {
                category: request.query.category,
                search: request.query.search,
                sort: request.query.sort,
                page: request.query.page,
                limit: request.query.limit,
            });
            return reply.send({
                success: true,
                data: result,
            });
        }
        catch (error) {
            monitoring.trackException(error, { context: 'GET /api/v1/widget-catalog' });
            return reply.status(400).send({
                success: false,
                error: error.message,
            });
        }
    });
}
//# sourceMappingURL=widget-catalog.routes.js.map