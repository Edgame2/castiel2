/**
 * Redis Connection Pool Manager
 * 
 * Manages a shared pool of Redis connections for BullMQ workers and queues
 * to reduce connection overhead and improve resource utilization
 */

import { Redis, Cluster } from 'ioredis';
import type { RedisConfig } from './redis.js';
import { createRedisConnection } from './redis.js';

export interface RedisPoolConfig {
  /**
   * Maximum number of connections in the pool
   * Default: 20
   */
  maxConnections?: number;
  
  /**
   * Redis connection configuration
   */
  redisConfig?: RedisConfig;
}

/**
 * Redis Connection Pool Manager
 * 
 * Manages a shared pool of Redis connections for BullMQ
 */
export class RedisConnectionPool {
  private connections: Array<Redis | Cluster> = [];
  private availableConnections: Array<Redis | Cluster> = [];
  private maxConnections: number;
  private redisConfig?: RedisConfig;
  private connectionCount: number = 0;

  constructor(config: RedisPoolConfig = {}) {
    this.maxConnections = config.maxConnections || 20;
    this.redisConfig = config.redisConfig;
  }

  /**
   * Get a Redis connection from the pool
   * Creates a new connection if pool is not full, otherwise reuses existing
   */
  getConnection(): Redis | Cluster {
    // If we have available connections, reuse one
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop()!;
      return connection;
    }

    // If we haven't reached max connections, create a new one
    if (this.connectionCount < this.maxConnections) {
      const connection = this.redisConfig
        ? createRedisConnection(this.redisConfig)
        : createRedisConnection();
      
      this.connections.push(connection);
      this.connectionCount++;
      
      return connection;
    }

    // Pool is full, reuse the least recently used connection
    // In practice, BullMQ connections are long-lived, so we'll just reuse
    // For now, return the first connection (round-robin would be better)
    const connection = this.connections[this.connectionCount % this.connections.length];
    return connection;
  }

  /**
   * Return a connection to the pool (for future use)
   * Note: BullMQ connections are typically long-lived, so this is mainly
   * for cleanup scenarios
   */
  returnConnection(connection: Redis | Cluster): void {
    if (this.connections.includes(connection) && !this.availableConnections.includes(connection)) {
      this.availableConnections.push(connection);
    }
  }

  /**
   * Close all connections in the pool
   */
  async closeAll(): Promise<void> {
    const closePromises = this.connections.map(conn => {
      if ('disconnect' in conn) {
        return conn.disconnect();
      }
      return Promise.resolve();
    });
    
    await Promise.all(closePromises);
    this.connections = [];
    this.availableConnections = [];
    this.connectionCount = 0;
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    availableConnections: number;
    maxConnections: number;
  } {
    return {
      totalConnections: this.connectionCount,
      availableConnections: this.availableConnections.length,
      maxConnections: this.maxConnections,
    };
  }
}

/**
 * Global Redis connection pool instance
 * Can be initialized once and shared across all workers
 */
let globalPool: RedisConnectionPool | null = null;

/**
 * Get or create the global Redis connection pool
 */
export function getGlobalRedisPool(config?: RedisPoolConfig): RedisConnectionPool {
  if (!globalPool) {
    globalPool = new RedisConnectionPool(config);
  }
  return globalPool;
}

/**
 * Initialize the global Redis connection pool
 */
export function initializeGlobalRedisPool(config?: RedisPoolConfig): RedisConnectionPool {
  if (globalPool) {
    throw new Error('Global Redis pool already initialized');
  }
  globalPool = new RedisConnectionPool(config);
  return globalPool;
}

/**
 * Close the global Redis connection pool
 */
export async function closeGlobalRedisPool(): Promise<void> {
  if (globalPool) {
    await globalPool.closeAll();
    globalPool = null;
  }
}
