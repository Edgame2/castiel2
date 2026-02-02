/**
 * AIAnalyticsService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIAnalyticsService } from '../../../src/services/AIAnalyticsService';
import { getContainer } from '@coder/shared/database';
import * as config from '../../../src/config';

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

describe('AIAnalyticsService', () => {
  let service: AIAnalyticsService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockFetchNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue(undefined);
    mockFetchNext = vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined });
    (config.loadConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      services: { ai_service: { url: 'http://ai' } },
    } as any);
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchNext: mockFetchNext })),
      },
      item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new AIAnalyticsService();
  });

  describe('recordEvent', () => {
    it('records event and calls create', async () => {
      await expect(
        service.recordEvent('t1', {
          eventType: 'completion',
          modelId: 'gpt-4',
          tokens: 100,
        })
      ).resolves.toBeUndefined();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          eventType: 'completion',
          modelId: 'gpt-4',
          tokens: 100,
        }),
        { partitionKey: 't1' }
      );
    });
    it('throws on create failure', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'));
      await expect(
        service.recordEvent('t1', { eventType: 'usage' })
      ).rejects.toThrow(/Failed to record AI analytics event/);
    });
  });

  describe('getModelAnalytics', () => {
    it('returns resources from fetchNext', async () => {
      const models = [
        { id: 'm1', tenantId: 't1', modelId: 'gpt-4', usageCount: 10 },
      ];
      mockFetchNext.mockResolvedValue({ resources: models });
      const result = await service.getModelAnalytics('t1');
      expect(result).toHaveLength(1);
      expect(result[0].modelId).toBe('gpt-4');
    });
    it('filters by modelId when provided', async () => {
      mockFetchNext.mockResolvedValue({ resources: [] });
      await service.getModelAnalytics('t1', 'gpt-4');
      expect(mockFetchNext).toHaveBeenCalled();
    });
  });
});
