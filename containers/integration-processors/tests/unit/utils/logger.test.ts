/**
 * Logger utility unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log, logger } from '../../../src/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(log, 'info').mockImplementation(() => log);
    vi.spyOn(log, 'error').mockImplementation(() => log);
    vi.spyOn(log, 'warn').mockImplementation(() => log);
    vi.spyOn(log, 'debug').mockImplementation(() => log);
  });

  describe('log', () => {
    it('should have info method', () => {
      log.info('test message');
      expect(log.info).toHaveBeenCalledWith('test message');
    });

    it('should have error method', () => {
      log.error('error message');
      expect(log.error).toHaveBeenCalledWith('error message');
    });

    it('should have warn method', () => {
      log.warn('warn message');
      expect(log.warn).toHaveBeenCalledWith('warn message');
    });

    it('should have debug method', () => {
      log.debug('debug message');
      expect(log.debug).toHaveBeenCalledWith('debug message');
    });
  });

  describe('logger.info', () => {
    it('should call log.info with message and optional meta', () => {
      logger.info('info msg');
      expect(log.info).toHaveBeenNthCalledWith(1, 'info msg', undefined);
      logger.info('info msg', { key: 'value' });
      expect(log.info).toHaveBeenNthCalledWith(2, 'info msg', { key: 'value' });
    });
  });

  describe('logger.error', () => {
    it('should call log.error with message, error, and optional meta', () => {
      const err = new Error('test error');
      logger.error('error msg', err);
      expect(log.error).toHaveBeenCalledWith('error msg', expect.objectContaining({ error: 'test error' }));
      logger.error('error msg', err, { service: 'test' });
      expect(log.error).toHaveBeenCalledWith('error msg', expect.objectContaining({ service: 'test' }));
    });

    it('should stringify non-Error values', () => {
      logger.error('error msg', 'string error');
      expect(log.error).toHaveBeenCalledWith('error msg', expect.objectContaining({ error: 'string error' }));
    });
  });

  describe('logger.warn', () => {
    it('should call log.warn with message and optional meta', () => {
      logger.warn('warn msg');
      expect(log.warn).toHaveBeenNthCalledWith(1, 'warn msg', undefined);
    });
  });

  describe('logger.debug', () => {
    it('should call log.debug with message and optional meta', () => {
      logger.debug('debug msg');
      expect(log.debug).toHaveBeenNthCalledWith(1, 'debug msg', undefined);
    });
  });
});
