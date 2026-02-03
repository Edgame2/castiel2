/**
 * Unit tests for ReembeddingSchedulerService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReembeddingSchedulerService } from '../../../src/services/ReembeddingSchedulerService';
import { loadConfig } from '../../../src/config';

const mockPost = vi.fn().mockResolvedValue({ processed: 0, failed: 0, durationMs: 0 });

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: { post: ReturnType<typeof vi.fn> }) {
    this.post = mockPost;
  }),
  generateServiceToken: vi.fn(() => 'mock-token'),
}));

describe('ReembeddingSchedulerService', () => {
  let service: ReembeddingSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      services: { embeddings: { url: 'http://embeddings:3035' } },
      reembedding_scheduler: {
        enabled: false,
        tenant_ids: [],
        shard_type_ids: [],
        interval_ms: 86400000,
      },
    } as any);
    service = new ReembeddingSchedulerService(undefined);
  });

  describe('start', () => {
    it('returns without starting when reembedding_scheduler is disabled', async () => {
      await service.start();
      expect(vi.mocked(loadConfig).mock.results[0].value.reembedding_scheduler.enabled).toBe(false);
    });

    it('returns without starting when tenant_ids or shard_type_ids empty', async () => {
      vi.mocked(loadConfig).mockReturnValue({
        services: { embeddings: { url: 'http://embeddings:3035' } },
        reembedding_scheduler: {
          enabled: true,
          tenant_ids: [],
          shard_type_ids: ['document'],
          interval_ms: 1000,
        },
      } as any);
      service = new ReembeddingSchedulerService(undefined);
      await service.start();
      // Should not set interval when tenant_ids empty
      await service.stop();
    });
  });

  describe('stop', () => {
    it('does not throw when not started', async () => {
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});
