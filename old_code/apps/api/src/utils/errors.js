/**
 * Base error class for service-level errors
 */
export class BaseError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'BaseError';
        Object.setPrototypeOf(this, BaseError.prototype);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}
//# sourceMappingURL=errors.js.map