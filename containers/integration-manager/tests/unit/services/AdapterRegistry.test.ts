/**
 * Adapter Registry unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdapterRegistry } from '../../../src/services/AdapterRegistry';
import type { IntegrationAdapterFactory } from '../../../src/types/adapter.types';

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;
  const mockFactory: IntegrationAdapterFactory = {
    createAdapter: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    registry = new AdapterRegistry();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register adapter factory', () => {
      registry.register('salesforce', mockFactory);
      expect(registry.has('salesforce')).toBe(true);
      expect(registry.get('salesforce')).toBe(mockFactory);
    });

    it('should overwrite when same provider registered again', () => {
      const other = { createAdapter: vi.fn() };
      registry.register('salesforce', mockFactory);
      registry.register('salesforce', other);
      expect(registry.get('salesforce')).toBe(other);
    });
  });

  describe('get', () => {
    it('should return undefined for unregistered provider', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return false when not registered', () => {
      expect(registry.has('salesforce')).toBe(false);
    });
    it('should return true when registered', () => {
      registry.register('salesforce', mockFactory);
      expect(registry.has('salesforce')).toBe(true);
    });
  });

  describe('list', () => {
    it('should return empty array when no adapters', () => {
      expect(registry.list()).toEqual([]);
    });
    it('should return all provider names', () => {
      registry.register('salesforce', mockFactory);
      registry.register('hubspot', mockFactory);
      expect(registry.list()).toEqual(['salesforce', 'hubspot']);
    });
  });

  describe('unregister', () => {
    it('should return false when provider not registered', () => {
      expect(registry.unregister('unknown')).toBe(false);
    });
    it('should remove and return true when registered', () => {
      registry.register('salesforce', mockFactory);
      expect(registry.unregister('salesforce')).toBe(true);
      expect(registry.has('salesforce')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return totalAdapters and adapterIds', () => {
      expect(registry.getStats()).toEqual({ totalAdapters: 0, adapterIds: [] });
      registry.register('salesforce', mockFactory);
      expect(registry.getStats()).toEqual({
        totalAdapters: 1,
        adapterIds: ['salesforce'],
      });
    });
  });
});
