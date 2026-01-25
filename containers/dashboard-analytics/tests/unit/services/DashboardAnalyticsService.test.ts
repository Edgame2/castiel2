/**
 * Dashboard Analytics Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardAnalyticsService } from '../../../src/services/DashboardAnalyticsService';
import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';

// Mock dependencies
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(),
}));

vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(),
}));

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
  let mockDashboardClient: any;
  let mockAnalyticsServiceClient: any;
  let mockCacheServiceClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      items: {
        query: vi.fn(() => ({
          fetchAll: vi.fn(),
        })),
        create: vi.fn(),
        replace: vi.fn(),
      },
    };
    (getContainer as any).mockReturnValue(mockContainer);

    mockDashboardClient = {
      get: vi.fn(),
    };
    mockAnalyticsServiceClient = {
      post: vi.fn(),
    };
    mockCacheServiceClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    (ServiceClient as any).mockImplementation((config: any) => {
      if (config.baseURL?.includes('dashboard')) {
        return mockDashboardClient;
      }
      if (config.baseURL?.includes('analytics-service')) {
        return mockAnalyticsServiceClient;
      }
      if (config.baseURL?.includes('cache-service')) {
        return mockCacheServiceClient;
      }
      return {};
    });

    service = new DashboardAnalyticsService();
  });

  describe('recordView', () => {
    it('should record dashboard view successfully', async () => {
      const tenantId = 'tenant-123';
      const dashboardId = 'dashboard-123';
      const widgetId = 'widget-123';

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [],
        }),
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
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [existing],
        }),
      });

      mockContainer.items.replace.mockResolvedValue({
        resource: {
          ...existing,
          viewCount: 6,
        },
      });

      await service.recordView(tenantId, dashboardId);

      expect(mockContainer.items.replace).toHaveBeenCalled();
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
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [mockCache],
        }),
      });

      const result = await service.getWidgetCache(tenantId, widgetId);

      expect(result).toEqual(mockCache);
    });

    it('should return null for expired cache', async () => {
      const tenantId = 'tenant-123';
      const widgetId = 'widget-123';

      const expiredCache = {
        id: 'cache-123',
        tenantId,
        widgetId,
        data: { value: 'cached-data' },
        expiresAt: new Date(Date.now() - 3600000), // Expired
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [expiredCache],
        }),
      });

      const result = await service.getWidgetCache(tenantId, widgetId);

      expect(result).toBeNull();
    });
  });
});
