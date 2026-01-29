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
export declare class ServiceRegistry {
    private static instance;
    private services;
    private constructor();
    /**
     * Get or create singleton instance
     */
    static getInstance(): ServiceRegistry;
    /**
     * Register a service
     */
    register(service: Omit<ServiceInfo, 'registeredAt' | 'lastHeartbeat'>): void;
    /**
     * Unregister a service
     */
    unregister(serviceId: string): void;
    /**
     * Update heartbeat
     */
    heartbeat(serviceId: string): void;
    /**
     * Get service by ID
     */
    getService(serviceId: string): ServiceInfo | undefined;
    /**
     * Get service by name
     */
    getServiceByName(serviceName: string): ServiceInfo | undefined;
    /**
     * Get all services
     */
    getAllServices(): ServiceInfo[];
    /**
     * Get services by name pattern
     */
    getServicesByPattern(pattern: string): ServiceInfo[];
    /**
     * Cleanup stale services (not heartbeated in timeout period)
     */
    cleanupStaleServices(timeoutMs?: number): void;
}
//# sourceMappingURL=ServiceRegistry.d.ts.map