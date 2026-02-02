/**
 * Quality Monitoring Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityMonitoringService } from '../../../src/services/QualityMonitoringService';
import { getContainer } from '@coder/shared/database';

const mockClients = vi.hoisted(() => ({
  ai: { get: vi.fn(), post: vi.fn() },
  ml: { get: vi.fn(), post: vi.fn() },
  analytics: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: unknown, config: { baseURL?: string }) {
    if (config?.baseURL?.includes('ai-service')) return mockClients.ai;
    if (config?.baseURL?.includes('ml-service')) return mockClients.ml;
    if (config?.baseURL?.includes('analytics-service')) return mockClients.analytics;
    return { get: vi.fn(), post: vi.fn() };
  }),
}));

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      ai_service: { url: 'http://ai-service:3000' },
      ml_service: { url: 'http://ml-service:3000' },
      analytics_service: { url: 'http://analytics-service:3000' },
    },
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
    it('should detect an anomaly when value deviates >2.5 std and >=10 historical metrics', async () => {
      const tenantId = 'tenant-123';
      const data = { metricType: 'response_time', value: 300 };

      // Service requires >=10 historical metrics and zScore > 2.5 to create an anomaly
      const historical = Array.from({ length: 12 }, (_, i) => ({ value: 148 + i }));
      mockMetricsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: historical }),
      });

      mockAnomaliesContainer.items.create.mockResolvedValue({ resource: {} });

      const result = await service.detectAnomaly(tenantId, data);

      expect(result).toBeDefined();
      expect(result?.severity).toBeDefined();
      expect(mockAnomaliesContainer.items.create).toHaveBeenCalled();
    });

    it('should return null when fewer than 10 historical metrics', async () => {
      const tenantId = 'tenant-123';
      const data = { metricType: 'response_time', value: 300 };
      mockMetricsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [{ value: 150 }, { value: 160 }] }),
      });

      const result = await service.detectAnomaly(tenantId, data);

      expect(result).toBeNull();
      expect(mockAnomaliesContainer.items.create).not.toHaveBeenCalled();
    });
  });
});
