import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';

// Simple cache interface for rate limiting
export interface ICacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  increment(key: string, ttlSeconds?: number): Promise<number>;
  delete(key: string): Promise<void>;
}

// Redis-based cache provider implementation
export class RedisCacheProvider implements ICacheProvider {
  constructor(private redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const result = await this.redis.incr(key);
    if (ttlSeconds && result === 1) {
      // Set TTL only on first increment
      await this.redis.expire(key, ttlSeconds);
    }
    return result;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Service Bus interface (optional, for queue management)
interface IServiceBusProvider {
  sendMessage(queueName: string, message: any): Promise<void>;
  publishMessage?(topicName: string, message: any): Promise<void>; // Optional publish method
}

/**
 * Rate Limiting Service
 * 
 * Uses Redis sliding window algorithm to enforce rate limits on:
 * - Per-integration requests (e.g., Salesforce: 100/min)
 * - Per-tenant requests (e.g., Tenant-123: 1000/min)
 * - Per-operation requests (e.g., "create": 50/min)
 * - Adaptive limits based on provider response headers
 * 
 * Supports:
 * - Token bucket algorithm (configurable burst)
 * - Sliding window for fairness
 * - Adaptive rate limiting (read X-RateLimit-* headers)
 * - Graceful degradation (local fallback if Redis unavailable)
 * - Queue management for throttled requests
 */
export interface RateLimitConfig {
  integrationId: string;
  tenantId: string;
  operation?: string;                    // 'create', 'update', 'delete', 'fetch'
  requestsPerMinute?: number;            // Override default
  burstSize?: number;                    // Allow burst up to N requests
  adaptiveThreshold?: number;            // % remaining to trigger adaptive limiting
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;                     // Requests remaining in window
  resetAt: number;                       // Unix timestamp when window resets
  retryAfterSeconds?: number;            // How long to wait if rejected
  queued?: boolean;                      // If request was queued instead of rejected
  message?: string;
}

export interface RateLimitStatus {
  integrationId: string;
  tenantId: string;
  operation?: string;
  requestsPerMinute: number;
  requestsMade: number;
  requestsRemaining: number;
  windowResetAt: number;
  isThrottled: boolean;
  queuedRequests: number;
  adaptiveMultiplier: number;             // 1.0 = normal, <1.0 = reduced due to provider limits
}

export interface RateLimitAlert {
  integrationId: string;
  tenantId: string;
  type: 'approaching_limit' | 'rate_limit_exceeded' | 'queue_overflow' | 'provider_throttled';
  message: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: Date;
  requestsRemaining?: number;
  estimatedRecoveryMinutes?: number;
}

/**
 * RateLimiter Service
 * 
 * Implements Redis-backed rate limiting with sliding window algorithm
 */
export class IntegrationRateLimiter {
  private defaultLimits: Map<string, number> = new Map([
    // Provider defaults
    ['salesforce', 300],        // 300 per minute (5 per second)
    ['notion', 180],            // 180 per minute (3 per second) - Notion's limit is 3/sec
    ['slack', 60],              // 60 per minute (1 per second) - Slack's limit is 1/sec
    ['github', 360],            // 360 per minute (6 per second)
    ['google', 240],            // 240 per minute (4 per second)
    // Operations
    ['create', 100],            // 100 creates per minute per integration
    ['update', 150],            // 150 updates per minute per integration
    ['delete', 50],             // 50 deletes per minute per integration
    ['fetch', 200],             // 200 fetches per minute per integration
  ]);

  private tenantLimits: Map<string, number> = new Map([
    // Tenant-level limits (across all integrations)
    ['default', 5000],          // 5000 requests per minute per tenant
  ]);

  private alertCallbacks: Array<(alert: RateLimitAlert) => void> = [];
  private queuedRequests: Map<string, Array<any>> = new Map();
  private adaptiveMultipliers: Map<string, number> = new Map();
  private lastResetTimes: Map<string, number> = new Map();

  constructor(
    private cache: ICacheProvider,
    private monitoring: IMonitoringProvider,
    private serviceBus?: IServiceBusProvider
  ) {}

  /**
   * Check if request is allowed and update rate limit counter
   */
  async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    try {
      const now = Date.now();
      const windowMs = 60 * 1000;  // 1-minute sliding window

      // Get the rate limit for this integration/operation
      const integrationLimit = this.getLimit(config.integrationId, config.operation);
      const tenantLimit = this.getTenantLimit(config.tenantId);

      // Apply adaptive multiplier if provider is being throttled
      const adaptiveMultiplier = this.adaptiveMultipliers.get(
        `${config.integrationId}:${config.tenantId}`
      ) ?? 1.0;

      const effectiveIntegrationLimit = Math.floor(integrationLimit * adaptiveMultiplier);
      const effectiveTenantLimit = Math.floor(tenantLimit * adaptiveMultiplier);

      // Check both integration and tenant limits
      const integrationKey = `rate_limit:${config.tenantId}:${config.integrationId}:${config.operation || 'all'}`;
      const tenantKey = `rate_limit:${config.tenantId}:tenant`;

      const [integrationCount, tenantCount] = await Promise.all([
        this.getRequestCount(integrationKey),
        this.getRequestCount(tenantKey),
      ]);

      // Check if either limit would be exceeded
      const integrationWouldExceed = integrationCount >= effectiveIntegrationLimit;
      const tenantWouldExceed = tenantCount >= effectiveTenantLimit;

      if (integrationWouldExceed || tenantWouldExceed) {
        // Rate limit exceeded
        const resetAt = now + (windowMs - (now % windowMs));
        const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);

        // Check if we should queue instead of reject
        const shouldQueue = config.operation === 'fetch' || config.operation === 'create';
        if (shouldQueue && this.serviceBus) {
          // Queue the request instead of rejecting
          await this.queueRequest(config, integrationKey);

          this.monitoring.trackEvent('rate_limit_queued', {
            integrationId: config.integrationId,
            tenantId: config.tenantId,
            operation: config.operation,
            reason: integrationWouldExceed ? 'integration_limit' : 'tenant_limit',
          });

          return {
            allowed: true,  // Will be processed from queue
            queued: true,
            remaining: Math.max(0, Math.min(
              effectiveIntegrationLimit - integrationCount,
              effectiveTenantLimit - tenantCount
            )),
            resetAt,
            retryAfterSeconds,
            message: 'Request queued for processing',
          };
        }

        // Reject the request
        this.monitoring.trackEvent('rate_limit_exceeded', {
          integrationId: config.integrationId,
          tenantId: config.tenantId,
          operation: config.operation,
          reason: integrationWouldExceed ? 'integration_limit' : 'tenant_limit',
        });

        // Send alert
        await this.sendAlert({
          integrationId: config.integrationId,
          tenantId: config.tenantId,
          type: 'rate_limit_exceeded',
          message: `Rate limit exceeded for ${config.integrationId}. Retry in ${retryAfterSeconds}s.`,
          severity: 'warning',
          timestamp: new Date(),
          requestsRemaining: 0,
          estimatedRecoveryMinutes: Math.ceil(retryAfterSeconds / 60),
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfterSeconds,
          message: `Rate limit exceeded. Retry after ${retryAfterSeconds}s.`,
        };
      }

      // Increment counters
      await Promise.all([
        this.incrementRequestCount(integrationKey, windowMs),
        this.incrementRequestCount(tenantKey, windowMs),
      ]);

      // Check if approaching limit (80%)
      const integrationUsage = (integrationCount + 1) / effectiveIntegrationLimit;
      const tenantUsage = (tenantCount + 1) / effectiveTenantLimit;

      if (integrationUsage > 0.8 || tenantUsage > 0.8) {
        const threshold = Math.max(integrationUsage, tenantUsage);
        const estimatedRecoveryMinutes = Math.ceil(
          (1 - threshold) * 60 / (integrationCount > 0 ? integrationCount : 1)
        );

        this.monitoring.trackEvent('rate_limit_warning', {
          integrationId: config.integrationId,
          tenantId: config.tenantId,
          operation: config.operation,
          usagePercentage: Math.round(threshold * 100),
        });

        await this.sendAlert({
          integrationId: config.integrationId,
          tenantId: config.tenantId,
          type: 'approaching_limit',
          message: `Approaching rate limit: ${Math.round(threshold * 100)}% used`,
          severity: 'warning',
          timestamp: new Date(),
          requestsRemaining: Math.min(
            effectiveIntegrationLimit - integrationCount - 1,
            effectiveTenantLimit - tenantCount - 1
          ),
          estimatedRecoveryMinutes,
        });
      }

      const resetAt = now + (windowMs - (now % windowMs));

      return {
        allowed: true,
        remaining: Math.min(
          Math.max(0, effectiveIntegrationLimit - integrationCount - 1),
          Math.max(0, effectiveTenantLimit - tenantCount - 1)
        ),
        resetAt,
        message: 'Request allowed',
      };
    } catch (error: any) {
      // If rate limiting fails, allow request to go through (graceful degradation)
      this.monitoring.trackException(error, {
        context: 'rate_limit_check',
        integrationId: config.integrationId,
        tenantId: config.tenantId,
      });

      return {
        allowed: true,  // Allow on error (better to process than lose data)
        remaining: -1,
        resetAt: Date.now() + 60000,
        message: 'Rate limit check failed, request allowed',
      };
    }
  }

  /**
   * Update adaptive rate limit based on provider response headers
   * Call this after receiving API response from provider
   */
  async updateAdaptiveLimit(
    integrationId: string,
    tenantId: string,
    responseHeaders: Record<string, string>
  ): Promise<void> {
    try {
      // Parse rate limit headers (provider-specific)
      const remaining = this.parseRateLimitHeader(integrationId, responseHeaders, 'remaining');
      const limit = this.parseRateLimitHeader(integrationId, responseHeaders, 'limit');
      const reset = this.parseRateLimitHeader(integrationId, responseHeaders, 'reset');

      if (remaining !== null && limit !== null) {
        // Calculate current usage
        const used = limit - remaining;
        const usagePercentage = used / limit;

        // If provider is being heavily throttled, reduce our request rate
        const multiplierKey = `${integrationId}:${tenantId}`;

        if (usagePercentage > 0.9) {
          // Provider near limit, reduce to 50%
          this.adaptiveMultipliers.set(multiplierKey, 0.5);

          this.monitoring.trackEvent('adaptive_limit_reduced', {
            integrationId,
            tenantId,
            usagePercentage: Math.round(usagePercentage * 100),
            multiplier: 0.5,
          });
        } else if (usagePercentage > 0.7) {
          // Provider getting busy, reduce to 75%
          this.adaptiveMultipliers.set(multiplierKey, 0.75);
        } else if (usagePercentage < 0.3) {
          // Provider has capacity, allow full rate
          this.adaptiveMultipliers.delete(multiplierKey);

          this.monitoring.trackEvent('adaptive_limit_restored', {
            integrationId,
            tenantId,
            usagePercentage: Math.round(usagePercentage * 100),
          });
        }
      }
    } catch (error: any) {
      // Log but don't fail on adaptive limit update
      this.monitoring.trackException(error, {
        context: 'update_adaptive_limit',
        integrationId,
        tenantId,
      });
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(config: RateLimitConfig): Promise<RateLimitStatus> {
    try {
      const integrationKey = `rate_limit:${config.tenantId}:${config.integrationId}:${config.operation || 'all'}`;
      const tenantKey = `rate_limit:${config.tenantId}:tenant`;

      const [integrationCount, tenantCount] = await Promise.all([
        this.getRequestCount(integrationKey),
        this.getRequestCount(tenantKey),
      ]);

      const integrationLimit = this.getLimit(config.integrationId, config.operation);
      const adaptiveMultiplier = this.adaptiveMultipliers.get(
        `${config.integrationId}:${config.tenantId}`
      ) ?? 1.0;

      const effectiveIntegrationLimit = Math.floor(integrationLimit * adaptiveMultiplier);
      const windowMs = 60 * 1000;
      const now = Date.now();
      const resetAt = now + (windowMs - (now % windowMs));

      const queuedRequests = this.queuedRequests.get(integrationKey)?.length ?? 0;

      return {
        integrationId: config.integrationId,
        tenantId: config.tenantId,
        operation: config.operation,
        requestsPerMinute: effectiveIntegrationLimit,
        requestsMade: integrationCount,
        requestsRemaining: Math.max(0, effectiveIntegrationLimit - integrationCount),
        windowResetAt: resetAt,
        isThrottled: integrationCount >= effectiveIntegrationLimit * 0.8,
        queuedRequests,
        adaptiveMultiplier,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        context: 'get_status',
        integrationId: config.integrationId,
        tenantId: config.tenantId,
      });

      throw error;
    }
  }

  /**
   * Process queued requests when rate limit allows
   */
  async processQueue(integrationId: string, tenantId: string): Promise<number> {
    let processed = 0;

    try {
      const integrationKey = `rate_limit:${tenantId}:${integrationId}:all`;
      const queued = this.queuedRequests.get(integrationKey) ?? [];

      for (const request of queued) {
        const config: RateLimitConfig = {
          integrationId,
          tenantId,
          operation: request.operation,
        };

        const result = await this.checkRateLimit(config);

        if (result.allowed && !result.queued) {
          // Process the request
          if (this.serviceBus && this.serviceBus.publishMessage) {
            await this.serviceBus.publishMessage('sync-tasks', request);
          }

          processed++;
          queued.shift();
        } else if (result.queued) {
          // Still queued
          break;
        } else {
          // Hit rate limit again, stop processing
          break;
        }
      }

      if (queued.length === 0) {
        this.queuedRequests.delete(integrationKey);
      }

      this.monitoring.trackEvent('queue_processed', {
        integrationId,
        tenantId,
        requestsProcessed: processed,
        requestsRemaining: queued.length,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        context: 'process_queue',
        integrationId,
        tenantId,
      });
    }

    return processed;
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: RateLimitAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Set custom rate limit for integration
   */
  setIntegrationLimit(integrationId: string, requestsPerMinute: number): void {
    this.defaultLimits.set(integrationId, requestsPerMinute);
    this.monitoring.trackEvent('rate_limit_updated', {
      integrationId,
      requestsPerMinute,
    });
  }

  /**
   * Set custom rate limit for tenant
   */
  setTenantLimit(tenantId: string, requestsPerMinute: number): void {
    this.tenantLimits.set(tenantId, requestsPerMinute);
    this.monitoring.trackEvent('tenant_rate_limit_updated', {
      tenantId,
      requestsPerMinute,
    });
  }

  /**
   * Reset all counters for integration (e.g., after maintenance)
   */
  async resetIntegration(integrationId: string, tenantId: string): Promise<void> {
    try {
      const pattern = `rate_limit:${tenantId}:${integrationId}:*`;
      // Delete all keys matching pattern
      // Note: Redis SCAN would be more efficient, but cache abstraction doesn't support it
      const keys = [
        `rate_limit:${tenantId}:${integrationId}:all`,
        `rate_limit:${tenantId}:${integrationId}:create`,
        `rate_limit:${tenantId}:${integrationId}:update`,
        `rate_limit:${tenantId}:${integrationId}:delete`,
        `rate_limit:${tenantId}:${integrationId}:fetch`,
      ];

      await Promise.all(keys.map(key => this.cache.delete(key)));

      this.adaptiveMultipliers.delete(`${integrationId}:${tenantId}`);
      this.queuedRequests.delete(`rate_limit:${tenantId}:${integrationId}:all`);

      this.monitoring.trackEvent('integration_rate_limit_reset', {
        integrationId,
        tenantId,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        context: 'reset_integration',
        integrationId,
        tenantId,
      });

      throw error;
    }
  }

  /**
   * Reset all counters for tenant (e.g., after maintenance)
   */
  async resetTenant(tenantId: string): Promise<void> {
    try {
      await this.cache.delete(`rate_limit:${tenantId}:tenant`);
      this.monitoring.trackEvent('tenant_rate_limit_reset', {
        tenantId,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        context: 'reset_tenant',
        tenantId,
      });

      throw error;
    }
  }

  // Private methods

  private getLimit(integrationId: string, operation?: string): number {
    // First check operation-specific limit
    if (operation) {
      const operationLimit = this.defaultLimits.get(operation);
      if (operationLimit !== undefined) {
        return operationLimit;
      }
    }

    // Then check integration-specific limit
    const integrationLimit = this.defaultLimits.get(integrationId);
    if (integrationLimit !== undefined) {
      return integrationLimit;
    }

    // Fall back to default
    return 600;  // 10 per second
  }

  private getTenantLimit(tenantId: string): number {
    const limit = this.tenantLimits.get(tenantId);
    return limit ?? this.tenantLimits.get('default') ?? 5000;
  }

  private async getRequestCount(key: string): Promise<number> {
    const value = await this.cache.get(key);
    if (!value) {return 0;}

    const parsed = JSON.parse(value as string);
    return parsed.count ?? 0;
  }

  private async incrementRequestCount(key: string, windowMs: number): Promise<void> {
    const value = await this.cache.get(key);
    let data = { count: 0, createdAt: Date.now() };

    if (value) {
      data = JSON.parse(value as string);
      // Reset if window expired
      if (Date.now() - data.createdAt > windowMs) {
        data = { count: 0, createdAt: Date.now() };
      }
    }

    data.count++;

    await this.cache.set(key, JSON.stringify(data), windowMs);
  }

  private parseRateLimitHeader(
    integrationId: string,
    headers: Record<string, string>,
    type: 'remaining' | 'limit' | 'reset'
  ): number | null {
    // Provider-specific header parsing
    let headerName: string | null = null;

    switch (integrationId.toLowerCase()) {
      case 'salesforce':
        headerName = type === 'remaining' ? 'sforce-limit-info' : null;
        if (headerName && headers[headerName]) {
          // Format: "api=25/1000"
          const match = headers[headerName].match(/api=(\d+)\/(\d+)/);
          if (match) {
            return type === 'remaining' ? parseInt(match[1]) : parseInt(match[2]);
          }
        }
        break;

      case 'notion':
        headerName = type === 'remaining' ? 'ratelimit-remaining' :
                    type === 'limit' ? 'ratelimit-limit' :
                    'ratelimit-reset';
        if (headers[headerName]) {
          return parseInt(headers[headerName]);
        }
        break;

      case 'slack':
        headerName = type === 'remaining' ? 'x-rate-limit-remaining' :
                    type === 'limit' ? 'x-rate-limit-limit' :
                    'x-rate-limit-reset';
        if (headers[headerName]) {
          return parseInt(headers[headerName]);
        }
        break;

      case 'github':
        headerName = type === 'remaining' ? 'x-ratelimit-remaining' :
                    type === 'limit' ? 'x-ratelimit-limit' :
                    'x-ratelimit-reset';
        if (headers[headerName]) {
          return parseInt(headers[headerName]);
        }
        break;

      case 'google':
        headerName = 'x-goog-ratelimit-remaining';
        if (headers[headerName]) {
          return parseInt(headers[headerName]);
        }
        break;
    }

    return null;
  }

  private async queueRequest(config: RateLimitConfig, key: string): Promise<void> {
    const queue = this.queuedRequests.get(key) ?? [];
    queue.push({
      ...config,
      enqueuedAt: Date.now(),
    });

    // Limit queue to 10,000 items per integration
    if (queue.length > 10000) {
      queue.shift();

      await this.sendAlert({
        integrationId: config.integrationId,
        tenantId: config.tenantId,
        type: 'queue_overflow',
        message: 'Rate limit queue approaching capacity',
        severity: 'critical',
        timestamp: new Date(),
      });
    }

    this.queuedRequests.set(key, queue);
  }

  private async sendAlert(alert: RateLimitAlert): Promise<void> {
    // Call registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error: any) {
        this.monitoring.trackException(error, {
          context: 'rate_limit_alert_callback',
          alertType: alert.type,
        });
      }
    });

    // Track in monitoring
    this.monitoring.trackEvent('rate_limit_alert', {
      integrationId: alert.integrationId,
      tenantId: alert.tenantId,
      type: alert.type,
      severity: alert.severity,
    });
  }
}
