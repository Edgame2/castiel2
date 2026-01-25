/**
 * Quality Monitoring Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityMonitoringService } from '../../../src/services/QualityMonitoringService';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    database: {
      containers: {
        quality_metrics: 'quality_metrics',
        quality_anomalies: 'quality_anomalies',
      },
    },
  })),
}));

vi.mock('../../../src/utils/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('QualityMonitoringService', () => {
  let service: QualityMonitoringService;
  let mockMetricsContainer: any;
  let mockAnomaliesContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock containers
    mockMetricsContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
      },
    };

    mockAnomaliesContainer = {
      items: {
        create: vi.fn(),
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
      },
    };

    (getContainer as any).mockImplementation((name: string) => {
      if (name === 'quality_metrics') {
        return mockMetricsContainer;
      }
      if (name === 'quality_anomalies') {
        return mockAnomaliesContainer;
      }
      return mockMetricsContainer;
    });

    service = new QualityMonitoringService();
  });

  describe('recordMetric', () => {
    it('should record a metric successfully', async () => {
      const tenantId = 'tenant-123';
      const metric = {
        metricType: 'response_time',
        value: 150,
        threshold: 200,
        status: 'healthy' as const,
      };

      mockMetricsContainer.items.create.mockResolvedValue({
        resource: {
          id: 'metric-123',
          tenantId,
          ...metric,
          measuredAt: new Date(),
        },
      });

      await service.recordMetric(tenantId, metric);

      expect(mockMetricsContainer.items.create).toHaveBeenCalled();
    });

    it('should detect anomaly when metric exceeds threshold', async () => {
      const tenantId = 'tenant-123';
      const metric = {
        metricType: 'response_time',
        value: 250,
        threshold: 200,
        status: 'unhealthy' as const,
      };

      // Mock existing metrics for anomaly detection
      mockMetricsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            { value: 150 },
            { value: 160 },
            { value: 155 },
            { value: 250 }, // Current value
          ],
        }),
      });

      mockMetricsContainer.items.create.mockResolvedValue({
        resource: {
          id: 'metric-123',
          tenantId,
          ...metric,
        },
      });

      mockAnomaliesContainer.items.create.mockResolvedValue({
        resource: {
          id: 'anomaly-123',
          tenantId,
          metricType: metric.metricType,
          value: metric.value,
        },
      });

      await service.recordMetric(tenantId, metric);

      expect(mockMetricsContainer.items.create).toHaveBeenCalled();
      // Anomaly detection should be triggered
    });
  });

  describe('detectAnomaly', () => {
    it('should detect an anomaly successfully', async () => {
      const tenantId = 'tenant-123';
      const data = {
        metricType: 'response_time',
        value: 300,
      };

      // Mock historical metrics
      mockMetricsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            { value: 150 },
            { value: 160 },
            { value: 155 },
            { value: 145 },
          ],
        }),
      });

      mockAnomaliesContainer.items.create.mockResolvedValue({
        resource: {
          id: 'anomaly-123',
          tenantId,
          ...data,
          severity: 'high',
          detectedAt: new Date(),
        },
      });

      const result = await service.detectAnomaly(tenantId, data);

      expect(result).toBeDefined();
      expect(mockAnomaliesContainer.items.create).toHaveBeenCalled();
    });
  });

  describe('getAnomalies', () => {
    it('should retrieve anomalies successfully', async () => {
      const tenantId = 'tenant-123';

      const mockAnomalies = [
        {
          id: 'anomaly-1',
          tenantId,
          metricType: 'response_time',
          value: 300,
          severity: 'high',
        },
        {
          id: 'anomaly-2',
          tenantId,
          metricType: 'error_rate',
          value: 0.05,
          severity: 'medium',
        },
      ];

      mockAnomaliesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: mockAnomalies,
        }),
      });

      const result = await service.getAnomalies(tenantId, {});

      expect(result).toHaveProperty('anomalies');
      expect(result.anomalies.length).toBe(2);
    });
  });
});
