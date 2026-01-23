/**
 * Service Health Tracker
 * Tracks service initialization failures with detailed context for debugging
 */

import type { IMonitoringProvider } from '@castiel/monitoring';

export type ServiceCriticality = 'critical' | 'optional' | 'enhancement';

export interface ServiceFailureContext {
  serviceName: string;
  operation: string;
  error: Error | unknown;
  criticality: ServiceCriticality;
  dependencies?: string[];
  stackTrace?: string;
  errorCode?: string;
  errorMessage: string;
  timestamp: Date;
  environment?: string;
}

export class ServiceHealthTracker {
  private failures: Map<string, ServiceFailureContext> = new Map();
  private monitoring: IMonitoringProvider;

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  /**
   * Track a service initialization failure
   */
  trackFailure(context: Omit<ServiceFailureContext, 'timestamp' | 'errorMessage'>): void {
    const error = context.error instanceof Error ? context.error : new Error(String(context.error));
    const errorMessage = error.message || String(context.error);
    const stackTrace = error.stack || (context.error instanceof Error ? context.error.stack : undefined);

    const fullContext: ServiceFailureContext = {
      ...context,
      error,
      errorMessage,
      stackTrace,
      timestamp: new Date(),
      environment: process.env.NODE_ENV,
    };

    // Store failure for later analysis
    this.failures.set(context.serviceName, fullContext);

    // Track in monitoring with detailed context
    const monitoringProperties: Record<string, any> = {
      serviceName: context.serviceName,
      operation: context.operation,
      criticality: context.criticality,
      errorMessage,
      errorCode: context.errorCode || error.name || 'UNKNOWN_ERROR',
      environment: fullContext.environment,
    };

    if (context.dependencies && context.dependencies.length > 0) {
      monitoringProperties.dependencies = context.dependencies.join(',');
      monitoringProperties.missingDependencies = context.dependencies.length;
    }

    if (stackTrace) {
      // Include first few lines of stack trace (not full trace to avoid log bloat)
      const stackLines = stackTrace.split('\n').slice(0, 5).join('\n');
      monitoringProperties.stackTracePreview = stackLines;
    }

    // Track as exception for critical services, event for optional
    if (context.criticality === 'critical') {
      this.monitoring.trackException(error, {
        operation: `service-init.${context.serviceName}`,
        ...monitoringProperties,
      });
    } else {
      this.monitoring.trackEvent('service-init.failure', {
        severity: context.criticality === 'optional' ? 'warning' : 'info',
        ...monitoringProperties,
      });
    }

    // Also track a summary metric
    this.monitoring.trackMetric('service-init.failures', 1, {
      serviceName: context.serviceName,
      criticality: context.criticality,
    });
  }

  /**
   * Track a successful service initialization
   */
  trackSuccess(serviceName: string, operation: string, dependencies?: string[]): void {
    // Remove from failures if it was previously failing
    this.failures.delete(serviceName);

    this.monitoring.trackEvent('service-init.success', {
      serviceName,
      operation,
      dependencies: dependencies?.join(',') || '',
      environment: process.env.NODE_ENV,
    });
  }

  /**
   * Get all tracked failures
   */
  getFailures(): ServiceFailureContext[] {
    return Array.from(this.failures.values());
  }

  /**
   * Get failures by criticality
   */
  getFailuresByCriticality(criticality: ServiceCriticality): ServiceFailureContext[] {
    return this.getFailures().filter(f => f.criticality === criticality);
  }

  /**
   * Get summary of service health
   */
  getHealthSummary(): {
    totalFailures: number;
    criticalFailures: number;
    optionalFailures: number;
    enhancementFailures: number;
    services: string[];
  } {
    const failures = this.getFailures();
    return {
      totalFailures: failures.length,
      criticalFailures: failures.filter(f => f.criticality === 'critical').length,
      optionalFailures: failures.filter(f => f.criticality === 'optional').length,
      enhancementFailures: failures.filter(f => f.criticality === 'enhancement').length,
      services: failures.map(f => f.serviceName),
    };
  }

  /**
   * Log health summary to monitoring
   */
  logHealthSummary(): void {
    const summary = this.getHealthSummary();
    
    if (summary.totalFailures > 0) {
      this.monitoring.trackEvent('service-init.health-summary', {
        totalFailures: summary.totalFailures,
        criticalFailures: summary.criticalFailures,
        optionalFailures: summary.optionalFailures,
        enhancementFailures: summary.enhancementFailures,
        services: summary.services.join(','),
        environment: process.env.NODE_ENV,
      });

      // Log critical failures separately
      if (summary.criticalFailures > 0) {
        const criticalServices = this.getFailuresByCriticality('critical').map(f => f.serviceName);
        this.monitoring.trackEvent('service-init.critical-failures', {
          count: summary.criticalFailures,
          services: criticalServices.join(','),
          environment: process.env.NODE_ENV,
        });
      }
    }
  }
}

/**
 * Helper function to extract error code from error
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.name) {
      return error.name;
    }
    // Check for error codes in message
    const codeMatch = error.message.match(/\[([A-Z_]+)\]/);
    if (codeMatch) {
      return codeMatch[1];
    }
  }
  return undefined;
}

/**
 * Helper function to extract dependencies from error message or context
 */
export function extractDependencies(error: unknown, context?: Record<string, any>): string[] {
  const dependencies: string[] = [];

  // Extract from context if provided
  if (context?.dependencies && Array.isArray(context.dependencies)) {
    dependencies.push(...context.dependencies);
  }

  // Try to extract from error message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const commonDeps = ['cosmos', 'redis', 'database', 'cache', 'vector', 'ai', 'monitoring'];
    for (const dep of commonDeps) {
      if (message.includes(dep)) {
        dependencies.push(dep);
      }
    }
  }

  return Array.from(new Set(dependencies)); // Remove duplicates
}
