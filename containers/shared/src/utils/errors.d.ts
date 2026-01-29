/**
 * Shared error classes for all containers
 * @module @coder/shared/errors
 */
export interface ValidationDetail {
    field: string;
    message: string;
    value?: unknown;
}
/**
 * Base application error class
 */
export declare class AppError extends Error {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown | undefined;
    constructor(code: string, message: string, statusCode?: number, details?: unknown | undefined);
}
/**
 * Bad request error (400 Bad Request)
 */
export declare class BadRequestError extends AppError {
    constructor(message: string, details?: unknown);
}
/**
 * Validation error (400 Bad Request)
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: ValidationDetail[]);
}
/**
 * Not found error (404 Not Found)
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, id: string);
}
/**
 * Unauthorized error (401 Unauthorized)
 */
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
/**
 * Forbidden error (403 Forbidden)
 */
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
/**
 * Conflict error (409 Conflict)
 */
export declare class ConflictError extends AppError {
    constructor(message: string);
}
/**
 * Rate limit error (429 Too Many Requests)
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string, retryAfter?: number);
}
//# sourceMappingURL=errors.d.ts.map