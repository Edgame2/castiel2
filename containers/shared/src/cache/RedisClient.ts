/**
 * Redis Client
 * Singleton Redis client with connection pooling
 * @module @coder/shared/cache
 */

import Redis, { RedisOptions } from 'ioredis';

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
export class RedisClient {
  private static instance: RedisClient | null = null;
  private client: Redis | null = null;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private connecting: boolean = false;

  private constructor(config: RedisConfig = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379', 10),
      username: config.username || process.env.REDIS_USERNAME,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: config.keyPrefix || process.env.REDIS_KEY_PREFIX,
      tls: config.tls || process.env.REDIS_TLS === 'true',
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      connectTimeout: config.connectTimeout || 10000,
      retryStrategy: config.retryStrategy || ((times: number) => {
        if (times > 10) {
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      }),
      enableReadyCheck: config.enableReadyCheck !== false,
      enableOfflineQueue: config.enableOfflineQueue !== false,
      commandTimeout: config.commandTimeout || 5000,
      lazyConnect: config.lazyConnect || false,
    };
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(config?: RedisConfig): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient(config);
    }
    return RedisClient.instance;
  }

  /**
   * Get or create Redis client
   */
  async getClient(): Promise<Redis> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    if (this.connecting) {
      // Wait for existing connection attempt
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.client && this.isConnected) {
            clearInterval(checkInterval);
            resolve(this.client);
          } else if (!this.connecting) {
            clearInterval(checkInterval);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
    }

    return this.connect();
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<Redis> {
    if (this.connecting) {
      throw new Error('Connection already in progress');
    }

    this.connecting = true;

    try {
      // Support REDIS_URL if provided (for Azure Redis Cache, etc.)
      if (this.config.url || process.env.REDIS_URL) {
        const redisUrl = this.config.url || process.env.REDIS_URL!;
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: this.config.maxRetriesPerRequest,
          connectTimeout: this.config.connectTimeout,
          retryStrategy: this.config.retryStrategy,
          enableReadyCheck: this.config.enableReadyCheck,
          enableOfflineQueue: this.config.enableOfflineQueue,
          commandTimeout: this.config.commandTimeout,
          lazyConnect: this.config.lazyConnect,
        });
      } else {
        // Use individual config components
        const options: RedisOptions = {
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
          retryStrategy: this.config.retryStrategy,
          maxRetriesPerRequest: this.config.maxRetriesPerRequest,
          enableReadyCheck: this.config.enableReadyCheck,
          enableOfflineQueue: this.config.enableOfflineQueue,
          connectTimeout: this.config.connectTimeout,
          commandTimeout: this.config.commandTimeout,
          lazyConnect: this.config.lazyConnect,
          tls: this.config.tls ? {} : undefined,
        };

        this.client = new Redis(options);
      }

      // Handle connection events
      this.client.on('connect', () => {
        this.isConnected = true;
        this.connecting = false;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.connecting = false;
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        this.connecting = false;
        console.error('[Redis] Connection error:', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Wait for connection
      if (!this.config.lazyConnect) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis connection timeout'));
          }, this.config.connectTimeout);

          this.client!.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.client!.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      return this.client;
    } catch (error) {
      this.connecting = false;
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

