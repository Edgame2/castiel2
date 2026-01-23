import { Redis } from 'ioredis';
/**
 * Redis Connection Manager
 * Handles Redis connection with retry logic and health monitoring
 */
export class RedisConnectionManager {
    client = null;
    config;
    isConnected = false;
    reconnectAttempts = 0;
    constructor(config) {
        this.config = config;
    }
    /**
     * Get or create Redis client
     */
    async getClient() {
        if (this.client && this.isConnected) {
            return this.client;
        }
        return this.connect();
    }
    /**
     * Connect to Redis
     */
    async connect() {
        // Support REDIS_URL if provided (for Azure Redis Cache)
        if (process.env.REDIS_URL) {
            this.client = new Redis(process.env.REDIS_URL, {
                maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
                connectTimeout: this.config.connectTimeout || 10000,
                retryStrategy: this.config.retryStrategy || ((times) => {
                    if (times > 10) {
                        console.error('Redis: Max retry attempts reached');
                        return undefined;
                    }
                    const delay = Math.min(times * 50, 2000);
                    console.log(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
                    return delay;
                }),
                lazyConnect: false,
                enableReadyCheck: true,
                enableOfflineQueue: true,
                reconnectOnError: (err) => {
                    const targetError = 'READONLY';
                    if (err.message.includes(targetError)) {
                        return true;
                    }
                    return false;
                },
            });
        }
        else {
            // Use individual config components
            const options = {
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                password: this.config.password,
                db: this.config.db,
                maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
                connectTimeout: this.config.connectTimeout || 10000,
                retryStrategy: this.config.retryStrategy || ((times) => {
                    if (times > 10) {
                        console.error('Redis: Max retry attempts reached');
                        return undefined;
                    }
                    const delay = Math.min(times * 50, 2000);
                    console.log(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
                    return delay;
                }),
                lazyConnect: false,
                enableReadyCheck: true,
                enableOfflineQueue: true,
                reconnectOnError: (err) => {
                    const targetError = 'READONLY';
                    if (err.message.includes(targetError)) {
                        return true;
                    }
                    return false;
                },
            };
            // Configure TLS if enabled
            if (this.config.tls) {
                options.tls = {
                    rejectUnauthorized: false, // For Azure Redis
                };
            }
            this.client = new Redis(options);
        }
        // Setup event handlers
        this.setupEventHandlers(this.client);
        // Wait for connection
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Redis connection timeout'));
            }, this.config.connectTimeout || 10000);
            this.client.once('ready', () => {
                clearTimeout(timeout);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('✅ Redis connected successfully');
                resolve();
            });
            this.client.once('error', (err) => {
                clearTimeout(timeout);
                if (!this.isConnected) {
                    reject(err);
                }
            });
        });
        return this.client;
    }
    /**
     * Setup Redis event handlers
     */
    setupEventHandlers(client) {
        client.on('connect', () => {
            console.log('Redis: Connection established');
        });
        client.on('ready', () => {
            this.isConnected = true;
            console.log('Redis: Ready to accept commands');
        });
        client.on('error', (err) => {
            console.error('Redis error:', err.message);
            this.isConnected = false;
        });
        client.on('close', () => {
            console.log('Redis: Connection closed');
            this.isConnected = false;
        });
        client.on('reconnecting', () => {
            this.reconnectAttempts++;
            console.log(`Redis: Reconnecting (attempt ${this.reconnectAttempts})...`);
        });
        client.on('end', () => {
            console.log('Redis: Connection ended');
            this.isConnected = false;
        });
    }
    /**
     * Check if Redis is connected
     */
    isReady() {
        return this.isConnected && this.client !== null;
    }
    /**
     * Ping Redis to check connection
     */
    async ping() {
        try {
            if (!this.client) {
                return false;
            }
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis ping failed:', error);
            return false;
        }
    }
    /**
     * Get connection info
     */
    async getInfo() {
        const info = {
            connected: this.isConnected,
            host: this.config.host,
            port: this.config.port,
            db: this.config.db,
        };
        if (this.isConnected && this.client) {
            try {
                const serverInfo = await this.client.info('memory');
                const stats = await this.client.info('clients');
                // Parse memory info
                const memoryMatch = serverInfo.match(/used_memory_human:(.+)/);
                if (memoryMatch) {
                    info.usedMemory = memoryMatch[1].trim();
                }
                // Parse client count
                const clientsMatch = stats.match(/connected_clients:(\d+)/);
                if (clientsMatch) {
                    info.connectedClients = parseInt(clientsMatch[1], 10);
                }
            }
            catch (error) {
                console.error('Failed to get Redis info:', error);
            }
        }
        return info;
    }
    /**
     * Close connection
     */
    async close() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
            console.log('Redis connection closed');
        }
    }
    /**
     * Force disconnect (without graceful shutdown)
     */
    async disconnect() {
        if (this.client) {
            this.client.disconnect();
            this.client = null;
            this.isConnected = false;
            console.log('Redis disconnected');
        }
    }
}
//# sourceMappingURL=redis.js.map