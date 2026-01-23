/**
 * Login History Service
 * 
 * Manages user login history tracking
 */

import { getDatabaseClient } from '@coder/shared';

export interface LoginHistoryEntry {
  id: string;
  provider: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  country: string | null;
  city: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: Date;
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  userId: string | null,
  sessionId: string | null,
  provider: string,
  ipAddress: string | null,
  userAgent: string | null,
  deviceFingerprint: string | null,
  country: string | null,
  city: string | null,
  success: boolean,
  failureReason?: string | null
): Promise<void> {
  const db = getDatabaseClient();

  await db.userLoginHistory.create({
    data: {
      userId: userId || undefined,
      sessionId: sessionId || undefined,
      provider,
      ipAddress,
      userAgent,
      deviceFingerprint,
      country,
      city,
      success,
      failureReason: failureReason || null,
    },
  });
}

/**
 * Get login history for a user
 */
export async function getUserLoginHistory(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  loginHistory: LoginHistoryEntry[];
  total: number;
}> {
  const db = getDatabaseClient();

  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 50, 100); // Max 100 per page
  const skip = (page - 1) * limit;

  const where: any = {
    userId,
  };

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [loginHistory, total] = await Promise.all([
    db.userLoginHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.userLoginHistory.count({ where }),
  ]);

  return {
    loginHistory,
    total,
  };
}



