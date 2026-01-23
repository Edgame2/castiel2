/**
 * Base error class for service-level errors
 */
export declare class BaseError extends Error {
    code: string;
    statusCode: number;
    details?: any | undefined;
    constructor(message: string, code?: string, statusCode?: number, details?: any | undefined);
    toJSON(): {
        name: string;
        message: string;
        code: string;
        statusCode: number;
        details: any;
    };
}
//# sourceMappingURL=errors.d.ts.map