/**
 * Adversarial Testing Service Tests
 * Tests for adversarial testing and vulnerability detection
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdversarialTestingService } from '../../../src/services/adversarial-testing.service.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';

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

describe('AdversarialTestingService', () => {
  let service: AdversarialTestingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdversarialTestingService(mockCosmosClient, mockRedis, mockMonitoring);
  });

  describe('runTest', () => {
    it('should run input perturbation test', async () => {
      const tenantId = 'tenant-1';
      const testType = 'input_perturbation';
      const target = 'risk_evaluation';
      const parameters = { perturbationLevel: 0.1 };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'test-1',
          tenantId,
          testType,
          target,
          vulnerability: { detected: false },
        },
      });

      const result = await service.runTest(tenantId, testType, target, parameters);

      expect(result).toBeDefined();
      expect(result.testType).toBe(testType);
      expect(mockContainer.items.create).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });

    it('should run stress test', async () => {
      const tenantId = 'tenant-1';
      const testType = 'stress_test';
      const target = 'forecast_service';
      const parameters = { loadMultiplier: 10 };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'test-1',
          tenantId,
          testType,
          target,
          vulnerability: { detected: true, severity: 'high' },
        },
      });

      const result = await service.runTest(tenantId, testType, target, parameters);

      expect(result).toBeDefined();
      expect(result.vulnerability.detected).toBe(true);
    });

    it('should run gaming detection test', async () => {
      const tenantId = 'tenant-1';
      const testType = 'gaming_detection';
      const target = 'recommendations';
      const parameters = { pattern: 'exploit' };

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockResolvedValue({
        resource: {
          id: 'test-1',
          tenantId,
          testType,
          target,
          vulnerability: { detected: true, severity: 'critical' },
        },
      });

      const result = await service.runTest(tenantId, testType, target, parameters);

      expect(result).toBeDefined();
      expect(result.vulnerability.severity).toBe('critical');
    });

    it('should handle test errors gracefully', async () => {
      const tenantId = 'tenant-1';
      const testType = 'input_perturbation';
      const target = 'risk_evaluation';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.create as any).mockRejectedValue(new Error('Test failed'));

      await expect(
        service.runTest(tenantId, testType, target)
      ).rejects.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('getVulnerabilities', () => {
    it('should retrieve unresolved vulnerabilities', async () => {
      const tenantId = 'tenant-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'vuln-1',
              vulnerability: { detected: true, severity: 'high' },
              resolved: false,
            },
            {
              id: 'vuln-2',
              vulnerability: { detected: true, severity: 'medium' },
              resolved: false,
            },
          ],
        }),
      });

      const result = await service.getVulnerabilities(tenantId, { resolved: false });

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it('should filter by severity', async () => {
      const tenantId = 'tenant-1';

      const mockContainer = (mockCosmosClient.database as any)().container();
      (mockContainer.items.query as any).mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'vuln-1',
              vulnerability: { detected: true, severity: 'critical' },
              resolved: false,
            },
          ],
        }),
      });

      const result = await service.getVulnerabilities(tenantId, { severity: 'critical' });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('markResolved', () => {
    it('should mark vulnerability as resolved', async () => {
      const tenantId = 'tenant-1';
      const testId = 'test-1';
      const resolution = 'Fixed by updating validation logic';

      const mockContainer = (mockCosmosClient.database as any)().container();
      const mockItem = mockContainer.item();
      (mockItem.read as any).mockResolvedValue({
        resource: {
          id: testId,
          tenantId,
          vulnerability: { detected: true },
          resolved: false,
        },
      });
      (mockItem.replace as any).mockResolvedValue({
        resource: {
          id: testId,
          resolved: true,
          resolution,
          resolvedAt: new Date(),
        },
      });

      await service.markResolved(tenantId, testId, resolution);

      expect(mockItem.replace).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalled();
    });
  });
});
