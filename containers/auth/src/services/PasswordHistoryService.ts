/**
 * Password History Service
 * 
 * Manages password history to prevent password reuse.
 * Stores last 5 passwords per user and checks new passwords against history.
 * 
 * Features:
 * - Prevents reuse of last 5 passwords
 * - Automatic cleanup (keeps only last 5)
 * - Integrates with password change flow
 * - Checks password against history before allowing change
 */

import { getDatabaseClient } from '@coder/shared';
import { verifyPassword } from '../utils/passwordUtils';

/**
 * Maximum number of passwords to keep in history
 */
const MAX_PASSWORD_HISTORY = 5;

/**
 * Check if a password matches any password in the user's history
 * 
 * @param userId - User ID
 * @param password - Plain text password to check
 * @returns Promise resolving to true if password is in history, false otherwise
 */
export async function isPasswordInHistory(
  userId: string,
  password: string
): Promise<boolean> {
  const db = getDatabaseClient() as any;
  
  // Get password history (last 5)
  const history = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_PASSWORD_HISTORY,
  });
  
  // Check if password matches any historical password
  for (const oldPassword of history) {
    const matches = await verifyPassword(password, oldPassword.passwordHash);
    if (matches) {
      return true;
    }
  }
  
  return false;
}

/**
 * Add a password to the user's history
 * 
 * Automatically cleans up old history entries to keep only the last MAX_PASSWORD_HISTORY.
 * 
 * @param userId - User ID
 * @param passwordHash - Bcrypt hash of the password to add
 */
export async function addPasswordToHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  const db = getDatabaseClient() as any;
  
  // Add new password to history
  await db.passwordHistory.create({
    data: {
      userId,
      passwordHash,
    },
  });
  
  // Clean up old history entries (keep only last MAX_PASSWORD_HISTORY)
  await cleanupPasswordHistory(userId);
}

/**
 * Clean up password history, keeping only the last MAX_PASSWORD_HISTORY entries
 * 
 * @param userId - User ID
 */
export async function cleanupPasswordHistory(userId: string): Promise<void> {
  const db = getDatabaseClient() as any;
  
  // Get all history entries ordered by creation date
  const allHistory = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  
  // If we have more than MAX_PASSWORD_HISTORY, delete the oldest ones
  if (allHistory.length > MAX_PASSWORD_HISTORY) {
    const toDelete = allHistory.slice(MAX_PASSWORD_HISTORY).map((h: { id: string }) => h.id);
    
    if (toDelete.length > 0) {
      await db.passwordHistory.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  }
}

/**
 * Get password history for a user (for admin/audit purposes)
 * 
 * @param userId - User ID
 * @param limit - Maximum number of entries to return (default: MAX_PASSWORD_HISTORY)
 * @returns Promise resolving to array of password history entries (without password hashes for security)
 */
export async function getPasswordHistory(
  userId: string,
  limit: number = MAX_PASSWORD_HISTORY
): Promise<Array<{
  id: string;
  createdAt: Date;
}>> {
  const db = getDatabaseClient() as any;
  
  const history = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      // Note: We don't return passwordHash for security reasons
    },
  });
  
  return history;
}

/**
 * Clear all password history for a user
 * 
 * Useful for account reset or when user requests data deletion.
 * 
 * @param userId - User ID
 */
export async function clearPasswordHistory(userId: string): Promise<void> {
  const db = getDatabaseClient() as any;
  
  await db.passwordHistory.deleteMany({
    where: { userId },
  });
}

/**
 * Set a new password for a user
 * 
 * Validates password, checks history, adds old password to history,
 * updates user password, and invalidates all sessions.
 * 
 * @param userId - User ID
 * @param newPassword - New password (plain text)
 * @param userInfo - Optional user info for password validation
 */
export async function setPassword(
  userId: string,
  newPassword: string,
  userInfo?: { email?: string; firstName?: string; lastName?: string }
): Promise<void> {
  const db = getDatabaseClient() as any;
  
  // 1. Get user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // 2. Validate new password (basic validation; org policy uses organizationId from user context when available)
  const { validatePassword: validatePasswordBasic } = await import('../utils/passwordUtils');
  const basicValidation = await validatePasswordBasic(newPassword, {
    email: userInfo?.email || user.email,
    firstName: userInfo?.firstName || user.firstName || undefined,
    lastName: userInfo?.lastName || user.lastName || undefined,
  });
  
  if (!basicValidation.valid) {
    throw new Error(basicValidation.errors.join(', '));
  }
  
  // 3. Check password history (if user had a password before)
  if (user.passwordHash) {
    const isInHistory = await isPasswordInHistory(userId, newPassword);
    if (isInHistory) {
      throw new Error('Cannot reuse recent passwords. Please choose a different password.');
    }
  }
  
  // 4. Hash new password
  const { hashPassword } = await import('../utils/passwordUtils');
  const newPasswordHash = await hashPassword(newPassword);
  
  // 5. Add old password to history if it exists
  if (user.passwordHash) {
    await addPasswordToHistory(userId, user.passwordHash);
  }
  
  // 6. Update user password
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });
  
  // 7. Invalidate all user sessions (force re-login)
  const { revokeAllUserSessions } = await import('./SessionService');
  await revokeAllUserSessions(userId);
}

/**
 * Change user password with history validation
 * 
 * This is a convenience function that combines password validation,
 * history checking, hashing, and history management.
 * 
 * @param userId - User ID
 * @param oldPassword - Current password (for verification)
 * @param newPassword - New password to set
 * @param userInfo - Optional user information for password validation
 * @returns Promise resolving when password is changed successfully
 * @throws Error if password change fails (invalid old password, weak new password, password in history, etc.)
 */
export async function changePasswordWithHistory(
  userId: string,
  oldPassword: string,
  newPassword: string,
  userInfo?: { email?: string; firstName?: string; lastName?: string; organizationId?: string | null }
): Promise<void> {
  const db = getDatabaseClient() as any;
  
  // 1. Get user and verify old password
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.passwordHash) {
    throw new Error('User has no password set. Please set an initial password.');
  }
  
  // Verify old password
  const { verifyPassword } = await import('../utils/passwordUtils');
  const validOldPassword = await verifyPassword(oldPassword, user.passwordHash);
  if (!validOldPassword) {
    throw new Error('Current password is incorrect');
  }
  
  // 2. Validate new password against organization policy
  const { validatePassword: validatePasswordPolicy } = await import('./PasswordPolicyService');
  const policyValidation = await validatePasswordPolicy(
    newPassword,
    userId,
    userInfo?.organizationId || null
  );
  
  if (!policyValidation.valid) {
    throw new Error(policyValidation.errors.join(', '));
  }
  
  // 3. Validate new password (strength, breach check, personal info) - additional checks
  const { validatePassword: validatePasswordUtils } = await import('../utils/passwordUtils');
  const validation = await validatePasswordUtils(newPassword, {
    email: userInfo?.email || user.email,
    firstName: userInfo?.firstName || user.firstName || undefined,
    lastName: userInfo?.lastName || user.lastName || undefined,
  });
  
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // Password history is already checked in validatePassword from policy service
  
  // 4. Hash new password
  const { hashPassword } = await import('../utils/passwordUtils');
  const newPasswordHash = await hashPassword(newPassword);
  
  // 5. Update user password
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });
  
  // 6. Add old password to history (before updating, so we can add current password)
  await addPasswordToHistory(userId, user.passwordHash);
  
  // 7. Invalidate all user sessions (force re-login)
  const { revokeAllUserSessions } = await import('./SessionService');
  await revokeAllUserSessions(userId);
}
