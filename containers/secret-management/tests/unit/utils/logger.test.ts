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
    delete process.env.LOG_LEVEL;
  });

  describe('info', () => {
    it('should call console.log with [INFO] prefix', () => {
      log.info('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] test message', '');
    });

    it('should pass optional meta to console.log', () => {
      log.info('test', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] test', { key: 'value' });
    });
  });

  describe('error', () => {
    it('should call console.error with [ERROR] prefix', () => {
      log.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message', undefined, '');
    });

    it('should pass error and meta to console.error', () => {
      const err = new Error('fail');
      log.error('error message', err, { code: 500 });
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message', err, { code: 500 });
    });
  });

  describe('warn', () => {
    it('should call console.warn with [WARN] prefix', () => {
      log.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warning message', '');
    });
  });

  describe('debug', () => {
    it('should not call console.debug when LOG_LEVEL is not debug', () => {
      log.debug('debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should call console.debug when LOG_LEVEL is debug', () => {
      process.env.LOG_LEVEL = 'debug';
      log.debug('debug message');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug message', '');
    });
  });
});
