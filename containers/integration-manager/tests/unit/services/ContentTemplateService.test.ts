/**
 * Content Template Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared';
import { ContentTemplateService } from '../../../src/services/ContentTemplateService';

describe('ContentTemplateService', () => {
  let service: ContentTemplateService;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue({ resource: { id: 'ct-1', tenantId: 't1' } });
    vi.mocked(getContainer).mockReturnValue({
      items: { create: mockCreate, query: vi.fn(() => ({ fetchNext: vi.fn().mockResolvedValue({ resources: [] }) })) },
      item: vi.fn(() => ({ read: vi.fn().mockResolvedValue({ resource: null }) })),
    } as any);
    service = new ContentTemplateService();
  });

  describe('create', () => {
    it('should throw when tenantId missing', async () => {
      await expect(
        service.create({ name: 'T', templateContent: 'x', userId: 'u1' } as any)
      ).rejects.toThrow(/tenantId is required/);
    });

    it('should throw when name or templateContent missing', async () => {
      await expect(
        service.create({ tenantId: 't1', templateContent: 'x', userId: 'u1' } as any)
      ).rejects.toThrow(/name is required/);
      await expect(
        service.create({ tenantId: 't1', name: 'T', userId: 'u1' } as any)
      ).rejects.toThrow(/templateContent is required/);
    });

    it('should create and return template', async () => {
      const input = { tenantId: 't1', name: 'T', templateContent: 'Hello', userId: 'u1' };
      const result = await service.create(input);
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
