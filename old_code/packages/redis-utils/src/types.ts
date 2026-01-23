/**
 * Redis configuration interface
 */
export interface RedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: boolean;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | null;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  commandTimeout?: number;
  lazyConnect?: boolean;
}

/**
 * Redis health status
 */
export interface RedisHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connected: boolean;
  latency?: number;
  error?: string;
  lastCheck: Date;
}
