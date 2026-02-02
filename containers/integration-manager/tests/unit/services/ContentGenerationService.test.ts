/**
 * Content Generation Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { ContentGenerationService } from '../../../src/services/ContentGenerationService';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({ services: { ai_service: { url: 'http://ai' } } })),
}));

vi.mock('@coder/shared', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@coder/shared')>();
  function MockServiceClient(this: any) {
    this.get = vi.fn().mockResolvedValue({ data: {} });
    this.post = vi.fn().mockResolvedValue({ data: {} });
  }
  return { ...mod, ServiceClient: MockServiceClient };
});

describe('ContentGenerationService', () => {
  let service: ContentGenerationService;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({ resource: { id: 'job-1', tenantId: 't1', status: 'pending' } });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
      item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }) })),
    } as any);
    service = new ContentGenerationService('http://ai');
  });

  describe('create', () => {
    it('should throw when tenantId missing', async () => {
      await expect(
        service.create({ prompt: 'Hello', userId: 'u1' } as any)
      ).rejects.toThrow(/tenantId is required/);
    });

    it('should throw when prompt missing or empty', async () => {
      await expect(
        service.create({ tenantId: 't1', userId: 'u1' } as any)
      ).rejects.toThrow(/prompt is required/);
      await expect(
        service.create({ tenantId: 't1', prompt: '  ', userId: 'u1' } as any)
      ).rejects.toThrow(/prompt is required/);
    });

    it('should create job and return resource', async () => {
      const input = { tenantId: 't1', prompt: 'Generate summary', userId: 'u1' };
      const result = await service.create(input);
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('job-1');
    });
  });
});
