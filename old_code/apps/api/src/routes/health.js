import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { CoreTypesSeederService } from '../services/core-types-seeder.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { getRouteRegistrationTracker } from '../utils/route-registration-tracker.js';
/**
 * Health check routes
 */
export async function registerHealthRoutes(server, redis, monitoring) {
    /**
     * Basic health check
     * GET /health
     */
    server.get('/health', async () => {
        return {
            status: 'ok',
            service: 'main-api',
            timestamp: new Date().toISOString(),
        };
    });
    /**
     * Readiness check
     * GET /readiness
     * Checks if service is ready to accept traffic
     */
    server.get('/readiness', async (_request, reply) => {
        const checks = {
            redis: { status: 'unknown' },
            overall: 'ready',
        };
        // Check Redis connection
        if (redis) {
            try {
                const result = await redis.ping();
                if (result === 'PONG') {
                    checks.redis = { status: 'connected' };
                }
                else {
                    checks.redis = { status: 'error', message: 'Unexpected ping response' };
                    checks.overall = 'not_ready';
                }
            }
            catch (error) {
                checks.redis = {
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
                checks.overall = 'not_ready';
            }
        }
        else {
            checks.redis = { status: 'not_configured' };
        }
        // Set response status based on overall readiness
        const statusCode = checks.overall === 'ready' ? 200 : 503;
        return reply.status(statusCode).send({
            status: checks.overall,
            service: 'main-api',
            timestamp: new Date().toISOString(),
            checks,
        });
    });
    /**
     * Liveness check
     * GET /liveness
     * Simple check to verify the service process is running
     */
    server.get('/liveness', async () => {
        return {
            status: 'alive',
            service: 'main-api',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });
    /**
     * Shard types verification check
     * GET /health/shard-types
     * Verifies that all core shard types are seeded in the database
     * Useful for deployment verification and monitoring
     */
    server.get('/health/shard-types', async (request, reply) => {
        if (!monitoring) {
            return reply.status(503).send({
                status: 'unavailable',
                message: 'Monitoring service not available',
                timestamp: new Date().toISOString(),
            });
        }
        try {
            // Get repositories from server instance if available, otherwise create new ones
            const shardTypeRepo = server.shardTypeRepository || new ShardTypeRepository(monitoring);
            const shardRepo = server.shardRepository || new ShardRepository(monitoring);
            // Initialize seeder service
            const seeder = new CoreTypesSeederService(monitoring, shardTypeRepo, shardRepo);
            // Check if all shard types are seeded
            const checkResult = await seeder.checkSeeded();
            const statusCode = checkResult.allSeeded ? 200 : 503;
            return reply.status(statusCode).send({
                status: checkResult.allSeeded ? 'healthy' : 'unhealthy',
                service: 'main-api',
                timestamp: new Date().toISOString(),
                shardTypes: {
                    allSeeded: checkResult.allSeeded,
                    missing: checkResult.missing,
                    missingCount: checkResult.missing.length,
                },
                message: checkResult.allSeeded
                    ? 'All core shard types are seeded'
                    : `${checkResult.missing.length} shard type(s) are missing. Run: pnpm --filter @castiel/api run seed-types`,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
                operation: 'health.shardTypes',
            });
            return reply.status(503).send({
                status: 'error',
                service: 'main-api',
                timestamp: new Date().toISOString(),
                error: errorMessage,
                message: 'Failed to verify shard types',
            });
        }
    });
    /**
     * Route registration health check
     * GET /health/routes
     * Reports which routes are registered and which are missing
     */
    server.get('/health/routes', async (_request, reply) => {
        const tracker = getRouteRegistrationTracker();
        const summary = tracker.getSummary();
        const allRoutes = tracker.getAll();
        // Determine overall health status
        // Consider it healthy if critical routes are registered
        const criticalRoutes = [
            'Health',
            'Auth',
            'Shards',
            'ShardTypes',
            'Documents',
            'AI Insights',
        ];
        const criticalStatus = criticalRoutes.every(routeName => {
            const route = tracker.get(routeName);
            return route?.registered ?? false;
        });
        const overallStatus = criticalStatus ? 'healthy' : 'degraded';
        const statusCode = criticalStatus ? 200 : 503;
        return reply.status(statusCode).send({
            status: overallStatus,
            service: 'main-api',
            timestamp: new Date().toISOString(),
            summary: {
                total: summary.total,
                registered: summary.registered,
                notRegistered: summary.notRegistered,
                registrationRate: summary.total > 0
                    ? ((summary.registered / summary.total) * 100).toFixed(1) + '%'
                    : '0%',
            },
            routes: allRoutes.map(route => ({
                name: route.name,
                prefix: route.prefix,
                registered: route.registered,
                reason: route.reason,
                dependencies: route.dependencies,
            })),
            registeredRoutes: summary.registeredRoutes,
            missingRoutes: summary.missingRoutes,
            criticalRoutes: {
                allRegistered: criticalStatus,
                status: criticalStatus ? 'ok' : 'degraded',
                routes: criticalRoutes.map(name => {
                    const route = tracker.get(name);
                    return {
                        name,
                        registered: route?.registered ?? false,
                        reason: route?.reason,
                    };
                }),
            },
        });
    });
}
//# sourceMappingURL=health.js.map