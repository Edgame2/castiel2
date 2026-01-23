/**
 * Base error class for service-level errors
 */
export class BaseError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
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
