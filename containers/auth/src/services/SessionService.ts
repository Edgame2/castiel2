/**
 * Session Service
 * 
 * Manages user sessions with JWT tokens, refresh tokens, device fingerprinting,
 * and session rotation. Integrates with Fastify JWT plugin.
 * 
 * Features:
 * - Session creation with access and refresh tokens
 * - JWT secret rotation support
 * - Device fingerprinting for security
 * - Concurrent session limits (max 10 sessions per user)
 * - Session validation and refresh
 * - Session revocation
 * - Tenant context in sessions
 */

import { randomBytes, createHash } from 'crypto';
import { FastifyInstance } from 'fastify';
import { getDatabaseClient } from '@coder/shared';
import { redis } from '../utils/redis';
import { cacheKeys } from '../utils/cacheKeys';
import { log } from '../utils/logger';
import { getDeviceInfo } from '../utils/deviceUtils';
import { getLocationFromIP, LocationInfo } from '../utils/geolocationUtils';

/**
 * Configuration constants
 */
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRATION || '8h'; // Short-lived access token
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'; // Long-lived refresh token
const MAX_CONCURRENT_SESSIONS = 10; // Maximum concurrent sessions per user
const SESSION_ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // Update lastActivityAt max every 5 minutes

/**
 * JWT Secret rotation support
 * Supports both current and old secrets for seamless rotation
 */
function getJWTSecrets(): Array<{ id: string; secret: string; isActive: boolean }> {
  const secrets: Array<{ id: string; secret: string; isActive: boolean }> = [];
  
  if (process.env.JWT_SECRET) {
    secrets.push({ id: 'current', secret: process.env.JWT_SECRET, isActive: true });
  }
  
  if (process.env.JWT_SECRET_OLD) {
    secrets.push({ id: 'old', secret: process.env.JWT_SECRET_OLD, isActive: false });
  }
  
  return secrets;
}

/**
 * Parse expiration string (e.g., "8h", "30d") to milliseconds
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhdw])$/i);
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

/**
 * Generate device fingerprint from user agent and other headers
 * 
 * @param userAgent - User agent string
 * @param acceptLanguage - Accept-Language header (optional)
 * @returns SHA-256 hash of device fingerprint
 */
export function generateDeviceFingerprint(
  userAgent: string | null,
  acceptLanguage?: string | null
): string {
  const components = [
    userAgent || '',
    acceptLanguage || '',
  ];
  
  const fingerprint = components.join('|');
  return createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Session data structure (tenant-only).
 */
export interface SessionData {
  userId: string;
  tenantId?: string;
  roleId?: string;
  isSuperAdmin?: boolean;
  sessionId: string;
  secretId: string;
}

/**
 * Create a new session for a user (tenant-scoped).
 *
 * @param userId - User ID
 * @param tenantId - Tenant ID (optional, can be set later)
 * @param isRememberMe - Whether to use long-lived refresh token
 * @param ipAddress - IP address of the client
 * @param userAgent - User agent string
 * @param acceptLanguage - Accept-Language header (optional)
 * @param fastify - Fastify instance for JWT signing
 * @returns Promise resolving to access token, refresh token, and session ID
 */
export async function createSession(
  userId: string,
  tenantId: string | null,
  isRememberMe: boolean,
  ipAddress: string | null,
  userAgent: string | null,
  acceptLanguage: string | null | undefined,
  fastify: FastifyInstance
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const db = getDatabaseClient() as any;

  let roleId: string | undefined;
  let isSuperAdmin = false;

  if (tenantId) {
    const membership = await db.membership.findFirst({
      where: {
        userId,
        tenantId,
        status: 'active',
      },
      include: { role: true },
    });

    if (membership) {
      const m = membership as { roleId?: string; role?: { isSuperAdmin?: boolean } };
      roleId = m.roleId;
      isSuperAdmin = m.role?.isSuperAdmin || false;
    }
  }

  const maxSessions = MAX_CONCURRENT_SESSIONS;

  // Enforce concurrent session limit
  const activeSessionCount = await db.session.count({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
  });
  
  if (activeSessionCount >= maxSessions) {
    // Revoke oldest session
    const oldestSession = await db.session.findFirst({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { lastActivityAt: 'asc' },
    });
    
    if (oldestSession) {
      await revokeSession(oldestSession.id, db);
    }
  }
  
  // Generate session ID
  const sessionId = randomBytes(32).toString('hex');
  
  // Calculate expiration times
  const accessTokenExpiresIn = ACCESS_TOKEN_EXPIRES_IN;
  const refreshTokenExpiresIn = isRememberMe ? REFRESH_TOKEN_EXPIRES_IN : ACCESS_TOKEN_EXPIRES_IN;
  
  const accessTokenExpiresAt = new Date(Date.now() + parseExpiresIn(accessTokenExpiresIn));
  const refreshTokenExpiresAt = new Date(Date.now() + parseExpiresIn(refreshTokenExpiresIn));
  
  // Get current JWT secret
  const secrets = getJWTSecrets();
  const currentSecret = secrets.find(s => s.isActive);
  if (!currentSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  // Generate device fingerprint
  const deviceFingerprint = generateDeviceFingerprint(userAgent, acceptLanguage);
  
  // Get device info
  const deviceInfo = getDeviceInfo(userAgent);
  
  // Get location from IP (async, but don't block on it)
  const locationInfo: LocationInfo = await getLocationFromIP(ipAddress).catch((): LocationInfo => ({}));
  
  const sessionData: SessionData = {
    userId,
    tenantId: tenantId || undefined,
    roleId,
    isSuperAdmin,
    sessionId,
    secretId: currentSecret.id,
  };
  
  // Generate access token (short-lived)
  const accessToken = (fastify as any).jwt.sign(sessionData, {
    expiresIn: accessTokenExpiresIn,
  });
  
  // Generate refresh token (long-lived if remember me)
  const refreshTokenData = {
    userId,
    sessionId,
    type: 'refresh',
    secretId: currentSecret.id,
  };
  
  const refreshToken = (fastify as any).jwt.sign(refreshTokenData, {
    expiresIn: refreshTokenExpiresIn,
  });
  
  // Store session in Redis (primary cache)
  const redisKey = cacheKeys.sessionData(sessionId);
  const redisExpiry = Math.floor((refreshTokenExpiresAt.getTime() - Date.now()) / 1000);
  
  await redis.setex(
    redisKey,
    redisExpiry,
    JSON.stringify({
      ...sessionData,
      lastActivityAt: new Date().toISOString(),
      fingerprint: deviceFingerprint,
    })
  );
  
  // Store session in database (audit trail)
  await db.session.create({
    data: {
      id: sessionId,
      userId,
      token: sessionId,
      refreshToken,
      tenantId,
      deviceInfo: deviceFingerprint, // Legacy field
      deviceName: deviceInfo.name,
      deviceType: deviceInfo.type,
      deviceFingerprint: deviceFingerprint,
      ipAddress,
      userAgent,
      country: locationInfo.country,
      city: locationInfo.city,
      isRememberMe,
      expiresAt: refreshTokenExpiresAt, // Use refresh token expiration
      lastActivityAt: new Date(),
    },
  });
  
  return { accessToken, refreshToken, sessionId };
}

/**
 * Validate and refresh a session
 * 
 * @param refreshToken - Refresh token string
 * @param userAgent - Current user agent (for fingerprint validation)
 * @param fastify - Fastify instance for JWT verification/signing
 * @returns Promise resolving to new access token and session data, or null if invalid
 */
export async function refreshSession(
  refreshToken: string,
  userAgent: string | null,
  fastify: FastifyInstance
): Promise<{ accessToken: string; sessionData: SessionData } | null> {
  const db = getDatabaseClient() as any;
  let sessionId: string | undefined;
  
  try {
    // Verify refresh token
    let decoded: any;
    const secrets = getJWTSecrets();
    
    try {
      decoded = (fastify as any).jwt.verify(refreshToken);
    } catch (error) {
      // Token invalid or expired
      return null;
    }
    
    if (!decoded || decoded.type !== 'refresh' || !decoded.sessionId || !decoded.userId) {
      return null;
    }
    
    sessionId = decoded.sessionId;
    const userId = decoded.userId;
    
    // Check session in Redis first
    if (!sessionId) return null;
    const redisKey = cacheKeys.sessionData(sessionId);
    const cached = await redis.get(redisKey);
    
    let sessionData: SessionData | null = null;
    
    if (cached) {
      try {
        const session = JSON.parse(cached);
        const tid = (session as { tenantId?: string }).tenantId;
        sessionData = {
          userId: session.userId,
          tenantId: tid,
          roleId: session.roleId,
          isSuperAdmin: session.isSuperAdmin,
          sessionId: session.sessionId,
          secretId: session.secretId,
        };
      } catch (parseError) {
        // Corrupted cache data, fall through to database
        log.warn('Failed to parse cached session data', { sessionId, service: 'auth' });
      }
    }

    if (!sessionData) {
      // Fallback to database (flat session; resolve membership separately)
      const session = await db.session.findUnique({
        where: { id: sessionId },
      });

      const exp = session ? (session as { expiresAt?: Date }).expiresAt : undefined;
      const rev = session ? (session as { revokedAt?: Date }).revokedAt : undefined;
      if (!session || (exp != null && exp < new Date()) || rev != null) {
        return null;
      }

      const sid = session as { id: string; userId?: string; tenantId?: string };
      const userIdFromSession = sid.userId ?? (session as { partitionKey?: string }).partitionKey;
      const tid = sid.tenantId;
      let membership: { roleId?: string; role?: { isSuperAdmin?: boolean } } | null = null;
      if (tid && userIdFromSession) {
        membership = await db.membership.findFirst({
          where: { userId: userIdFromSession, tenantId: tid, status: 'active' },
          include: { role: true },
        }) as { roleId?: string; role?: { isSuperAdmin?: boolean } } | null;
      }

      sessionData = {
        userId: userIdFromSession!,
        tenantId: tid || undefined,
        roleId: membership?.roleId,
        isSuperAdmin: membership?.role?.isSuperAdmin || false,
        sessionId: sid.id,
        secretId: 'current',
      };
    }
    
    if (!sessionData || sessionData.userId !== userId) {
      return null;
    }
    
    // Check blacklist
    const blacklisted = await redis.get(cacheKeys.sessionBlacklist(sessionId));
    if (blacklisted) {
      return null;
    }
    
    // Validate device fingerprint (warn on mismatch but allow)
    if (userAgent && cached) {
      try {
        const session = JSON.parse(cached);
        const currentFingerprint = generateDeviceFingerprint(userAgent);
        if (session.fingerprint && session.fingerprint !== currentFingerprint) {
          log.warn('Session fingerprint mismatch', { sessionId, userId, service: 'auth' });
        }
      } catch (parseError) {
        // Corrupted cache data, ignore fingerprint check
        log.warn('Failed to parse cached session for fingerprint check', { sessionId, service: 'auth' });
      }
    }
    
    // Update last activity (throttled)
    await updateSessionActivity(sessionId!);
    
    // Generate new access token
    const currentSecret = secrets.find(s => s.isActive);
    if (!currentSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const newAccessToken = (fastify as any).jwt.sign(
      {
        ...sessionData,
        secretId: currentSecret.id,
      },
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      }
    );
    
    return {
      accessToken: newAccessToken,
      sessionData,
    };
  } catch (error) {
    log.error('Error refreshing session', error as Error, { sessionId: sessionId || 'unknown', service: 'auth' });
    return null;
  }
}

/**
 * Validate an access token and return session data
 * 
 * @param accessToken - Access token string
 * @param userAgent - Current user agent (for fingerprint validation)
 * @param fastify - Fastify instance for JWT verification
 * @returns Promise resolving to session data or null if invalid
 */
export async function validateSession(
  accessToken: string,
  userAgent: string | null,
  fastify: FastifyInstance
): Promise<SessionData | null> {
  let sessionId: string | undefined;
  try {
    // Verify token
    const decoded = (fastify as any).jwt.verify(accessToken) as SessionData & { type?: string };
    
    if (!decoded || decoded.type === 'refresh' || !decoded.sessionId) {
      return null;
    }
    
    sessionId = decoded.sessionId;
    
    // Check blacklist
    if (!sessionId) return null;
    const blacklisted = await redis.get(cacheKeys.sessionBlacklist(sessionId));
    if (blacklisted) {
      return null;
    }
    
    // Check Redis cache
    const redisKey = cacheKeys.sessionData(sessionId);
    const cached = await redis.get(redisKey);
    
    if (cached) {
      try {
        const session = JSON.parse(cached);
        
        // Validate device fingerprint
        if (userAgent && session.fingerprint) {
          const currentFingerprint = generateDeviceFingerprint(userAgent);
          if (session.fingerprint !== currentFingerprint) {
            log.warn('Session fingerprint mismatch', { sessionId, service: 'auth' });
          }
        }
        
        // Update activity (throttled)
        updateSessionActivity(sessionId).catch((error: unknown) => {
          log.error('Error updating session activity', error as Error, { sessionId, service: 'auth' });
        });
        
        const tid = (session as { tenantId?: string }).tenantId;
        return {
          userId: session.userId,
          tenantId: tid,
          roleId: session.roleId,
          isSuperAdmin: session.isSuperAdmin,
          sessionId: session.sessionId,
          secretId: session.secretId,
        };
      } catch (parseError) {
        log.warn('Failed to parse cached session data', { sessionId, service: 'auth' });
      }
    }

    if (!sessionId) return null;
    const db = getDatabaseClient() as any;
    const session = await db.session.findUnique({
      where: { id: sessionId },
    });

    const exp = session ? (session as { expiresAt?: Date }).expiresAt : undefined;
    const rev = session ? (session as { revokedAt?: Date }).revokedAt : undefined;
    if (!session || (exp != null && exp < new Date()) || rev != null) {
      return null;
    }

    const sid = session as { id: string; userId?: string; tenantId?: string; partitionKey?: string };
    const userIdFromSession = sid.userId ?? sid.partitionKey;
    const tid = sid.tenantId;
    let membership: { roleId?: string; role?: { isSuperAdmin?: boolean } } | null = null;
    if (tid && userIdFromSession) {
      membership = await db.membership.findFirst({
        where: { userId: userIdFromSession, tenantId: tid, status: 'active' },
        include: { role: true },
      }) as { roleId?: string; role?: { isSuperAdmin?: boolean } } | null;
    }

    return {
      userId: userIdFromSession!,
      tenantId: tid || undefined,
      roleId: membership?.roleId,
      isSuperAdmin: membership?.role?.isSuperAdmin || false,
      sessionId: sid.id,
      secretId: 'current',
    };
  } catch (error) {
    const errorSessionId = (error as any)?.sessionId || 'unknown';
    log.error('Error validating session', error as Error, { sessionId: errorSessionId, service: 'auth' });
    return null;
  }
}

/**
 * Revoke a session (logout)
 * 
 * @param sessionId - Session ID to revoke
 * @param db - Optional database client (for transaction support)
 */
export async function revokeSession(sessionId: string, db?: any): Promise<void> {
  const database = (db || getDatabaseClient()) as any;
  
  try {
    // Add to blacklist in Redis
    const blacklistKey = cacheKeys.sessionBlacklist(sessionId);
    // Set TTL to match max token expiration (30 days)
    await redis.setex(blacklistKey, 30 * 24 * 60 * 60, '1');
    
    // Remove from cache
    await redis.del(cacheKeys.sessionData(sessionId));
    
    // Mark as revoked in database
    await database.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    log.error('Error revoking session', error as Error, { sessionId, service: 'auth' });
    throw error;
  }
}

/**
 * Revoke all sessions for a user
 * 
 * @param userId - User ID
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = getDatabaseClient() as any;
  
  const sessions = await db.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  
  await Promise.all(sessions.map((session: { id: string }) => revokeSession(session.id, db)));
}

/**
 * Update session activity (throttled to max every 5 minutes)
 * 
 * @param sessionId - Session ID
 */
async function updateSessionActivity(sessionId: string): Promise<void> {
  const activityKey = cacheKeys.sessionActivity(sessionId);
  const lastUpdate = await redis.get(activityKey);
  
  const now = Date.now();
  if (lastUpdate) {
    const lastUpdateTime = parseInt(lastUpdate, 10);
    if (now - lastUpdateTime < SESSION_ACTIVITY_UPDATE_INTERVAL) {
      return; // Skip update if too recent
    }
  }
  
  // Update timestamp
  await redis.setex(activityKey, 10 * 60, now.toString()); // 10 minute TTL
  
  // Update database (async, don't wait)
  const db = getDatabaseClient() as any;
  db.session.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  }).catch((error: unknown) => {
    log.error('Error updating session activity', error as Error, { sessionId, service: 'auth' });
  });
}

/**
 * Switch tenant in session
 *
 * @param sessionId - Session ID
 * @param tenantId - New tenant ID
 */
export async function switchSessionTenant(
  sessionId: string,
  tenantId: string
): Promise<SessionData | null> {
  const db = getDatabaseClient() as any;

  const session = await db.session.findUnique({
    where: { id: sessionId },
  });

  const exp = session ? (session as { expiresAt?: Date }).expiresAt : undefined;
  const rev = session ? (session as { revokedAt?: Date }).revokedAt : undefined;
  if (!session || (exp != null && exp < new Date()) || rev != null) {
    return null;
  }

  const userIdFromSession = (session as { userId?: string }).userId ?? (session as { partitionKey?: string }).partitionKey;
  const membership = await db.membership.findFirst({
    where: { userId: userIdFromSession!, tenantId, status: 'active' },
    include: { role: true },
  });

  if (!membership) {
    return null; // User not member of tenant
  }

  const m = membership as { roleId?: string; role?: { isSuperAdmin?: boolean } };
  await db.session.update({
    where: { id: sessionId },
    data: { tenantId },
  });

  const redisKey = cacheKeys.sessionData(sessionId);
  const cached = await redis.get(redisKey);
  if (cached) {
    try {
      const sessionData = JSON.parse(cached);
      sessionData.tenantId = tenantId;
      sessionData.roleId = m.roleId;
      sessionData.isSuperAdmin = m.role?.isSuperAdmin || false;

      const ttl = await redis.ttl(redisKey);
      if (ttl > 0) {
        await redis.setex(redisKey, ttl, JSON.stringify(sessionData));
      }
    } catch (parseError) {
      log.warn('Failed to parse cached session data during tenant switch', { sessionId, service: 'auth' });
      await redis.del(redisKey);
    }
  }

  return {
    userId: userIdFromSession!,
    tenantId,
    roleId: m.roleId,
    isSuperAdmin: m.role?.isSuperAdmin || false,
    sessionId: (session as { id: string }).id,
    secretId: 'current',
  };
}
