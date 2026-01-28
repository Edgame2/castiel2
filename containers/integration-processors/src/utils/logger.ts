/**
 * Logger utility
 * @module integration-processors/utils/logger
 */

import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const log = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'integration-processors' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
  ],
});

// Helper methods for structured logging
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    log.info(message, meta);
  },
  error: (message: string, error: any, meta?: Record<string, any>) => {
    log.error(message, { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, ...meta });
  },
  warn: (message: string, meta?: Record<string, any>) => {
    log.warn(message, meta);
  },
  debug: (message: string, meta?: Record<string, any>) => {
    log.debug(message, meta);
  },
};
