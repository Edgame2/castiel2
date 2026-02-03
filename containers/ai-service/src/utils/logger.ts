/**
 * Structured logger for ai-service module
 */

export const log = {
  info(message: string, context?: Record<string, unknown>): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      service: 'ai-service',
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      service: 'ai-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    }));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      service: 'ai-service',
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        service: 'ai-service',
        timestamp: new Date().toISOString(),
        ...context,
      }));
    }
  },
};
