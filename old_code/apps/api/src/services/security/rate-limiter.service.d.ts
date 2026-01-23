/**
 * Rate Limiter Service
 * Tracks and limits request rates to protect against brute force attacks
 */
import type { Redis } from 'ioredis';
export interface RateLimitConfig {
    windowSizeMs: number;
    maxAttempts: number;
    blockDurationMs: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    isBlocked: boolean;
    blockExpiresAt?: number;
}
export interface RateLimitInfo {
    attempts: number;
    windowStart: number;
    isBlocked: boolean;
    blockExpiresAt?: number;
}
/**
 * Default rate limit configurations
 */
export declare const DEFAULT_RATE_LIMITS: {
    login: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    passwordReset: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    registration: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    api: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    userConnectionCreate: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    userConnectionUpdate: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    userConnectionDelete: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    userConnectionTest: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    aiInsightsChat: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    aiInsightsGenerate: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    aiInsightsQuick: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    aiInsightsChatTenant: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    aiInsightsGenerateTenant: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    aiInsightsQuickTenant: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    tokenRefresh: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    logout: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    tokenRevoke: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    emailVerification: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
    resendVerification: {
        windowSizeMs: number;
        maxAttempts: number;
        blockDurationMs: number;
    };
};
/**
 * Rate Limiter Service using Redis
 */
export declare class RateLimiterService {
    private redis;
    private prefix;
    private configs;
    constructor(redis: Redis, prefix?: string);
    /**
     * Configure rate limit for a specific action
     */
    setConfig(action: string, config: RateLimitConfig): void;
    /**
     * Get the config for an action
     */
    getConfig(action: string): RateLimitConfig | undefined;
    /**
     * Check if action is allowed and record attempt
     * @param action - The action being rate limited (e.g., 'login', 'password_reset')
     * @param identifier - Unique identifier (e.g., email, IP address)
     * @returns Rate limit result
     */
    checkAndRecord(action: string, identifier: string): Promise<RateLimitResult>;
    /**
     * Check rate limit without recording (for info purposes)
     */
    check(action: string, identifier: string): Promise<RateLimitResult>;
    /**
     * Reset rate limit for an identifier
     * Useful after successful login or password reset
     */
    reset(action: string, identifier: string): Promise<void>;
    /**
     * Clear all rate limit data for an identifier
     */
    clearAll(identifier: string): Promise<void>;
    /**
     * Get rate limit info from Redis
     */
    private getRateLimitInfo;
    /**
     * Record an attempt
     */
    private recordAttempt;
    /**
     * Generate rate limit key
     */
    private getKey;
    /**
     * Generate block key
     */
    private getBlockKey;
}
/**
 * In-memory rate limiter for fallback when Redis is unavailable
 */
export declare class InMemoryRateLimiterService {
    private storage;
    private blocks;
    private configs;
    constructor();
    setConfig(action: string, config: RateLimitConfig): void;
    checkAndRecord(action: string, identifier: string): Promise<RateLimitResult>;
    check(action: string, identifier: string): Promise<RateLimitResult>;
    reset(action: string, identifier: string): Promise<void>;
    clearAll(identifier: string): Promise<void>;
    private cleanup;
}
//# sourceMappingURL=rate-limiter.service.d.ts.map