/**
 * Redis Client
 * Per ModuleImplementationGuide - shared infrastructure
 */

import Redis from 'ioredis';
import { log } from './logger';
import { getConfig } from '../config';

// Use managed Redis service (AWS ElastiCache, Redis Cloud) for production
// For <1000 users: Single Redis instance
// For >1000 users: Redis Sentinel (master-replica with automatic failover)

const config = getConfig();
const redisUrl = config.redis?.url || process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL
function parseRedisUrl(url: string): { host: string; port: number; password?: string; db: number } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      db: parseInt(parsed.pathname?.slice(1) || '0', 10),
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      db: 0,
    };
  }
}

const redisConfig = parseRedisUrl(redisUrl);

const redis = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  retryStrategy: (times) => {
    if (times > 10) {
      return undefined; // Stop retrying after 10 attempts
    }
    return Math.min(times * 50, 2000); // Exponential backoff, max 2s
  },
  // Sentinel configuration (if using)
  sentinels: config.redis?.sentinels
    ? config.redis.sentinels.split(',').map(host => ({
        host: host.split(':')[0],
        port: parseInt(host.split(':')[1] || '26379')
      }))
    : process.env.REDIS_SENTINELS?.split(',').map(host => ({
        host: host.split(':')[0],
        port: parseInt(host.split(':')[1] || '26379', 10)
      })) || undefined,
  name: config.redis?.master_name || process.env.REDIS_MASTER_NAME || 'mymaster',
});

// Graceful Redis failure handling
redis.on('error', (err) => {
  log.error('Redis connection error', err, { service: 'auth' });
  // Application continues, falls back to database
});

redis.on('connect', () => {
  log.info('Redis connected', { service: 'auth' });
});

redis.on('ready', () => {
  log.info('Redis ready', { service: 'auth' });
});

export { redis };
export default redis;
