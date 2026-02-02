/**
 * Unit tests for logger utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { log } from '../../../src/utils/logger';

describe('log', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('info', () => {
    it('calls console.log with JSON containing level, message and service', () => {
      log.info('test message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const out = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(out.level).toBe('info');
      expect(out.message).toBe('test message');
      expect(out.service).toBe('risk-catalog');
      expect(out.timestamp).toBeDefined();
    });

    it('merges optional context into JSON', () => {
      log.info('test', { key: 'value' });
      const out = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(out.key).toBe('value');
    });
  });

  describe('error', () => {
    it('calls console.error with JSON containing level, message and service', () => {
      log.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const out = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(out.level).toBe('error');
      expect(out.message).toBe('error message');
      expect(out.service).toBe('risk-catalog');
    });

    it('includes error message and stack when Error is passed', () => {
      const err = new Error('fail');
      log.error('error message', err);
      const out = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(out.error).toBe('fail');
      expect(out.stack).toBeDefined();
    });

    it('merges optional context into JSON', () => {
      log.error('error', undefined, { code: 500 });
      const out = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(out.code).toBe(500);
    });
  });

  describe('warn', () => {
    it('calls console.warn with JSON containing level, message and service', () => {
      log.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const out = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(out.level).toBe('warn');
      expect(out.message).toBe('warning message');
      expect(out.service).toBe('risk-catalog');
    });
  });

  describe('debug', () => {
    it('does not call console.debug when NODE_ENV is not development', () => {
      process.env.NODE_ENV = 'test';
      log.debug('debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('calls console.debug when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      log.debug('debug message');
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const out = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(out.level).toBe('debug');
      expect(out.message).toBe('debug message');
      expect(out.service).toBe('risk-catalog');
    });
  });
});
