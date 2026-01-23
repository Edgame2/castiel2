// Core service and decorators
export { MonitoringService, Monitor, TrackDependency, TrackExceptions, withMonitoring } from './service.js';

// Types and interfaces
export type {
  IMonitoringProvider,
  CustomProperties,
} from './types.js';

export { SeverityLevel, MetricNames, EventNames, DependencyTypes } from './types.js';

// Providers
export { ApplicationInsightsProvider } from './providers/application-insights.js';
export { MockMonitoringProvider } from './providers/mock.js';

// Cache metrics
export { CacheMetricsTracker, createCacheMetricsTracker } from './cache-metrics.js';
export type { CacheMetrics } from './cache-metrics.js';

// Queue metrics
export { QueueMetricsTracker, createQueueMetricsTracker, getQueueDepth, getQueueJobCounts } from './queue-metrics.js';
export type { QueueMetrics, QueueJobCounts } from './queue-metrics.js';
