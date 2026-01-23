/**
 * Benchmarks API Routes
 * REST endpoints for benchmarking win rates, closing times, deal sizes, and renewals
 */
import { BenchmarkingService } from '../services/benchmarking.service.js';
import { requireAuth } from '../middleware/authorization.js';
import { createPermissionGuard } from '../middleware/permission.guard.js';
/**
 * Register benchmarks routes
 */
export async function registerBenchmarksRoutes(server, options) {
    const { monitoring, shardRepository, shardTypeRepository, relationshipService, roleManagementService, } = options;
    // Initialize service
    const benchmarkingService = new BenchmarkingService(monitoring, shardRepository, shardTypeRepository, relationshipService);
    // Get authentication decorator
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️  Benchmarks routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // Create permission guard if role management service is available
    // Note: Benchmarks are read-only aggregated analytics. Currently accessible to all authenticated users.
    // Future: Could restrict team-level benchmarks with quota:read:team or risk:read:team if needed.
    let checkPermission;
    if (roleManagementService) {
        checkPermission = createPermissionGuard(roleManagementService);
    }
    // ===============================================
    // BENCHMARK ROUTES
    // ===============================================
    // GET /api/v1/benchmarks/win-rates - Calculate win rates
    server.get('/api/v1/benchmarks/win-rates', {
        onRequest: authGuards,
        schema: {
            tags: ['Benchmarks'],
            summary: 'Calculate win rates',
            querystring: {
                type: 'object',
                properties: {
                    industryId: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    scope: { type: 'string', enum: ['tenant', 'industry', 'peer'] },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const options = {};
            if (request.query.industryId) {
                options.industryId = request.query.industryId;
            }
            if (request.query.startDate) {
                options.startDate = new Date(request.query.startDate);
            }
            if (request.query.endDate) {
                options.endDate = new Date(request.query.endDate);
            }
            if (request.query.scope) {
                options.scope = request.query.scope;
            }
            const benchmark = await benchmarkingService.calculateWinRates(authRequest.user.tenantId, options);
            return reply.code(200).send(benchmark);
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'benchmarks.calculateWinRates' });
            return reply.code(500).send({ error: error.message });
        }
    });
    // GET /api/v1/benchmarks/closing-times - Calculate closing times
    server.get('/api/v1/benchmarks/closing-times', {
        onRequest: authGuards,
        schema: {
            tags: ['Benchmarks'],
            summary: 'Calculate closing times',
            querystring: {
                type: 'object',
                properties: {
                    industryId: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    scope: { type: 'string', enum: ['tenant', 'industry', 'peer'] },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const options = {};
            if (request.query.industryId) {
                options.industryId = request.query.industryId;
            }
            if (request.query.startDate) {
                options.startDate = new Date(request.query.startDate);
            }
            if (request.query.endDate) {
                options.endDate = new Date(request.query.endDate);
            }
            if (request.query.scope) {
                options.scope = request.query.scope;
            }
            const benchmark = await benchmarkingService.calculateClosingTimes(authRequest.user.tenantId, options);
            return reply.code(200).send(benchmark);
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'benchmarks.calculateClosingTimes' });
            return reply.code(500).send({ error: error.message });
        }
    });
    // GET /api/v1/benchmarks/deal-sizes - Calculate deal size distribution
    server.get('/api/v1/benchmarks/deal-sizes', {
        onRequest: authGuards,
        schema: {
            tags: ['Benchmarks'],
            summary: 'Calculate deal size distribution',
            querystring: {
                type: 'object',
                properties: {
                    industryId: { type: 'string' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    scope: { type: 'string', enum: ['tenant', 'industry', 'peer'] },
                },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const options = {};
            if (request.query.industryId) {
                options.industryId = request.query.industryId;
            }
            if (request.query.startDate) {
                options.startDate = new Date(request.query.startDate);
            }
            if (request.query.endDate) {
                options.endDate = new Date(request.query.endDate);
            }
            if (request.query.scope) {
                options.scope = request.query.scope;
            }
            const benchmark = await benchmarkingService.calculateDealSizeDistribution(authRequest.user.tenantId, options);
            return reply.code(200).send(benchmark);
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'benchmarks.calculateDealSizeDistribution' });
            return reply.code(500).send({ error: error.message });
        }
    });
    // GET /api/v1/benchmarks/renewals/:contractId - Estimate renewal
    server.get('/api/v1/benchmarks/renewals/:contractId', {
        onRequest: authGuards,
        schema: {
            tags: ['Benchmarks'],
            summary: 'Estimate renewal probability for contract',
            params: {
                type: 'object',
                properties: { contractId: { type: 'string' } },
            },
        },
    }, async (request, reply) => {
        const authRequest = request;
        try {
            const estimate = await benchmarkingService.estimateRenewal(request.params.contractId, authRequest.user.tenantId);
            return reply.code(200).send(estimate);
        }
        catch (error) {
            monitoring.trackException(error, { operation: 'benchmarks.estimateRenewal' });
            return reply.code(500).send({ error: error.message });
        }
    });
    server.log.info('✅ Benchmarks routes registered');
}
//# sourceMappingURL=benchmarks.routes.js.map