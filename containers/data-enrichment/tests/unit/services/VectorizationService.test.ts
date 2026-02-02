/**
 * Unit tests for VectorizationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VectorizationService } from '../../../src/services/VectorizationService';
import { loadConfig } from '../../../src/config';

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any) {
    this.get = vi.fn().mockResolvedValue({ data: {} });
    this.post = vi.fn().mockResolvedValue({ data: {} });
  }),
  generateServiceToken: vi.fn(() => 'token'),
}));

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

vi.mock('../../../src/events/publishers/EnrichmentEventPublisher', () => ({
  publishEnrichmentEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('VectorizationService', () => {
  let service: VectorizationService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadConfig).mockReturnValue({
      services: {
        shard_manager: { url: 'http://shard' },
        embeddings: { url: 'http://emb' },
      },
    } as any);
    service = new VectorizationService(undefined);
  });

  describe('constructor', () => {
    it('creates service with config', () => {
      expect(service).toBeDefined();
    });
  });

  describe('vectorizeShard', () => {
    it('returns status response', async () => {
      const result = await service.vectorizeShard({
        shardId: 'shard-1',
        tenantId: 'tenant-1',
      });
      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
      expect(['pending', 'completed', 'failed']).toContain(result.status);
    });
  });

  describe('getJobStatus', () => {
    it('returns status or null for job', async () => {
      const result = await service.getJobStatus('job-1', 'tenant-1');
      expect(result === null || (typeof result === 'object' && 'status' in result)).toBe(true);
    });
  });
});
