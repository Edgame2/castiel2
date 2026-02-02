/**
 * Minimal logger for shared usage.
 * Containers may use this or their own logger.
 */

export const log = {
  info: (..._args: unknown[]) => {},
  error: (..._args: unknown[]) => {},
  warn: (..._args: unknown[]) => {},
  debug: (..._args: unknown[]) => {},
};
