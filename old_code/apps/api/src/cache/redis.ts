import { Redis, type RedisOptions } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';

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
export class RedisConnectionManager {
  private client: Redis | null = null;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private monitoring?: IMonitoringProvider;

  constructor(config: RedisConfig, monitoring?: IMonitoringProvider) {
    this.config = config;
    this.monitoring = monitoring;
  }

  /**
   * Get or create Redis client
   */
  async getClient(): Promise<Redis> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    return this.connect();
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<Redis> {
    // Capture monitoring reference for retry strategy callback
    const monitoring = this.monitoring;
    
    // Support REDIS_URL if provided (for Azure Redis Cache)
    if (process.env.REDIS_URL) {
      this.client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
        connectTimeout: this.config.connectTimeout || 10000,
        retryStrategy: this.config.retryStrategy || ((times: number) => {
          if (times > 10) {
            monitoring?.trackEvent('redis.connection.max-retries-reached', {
              attempts: times,
            });
            return undefined;
          }
          const delay = Math.min(times * 50, 2000);
          monitoring?.trackEvent('redis.connection.retrying', {
            attempt: times,
            delayMs: delay,
          });
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
    } else {
      // Use individual config components
      const options: RedisOptions = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
        connectTimeout: this.config.connectTimeout || 10000,
        retryStrategy: this.config.retryStrategy || ((times: number) => {
          if (times > 10) {
            monitoring?.trackEvent('redis.connection.max-retries-reached', {
              attempts: times,
            });
            return undefined;
          }
          const delay = Math.min(times * 50, 2000);
          monitoring?.trackEvent('redis.connection.retrying', {
            attempt: times,
            delayMs: delay,
          });
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
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, this.config.connectTimeout || 10000);

      this.client!.once('ready', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.monitoring?.trackEvent('redis.connection.ready', {
          success: true,
        });
        resolve();
      });

      this.client!.once('error', (err: Error) => {
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
  private setupEventHandlers(client: Redis): void {
    client.on('connect', () => {
      this.monitoring?.trackEvent('redis.connection.established');
    });

    client.on('ready', () => {
      this.isConnected = true;
      this.monitoring?.trackEvent('redis.connection.ready');
    });

    client.on('error', (err: Error) => {
      this.monitoring?.trackException(err, {
        operation: 'redis.connection.error',
      });
      this.isConnected = false;
    });

    client.on('close', () => {
      this.monitoring?.trackEvent('redis.connection.closed');
      this.isConnected = false;
    });

    client.on('reconnecting', () => {
      this.reconnectAttempts++;
      this.monitoring?.trackEvent('redis.connection.reconnecting', {
        attempt: this.reconnectAttempts,
      });
    });

    client.on('end', () => {
      this.monitoring?.trackEvent('redis.connection.ended');
      this.isConnected = false;
    });
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Ping Redis to check connection
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error: unknown) {
      this.monitoring?.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'redis.ping',
        }
      );
      return false;
    }
  }

  /**
   * Get connection info
   */
  async getInfo(): Promise<{
    connected: boolean;
    host: string;
    port: number;
    db: number;
    usedMemory?: string;
    connectedClients?: number;
  }> {
    const info: any = {
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
      } catch (error: unknown) {
        this.monitoring?.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'redis.get-info',
          }
        );
      }
    }

    return info;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.monitoring?.trackEvent('redis.connection.closed-manually');
    }
  }

  /**
   * Force disconnect (without graceful shutdown)
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.isConnected = false;
      this.monitoring?.trackEvent('redis.connection.disconnected');
    }
  }
}
