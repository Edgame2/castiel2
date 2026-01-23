/**
 * Rate Limiter Service
 * Tracks and limits request rates to protect against brute force attacks
 */
/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS = {
    // Login attempts - 5 attempts per 15 minutes, 30 minute block
    login: {
        windowSizeMs: 15 * 60 * 1000,
        maxAttempts: 5,
        blockDurationMs: 30 * 60 * 1000,
    },
    // Password reset - 3 attempts per hour, 1 hour block
    passwordReset: {
        windowSizeMs: 60 * 60 * 1000,
        maxAttempts: 3,
        blockDurationMs: 60 * 60 * 1000,
    },
    // Registration - 5 attempts per hour, 1 hour block
    registration: {
        windowSizeMs: 60 * 60 * 1000,
        maxAttempts: 5,
        blockDurationMs: 60 * 60 * 1000,
    },
    // API calls - 100 per minute
    api: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 100,
        blockDurationMs: 60 * 1000,
    },
    // User connection creation - 10 per hour
    userConnectionCreate: {
        windowSizeMs: 60 * 60 * 1000,
        maxAttempts: 10,
        blockDurationMs: 60 * 60 * 1000,
    },
    // User connection update - 20 per hour
    userConnectionUpdate: {
        windowSizeMs: 60 * 60 * 1000,
        maxAttempts: 20,
        blockDurationMs: 60 * 60 * 1000,
    },
    // User connection delete - 10 per hour
    userConnectionDelete: {
        windowSizeMs: 60 * 60 * 1000,
        maxAttempts: 10,
        blockDurationMs: 60 * 60 * 1000,
    },
    // User connection test - 5 per 5 minutes (expensive operation)
    userConnectionTest: {
        windowSizeMs: 5 * 60 * 1000,
        maxAttempts: 5,
        blockDurationMs: 10 * 60 * 1000,
    },
    // AI Insights - per user limits
    // Chat endpoint - 60 requests per minute per user
    aiInsightsChat: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 60,
        blockDurationMs: 60 * 1000,
    },
    // Generate endpoint - 30 requests per minute per user (more expensive)
    aiInsightsGenerate: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 30,
        blockDurationMs: 60 * 1000,
    },
    // Quick insights - 100 requests per minute per user (lighter operation)
    aiInsightsQuick: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 100,
        blockDurationMs: 60 * 1000,
    },
    // AI Insights - per tenant limits (across all users)
    // Tenant-wide chat - 1000 requests per minute per tenant
    aiInsightsChatTenant: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 1000,
        blockDurationMs: 60 * 1000,
    },
    // Tenant-wide generate - 500 requests per minute per tenant
    aiInsightsGenerateTenant: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 500,
        blockDurationMs: 60 * 1000,
    },
    // Tenant-wide quick - 2000 requests per minute per tenant
    aiInsightsQuickTenant: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 2000,
        blockDurationMs: 60 * 1000,
    },
    // Token refresh - 10 attempts per minute per IP (prevent abuse)
    tokenRefresh: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 10,
        blockDurationMs: 5 * 60 * 1000,
    },
    // Logout - 20 attempts per minute per IP (prevent DoS)
    logout: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 20,
        blockDurationMs: 5 * 60 * 1000,
    },
    // Token revocation - 10 attempts per minute per IP
    tokenRevoke: {
        windowSizeMs: 60 * 1000,
        maxAttempts: 10,
        blockDurationMs: 5 * 60 * 1000,
    },
    // Email verification - 10 attempts per hour per email
    emailVerification: {
        windowSizeMs: 60 * 60 * 1000,
        maxAttempts: 10,
        blockDurationMs: 60 * 60 * 1000,
    },
    // Resend verification email - 3 attempts per hour per email
    resendVerification: {
        windowSizeMs: 60 * 60 * 1000,
        maxAttempts: 3,
        blockDurationMs: 60 * 60 * 1000,
    },
};
/**
 * Rate Limiter Service using Redis
 */
export class RateLimiterService {
    redis;
    prefix;
    configs;
    constructor(redis, prefix = 'rate_limit') {
        this.redis = redis;
        this.prefix = prefix;
        this.configs = new Map();
        // Set default configurations
        Object.entries(DEFAULT_RATE_LIMITS).forEach(([key, config]) => {
            this.configs.set(key, config);
        });
    }
    /**
     * Configure rate limit for a specific action
     */
    setConfig(action, config) {
        this.configs.set(action, config);
    }
    /**
     * Get the config for an action
     */
    getConfig(action) {
        return this.configs.get(action);
    }
    /**
     * Check if action is allowed and record attempt
     * @param action - The action being rate limited (e.g., 'login', 'password_reset')
     * @param identifier - Unique identifier (e.g., email, IP address)
     * @returns Rate limit result
     */
    async checkAndRecord(action, identifier) {
        const config = this.configs.get(action);
        if (!config) {
            // No config - allow by default
            return {
                allowed: true,
                remaining: Infinity,
                resetAt: Date.now(),
                isBlocked: false,
            };
        }
        const key = this.getKey(action, identifier);
        const blockKey = this.getBlockKey(action, identifier);
        const now = Date.now();
        // Check if blocked
        const blockExpiry = await this.redis.get(blockKey);
        if (blockExpiry) {
            const expiresAt = parseInt(blockExpiry, 10);
            if (expiresAt > now) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt: expiresAt,
                    isBlocked: true,
                    blockExpiresAt: expiresAt,
                };
            }
            // Block expired, remove it
            await this.redis.del(blockKey);
        }
        // Get current rate limit info
        const info = await this.getRateLimitInfo(key, config, now);
        // Check if within window and limit
        if (info.attempts >= config.maxAttempts) {
            // Exceeded limit - block the identifier
            const blockExpiresAt = now + config.blockDurationMs;
            await this.redis.setex(blockKey, Math.ceil(config.blockDurationMs / 1000), blockExpiresAt.toString());
            return {
                allowed: false,
                remaining: 0,
                resetAt: blockExpiresAt,
                isBlocked: true,
                blockExpiresAt,
            };
        }
        // Record this attempt
        await this.recordAttempt(key, config, now);
        return {
            allowed: true,
            remaining: config.maxAttempts - info.attempts - 1,
            resetAt: info.windowStart + config.windowSizeMs,
            isBlocked: false,
        };
    }
    /**
     * Check rate limit without recording (for info purposes)
     */
    async check(action, identifier) {
        const config = this.configs.get(action);
        if (!config) {
            return {
                allowed: true,
                remaining: Infinity,
                resetAt: Date.now(),
                isBlocked: false,
            };
        }
        const key = this.getKey(action, identifier);
        const blockKey = this.getBlockKey(action, identifier);
        const now = Date.now();
        // Check if blocked
        const blockExpiry = await this.redis.get(blockKey);
        if (blockExpiry) {
            const expiresAt = parseInt(blockExpiry, 10);
            if (expiresAt > now) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt: expiresAt,
                    isBlocked: true,
                    blockExpiresAt: expiresAt,
                };
            }
        }
        const info = await this.getRateLimitInfo(key, config, now);
        const allowed = info.attempts < config.maxAttempts;
        return {
            allowed,
            remaining: Math.max(0, config.maxAttempts - info.attempts),
            resetAt: info.windowStart + config.windowSizeMs,
            isBlocked: false,
        };
    }
    /**
     * Reset rate limit for an identifier
     * Useful after successful login or password reset
     */
    async reset(action, identifier) {
        const key = this.getKey(action, identifier);
        const blockKey = this.getBlockKey(action, identifier);
        await Promise.all([
            this.redis.del(key),
            this.redis.del(blockKey),
        ]);
    }
    /**
     * Clear all rate limit data for an identifier
     */
    async clearAll(identifier) {
        const actions = Array.from(this.configs.keys());
        await Promise.all(actions.flatMap(action => [
            this.redis.del(this.getKey(action, identifier)),
            this.redis.del(this.getBlockKey(action, identifier)),
        ]));
    }
    /**
     * Get rate limit info from Redis
     */
    async getRateLimitInfo(key, config, now) {
        const data = await this.redis.hgetall(key);
        if (!data || !data.windowStart) {
            return {
                attempts: 0,
                windowStart: now,
                isBlocked: false,
            };
        }
        const windowStart = parseInt(data.windowStart, 10);
        const attempts = parseInt(data.attempts || '0', 10);
        // Check if window has expired
        if (now - windowStart > config.windowSizeMs) {
            // Window expired, start fresh
            return {
                attempts: 0,
                windowStart: now,
                isBlocked: false,
            };
        }
        return {
            attempts,
            windowStart,
            isBlocked: false,
        };
    }
    /**
     * Record an attempt
     */
    async recordAttempt(key, config, now) {
        const data = await this.redis.hgetall(key);
        const windowStart = data?.windowStart ? parseInt(data.windowStart, 10) : now;
        const isNewWindow = !data?.windowStart || now - windowStart > config.windowSizeMs;
        if (isNewWindow) {
            // Start new window
            await this.redis.hmset(key, {
                windowStart: now.toString(),
                attempts: '1',
            });
        }
        else {
            // Increment attempts in current window
            await this.redis.hincrby(key, 'attempts', 1);
        }
        // Set expiry on the key
        const ttl = Math.ceil(config.windowSizeMs / 1000);
        await this.redis.expire(key, ttl);
    }
    /**
     * Generate rate limit key
     */
    getKey(action, identifier) {
        return `${this.prefix}:${action}:${identifier}`;
    }
    /**
     * Generate block key
     */
    getBlockKey(action, identifier) {
        return `${this.prefix}:block:${action}:${identifier}`;
    }
}
/**
 * In-memory rate limiter for fallback when Redis is unavailable
 */
export class InMemoryRateLimiterService {
    storage = new Map();
    blocks = new Map();
    configs = new Map();
    constructor() {
        // Set default configurations
        Object.entries(DEFAULT_RATE_LIMITS).forEach(([key, config]) => {
            this.configs.set(key, config);
        });
        // Cleanup old entries periodically
        setInterval(() => this.cleanup(), 60000);
    }
    setConfig(action, config) {
        this.configs.set(action, config);
    }
    async checkAndRecord(action, identifier) {
        const config = this.configs.get(action);
        if (!config) {
            return { allowed: true, remaining: Infinity, resetAt: Date.now(), isBlocked: false };
        }
        const key = `${action}:${identifier}`;
        const blockKey = `block:${key}`;
        const now = Date.now();
        // Check if blocked
        const blockExpiry = this.blocks.get(blockKey);
        if (blockExpiry && blockExpiry > now) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: blockExpiry,
                isBlocked: true,
                blockExpiresAt: blockExpiry,
            };
        }
        // Get or create entry
        let entry = this.storage.get(key);
        if (!entry || now - entry.windowStart > config.windowSizeMs) {
            entry = { attempts: 0, windowStart: now };
        }
        if (entry.attempts >= config.maxAttempts) {
            const blockExpiresAt = now + config.blockDurationMs;
            this.blocks.set(blockKey, blockExpiresAt);
            return {
                allowed: false,
                remaining: 0,
                resetAt: blockExpiresAt,
                isBlocked: true,
                blockExpiresAt,
            };
        }
        entry.attempts++;
        this.storage.set(key, entry);
        return {
            allowed: true,
            remaining: config.maxAttempts - entry.attempts,
            resetAt: entry.windowStart + config.windowSizeMs,
            isBlocked: false,
        };
    }
    async check(action, identifier) {
        const config = this.configs.get(action);
        if (!config) {
            return { allowed: true, remaining: Infinity, resetAt: Date.now(), isBlocked: false };
        }
        const key = `${action}:${identifier}`;
        const blockKey = `block:${key}`;
        const now = Date.now();
        const blockExpiry = this.blocks.get(blockKey);
        if (blockExpiry && blockExpiry > now) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: blockExpiry,
                isBlocked: true,
                blockExpiresAt: blockExpiry,
            };
        }
        const entry = this.storage.get(key);
        if (!entry || now - entry.windowStart > config.windowSizeMs) {
            return { allowed: true, remaining: config.maxAttempts, resetAt: now + config.windowSizeMs, isBlocked: false };
        }
        return {
            allowed: entry.attempts < config.maxAttempts,
            remaining: Math.max(0, config.maxAttempts - entry.attempts),
            resetAt: entry.windowStart + config.windowSizeMs,
            isBlocked: false,
        };
    }
    async reset(action, identifier) {
        const key = `${action}:${identifier}`;
        this.storage.delete(key);
        this.blocks.delete(`block:${key}`);
    }
    async clearAll(identifier) {
        for (const action of this.configs.keys()) {
            await this.reset(action, identifier);
        }
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.storage.entries()) {
            const action = key.split(':')[0];
            const config = this.configs.get(action);
            if (config && now - entry.windowStart > config.windowSizeMs) {
                this.storage.delete(key);
            }
        }
        for (const [key, expiry] of this.blocks.entries()) {
            if (expiry <= now) {
                this.blocks.delete(key);
            }
        }
    }
}
//# sourceMappingURL=rate-limiter.service.js.map