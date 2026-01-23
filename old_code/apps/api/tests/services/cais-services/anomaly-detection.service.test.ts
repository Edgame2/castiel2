/**
 * Anomaly Detection Service Tests
 * Tests for comprehensive anomaly detection
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AnomalyDetectionService } from '../../../src/services/anomaly-detection.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { EarlyWarningService } from '../../../src/services/early-warning.service.js';
import type { DataQualityService } from '../../../src/services/data-quality.service.js';

// Mock dependencies
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockCosmosClient = {
  database: vi.fn().mockReturnValue({
    container: vi.fn().mockReturnValue({
      items: {
        query: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      item: vi.fn().mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
      }),
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
} as unknown as Redis;

const mockEarlyWarningService = {
  detectSignals: vi.fn(),
} as unknown as EarlyWarningService;

const mockDataQualityService = {
  assessQuality: vi.fn(),
} as unknown as DataQualityService;

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnomalyDetectionService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring,
      mockEarlyWarningService,
      mockDataQualityService
    );
  });

  describe('detectOpportunityAnomalies', () => {
    it('should detect statistical anomalies', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const data = {
        riskScore: 0.95, // Very high - anomaly
        forecast: 100000,
        activityCount: 50,
        stageDuration: 200, // Days - very long
        stakeholderCount: 15,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          tenantId,
          opportunityId,
          anomalyType: 'statistical',
          severity: 'high',
          score: 0.85,
        },
      });

      const result = await service.detectOpportunityAnomalies(tenantId, opportunityId, data);

      expect(result).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should detect forecast miss anomalies', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const forecast = 100000;
      const actual = 50000; // 50% miss

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          tenantId,
          opportunityId,
          anomalyType: 'forecast_miss',
          severity: 'high',
          score: 0.5,
        },
      });

      const result = await service.detectForecastMiss(tenantId, opportunityId, forecast, actual);

      expect(result).toBeDefined();
      expect(result?.anomalyType).toBe('forecast_miss');
      expect(result?.severity).toBe('high');
    });

    it('should not flag small forecast deviations as anomalies', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const forecast = 100000;
      const actual = 95000; // 5% deviation - within threshold

      const result = await service.detectForecastMiss(tenantId, opportunityId, forecast, actual);

      expect(result).toBeNull(); // Should not be flagged as anomaly
    });

    it('should detect pattern-based anomalies', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const data = {
        riskScore: 0.5,
        forecast: 100000,
        activityCount: 0, // No activity - pattern anomaly
        stageDuration: 10,
        stakeholderCount: 1,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          tenantId,
          opportunityId,
          anomalyType: 'pattern',
          severity: 'medium',
          score: 0.6,
        },
      });

      const result = await service.detectOpportunityAnomalies(tenantId, opportunityId, data);

      expect(result).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should integrate with EarlyWarningService for high-severity anomalies', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const data = {
        riskScore: 0.95,
        forecast: 100000,
        activityCount: 50,
        stageDuration: 200,
        stakeholderCount: 15,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          tenantId,
          opportunityId,
          anomalyType: 'statistical',
          severity: 'critical',
          score: 0.95,
        },
      });

      (mockEarlyWarningService.detectSignals as any).mockResolvedValue([]);

      await service.detectOpportunityAnomalies(tenantId, opportunityId, data);

      expect(mockEarlyWarningService.detectSignals).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const data = {
        riskScore: 0.5,
        forecast: 100000,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Database error'));

      await expect(
        service.detectOpportunityAnomalies(tenantId, opportunityId, data)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('anomaly summary', () => {
    it('should provide summary of detected anomalies', async () => {
      const tenantId = 'tenant-1';
      const opportunityId = 'opp-1';
      const data = {
        riskScore: 0.95,
        forecast: 100000,
        activityCount: 0,
        stageDuration: 200,
        stakeholderCount: 1,
      };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'anomaly-1',
          tenantId,
          opportunityId,
          anomalyType: 'statistical',
          severity: 'high',
        },
      });

      const result = await service.detectOpportunityAnomalies(tenantId, opportunityId, data);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.bySeverity).toBeDefined();
    });
  });
});
