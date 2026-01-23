import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationRateLimiter } from './integration-rate-limiter.service.js';
import { ICacheProvider } from '../interfaces/cache.interface.js';
import { IMonitoringProvider } from '../interfaces/monitoring.interface.js';
import { IServiceBusProvider } from '../interfaces/service-bus.interface.js';

describe('IntegrationRateLimiter', () => {
  let rateLimiter: IntegrationRateLimiter;
  let mockCache: any;
  let mockMonitoring: any;
  let mockServiceBus: any;

  beforeEach(() => {
    // Mock cache
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    };

    // Mock monitoring
    mockMonitoring = {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
      trackMetric: vi.fn(),
    };

    // Mock service bus
    mockServiceBus = {
      publishMessage: vi.fn(),
    };

    rateLimiter = new IntegrationRateLimiter(
      mockCache,
      mockMonitoring,
      mockServiceBus
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(void 0);

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetAt).toBeDefined();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should reject request when rate limit exceeded', async () => {
      // Mock 300 requests already made (Salesforce limit)
      mockCache.get.mockResolvedValue(
        JSON.stringify({ count: 300, createdAt: Date.now() })
      );

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'rate_limit_exceeded',
        expect.any(Object)
      );
    });

    it('should enforce per-integration limits', async () => {
      // Salesforce: 300/min
      mockCache.get.mockResolvedValueOnce(
        JSON.stringify({ count: 299, createdAt: Date.now() })
      );
      mockCache.get.mockResolvedValueOnce(null);  // Tenant limit not hit

      const result1 = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(result1.allowed).toBe(true);

      // Next request should be rejected
      mockCache.get.mockResolvedValueOnce(
        JSON.stringify({ count: 300, createdAt: Date.now() })
      );
      mockCache.get.mockResolvedValueOnce(null);

      const result2 = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(result2.allowed).toBe(false);
    });

    it('should enforce per-tenant limits', async () => {
      // Tenant limit: 5000/min
      mockCache.get.mockResolvedValueOnce(null);  // Integration limit ok
      mockCache.get.mockResolvedValueOnce(
        JSON.stringify({ count: 5000, createdAt: Date.now() })
      );

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(result.allowed).toBe(false);
    });

    it('should enforce per-operation limits', async () => {
      // Create operation: 100/min
      mockCache.get.mockResolvedValue(
        JSON.stringify({ count: 100, createdAt: Date.now() })
      );
      mockCache.get.mockResolvedValueOnce(null);

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
        operation: 'create',
      });

      expect(result.allowed).toBe(false);
    });

    it('should warn when approaching rate limit (80%)', async () => {
      // Salesforce limit: 300, at 240 (80%)
      mockCache.get.mockResolvedValueOnce(
        JSON.stringify({ count: 239, createdAt: Date.now() })
      );
      mockCache.get.mockResolvedValueOnce(null);

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(result.allowed).toBe(true);
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'rate_limit_warning',
        expect.any(Object)
      );
    });

    it('should queue requests instead of rejecting for fetch operations', async () => {
      // Exceed limit but try to queue
      mockCache.get.mockResolvedValueOnce(
        JSON.stringify({ count: 300, createdAt: Date.now() })
      );
      mockCache.get.mockResolvedValueOnce(null);

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
        operation: 'fetch',
      });

      expect(result.queued).toBe(true);
      expect(result.allowed).toBe(true);
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'rate_limit_queued',
        expect.any(Object)
      );
    });

    it('should allow request on cache failure (graceful degradation)', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(result.allowed).toBe(true);
      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });

  describe('updateAdaptiveLimit', () => {
    it('should reduce rate limit when provider near capacity', async () => {
      // Salesforce near limit: 950/1000 used
      const headers = {
        'sforce-limit-info': 'api=50/1000',
      };

      await rateLimiter.updateAdaptiveLimit('salesforce', 'tenant-123', headers);

      // Mock subsequent request with adaptive limit applied
      mockCache.get.mockResolvedValueOnce(null);
      mockCache.get.mockResolvedValueOnce(null);

      const result = await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'adaptive_limit_reduced',
        expect.any(Object)
      );
    });

    it('should restore rate limit when provider has capacity', async () => {
      // Salesforce has capacity: 900/1000 available
      const headers = {
        'sforce-limit-info': 'api=100/1000',
      };

      await rateLimiter.updateAdaptiveLimit('salesforce', 'tenant-123', headers);

      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'adaptive_limit_restored',
        expect.any(Object)
      );
    });

    it('should parse Notion rate limit headers', async () => {
      const headers = {
        'ratelimit-remaining': '150',
        'ratelimit-limit': '180',
      };

      await rateLimiter.updateAdaptiveLimit('notion', 'tenant-123', headers);

      // Should not be reduced (83% used, below 90%)
      expect(mockMonitoring.trackEvent).not.toHaveBeenCalledWith(
        'adaptive_limit_reduced',
        expect.any(Object)
      );
    });

    it('should parse Slack rate limit headers', async () => {
      const headers = {
        'x-rate-limit-remaining': '5',
        'x-rate-limit-limit': '60',
      };

      await rateLimiter.updateAdaptiveLimit('slack', 'tenant-123', headers);

      // Should be reduced (92% used)
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'adaptive_limit_reduced',
        expect.any(Object)
      );
    });

    it('should parse GitHub rate limit headers', async () => {
      const headers = {
        'x-ratelimit-remaining': '60',
        'x-ratelimit-limit': '360',
      };

      await rateLimiter.updateAdaptiveLimit('github', 'tenant-123', headers);

      expect(mockMonitoring.trackEvent).not.toHaveBeenCalledWith(
        'adaptive_limit_reduced',
        expect.any(Object)
      );
    });

    it('should handle missing headers gracefully', async () => {
      await rateLimiter.updateAdaptiveLimit('salesforce', 'tenant-123', {});

      // Should not throw, just not update
      expect(mockMonitoring.trackException).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return current rate limit status', async () => {
      mockCache.get.mockResolvedValue(
        JSON.stringify({ count: 100, createdAt: Date.now() })
      );

      const status = await rateLimiter.getStatus({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(status.integrationId).toBe('salesforce');
      expect(status.tenantId).toBe('tenant-123');
      expect(status.requestsPerMinute).toBe(300);  // Salesforce default
      expect(status.requestsMade).toBe(100);
      expect(status.requestsRemaining).toBe(200);
      expect(status.windowResetAt).toBeGreaterThan(Date.now());
    });

    it('should indicate when throttled (80% used)', async () => {
      mockCache.get.mockResolvedValue(
        JSON.stringify({ count: 240, createdAt: Date.now() })
      );

      const status = await rateLimiter.getStatus({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(status.isThrottled).toBe(true);
    });

    it('should include queued requests count', async () => {
      // Manually add queued requests
      const queue = [{ operation: 'fetch' }, { operation: 'create' }];
      (rateLimiter as any).queuedRequests.set(
        'rate_limit:tenant-123:salesforce:all',
        queue
      );

      mockCache.get.mockResolvedValue(null);

      const status = await rateLimiter.getStatus({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(status.queuedRequests).toBe(2);
    });

    it('should reflect adaptive multiplier in rate limit', async () => {
      // Set adaptive multiplier to 0.5
      (rateLimiter as any).adaptiveMultipliers.set('salesforce:tenant-123', 0.5);

      mockCache.get.mockResolvedValue(null);

      const status = await rateLimiter.getStatus({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(status.adaptiveMultiplier).toBe(0.5);
      expect(status.requestsPerMinute).toBe(150);  // 300 * 0.5
    });
  });

  describe('processQueue', () => {
    it('should process queued requests when rate limit allows', async () => {
      const queue = [
        { operation: 'fetch', integrationId: 'salesforce' },
        { operation: 'fetch', integrationId: 'salesforce' },
      ];
      (rateLimiter as any).queuedRequests.set(
        'rate_limit:tenant-123:salesforce:all',
        queue
      );

      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(void 0);

      const processed = await rateLimiter.processQueue('salesforce', 'tenant-123');

      expect(processed).toBeGreaterThan(0);
      expect(mockServiceBus.publishMessage).toHaveBeenCalled();
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'queue_processed',
        expect.any(Object)
      );
    });

    it('should stop processing when rate limit hit again', async () => {
      const queue = [
        { operation: 'fetch' },
        { operation: 'fetch' },
        { operation: 'fetch' },
      ];
      (rateLimiter as any).queuedRequests.set(
        'rate_limit:tenant-123:salesforce:all',
        queue
      );

      // Allow first request
      mockCache.get.mockResolvedValueOnce(null);
      mockCache.get.mockResolvedValueOnce(null);
      mockCache.set.mockResolvedValue(void 0);

      // Reject subsequent requests (back at limit)
      mockCache.get.mockResolvedValueOnce(
        JSON.stringify({ count: 300, createdAt: Date.now() })
      );

      const processed = await rateLimiter.processQueue('salesforce', 'tenant-123');

      expect(processed).toBe(1);  // Only first request processed
    });

    it('should clear queue when all requests processed', async () => {
      const queue = [{ operation: 'fetch' }];
      (rateLimiter as any).queuedRequests.set(
        'rate_limit:tenant-123:salesforce:all',
        queue
      );

      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(void 0);

      await rateLimiter.processQueue('salesforce', 'tenant-123');

      const remaining = (rateLimiter as any).queuedRequests.get(
        'rate_limit:tenant-123:salesforce:all'
      );

      expect(remaining).toBeUndefined();
    });
  });

  describe('setIntegrationLimit', () => {
    it('should set custom rate limit for integration', async () => {
      rateLimiter.setIntegrationLimit('salesforce', 500);

      mockCache.get.mockResolvedValue(null);

      const status = await rateLimiter.getStatus({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      expect(status.requestsPerMinute).toBe(500);
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'rate_limit_updated',
        { integrationId: 'salesforce', requestsPerMinute: 500 }
      );
    });
  });

  describe('setTenantLimit', () => {
    it('should set custom rate limit for tenant', async () => {
      rateLimiter.setTenantLimit('tenant-456', 10000);

      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'tenant_rate_limit_updated',
        { tenantId: 'tenant-456', requestsPerMinute: 10000 }
      );
    });
  });

  describe('resetIntegration', () => {
    it('should reset rate limit counters for integration', async () => {
      mockCache.delete.mockResolvedValue(void 0);

      await rateLimiter.resetIntegration('salesforce', 'tenant-123');

      expect(mockCache.delete).toHaveBeenCalledWith(
        'rate_limit:tenant-123:salesforce:all'
      );
      expect(mockCache.delete).toHaveBeenCalledWith(
        'rate_limit:tenant-123:salesforce:create'
      );
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'integration_rate_limit_reset',
        expect.any(Object)
      );
    });
  });

  describe('resetTenant', () => {
    it('should reset rate limit counters for tenant', async () => {
      mockCache.delete.mockResolvedValue(void 0);

      await rateLimiter.resetTenant('tenant-123');

      expect(mockCache.delete).toHaveBeenCalledWith('rate_limit:tenant-123:tenant');
      expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
        'tenant_rate_limit_reset',
        { tenantId: 'tenant-123' }
      );
    });
  });

  describe('onAlert', () => {
    it('should register and call alert callbacks', async () => {
      const alertCallback = vi.fn();
      rateLimiter.onAlert(alertCallback);

      // Trigger rate limit exceeded
      mockCache.get.mockResolvedValue(
        JSON.stringify({ count: 300, createdAt: Date.now() })
      );

      await rateLimiter.checkRateLimit({
        integrationId: 'salesforce',
        tenantId: 'tenant-123',
      });

      // Alert should have been called
      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limit_exceeded',
          severity: 'warning',
        })
      );
    });

    it('should handle callback errors gracefully', async () => {
      const badCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      rateLimiter.onAlert(badCallback);

      // Should not throw
      mockCache.get.mockResolvedValue(
        JSON.stringify({ count: 300, createdAt: Date.now() })
      );

      await expect(
        rateLimiter.checkRateLimit({
          integrationId: 'salesforce',
          tenantId: 'tenant-123',
        })
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});
