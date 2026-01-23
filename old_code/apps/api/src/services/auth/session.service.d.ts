import type { Redis } from 'ioredis';
import type { UserSession } from '../../types/index.js';
/**
 * Session Service
 * Manages user sessions in Redis with sliding expiration
 */
export declare class SessionService {
    private redis;
    private defaultSessionTTL;
    private slidingWindow;
    constructor(redis: Redis, options?: {
        sessionTTL?: number;
        slidingWindow?: number;
    });
    /**
     * Create a new user session
     */
    createSession(userId: string, tenantId: string, sessionData: Partial<UserSession>): Promise<UserSession>;
    /**
     * Get a session by ID
     */
    getSession(tenantId: string, userId: string, sessionId: string): Promise<UserSession | null>;
    /**
     * Update session with sliding expiration
     * Extends TTL if within sliding window of expiration
     */
    touchSession(tenantId: string, userId: string, sessionId: string): Promise<boolean>;
    /**
     * Delete a specific session
     */
    deleteSession(tenantId: string, userId: string, sessionId: string): Promise<void>;
    /**
     * Delete all sessions for a user
     */
    deleteAllUserSessions(tenantId: string, userId: string): Promise<number>;
    /**
     * Get all active sessions for a user
     */
    getUserSessions(tenantId: string, userId: string): Promise<UserSession[]>;
    /**
     * Count active sessions for a user
     */
    countUserSessions(tenantId: string, userId: string): Promise<number>;
    /**
     * Update session metadata
     */
    updateSessionMetadata(tenantId: string, userId: string, sessionId: string, metadata: Record<string, any>): Promise<boolean>;
    /**
     * Check if a session has been idle for too long
     * Returns true if the session is still valid, false if idle timeout exceeded
     */
    checkSessionIdleTimeout(tenantId: string, userId: string, sessionId: string, idleTimeoutMinutes: number): Promise<{
        valid: boolean;
        idleMinutes: number;
    }>;
    /**
     * Enforce maximum concurrent sessions for a user
     * Returns true if session was created, false if limit exceeded
     */
    enforceMaxConcurrentSessions(tenantId: string, userId: string, maxSessions: number): Promise<{
        allowed: boolean;
        currentCount: number;
        removedSessions: string[];
    }>;
    /**
     * Clean up orphaned sessions
     * Should be run periodically
     */
    cleanupOrphanedSessions(tenantId: string): Promise<number>;
    /**
     * Generate a secure session ID
     */
    private generateSessionId;
    /**
     * Get Redis key for a session
     */
    private getSessionKey;
    /**
     * Get Redis key for user session index
     */
    private getUserSessionIndexKey;
}
//# sourceMappingURL=session.service.d.ts.map