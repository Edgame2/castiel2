// Redis-based cache provider implementation
export class RedisCacheProvider {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        return await this.redis.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.redis.setex(key, ttlSeconds, value);
        }
        else {
            await this.redis.set(key, value);
        }
    }
    async increment(key, ttlSeconds) {
        const result = await this.redis.incr(key);
        if (ttlSeconds && result === 1) {
            // Set TTL only on first increment
            await this.redis.expire(key, ttlSeconds);
        }
        return result;
    }
    async delete(key) {
        await this.redis.del(key);
    }
}
/**
 * RateLimiter Service
 *
 * Implements Redis-backed rate limiting with sliding window algorithm
 */
export class IntegrationRateLimiter {
    cache;
    monitoring;
    serviceBus;
    defaultLimits = new Map([
        // Provider defaults
        ['salesforce', 300], // 300 per minute (5 per second)
        ['notion', 180], // 180 per minute (3 per second) - Notion's limit is 3/sec
        ['slack', 60], // 60 per minute (1 per second) - Slack's limit is 1/sec
        ['github', 360], // 360 per minute (6 per second)
        ['google', 240], // 240 per minute (4 per second)
        // Operations
        ['create', 100], // 100 creates per minute per integration
        ['update', 150], // 150 updates per minute per integration
        ['delete', 50], // 50 deletes per minute per integration
        ['fetch', 200], // 200 fetches per minute per integration
    ]);
    tenantLimits = new Map([
        // Tenant-level limits (across all integrations)
        ['default', 5000], // 5000 requests per minute per tenant
    ]);
    alertCallbacks = [];
    queuedRequests = new Map();
    adaptiveMultipliers = new Map();
    lastResetTimes = new Map();
    constructor(cache, monitoring, serviceBus) {
        this.cache = cache;
        this.monitoring = monitoring;
        this.serviceBus = serviceBus;
    }
    /**
     * Check if request is allowed and update rate limit counter
     */
    async checkRateLimit(config) {
        try {
            const now = Date.now();
            const windowMs = 60 * 1000; // 1-minute sliding window
            // Get the rate limit for this integration/operation
            const integrationLimit = this.getLimit(config.integrationId, config.operation);
            const tenantLimit = this.getTenantLimit(config.tenantId);
            // Apply adaptive multiplier if provider is being throttled
            const adaptiveMultiplier = this.adaptiveMultipliers.get(`${config.integrationId}:${config.tenantId}`) ?? 1.0;
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
                        allowed: true, // Will be processed from queue
                        queued: true,
                        remaining: Math.max(0, Math.min(effectiveIntegrationLimit - integrationCount, effectiveTenantLimit - tenantCount)),
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
                const estimatedRecoveryMinutes = Math.ceil((1 - threshold) * 60 / (integrationCount > 0 ? integrationCount : 1));
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
                    requestsRemaining: Math.min(effectiveIntegrationLimit - integrationCount - 1, effectiveTenantLimit - tenantCount - 1),
                    estimatedRecoveryMinutes,
                });
            }
            const resetAt = now + (windowMs - (now % windowMs));
            return {
                allowed: true,
                remaining: Math.min(Math.max(0, effectiveIntegrationLimit - integrationCount - 1), Math.max(0, effectiveTenantLimit - tenantCount - 1)),
                resetAt,
                message: 'Request allowed',
            };
        }
        catch (error) {
            // If rate limiting fails, allow request to go through (graceful degradation)
            this.monitoring.trackException(error, {
                context: 'rate_limit_check',
                integrationId: config.integrationId,
                tenantId: config.tenantId,
            });
            return {
                allowed: true, // Allow on error (better to process than lose data)
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
    async updateAdaptiveLimit(integrationId, tenantId, responseHeaders) {
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
                }
                else if (usagePercentage > 0.7) {
                    // Provider getting busy, reduce to 75%
                    this.adaptiveMultipliers.set(multiplierKey, 0.75);
                }
                else if (usagePercentage < 0.3) {
                    // Provider has capacity, allow full rate
                    this.adaptiveMultipliers.delete(multiplierKey);
                    this.monitoring.trackEvent('adaptive_limit_restored', {
                        integrationId,
                        tenantId,
                        usagePercentage: Math.round(usagePercentage * 100),
                    });
                }
            }
        }
        catch (error) {
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
    async getStatus(config) {
        try {
            const integrationKey = `rate_limit:${config.tenantId}:${config.integrationId}:${config.operation || 'all'}`;
            const tenantKey = `rate_limit:${config.tenantId}:tenant`;
            const [integrationCount, tenantCount] = await Promise.all([
                this.getRequestCount(integrationKey),
                this.getRequestCount(tenantKey),
            ]);
            const integrationLimit = this.getLimit(config.integrationId, config.operation);
            const adaptiveMultiplier = this.adaptiveMultipliers.get(`${config.integrationId}:${config.tenantId}`) ?? 1.0;
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
        }
        catch (error) {
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
    async processQueue(integrationId, tenantId) {
        let processed = 0;
        try {
            const integrationKey = `rate_limit:${tenantId}:${integrationId}:all`;
            const queued = this.queuedRequests.get(integrationKey) ?? [];
            for (const request of queued) {
                const config = {
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
                }
                else if (result.queued) {
                    // Still queued
                    break;
                }
                else {
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
        }
        catch (error) {
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
    onAlert(callback) {
        this.alertCallbacks.push(callback);
    }
    /**
     * Set custom rate limit for integration
     */
    setIntegrationLimit(integrationId, requestsPerMinute) {
        this.defaultLimits.set(integrationId, requestsPerMinute);
        this.monitoring.trackEvent('rate_limit_updated', {
            integrationId,
            requestsPerMinute,
        });
    }
    /**
     * Set custom rate limit for tenant
     */
    setTenantLimit(tenantId, requestsPerMinute) {
        this.tenantLimits.set(tenantId, requestsPerMinute);
        this.monitoring.trackEvent('tenant_rate_limit_updated', {
            tenantId,
            requestsPerMinute,
        });
    }
    /**
     * Reset all counters for integration (e.g., after maintenance)
     */
    async resetIntegration(integrationId, tenantId) {
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
        }
        catch (error) {
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
    async resetTenant(tenantId) {
        try {
            await this.cache.delete(`rate_limit:${tenantId}:tenant`);
            this.monitoring.trackEvent('tenant_rate_limit_reset', {
                tenantId,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                context: 'reset_tenant',
                tenantId,
            });
            throw error;
        }
    }
    // Private methods
    getLimit(integrationId, operation) {
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
        return 600; // 10 per second
    }
    getTenantLimit(tenantId) {
        const limit = this.tenantLimits.get(tenantId);
        return limit ?? this.tenantLimits.get('default') ?? 5000;
    }
    async getRequestCount(key) {
        const value = await this.cache.get(key);
        if (!value) {
            return 0;
        }
        const parsed = JSON.parse(value);
        return parsed.count ?? 0;
    }
    async incrementRequestCount(key, windowMs) {
        const value = await this.cache.get(key);
        let data = { count: 0, createdAt: Date.now() };
        if (value) {
            data = JSON.parse(value);
            // Reset if window expired
            if (Date.now() - data.createdAt > windowMs) {
                data = { count: 0, createdAt: Date.now() };
            }
        }
        data.count++;
        await this.cache.set(key, JSON.stringify(data), windowMs);
    }
    parseRateLimitHeader(integrationId, headers, type) {
        // Provider-specific header parsing
        let headerName = null;
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
    async queueRequest(config, key) {
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
    async sendAlert(alert) {
        // Call registered callbacks
        this.alertCallbacks.forEach(callback => {
            try {
                callback(alert);
            }
            catch (error) {
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
//# sourceMappingURL=integration-rate-limiter.service.js.map