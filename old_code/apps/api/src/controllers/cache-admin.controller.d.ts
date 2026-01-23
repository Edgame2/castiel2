/**
 * Cache Admin Controller
 * Admin endpoints for cache management and monitoring
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CacheWarmingConfig, CacheClearOptions } from '../types/cache-stats.types.js';
import type { CacheMonitorService } from '../services/cache-monitor.service.js';
import type { CacheWarmingService } from '../services/cache-warming.service.js';
/**
 * Admin controller dependencies
 */
export interface CacheAdminControllerDeps {
    cacheMonitor: CacheMonitorService;
    cacheWarming: CacheWarmingService;
    monitoring?: IMonitoringProvider;
}
/**
 * Cache Admin Controller
 */
export declare class CacheAdminController {
    private readonly deps;
    constructor(deps: CacheAdminControllerDeps);
    /**
     * GET /api/v1/admin/cache/stats
     * Get aggregated cache statistics
     */
    getStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/admin/cache/config
     * Get current alert configuration
     */
    getConfig(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/admin/cache/health
     * Perform health check on cache infrastructure
     */
    getHealth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/admin/cache/clear
     * Clear cache entries by pattern or service
     */
    clearCache(request: FastifyRequest<{
        Body: CacheClearOptions;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/admin/cache/warm
     * Trigger cache warming
     */
    warmCache(request: FastifyRequest<{
        Body: Partial<CacheWarmingConfig>;
    }>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/admin/cache/warming/status
     * Get current warming status
     */
    getWarmingStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/admin/cache/report
     * Generate performance report for a time period
     */
    generateReport(request: FastifyRequest<{
        Body: {
            startDate?: string;
            endDate?: string;
            periodHours?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    private hasAdminAccess;
}
//# sourceMappingURL=cache-admin.controller.d.ts.map