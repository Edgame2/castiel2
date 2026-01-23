import { Redis } from 'ioredis';
import type { RedisConfig, RedisHealthStatus } from './types.js';

/**
 * Redis Connection Manager
 * Handles connection lifecycle, retry logic, and health checks
 */
export class RedisConnectionManager {
  private client: Redis | null = null;
  private config: RedisConfig;
  private connecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;

  constructor(config: RedisConfig) {
    this.config = {
      retryStrategy: (times: number) => {
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, then give up
        if (times > 5) {
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: false,
      ...config,
    };
  }

  /**
   * Get or create Redis client
   */
  async getClient(): Promise<Redis> {
    if (this.client && this.client.status === 'ready') {
      return this.client;
    }

    if (this.connecting) {
      // Wait for existing connection attempt
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.client && this.client.status === 'ready') {
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
   * Connect to Redis with retry logic
   */
  private async connect(): Promise<Redis> {
    if (this.connecting) {
      throw new Error('Connection already in progress');
    }

    this.connecting = true;
    this.connectionAttempts++;

    try {
      console.log(`[Redis] Connecting to ${this.config.host}:${this.config.port}...`);

      this.client = new Redis({
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
      });

      // Handle connection events
      this.client.on('connect', () => {
        console.log('[Redis] Connected successfully');
        this.connectionAttempts = 0;
      });

      this.client.on('ready', () => {
        console.log('[Redis] Ready to accept commands');
      });

      this.client.on('error', (err: Error) => {
        console.error('[Redis] Error:', err.message);
      });

      this.client.on('close', () => {
        console.log('[Redis] Connection closed');
      });

      this.client.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
      });

      this.client.on('end', () => {
        console.log('[Redis] Connection ended');
      });

      // Wait for ready state
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Client not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.connectTimeout);

        this.client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client.once('error', (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      this.connecting = false;
      return this.client;
    } catch (error) {
      this.connecting = false;
      console.error('[Redis] Connection failed:', error);

      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        throw new Error(
          `Failed to connect to Redis after ${this.maxConnectionAttempts} attempts`
        );
      }

      throw error;
    }
  }

  /**
   * Check Redis health
   */
  async healthCheck(): Promise<RedisHealthStatus> {
    try {
      if (!this.client || this.client.status !== 'ready') {
        return {
          status: 'unhealthy',
          connected: false,
          error: 'Redis client not connected',
          lastCheck: new Date(),
        };
      }

      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        status: latency < 100 ? 'healthy' : 'degraded',
        connected: true,
        latency,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('[Redis] Disconnecting...');
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): string {
    return this.client?.status || 'disconnected';
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.status === 'ready';
  }
}
