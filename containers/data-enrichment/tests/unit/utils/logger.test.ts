/**
 * Unit tests for data-enrichment logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '../../../src/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('log.info serializes message and context to JSON', () => {
    log.info('test message', { key: 'value' });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"level":"info"')
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('"service":"data-enrichment"')
    );
  });

  it('log.error serializes error and context', () => {
    log.error('failed', new Error('err'), { tenantId: 't1' });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"level":"error"')
    );
  });

  it('log.warn serializes message and context', () => {
    log.warn('warning', { code: 1 });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"level":"warn"')
    );
  });
});
