/**
 * Simple logger for dashboard (used by merged dashboard-analytics code).
 */
export const log = {
  info: (msg: string, meta?: Record<string, unknown>) => console.log(msg, meta ?? ''),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(msg, meta ?? ''),
  error: (msg: string, err?: Error | Record<string, unknown>, meta?: Record<string, unknown>) => {
    if (err instanceof Error) console.error(msg, err, meta ?? '');
    else console.error(msg, err ?? meta ?? '');
  },
};
