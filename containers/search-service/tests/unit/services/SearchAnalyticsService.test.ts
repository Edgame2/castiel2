/**
 * SearchAnalyticsService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchAnalyticsService } from '../../../src/services/SearchAnalyticsService';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';

describe('SearchAnalyticsService', () => {
  let service: SearchAnalyticsService;
  let mockFetchAll: ReturnType<typeof vi.fn>;

  const period = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAll = vi.fn().mockResolvedValue({ resources: [] });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        query: vi.fn(() => ({ fetchAll: mockFetchAll })),
      },
    } as unknown as ReturnType<typeof getContainer>);
    service = new SearchAnalyticsService();
  });

  describe('getAnalytics', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.getAnalytics('', period)
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.getAnalytics('', period)
      ).rejects.toThrow(/tenantId is required/);
    });

    it('returns aggregated analytics from query resources', async () => {
      const resources = [
        {
          id: 'q1',
          tenantId: 't1',
          userId: 'u1',
          query: 'test query',
          searchType: 'vector' as const,
          resultsCount: 5,
          took: 100,
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'q2',
          tenantId: 't1',
          userId: 'u1',
          query: 'test query',
          searchType: 'vector' as const,
          resultsCount: 3,
          took: 50,
          createdAt: new Date('2025-01-16'),
        },
      ];
      mockFetchAll.mockResolvedValue({ resources });
      const result = await service.getAnalytics('t1', period);
      expect(result.tenantId).toBe('t1');
      expect(result.period).toEqual(period);
      expect(result.totalQueries).toBe(2);
      expect(result.uniqueQueries).toBe(1);
      expect(result.averageResultsCount).toBe(4);
      expect(result.averageResponseTime).toBe(75);
      expect(result.bySearchType).toHaveLength(1);
      expect(result.bySearchType[0].type).toBe('vector');
      expect(result.bySearchType[0].count).toBe(2);
      expect(result.topQueries).toBeDefined();
      expect(result.topShardTypes).toBeDefined();
    });

    it('returns zero averages when no resources', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });
      const result = await service.getAnalytics('t1', period);
      expect(result.totalQueries).toBe(0);
      expect(result.uniqueQueries).toBe(0);
      expect(result.averageResultsCount).toBe(0);
      expect(result.averageResponseTime).toBe(0);
      expect(result.bySearchType).toEqual([]);
      expect(result.topQueries).toEqual([]);
    });

    it('throws on query failure', async () => {
      mockFetchAll.mockRejectedValue(new Error('db error'));
      await expect(service.getAnalytics('t1', period)).rejects.toThrow(
        /Failed to calculate search analytics/
      );
    });
  });
});
