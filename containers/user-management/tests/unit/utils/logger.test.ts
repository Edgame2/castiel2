/**
 * Logger unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '../../../src/utils/logger';

describe('logger', () => {
  let consoleInfo: ReturnType<typeof vi.fn>;
  let consoleError: ReturnType<typeof vi.fn>;
  let consoleWarn: ReturnType<typeof vi.fn>;
  let consoleDebug: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  it('exposes info, error, warn, debug', () => {
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  it('info logs JSON with message and service', () => {
    log.info('test message', { key: 'value' });
    expect(consoleInfo).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleInfo.mock.calls[0][0]);
    expect(payload.level).toBe('INFO');
    expect(payload.message).toBe('test message');
    expect(payload.service).toBe('user-management');
    expect(payload.key).toBe('value');
  });

  it('error logs JSON with message and error', () => {
    log.error('failed', new Error('oops'), { context: 'test' });
    expect(consoleError).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleError.mock.calls[0][0]);
    expect(payload.level).toBe('ERROR');
    expect(payload.message).toBe('failed');
    expect(payload.service).toBe('user-management');
    expect(payload.error).toBe('oops');
  });

  it('warn logs JSON with message', () => {
    log.warn('warning', { code: 1 });
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleWarn.mock.calls[0][0]);
    expect(payload.level).toBe('WARN');
    expect(payload.message).toBe('warning');
    expect(payload.code).toBe(1);
  });
});
