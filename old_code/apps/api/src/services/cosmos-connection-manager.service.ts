/**
 * Cosmos DB Connection Manager Service
 * 
 * Manages and optimizes Cosmos DB connection pool settings for production.
 * Azure Cosmos DB Node.js SDK uses HTTP connections with internal connection management.
 * This service provides optimized connection policies and monitoring.
 */

import { CosmosClient, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';

export interface CosmosConnectionConfig {
  endpoint: string;
  key: string;
  connectionMode?: 'Direct' | 'Gateway';
  requestTimeout?: number; // milliseconds
  enableEndpointDiscovery?: boolean;
  maxRetryAttempts?: number;
  maxRetryWaitTime?: number; // milliseconds
  retryAfterInMilliseconds?: number;
}

export interface CosmosConnectionStats {
  activeConnections: number;
  idleConnections: number;
  totalRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

/**
 * Cosmos DB Connection Manager Service
 * Provides optimized connection policies and connection pooling management
 */
export class CosmosConnectionManagerService {
  private clients: Map<string, CosmosClient> = new Map();
  private connectionStats: Map<string, CosmosConnectionStats> = new Map();
  private monitoring: IMonitoringProvider;

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
  }

  /**
   * Create optimized CosmosClient with production-ready connection settings
   */
  createClient(
    name: string,
    config: CosmosConnectionConfig
  ): CosmosClient {
    // Check if client already exists
    if (this.clients.has(name)) {
      return this.clients.get(name)!;
    }

    // Create optimized connection policy
    const connectionPolicy: ConnectionPolicy = {
      // Use Direct mode for better performance (default)
      // Direct mode: TCP connections directly to backend partitions
      // Gateway mode: HTTP connections through gateway (more compatible)
      connectionMode: (config.connectionMode as any) || ('Direct' as any),
      
      // Request timeout: 30 seconds (default is 10 seconds)
      // Increase for complex queries or high latency scenarios
      requestTimeout: config.requestTimeout || 30000,
      
      // Enable endpoint discovery for multi-region accounts
      enableEndpointDiscovery: config.enableEndpointDiscovery !== false,
      
      // Retry options for transient failures
      retryOptions: {
        maxRetryAttemptCount: config.maxRetryAttempts || 9, // Default is 9
        fixedRetryIntervalInMilliseconds: config.retryAfterInMilliseconds || 0, // 0 = exponential backoff
        maxWaitTimeInSeconds: (config.maxRetryWaitTime || 30000) / 1000, // 30 seconds
      } as RetryOptions,
    };

    // Create client with optimized settings
    const client = new CosmosClient({
      endpoint: config.endpoint,
      key: config.key,
      connectionPolicy,
    });

    // Store client
    this.clients.set(name, client);

    // Initialize stats
    this.connectionStats.set(name, {
      activeConnections: 0,
      idleConnections: 0,
      totalRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      lastHealthCheck: new Date(),
      isHealthy: true,
    });

    this.monitoring.trackEvent('cosmos-connection.created', {
      name,
      connectionMode: connectionPolicy.connectionMode,
      requestTimeout: connectionPolicy.requestTimeout,
    });

    return client;
  }

  /**
   * Get existing client by name
   */
  getClient(name: string): CosmosClient | undefined {
    return this.clients.get(name);
  }

  /**
   * Record connection usage statistics
   */
  recordRequest(
    name: string,
    success: boolean,
    latencyMs: number
  ): void {
    const stats = this.connectionStats.get(name);
    if (!stats) {return;}

    stats.totalRequests++;
    if (!success) {
      stats.failedRequests++;
    }

    // Update average latency (exponential moving average)
    stats.averageLatency = stats.averageLatency
      ? (stats.averageLatency * 0.9 + latencyMs * 0.1)
      : latencyMs;

    // Track metrics
    this.monitoring.trackMetric('cosmos-connection.request', 1, {
      name,
      success: success.toString(),
    });

    this.monitoring.trackMetric('cosmos-connection.latency', latencyMs, {
      name,
    });

    if (!success) {
      this.monitoring.trackMetric('cosmos-connection.failure', 1, {
        name,
      });
    }
  }

  /**
   * Get connection statistics for a client
   */
  getStats(name: string): CosmosConnectionStats | undefined {
    return this.connectionStats.get(name);
  }

  /**
   * Get all connection statistics
   */
  getAllStats(): Map<string, CosmosConnectionStats> {
    return new Map(this.connectionStats);
  }

  /**
   * Perform health check on a client
   */
  async healthCheck(name: string): Promise<boolean> {
    const client = this.clients.get(name);
    if (!client) {
      return false;
    }

    const stats = this.connectionStats.get(name);
    if (!stats) {
      return false;
    }

    try {
      const startTime = Date.now();
      // Perform lightweight health check (read database metadata)
      await client.getDatabaseAccount();
      const latency = Date.now() - startTime;

      stats.lastHealthCheck = new Date();
      stats.isHealthy = true;

      this.recordRequest(name, true, latency);

      this.monitoring.trackMetric('cosmos-connection.health-check', latency, {
        name,
        healthy: 'true',
      });

      return true;
    } catch (error) {
      stats.lastHealthCheck = new Date();
      stats.isHealthy = false;

      this.recordRequest(name, false, 0);

      this.monitoring.trackException(error as Error, {
        component: 'CosmosConnectionManagerService',
        operation: 'healthCheck',
        name,
      });

      return false;
    }
  }

  /**
   * Perform health check on all clients
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const name of this.clients.keys()) {
      const healthy = await this.healthCheck(name);
      results.set(name, healthy);
    }

    return results;
  }

  /**
   * Get connection pool recommendations based on current usage
   */
  getRecommendations(name: string): string[] {
    const stats = this.connectionStats.get(name);
    if (!stats) {
      return ['No statistics available'];
    }

    const recommendations: string[] = [];

    // Check failure rate
    const failureRate = stats.totalRequests > 0
      ? (stats.failedRequests / stats.totalRequests) * 100
      : 0;

    if (failureRate > 5) {
      recommendations.push(
        `High failure rate (${failureRate.toFixed(1)}%). Consider increasing retry attempts or checking network connectivity.`
      );
    }

    // Check average latency
    if (stats.averageLatency > 1000) {
      recommendations.push(
        `High average latency (${stats.averageLatency.toFixed(0)}ms). Consider optimizing queries or increasing request timeout.`
      );
    }

    // Check health status
    if (!stats.isHealthy) {
      recommendations.push(
        'Connection is unhealthy. Check endpoint and credentials.'
      );
    }

    // Check last health check age
    const healthCheckAge = Date.now() - stats.lastHealthCheck.getTime();
    if (healthCheckAge > 5 * 60 * 1000) {
      recommendations.push(
        'Health check is stale. Consider running periodic health checks.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Connection pool is healthy and optimized.');
    }

    return recommendations;
  }

  /**
   * Close a client connection
   */
  async closeClient(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      // CosmosClient doesn't have an explicit close method in the SDK
      // Connections are managed internally and will be cleaned up automatically
      this.clients.delete(name);
      this.connectionStats.delete(name);

      this.monitoring.trackEvent('cosmos-connection.closed', { name });
    }
  }

  /**
   * Close all client connections
   */
  async closeAll(): Promise<void> {
    const names = Array.from(this.clients.keys());
    for (const name of names) {
      await this.closeClient(name);
    }
  }

  /**
   * Get summary of all connections
   */
  getSummary(): {
    totalClients: number;
    healthyClients: number;
    totalRequests: number;
    totalFailures: number;
    averageLatency: number;
  } {
    let totalRequests = 0;
    let totalFailures = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let healthyCount = 0;

    for (const stats of this.connectionStats.values()) {
      totalRequests += stats.totalRequests;
      totalFailures += stats.failedRequests;
      if (stats.averageLatency > 0) {
        totalLatency += stats.averageLatency;
        latencyCount++;
      }
      if (stats.isHealthy) {
        healthyCount++;
      }
    }

    return {
      totalClients: this.clients.size,
      healthyClients: healthyCount,
      totalRequests,
      totalFailures,
      averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
    };
  }
}

/**
 * Default connection configuration for production
 */
export const DEFAULT_COSMOS_CONNECTION_CONFIG: Partial<CosmosConnectionConfig> = {
  connectionMode: 'Direct', // Best performance
  requestTimeout: 30000, // 30 seconds
  enableEndpointDiscovery: true, // For multi-region
  maxRetryAttempts: 9, // Default SDK value
  maxRetryWaitTime: 30000, // 30 seconds
  retryAfterInMilliseconds: 0, // Use exponential backoff
};








