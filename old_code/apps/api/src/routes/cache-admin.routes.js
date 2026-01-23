/**
 * Cache Admin Routes
 * Admin endpoints for cache management and monitoring
 */
import { CacheAdminController } from '../controllers/cache-admin.controller.js';
import { CacheMonitorService } from '../services/cache-monitor.service.js';
import { CacheWarmingService } from '../services/cache-warming.service.js';
import { requireAuth, requireRole } from '../middleware/authorization.js';
/**
 * Register cache admin routes
 */
export async function registerCacheAdminRoutes(fastify, dependencies) {
    try {
        // Initialize cache monitor service
        const cacheMonitor = new CacheMonitorService({
            redisClient: dependencies.redisClient,
            monitoring: dependencies.monitoring,
            shardCache: dependencies.shardCache,
            aclCache: dependencies.aclCache,
            vectorSearchCache: dependencies.vectorSearchCache,
            tokenValidationCache: dependencies.tokenValidationCache,
        }, {
            metricsIntervalMs: 60000, // 1 minute
            trackTopKeys: true,
            topKeysCount: 20,
            enableAlerts: true,
            alertThresholds: {
                lowHitRate: 50, // Alert if hit rate < 50%
                highMemoryUsage: 80, // Alert if memory > 80%
                highLatency: 100, // Alert if latency > 100ms
            },
        });
        // Start monitoring
        cacheMonitor.startMonitoring();
        // Initialize cache warming service
        const cacheWarming = new CacheWarmingService({
            cosmosContainer: dependencies.cosmosContainer,
            redisClient: dependencies.redisClient,
            monitoring: dependencies.monitoring,
            shardCache: dependencies.shardCache,
            aclCache: dependencies.aclCache,
        });
        // Initialize controller
        const controller = new CacheAdminController({
            cacheMonitor,
            cacheWarming,
            monitoring: dependencies.monitoring,
        });
        // Register routes
        // All routes require authentication + admin role
        const adminPreHandler = [requireAuth(), requireRole('admin', 'owner')];
        // GET /api/v1/admin/cache/stats - Get aggregated cache statistics
        fastify.get('/api/v1/admin/cache/stats', { preHandler: adminPreHandler }, (request, reply) => controller.getStats(request, reply));
        // GET /api/v1/admin/cache/config - Get alert configuration
        fastify.get('/api/v1/admin/cache/config', { preHandler: adminPreHandler }, (request, reply) => controller.getConfig(request, reply));
        // GET /api/v1/admin/cache/health - Get cache health check
        fastify.get('/api/v1/admin/cache/health', { preHandler: adminPreHandler }, (request, reply) => controller.getHealth(request, reply));
        // POST /api/v1/admin/cache/clear - Clear cache entries
        fastify.post('/api/v1/admin/cache/clear', { preHandler: adminPreHandler }, (request, reply) => controller.clearCache(request, reply));
        // POST /api/v1/admin/cache/warm - Trigger cache warming
        fastify.post('/api/v1/admin/cache/warm', { preHandler: adminPreHandler }, (request, reply) => controller.warmCache(request, reply));
        // GET /api/v1/admin/cache/warming/status - Get warming status
        fastify.get('/api/v1/admin/cache/warming/status', { preHandler: adminPreHandler }, (request, reply) => controller.getWarmingStatus(request, reply));
        // POST /api/v1/admin/cache/report - Generate performance report
        fastify.post('/api/v1/admin/cache/report', { preHandler: adminPreHandler }, (request, reply) => controller.generateReport(request, reply));
        // Store services for cleanup
        fastify.decorate('cacheMonitor', cacheMonitor);
        fastify.decorate('cacheWarming', cacheWarming);
        // Cleanup on shutdown
        fastify.addHook('onClose', async () => {
            cacheMonitor.stopMonitoring();
        });
        fastify.log.info('✅ Cache admin routes registered with monitoring and warming');
        dependencies.monitoring?.trackEvent('cache-admin-routes.registered', {
            hasRedis: !!dependencies.redisClient,
            hasShardCache: !!dependencies.shardCache,
            hasAclCache: !!dependencies.aclCache,
        });
    }
    catch (error) {
        fastify.log.error('❌ Failed to register cache admin routes');
        fastify.log.error(error);
        dependencies.monitoring?.trackException(error, {
            context: 'cache-admin-routes.registration',
        });
        throw error;
    }
}
//# sourceMappingURL=cache-admin.routes.js.map