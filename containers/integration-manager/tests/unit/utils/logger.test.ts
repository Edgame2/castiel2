/**
 * Logger utility unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '../../../src/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('should log info with message and optional context', () => {
    log.info('test message');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"level":"info"')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"message":"test message"')
    );
    log.info('with context', { key: 'value' });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"key":"value"')
    );
  });

  it('should log error with message and optional error/context', () => {
    log.error('error message');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"level":"error"')
    );
    const err = new Error('fail');
    log.error('error message', err);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('fail')
    );
  });

  it('should log warn with message and optional context', () => {
    log.warn('warn message');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"level":"warn"')
    );
  });

  it('should log debug only in development', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    log.debug('debug message');
    expect(console.debug).toHaveBeenCalled();
    process.env.NODE_ENV = 'test';
    vi.mocked(console.debug).mockClear();
    log.debug('debug message');
    expect(console.debug).not.toHaveBeenCalled();
    process.env.NODE_ENV = orig;
  });
});
