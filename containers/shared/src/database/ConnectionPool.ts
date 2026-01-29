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
 * Service connection tracking
 */
interface ServiceConnection {
  serviceName: string;
  connectionCount: number;
  lastUsed: Date;
}

/**
 * Connection Pool Manager
 * Tracks connections per service and enforces limits
 */
export class ConnectionPool {
  private static instance: ConnectionPool | null = null;
  private config: ConnectionPoolConfig;
  private serviceConnections: Map<string, ServiceConnection> = new Map();
  private totalConnections: number = 0;

  private constructor(config: ConnectionPoolConfig = {}) {
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
  static getInstance(config?: ConnectionPoolConfig): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool(config);
    }
    return ConnectionPool.instance;
  }

  /**
   * Register a service connection
   */
  registerService(serviceName: string): boolean {
    const serviceConn = this.serviceConnections.get(serviceName) || {
      serviceName,
      connectionCount: 0,
      lastUsed: new Date(),
    };

    // Check per-service limit
    if (serviceConn.connectionCount >= this.config.perServiceLimit!) {
      return false;
    }

    // Check global limit
    if (this.totalConnections >= this.config.maxConnections!) {
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
  unregisterService(serviceName: string): void {
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
  getStats(): {
    totalConnections: number;
    maxConnections: number;
    services: Array<{ serviceName: string; connections: number }>;
  } {
    return {
      totalConnections: this.totalConnections,
      maxConnections: this.config.maxConnections!,
      services: Array.from(this.serviceConnections.values()).map((sc) => ({
        serviceName: sc.serviceName,
        connections: sc.connectionCount,
      })),
    };
  }

  /**
   * Cleanup idle connections
   */
  cleanupIdleConnections(): void {
    const now = new Date();
    const idleTimeout = this.config.idleTimeout!;

    for (const [serviceName, serviceConn] of this.serviceConnections.entries()) {
      const idleTime = now.getTime() - serviceConn.lastUsed.getTime();
      if (idleTime > idleTimeout && serviceConn.connectionCount > 0) {
        this.unregisterService(serviceName);
      }
    }
  }
}

