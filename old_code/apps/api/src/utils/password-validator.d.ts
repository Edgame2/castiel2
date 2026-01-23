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
export declare const getPasswordRequirements: () => PasswordRequirements;
/**
 * Validate password against requirements
 */
export declare const validatePassword: (password: string, requirements?: PasswordRequirements) => PasswordValidationResult;
/**
 * Check if password is in common password list (basic check)
 */
export declare const isCommonPassword: (password: string) => boolean;
/**
 * Validate password with all checks
 */
export declare const validatePasswordStrength: (password: string, requirements?: PasswordRequirements) => PasswordValidationResult;
//# sourceMappingURL=password-validator.d.ts.map