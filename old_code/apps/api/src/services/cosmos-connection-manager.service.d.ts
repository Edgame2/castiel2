/**
 * Cosmos DB Connection Manager Service
 *
 * Manages and optimizes Cosmos DB connection pool settings for production.
 * Azure Cosmos DB Node.js SDK uses HTTP connections with internal connection management.
 * This service provides optimized connection policies and monitoring.
 */
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
export interface CosmosConnectionConfig {
    endpoint: string;
    key: string;
    connectionMode?: 'Direct' | 'Gateway';
    requestTimeout?: number;
    enableEndpointDiscovery?: boolean;
    maxRetryAttempts?: number;
    maxRetryWaitTime?: number;
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
export declare class CosmosConnectionManagerService {
    private clients;
    private connectionStats;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Create optimized CosmosClient with production-ready connection settings
     */
    createClient(name: string, config: CosmosConnectionConfig): CosmosClient;
    /**
     * Get existing client by name
     */
    getClient(name: string): CosmosClient | undefined;
    /**
     * Record connection usage statistics
     */
    recordRequest(name: string, success: boolean, latencyMs: number): void;
    /**
     * Get connection statistics for a client
     */
    getStats(name: string): CosmosConnectionStats | undefined;
    /**
     * Get all connection statistics
     */
    getAllStats(): Map<string, CosmosConnectionStats>;
    /**
     * Perform health check on a client
     */
    healthCheck(name: string): Promise<boolean>;
    /**
     * Perform health check on all clients
     */
    healthCheckAll(): Promise<Map<string, boolean>>;
    /**
     * Get connection pool recommendations based on current usage
     */
    getRecommendations(name: string): string[];
    /**
     * Close a client connection
     */
    closeClient(name: string): Promise<void>;
    /**
     * Close all client connections
     */
    closeAll(): Promise<void>;
    /**
     * Get summary of all connections
     */
    getSummary(): {
        totalClients: number;
        healthyClients: number;
        totalRequests: number;
        totalFailures: number;
        averageLatency: number;
    };
}
/**
 * Default connection configuration for production
 */
export declare const DEFAULT_COSMOS_CONNECTION_CONFIG: Partial<CosmosConnectionConfig>;
//# sourceMappingURL=cosmos-connection-manager.service.d.ts.map