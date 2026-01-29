/**
 * Validation utilities
 * @module @coder/shared/validation
 */
import { z } from 'zod';
/**
 * UUID validation schema
 */
export declare const uuidSchema: z.ZodString;
/**
 * Tenant ID validation schema
 */
export declare const tenantIdSchema: z.ZodString;
/**
 * User ID validation schema
 */
export declare const userIdSchema: z.ZodString;
/**
 * Email validation schema
 */
export declare const emailSchema: z.ZodString;
/**
 * Validate UUID
 */
export declare function validateUUID(value: string): boolean;
/**
 * Validate tenant ID
 */
export declare function validateTenantId(value: string): boolean;
/**
 * Validate email
 */
export declare function validateEmail(value: string): boolean;
/**
 * Sanitize string input
 * Removes potentially dangerous characters and trims whitespace
 */
export declare function sanitizeString(input: string): string;
//# sourceMappingURL=validation.d.ts.map