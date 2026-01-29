/**
 * Connection Pool Manager
 * Manages connection pooling and per-service limits
 * @module @coder/shared/database
 */
/**
 * Connection Pool Manager
 * Tracks connections per service and enforces limits
 */
export class ConnectionPool {
    static instance = null;
    config;
    serviceConnections = new Map();
    totalConnections = 0;
    constructor(config = {}) {
        this.config = {
            maxConnections: config.maxConnections || 50,
            perServiceLimit: config.perServiceLimit || 10,
            idleTimeout: config.idleTimeout || 30000,
            connectionTimeout: config.connectionTimeout || 5000,
        };
    }
    /**
     * Get or create singleton instance
     */
    static getInstance(config) {
        if (!ConnectionPool.instance) {
            ConnectionPool.instance = new ConnectionPool(config);
        }
        return ConnectionPool.instance;
    }
    /**
     * Register a service connection
     */
    registerService(serviceName) {
        const serviceConn = this.serviceConnections.get(serviceName) || {
            serviceName,
            connectionCount: 0,
            lastUsed: new Date(),
        };
        // Check per-service limit
        if (serviceConn.connectionCount >= this.config.perServiceLimit) {
            return false;
        }
        // Check global limit
        if (this.totalConnections >= this.config.maxConnections) {
            return false;
        }
        serviceConn.connectionCount++;
        serviceConn.lastUsed = new Date();
        this.serviceConnections.set(serviceName, serviceConn);
        this.totalConnections++;
        return true;
    }
    /**
     * Unregister a service connection
     */
    unregisterService(serviceName) {
        const serviceConn = this.serviceConnections.get(serviceName);
        if (serviceConn && serviceConn.connectionCount > 0) {
            serviceConn.connectionCount--;
            this.totalConnections--;
            if (serviceConn.connectionCount === 0) {
                this.serviceConnections.delete(serviceName);
            }
        }
    }
    /**
     * Get connection stats
     */
    getStats() {
        return {
            totalConnections: this.totalConnections,
            maxConnections: this.config.maxConnections,
            services: Array.from(this.serviceConnections.values()).map((sc) => ({
                serviceName: sc.serviceName,
                connections: sc.connectionCount,
            })),
        };
    }
    /**
     * Cleanup idle connections
     */
    cleanupIdleConnections() {
        const now = new Date();
        const idleTimeout = this.config.idleTimeout;
        for (const [serviceName, serviceConn] of this.serviceConnections.entries()) {
            const idleTime = now.getTime() - serviceConn.lastUsed.getTime();
            if (idleTime > idleTimeout && serviceConn.connectionCount > 0) {
                this.unregisterService(serviceName);
            }
        }
    }
}
//# sourceMappingURL=ConnectionPool.js.map