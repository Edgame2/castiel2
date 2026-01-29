/**
 * Connection Pool Manager
 * Manages connection pooling and per-service limits
 * @module @coder/shared/database
 */
/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
    maxConnections?: number;
    perServiceLimit?: number;
    idleTimeout?: number;
    connectionTimeout?: number;
}
/**
 * Connection Pool Manager
 * Tracks connections per service and enforces limits
 */
export declare class ConnectionPool {
    private static instance;
    private config;
    private serviceConnections;
    private totalConnections;
    private constructor();
    /**
     * Get or create singleton instance
     */
    static getInstance(config?: ConnectionPoolConfig): ConnectionPool;
    /**
     * Register a service connection
     */
    registerService(serviceName: string): boolean;
    /**
     * Unregister a service connection
     */
    unregisterService(serviceName: string): void;
    /**
     * Get connection stats
     */
    getStats(): {
        totalConnections: number;
        maxConnections: number;
        services: Array<{
            serviceName: string;
            connections: number;
        }>;
    };
    /**
     * Cleanup idle connections
     */
    cleanupIdleConnections(): void;
}
//# sourceMappingURL=ConnectionPool.d.ts.map