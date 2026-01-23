/**
 * Password validation utilities
 */

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Default password requirements from environment or defaults
 */
export const getPasswordRequirements = (): PasswordRequirements => {
  return {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
  };
};

/**
 * Validate password against requirements
 */
export const validatePassword = (
  password: string,
  requirements?: PasswordRequirements
): PasswordValidationResult => {
  const reqs = requirements || getPasswordRequirements();
  const errors: string[] = [];

  // Check minimum length
  if (password.length < reqs.minLength) {
    errors.push(`Password must be at least ${reqs.minLength} characters long`);
  }

  // Check maximum length (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Check for uppercase letter
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (reqs.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (reqs.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Check if password is in common password list (basic check)
 */
export const isCommonPassword = (password: string): boolean => {
  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'monkey',
    '1234567890',
    'letmein',
    'trustno1',
    'dragon',
    'baseball',
    'iloveyou',
    'master',
    'sunshine',
    'ashley',
    'bailey',
    'passw0rd',
    'shadow',
    '123123',
    '654321',
  ];

  return commonPasswords.includes(password.toLowerCase());
};

/**
 * Validate password with all checks
 */
export const validatePasswordStrength = (
  password: string,
  requirements?: PasswordRequirements
): PasswordValidationResult => {
  const result = validatePassword(password, requirements);

  // Check for common passwords
  if (result.valid && isCommonPassword(password)) {
    result.valid = false;
    result.errors.push('Password is too common. Please choose a stronger password');
  }

  return result;
};
