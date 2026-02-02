/**
 * Unit tests for ShardEmbeddingService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShardEmbeddingService } from '../../../src/services/ShardEmbeddingService';
import { loadConfig } from '../../../src/config';

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any) {
    this.get = vi.fn().mockResolvedValue({ data: {} });
    this.post = vi.fn().mockResolvedValue({ data: {} });
  }),
  generateServiceToken: vi.fn(() => 'token'),
}));

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    items: { create: vi.fn(), query: vi.fn(() => ({ fetchAll: vi.fn().mockResolvedValue({ resources: [] }) })) },
    item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }) })),
  })),
}));

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

vi.mock('../../../src/events/publishers/EnrichmentEventPublisher', () => ({
  publishEnrichmentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/services/EmbeddingTemplateService', () => ({
  EmbeddingTemplateService: vi.fn().mockImplementation(function (this: any) {
    this.getTemplateForShardType = vi.fn().mockResolvedValue(null);
  }),
}));

describe('ShardEmbeddingService', () => {
  let service: ShardEmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      services: {
        shard_manager: { url: 'http://shard' },
        embeddings: { url: 'http://emb' },
      },
    } as any);
    service = new ShardEmbeddingService(undefined);
  });

  describe('constructor', () => {
    it('creates service with config', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getEmbeddingStats', () => {
    it('returns stats (uses shardManagerClient.get)', async () => {
      const result = await service.getEmbeddingStats('tenant-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(typeof result.totalShards).toBe('number');
      expect(typeof result.coveragePercentage).toBe('number');
      expect(result.modelDistribution).toBeDefined();
    });
  });
});
