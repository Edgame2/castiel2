import type { IMonitoringProvider, CustomProperties } from './types.js';
import { ApplicationInsightsProvider } from './providers/application-insights.js';
import { MockMonitoringProvider } from './providers/mock.js';

/**
 * Monitoring service factory
 * Creates the appropriate monitoring provider based on configuration
 */
export class MonitoringService {
  private static instance: IMonitoringProvider | null = null;

  static initialize(config: {
    enabled: boolean;
    provider: 'application-insights' | 'mock';
    instrumentationKey?: string;
    samplingRate?: number;
  }): IMonitoringProvider {
    if (this.instance) {
      return this.instance;
    }

    switch (config.provider) {
      case 'application-insights':
        this.instance = new ApplicationInsightsProvider(config);
        break;
      case 'mock':
        this.instance = new MockMonitoringProvider(config);
        break;
      default:
        console.warn(`[Monitoring] Unknown provider: ${config.provider}, using mock`);
        this.instance = new MockMonitoringProvider(config);
    }

    return this.instance;
  }

  static getInstance(): IMonitoringProvider {
    if (!this.instance) {
      throw new Error('Monitoring service not initialized. Call MonitoringService.initialize() first.');
    }
    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}

/**
 * Decorator to automatically track method execution
 * Usage: @Monitor('operation.name')
 */
export function Monitor(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const finalMetricName = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitoring = MonitoringService.getInstance();
      const endTimer = monitoring.startTimer(finalMetricName);

      try {
        const result = await originalMethod.apply(this, args);
        monitoring.trackEvent(`${finalMetricName}.success`);
        endTimer();
        return result;
      } catch (error) {
        monitoring.trackException(error as Error, {
          method: finalMetricName,
          class: target.constructor.name,
        });
        monitoring.trackEvent(`${finalMetricName}.failure`);
        endTimer();
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to track dependency calls
 * Usage: @TrackDependency('Redis', 'cache-server')
 */
export function TrackDependency(type: string, target: string) {
  return function (targetObj: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitoring = MonitoringService.getInstance();
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        monitoring.trackDependency(
          `${targetObj.constructor.name}.${propertyKey}`,
          type,
          target,
          duration,
          true
        );
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        monitoring.trackDependency(
          `${targetObj.constructor.name}.${propertyKey}`,
          type,
          target,
          duration,
          false,
          (error as Error).message
        );
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to track exceptions
 * Usage: @TrackExceptions()
 */
export function TrackExceptions(properties?: CustomProperties) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitoring = MonitoringService.getInstance();

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        monitoring.trackException(error as Error, {
          ...properties,
          method: `${target.constructor.name}.${propertyKey}`,
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper to create a monitoring-aware function wrapper
 */
export function withMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  metricName: string
): T {
  return (async (...args: any[]) => {
    const monitoring = MonitoringService.getInstance();
    const endTimer = monitoring.startTimer(metricName);

    try {
      const result = await fn(...args);
      endTimer();
      return result;
    } catch (error) {
      monitoring.trackException(error as Error, { operation: metricName });
      endTimer();
      throw error;
    }
  }) as T;
}
