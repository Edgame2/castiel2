/**
 * Dashboard Analytics Service
 * Advanced dashboard and widget analytics
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface DashboardAnalytics {
  id: string;
  tenantId: string;
  dashboardId: string;
  widgetId?: string;
  viewCount: number;
  lastViewed: Date | string;
  averageLoadTime: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WidgetCache {
  id: string;
  tenantId: string;
  widgetId: string;
  data: any;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export class DashboardAnalyticsService {
  private config: ReturnType<typeof loadConfig>;
  private dashboardClient: ServiceClient;
  private analyticsServiceClient: ServiceClient;
  private cacheServiceClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.dashboardClient = new ServiceClient({
      baseURL: this.config.services.dashboard?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.analyticsServiceClient = new ServiceClient({
      baseURL: this.config.services.analytics_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.cacheServiceClient = new ServiceClient({
      baseURL: this.config.services.cache_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Record dashboard view
   */
  async recordView(tenantId: string, dashboardId: string, widgetId?: string): Promise<void> {
    try {
      const container = getContainer('dashboard_admin_data');
      
      // Get or create analytics record
      const { resources } = await container.items
        .query<DashboardAnalytics>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.dashboardId = @dashboardId AND c.widgetId = @widgetId',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@dashboardId', value: dashboardId },
            { name: '@widgetId', value: widgetId || '' },
          ],
        })
        .fetchNext();

      if (resources.length > 0) {
        // Update existing
        const existing = resources[0];
        await container.item(existing.id, tenantId).replace({
          id: existing.id,
          tenantId,
          ...existing,
          viewCount: existing.viewCount + 1,
          lastViewed: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Create new
        const analytics: DashboardAnalytics = {
          id: uuidv4(),
          tenantId,
          dashboardId,
          widgetId,
          viewCount: 1,
          lastViewed: new Date(),
          averageLoadTime: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await container.items.create(analytics, { partitionKey: tenantId });
      }
    } catch (error: any) {
      log.error('Failed to record dashboard view', error, {
        tenantId,
        dashboardId,
        widgetId,
        service: 'dashboard-analytics',
      });
    }
  }

  /**
   * Get widget cache
   */
  async getWidgetCache(tenantId: string, widgetId: string): Promise<WidgetCache | null> {
    try {
      const container = getContainer('dashboard_widget_cache');
      const { resources } = await container.items
        .query<WidgetCache>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.widgetId = @widgetId AND c.expiresAt > @now',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@widgetId', value: widgetId },
            { name: '@now', value: new Date().toISOString() },
          ],
        })
        .fetchNext();

      return resources.length > 0 ? resources[0] : null;
    } catch (error: any) {
      log.error('Failed to get widget cache', error, {
        tenantId,
        widgetId,
        service: 'dashboard-analytics',
      });
      return null;
    }
  }

  /**
   * Set widget cache
   */
  async setWidgetCache(tenantId: string, widgetId: string, data: any, ttlSeconds: number): Promise<void> {
    try {
      const container = getContainer('dashboard_widget_cache');
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const cache: WidgetCache = {
        id: uuidv4(),
        tenantId,
        widgetId,
        data,
        expiresAt,
        createdAt: new Date(),
      };

      await container.items.create(cache, { partitionKey: tenantId });
    } catch (error: any) {
      log.error('Failed to set widget cache', error, {
        tenantId,
        widgetId,
        service: 'dashboard-analytics',
      });
    }
  }
}
