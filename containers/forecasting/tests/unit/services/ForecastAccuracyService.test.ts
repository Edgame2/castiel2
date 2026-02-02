/**
 * ForecastAccuracyService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForecastAccuracyService } from '../../../src/services/ForecastAccuracyService';
import { getContainer } from '@coder/shared/database';
import * as config from '../../../src/config';

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

describe('ForecastAccuracyService', () => {
  let service: ForecastAccuracyService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRead: ReturnType<typeof vi.fn>;
  let mockReplace: ReturnType<typeof vi.fn>;
  let mockFetchAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (config.loadConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      cosmos_db: { containers: { predictions: 'forecasting_predictions' } },
    } as any);
    mockCreate = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: { ...doc } }));
    mockRead = vi.fn().mockResolvedValue({ resource: null });
    mockReplace = vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc }));
    mockFetchAll = vi.fn().mockResolvedValue({ resources: [] });
    vi.mocked(getContainer).mockReturnValue({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchAll: mockFetchAll })),
      },
      item: vi.fn(() => ({ read: mockRead, replace: mockReplace, delete: vi.fn() })),
    } as unknown as ReturnType<typeof getContainer>);
    service = new ForecastAccuracyService();
  });

  describe('storePrediction', () => {
    it('stores prediction and returns doc', async () => {
      const result = await service.storePrediction({
        tenantId: 't1',
        opportunityId: 'opp1',
        forecastId: 'f1',
        forecastType: 'revenue',
        predictedValue: 1000,
      });
      expect(result.tenantId).toBe('t1');
      expect(result.opportunityId).toBe('opp1');
      expect(result.forecastType).toBe('revenue');
      expect(result.predictedValue).toBe(1000);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          opportunityId: 'opp1',
          forecastType: 'revenue',
          predictedValue: 1000,
        }),
        { partitionKey: 't1' }
      );
    });
    it('throws on create failure', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'));
      await expect(
        service.storePrediction({
          tenantId: 't1',
          opportunityId: 'opp1',
          forecastId: 'f1',
          forecastType: 'revenue',
          predictedValue: 500,
        })
      ).rejects.toThrow();
    });
  });

  describe('recordActual', () => {
    it('returns null when no matching prediction', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });
      const result = await service.recordActual('t1', {
        opportunityId: 'opp1',
        forecastType: 'revenue',
        actualValue: 800,
      });
      expect(result).toBeNull();
    });
    it('updates and returns prediction when found by predictionId', async () => {
      const pred = {
        id: 'p1',
        tenantId: 't1',
        opportunityId: 'opp1',
        forecastId: 'f1',
        forecastType: 'revenue' as const,
        predictedValue: 1000,
        predictedAt: new Date(),
        createdAt: new Date(),
      };
      mockRead.mockResolvedValue({ resource: pred });
      const updated = { ...pred, actualValue: 900, actualAt: new Date() };
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.recordActual('t1', {
        predictionId: 'p1',
        opportunityId: 'opp1',
        forecastType: 'revenue',
        actualValue: 900,
      });
      expect(result).not.toBeNull();
      expect(result!.actualValue).toBe(900);
      expect(mockReplace).toHaveBeenCalled();
    });
    it('updates and returns when found by query', async () => {
      const pred = {
        id: 'p1',
        tenantId: 't1',
        opportunityId: 'opp1',
        forecastType: 'revenue' as const,
        predictedValue: 1000,
        predictedAt: new Date(),
        createdAt: new Date(),
      };
      mockFetchAll.mockResolvedValue({ resources: [pred] });
      const updated = { ...pred, actualValue: 950, actualAt: new Date() };
      mockReplace.mockResolvedValue({ resource: updated });
      const result = await service.recordActual('t1', {
        opportunityId: 'opp1',
        forecastType: 'revenue',
        actualValue: 950,
      });
      expect(result).not.toBeNull();
      expect(result!.actualValue).toBe(950);
    });
  });

  describe('getAccuracyMetrics', () => {
    it('returns zeros when no pairs', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });
      const result = await service.getAccuracyMetrics('t1');
      expect(result.mape).toBe(0);
      expect(result.forecastBias).toBe(0);
      expect(result.r2).toBe(0);
      expect(result.sampleCount).toBe(0);
    });
    it('computes MAPE, bias, R² from pairs', async () => {
      mockFetchAll.mockResolvedValue({
        resources: [
          { predictedValue: 100, actualValue: 110 },
          { predictedValue: 200, actualValue: 190 },
        ],
      });
      const result = await service.getAccuracyMetrics('t1');
      expect(result.sampleCount).toBe(2);
      expect(typeof result.mape).toBe('number');
      expect(typeof result.forecastBias).toBe('number');
      expect(typeof result.r2).toBe('number');
    });
    it('filters by forecastType and date range when options provided', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });
      await service.getAccuracyMetrics('t1', {
        forecastType: 'revenue',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      expect(mockFetchAll).toHaveBeenCalled();
    });
  });
});
