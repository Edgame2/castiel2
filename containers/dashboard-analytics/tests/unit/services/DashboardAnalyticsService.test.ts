/**
 * Dashboard Analytics Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardAnalyticsService } from '../../../src/services/DashboardAnalyticsService';
import { getContainer } from '@coder/shared/database';

const { mockDashboardClient, mockAnalyticsServiceClient, mockCacheServiceClient } = vi.hoisted(() => ({
  mockDashboardClient: { get: vi.fn() },
  mockAnalyticsServiceClient: { get: vi.fn(), post: vi.fn() },
  mockCacheServiceClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: any, config: any) {
    if (config?.baseURL?.includes('dashboard')) return mockDashboardClient;
    if (config?.baseURL?.includes('analytics-service')) return mockAnalyticsServiceClient;
    if (config?.baseURL?.includes('cache-service')) return mockCacheServiceClient;
    return { get: vi.fn(), post: vi.fn() };
  }),
}));

vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid-123') }));
vi.mock('../../../src/config', () => ({
  loadConfig: vi.fn(() => ({
    services: {
      dashboard: { url: 'http://dashboard:3000' },
      analytics_service: { url: 'http://analytics-service:3000' },
      cache_service: { url: 'http://cache-service:3000' },
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

describe('DashboardAnalyticsService', () => {
  let service: DashboardAnalyticsService;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      items: {
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
        })),
        create: vi.fn(),
      },
      item: vi.fn(() => ({ replace: vi.fn().mockResolvedValue({}) })),
    };
    (getContainer as any).mockReturnValue(mockContainer);
    service = new DashboardAnalyticsService();
  });

  describe('recordView', () => {
    it('should record dashboard view successfully', async () => {
      const tenantId = 'tenant-123';
      const dashboardId = 'dashboard-123';
      const widgetId = 'widget-123';

      mockContainer.items.query.mockReturnValue({
        fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
      });

      mockContainer.items.create.mockResolvedValue({
        resource: {
          id: 'analytics-123',
          tenantId,
          dashboardId,
          widgetId,
          viewCount: 1,
        },
      });

      await service.recordView(tenantId, dashboardId, widgetId);

      expect(mockContainer.items.create).toHaveBeenCalled();
    });

    it('should update existing view count', async () => {
      const tenantId = 'tenant-123';
      const dashboardId = 'dashboard-123';

      const existing = {
        id: 'analytics-123',
        tenantId,
        dashboardId,
        viewCount: 5,
        lastViewed: new Date(),
        averageLoadTime: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.items.query.mockReturnValue({
        fetchNext: vi.fn().mockResolvedValue({ resources: [existing] }),
      });

      const replaceFn = vi.fn().mockResolvedValue({});
      mockContainer.item.mockReturnValue({ replace: replaceFn });

      await service.recordView(tenantId, dashboardId);

      expect(mockContainer.item).toHaveBeenCalledWith(existing.id, tenantId);
      expect(replaceFn).toHaveBeenCalled();
    });
  });

  describe('getWidgetCache', () => {
    it('should retrieve widget cache successfully', async () => {
      const tenantId = 'tenant-123';
      const widgetId = 'widget-123';

      const mockCache = {
        id: 'cache-123',
        tenantId,
        widgetId,
        data: { value: 'cached-data' },
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };

      const widgetCacheContainer = {
        items: {
          query: vi.fn().mockReturnValue({
            fetchNext: vi.fn().mockResolvedValue({ resources: [mockCache] }),
          }),
        },
      };
      (getContainer as any).mockImplementation((name: string) => {
        if (name === 'dashboard_widget_cache') return widgetCacheContainer;
        return mockContainer;
      });

      const result = await service.getWidgetCache(tenantId, widgetId);

      expect(result).toEqual(mockCache);
    });

    it('should return null when no cache found', async () => {
      const tenantId = 'tenant-123';
      const widgetId = 'widget-123';

      (getContainer as any).mockImplementation((name: string) => {
        if (name === 'dashboard_widget_cache') {
          return {
            items: {
              query: vi.fn().mockReturnValue({
                fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
              }),
            },
          };
        }
        return mockContainer;
      });

      const result = await service.getWidgetCache(tenantId, widgetId);

      expect(result).toBeNull();
    });
  });
});
