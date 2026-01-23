/**
 * Service Registry Initialization Framework
 * Provides dependency injection and service lifecycle management
 */

import type { FastifyInstance } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';

export interface ServiceInitializationOptions {
  required?: boolean;
  onError?: 'throw' | 'warn' | 'ignore';
  retry?: boolean;
  timeout?: number;
}

export interface ServiceMetadata {
  name: string;
  category: string;
  required: boolean;
  dependencies: string[];
  optionalDependencies: string[];
  initializationPhase: number;
  description?: string;
}

/**
 * Service Registry for managing service initialization
 */
export class ServiceInitializationRegistry {
  private services = new Map<string, { service: any; metadata: ServiceMetadata }>();
  private initializationOrder: string[] = [];

  constructor(private monitoring: IMonitoringProvider) {}

  /**
   * Register a service with metadata
   */
  register(
    name: string,
    service: any,
    metadata: ServiceMetadata
  ): void {
    this.services.set(name, { service, metadata });
    this.updateInitializationOrder();
  }

  /**
   * Get a registered service
   */
  get<T = any>(name: string): T | undefined {
    return this.services.get(name)?.service as T | undefined;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get initialization order based on dependencies
   */
  getInitializationOrder(): string[] {
    return [...this.initializationOrder];
  }

  /**
   * Update initialization order based on dependencies
   */
  private updateInitializationOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (name: string) => {
      if (visiting.has(name)) {
        // Circular dependency detected
        this.monitoring.trackEvent('service-registry.circular-dependency', { service: name });
        return;
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      const service = this.services.get(name);
      if (service) {
        // Visit dependencies first
        for (const dep of service.metadata.dependencies) {
          if (this.services.has(dep)) {
            visit(dep);
          }
        }
      }
      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    // Visit all services
    for (const name of this.services.keys()) {
      if (!visited.has(name)) {
        visit(name);
      }
    }

    // Sort by initialization phase
    this.initializationOrder = order.sort((a, b) => {
      const aMeta = this.services.get(a)?.metadata;
      const bMeta = this.services.get(b)?.metadata;
      if (!aMeta || !bMeta) return 0;
      if (aMeta.initializationPhase !== bMeta.initializationPhase) {
        return aMeta.initializationPhase - bMeta.initializationPhase;
      }
      return order.indexOf(a) - order.indexOf(b);
    });
  }

  /**
   * Initialize all services in dependency order
   */
  async initializeAll(server: FastifyInstance): Promise<void> {
    for (const name of this.initializationOrder) {
      const service = this.services.get(name);
      if (!service) continue;

      try {
        // Check dependencies
        const missingDeps = service.metadata.dependencies.filter(
          dep => !this.services.has(dep)
        );

        if (missingDeps.length > 0 && service.metadata.required) {
          throw new Error(`Missing required dependencies for ${name}: ${missingDeps.join(', ')}`);
        }

        // Service is already initialized (registered)
        this.monitoring.trackEvent('service-registry.initialized', {
          service: name,
          phase: service.metadata.initializationPhase,
        });
      } catch (error) {
        if (service.metadata.required) {
          throw error;
        }
        this.monitoring.trackException(error as Error, {
          operation: 'service-registry.initialize',
          service: name,
        });
      }
    }
  }
}
