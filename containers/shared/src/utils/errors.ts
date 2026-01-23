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
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationDetail[]) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
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
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', message, 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

