import { Redis } from 'ioredis';
export interface RedisConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls: boolean;
    db: number;
    maxRetriesPerRequest?: number;
    connectTimeout?: number;
    retryStrategy?: (times: number) => number | void;
}
/**
 * Redis Connection Manager
 * Handles Redis connection with retry logic and health monitoring
 */
export declare class RedisConnectionManager {
    private client;
    private config;
    private isConnected;
    private reconnectAttempts;
    constructor(config: RedisConfig);
    /**
     * Get or create Redis client
     */
    getClient(): Promise<Redis>;
    /**
     * Connect to Redis
     */
    private connect;
    /**
     * Setup Redis event handlers
     */
    private setupEventHandlers;
    /**
     * Check if Redis is connected
     */
    isReady(): boolean;
    /**
     * Ping Redis to check connection
     */
    ping(): Promise<boolean>;
    /**
     * Get connection info
     */
    getInfo(): Promise<{
        connected: boolean;
        host: string;
        port: number;
        db: number;
        usedMemory?: string;
        connectedClients?: number;
    }>;
    /**
     * Close connection
     */
    close(): Promise<void>;
    /**
     * Force disconnect (without graceful shutdown)
     */
    disconnect(): Promise<void>;
}
//# sourceMappingURL=redis.d.ts.map