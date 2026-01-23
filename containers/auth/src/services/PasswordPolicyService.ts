/**
 * Password Policy Service
 * 
 * Manages organization-level password policies and validation
 */

import { getDatabaseClient } from '@coder/shared';
import { isPasswordInHistory } from './PasswordHistoryService';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  passwordHistoryCount: number;
  passwordExpiryDays?: number;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Get password policy for an organization
 */
export async function getPasswordPolicy(organizationId: string | null): Promise<PasswordPolicy> {
  const db = getDatabaseClient();

  // Default policy
  const defaultPolicy: PasswordPolicy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: true,
    passwordHistoryCount: 5,
  };

  if (!organizationId) {
    return defaultPolicy;
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      passwordMinLength: true,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
      passwordHistoryCount: true,
      passwordExpiryDays: true,
    },
  });

  if (!org) {
    return defaultPolicy;
  }

  return {
    minLength: org.passwordMinLength || defaultPolicy.minLength,
    requireUppercase: org.passwordRequireUppercase ?? defaultPolicy.requireUppercase,
    requireLowercase: org.passwordRequireLowercase ?? defaultPolicy.requireLowercase,
    requireNumbers: org.passwordRequireNumbers ?? defaultPolicy.requireNumbers,
    requireSpecial: org.passwordRequireSpecial ?? defaultPolicy.requireSpecial,
    passwordHistoryCount: org.passwordHistoryCount || defaultPolicy.passwordHistoryCount,
    passwordExpiryDays: org.passwordExpiryDays || undefined,
  };
}

/**
 * Validate password against organization policy
 */
export async function validatePassword(
  password: string,
  userId: string,
  organizationId: string | null
): Promise<PasswordValidationResult> {
  const errors: string[] = [];
  const policy = await getPasswordPolicy(organizationId);

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }

  // Check uppercase requirement
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check lowercase requirement
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check numbers requirement
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check special characters requirement
  if (policy.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check password history
  const inHistory = await isPasswordInHistory(userId, password);
  if (inHistory) {
    errors.push(`Password cannot be one of your last ${policy.passwordHistoryCount} passwords`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user's password is expired
 */
export async function isPasswordExpired(userId: string, organizationId: string | null): Promise<boolean> {
  const policy = await getPasswordPolicy(organizationId);

  if (!policy.passwordExpiryDays) {
    return false; // No expiry
  }

  const db = getDatabaseClient();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      passwordHistory: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user || !user.passwordHistory || user.passwordHistory.length === 0) {
    // User has no password history, check when password was set
    // For now, assume password is not expired if no history
    return false;
  }

  const lastPasswordChange = user.passwordHistory[0].createdAt;
  const expiryDate = new Date(lastPasswordChange);
  expiryDate.setDate(expiryDate.getDate() + policy.passwordExpiryDays);

  return new Date() > expiryDate;
}

/**
 * Get days until password expires
 */
export async function getDaysUntilPasswordExpiry(
  userId: string,
  organizationId: string | null
): Promise<number | null> {
  const policy = await getPasswordPolicy(organizationId);

  if (!policy.passwordExpiryDays) {
    return null; // No expiry
  }

  const db = getDatabaseClient();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      passwordHistory: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user || !user.passwordHistory || user.passwordHistory.length === 0) {
    return null;
  }

  const lastPasswordChange = user.passwordHistory[0].createdAt;
  const expiryDate = new Date(lastPasswordChange);
  expiryDate.setDate(expiryDate.getDate() + policy.passwordExpiryDays);

  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return daysUntilExpiry > 0 ? daysUntilExpiry : 0;
}
