/**
 * QualityMonitoringService unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityMonitoringService } from '../../../src/services/QualityMonitoringService';
import { getContainer } from '@coder/shared/database';
import * as config from '../../../src/config';

vi.mock('../../../src/config', () => ({ loadConfig: vi.fn() }));

describe('QualityMonitoringService', () => {
  let service: QualityMonitoringService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockFetchAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn().mockResolvedValue(undefined);
    mockFetchAll = vi.fn().mockResolvedValue({ resources: [] });
    (config.loadConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      services: { ai_service: { url: '' }, ml_service: { url: '' } },
    } as any);
    vi.mocked(getContainer).mockImplementation((name: string) => ({
      items: {
        create: mockCreate,
        query: vi.fn(() => ({ fetchAll: mockFetchAll, fetchNext: vi.fn() })),
      },
      item: vi.fn(() => ({ read: vi.fn(), replace: vi.fn(), delete: vi.fn() })),
    })) as unknown as ReturnType<typeof getContainer>;
    service = new QualityMonitoringService();
  });

  describe('detectAnomaly', () => {
    it('returns null when fewer than 10 historical metrics', async () => {
      mockFetchAll.mockResolvedValue({ resources: Array(5).fill({ value: 10 }) });
      const result = await service.detectAnomaly('t1', { metricType: 'latency', value: 100 });
      expect(result).toBeNull();
    });
    it('returns null when z-score <= 3', async () => {
      const values = Array(15).fill(100);
      mockFetchAll.mockResolvedValue({ resources: values.map((v) => ({ value: v })) });
      const result = await service.detectAnomaly('t1', { metricType: 'latency', value: 100 });
      expect(result).toBeNull();
    });
    it('returns anomaly and stores when z-score > 3', async () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      mockFetchAll.mockResolvedValue({ resources: values.map((v) => ({ value: v })) });
      const result = await service.detectAnomaly('t1', { metricType: 'latency', value: 100 });
      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('t1');
      expect(result!.anomalyType).toBe('latency');
      expect(result!.resolved).toBe(false);
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('recordMetric', () => {
    it('records metric and returns record', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });
      const result = await service.recordMetric('t1', {
        metricType: 'latency',
        value: 50,
        threshold: 100,
        status: 'normal',
        measuredAt: new Date(),
      });
      expect(result.tenantId).toBe('t1');
      expect(result.metricType).toBe('latency');
      expect(result.value).toBe(50);
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
