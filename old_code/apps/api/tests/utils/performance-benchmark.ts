/**
 * Performance Benchmarking for Integration System
 * 
 * Measures sync speed, memory usage, throughput, and API rate limit compliance
 */

import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  category: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number;
  memoryUsage?: MemoryUsage;
  metadata?: Record<string, any>;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface RateLimitMetrics {
  requestCount: number;
  timeWindow: number;
  averageRequestRate: number;
  peakRequestRate: number;
  rateLimitHits: number;
  retryCount: number;
}

/**
 * Performance Benchmark Runner
 */
export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private currentBenchmark: {
    name: string;
    category: string;
    times: number[];
    memorySnapshots: MemoryUsage[];
    startTime: number;
  } | null = null;

  /**
   * Start a new benchmark
   */
  start(name: string, category: string = 'general'): void {
    this.currentBenchmark = {
      name,
      category,
      times: [],
      memorySnapshots: [],
      startTime: performance.now(),
    };
  }

  /**
   * Record iteration time
   */
  recordIteration(duration?: number): void {
    if (!this.currentBenchmark) {
      throw new Error('No active benchmark. Call start() first.');
    }

    const time = duration !== undefined ? duration : performance.now() - this.currentBenchmark.startTime;
    this.currentBenchmark.times.push(time);
    this.currentBenchmark.startTime = performance.now();
  }

  /**
   * Record memory snapshot
   */
  recordMemory(): void {
    if (!this.currentBenchmark) return;

    const usage = process.memoryUsage();
    this.currentBenchmark.memorySnapshots.push({
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    });
  }

  /**
   * Complete current benchmark
   */
  complete(metadata?: Record<string, any>): BenchmarkResult {
    if (!this.currentBenchmark) {
      throw new Error('No active benchmark');
    }

    const { name, category, times, memorySnapshots } = this.currentBenchmark;
    const sortedTimes = [...times].sort((a, b) => a - b);
    const totalTime = times.reduce((sum, t) => sum + t, 0);

    const result: BenchmarkResult = {
      name,
      category,
      iterations: times.length,
      totalTime,
      avgTime: totalTime / times.length,
      minTime: sortedTimes[0],
      maxTime: sortedTimes[sortedTimes.length - 1],
      medianTime: this.calculatePercentile(sortedTimes, 50),
      p95Time: this.calculatePercentile(sortedTimes, 95),
      p99Time: this.calculatePercentile(sortedTimes, 99),
      throughput: (times.length / totalTime) * 1000, // operations per second
      metadata,
    };

    // Calculate average memory usage
    if (memorySnapshots.length > 0) {
      result.memoryUsage = {
        heapUsed: this.average(memorySnapshots.map(m => m.heapUsed)),
        heapTotal: this.average(memorySnapshots.map(m => m.heapTotal)),
        external: this.average(memorySnapshots.map(m => m.external)),
        rss: this.average(memorySnapshots.map(m => m.rss)),
      };
    }

    this.results.push(result);
    this.currentBenchmark = null;

    return result;
  }

  /**
   * Get all benchmark results
   */
  getResults(): BenchmarkResult[] {
    return this.results;
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results = [];
    this.currentBenchmark = null;
  }

  /**
   * Generate report
   */
  generateReport(): string {
    let report = '# Performance Benchmark Report\n\n';
    
    const categories = new Set(this.results.map(r => r.category));
    
    for (const category of categories) {
      report += `## ${category}\n\n`;
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        report += `### ${result.name}\n`;
        report += `- Iterations: ${result.iterations}\n`;
        report += `- Average Time: ${result.avgTime.toFixed(2)}ms\n`;
        report += `- Min/Max: ${result.minTime.toFixed(2)}ms / ${result.maxTime.toFixed(2)}ms\n`;
        report += `- P95/P99: ${result.p95Time.toFixed(2)}ms / ${result.p99Time.toFixed(2)}ms\n`;
        report += `- Throughput: ${result.throughput.toFixed(2)} ops/sec\n`;
        
        if (result.memoryUsage) {
          report += `- Memory: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB heap\n`;
        }
        
        report += '\n';
      }
    }
    
    return report;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private average(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

/**
 * Sync Performance Benchmarker
 */
export class SyncPerformanceBenchmark {
  private benchmark = new PerformanceBenchmark();

  /**
   * Benchmark full sync operation
   */
  async benchmarkFullSync(
    syncFn: () => Promise<any>,
    recordCount: number,
    iterations: number = 5
  ): Promise<BenchmarkResult> {
    this.benchmark.start('Full Sync', 'sync-operations');

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      this.benchmark.recordMemory();
      
      await syncFn();
      
      const duration = performance.now() - startTime;
      this.benchmark.recordIteration(duration);
      this.benchmark.recordMemory();
    }

    return this.benchmark.complete({
      recordCount,
      recordsPerSecond: (recordCount * iterations) / (this.benchmark.getResults()[0]?.totalTime || 1) * 1000,
    });
  }

  /**
   * Benchmark incremental sync
   */
  async benchmarkIncrementalSync(
    syncFn: () => Promise<any>,
    changedRecordCount: number,
    iterations: number = 10
  ): Promise<BenchmarkResult> {
    this.benchmark.start('Incremental Sync', 'sync-operations');

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await syncFn();
      const duration = performance.now() - startTime;
      this.benchmark.recordIteration(duration);
    }

    return this.benchmark.complete({ changedRecordCount });
  }

  /**
   * Benchmark deduplication performance
   */
  async benchmarkDeduplication(
    deduplicateFn: (records: any[]) => Promise<any>,
    recordCount: number
  ): Promise<BenchmarkResult> {
    this.benchmark.start('Deduplication', 'data-processing');

    const records = Array.from({ length: recordCount }, (_, i) => ({
      id: `record-${i}`,
      email: `user${i % 100}@example.com`, // Create duplicates
    }));

    const startTime = performance.now();
    await deduplicateFn(records);
    const duration = performance.now() - startTime;

    this.benchmark.recordIteration(duration);

    return this.benchmark.complete({
      recordCount,
      recordsPerMs: recordCount / duration,
    });
  }

  /**
   * Get all results
   */
  getResults(): BenchmarkResult[] {
    return this.benchmark.getResults();
  }

  /**
   * Generate report
   */
  generateReport(): string {
    return this.benchmark.generateReport();
  }
}

/**
 * Rate Limit Monitor
 */
export class RateLimitMonitor {
  private requestTimestamps: number[] = [];
  private rateLimitHits = 0;
  private retryCount = 0;
  private windowSize: number;

  constructor(windowSize: number = 60000) { // Default 1 minute window
    this.windowSize = windowSize;
  }

  /**
   * Record API request
   */
  recordRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.cleanOldRequests(now);
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(): void {
    this.rateLimitHits++;
  }

  /**
   * Record retry attempt
   */
  recordRetry(): void {
    this.retryCount++;
  }

  /**
   * Get current request rate (requests per second)
   */
  getCurrentRate(): number {
    const now = Date.now();
    this.cleanOldRequests(now);
    return (this.requestTimestamps.length / this.windowSize) * 1000;
  }

  /**
   * Get metrics
   */
  getMetrics(): RateLimitMetrics {
    const now = Date.now();
    this.cleanOldRequests(now);

    const timeWindow = this.windowSize;
    const requestCount = this.requestTimestamps.length;
    const averageRequestRate = (requestCount / timeWindow) * 1000;

    // Calculate peak rate (highest rate in any 1-second window)
    const peakRequestRate = this.calculatePeakRate();

    return {
      requestCount,
      timeWindow,
      averageRequestRate,
      peakRequestRate,
      rateLimitHits: this.rateLimitHits,
      retryCount: this.retryCount,
    };
  }

  /**
   * Check if within rate limit
   */
  isWithinLimit(maxRequestsPerWindow: number): boolean {
    const now = Date.now();
    this.cleanOldRequests(now);
    return this.requestTimestamps.length < maxRequestsPerWindow;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.requestTimestamps = [];
    this.rateLimitHits = 0;
    this.retryCount = 0;
  }

  private cleanOldRequests(now: number): void {
    const cutoff = now - this.windowSize;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > cutoff);
  }

  private calculatePeakRate(): number {
    if (this.requestTimestamps.length === 0) return 0;

    let peakRate = 0;
    const sortedTimestamps = [...this.requestTimestamps].sort((a, b) => a - b);

    for (let i = 0; i < sortedTimestamps.length; i++) {
      const windowStart = sortedTimestamps[i];
      const windowEnd = windowStart + 1000; // 1 second
      const requestsInWindow = sortedTimestamps.filter(
        ts => ts >= windowStart && ts < windowEnd
      ).length;
      
      peakRate = Math.max(peakRate, requestsInWindow);
    }

    return peakRate;
  }
}

/**
 * Memory Profiler
 */
export class MemoryProfiler {
  private snapshots: Array<{
    timestamp: number;
    label: string;
    usage: MemoryUsage;
  }> = [];

  /**
   * Take memory snapshot
   */
  snapshot(label: string = 'snapshot'): MemoryUsage {
    const usage = process.memoryUsage();
    const snapshot = {
      timestamp: Date.now(),
      label,
      usage: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
      },
    };

    this.snapshots.push(snapshot);
    return snapshot.usage;
  }

  /**
   * Get memory delta between two snapshots
   */
  getDelta(fromLabel: string, toLabel: string): Partial<MemoryUsage> | null {
    const from = this.snapshots.find(s => s.label === fromLabel);
    const to = this.snapshots.find(s => s.label === toLabel);

    if (!from || !to) return null;

    return {
      heapUsed: to.usage.heapUsed - from.usage.heapUsed,
      heapTotal: to.usage.heapTotal - from.usage.heapTotal,
      external: to.usage.external - from.usage.external,
      rss: to.usage.rss - from.usage.rss,
    };
  }

  /**
   * Get peak memory usage
   */
  getPeakUsage(): MemoryUsage | null {
    if (this.snapshots.length === 0) return null;

    return this.snapshots.reduce((peak, snapshot) => {
      return snapshot.usage.heapUsed > peak.heapUsed ? snapshot.usage : peak;
    }, this.snapshots[0].usage);
  }

  /**
   * Generate memory report
   */
  generateReport(): string {
    let report = '# Memory Profile Report\n\n';

    for (const snapshot of this.snapshots) {
      report += `## ${snapshot.label}\n`;
      report += `- Heap Used: ${(snapshot.usage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
      report += `- Heap Total: ${(snapshot.usage.heapTotal / 1024 / 1024).toFixed(2)} MB\n`;
      report += `- External: ${(snapshot.usage.external / 1024 / 1024).toFixed(2)} MB\n`;
      report += `- RSS: ${(snapshot.usage.rss / 1024 / 1024).toFixed(2)} MB\n\n`;
    }

    const peak = this.getPeakUsage();
    if (peak) {
      report += `## Peak Usage\n`;
      report += `- Heap Used: ${(peak.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
    }

    return report;
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots = [];
  }
}

/**
 * Export performance utilities
 */
export const performanceBenchmark = {
  PerformanceBenchmark,
  SyncPerformanceBenchmark,
  RateLimitMonitor,
  MemoryProfiler,
};

export default performanceBenchmark;
