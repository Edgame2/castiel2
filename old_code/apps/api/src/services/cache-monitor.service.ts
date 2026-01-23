/**
 * Cache Monitoring Service
 * Aggregates statistics from all cache services and exports metrics
 */

import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type {
  AggregatedCacheStats,
  CacheServiceStats,
  CacheHealthCheck,
  CacheKeyInfo,
  CachePerformanceReport,
} from '../types/cache-stats.types.js';
import type { ShardCacheService } from './shard-cache.service.js';
import type { ACLCacheService } from './acl-cache.service.js';
import type { VectorSearchCacheService } from './vector-search-cache.service.js';
import type { TokenValidationCacheService } from './token-validation-cache.service.js';

export interface CacheMonitorConfig {
  metricsIntervalMs: number; // How often to collect and export metrics
  trackTopKeys: boolean; // Track most accessed keys
  topKeysCount: number; // Number of top keys to track
  enableAlerts: boolean; // Enable alerting
  alertThresholds: {
    lowHitRate: number;
    highMemoryUsage: number;
    highLatency: number;
  };
}

export interface CacheMonitorDependencies {
  redisClient?: Redis;
  monitoring?: IMonitoringProvider;
  shardCache?: ShardCacheService;
  aclCache?: ACLCacheService;
  vectorSearchCache?: VectorSearchCacheService;
  tokenValidationCache?: TokenValidationCacheService;
}

export class CacheMonitorService {
  private redisClient?: Redis;
  private monitoring?: IMonitoringProvider;
  private shardCache?: ShardCacheService;
  private aclCache?: ACLCacheService;
  private vectorSearchCache?: VectorSearchCacheService;
  private tokenValidationCache?: TokenValidationCacheService;
  private config: CacheMonitorConfig;
  private metricsInterval?: NodeJS.Timeout;
  private keyAccessCount: Map<string, number> = new Map();

  constructor(
    dependencies: CacheMonitorDependencies,
    config?: Partial<CacheMonitorConfig>
  ) {
    this.redisClient = dependencies.redisClient;
    this.monitoring = dependencies.monitoring;
    this.shardCache = dependencies.shardCache;
    this.aclCache = dependencies.aclCache;
    this.vectorSearchCache = dependencies.vectorSearchCache;
    this.tokenValidationCache = dependencies.tokenValidationCache;

    this.config = {
      metricsIntervalMs: config?.metricsIntervalMs ?? 60000, // 1 minute
      trackTopKeys: config?.trackTopKeys ?? true,
      topKeysCount: config?.topKeysCount ?? 20,
      enableAlerts: config?.enableAlerts ?? true,
      alertThresholds: {
        lowHitRate: config?.alertThresholds?.lowHitRate ?? 50,
        highMemoryUsage: config?.alertThresholds?.highMemoryUsage ?? 80,
        highLatency: config?.alertThresholds?.highLatency ?? 100,
      },
    };
  }

  /**
   * Start collecting and exporting metrics periodically
   */
  startMonitoring(): void {
    if (this.metricsInterval) {
      return; // Already monitoring
    }

    this.metricsInterval = setInterval(() => {
      this.collectAndExportMetrics().catch((err) => {
        this.monitoring?.trackException(err as Error, { operation: 'cache-monitor.collect-metrics' });
      });
    }, this.config.metricsIntervalMs);

    this.monitoring?.trackEvent('cache-monitor.started', {
      intervalMs: this.config.metricsIntervalMs,
    });
  }

  /**
   * Stop collecting metrics
   */
  stopMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
      this.monitoring?.trackEvent('cache-monitor.stopped');
    }
  }

  /**
   * Get current alert configuration
   */
  getConfig(): CacheMonitorConfig {
    return { ...this.config };
  }

  /**
   * Get aggregated statistics from all cache services
   */
  async getAggregatedStats(): Promise<AggregatedCacheStats> {
    const timestamp = new Date();
    const redisConnected = await this.checkRedisConnection();

    // Collect stats from each service
    const shardCacheStats = this.shardCache
      ? await this.getServiceStats('ShardCache', this.shardCache)
      : undefined;

    const aclCacheStats = this.aclCache
      ? await this.getServiceStats('ACLCache', this.aclCache)
      : undefined;

    const vectorSearchCacheStats = this.vectorSearchCache
      ? await this.getServiceStats('VectorSearchCache', this.vectorSearchCache)
      : undefined;

    const tokenValidationCacheStats = this.tokenValidationCache
      ? await this.getServiceStats(
          'TokenValidationCache',
          this.tokenValidationCache
        )
      : undefined;

    // Calculate aggregated metrics
    const services = [
      shardCacheStats,
      aclCacheStats,
      vectorSearchCacheStats,
      tokenValidationCacheStats,
    ].filter((s): s is CacheServiceStats => s !== undefined);

    const totalHits = services.reduce((sum, s) => sum + s.hits, 0);
    const totalMisses = services.reduce((sum, s) => sum + s.misses, 0);
    const totalOperations = totalHits + totalMisses;
    const overallHitRate =
      totalOperations > 0 ? (totalHits / totalOperations) * 100 : 0;

    const totalKeys = services.reduce((sum, s) => sum + s.totalKeys, 0);
    const totalMemoryBytes = services.reduce(
      (sum, s) => sum + (s.memoryUsageBytes ?? 0),
      0
    );
    const totalInvalidations = services.reduce(
      (sum, s) => sum + (s.invalidations ?? 0),
      0
    );

    const latencies = services
      .map((s) => s.averageLatencyMs)
      .filter((l): l is number => l !== undefined);
    const averageLatencyMs =
      latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0;

    // Get top keys if tracking is enabled
    const topKeys = this.config.trackTopKeys
      ? await this.getTopKeys()
      : undefined;

    return {
      timestamp,
      redisConnected,
      services: {
        shardCache: shardCacheStats,
        aclCache: aclCacheStats,
        vectorSearchCache: vectorSearchCacheStats,
        tokenValidationCache: tokenValidationCacheStats,
      },
      aggregated: {
        totalHits,
        totalMisses,
        overallHitRate,
        totalKeys,
        totalMemoryBytes: totalMemoryBytes > 0 ? totalMemoryBytes : undefined,
        totalInvalidations,
      },
      performance: {
        averageLatencyMs,
      },
      topKeys,
    };
  }

  /**
   * Get statistics from a specific cache service
   */
  private async getServiceStats(
    serviceName: string,
    service: any
  ): Promise<CacheServiceStats> {
    try {
      const stats = await service.getStats();
      const healthy = await service.isHealthy();

      return {
        serviceName,
        enabled: true,
        healthy,
        totalOperations: stats.hits + stats.misses,
        hits: stats.hits,
        misses: stats.misses,
        hitRate:
          stats.hits + stats.misses > 0
            ? (stats.hits / (stats.hits + stats.misses)) * 100
            : 0,
        invalidations: stats.invalidations,
        totalKeys: stats.keyCount ?? 0,
        memoryUsageBytes: stats.memoryUsageBytes,
      };
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'cache-monitor.get-stats', serviceName });
      return {
        serviceName,
        enabled: false,
        healthy: false,
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalKeys: 0,
      };
    }
  }

  /**
   * Perform health check on cache infrastructure
   */
  async performHealthCheck(): Promise<CacheHealthCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Redis connection
    const redisHealthy = await this.checkRedisConnection();
    let redisLatency = 0;
    let memoryUsedBytes: number | undefined;
    let memoryMaxBytes: number | undefined;

    if (!redisHealthy) {
      issues.push('Redis connection is down');
      recommendations.push('Check Redis server status and network connectivity');
    } else if (this.redisClient) {
      // Measure Redis latency
      const start = Date.now();
      await this.redisClient.ping();
      redisLatency = Date.now() - start;

      if (redisLatency > 50) {
        issues.push(`High Redis latency: ${redisLatency}ms`);
        recommendations.push(
          'Consider Redis server location or network optimization'
        );
      }

      // Check memory usage
      try {
        const info = await this.redisClient.info('memory');
        const usedMatch = info.match(/used_memory:(\d+)/);
        const maxMatch = info.match(/maxmemory:(\d+)/);

        if (usedMatch) {memoryUsedBytes = parseInt(usedMatch[1], 10);}
        if (maxMatch && maxMatch[1] !== '0')
          {memoryMaxBytes = parseInt(maxMatch[1], 10);}

        if (memoryUsedBytes && memoryMaxBytes) {
          const usagePercent = (memoryUsedBytes / memoryMaxBytes) * 100;
          if (usagePercent > this.config.alertThresholds.highMemoryUsage) {
            issues.push(`High Redis memory usage: ${usagePercent.toFixed(1)}%`);
            recommendations.push(
              'Consider increasing Redis memory limit or reducing TTLs'
            );
          }
        }
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'cache-monitor.get-redis-memory' });
      }
    }

    // Check individual cache services
    const stats = await this.getAggregatedStats();
    const serviceHealth: Record<string, any> = {};

    for (const [serviceName, serviceStats] of Object.entries(stats.services)) {
      if (!serviceStats) {continue;}

      serviceHealth[serviceName] = {
        healthy: serviceStats.healthy,
        hitRate: serviceStats.hitRate,
        keyCount: serviceStats.totalKeys,
      };

      if (!serviceStats.healthy) {
        issues.push(`${serviceName} is not healthy`);
      }

      if (
        serviceStats.hitRate < this.config.alertThresholds.lowHitRate &&
        serviceStats.totalOperations > 100
      ) {
        issues.push(
          `${serviceName} has low hit rate: ${serviceStats.hitRate.toFixed(1)}%`
        );
        recommendations.push(
          `Review ${serviceName} caching strategy and TTL configuration`
        );
      }
    }

    return {
      healthy: issues.length === 0,
      redis: {
        connected: redisHealthy,
        latencyMs: redisLatency,
        memoryUsedBytes,
        memoryMaxBytes,
        memoryUsagePercent:
          memoryUsedBytes && memoryMaxBytes
            ? (memoryUsedBytes / memoryMaxBytes) * 100
            : undefined,
      },
      services: serviceHealth,
      issues,
      recommendations,
    };
  }

  /**
   * Collect and export metrics to Application Insights
   */
  private async collectAndExportMetrics(): Promise<void> {
    if (!this.monitoring) {
      return; // No monitoring provider configured
    }

    try {
      const stats = await this.getAggregatedStats();

      // Export aggregated metrics
      this.monitoring.trackMetric(
        'cache.overall.hitRate',
        stats.aggregated.overallHitRate,
        {
          unit: 'percent',
        }
      );

      this.monitoring.trackMetric(
        'cache.overall.totalKeys',
        stats.aggregated.totalKeys,
        {
          unit: 'count',
        }
      );

      if (stats.aggregated.totalMemoryBytes) {
        this.monitoring.trackMetric(
          'cache.overall.memoryUsage',
          stats.aggregated.totalMemoryBytes,
          {
            unit: 'bytes',
          }
        );
      }

      this.monitoring.trackMetric(
        'cache.overall.averageLatency',
        stats.performance.averageLatencyMs,
        {
          unit: 'milliseconds',
        }
      );

      // Export per-service metrics
      for (const [serviceName, serviceStats] of Object.entries(stats.services)) {
        if (!serviceStats) {continue;}

        this.monitoring.trackMetric(
          `cache.service.hitRate`,
          serviceStats.hitRate,
          {
            service: serviceName,
            unit: 'percent',
          }
        );

        this.monitoring.trackMetric(
          `cache.service.operations`,
          serviceStats.totalOperations,
          {
            service: serviceName,
            unit: 'count',
          }
        );

        if (serviceStats.memoryUsageBytes) {
          this.monitoring.trackMetric(
            `cache.service.memoryUsage`,
            serviceStats.memoryUsageBytes,
            {
              service: serviceName,
              unit: 'bytes',
            }
          );
        }
      }

      // Check for alerts
      if (this.config.enableAlerts) {
        await this.checkAndTriggerAlerts(stats);
      }
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'cache-monitor.collect-export-metrics' });
    }
  }

  /**
   * Check if any alert thresholds are breached
   */
  private async checkAndTriggerAlerts(
    stats: AggregatedCacheStats
  ): Promise<void> {
    // Check overall hit rate
    if (
      stats.aggregated.overallHitRate <
        this.config.alertThresholds.lowHitRate &&
      stats.aggregated.totalHits + stats.aggregated.totalMisses > 100
    ) {
      this.monitoring?.trackEvent('cache.alert.lowHitRate', {
        currentValue: stats.aggregated.overallHitRate.toString(),
        threshold: this.config.alertThresholds.lowHitRate.toString(),
        severity: 'warning',
      });
    }

    // Check latency
    if (
      stats.performance.averageLatencyMs >
      this.config.alertThresholds.highLatency
    ) {
      this.monitoring?.trackEvent('cache.alert.highLatency', {
        currentValue: stats.performance.averageLatencyMs.toString(),
        threshold: this.config.alertThresholds.highLatency.toString(),
        severity: 'warning',
      });
    }

    // Check Redis connection
    if (!stats.redisConnected) {
      this.monitoring?.trackEvent('cache.alert.redisDown', {
        severity: 'critical',
      });
    }
  }

  /**
   * Get top accessed cache keys
   */
  private async getTopKeys(): Promise<CacheKeyInfo[]> {
    if (!this.redisClient || this.keyAccessCount.size === 0) {
      return [];
    }

    const sorted = Array.from(this.keyAccessCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.topKeysCount);

    const keyInfos: CacheKeyInfo[] = [];

    for (const [key, hits] of sorted) {
      try {
        const ttl = await this.redisClient.ttl(key);
        const pattern = this.extractKeyPattern(key);

        keyInfos.push({
          key,
          pattern,
          hits,
          ttl: ttl > 0 ? ttl : undefined,
        });
      } catch (error) {
        this.monitoring?.trackException(error as Error, { operation: 'cache-monitor.get-key-info', key });
      }
    }

    return keyInfos;
  }

  /**
   * Extract cache key pattern (e.g., "tenant:123:shard:456" -> "shard")
   */
  private extractKeyPattern(key: string): string {
    if (key.includes(':shard:')) {return 'shard';}
    if (key.includes(':acl:')) {return 'acl';}
    if (key.includes(':vsearch:')) {return 'vsearch';}
    if (key.includes(':token:')) {return 'token';}
    return 'unknown';
  }

  /**
   * Track a cache key access
   */
  trackKeyAccess(key: string): void {
    if (!this.config.trackTopKeys) {return;}

    const current = this.keyAccessCount.get(key) ?? 0;
    this.keyAccessCount.set(key, current + 1);

    // Limit map size to prevent memory issues
    if (this.keyAccessCount.size > 10000) {
      // Remove least accessed keys
      const sorted = Array.from(this.keyAccessCount.entries()).sort(
        (a, b) => b[1] - a[1]
      );
      this.keyAccessCount = new Map(sorted.slice(0, 5000));
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    startDate: Date,
    endDate: Date
  ): Promise<CachePerformanceReport> {
    const stats = await this.getAggregatedStats();

    const services: Record<string, any> = {};
    let leastEffectiveService = '';
    let lowestHitRate = 100;
    let highestLatencyService = '';
    let highestLatency = 0;

    for (const [serviceName, serviceStats] of Object.entries(stats.services)) {
      if (!serviceStats) {continue;}

      services[serviceName] = {
        operations: serviceStats.totalOperations,
        hits: serviceStats.hits,
        misses: serviceStats.misses,
        hitRate: serviceStats.hitRate,
        avgLatencyMs: serviceStats.averageLatencyMs ?? 0,
        maxLatencyMs: serviceStats.averageLatencyMs ?? 0, // Simplified
        minLatencyMs: serviceStats.averageLatencyMs ?? 0, // Simplified
        totalMemoryBytes: serviceStats.memoryUsageBytes ?? 0,
      };

      if (
        serviceStats.hitRate < lowestHitRate &&
        serviceStats.totalOperations > 10
      ) {
        lowestHitRate = serviceStats.hitRate;
        leastEffectiveService = serviceName;
      }

      if ((serviceStats.averageLatencyMs ?? 0) > highestLatency) {
        highestLatency = serviceStats.averageLatencyMs ?? 0;
        highestLatencyService = serviceName;
      }
    }

    const recommendations: string[] = [];
    if (leastEffectiveService) {
      recommendations.push(
        `Review ${leastEffectiveService} caching strategy (hit rate: ${lowestHitRate.toFixed(1)}%)`
      );
    }
    if (highestLatencyService && highestLatency > 50) {
      recommendations.push(
        `Optimize ${highestLatencyService} performance (latency: ${highestLatency.toFixed(1)}ms)`
      );
    }
    if (stats.aggregated.overallHitRate < 70) {
      recommendations.push(
        'Consider increasing cache TTLs or implementing cache warming'
      );
    }

    return {
      period: {
        start: startDate,
        end: endDate,
        durationMs: endDate.getTime() - startDate.getTime(),
      },
      services,
      insights: {
        mostAccessedKeys: stats.topKeys ?? [],
        leastEffectiveService,
        highestLatencyService,
        recommendations,
      },
    };
  }

  /**
   * Check Redis connection
   */
  private async checkRedisConnection(): Promise<boolean> {
    if (!this.redisClient) {return false;}

    try {
      await this.redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.keyAccessCount.clear();
    this.monitoring?.trackEvent('cache-monitor.stats-reset');
  }
}
