import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
export interface ICacheProvider {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    increment(key: string, ttlSeconds?: number): Promise<number>;
    delete(key: string): Promise<void>;
}
export declare class RedisCacheProvider implements ICacheProvider {
    private redis;
    constructor(redis: Redis);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    increment(key: string, ttlSeconds?: number): Promise<number>;
    delete(key: string): Promise<void>;
}
interface IServiceBusProvider {
    sendMessage(queueName: string, message: any): Promise<void>;
    publishMessage?(topicName: string, message: any): Promise<void>;
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
    operation?: string;
    requestsPerMinute?: number;
    burstSize?: number;
    adaptiveThreshold?: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfterSeconds?: number;
    queued?: boolean;
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
    adaptiveMultiplier: number;
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
export declare class IntegrationRateLimiter {
    private cache;
    private monitoring;
    private serviceBus?;
    private defaultLimits;
    private tenantLimits;
    private alertCallbacks;
    private queuedRequests;
    private adaptiveMultipliers;
    private lastResetTimes;
    constructor(cache: ICacheProvider, monitoring: IMonitoringProvider, serviceBus?: IServiceBusProvider | undefined);
    /**
     * Check if request is allowed and update rate limit counter
     */
    checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult>;
    /**
     * Update adaptive rate limit based on provider response headers
     * Call this after receiving API response from provider
     */
    updateAdaptiveLimit(integrationId: string, tenantId: string, responseHeaders: Record<string, string>): Promise<void>;
    /**
     * Get current rate limit status
     */
    getStatus(config: RateLimitConfig): Promise<RateLimitStatus>;
    /**
     * Process queued requests when rate limit allows
     */
    processQueue(integrationId: string, tenantId: string): Promise<number>;
    /**
     * Register alert callback
     */
    onAlert(callback: (alert: RateLimitAlert) => void): void;
    /**
     * Set custom rate limit for integration
     */
    setIntegrationLimit(integrationId: string, requestsPerMinute: number): void;
    /**
     * Set custom rate limit for tenant
     */
    setTenantLimit(tenantId: string, requestsPerMinute: number): void;
    /**
     * Reset all counters for integration (e.g., after maintenance)
     */
    resetIntegration(integrationId: string, tenantId: string): Promise<void>;
    /**
     * Reset all counters for tenant (e.g., after maintenance)
     */
    resetTenant(tenantId: string): Promise<void>;
    private getLimit;
    private getTenantLimit;
    private getRequestCount;
    private incrementRequestCount;
    private parseRateLimitHeader;
    private queueRequest;
    private sendAlert;
}
export {};
//# sourceMappingURL=integration-rate-limiter.service.d.ts.map