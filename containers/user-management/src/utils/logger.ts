/**
 * Structured Logger
 * Per ModuleImplementationGuide Section 15.2
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    service: 'user-management',
    message,
    ...meta,
  };
  return JSON.stringify(logEntry);
}

export const log = {
  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    if (shouldLog('error')) {
      const errorMeta = error instanceof Error 
        ? { error: error.message, stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined }
        : error 
          ? { error: String(error) }
          : {};
      console.error(formatLog('error', message, { ...errorMeta, ...meta }));
    }
  },
  
  warn(message: string, meta?: Record<string, any>): void {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  
  info(message: string, meta?: Record<string, any>): void {
    if (shouldLog('info')) {
      console.info(formatLog('info', message, meta));
    }
  },
  
  debug(message: string, meta?: Record<string, any>): void {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', message, meta));
    }
  },
};



