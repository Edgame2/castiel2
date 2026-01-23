import { describe, it, expect, beforeEach } from 'vitest';
import { MockMonitoringProvider } from '../src/providers/mock.js';
import { SeverityLevel } from '../src/types.js';

describe('MockMonitoringProvider', () => {
  let provider: MockMonitoringProvider;

  beforeEach(() => {
    provider = new MockMonitoringProvider({
      enabled: true,
      provider: 'mock',
    });
  });

  describe('trackMetric', () => {
    it('should track a metric', () => {
      provider.trackMetric('test.metric', 42, { region: 'us-east-1' });

      const metrics = provider.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test.metric');
      expect(metrics[0].value).toBe(42);
      expect(metrics[0].properties).toEqual({ region: 'us-east-1' });
    });

    it('should not track metrics when disabled', () => {
      const disabledProvider = new MockMonitoringProvider({
        enabled: false,
        provider: 'mock',
      });

      disabledProvider.trackMetric('test.metric', 42);
      expect(disabledProvider.getMetrics()).toHaveLength(0);
    });
  });

  describe('trackEvent', () => {
    it('should track an event', () => {
      provider.trackEvent('user.login', { userId: '123', method: 'oauth' });

      const events = provider.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('user.login');
      expect(events[0].properties).toEqual({ userId: '123', method: 'oauth' });
    });
  });

  describe('trackTrace', () => {
    it('should track a trace with severity', () => {
      provider.trackTrace('Cache miss', SeverityLevel.Warning, { key: 'user:123' });

      const traces = provider.getTraces();
      expect(traces).toHaveLength(1);
      expect(traces[0].message).toBe('Cache miss');
      expect(traces[0].severity).toBe(SeverityLevel.Warning);
      expect(traces[0].properties).toEqual({ key: 'user:123' });
    });

    it('should default to Information severity', () => {
      provider.trackTrace('Debug message', SeverityLevel.Information);

      const traces = provider.getTraces();
      expect(traces[0].severity).toBe(SeverityLevel.Information);
    });
  });

  describe('trackException', () => {
    it('should track an exception', () => {
      const error = new Error('Test error');
      provider.trackException(error, { operation: 'test' });

      const exceptions = provider.getExceptions();
      expect(exceptions).toHaveLength(1);
      expect(exceptions[0].error).toBe(error);
      expect(exceptions[0].properties).toEqual({ operation: 'test' });
    });
  });

  describe('trackRequest', () => {
    it('should track a successful request', () => {
      provider.trackRequest('GET /api/users', 'https://api.test.com/users', 150, 200, true);

      const requests = provider.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].name).toBe('GET /api/users');
      expect(requests[0].responseCode).toBe(200);
      expect(requests[0].duration).toBe(150);
      expect(requests[0].success).toBe(true);
    });

    it('should track a failed request', () => {
      provider.trackRequest('POST /api/orders', 'https://api.test.com/orders', 250, 500, false);

      const requests = provider.getRequests();
      expect(requests[0].responseCode).toBe(500);
      expect(requests[0].success).toBe(false);
    });
  });

  describe('trackDependency', () => {
    it('should track a dependency call', () => {
      provider.trackDependency(
        'RedisCache.get',
        'Redis',
        'cache-server',
        25,
        true,
        undefined,
        { key: 'user:123' }
      );

      const dependencies = provider.getDependencies();
      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].name).toBe('RedisCache.get');
      expect(dependencies[0].type).toBe('Redis');
      expect(dependencies[0].target).toBe('cache-server');
      expect(dependencies[0].duration).toBe(25);
      expect(dependencies[0].success).toBe(true);
    });

    it('should track failed dependency with result code', () => {
      provider.trackDependency('CosmosDB.query', 'Azure Cosmos DB', 'castiel-db', 500, false, '503');

      const dependencies = provider.getDependencies();
      expect(dependencies[0].success).toBe(false);
      expect(dependencies[0].data).toBe('503');
    });
  });

  describe('getUserContext', () => {
    it('should return user context', () => {
      const userContext = provider.getUserContext();
      expect(userContext).toEqual({});
    });
  });

  describe('startTimer', () => {
    it('should track metric duration', async () => {
      const endTimer = provider.startTimer('test.operation');

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 50));

      endTimer();

      const metrics = provider.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test.operation');
      expect(metrics[0].value).toBeGreaterThanOrEqual(50);
    });
  });

  describe('clear', () => {
    it('should clear all tracked data', () => {
      provider.trackMetric('test.metric', 1);
      provider.trackEvent('test.event');
      provider.trackTrace('test message', SeverityLevel.Information);

      expect(provider.getMetrics()).toHaveLength(1);
      expect(provider.getEvents()).toHaveLength(1);
      expect(provider.getTraces()).toHaveLength(1);

      provider.clear();

      expect(provider.getMetrics()).toHaveLength(0);
      expect(provider.getEvents()).toHaveLength(0);
      expect(provider.getTraces()).toHaveLength(0);
      expect(provider.getExceptions()).toHaveLength(0);
      expect(provider.getRequests()).toHaveLength(0);
      expect(provider.getDependencies()).toHaveLength(0);
      expect(provider.getUserContext()).toEqual({});
    });
  });

  describe('flush', () => {
    it('should resolve immediately', async () => {
      await expect(provider.flush()).resolves.toBeUndefined();
    });
  });
});
