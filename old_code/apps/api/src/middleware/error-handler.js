/**
 * Custom error classes
 */
export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required. Please log in to access this resource.') {
        // Ensure message is always set and meaningful
        const finalMessage = message && message.trim() && message !== 'Unauthorized'
            ? message
            : 'Authentication required. Please log in to access this resource.';
        super(finalMessage, 401);
        this.name = 'UnauthorizedError';
        // Ensure the message property is set on the error object
        if (!this.message || this.message === 'Unauthorized') {
            this.message = finalMessage;
        }
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
/**
 * Error handler middleware
 */
export function errorHandler(monitoring) {
    return async (error, request, reply) => {
        // Log error
        request.log.error({
            err: error,
            url: request.url,
            method: request.method,
            headers: request.headers,
        });
        // Track exception in monitoring
        const errorStatusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
        monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            service: 'main-api',
            method: request.method,
            url: request.url,
            statusCode: errorStatusCode,
        });
        // Determine status code
        let statusCode = 500;
        if ('statusCode' in error && error.statusCode) {
            statusCode = error.statusCode;
        }
        else if ('validation' in error) {
            statusCode = 400; // Fastify validation error
        }
        // Extract error message - try multiple sources
        let errorMessage = 'Internal Server Error';
        if (error instanceof Error && error.message) {
            errorMessage = error.message;
        }
        else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
        else if (error instanceof Error && error.name) {
            errorMessage = error.name;
        }
        else if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
            errorMessage = error.name;
        }
        // For 401 errors, provide more helpful messages
        if (statusCode === 401) {
            if (!errorMessage || errorMessage === 'Unauthorized' || errorMessage === 'Internal Server Error') {
                // Check if it's a JWT-related error
                const errorString = String(error);
                if (errorString.includes('expired') || errorString.includes('Expired')) {
                    errorMessage = 'Token has expired. Please refresh your session.';
                }
                else if (errorString.includes('invalid') || errorString.includes('Invalid')) {
                    errorMessage = 'Invalid authentication token. Please log in again.';
                }
                else if (errorString.includes('missing') || errorString.includes('Missing')) {
                    errorMessage = 'Missing authorization header. Please include a valid authentication token.';
                }
                else {
                    errorMessage = 'Authentication required. Please log in to access this resource.';
                }
            }
        }
        const response = {
            error: getErrorName(statusCode),
            message: errorMessage,
            statusCode,
        };
        // Log the response for debugging (without sensitive data)
        if (statusCode === 401) {
            request.log.debug({
                statusCode,
                errorName: error.name,
                hasMessage: !!error.message,
                messageLength: error.message?.length || 0,
            }, '401 authentication error');
        }
        // Include validation errors if present
        if ('validation' in error && error.validation) {
            response.validation = error.validation;
        }
        // Include stack trace in development
        if (process.env.NODE_ENV === 'development') {
            response.stack = error.stack;
        }
        // Send error response
        // Ensure message is always included and not empty
        const finalMessage = response.message && response.message.trim()
            ? response.message
            : errorMessage && errorMessage.trim()
                ? errorMessage
                : 'An error occurred';
        const finalResponse = {
            error: response.error,
            message: finalMessage,
            statusCode: response.statusCode,
            ...(response.validation && { validation: response.validation }),
            ...(response.stack && { stack: response.stack }),
        };
        // Force JSON content type
        reply.type('application/json');
        // Log error response (without sensitive data)
        request.log.debug({
            statusCode,
            errorName: response.error,
            hasMessage: !!finalMessage,
            hasValidation: !!response.validation,
        }, 'Sending error response');
        reply.status(statusCode).send(finalResponse);
    };
}
/**
 * Get error name from status code
 */
function getErrorName(statusCode) {
    const errorNames = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
    };
    return errorNames[statusCode] || 'Error';
}
/**
 * Not found handler (404)
 */
export async function notFoundHandler(request, reply) {
    reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
    });
}
//# sourceMappingURL=error-handler.js.map