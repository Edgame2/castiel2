import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Custom error classes
 */
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    details?: Record<string, unknown>;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, details?: Record<string, unknown>);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
/**
 * Error handler middleware
 */
export declare function errorHandler(monitoring: IMonitoringProvider): (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Not found handler (404)
 */
export declare function notFoundHandler(request: FastifyRequest, reply: FastifyReply): Promise<void>;
//# sourceMappingURL=error-handler.d.ts.map