/**
 * Cache Optimization Routes
 * Provides endpoints to query cache optimization reports and recommendations
 */
export function registerCacheOptimizationRoutes(server) {
    const cacheOptimization = server.cacheOptimization;
    if (!cacheOptimization) {
        server.log.warn('Cache Optimization service not available');
        return;
    }
    /**
     * GET /api/admin/cache/optimization/report
     * Get cache optimization report
     */
    server.get('/api/admin/cache/optimization/report', {
        schema: {
            description: 'Get cache optimization report with recommendations',
            tags: ['admin', 'cache', 'performance'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        timestamp: { type: 'string' },
                        overallHitRate: { type: 'number' },
                        targetHitRate: { type: 'number' },
                        hitRateGap: { type: 'number' },
                        optimizationScore: { type: 'number' },
                        recommendations: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string' },
                                    priority: { type: 'string' },
                                    description: { type: 'string' },
                                    impact: { type: 'string' },
                                    action: { type: 'string' },
                                    estimatedImprovement: { type: 'number' },
                                },
                            },
                        },
                        topMissedKeys: { type: 'array', items: { type: 'string' } },
                        accessPatterns: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    key: { type: 'string' },
                                    accessCount: { type: 'number' },
                                    cacheHitRate: { type: 'number' },
                                    recommendedTTL: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const report = await cacheOptimization.getReport();
        return reply.send(report);
    });
    /**
     * GET /api/admin/cache/optimization/warming-strategies
     * Get cache warming strategies
     */
    server.get('/api/admin/cache/optimization/warming-strategies', {
        schema: {
            description: 'Get recommended cache warming strategies',
            tags: ['admin', 'cache', 'performance'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        strategies: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    strategy: { type: 'string' },
                                    keys: { type: 'array', items: { type: 'string' } },
                                    priority: { type: 'number' },
                                    estimatedHitRateImprovement: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const strategies = await cacheOptimization.generateWarmingStrategies();
        return reply.send({ strategies });
    });
    /**
     * GET /api/admin/cache/optimization/access-patterns
     * Get access patterns for cache keys
     */
    server.get('/api/admin/cache/optimization/access-patterns', {
        schema: {
            description: 'Get cache access patterns',
            tags: ['admin', 'cache', 'performance'],
            querystring: {
                type: 'object',
                properties: {
                    pattern: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { pattern } = request.query;
        const patterns = cacheOptimization.getAccessPatterns(pattern);
        return reply.send({ patterns });
    });
    /**
     * POST /api/admin/cache/optimization/start
     * Start cache optimization analysis
     */
    server.post('/api/admin/cache/optimization/start', {
        schema: {
            description: 'Start cache optimization analysis',
            tags: ['admin', 'cache', 'performance'],
        },
    }, async (request, reply) => {
        cacheOptimization.start();
        return reply.send({
            message: 'Cache optimization analysis started',
            status: 'running',
        });
    });
    /**
     * POST /api/admin/cache/optimization/stop
     * Stop cache optimization analysis
     */
    server.post('/api/admin/cache/optimization/stop', {
        schema: {
            description: 'Stop cache optimization analysis',
            tags: ['admin', 'cache', 'performance'],
        },
    }, async (request, reply) => {
        cacheOptimization.stop();
        return reply.send({
            message: 'Cache optimization analysis stopped',
            status: 'stopped',
        });
    });
    /**
     * POST /api/admin/cache/optimization/reset
     * Reset access patterns (for testing)
     */
    server.post('/api/admin/cache/optimization/reset', {
        schema: {
            description: 'Reset cache access patterns',
            tags: ['admin', 'cache', 'performance'],
        },
    }, async (request, reply) => {
        cacheOptimization.resetAccessPatterns();
        return reply.send({
            message: 'Cache access patterns reset',
        });
    });
}
//# sourceMappingURL=cache-optimization.routes.js.map