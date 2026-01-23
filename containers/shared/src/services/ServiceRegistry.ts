/**
 * Service Registry
 * Service discovery and registration
 * @module @coder/shared/services
 */

/**
 * Service information
 */
export interface ServiceInfo {
  serviceId: string;
  serviceName: string;
  url: string;
  version: string;
  healthCheckUrl?: string;
  metadata?: Record<string, any>;
  registeredAt: Date;
  lastHeartbeat: Date;
}

/**
 * Service Registry
 * Simple in-memory service registry (can be extended with Redis/Consul)
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;
  private services: Map<string, ServiceInfo> = new Map();

  private constructor() {}

  /**
   * Get or create singleton instance
   */
  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a service
   */
  register(service: Omit<ServiceInfo, 'registeredAt' | 'lastHeartbeat'>): void {
    const now = new Date();
    this.services.set(service.serviceId, {
      ...service,
      registeredAt: now,
      lastHeartbeat: now,
    });
  }

  /**
   * Unregister a service
   */
  unregister(serviceId: string): void {
    this.services.delete(serviceId);
  }

  /**
   * Update heartbeat
   */
  heartbeat(serviceId: string): void {
    const service = this.services.get(serviceId);
    if (service) {
      service.lastHeartbeat = new Date();
    }
  }

  /**
   * Get service by ID
   */
  getService(serviceId: string): ServiceInfo | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Get service by name
   */
  getServiceByName(serviceName: string): ServiceInfo | undefined {
    for (const service of this.services.values()) {
      if (service.serviceName === serviceName) {
        return service;
      }
    }
    return undefined;
  }

  /**
   * Get all services
   */
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * Get services by name pattern
   */
  getServicesByPattern(pattern: string): ServiceInfo[] {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.services.values()).filter(service =>
      regex.test(service.serviceName)
    );
  }

  /**
   * Cleanup stale services (not heartbeated in timeout period)
   */
  cleanupStaleServices(timeoutMs: number = 60000): void {
    const now = Date.now();
    for (const [serviceId, service] of this.services.entries()) {
      const timeSinceHeartbeat = now - service.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > timeoutMs) {
        this.services.delete(serviceId);
      }
    }
  }
}

