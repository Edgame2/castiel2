/**
 * Retry Handler unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRetryCount,
  incrementRetryCount,
  shouldRetry,
  calculateBackoff,
  handleRetryOrDLQ,
} from '../../../src/utils/retryHandler';
import type { ConsumeMessage } from 'amqplib';

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createMessage(headers: Record<string, unknown> = {}): ConsumeMessage {
  return {
    content: Buffer.from('{}'),
    fields: {} as any,
    properties: {
      headers: { ...headers },
    } as any,
  };
}

describe('retryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRetryCount', () => {
    it('should return 0 when no x-retry-count header', () => {
      const msg = createMessage();
      expect(getRetryCount(msg)).toBe(0);
    });

    it('should return count from header', () => {
      const msg = createMessage({ 'x-retry-count': 3 });
      expect(getRetryCount(msg)).toBe(3);
    });
  });

  describe('incrementRetryCount', () => {
    it('should set x-retry-count to 1 when was 0', () => {
      const msg = createMessage();
      const next = incrementRetryCount(msg);
      expect(next.properties.headers?.['x-retry-count']).toBe(1);
    });

    it('should increment existing count', () => {
      const msg = createMessage({ 'x-retry-count': 2 });
      const next = incrementRetryCount(msg);
      expect(next.properties.headers?.['x-retry-count']).toBe(3);
    });
  });

  describe('shouldRetry', () => {
    it('should return true for 5xx errors', () => {
      expect(shouldRetry({ statusCode: 500 })).toBe(true);
      expect(shouldRetry({ statusCode: 503 })).toBe(true);
    });

    it('should return true for 429', () => {
      expect(shouldRetry({ statusCode: 429 })).toBe(true);
    });

    it('should return false for 4xx except 429', () => {
      expect(shouldRetry({ statusCode: 400 })).toBe(false);
      expect(shouldRetry({ statusCode: 404 })).toBe(false);
    });

    it('should return true for ECONNREFUSED', () => {
      expect(shouldRetry({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('should return true for timeout message', () => {
      expect(shouldRetry({ message: 'request timeout' })).toBe(true);
    });

    it('should return false for ValidationError', () => {
      expect(shouldRetry({ name: 'ValidationError' })).toBe(false);
      expect(shouldRetry({ message: 'validation failed' })).toBe(false);
    });

    it('should return true for unknown errors', () => {
      expect(shouldRetry(new Error('unknown'))).toBe(true);
    });
  });

  describe('calculateBackoff', () => {
    it('should return non-negative delay', () => {
      const delay = calculateBackoff(0);
      expect(delay).toBeGreaterThanOrEqual(0);
    });

    it('should increase with attempt', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // no jitter variance for comparison
      const d0 = calculateBackoff(0);
      const d1 = calculateBackoff(1);
      const d2 = calculateBackoff(2);
      expect(d1).toBeGreaterThanOrEqual(d0);
      expect(d2).toBeGreaterThanOrEqual(d1);
    });

    it('should cap at maxBackoffMs', () => {
      const delay = calculateBackoff(100, { maxBackoffMs: 5000, initialBackoffMs: 1000, backoffMultiplier: 2 });
      expect(delay).toBeLessThanOrEqual(5000 * 1.1); // allow jitter
    });
  });

  describe('handleRetryOrDLQ', () => {
    it('should nack without requeue for permanent error', () => {
      const msg = createMessage();
      const channel = { nack: vi.fn() } as any;
      const result = handleRetryOrDLQ(msg, { statusCode: 400 }, channel);
      expect(result).toBe(false);
      expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    });

    it('should nack without requeue when max retries exceeded', () => {
      const msg = createMessage({ 'x-retry-count': 3 });
      const channel = { nack: vi.fn() } as any;
      const result = handleRetryOrDLQ(msg, { statusCode: 500 }, channel);
      expect(result).toBe(false);
      expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    });

    it('should nack with requeue when retryable and under max', () => {
      const msg = createMessage();
      const channel = { nack: vi.fn() } as any;
      const result = handleRetryOrDLQ(msg, { statusCode: 503 }, channel);
      expect(result).toBe(true);
      expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
    });
  });
});
