/**
 * Redis Connection for BullMQ
 * 
 * Supports both single instance and cluster mode Redis connections
 */

import { Redis, Cluster, type RedisOptions, type ClusterOptions } from 'ioredis';

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  tls?: boolean;
  url?: string;
  // Cluster configuration
  cluster?: {
    enabled: boolean;
    nodes?: Array<{ host: string; port: number }>;
    options?: ClusterOptions;
  };
}

/**
 * Create Redis connection for BullMQ
 * Supports both single instance and cluster mode
 */
export function createRedisConnection(config?: RedisConfig): Redis | Cluster {
  // Check if cluster mode is enabled
  const clusterEnabled = 
    config?.cluster?.enabled === true ||
    process.env.REDIS_CLUSTER_ENABLED === 'true' ||
    process.env.REDIS_CLUSTER === 'true';

  if (clusterEnabled) {
    return createClusterConnection(config);
  }

  // Single instance mode
  // If URL is provided, use it
  if (config?.url && config.url.trim() !== '') {
    return new Redis(config.url, {
      maxRetriesPerRequest: null, // Required for BullMQ
    });
  }

  // Check for REDIS_URL in environment as fallback
  if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
    });
  }

  // Otherwise use individual config
  const connectionOptions: RedisOptions = {
    host: config?.host || process.env.REDIS_HOST || 'localhost',
    port: config?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
    password: config?.password || process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
  };

  // Enable TLS if configured
  if (config?.tls || process.env.REDIS_TLS_ENABLED === 'true') {
    connectionOptions.tls = {};
  }

  return new Redis(connectionOptions);
}

/**
 * Create Redis Cluster connection
 */
function createClusterConnection(config?: RedisConfig): Cluster {
  // Parse cluster nodes from environment or config
  let nodes: Array<{ host: string; port: number }> = [];

  // Try to get nodes from config
  if (config?.cluster?.nodes && config.cluster.nodes.length > 0) {
    nodes = config.cluster.nodes;
  } else if (process.env.REDIS_CLUSTER_NODES) {
    // Parse from comma-separated list: "host1:port1,host2:port2"
    const nodeStrings = process.env.REDIS_CLUSTER_NODES.split(',');
    nodes = nodeStrings.map(nodeStr => {
      const [host, port] = nodeStr.trim().split(':');
      return {
        host: host || 'localhost',
        port: parseInt(port || '6379', 10),
      };
    });
  } else {
    // Fallback: use single host/port (for Azure Cache for Redis which provides cluster via single endpoint)
    const host = config?.host || process.env.REDIS_HOST || 'localhost';
    const port = config?.port || parseInt(process.env.REDIS_PORT || '6379', 10);
    nodes = [{ host, port }];
  }

  // Cluster options
  const clusterOptions: ClusterOptions = {
    redisOptions: {
      password: config?.password || process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Required for BullMQ
      ...(config?.tls || process.env.REDIS_TLS_ENABLED === 'true' ? { tls: {} } : {}),
    },
    // Cluster-specific options
    enableReadyCheck: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    ...config?.cluster?.options,
  };

  return new Cluster(nodes, clusterOptions);
}

/**
 * Get Redis connection from environment variables
 */
export function getRedisConnectionFromEnv(): Redis | Cluster {
  const config: RedisConfig = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS_ENABLED === 'true',
    url: process.env.REDIS_URL,
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === 'true' || process.env.REDIS_CLUSTER === 'true',
      nodes: process.env.REDIS_CLUSTER_NODES
        ? process.env.REDIS_CLUSTER_NODES.split(',').map(nodeStr => {
            const [host, port] = nodeStr.trim().split(':');
            return {
              host: host || 'localhost',
              port: parseInt(port || '6379', 10),
            };
          })
        : undefined,
    },
  };

  return createRedisConnection(config);
}



