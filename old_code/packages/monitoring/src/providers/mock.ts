import type {
  IMonitoringProvider,
  MonitoringConfig,
  CustomProperties,
} from '../types.js';
import { SeverityLevel } from '../types.js';

/**
 * Mock monitoring provider for testing and development
 * Logs all tracking calls to console
 */
export class MockMonitoringProvider implements IMonitoringProvider {
  private config: MonitoringConfig;
  private metrics: Array<{ name: string; value: number; properties?: CustomProperties }> = [];
  private events: Array<{ name: string; properties?: CustomProperties }> = [];
  private traces: Array<{ message: string; severity: SeverityLevel; properties?: CustomProperties }> = [];
  private exceptions: Array<{ error: Error; properties?: CustomProperties }> = [];
  private requests: Array<{ name: string; url: string; duration: number; responseCode: number; success: boolean; properties?: CustomProperties }> = [];
  private dependencies: Array<{ name: string; type: string; target: string; duration: number; success: boolean; data?: string; properties?: CustomProperties }> = [];
  private userContext: { userId?: string; accountId?: string } = {};

  constructor(config: MonitoringConfig) {
    this.config = config;
    if (config.enabled) {
      console.log('[MockMonitoring] Mock monitoring provider initialized');
    }
  }

  trackMetric(name: string, value: number, properties?: CustomProperties): void {
    if (!this.config.enabled) return;

    const metric = { name, value, properties };
    this.metrics.push(metric);
    console.log('[MockMonitoring] Metric:', metric);
  }

  trackEvent(name: string, properties?: CustomProperties): void {
    if (!this.config.enabled) return;

    const event = { name, properties };
    this.events.push(event);
    console.log('[MockMonitoring] Event:', event);
  }

  trackTrace(message: string, severity: SeverityLevel, properties?: CustomProperties): void {
    if (!this.config.enabled) return;

    const trace = { message, severity, properties };
    this.traces.push(trace);
    console.log(`[MockMonitoring] Trace [${SeverityLevel[severity]}]:`, message, properties);
  }

  trackException(error: Error, properties?: CustomProperties): void {
    if (!this.config.enabled) return;

    const exception = { error, properties };
    this.exceptions.push(exception);
    console.error('[MockMonitoring] Exception:', error.message, properties);
  }

  trackRequest(
    name: string,
    url: string,
    duration: number,
    responseCode: number,
    success: boolean,
    properties?: CustomProperties
  ): void {
    if (!this.config.enabled) return;

    const request = { name, url, duration, responseCode, success, properties };
    this.requests.push(request);
    console.log('[MockMonitoring] Request:', request);
  }

  trackDependency(
    name: string,
    type: string,
    target: string,
    duration: number,
    success: boolean,
    data?: string,
    properties?: CustomProperties
  ): void {
    if (!this.config.enabled) return;

    const dependency = { name, type, target, duration, success, data, properties };
    this.dependencies.push(dependency);
    console.log('[MockMonitoring] Dependency:', dependency);
  }

  setAuthenticatedUserContext(userId: string, accountId?: string): void {
    if (!this.config.enabled) return;

    this.userContext = { userId, accountId };
    console.log('[MockMonitoring] User context set:', this.userContext);
  }

  clearAuthenticatedUserContext(): void {
    if (!this.config.enabled) return;

    this.userContext = {};
    console.log('[MockMonitoring] User context cleared');
  }

  async flush(): Promise<void> {
    console.log('[MockMonitoring] Flush called');
    return Promise.resolve();
  }

  startTimer(name: string): () => void {
    const startTime = Date.now();
    console.log(`[MockMonitoring] Timer started: ${name}`);

    return () => {
      const duration = Date.now() - startTime;
      this.trackMetric(name, duration, { type: 'duration', unit: 'milliseconds' });
    };
  }

  // Test helpers
  getMetrics() {
    return this.metrics;
  }

  getEvents() {
    return this.events;
  }

  getTraces() {
    return this.traces;
  }

  getExceptions() {
    return this.exceptions;
  }

  getRequests() {
    return this.requests;
  }

  getDependencies() {
    return this.dependencies;
  }

  getUserContext() {
    return this.userContext;
  }

  clear() {
    this.metrics = [];
    this.events = [];
    this.traces = [];
    this.exceptions = [];
    this.requests = [];
    this.dependencies = [];
    this.userContext = {};
  }
}
