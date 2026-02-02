/**
 * Logger utility unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '../../../src/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('should have error method', () => {
    log.error('error message');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"level":"ERROR"'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"message":"error message"'));
  });

  it('should include error message and stack in error meta', () => {
    const err = new Error('fail');
    log.error('error message', err);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('fail'));
  });

  it('should have warn method', () => {
    log.warn('warn message');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"level":"WARN"'));
  });

  it('should have info method', () => {
    log.info('info message');
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
  });

  it('should have debug method', () => {
    expect(typeof log.debug).toBe('function');
    expect(() => log.debug('debug message')).not.toThrow();
  });
});
