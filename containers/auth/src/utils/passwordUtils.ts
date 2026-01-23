/**
 * Password Utilities
 * 
 * Provides secure password hashing, verification, and validation including
 * HaveIBeenPwned (HIBP) breach checking.
 * 
 * Security:
 * - Uses bcrypt with cost factor 12 (industry standard)
 * - Validates password strength (minimum 8 characters)
 * - Checks against common passwords
 * - Validates against personal information (email, name)
 * - Integrates with HaveIBeenPwned API (k-anonymity model)
 */

import * as bcrypt from 'bcrypt';
import { pwnedPassword } from 'hibp';
import { log } from './logger';

/**
 * Bcrypt salt rounds (cost factor)
 * Cost factor 12 = 2^12 = 4096 iterations
 * Recommended for production (balance between security and performance)
 */
const SALT_ROUNDS = 12;

/**
 * Common passwords to reject (case-insensitive)
 */
const COMMON_PASSWORDS = [
  'password',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'abc123',
  'password123',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  '1234567',
  'sunshine',
  'princess',
  'azerty',
  'trustno1',
];

/**
 * Hash a password using bcrypt
 * 
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hash string
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    log.error('Password hashing failed', error, { service: 'auth' });
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a bcrypt hash
 * 
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    log.error('Password verification failed', error, { service: 'auth' });
    return false;
  }
}

/**
 * Check if a password has been breached using HaveIBeenPwned API
 * Uses k-anonymity model (only sends first 5 chars of SHA-1 hash)
 * 
 * @param password - Plain text password to check
 * @returns Promise resolving to number of times password was found in breaches (0 if not breached)
 */
export async function getPasswordBreachCount(password: string): Promise<number> {
  if (!password || password.length === 0) {
    return 0;
  }

  try {
    // pwnedPassword uses k-anonymity - only sends prefix of hash
    const count = await pwnedPassword(password);
    return count;
  } catch (error) {
    // If API fails, log error but don't block user (fail open for UX)
    // In production, consider alerting/monitoring for HIBP failures
    log.warn('HIBP check failed', { error, service: 'auth' });
    return 0; // Fail open - allow password if API is unavailable
  }
}

/**
 * Check if a password has been breached (boolean version)
 * 
 * @param password - Plain text password to check
 * @returns Promise resolving to true if password was found in breaches, false otherwise
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  const count = await getPasswordBreachCount(password);
  return count > 0;
}

/**
 * Validate password strength and security requirements
 * 
 * Checks:
 * - Minimum length (8 characters)
 * - Common passwords
 * - Personal information (email, name)
 * - HaveIBeenPwned breach database
 * 
 * @param password - Plain text password to validate
 * @param user - Optional user information for personal info checks
 * @returns Promise resolving to validation result with errors array
 */
export async function validatePassword(
  password: string,
  user?: { email?: string; firstName?: string; lastName?: string }
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Length check (minimum 8 characters)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length check (prevent DoS attacks with extremely long passwords)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Common password check (case-insensitive)
  const passwordLower = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(passwordLower)) {
    errors.push('This password is too common. Please choose a stronger password.');
  }

  // Personal information checks
  if (user?.email) {
    const emailLocalPart = user.email.split('@')[0].toLowerCase();
    if (passwordLower.includes(emailLocalPart)) {
      errors.push('Password should not contain your email address');
    }
  }

  if (user?.firstName) {
    const firstNameLower = user.firstName.toLowerCase();
    // Check if password contains first name (minimum 3 chars to avoid false positives)
    if (firstNameLower.length >= 3 && passwordLower.includes(firstNameLower)) {
      errors.push('Password should not contain your first name');
    }
  }

  if (user?.lastName) {
    const lastNameLower = user.lastName.toLowerCase();
    // Check if password contains last name (minimum 3 chars to avoid false positives)
    if (lastNameLower.length >= 3 && passwordLower.includes(lastNameLower)) {
      errors.push('Password should not contain your last name');
    }
  }

  // HaveIBeenPwned breach check
  const breachCount = await getPasswordBreachCount(password);
  if (breachCount > 0) {
    errors.push(
      `This password has been exposed in ${breachCount} data breach${breachCount > 1 ? 'es' : ''}. ` +
      `Please choose a different password for your security.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate basic password strength (synchronous, no external API calls)
 * 
 * Useful for client-side validation or quick checks without HIBP.
 * 
 * @param password - Plain text password to validate
 * @returns Validation result with errors array
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Check against common passwords
  const passwordLower = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(passwordLower)) {
    errors.push('This password is too common. Please choose a stronger password.');
  }

  // Note: We don't enforce complexity rules (uppercase, numbers, symbols)
  // Research shows length is more important than complexity
  // NIST guidelines recommend length over complexity requirements

  return {
    valid: errors.length === 0,
    errors,
  };
}
