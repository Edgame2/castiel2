/**
 * Structured logger for risk-analytics module
 */

export const log = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      service: 'risk-analytics',
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
  error: (message: string, error?: Error | any, context?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      service: 'risk-analytics',
      timestamp: new Date().toISOString(),
      error: error?.message || error,
      stack: error?.stack,
      ...context,
    }));
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      service: 'risk-analytics',
      timestamp: new Date().toISOString(),
      ...context,
    }));
  },
  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        service: 'risk-analytics',
        timestamp: new Date().toISOString(),
        ...context,
      }));
    }
  },
};
