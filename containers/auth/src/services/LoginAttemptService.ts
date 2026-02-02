/**
 * Login Attempts Service
 * 
 * Tracks login attempts, implements account lockout, and provides
 * rate limiting for authentication endpoints.
 * 
 * Features:
 * - Records all login attempts (success and failure) in database
 * - Tracks failed attempts in Redis for fast lookups
 * - Locks account after 5 failed attempts within 15 minutes
 * - Lockout duration: 30 minutes
 * - Clears attempts on successful login
 * - Updates User model (failedLoginAttempts, lockedUntil)
 */

import { getDatabaseClient } from '@coder/shared';
import { redis } from '../utils/redis';
import { cacheKeys } from '../utils/cacheKeys';
import { log } from '../utils/logger';

/**
 * Configuration constants
 */
const LOCKOUT_ATTEMPTS = 5; // Number of failed attempts before lockout
const LOCKOUT_WINDOW = 15 * 60; // 15 minutes in seconds (sliding window)
const LOCKOUT_DURATION = 30 * 60; // 30 minutes lockout duration in seconds

/**
 * Record a login attempt (success or failure)
 * 
 * Stores attempt in database for audit trail and updates Redis counters
 * for rate limiting. On failure, increments attempt counter and locks account
 * if threshold is reached. On success, clears all counters.
 * 
 * @param email - Email address used for login attempt
 * @param userId - User ID if user exists (null for non-existent users)
 * @param ipAddress - IP address of the login attempt
 * @param userAgent - User agent string
 * @param success - Whether the login attempt was successful
 */
export async function recordLoginAttempt(
  email: string,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  success: boolean
): Promise<void> {
  const db = getDatabaseClient() as any;
  
  try {
    // Store in database for audit trail
    await db.loginAttempt.create({
      data: {
        email,
        userId,
        ipAddress,
        userAgent,
        success,
      },
    });

    // Update User model if user exists
    if (userId) {
      if (success) {
        // Clear failed attempts and lockout on successful login
        await db.user.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Increment failed attempts counter
        await db.user.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: {
              increment: 1,
            },
          },
        });
      }
    }

    // Track in Redis for rate limiting (only for failed attempts)
    if (!success) {
      const attemptsKey = cacheKeys.loginAttempts(email);
      
      // Increment attempt counter with sliding window
      const attempts = await redis.incr(attemptsKey);
      
      // Set expiration on first attempt
      if (attempts === 1) {
        await redis.expire(attemptsKey, LOCKOUT_WINDOW);
      }
      
      // Lock account if threshold reached
      if (attempts >= LOCKOUT_ATTEMPTS && userId) {
        const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION * 1000);
        await db.user.update({
          where: { id: userId },
          data: {
            lockedUntil: lockoutUntil,
          },
        });
        
        log.warn('Account locked due to too many failed login attempts', {
          userId,
          email,
          attempts,
          lockoutUntil,
          service: 'auth',
        });
      }
    } else {
      // Clear attempt counter on success
      const attemptsKey = cacheKeys.loginAttempts(email);
      await redis.del(attemptsKey);
    }
  } catch (error) {
    log.error('Error recording login attempt', error as Error, {
      email,
      userId,
      success,
      service: 'auth',
    });
    // Don't throw - login attempt tracking shouldn't block authentication
  }
}

/**
 * Check if an account is locked
 * 
 * @param email - Email address to check
 * @returns Promise resolving to true if account is locked, false otherwise
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const db = getDatabaseClient() as any;
  
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        lockedUntil: true,
      },
    });

    if (!user || !user.lockedUntil) {
      return false;
    }

    // Check if lockout has expired
    if (user.lockedUntil < new Date()) {
      // Clear lockout
      await db.user.update({
        where: { id: user.id },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });
      
      // Clear Redis counter
      const attemptsKey = cacheKeys.loginAttempts(email);
      await redis.del(attemptsKey);
      
      return false;
    }

    return true;
  } catch (error) {
    log.error('Error checking account lockout', error as Error, { email, service: 'auth' });
    // Fail open - don't block login if we can't check lockout
    return false;
  }
}

/**
 * Get failed login attempts count for an email
 * 
 * @param email - Email address
 * @returns Promise resolving to number of failed attempts
 */
export async function getFailedAttemptsCount(email: string): Promise<number> {
  try {
    const attemptsKey = cacheKeys.loginAttempts(email);
    const count = await redis.get(attemptsKey);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    log.error('Error getting failed attempts count', error as Error, { email, service: 'auth' });
    return 0;
  }
}

/**
 * Clear failed login attempts for an email
 * 
 * @param email - Email address
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    const attemptsKey = cacheKeys.loginAttempts(email);
    await redis.del(attemptsKey);
  } catch (error) {
    log.error('Error clearing failed attempts', error as Error, { email, service: 'auth' });
  }
}



