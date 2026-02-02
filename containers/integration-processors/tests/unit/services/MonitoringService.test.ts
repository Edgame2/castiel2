/**
 * Monitoring Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonitoringService } from '../../../src/services/MonitoringService';
import type { ServiceClient } from '@coder/shared';

vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    rabbitmq: { url: '', dlq: { alert_threshold: 100 } },
    azure: { blob_storage: {} },
  })),
}));

describe('MonitoringService', () => {
  let service: MonitoringService;
  let mockShardManager: ServiceClient;
  let mockIntegrationManager: ServiceClient;

  beforeEach(() => {
    mockShardManager = {
      get: vi.fn().mockResolvedValue({ status: 'ok' }),
    } as unknown as ServiceClient;
    mockIntegrationManager = {} as ServiceClient;
    service = new MonitoringService(mockShardManager, mockIntegrationManager, 'light');
  });

  describe('constructor', () => {
    it('should create instance with shardManager and consumerType', () => {
      expect(service).toBeInstanceOf(MonitoringService);
    });
  });

  describe('recordMessageProcessed', () => {
    it('should record processing time', () => {
      service.recordMessageProcessed('queue1', 100);
      service.recordMessageProcessed('queue1', 200);
      const status = service.getProcessorStatus();
      expect(status[0].messagesProcessed).toBe(2);
    });
  });

  describe('recordError', () => {
    it('should record error by type', () => {
      service.recordError('ValidationError');
      service.recordError('ValidationError');
      const analytics = service.getErrorAnalytics();
      expect(analytics.totalErrors).toBe(2);
      expect(analytics.errors.find((e) => e.errorType === 'ValidationError')?.count).toBe(2);
    });
  });

  describe('getProcessorStatus', () => {
    it('should return processor status with type and instanceId', () => {
      service.recordMessageProcessed('q1', 50);
      const status = service.getProcessorStatus();
      expect(status).toHaveLength(1);
      expect(status[0].type).toBe('light');
      expect(status[0].instanceId).toBeDefined();
      expect(status[0].messagesProcessed).toBe(1);
      expect(status[0].status).toBe('running');
    });

    it('should report heavy type when consumerType is heavy', () => {
      const heavyService = new MonitoringService(mockShardManager, mockIntegrationManager, 'heavy');
      const status = heavyService.getProcessorStatus();
      expect(status[0].type).toBe('heavy');
    });
  });

  describe('getErrorAnalytics', () => {
    it('should return empty errors when no errors recorded', () => {
      const analytics = service.getErrorAnalytics();
      expect(analytics.errors).toEqual([]);
      expect(analytics.totalErrors).toBe(0);
      expect(analytics.errorRate).toBe(0);
    });

    it('should compute error rate when messages and errors exist', () => {
      service.recordMessageProcessed('q1', 10);
      service.recordMessageProcessed('q1', 10);
      service.recordError('Err');
      const analytics = service.getErrorAnalytics();
      expect(analytics.totalErrors).toBe(1);
      expect(analytics.errorRate).toBe(0.5);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return metrics with zero throughput when no messages', () => {
      const metrics = service.getPerformanceMetrics();
      expect(metrics.avgProcessingTime).toBe(0);
      expect(metrics.throughput).toBe(0);
      expect(metrics.successRate).toBe(1);
    });

    it('should include byProcessorType for light consumer', () => {
      service.recordMessageProcessed('q1', 100);
      const metrics = service.getPerformanceMetrics();
      expect(metrics.byProcessorType.light.avgTime).toBe(100);
      expect(metrics.byProcessorType.heavy.avgTime).toBe(0);
    });
  });

  describe('getSystemHealth', () => {
    it('should call shardManager health and return status', async () => {
      const health = await service.getSystemHealth();
      expect(mockShardManager.get).toHaveBeenCalledWith('/health');
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.components.shardManager.status).toBe('healthy');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should mark shardManager unhealthy when get fails', async () => {
      vi.mocked(mockShardManager.get).mockRejectedValue(new Error('down'));
      const health = await service.getSystemHealth();
      expect(health.components.shardManager.status).toBe('unhealthy');
    });
  });

  describe('getIntegrationHealth', () => {
    it('should return empty array', async () => {
      const result = await service.getIntegrationHealth();
      expect(result).toEqual([]);
    });
  });

  describe('getQueueMetrics', () => {
    it('should return empty array when rabbitmq not configured', async () => {
      const queues = await service.getQueueMetrics();
      expect(queues).toEqual([]);
    });
  });

  describe('getDLQMetrics', () => {
    it('should return default when rabbitmq not configured', async () => {
      const dlq = await service.getDLQMetrics();
      expect(dlq.queueName).toBe('integration_data_raw.dlq');
      expect(dlq.depth).toBe(0);
      expect(dlq.status).toBe('healthy');
    });
  });
});
