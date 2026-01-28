/**
 * Prefetch Manager
 * Dynamically adjusts RabbitMQ prefetch based on processing time and throughput
 * @module integration-processors/utils/prefetchManager
 */

import { log } from './logger';

export interface PrefetchConfig {
  min: number;
  max: number;
  initial: number;
  adjustmentIntervalMs: number;
  targetProcessingTimeMs: number;
  minSamples: number;
}

const DEFAULT_CONFIG: PrefetchConfig = {
  min: 1,
  max: 100,
  initial: 20,
  adjustmentIntervalMs: 60000, // Adjust every minute
  targetProcessingTimeMs: 1000, // Target 1 second per message
  minSamples: 10, // Need at least 10 samples before adjusting
};

export class PrefetchManager {
  private config: PrefetchConfig;
  private currentPrefetch: number;
  private processingTimes: number[] = [];
  private lastAdjustmentTime: number = Date.now();
  private adjustmentCount: number = 0;

  constructor(config?: Partial<PrefetchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentPrefetch = this.config.initial;
  }

  /**
   * Record a processing time sample
   */
  recordProcessingTime(processingTimeMs: number): void {
    this.processingTimes.push(processingTimeMs);
    
    // Keep only last 100 samples for rolling average
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    // Check if we should adjust prefetch
    const now = Date.now();
    if (now - this.lastAdjustmentTime >= this.config.adjustmentIntervalMs) {
      this.adjustPrefetch();
      this.lastAdjustmentTime = now;
    }
  }

  /**
   * Get current prefetch value
   */
  getCurrentPrefetch(): number {
    return this.currentPrefetch;
  }

  /**
   * Calculate optimal prefetch based on processing time
   * Formula: prefetch = target_time / avg_processing_time * current_prefetch
   * Clamped between min and max
   */
  private adjustPrefetch(): void {
    if (this.processingTimes.length < this.config.minSamples) {
      log.debug('Not enough samples for prefetch adjustment', {
        samples: this.processingTimes.length,
        minSamples: this.config.minSamples,
        service: 'integration-processors',
      });
      return;
    }

    // Calculate average processing time
    const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    
    // Calculate ratio: how much faster/slower we are than target
    const ratio = this.config.targetProcessingTimeMs / avgProcessingTime;
    
    // Adjust prefetch: if processing is faster than target, increase prefetch
    // If processing is slower than target, decrease prefetch
    let newPrefetch = Math.round(this.currentPrefetch * ratio);
    
    // Apply smoothing: only adjust by 20% max per interval to avoid oscillation
    const maxChange = Math.round(this.currentPrefetch * 0.2);
    if (newPrefetch > this.currentPrefetch + maxChange) {
      newPrefetch = this.currentPrefetch + maxChange;
    } else if (newPrefetch < this.currentPrefetch - maxChange) {
      newPrefetch = this.currentPrefetch - maxChange;
    }
    
    // Clamp to min/max bounds
    newPrefetch = Math.max(this.config.min, Math.min(this.config.max, newPrefetch));
    
    if (newPrefetch !== this.currentPrefetch) {
      const oldPrefetch = this.currentPrefetch;
      this.currentPrefetch = newPrefetch;
      this.adjustmentCount++;
      
      log.info('Prefetch adjusted based on processing time', {
        oldPrefetch,
        newPrefetch,
        avgProcessingTimeMs: avgProcessingTime.toFixed(2),
        targetProcessingTimeMs: this.config.targetProcessingTimeMs,
        samples: this.processingTimes.length,
        adjustmentCount: this.adjustmentCount,
        service: 'integration-processors',
      });
    } else {
      log.debug('Prefetch unchanged', {
        prefetch: this.currentPrefetch,
        avgProcessingTimeMs: avgProcessingTime.toFixed(2),
        samples: this.processingTimes.length,
        service: 'integration-processors',
      });
    }
    
    // Clear samples after adjustment to get fresh data for next interval
    this.processingTimes = [];
  }

  /**
   * Reset prefetch to initial value
   */
  reset(): void {
    this.currentPrefetch = this.config.initial;
    this.processingTimes = [];
    this.adjustmentCount = 0;
    this.lastAdjustmentTime = Date.now();
    
    log.info('Prefetch manager reset', {
      prefetch: this.currentPrefetch,
      service: 'integration-processors',
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    currentPrefetch: number;
    avgProcessingTime: number;
    samples: number;
    adjustments: number;
  } {
    const avgProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;
    
    return {
      currentPrefetch: this.currentPrefetch,
      avgProcessingTime,
      samples: this.processingTimes.length,
      adjustments: this.adjustmentCount,
    };
  }
}
