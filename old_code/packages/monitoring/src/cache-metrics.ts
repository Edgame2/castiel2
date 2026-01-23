/**
 * Cache Metrics Module
 * 
 * Provides utilities for tracking and exposing cache metrics (hit rate, miss count, etc.)
 */

import type { IMonitoringProvider } from './types.js';
import { MetricNames } from './types.js';

/**
 * Cache metrics data structure
 */
export interface CacheMetrics {
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalRequests: number;
  averageOperationDuration?: number;
  errorCount?: number;
}

/**
 * Cache Metrics Tracker
 * 
 * Tracks cache performance metrics and exposes them via monitoring provider
 */
export class CacheMetricsTracker {
  private monitoring: IMonitoringProvider;
  private hitCount: number = 0;
  private missCount: number = 0;
  private operationDurations: number[] = [];
  private errorCount: number = 0;
  private readonly maxDurationSamples: number = 1000; // Keep last 1000 samples for average

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  /**
   * Record a cache hit
   */
  recordHit(operationDuration?: number): void {
    this.hitCount++;
    if (operationDuration !== undefined) {
      this.recordOperationDuration(operationDuration);
    }
    this.updateHitRate();
  }

  /**
   * Record a cache miss
   */
  recordMiss(operationDuration?: number): void {
    this.missCount++;
    if (operationDuration !== undefined) {
      this.recordOperationDuration(operationDuration);
    }
    this.updateHitRate();
  }

  /**
   * Record an operation duration
   */
  recordOperationDuration(duration: number): void {
    this.operationDurations.push(duration);
    if (this.operationDurations.length > this.maxDurationSamples) {
      this.operationDurations.shift(); // Remove oldest sample
    }
    this.monitoring.trackMetric(MetricNames.CACHE_OPERATION_DURATION, duration, {});
  }

  /**
   * Record a cache error
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * Update hit rate metric
   */
  private updateHitRate(): void {
    const total = this.hitCount + this.missCount;
    if (total > 0) {
      const hitRate = this.hitCount / total;
      this.monitoring.trackMetric(MetricNames.CACHE_HIT_RATE, hitRate, {});
    }
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    const total = this.hitCount + this.missCount;
    const averageDuration = this.operationDurations.length > 0
      ? this.operationDurations.reduce((sum, d) => sum + d, 0) / this.operationDurations.length
      : undefined;

    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
      totalRequests: total,
      averageOperationDuration: averageDuration,
      errorCount: this.errorCount > 0 ? this.errorCount : undefined,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.operationDurations = [];
    this.errorCount = 0;
  }

  /**
   * Export metrics to monitoring provider
   */
  exportMetrics(): void {
    const metrics = this.getMetrics();
    
    this.monitoring.trackMetric(MetricNames.CACHE_HIT_COUNT, metrics.hitCount, {});
    this.monitoring.trackMetric(MetricNames.CACHE_MISS_COUNT, metrics.missCount, {});
    this.monitoring.trackMetric(MetricNames.CACHE_HIT_RATE, metrics.hitRate, {});
    
    if (metrics.averageOperationDuration !== undefined) {
      this.monitoring.trackMetric(MetricNames.CACHE_OPERATION_DURATION, metrics.averageOperationDuration, {
        type: 'average',
      });
    }
  }
}

/**
 * Create a cache metrics tracker instance
 */
export function createCacheMetricsTracker(monitoring: IMonitoringProvider): CacheMetricsTracker {
  return new CacheMetricsTracker(monitoring);
}
