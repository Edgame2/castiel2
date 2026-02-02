/**
 * Unit tests for PipelineAnalyticsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';
import { OpportunityService } from '../../../src/services/OpportunityService';
import { PipelineAnalyticsService } from '../../../src/services/PipelineAnalyticsService';
import { SalesStage, OpportunityStatus } from '../../../src/types/pipeline.types';

describe('PipelineAnalyticsService', () => {
  let opportunityService: OpportunityService;
  let service: PipelineAnalyticsService;

  beforeEach(() => {
    opportunityService = new OpportunityService('http://shard-manager');
    service = new PipelineAnalyticsService(opportunityService);
  });

  describe('getAnalytics', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(service.getAnalytics('')).rejects.toThrow(BadRequestError);
    });

    it('returns analytics from opportunity data', async () => {
      const now = new Date();
      const resources = [
        {
          id: 'o1',
          tenantId: 't1',
          shardId: 's1',
          structuredData: {
            name: 'Deal 1',
            stage: SalesStage.QUALIFICATION,
            status: OpportunityStatus.OPEN,
            ownerId: 'owner-1',
            ownerName: 'Owner One',
            amount: 1000,
            expectedRevenue: 250,
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'o2',
          tenantId: 't1',
          shardId: 's2',
          structuredData: {
            name: 'Deal 2',
            stage: SalesStage.QUALIFICATION,
            status: OpportunityStatus.WON,
            ownerId: 'owner-1',
            ownerName: 'Owner One',
            amount: 2000,
            expectedRevenue: 2000,
            isClosed: true,
            closeDate: now,
          },
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: now,
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources }),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.getAnalytics('t1');

      expect(result.totalOpportunities).toBe(2);
      expect(result.totalAmount).toBe(3000);
      expect(result.totalExpectedRevenue).toBe(2250);
      expect(result.byStage).toBeDefined();
      expect(result.byStatus).toBeDefined();
      expect(result.byOwner).toBeDefined();
      expect(result.winRate).toBe(100); // 1 won, 1 lost (filtered out closed lost) -> actually we excluded LOST so won/(won+lost)=1/1=100
      expect(result.averageDealSize).toBe(1500);
    });

    it('returns zero metrics when no opportunities', async () => {
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.getAnalytics('t1');

      expect(result.totalOpportunities).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.averageDealSize).toBe(0);
    });
  });

  describe('getForecast', () => {
    it('throws BadRequestError when tenantId is missing', async () => {
      await expect(
        service.getForecast('', {
          startDate: new Date(),
          endDate: new Date(),
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('returns forecast for period', async () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');
      const resources = [
        {
          id: 'o1',
          tenantId: 't1',
          shardId: 's1',
          structuredData: {
            name: 'Deal 1',
            stage: SalesStage.NEGOTIATION_REVIEW,
            status: OpportunityStatus.OPEN,
            amount: 5000,
            expectedRevenue: 3750,
            probability: 75,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(getContainer).mockReturnValue({
        items: {
          create: vi.fn(),
          query: vi.fn(() => ({
            fetchNext: vi.fn(),
            fetchAll: vi.fn().mockResolvedValue({ resources }),
          })),
        },
        item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
      } as unknown as ReturnType<typeof getContainer>);

      const result = await service.getForecast('t1', { startDate: start, endDate: end });

      expect(result.period.startDate).toEqual(start);
      expect(result.period.endDate).toEqual(end);
      expect(result.forecastedRevenue).toBe(3750);
      expect(result.committedRevenue).toBe(3750);
      expect(result.bestCaseRevenue).toBe(5000);
      expect(result.pipelineRevenue).toBe(3750);
      expect(result.byStage).toBeDefined();
      expect(result.confidence).toBe(75);
    });
  });
});
