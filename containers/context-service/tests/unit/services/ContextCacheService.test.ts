/**
 * Unit tests for ContextCacheService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextCacheService } from '../../../src/services/ContextCacheService';
import { loadConfig } from '../../../src/config';

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

describe('ContextCacheService', () => {
  let service: ContextCacheService;
  const tenantId = 'tenant-1';
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      services: { cache_service: { url: 'http://cache' } },
    } as any);
    service = new ContextCacheService(undefined);
    (service as any).cacheServiceClient = { get: mockGet, post: mockPost, delete: mockDelete };
    (service as any).getServiceToken = vi.fn(() => 'token');
  });

  describe('getMetrics', () => {
    it('returns copy of metrics', () => {
      const m = service.getMetrics();
      expect(m.hits).toBe(0);
      expect(m.misses).toBe(0);
      expect(m.hitRate).toBe(0);
    });
  });

  describe('resetMetrics', () => {
    it('resets all metrics to zero', () => {
      (service as any).metrics = { hits: 5, misses: 2, hitRate: 71 };
      service.resetMetrics();
      const m = service.getMetrics();
      expect(m.hits).toBe(0);
      expect(m.misses).toBe(0);
    });
  });

  describe('getGlobalContext', () => {
    it('returns null when cache returns no value', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await service.getGlobalContext(tenantId, 'query');
      expect(result).toBeNull();
    });

    it('returns null when response has no value', async () => {
      mockGet.mockResolvedValue({ value: null });
      const result = await service.getGlobalContext(tenantId, 'query');
      expect(result).toBeNull();
    });
  });

  describe('setGlobalContext', () => {
    it('calls cache client post', async () => {
      mockPost.mockResolvedValue(undefined);
      await service.setGlobalContext(tenantId, 'query', { data: 'x' });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/cache/entries',
        expect.objectContaining({ key: expect.any(String), value: expect.any(Object), ttl: 300 }),
        expect.any(Object)
      );
    });
  });

  describe('warmCache', () => {
    it('does not throw', async () => {
      await expect(
        service.warmCache({ tenantId, contextType: 'global' })
      ).resolves.toBeUndefined();
    });
  });
});
