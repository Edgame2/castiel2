/**
 * Unit tests for recommendations logger
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

  it('log.info serializes message and context to JSON', () => {
    log.info('test message', { key: 'value' });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"level":"info"')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"message":"test message"')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"service":"recommendations"')
    );
  });

  it('log.error serializes error and context', () => {
    log.error('failed', new Error('err'), { tenantId: 't1' });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"level":"error"')
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"message":"failed"')
    );
  });

  it('log.warn serializes message and context', () => {
    log.warn('warning', { code: 1 });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"level":"warn"')
    );
  });
});
