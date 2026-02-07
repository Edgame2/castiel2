/**
 * Metrics Collector
 * 
 * Collects Prometheus metrics for notification delivery
 */

import { getConfig } from '../config/index.js';
import { NotificationChannel, NotificationStatus } from '../types/notification';

export class MetricsCollector {
  private config = getConfig();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment notification sent counter
   */
  incrementNotificationSent(channel: NotificationChannel, status: NotificationStatus): void {
    const key = `notifications_sent_total{channel="${channel}",status="${status}"}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  /**
   * Record notification duration
   */
  recordNotificationDuration(channel: NotificationChannel, durationMs: number): void {
    const key = `notification_duration_seconds{channel="${channel}"}`;
    const durations = this.histograms.get(key) || [];
    durations.push(durationMs / 1000); // Convert to seconds
    this.histograms.set(key, durations);
  }

  /**
   * Increment provider error counter
   */
  incrementProviderError(provider: string, errorType: string): void {
    const key = `provider_errors_total{provider="${provider}",error="${errorType}"}`;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  /**
   * Get Prometheus metrics format
   */
  getMetrics(): string {
    const lines: string[] = [];

    // Counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`${key} ${value}`);
    }

    // Histograms (simplified - in production use prom-client)
    for (const [key, values] of this.histograms.entries()) {
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        lines.push(`${key}_sum ${sum}`);
        lines.push(`${key}_count ${values.length}`);
        lines.push(`${key}_avg ${avg}`);
        lines.push(`${key}_min ${min}`);
        lines.push(`${key}_max ${max}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

