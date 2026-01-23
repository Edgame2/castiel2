/**
 * Quota API Routes
 * REST endpoints for quota management and performance tracking
 */
import { QuotaService } from '../services/quota.service.js';
import { RevenueAtRiskService } from '../services/revenue-at-risk.service.js';
import { RiskEvaluationService } from '../services/risk-evaluation.service.js';
import { RiskCatalogService } from '../services/risk-catalog.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
/**
 * Register quota routes
 */
export async function registerQuotaRoutes(server, options) {
    const { monitoring, shardRepository, shardTypeRepository, relationshipService, vectorSearchService, insightService, roleManagementService, } = options;
    // Initialize services
    const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
    const riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService);
    const revenueAtRiskService = new RevenueAtRiskService(monitoring, shardRepository, shardTypeRepository, riskEvaluationService);
    const quotaService = new QuotaService(monitoring, shardRepository, shardTypeRepository, revenueAtRiskService);
    // Get authentication decorator
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️  Quota routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // Create permission guard if role management service is available
    let checkPermission;
    if (roleManagementService) {
        checkPermission = createPermissionGuard(roleManagementService);
    }
    // ===============================================
    // QUOTA CRUD ROUTES
    // ===============================================
    // POST /api/v1/quotas - Create quota
    server.post('/api/v1/quotas', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:create:tenant')] : authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'Create a new quota',
            body: {
                type: 'object',
                required: ['quotaType', 'period', 'target'],
                properties: {
                    quotaType: { type: 'string', enum: ['individual', 'team', 'tenant'] },
                    targetUserId: { type: 'string' },
                    teamId: { type: 'string' },
                    period: {
                        type: 'object',
                        required: ['type', 'startDate', 'endDate'],
                        properties: {
                            type: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'] },
                            startDate: { type: 'string', format: 'date-time' },
                            endDate: { type: 'string', format: 'date-time' },
                        },
                    },
                    target: {
                        type: 'object',
                        required: ['amount', 'currency'],
                        properties: {
                            amount: { type: 'number' },
                            currency: { type: 'string' },
                            opportunityCount: { type: 'number' },
                        },
                    },
                    parentQuotaId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const input = request.body;
            // Convert date strings to Date objects
            if (input.period) {
                input.period.startDate = new Date(input.period.startDate);
                input.period.endDate = new Date(input.period.endDate);
            }
            const quota = await quotaService.createQuota(authRequest.user.tenantId, authRequest.user.id, input);
            return reply.code(201).send(quota);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.createQuota' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/quotas/:quotaId - Get quota
    server.get('/api/v1/quotas/:quotaId', {
        onRequest: authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'Get quota by ID',
            params: {
                type: 'object',
                properties: { quotaId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const quota = await quotaService.getQuota(request.params.quotaId, authRequest.user.tenantId);
            if (!quota) {
                return reply.code(404).send({ error: 'Quota not found' });
            }
            return reply.code(200).send(quota);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.getQuota' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // PUT /api/v1/quotas/:quotaId - Update quota
    server.put('/api/v1/quotas/:quotaId', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:update:all')] : authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'Update quota',
            params: {
                type: 'object',
                properties: { quotaId: { type: 'string' } },
            },
            body: {
                type: 'object',
                properties: {
                    target: { type: 'object' },
                    period: { type: 'object' },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const input = request.body;
            // Convert date strings to Date objects if present
            if (input.period) {
                if (input.period.startDate) {
                    input.period.startDate = new Date(input.period.startDate);
                }
                if (input.period.endDate) {
                    input.period.endDate = new Date(input.period.endDate);
                }
            }
            const quota = await quotaService.updateQuota(request.params.quotaId, authRequest.user.tenantId, authRequest.user.id, input);
            return reply.code(200).send(quota);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.updateQuota' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/quotas - List quotas
    // Note: Service should filter based on quota type (individual/team/tenant)
    // Individual quotas accessible via shard:read:assigned
    // Team quotas require quota:read:team
    // Tenant quotas require admin
    server.get('/api/v1/quotas', {
        onRequest: authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'List quotas',
            querystring: {
                type: 'object',
                properties: {
                    quotaType: { type: 'string', enum: ['individual', 'team', 'tenant'] },
                    targetUserId: { type: 'string' },
                    teamId: { type: 'string' },
                    periodType: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'] },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const quotas = await quotaService.listQuotas(authRequest.user.tenantId, request.query);
            return reply.code(200).send(quotas);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.listQuotas' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // ===============================================
    // QUOTA PERFORMANCE ROUTES
    // ===============================================
    // POST /api/v1/quotas/:quotaId/calculate-performance - Calculate performance
    server.post('/api/v1/quotas/:quotaId/calculate-performance', {
        onRequest: authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'Calculate quota performance',
            params: {
                type: 'object',
                properties: { quotaId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const performance = await quotaService.calculatePerformance(request.params.quotaId, authRequest.user.tenantId, authRequest.user.id);
            return reply.code(200).send(performance);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.calculatePerformance' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // GET /api/v1/quotas/:quotaId/forecast - Get quota forecast
    server.get('/api/v1/quotas/:quotaId/forecast', {
        onRequest: authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'Get quota forecast',
            params: {
                type: 'object',
                properties: { quotaId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const forecast = await quotaService.getForecast(request.params.quotaId, authRequest.user.tenantId, authRequest.user.id);
            return reply.code(200).send(forecast);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.getForecast' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // POST /api/v1/quotas/:quotaId/rollup - Rollup quota
    server.post('/api/v1/quotas/:quotaId/rollup', {
        onRequest: authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'Rollup quota from children',
            params: {
                type: 'object',
                properties: { quotaId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const quota = await quotaService.rollupQuotas(request.params.quotaId, authRequest.user.tenantId, authRequest.user.id);
            return reply.code(200).send(quota);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.rollupQuotas' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    // DELETE /api/v1/quotas/:quotaId - Delete quota
    server.delete('/api/v1/quotas/:quotaId', {
        onRequest: checkPermission ? [...authGuards, checkPermission('shard:delete:all')] : authGuards,
        schema: {
            tags: ['Quotas'],
            summary: 'Delete quota',
            params: {
                type: 'object',
                properties: { quotaId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            await quotaService.deleteQuota(request.params.quotaId, authRequest.user.tenantId, authRequest.user.id);
            return reply.code(204).send();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), { operation: 'quotas.deleteQuota' });
            return reply.code(500).send({ error: errorMessage });
        }
    });
    server.log.info('✅ Quota routes registered');
}
//# sourceMappingURL=quotas.routes.js.map