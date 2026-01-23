/**
 * Service Registry Service
 * Phase 4.1: Service Initialization Refactoring
 * 
 * Centralized service registry for tracking service lifecycle, dependencies,
 * health status, and availability.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ServiceStatus,
  ServiceHealth,
  ServiceMetadata,
  ServiceCategory,
  RegisteredService,
  ServiceRegistryConfig,
} from '../types/service-registry.types.js';

/**
 * Default registry configuration
 */
const DEFAULT_CONFIG: ServiceRegistryConfig = {
  failFastOnRequired: true,
  validateDependencies: true,
  enableHealthChecks: true,
  healthCheckInterval: 60000, // 1 minute
};

export class ServiceRegistryService {
  private services: Map<string, RegisteredService> = new Map();
  private config: ServiceRegistryConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    private monitoring: IMonitoringProvider,
    config?: Partial<ServiceRegistryConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Phase 4.1: Register a service with metadata
   */
  register(
    name: string,
    instance: unknown,
    metadata: ServiceMetadata
  ): void {
    // Validate dependencies if enabled
    if (this.config.validateDependencies) {
      const missingDependencies = this.validateDependencies(metadata.dependencies);
      if (missingDependencies.length > 0 && metadata.required) {
        throw new Error(
          `Required service ${name} has missing dependencies: ${missingDependencies.join(', ')}`
        );
      }
    }

    const registeredService: RegisteredService = {
      metadata,
      instance,
      status: ServiceStatus.REGISTERING,
      health: {
        status: ServiceStatus.REGISTERING,
        healthy: false,
        lastChecked: new Date(),
      },
      registeredAt: new Date(),
    };

    this.services.set(name, registeredService);

    this.monitoring.trackEvent('service-registry.registered', {
      serviceName: name,
      category: metadata.category,
      required: metadata.required,
      dependencies: metadata.dependencies.length,
    });

    // Update status to registered
    registeredService.status = ServiceStatus.REGISTERED;
    registeredService.health.status = ServiceStatus.REGISTERED;
  }

  /**
   * Phase 4.1: Mark service as initialized
   */
  markInitialized(name: string): void {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in registry`);
    }

    service.status = ServiceStatus.INITIALIZED;
    service.initializedAt = new Date();
    service.health.status = ServiceStatus.INITIALIZED;
    service.health.healthy = true;
    service.health.lastChecked = new Date();

    this.monitoring.trackEvent('service-registry.initialized', {
      serviceName: name,
    });
  }

  /**
   * Phase 4.1: Mark service as failed
   */
  markFailed(name: string, error: Error): void {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in registry`);
    }

    service.status = ServiceStatus.FAILED;
    service.error = error;
    service.health.status = ServiceStatus.FAILED;
    service.health.healthy = false;
    service.health.message = error.message;
    service.health.lastChecked = new Date();

    this.monitoring.trackEvent('service-registry.failed', {
      serviceName: name,
      error: error.message,
      required: service.metadata.required,
    });

    // Fail fast if required service failed
    if (this.config.failFastOnRequired && service.metadata.required) {
      throw new Error(
        `Required service ${name} failed to initialize: ${error.message}`
      );
    }
  }

  /**
   * Phase 4.1: Get service instance
   */
  get<T = unknown>(name: string): T | null {
    const service = this.services.get(name);
    if (!service) {
      return null;
    }

    if (service.status === ServiceStatus.FAILED) {
      return null;
    }

    return service.instance as T;
  }

  /**
   * Phase 4.1: Check if service is available
   */
  isAvailable(name: string): boolean {
    const service = this.services.get(name);
    if (!service) {
      return false;
    }

    return (
      service.status === ServiceStatus.INITIALIZED ||
      service.status === ServiceStatus.HEALTHY
    );
  }

  /**
   * Phase 4.1: Get service health
   */
  getHealth(name: string): ServiceHealth | null {
    const service = this.services.get(name);
    if (!service) {
      return null;
    }

    return service.health;
  }

  /**
   * Phase 4.1: Get all services by category
   */
  getByCategory(category: ServiceCategory): RegisteredService[] {
    return Array.from(this.services.values()).filter(
      (service) => service.metadata.category === category
    );
  }

  /**
   * Phase 4.1: Get all required services
   */
  getRequiredServices(): RegisteredService[] {
    return Array.from(this.services.values()).filter(
      (service) => service.metadata.required
    );
  }

  /**
   * Phase 4.1: Get all failed services
   */
  getFailedServices(): RegisteredService[] {
    return Array.from(this.services.values()).filter(
      (service) => service.status === ServiceStatus.FAILED
    );
  }

  /**
   * Phase 4.1: Get system health summary
   */
  getSystemHealth(): {
    total: number;
    healthy: number;
    unhealthy: number;
    failed: number;
    requiredHealthy: number;
    requiredTotal: number;
    services: Array<{ name: string; status: ServiceStatus; healthy: boolean }>;
  } {
    const services = Array.from(this.services.values());
    const required = services.filter((s) => s.metadata.required);

    return {
      total: services.length,
      healthy: services.filter((s) => s.health.healthy).length,
      unhealthy: services.filter((s) => !s.health.healthy && s.status !== ServiceStatus.FAILED).length,
      failed: services.filter((s) => s.status === ServiceStatus.FAILED).length,
      requiredHealthy: required.filter((s) => s.health.healthy).length,
      requiredTotal: required.length,
      services: services.map((s) => ({
        name: s.metadata.name,
        status: s.status,
        healthy: s.health.healthy,
      })),
    };
  }

  /**
   * Phase 4.1: Validate dependencies
   */
  private validateDependencies(dependencies: string[]): string[] {
    const missing: string[] = [];

    for (const dep of dependencies) {
      const service = this.services.get(dep);
      if (!service || !this.isAvailable(dep)) {
        missing.push(dep);
      }
    }

    return missing;
  }

  /**
   * Phase 4.1: Start health check monitoring
   */
  startHealthChecks(): void {
    if (!this.config.enableHealthChecks) {
      return;
    }

    if (this.healthCheckInterval) {
      return; // Already started
    }

    // Perform initial health check
    this.performHealthChecks();

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    this.monitoring.trackEvent('service-registry.health-checks-started', {
      interval: this.config.healthCheckInterval,
    });
  }

  /**
   * Phase 4.1: Stop health check monitoring
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.monitoring.trackEvent('service-registry.health-checks-stopped', {});
    }
  }

  /**
   * Phase 4.1: Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const services = Array.from(this.services.values());

    for (const service of services) {
      if (service.metadata.healthCheck) {
        try {
          const health = await Promise.resolve(service.metadata.healthCheck());
          service.health = health;
          service.status = health.healthy ? ServiceStatus.HEALTHY : ServiceStatus.UNHEALTHY;
        } catch (error) {
          service.health = {
            status: ServiceStatus.UNHEALTHY,
            healthy: false,
            lastChecked: new Date(),
            message: (error as Error).message,
          };
          service.status = ServiceStatus.UNHEALTHY;
        }
      }
    }
  }

  /**
   * Phase 4.1: Get initialization order based on phases and dependencies
   */
  getInitializationOrder(): string[] {
    const services = Array.from(this.services.values());
    
    // Sort by initialization phase
    const sorted = services.sort((a, b) => 
      a.metadata.initializationPhase - b.metadata.initializationPhase
    );

    // Phase 4.1: Services are returned by phase order
    // Future enhancement: Add dependency resolution for services in the same phase
    
    return sorted.map((s) => s.metadata.name);
  }

  /**
   * Phase 4.1: Validate all required services are initialized
   */
  validateRequiredServices(): { valid: boolean; missing: string[] } {
    const required = this.getRequiredServices();
    const missing = required
      .filter((s) => !this.isAvailable(s.metadata.name))
      .map((s) => s.metadata.name);

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Phase 4.1: Shutdown all services
   */
  async shutdown(): Promise<void> {
    this.stopHealthChecks();

    const services = Array.from(this.services.values());
    
    for (const service of services) {
      if (service.metadata.lifecycle?.onShutdown) {
        try {
          await Promise.resolve(service.metadata.lifecycle.onShutdown());
        } catch (error) {
          this.monitoring.trackException(error as Error, {
            operation: 'service-registry.shutdown',
            serviceName: service.metadata.name,
          });
        }
      }
    }

    this.monitoring.trackEvent('service-registry.shutdown', {
      totalServices: services.length,
    });
  }
}
