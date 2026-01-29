/**
 * Opportunity Event Debouncer
 * Distributed debouncing using Redis for grouping multiple entity links within 5-second window per opportunity
 * @module @coder/shared/services
 */
import { getRedisClient } from '../cache';
// Simple logger for shared services (avoid circular dependencies)
const log = {
    debug: (message, meta) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[OpportunityEventDebouncer] ${message}`, meta || '');
        }
    },
    warn: (message, meta) => {
        console.warn(`[OpportunityEventDebouncer] ${message}`, meta || '');
    },
    error: (message, error, meta) => {
        console.error(`[OpportunityEventDebouncer] ${message}`, error || '', meta || '');
    },
};
/**
 * Opportunity Event Debouncer
 * Uses Redis for distributed debouncing across multiple consumer instances
 */
export class OpportunityEventDebouncer {
    debounceWindowMs = 5000; // 5 seconds
    cleanupInterval = null;
    useRedis = true;
    fallbackToMemory = true;
    memoryBuffer = new Map(); // Fallback in-memory buffer
    constructor(options) {
        this.debounceWindowMs = options?.debounceWindowMs || 5000;
        this.useRedis = options?.useRedis !== false;
        this.fallbackToMemory = options?.fallbackToMemory !== false;
        // Start cleanup interval (every 1 second) to remove expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredEntries();
        }, 1000);
    }
    /**
     * Schedule opportunity event (with debouncing)
     * Returns true if event should be published immediately, false if debounced
     */
    async scheduleOpportunityEvent(opportunityId, shardId, eventData) {
        const bufferKey = `opportunity_debounce:${eventData.tenantId}:${opportunityId}`;
        const expiresAt = Date.now() + this.debounceWindowMs;
        try {
            if (this.useRedis) {
                // Try Redis first
                try {
                    const redis = await getRedisClient().getClient();
                    const existingJson = await redis.get(bufferKey);
                    if (existingJson) {
                        const existing = JSON.parse(existingJson);
                        if (existing.expiresAt > Date.now()) {
                            // Update existing buffer (reset debounce window)
                            const updated = {
                                opportunityId,
                                shardId,
                                eventData,
                                expiresAt,
                            };
                            await redis.setex(bufferKey, Math.ceil(this.debounceWindowMs / 1000), JSON.stringify(updated));
                            log.debug('Opportunity event debounced (Redis)', {
                                opportunityId,
                                bufferKey,
                                expiresAt: new Date(expiresAt).toISOString(),
                                service: 'opportunity-debouncer',
                            });
                            return { shouldPublish: false, bufferKey };
                        }
                    }
                    // Create new buffer entry
                    const buffer = {
                        opportunityId,
                        shardId,
                        eventData,
                        expiresAt,
                    };
                    await redis.setex(bufferKey, Math.ceil(this.debounceWindowMs / 1000), JSON.stringify(buffer));
                    // Schedule cleanup after debounce window
                    setTimeout(async () => {
                        await this.flushAndPublish(bufferKey);
                    }, this.debounceWindowMs);
                    log.debug('Opportunity event scheduled (Redis)', {
                        opportunityId,
                        bufferKey,
                        expiresAt: new Date(expiresAt).toISOString(),
                        service: 'opportunity-debouncer',
                    });
                    return { shouldPublish: false, bufferKey };
                }
                catch (redisError) {
                    // Redis error - will fall through to fallback
                    throw redisError;
                }
            }
        }
        catch (error) {
            log.warn('Redis debouncing failed, falling back to memory', {
                error: error instanceof Error ? error.message : String(error),
                opportunityId,
                service: 'opportunity-debouncer',
            });
            if (!this.fallbackToMemory) {
                // If Redis fails and no fallback, publish immediately
                return { shouldPublish: true, bufferKey };
            }
        }
        // Fallback to in-memory debouncing
        if (this.fallbackToMemory) {
            const existing = this.memoryBuffer.get(bufferKey);
            if (existing && existing.expiresAt > Date.now()) {
                // Update existing buffer (reset debounce window)
                existing.shardId = shardId;
                existing.eventData = eventData;
                existing.expiresAt = expiresAt;
                log.debug('Opportunity event debounced (memory fallback)', {
                    opportunityId,
                    bufferKey,
                    expiresAt: new Date(expiresAt).toISOString(),
                    service: 'opportunity-debouncer',
                });
                return { shouldPublish: false, bufferKey };
            }
            else {
                // Create new buffer entry
                const buffer = {
                    opportunityId,
                    shardId,
                    eventData,
                    expiresAt,
                };
                this.memoryBuffer.set(bufferKey, buffer);
                // Schedule cleanup after debounce window
                setTimeout(async () => {
                    await this.flushAndPublish(bufferKey);
                }, this.debounceWindowMs);
                log.debug('Opportunity event scheduled (memory fallback)', {
                    opportunityId,
                    bufferKey,
                    expiresAt: new Date(expiresAt).toISOString(),
                    service: 'opportunity-debouncer',
                });
                return { shouldPublish: false, bufferKey };
            }
        }
        // No debouncing available - publish immediately
        return { shouldPublish: true, bufferKey };
    }
    /**
     * Flush and publish opportunity event
     * Called when debounce window expires or on shutdown
     */
    async flushAndPublish(bufferKey) {
        try {
            let buffer = null;
            if (this.useRedis) {
                try {
                    const redis = await getRedisClient().getClient();
                    const bufferJson = await redis.get(bufferKey);
                    if (bufferJson) {
                        buffer = JSON.parse(bufferJson);
                        await redis.del(bufferKey);
                    }
                }
                catch (error) {
                    log.warn('Failed to get buffer from Redis', {
                        error: error instanceof Error ? error.message : String(error),
                        bufferKey,
                        service: 'opportunity-debouncer',
                    });
                }
            }
            // Fallback to memory
            if (!buffer && this.fallbackToMemory) {
                buffer = this.memoryBuffer.get(bufferKey) || null;
                if (buffer) {
                    this.memoryBuffer.delete(bufferKey);
                }
            }
            if (buffer && buffer.expiresAt <= Date.now()) {
                // Buffer expired, return it for publishing
                return buffer;
            }
            return null;
        }
        catch (error) {
            log.error('Failed to flush opportunity event buffer', error, {
                bufferKey,
                service: 'opportunity-debouncer',
            });
            return null;
        }
    }
    /**
     * Get all pending opportunity events (for shutdown flush)
     */
    async getAllPendingEvents() {
        const pending = [];
        try {
            if (this.useRedis) {
                try {
                    // Note: Redis keys() is expensive, but acceptable for shutdown
                    // In production, consider using Redis SCAN for better performance
                    const redis = await getRedisClient().getClient();
                    const keys = await redis.keys('opportunity_debounce:*');
                    for (const key of keys) {
                        const bufferJson = await redis.get(key);
                        if (bufferJson) {
                            const buffer = JSON.parse(bufferJson);
                            if (buffer.expiresAt > Date.now()) {
                                pending.push(buffer);
                            }
                        }
                    }
                }
                catch (error) {
                    log.warn('Failed to get pending events from Redis', {
                        error: error instanceof Error ? error.message : String(error),
                        service: 'opportunity-debouncer',
                    });
                }
            }
        }
        catch (error) {
            log.warn('Failed to get pending events from Redis', {
                error: error instanceof Error ? error.message : String(error),
                service: 'opportunity-debouncer',
            });
        }
        // Add memory buffer entries
        for (const buffer of this.memoryBuffer.values()) {
            if (buffer.expiresAt > Date.now()) {
                pending.push(buffer);
            }
        }
        return pending;
    }
    /**
     * Cleanup expired entries
     */
    async cleanupExpiredEntries() {
        const now = Date.now();
        // Cleanup memory buffer
        for (const [key, buffer] of this.memoryBuffer.entries()) {
            if (buffer.expiresAt <= now) {
                this.memoryBuffer.delete(key);
            }
        }
        // Note: Redis entries expire automatically via TTL, but we can clean up manually if needed
    }
    /**
     * Stop debouncer (cleanup)
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.memoryBuffer.clear();
    }
}
//# sourceMappingURL=OpportunityEventDebouncer.js.map