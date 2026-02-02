/**
 * Unit tests for logging logger
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

  it('log.error outputs JSON with level and message', () => {
    log.error('test error');
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"level":"ERROR"')
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"message":"test error"')
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"service":"logging"')
    );
  });

  it('log.warn outputs JSON with level and message', () => {
    log.warn('test warn', { key: 'value' });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"level":"WARN"')
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"message":"test warn"')
    );
  });

  it('log.info outputs JSON with level and message', () => {
    log.info('test info');
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('"level":"INFO"')
    );
  });
});
