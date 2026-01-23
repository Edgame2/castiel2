/**
 * Logger Utility
 * 
 * Simple logger for the Secret Management module.
 * Uses console for now, can be replaced with winston or other logger if needed.
 */

export const log = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(`[ERROR] ${message}`, error, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  },
};



