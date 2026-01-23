/**
 * Password Reset Service
 * 
 * Manages password reset tokens and flow.
 * 
 * Features:
 * - Generates secure, single-use reset tokens
 * - Stores tokens in Redis with 1-hour expiration
 * - Rate limiting (3 requests per hour per email)
 * - Token validation and invalidation
 * - Integration with password history service
 */

import { randomBytes } from 'crypto';
import { getDatabaseClient } from '@coder/shared';
import { redis } from '../utils/redis';
import { setPassword } from './PasswordHistoryService';
import { cacheKeys } from '../utils/cacheKeys';

/**
 * Configuration constants
 */
const TOKEN_EXPIRATION = 60 * 60; // 1 hour in seconds
const MAX_REQUESTS_PER_HOUR = 3; // Rate limit: 3 requests per hour per email
const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds

/**
 * Generate a secure password reset token
 * 
 * @returns Cryptographically secure random token (32 bytes = 64 hex characters)
 */
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get Redis key for password reset token
 */
function getResetTokenKey(token: string): string {
  return cacheKeys.passwordReset(token);
}

/**
 * Get Redis key for password reset rate limit
 */
function getRateLimitKey(email: string): string {
  return `password-reset:ratelimit:${email}`;
}

/**
 * Request a password reset (forgot password)
 * 
 * Generates a reset token, stores it in Redis, and returns it.
 * The token should be sent to the user via email.
 * 
 * @param email - User's email address
 * @returns Promise resolving to reset token, or null if user not found or rate limited
 * @throws Error if rate limit exceeded
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  const db = getDatabaseClient();
  
  // Check rate limit
  const rateLimitKey = getRateLimitKey(email);
  const requestCount = await redis.incr(rateLimitKey);
  
  if (requestCount === 1) {
    // Set expiration on first request
    await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
  }
  
  if (requestCount > MAX_REQUESTS_PER_HOUR) {
    throw new Error(
      `Too many password reset requests. Please try again in ${Math.ceil(
        (await redis.ttl(rateLimitKey)) / 60
      )} minutes.`
    );
  }
  
  // Find user by email
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      isActive: true,
      passwordHash: true,
    },
  });
  
  // Don't reveal if user exists (security best practice)
  // Always return success message, but only generate token if user exists
  if (!user || !user.isActive) {
    // Still increment rate limit to prevent email enumeration
    return null; // Return null to indicate no token generated (user not found or inactive)
  }
  
  // Check if user has password set (OAuth-only users can't reset password)
  if (!user.passwordHash) {
    return null; // User doesn't have password to reset
  }
  
  // Generate reset token
  const token = generateResetToken();
  const tokenKey = getResetTokenKey(token);
  
  // Store token in Redis with expiration (1 hour)
  // Store user ID and email for validation
  await redis.setex(
    tokenKey,
    TOKEN_EXPIRATION,
    JSON.stringify({
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
    })
  );
  
  return token;
}

/**
 * Validate a password reset token
 * 
 * @param token - Reset token to validate
 * @returns Promise resolving to user ID and email if token is valid, null otherwise
 */
export async function validateResetToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  if (!token || token.length !== 64) {
    // Token should be 64 hex characters (32 bytes)
    return null;
  }
  
  const tokenKey = getResetTokenKey(token);
  const tokenData = await redis.get(tokenKey);
  
  if (!tokenData) {
    return null; // Token not found or expired
  }
  
  try {
    const data = JSON.parse(tokenData);
    return {
      userId: data.userId,
      email: data.email,
    };
  } catch (error) {
    const { log } = await import('../utils/logger');
    log.error('Error parsing reset token data', error as Error, { service: 'auth' });
    return null;
  }
}

/**
 * Reset password using a reset token
 * 
 * Validates the token, sets the new password, and invalidates the token.
 * 
 * @param token - Password reset token
 * @param newPassword - New password to set
 * @returns Promise resolving when password is reset successfully
 * @throws Error if token is invalid or password validation fails
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<void> {
  // Validate token
  const tokenData = await validateResetToken(token);
  if (!tokenData) {
    throw new Error('Invalid or expired reset token');
  }
  
  const { userId, email } = tokenData;
  
  // Get user info for password validation
  const db = getDatabaseClient();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Set new password (validates password, checks history, invalidates sessions)
  await setPassword(
    userId,
    newPassword,
    {
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    }
  );
  
  // Invalidate the reset token (single-use)
  const tokenKey = getResetTokenKey(token);
  await redis.del(tokenKey);
  
  // Clear rate limit for this email (successful reset)
  const rateLimitKey = getRateLimitKey(email);
  await redis.del(rateLimitKey);
}

/**
 * Invalidate a password reset token (manual revocation)
 * 
 * @param token - Token to invalidate
 */
export async function invalidateResetToken(token: string): Promise<void> {
  const tokenKey = getResetTokenKey(token);
  await redis.del(tokenKey);
}

/**
 * Get remaining time for a reset token
 * 
 * @param token - Reset token
 * @returns Promise resolving to seconds remaining, or null if token doesn't exist
 */
export async function getTokenTimeRemaining(token: string): Promise<number | null> {
  const tokenKey = getResetTokenKey(token);
  const ttl = await redis.ttl(tokenKey);
  
  if (ttl < 0) {
    return null; // Token doesn't exist or has expired
  }
  
  return ttl;
}
