/**
 * Redis Client
 * Singleton Redis client with connection pooling
 * @module @coder/shared/cache
 */
import Redis from 'ioredis';
/**
 * Redis configuration
 */
export interface RedisConfig {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    db?: number;
    keyPrefix?: string;
    tls?: boolean;
    url?: string;
    maxRetriesPerRequest?: number;
    connectTimeout?: number;
    retryStrategy?: (times: number) => number | null | void;
    enableReadyCheck?: boolean;
    enableOfflineQueue?: boolean;
    commandTimeout?: number;
    lazyConnect?: boolean;
}
/**
 * Redis Client Manager
 * Singleton pattern with connection pooling
 */
export declare class RedisClient {
    private static instance;
    private client;
    private config;
    private isConnected;
    private connecting;
    private constructor();
    /**
     * Get or create singleton instance
     */
    static getInstance(config?: RedisConfig): RedisClient;
    /**
     * Get or create Redis client
     */
    getClient(): Promise<Redis>;
    /**
     * Connect to Redis
     */
    private connect;
    /**
     * Disconnect from Redis
     */
    disconnect(): Promise<void>;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Check if connected
     */
    isReady(): boolean;
}
//# sourceMappingURL=RedisClient.d.ts.map