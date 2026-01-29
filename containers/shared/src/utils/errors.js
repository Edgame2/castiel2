/**
 * Shared error classes for all containers
 * @module @coder/shared/errors
 */
/**
 * Base application error class
 */
export class AppError extends Error {
    code;
    message;
    statusCode;
    details;
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Bad request error (400 Bad Request)
 */
export class BadRequestError extends AppError {
    constructor(message, details) {
        super('BAD_REQUEST', message, 400, details);
        this.name = 'BadRequestError';
    }
}
/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
    constructor(message, details) {
        super('VALIDATION_ERROR', message, 400, details);
        this.name = 'ValidationError';
    }
}
/**
 * Not found error (404 Not Found)
 */
export class NotFoundError extends AppError {
    constructor(resource, id) {
        super('NOT_FOUND', `${resource} not found: ${id}`, 404);
        this.name = 'NotFoundError';
    }
}
/**
 * Unauthorized error (401 Unauthorized)
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', message, 401);
        this.name = 'UnauthorizedError';
    }
}
/**
 * Forbidden error (403 Forbidden)
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
        this.name = 'ForbiddenError';
    }
}
/**
 * Conflict error (409 Conflict)
 */
export class ConflictError extends AppError {
    constructor(message) {
        super('CONFLICT', message, 409);
        this.name = 'ConflictError';
    }
}
/**
 * Rate limit error (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', retryAfter) {
        super('RATE_LIMIT_EXCEEDED', message, 429, { retryAfter });
        this.name = 'RateLimitError';
    }
}
//# sourceMappingURL=errors.js.map