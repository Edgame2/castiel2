import type { Redis } from 'ioredis';
import type { UserSession } from '../../types/index.js';
import { randomBytes } from 'crypto';

/**
 * Session Service
 * Manages user sessions in Redis with sliding expiration
 */
export class SessionService {
  private redis: Redis;
  private defaultSessionTTL: number;
  private slidingWindow: number;

  constructor(redis: Redis, options?: {
    sessionTTL?: number;  // Default: 9 hours (in seconds)
    slidingWindow?: number; // Time window to extend session (in seconds)
  }) {
    this.redis = redis;
    this.defaultSessionTTL = options?.sessionTTL || 9 * 60 * 60; // 9 hours
    this.slidingWindow = options?.slidingWindow || 30 * 60; // 30 minutes
  }

  /**
   * Create a new user session
   */
  async createSession(
    userId: string,
    tenantId: string,
    sessionData: Partial<UserSession>
  ): Promise<UserSession> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const expiresAt = now + (this.defaultSessionTTL * 1000);

    const session: UserSession = {
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
    await this.redis.setex(
      key,
      this.defaultSessionTTL,
      JSON.stringify(session)
    );

    // Create user session index (for finding all user sessions)
    const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
    await this.redis.sadd(userIndexKey, sessionId);
    await this.redis.expire(userIndexKey, this.defaultSessionTTL);

    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(
    tenantId: string,
    userId: string,
    sessionId: string
  ): Promise<UserSession | null> {
    const key = this.getSessionKey(tenantId, userId, sessionId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as UserSession;
  }

  /**
   * Update session with sliding expiration
   * Extends TTL if within sliding window of expiration
   */
  async touchSession(
    tenantId: string,
    userId: string,
    sessionId: string
  ): Promise<boolean> {
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
      await this.redis.setex(
        key,
        this.defaultSessionTTL,
        JSON.stringify(session)
      );

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
  async deleteSession(
    tenantId: string,
    userId: string,
    sessionId: string
  ): Promise<void> {
    const key = this.getSessionKey(tenantId, userId, sessionId);
    await this.redis.del(key);

    // Remove from user session index
    const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
    await this.redis.srem(userIndexKey, sessionId);
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(
    tenantId: string,
    userId: string
  ): Promise<number> {
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
  async getUserSessions(
    tenantId: string,
    userId: string
  ): Promise<UserSession[]> {
    const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
    const sessionIds = await this.redis.smembers(userIndexKey);

    if (sessionIds.length === 0) {
      return [];
    }

    const sessions: UserSession[] = [];

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
  async countUserSessions(
    tenantId: string,
    userId: string
  ): Promise<number> {
    const userIndexKey = this.getUserSessionIndexKey(tenantId, userId);
    return this.redis.scard(userIndexKey);
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    tenantId: string,
    userId: string,
    sessionId: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
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
  async checkSessionIdleTimeout(
    tenantId: string,
    userId: string,
    sessionId: string,
    idleTimeoutMinutes: number
  ): Promise<{ valid: boolean; idleMinutes: number }> {
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
  async enforceMaxConcurrentSessions(
    tenantId: string,
    userId: string,
    maxSessions: number
  ): Promise<{ allowed: boolean; currentCount: number; removedSessions: string[] }> {
    if (maxSessions <= 0) {
      return { allowed: true, currentCount: 0, removedSessions: [] };
    }

    const sessions = await this.getUserSessions(tenantId, userId);
    const currentCount = sessions.length;
    const removedSessions: string[] = [];

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
  async cleanupOrphanedSessions(tenantId: string): Promise<number> {
    const pattern = `session:${tenantId}:*`;
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );

      cursor = nextCursor;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (!data) {continue;}

        try {
          const session = JSON.parse(data) as UserSession;
          
          // Check if session is expired
          if (session.expiresAt < Date.now()) {
            await this.redis.del(key);
            deletedCount++;
          }
        } catch (error) {
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
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get Redis key for a session
   */
  private getSessionKey(tenantId: string, userId: string, sessionId: string): string {
    return `session:${tenantId}:${userId}:${sessionId}`;
  }

  /**
   * Get Redis key for user session index
   */
  private getUserSessionIndexKey(tenantId: string, userId: string): string {
    return `session:index:${tenantId}:${userId}`;
  }
}
