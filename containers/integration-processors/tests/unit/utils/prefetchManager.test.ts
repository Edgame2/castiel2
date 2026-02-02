/**
 * Prefetch Manager unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrefetchManager } from '../../../src/utils/prefetchManager';

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PrefetchManager', () => {
  let manager: PrefetchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new PrefetchManager({});
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const m = new PrefetchManager();
      expect(m.getCurrentPrefetch()).toBe(20);
    });

    it('should use custom initial prefetch', () => {
      const m = new PrefetchManager({ initial: 10 });
      expect(m.getCurrentPrefetch()).toBe(10);
    });
  });

  describe('recordProcessingTime', () => {
    it('should record processing time without changing prefetch before interval', () => {
      manager.recordProcessingTime(500);
      manager.recordProcessingTime(600);
      expect(manager.getCurrentPrefetch()).toBe(20);
    });

    it('should not adjust when samples below minSamples', () => {
      const m = new PrefetchManager({
        initial: 20,
        adjustmentIntervalMs: 0,
        minSamples: 100,
      });
      for (let i = 0; i < 5; i++) m.recordProcessingTime(100);
      expect(m.getCurrentPrefetch()).toBe(20);
    });
  });

  describe('getCurrentPrefetch', () => {
    it('should return initial value', () => {
      expect(manager.getCurrentPrefetch()).toBe(20);
    });

    it('should return custom initial when set', () => {
      const m = new PrefetchManager({ initial: 5 });
      expect(m.getCurrentPrefetch()).toBe(5);
    });
  });

  describe('getStats', () => {
    it('should return current prefetch and sample count', () => {
      manager.recordProcessingTime(100);
      manager.recordProcessingTime(200);
      const stats = manager.getStats();
      expect(stats.currentPrefetch).toBe(20);
      expect(stats.samples).toBe(2);
      expect(stats.adjustments).toBe(0);
    });

    it('should compute average processing time from samples', () => {
      manager.recordProcessingTime(100);
      manager.recordProcessingTime(300);
      const stats = manager.getStats();
      expect(stats.avgProcessingTime).toBe(200);
    });
  });

  describe('reset', () => {
    it('should reset prefetch to initial and clear samples', () => {
      manager.recordProcessingTime(100);
      manager.reset();
      expect(manager.getCurrentPrefetch()).toBe(20);
      const stats = manager.getStats();
      expect(stats.samples).toBe(0);
      expect(stats.adjustments).toBe(0);
    });
  });
});
