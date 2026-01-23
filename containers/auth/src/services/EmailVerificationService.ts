/**
 * Email Verification Service
 * 
 * Manages email verification tokens and verification flow
 */

import { randomBytes } from 'crypto';
import { getDatabaseClient } from '@coder/shared';
import { log } from '../utils/logger';
import { redis } from '../utils/redis';
import { cacheKeys } from '../utils/cacheKeys';

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate email verification token
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Store verification token (in user record or separate table)
 * For simplicity, we'll store it in a JSON field or use a simple in-memory/Redis cache
 * In production, consider a dedicated EmailVerificationToken table
 */
export async function generateAndStoreVerificationToken(userId: string): Promise<string> {
  const db = getDatabaseClient();
  const token = generateVerificationToken();
  const expiresInSeconds = VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Store token in Redis with expiry
  const tokenKey = cacheKeys.emailVerification(token);
  await redis.setex(tokenKey, expiresInSeconds, JSON.stringify({
    userId,
    email: user.email,
    createdAt: new Date().toISOString(),
  }));

  return token;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  const tokenKey = cacheKeys.emailVerification(token);
  const tokenData = await redis.get(tokenKey);

  if (!tokenData) {
    return { success: false, error: 'Invalid or expired verification token' };
  }

  try {
    const data = JSON.parse(tokenData);
    const userId = data.userId;

    // Delete token (single-use)
    await redis.del(tokenKey);

    // Mark email as verified
    const db = getDatabaseClient();
    await db.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    return { success: true, userId };
  } catch (error: any) {
    log.error('Failed to verify email token', error, { token, service: 'auth' });
    return { success: false, error: 'Failed to process verification token' };
  }
}

/**
 * Send verification email to user
 * Generates token and publishes event for notification service to send email
 */
export async function sendVerificationEmail(userId: string): Promise<string> {
  const db = getDatabaseClient();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, isEmailVerified: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.isEmailVerified) {
    throw new Error('Email is already verified');
  }

  const token = await generateAndStoreVerificationToken(userId);
  
  // Publish event for notification service to send email
  // Import here to avoid circular dependency
  const { publishEventSafely, createBaseEvent } = await import('../events/publishers/AuthEventPublisher');
  const { AuthEvent } = await import('../types/events');
  
  await publishEventSafely({
    ...createBaseEvent('user.email_verification_requested', userId, undefined, undefined, {
      userId,
      email: user.email,
      verificationToken: token, // Include token in event data for email service
    }),
  } as AuthEvent);
  
  log.info('Verification token generated and event published', { userId, email: user.email, service: 'auth' });
  
  return token;
}

/**
 * Verify email with token
 */
export async function verifyEmailWithToken(userId: string, token: string): Promise<boolean> {
  const tokenKey = cacheKeys.emailVerification(token);
  const tokenData = await redis.get(tokenKey);

  if (!tokenData) {
    throw new Error('Invalid or expired verification token');
  }

  try {
    const data = JSON.parse(tokenData);
    
    // Verify token belongs to this user
    if (data.userId !== userId) {
      throw new Error('Token does not match user');
    }

    // Delete token (single-use)
    await redis.del(tokenKey);

    // Mark email as verified
    const db = getDatabaseClient();
    await db.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    return true;
  } catch (error: any) {
    log.error('Failed to verify email token', error, { userId, token, service: 'auth' });
    throw error;
  }
}

