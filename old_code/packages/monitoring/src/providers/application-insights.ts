import * as appInsights from 'applicationinsights';
import type {
  IMonitoringProvider,
  MonitoringConfig,
  CustomProperties,
  SeverityLevel,
} from '../types.js';

/**
 * Azure Application Insights monitoring provider
 */
export class ApplicationInsightsProvider implements IMonitoringProvider {
  private client: appInsights.TelemetryClient | null = null;
  private config: MonitoringConfig;
  private timers: Map<string, number> = new Map();

  constructor(config: MonitoringConfig) {
    this.config = config;

    if (!config.enabled) {
      console.log('[Monitoring] Monitoring is disabled');
      return;
    }

    if (!config.instrumentationKey) {
      console.warn('[Monitoring] No instrumentation key provided, monitoring will not work');
      return;
    }

    this.initialize();
  }

  private initialize(): void {
    try {
      // Setup Application Insights
      appInsights
        .setup(this.config.instrumentationKey)
        .setAutoCollectRequests(this.config.enableAutoCollect ?? true)
        .setAutoCollectPerformance(this.config.enableAutoCollect ?? true)
        .setAutoCollectExceptions(!this.config.disableExceptionTracking)
        .setAutoCollectDependencies(this.config.enableAutoCollect ?? true)
        .setAutoCollectConsole(false)
        .setUseDiskRetryCaching(true)
        .setSendLiveMetrics(true)
        .start();

      this.client = appInsights.defaultClient;

      // Check if client was initialized successfully
      if (!this.client) {
        console.warn('[Monitoring] Application Insights defaultClient is not available');
        return;
      }

      // Set sampling rate
      if (this.config.samplingRate !== undefined && this.client.config) {
        this.client.config.samplingPercentage = this.config.samplingRate * 100;
      }

      console.log('[Monitoring] Application Insights initialized');
    } catch (error) {
      console.error('[Monitoring] Failed to initialize Application Insights:', error);
    }
  }

  trackMetric(name: string, value: number, properties?: CustomProperties): void {
    if (!this.client) return;

    try {
      this.client.trackMetric({
        name,
        value,
        properties: this.sanitizeProperties(properties),
      });
    } catch (error) {
      console.error('[Monitoring] Error tracking metric:', error);
    }
  }

  trackEvent(name: string, properties?: CustomProperties): void {
    if (!this.client) return;

    try {
      this.client.trackEvent({
        name,
        properties: this.sanitizeProperties(properties),
      });
    } catch (error) {
      console.error('[Monitoring] Error tracking event:', error);
    }
  }

  trackTrace(message: string, severity: SeverityLevel, properties?: CustomProperties): void {
    if (!this.client) return;

    try {
      this.client.trackTrace({
        message,
        severity: this.mapSeverityLevel(severity),
        properties: this.sanitizeProperties(properties),
      });
    } catch (error) {
      console.error('[Monitoring] Error tracking trace:', error);
    }
  }

  trackException(error: Error, properties?: CustomProperties): void {
    if (!this.client) return;

    try {
      this.client.trackException({
        exception: error,
        properties: this.sanitizeProperties(properties),
      });
    } catch (err) {
      console.error('[Monitoring] Error tracking exception:', err);
    }
  }

  trackRequest(
    name: string,
    url: string,
    duration: number,
    responseCode: number,
    success: boolean,
    properties?: CustomProperties
  ): void {
    if (!this.client) return;

    try {
      this.client.trackRequest({
        name,
        url,
        duration,
        resultCode: responseCode.toString(),
        success,
        properties: this.sanitizeProperties(properties),
      });
    } catch (error) {
      console.error('[Monitoring] Error tracking request:', error);
    }
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
    if (!this.client) return;

    try {
      this.client.trackDependency({
        name,
        dependencyTypeName: type,
        target,
        duration,
        success,
        resultCode: success ? '200' : '500',
        data: data || '',
        properties: this.sanitizeProperties(properties),
      });
    } catch (error) {
      console.error('[Monitoring] Error tracking dependency:', error);
    }
  }

  setAuthenticatedUserContext(userId: string, accountId?: string): void {
    if (!this.client) return;

    try {
      this.client.context.tags[this.client.context.keys.userId] = userId;
      if (accountId) {
        this.client.context.tags[this.client.context.keys.userAccountId] = accountId;
      }
    } catch (error) {
      console.error('[Monitoring] Error setting user context:', error);
    }
  }

  clearAuthenticatedUserContext(): void {
    if (!this.client) return;

    try {
      delete this.client.context.tags[this.client.context.keys.userId];
      delete this.client.context.tags[this.client.context.keys.userAccountId];
    } catch (error) {
      console.error('[Monitoring] Error clearing user context:', error);
    }
  }

  async flush(): Promise<void> {
    if (!this.client) return;

    return new Promise((resolve) => {
      this.client!.flush({
        callback: () => {
          resolve();
        },
      });
    });
  }

  startTimer(name: string): () => void {
    const startTime = Date.now();
    const timerId = `${name}_${startTime}`;
    this.timers.set(timerId, startTime);

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.timers.delete(timerId);
      
      this.trackMetric(name, duration, {
        type: 'duration',
        unit: 'milliseconds',
      });
    };
  }

  /**
   * Sanitize properties to ensure they are strings
   */
  private sanitizeProperties(properties?: CustomProperties): Record<string, string> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value !== undefined) {
        sanitized[key] = String(value);
      }
    }
    return sanitized;
  }

  /**
   * Map our severity level to App Insights severity level
   */
  private mapSeverityLevel(severity: SeverityLevel): appInsights.Contracts.SeverityLevel {
    switch (severity) {
      case 0: // Verbose
        return appInsights.Contracts.SeverityLevel.Verbose;
      case 1: // Information
        return appInsights.Contracts.SeverityLevel.Information;
      case 2: // Warning
        return appInsights.Contracts.SeverityLevel.Warning;
      case 3: // Error
        return appInsights.Contracts.SeverityLevel.Error;
      case 4: // Critical
        return appInsights.Contracts.SeverityLevel.Critical;
      default:
        return appInsights.Contracts.SeverityLevel.Information;
    }
  }
}
