import { describe, it, expect, beforeEach } from 'vitest';
import { MonitoringService, Monitor, TrackDependency } from '../src/service.js';
import { MockMonitoringProvider } from '../src/providers/mock.js';

describe('MonitoringService', () => {
  beforeEach(() => {
    MonitoringService.resetInstance();
  });

  describe('initialize', () => {
    it('should create Application Insights provider', () => {
      const provider = MonitoringService.initialize({
        enabled: true,
        provider: 'application-insights',
        instrumentationKey: 'test-key',
      });

      expect(provider).toBeDefined();
    });

    it('should create Mock provider', () => {
      const provider = MonitoringService.initialize({
        enabled: true,
        provider: 'mock',
      });

      expect(provider).toBeInstanceOf(MockMonitoringProvider);
    });

    it('should return singleton instance', () => {
      const provider1 = MonitoringService.initialize({
        enabled: true,
        provider: 'mock',
      });

      const provider2 = MonitoringService.initialize({
        enabled: true,
        provider: 'mock',
      });

      expect(provider1).toBe(provider2);
    });
  });

  describe('getInstance', () => {
    it('should return initialized instance', () => {
      MonitoringService.initialize({ enabled: true, provider: 'mock' });
      const instance = MonitoringService.getInstance();
      expect(instance).toBeInstanceOf(MockMonitoringProvider);
    });

    it('should throw if not initialized', () => {
      expect(() => MonitoringService.getInstance()).toThrow(
        'Monitoring service not initialized'
      );
    });
  });

  describe('resetInstance', () => {
    it('should clear singleton instance', () => {
      MonitoringService.initialize({ enabled: true, provider: 'mock' });
      MonitoringService.resetInstance();

      expect(() => MonitoringService.getInstance()).toThrow();
    });
  });
});

describe('Decorators', () => {
  let mockProvider: MockMonitoringProvider;

  beforeEach(() => {
    MonitoringService.resetInstance();
    mockProvider = MonitoringService.initialize({
      enabled: true,
      provider: 'mock',
    }) as MockMonitoringProvider;
    mockProvider.clear();
  });

  describe('@Monitor', () => {
    it('should track method execution', async () => {
      class TestService {
        @Monitor('test.operation')
        async testMethod() {
          return 'success';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      expect(result).toBe('success');
      const metrics = mockProvider.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.some((m) => m.name === 'test.operation')).toBe(true);
    });

    it('should track method failure', async () => {
      class TestService {
        @Monitor('test.failing')
        async failingMethod() {
          throw new Error('Test error');
        }
      }

      const service = new TestService();

      await expect(service.failingMethod()).rejects.toThrow('Test error');

      const exceptions = mockProvider.getExceptions();
      expect(exceptions).toHaveLength(1);
      expect(exceptions[0].error.message).toBe('Test error');
    });
  });

  describe('@TrackDependency', () => {
    it('should track successful dependency call', async () => {
      class CacheService {
        @TrackDependency('Redis', 'cache-server')
        async get(key: string) {
          return 'cached-value';
        }
      }

      const service = new CacheService();
      const result = await service.get('test-key');

      expect(result).toBe('cached-value');

      const dependencies = mockProvider.getDependencies();
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].type).toBe('Redis');
      expect(dependencies[0].target).toBe('cache-server');
      expect(dependencies[0].success).toBe(true);
    });

    it('should track failed dependency call', async () => {
      class DatabaseService {
        @TrackDependency('Cosmos DB', 'castiel-db')
        async query() {
          throw new Error('Connection failed');
        }
      }

      const service = new DatabaseService();

      await expect(service.query()).rejects.toThrow('Connection failed');

      const dependencies = mockProvider.getDependencies();
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].success).toBe(false);
      expect(dependencies[0].data).toBe('Connection failed');
    });
  });
});
