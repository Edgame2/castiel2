/**
 * Queue Metrics Module
 * 
 * Provides utilities for tracking and exposing queue metrics (depth, processing time, failed jobs, throughput)
 */

import type { Queue } from 'bullmq';
import type { IMonitoringProvider } from './types.js';
import { MetricNames } from './types.js';

/**
 * Queue job counts from BullMQ
 */
export interface QueueJobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

/**
 * Queue metrics data structure
 */
export interface QueueMetrics {
  queueName: string;
  depth: number; // waiting + active
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  failedJobRate: number; // failed / (completed + failed)
  throughput: number; // jobs per second (calculated over time window)
  processingTimeP50?: number;
  processingTimeP95?: number;
  processingTimeP99?: number;
  averageProcessingTime?: number;
}

/**
 * Queue Metrics Tracker
 * 
 * Tracks queue performance metrics and exposes them via monitoring provider
 */
export class QueueMetricsTracker {
  private monitoring: IMonitoringProvider;
  private processingTimes: Map<string, number[]> = new Map(); // queueName -> durations[]
  private completedCounts: Map<string, number> = new Map(); // queueName -> count
  private failedCounts: Map<string, number> = new Map(); // queueName -> count
  private throughputWindows: Map<string, { count: number; startTime: number }> = new Map(); // queueName -> window
  private readonly maxProcessingTimeSamples: number = 1000; // Keep last 1000 samples per queue
  private readonly throughputWindowSeconds: number = 60; // 60 second window for throughput

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  /**
   * Record a completed job with processing duration
   */
  recordCompleted(queueName: string, duration: number): void {
    // Track processing time
    if (!this.processingTimes.has(queueName)) {
      this.processingTimes.set(queueName, []);
    }
    const durations = this.processingTimes.get(queueName)!;
    durations.push(duration);
    if (durations.length > this.maxProcessingTimeSamples) {
      durations.shift(); // Remove oldest sample
    }

    // Track completed count
    const current = this.completedCounts.get(queueName) || 0;
    this.completedCounts.set(queueName, current + 1);

    // Track throughput
    this.updateThroughput(queueName);

    // Track metric
    this.monitoring.trackMetric(MetricNames.QUEUE_JOB_DURATION, duration, { queueName });
  }

  /**
   * Record a failed job
   */
  recordFailed(queueName: string): void {
    const current = this.failedCounts.get(queueName) || 0;
    this.failedCounts.set(queueName, current + 1);
    this.updateThroughput(queueName);
  }

  /**
   * Update throughput calculation
   */
  private updateThroughput(queueName: string): void {
    const now = Date.now();
    const window = this.throughputWindows.get(queueName);

    if (!window || (now - window.startTime) > this.throughputWindowSeconds * 1000) {
      // Start new window
      this.throughputWindows.set(queueName, { count: 1, startTime: now });
    } else {
      // Increment existing window
      window.count++;
    }
  }

  /**
   * Calculate percentiles from array of durations
   */
  private calculatePercentiles(durations: number[]): {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  } {
    if (durations.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0 };
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    return { p50, p95, p99, average };
  }

  /**
   * Get metrics for a specific queue
   */
  async getQueueMetrics(queue: Queue, queueName: string): Promise<QueueMetrics> {
    try {
      // Get job counts from BullMQ
      const counts = await queue.getJobCounts();
      const depth = counts.waiting + counts.active;

      // Calculate failed job rate
      const completed = this.completedCounts.get(queueName) || 0;
      const failed = this.failedCounts.get(queueName) || 0;
      const total = completed + failed;
      const failedJobRate = total > 0 ? failed / total : 0;

      // Calculate throughput
      const window = this.throughputWindows.get(queueName);
      let throughput = 0;
      if (window) {
        const elapsed = (Date.now() - window.startTime) / 1000; // seconds
        throughput = elapsed > 0 ? window.count / elapsed : 0;
      }

      // Calculate processing time percentiles
      const durations = this.processingTimes.get(queueName) || [];
      const percentiles = this.calculatePercentiles(durations);

      return {
        queueName,
        depth,
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
        failedJobRate,
        throughput,
        processingTimeP50: percentiles.p50 > 0 ? percentiles.p50 : undefined,
        processingTimeP95: percentiles.p95 > 0 ? percentiles.p95 : undefined,
        processingTimeP99: percentiles.p99 > 0 ? percentiles.p99 : undefined,
        averageProcessingTime: percentiles.average > 0 ? percentiles.average : undefined,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'queue-metrics.getQueueMetrics',
        queueName,
      });
      // Return default metrics on error
      return {
        queueName,
        depth: 0,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        failedJobRate: 0,
        throughput: 0,
      };
    }
  }

  /**
   * Export metrics for a queue to monitoring provider
   */
  async exportQueueMetrics(queue: Queue, queueName: string): Promise<void> {
    const metrics = await this.getQueueMetrics(queue, queueName);

    // Export all metrics
    this.monitoring.trackMetric(MetricNames.QUEUE_DEPTH, metrics.depth, { queueName });
    this.monitoring.trackMetric(MetricNames.QUEUE_WAITING, metrics.waiting, { queueName });
    this.monitoring.trackMetric(MetricNames.QUEUE_ACTIVE, metrics.active, { queueName });
    this.monitoring.trackMetric(MetricNames.QUEUE_COMPLETED, metrics.completed, { queueName });
    this.monitoring.trackMetric(MetricNames.QUEUE_FAILED, metrics.failed, { queueName });
    this.monitoring.trackMetric(MetricNames.QUEUE_DELAYED, metrics.delayed, { queueName });
    this.monitoring.trackMetric(MetricNames.QUEUE_FAILED_JOB_RATE, metrics.failedJobRate, { queueName });
    this.monitoring.trackMetric(MetricNames.QUEUE_THROUGHPUT, metrics.throughput, { queueName });

    if (metrics.processingTimeP50 !== undefined) {
      this.monitoring.trackMetric(MetricNames.QUEUE_PROCESSING_TIME_P50, metrics.processingTimeP50, { queueName });
    }
    if (metrics.processingTimeP95 !== undefined) {
      this.monitoring.trackMetric(MetricNames.QUEUE_PROCESSING_TIME_P95, metrics.processingTimeP95, { queueName });
    }
    if (metrics.processingTimeP99 !== undefined) {
      this.monitoring.trackMetric(MetricNames.QUEUE_PROCESSING_TIME_P99, metrics.processingTimeP99, { queueName });
    }
  }

  /**
   * Reset metrics for a specific queue
   */
  resetQueueMetrics(queueName: string): void {
    this.processingTimes.delete(queueName);
    this.completedCounts.delete(queueName);
    this.failedCounts.delete(queueName);
    this.throughputWindows.delete(queueName);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.processingTimes.clear();
    this.completedCounts.clear();
    this.failedCounts.clear();
    this.throughputWindows.clear();
  }
}

/**
 * Create a queue metrics tracker instance
 */
export function createQueueMetricsTracker(monitoring: IMonitoringProvider): QueueMetricsTracker {
  return new QueueMetricsTracker(monitoring);
}

/**
 * Get queue depth for a specific queue (convenience function)
 */
export async function getQueueDepth(queue: Queue): Promise<number> {
  try {
    const counts = await queue.getJobCounts();
    return counts.waiting + counts.active;
  } catch (error) {
    return 0;
  }
}

/**
 * Get all queue job counts (convenience function)
 */
export async function getQueueJobCounts(queue: Queue): Promise<QueueJobCounts> {
  try {
    const counts = await queue.getJobCounts();
    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      paused: counts.paused,
    };
  } catch (error) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }
}
