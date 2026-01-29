/**
 * Service Registry
 * Service discovery and registration
 * @module @coder/shared/services
 */
/**
 * Service Registry
 * Simple in-memory service registry (can be extended with Redis/Consul)
 */
export class ServiceRegistry {
    static instance = null;
    services = new Map();
    constructor() { }
    /**
     * Get or create singleton instance
     */
    static getInstance() {
        if (!ServiceRegistry.instance) {
            ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
    }
    /**
     * Register a service
     */
    register(service) {
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
    unregister(serviceId) {
        this.services.delete(serviceId);
    }
    /**
     * Update heartbeat
     */
    heartbeat(serviceId) {
        const service = this.services.get(serviceId);
        if (service) {
            service.lastHeartbeat = new Date();
        }
    }
    /**
     * Get service by ID
     */
    getService(serviceId) {
        return this.services.get(serviceId);
    }
    /**
     * Get service by name
     */
    getServiceByName(serviceName) {
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
    getAllServices() {
        return Array.from(this.services.values());
    }
    /**
     * Get services by name pattern
     */
    getServicesByPattern(pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return Array.from(this.services.values()).filter(service => regex.test(service.serviceName));
    }
    /**
     * Cleanup stale services (not heartbeated in timeout period)
     */
    cleanupStaleServices(timeoutMs = 60000) {
        const now = Date.now();
        for (const [serviceId, service] of this.services.entries()) {
            const timeSinceHeartbeat = now - service.lastHeartbeat.getTime();
            if (timeSinceHeartbeat > timeoutMs) {
                this.services.delete(serviceId);
            }
        }
    }
}
//# sourceMappingURL=ServiceRegistry.js.map