/**
 * API-related types
 * @module @coder/shared/types/api
 */
/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
    data: T;
    meta?: {
        page?: number;
        pageSize?: number;
        total?: number;
    };
}
/**
 * Standard API error response
 */
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
//# sourceMappingURL=api.types.d.ts.map