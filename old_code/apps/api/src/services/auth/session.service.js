import { randomBytes } from 'crypto';
/**
 * Session Service
 * Manages user sessions in Redis with sliding expiration
 */
export class SessionService {
    redis;
    defaultSessionTTL;
    slidingWindow;
    constructor(redis, options) {
        this.redis = redis;
        this.defaultSessionTTL = options?.sessionTTL || 9 * 60 * 60; // 9 hours
        this.slidingWindow = options?.slidingWindow || 30 * 60; // 30 minutes
    }
    /**
     * Create a new user session
     */
    async createSession(userId, tenantId, sessionData) {
        const sessionId = this.generateSessionId();
        const now = Date.now();
        const expiresAt = now + (this.defaultSessionTTL * 1000);
        const session = {
            sessionId,
            userId,
            tenantId,
            email: sessionData.email || '',
            name: sessionData.name,
            provider: sessionData.provider || 'email',
            createdAt: now,
            lastActivityAt: now,
            expiresAt,
            metadata: sessionData.metadata || {},
        };
        // Store in Redis with TTL
        const key = this.getSessionKey(tenantId, userId, sessionId);
        await this.redis.setex(key, this.defaultSessionTTL, JSON.stringify(session));
        // Create user session index (for finding all user sessions)
        const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
        await this.redis.sadd(userIndexKey, sessionId);
        await this.redis.expire(userIndexKey, this.defaultSessionTTL);
        return session;
    }
    /**
     * Get a session by ID
     */
    async getSession(tenantId, userId, sessionId) {
        const key = this.getSessionKey(tenantId, userId, sessionId);
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    /**
     * Update session with sliding expiration
     * Extends TTL if within sliding window of expiration
     */
    async touchSession(tenantId, userId, sessionId) {
        const session = await this.getSession(tenantId, userId, sessionId);
        if (!session) {
            return false;
        }
        const now = Date.now();
        const timeUntilExpiry = session.expiresAt - now;
        // Only extend if within sliding window
        if (timeUntilExpiry < (this.slidingWindow * 1000)) {
            session.lastActivityAt = now;
            session.expiresAt = now + (this.defaultSessionTTL * 1000);
            const key = this.getSessionKey(tenantId, userId, sessionId);
            await this.redis.setex(key, this.defaultSessionTTL, JSON.stringify(session));
            return true;
        }
        // Just update last activity without extending TTL
        session.lastActivityAt = now;
        const key = this.getSessionKey(tenantId, userId, sessionId);
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
            await this.redis.setex(key, ttl, JSON.stringify(session));
        }
        return true;
    }
    /**
     * Delete a specific session
     */
    async deleteSession(tenantId, userId, sessionId) {
        const key = this.getSessionKey(tenantId, userId, sessionId);
        await this.redis.del(key);
        // Remove from user session index
        const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
        await this.redis.srem(userIndexKey, sessionId);
    }
    /**
     * Delete all sessions for a user
     */
    async deleteAllUserSessions(tenantId, userId) {
        const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
        const sessionIds = await this.redis.smembers(userIndexKey);
        if (sessionIds.length === 0) {
            return 0;
        }
        // Delete all session keys
        const keys = sessionIds.map(sid => this.getSessionKey(tenantId, userId, sid));
        await this.redis.del(...keys);
        // Delete index
        await this.redis.del(userIndexKey);
        return sessionIds.length;
    }
    /**
     * Get all active sessions for a user
     */
    async getUserSessions(tenantId, userId) {
        const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
        const sessionIds = await this.redis.smembers(userIndexKey);
        if (sessionIds.length === 0) {
            return [];
        }
        const sessions = [];
        for (const sessionId of sessionIds) {
            const session = await this.getSession(tenantId, userId, sessionId);
            if (session) {
                sessions.push(session);
            }
        }
        return sessions;
    }
    /**
     * Count active sessions for a user
     */
    async countUserSessions(tenantId, userId) {
        const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
        return this.redis.scard(userIndexKey);
    }
    /**
     * Update session metadata
     */
    async updateSessionMetadata(tenantId, userId, sessionId, metadata) {
        const session = await this.getSession(tenantId, userId, sessionId);
        if (!session) {
            return false;
        }
        session.metadata = { ...session.metadata, ...metadata };
        const key = this.getSessionKey(tenantId, userId, sessionId);
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
            await this.redis.setex(key, ttl, JSON.stringify(session));
            return true;
        }
        return false;
    }
    /**
     * Check if a session has been idle for too long
     * Returns true if the session is still valid, false if idle timeout exceeded
     */
    async checkSessionIdleTimeout(tenantId, userId, sessionId, idleTimeoutMinutes) {
        const session = await this.getSession(tenantId, userId, sessionId);
        if (!session) {
            return { valid: false, idleMinutes: 0 };
        }
        // If idle timeout is 0 or not set, session is always valid
        if (!idleTimeoutMinutes || idleTimeoutMinutes <= 0) {
            return { valid: true, idleMinutes: 0 };
        }
        const now = Date.now();
        const lastActivity = session.lastActivityAt;
        const idleMs = now - lastActivity;
        const idleMinutes = Math.floor(idleMs / (1000 * 60));
        const isIdle = idleMinutes >= idleTimeoutMinutes;
        return {
            valid: !isIdle,
            idleMinutes,
        };
    }
    /**
     * Enforce maximum concurrent sessions for a user
     * Returns true if session was created, false if limit exceeded
     */
    async enforceMaxConcurrentSessions(tenantId, userId, maxSessions) {
        if (maxSessions <= 0) {
            return { allowed: true, currentCount: 0, removedSessions: [] };
        }
        const sessions = await this.getUserSessions(tenantId, userId);
        const currentCount = sessions.length;
        const removedSessions = [];
        if (currentCount >= maxSessions) {
            // Sort by last activity (oldest first)
            sessions.sort((a, b) => a.lastActivityAt - b.lastActivityAt);
            // Remove oldest sessions to make room
            const sessionsToRemove = sessions.slice(0, currentCount - maxSessions + 1);
            for (const session of sessionsToRemove) {
                await this.deleteSession(tenantId, userId, session.sessionId);
                removedSessions.push(session.sessionId);
            }
        }
        return {
            allowed: true,
            currentCount: currentCount - removedSessions.length,
            removedSessions,
        };
    }
    /**
     * Clean up orphaned sessions
     * Should be run periodically
     */
    async cleanupOrphanedSessions(tenantId) {
        const pattern = `session:${tenantId}:*`;
        let cursor = '0';
        let deletedCount = 0;
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (!data) {
                    continue;
                }
                try {
                    const session = JSON.parse(data);
                    // Check if session is expired
                    if (session.expiresAt < Date.now()) {
                        await this.redis.del(key);
                        deletedCount++;
                    }
                }
                catch (error) {
                    // Invalid session data, delete it
                    await this.redis.del(key);
                    deletedCount++;
                }
            }
        } while (cursor !== '0');
        return deletedCount;
    }
    /**
     * Generate a secure session ID
     */
    generateSessionId() {
        return randomBytes(32).toString('hex');
    }
    /**
     * Get Redis key for a session
     */
    getSessionKey(tenantId, userId, sessionId) {
        return `session:${tenantId}:${userId}:${sessionId}`;
    }
    /**
     * Get Redis key for user session index
     */
    getUserSessionIndexKey(tenantId, userId) {
        return `session:index:${tenantId}:${userId}`;
    }
}
//# sourceMappingURL=session.service.js.map