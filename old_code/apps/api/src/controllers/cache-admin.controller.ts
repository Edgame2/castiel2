/**
 * Cache Admin Controller
 * Admin endpoints for cache management and monitoring
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { AuthUser } from '../types/auth.types.js';
import type {
  CacheWarmingConfig,
  CacheClearOptions,
} from '../types/cache-stats.types.js';
import type { CacheMonitorService } from '../services/cache-monitor.service.js';
import type { CacheWarmingService } from '../services/cache-warming.service.js';

const CACHE_ADMIN_ROLES = ['admin', 'owner'];

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
export class CacheAdminController {
  constructor(private readonly deps: CacheAdminControllerDeps) {}

  /**
   * GET /api/v1/admin/cache/stats
   * Get aggregated cache statistics
   */
  async getStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.hasAdminAccess(request)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const stats = await this.deps.cacheMonitor.getAggregatedStats();

      this.deps.monitoring?.trackEvent('cache.admin.stats', {
        duration: Date.now() - startTime,
      });

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.monitoring?.trackException(error as Error, {
        context: 'cache.admin.stats',
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve cache statistics',
        details: errorMessage,
      });
    }
  }

  /**
   * GET /api/v1/admin/cache/config
   * Get current alert configuration
   */
  async getConfig(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.hasAdminAccess(request)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const config = this.deps.cacheMonitor.getConfig();

      this.deps.monitoring?.trackEvent('cache.admin.config.get', {
        duration: Date.now() - startTime,
      });

      return reply.status(200).send({
        success: true,
        data: config,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.monitoring?.trackException(error as Error, {
        context: 'cache.admin.config.get',
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve alert configuration',
        details: errorMessage,
      });
    }
  }

  /**
   * GET /api/v1/admin/cache/health
   * Perform health check on cache infrastructure
   */
  async getHealth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.hasAdminAccess(request)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const health = await this.deps.cacheMonitor.performHealthCheck();

      this.deps.monitoring?.trackEvent('cache.admin.health', {
        duration: Date.now() - startTime,
        healthy: health.healthy,
      });

      const statusCode = health.healthy ? 200 : 503;

      return reply.status(statusCode).send({
        success: health.healthy,
        data: health,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.monitoring?.trackException(error as Error, {
        context: 'cache.admin.health',
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to check cache health',
        details: errorMessage,
      });
    }
  }

  /**
   * POST /api/v1/admin/cache/clear
   * Clear cache entries by pattern or service
   */
  async clearCache(
    request: FastifyRequest<{
      Body: CacheClearOptions;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.hasAdminAccess(request)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const options = request.body;

      // Validate options
      if (!options.service && !options.pattern && !options.tenantId) {
        return reply.status(400).send({
          success: false,
          error: 'Must specify service, pattern, or tenantId to clear',
        });
      }

      // Implement cache clearing logic
      // For now, this is a placeholder - actual implementation depends on cache services
      const result = {
        success: true,
        keysCleared: 0,
        services: [] as string[],
        pattern: options.pattern,
        durationMs: Date.now() - startTime,
      };

      // Log the operation
      this.deps.monitoring?.trackEvent('cache.admin.clear', {
        service: options.service,
        pattern: options.pattern,
        tenantId: options.tenantId,
        force: options.force,
        keysCleared: result.keysCleared,
        duration: result.durationMs,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.monitoring?.trackException(error as Error, {
        context: 'cache.admin.clear',
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to clear cache',
        details: errorMessage,
      });
    }
  }

  /**
   * POST /api/v1/admin/cache/warm
   * Trigger cache warming
   */
  async warmCache(
    request: FastifyRequest<{
      Body: Partial<CacheWarmingConfig>;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.hasAdminAccess(request)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const config: CacheWarmingConfig = {
        enabled: request.body.enabled ?? true,
        strategy: request.body.strategy ?? 'hybrid',
        topN: request.body.topN ?? 100,
        tenants: request.body.tenants,
        includeShards: request.body.includeShards ?? true,
        includeACL: request.body.includeACL ?? true,
        maxDurationMs: request.body.maxDurationMs ?? 60000, // 1 minute default
      };

      // Validate config
      if (config.topN < 1 || config.topN > 1000) {
        return reply.status(400).send({
          success: false,
          error: 'topN must be between 1 and 1000',
        });
      }

      if (config.maxDurationMs < 1000 || config.maxDurationMs > 300000) {
        return reply.status(400).send({
          success: false,
          error: 'maxDurationMs must be between 1000 (1s) and 300000 (5min)',
        });
      }

      // Get current warming status
      const currentStatus = this.deps.cacheWarming.getStatus();
      if (currentStatus.isWarming) {
        return reply.status(409).send({
          success: false,
          error: 'Cache warming is already in progress',
          data: currentStatus,
        });
      }

      // Start warming (runs in background)
      const result = await this.deps.cacheWarming.warmCache(config);

      this.deps.monitoring?.trackEvent('cache.admin.warm', {
        strategy: config.strategy,
        topN: config.topN,
        success: result.success,
        duration: result.details.durationMs,
        shardsWarmed: result.details.shardsWarmed,
        aclEntriesWarmed: result.details.aclEntriesWarmed,
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.monitoring?.trackException(error as Error, {
        context: 'cache.admin.warm',
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to warm cache',
        details: errorMessage,
      });
    }
  }

  /**
   * GET /api/v1/admin/cache/warming/status
   * Get current warming status
   */
  async getWarmingStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.hasAdminAccess(request)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const status = this.deps.cacheWarming.getStatus();

      return reply.status(200).send({
        success: true,
        data: status,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.monitoring?.trackException(error as Error, {
        context: 'cache.admin.warmingStatus',
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to get warming status',
        details: errorMessage,
      });
    }
  }

  /**
   * POST /api/v1/admin/cache/report
   * Generate performance report for a time period
   */
  async generateReport(
    request: FastifyRequest<{
      Body: {
        startDate?: string;
        endDate?: string;
        periodHours?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.hasAdminAccess(request)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const body = request.body;

      // Parse dates
      let startDate: Date;
      let endDate: Date;

      if (body.startDate && body.endDate) {
        startDate = new Date(body.startDate);
        endDate = new Date(body.endDate);
      } else if (body.periodHours) {
        endDate = new Date();
        startDate = new Date(endDate.getTime() - body.periodHours * 60 * 60 * 1000);
      } else {
        // Default: last 24 hours
        endDate = new Date();
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      }

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid date format',
        });
      }

      if (startDate >= endDate) {
        return reply.status(400).send({
          success: false,
          error: 'startDate must be before endDate',
        });
      }

      const report = await this.deps.cacheMonitor.generatePerformanceReport(
        startDate,
        endDate
      );

      this.deps.monitoring?.trackEvent('cache.admin.report', {
        duration: Date.now() - startTime,
        periodHours: (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000),
      });

      return reply.status(200).send({
        success: true,
        data: report,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.monitoring?.trackException(error as Error, {
        context: 'cache.admin.report',
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to generate cache report',
        details: errorMessage,
      });
    }
  }

  private hasAdminAccess(request: FastifyRequest): boolean {
    const user = (request as any).user as AuthUser | undefined;

    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    return CACHE_ADMIN_ROLES.some((role) => user.roles.includes(role));
  }
}
