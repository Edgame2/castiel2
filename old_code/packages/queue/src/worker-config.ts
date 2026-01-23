/**
 * Worker Configuration Types
 * 
 * Standardized configuration interfaces for workers
 */

export interface StandardWorkerConfig {
  /**
   * Number of concurrent jobs to process
   * Default: 5
   */
  concurrency?: number;

  /**
   * Job cleanup settings for completed jobs
   */
  removeOnComplete?: {
    /**
     * Age in seconds to keep completed jobs
     * Default: 24 hours (86400 seconds)
     */
    age?: number;
    /**
     * Maximum number of completed jobs to keep
     * Default: 1000
     */
    count?: number;
  };

  /**
   * Job cleanup settings for failed jobs
   */
  removeOnFail?: {
    /**
     * Age in seconds to keep failed jobs
     * Default: 7 days (604800 seconds)
     */
    age?: number;
  };

  /**
   * Rate limiter configuration
   * Limits the number of jobs processed per time window
   */
  rateLimiter?: {
    /**
     * Maximum number of jobs to process
     */
    max: number;
    /**
     * Time window in milliseconds
     */
    duration: number;
  };
}

/**
 * Default worker configuration
 */
export const DEFAULT_WORKER_CONFIG: StandardWorkerConfig = {
  concurrency: 5,
  removeOnComplete: {
    age: 24 * 3600, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 days
  },
};

/**
 * Rate limiter configurations for high-volume queues
 */
export const QUEUE_RATE_LIMITERS: Record<string, { max: number; duration: number }> = {
  'sync-inbound-webhook': {
    max: 50, // 50 jobs per second
    duration: 1000, // 1 second window
  },
  'embedding-jobs': {
    max: 20, // 20 jobs per second (to respect OpenAI rate limits)
    duration: 1000, // 1 second window
  },
  'sync-inbound-scheduled': {
    max: 30, // 30 jobs per second
    duration: 1000, // 1 second window
  },
};

/**
 * Get rate limiter configuration for a queue
 */
export function getRateLimiterForQueue(queueName: string): StandardWorkerConfig['rateLimiter'] | undefined {
  return QUEUE_RATE_LIMITERS[queueName];
}

/**
 * Get worker configuration from environment variables
 */
export function getWorkerConfigFromEnv(
  queueName: string,
  defaults: StandardWorkerConfig = DEFAULT_WORKER_CONFIG
): StandardWorkerConfig {
  // Try queue-specific env var first, then generic
  const concurrencyEnv = 
    process.env[`${queueName.toUpperCase().replace(/-/g, '_')}_CONCURRENCY`] ||
    process.env.WORKER_CONCURRENCY;

  // Get rate limiter for this queue
  const rateLimiter = getRateLimiterForQueue(queueName);

  return {
    concurrency: concurrencyEnv 
      ? parseInt(concurrencyEnv, 10) 
      : defaults.concurrency,
    removeOnComplete: defaults.removeOnComplete,
    removeOnFail: defaults.removeOnFail,
    rateLimiter,
  };
}
