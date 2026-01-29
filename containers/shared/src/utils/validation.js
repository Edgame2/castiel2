/**
 * Validation utilities
 * @module @coder/shared/validation
 */
import { z } from 'zod';
/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid();
/**
 * Tenant ID validation schema
 */
export const tenantIdSchema = uuidSchema;
/**
 * User ID validation schema
 */
export const userIdSchema = uuidSchema;
/**
 * Email validation schema
 */
export const emailSchema = z.string().email();
/**
 * Validate UUID
 */
export function validateUUID(value) {
    return uuidSchema.safeParse(value).success;
}
/**
 * Validate tenant ID
 */
export function validateTenantId(value) {
    return tenantIdSchema.safeParse(value).success;
}
/**
 * Validate email
 */
export function validateEmail(value) {
    return emailSchema.safeParse(value).success;
}
/**
 * Sanitize string input
 * Removes potentially dangerous characters and trims whitespace
 */
export function sanitizeString(input) {
    if (typeof input !== 'string') {
        return '';
    }
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}
//# sourceMappingURL=validation.js.map