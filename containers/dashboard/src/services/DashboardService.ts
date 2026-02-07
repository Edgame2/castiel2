import { getDatabaseClient, NotFoundError, ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
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

export class DashboardService {
  private get db() {
    return getDatabaseClient() as any;
  }
  private config: ReturnType<typeof loadConfig>;
  private analyticsServiceClient: ServiceClient;
  private cacheServiceClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
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

  async createDashboard(input: { name: string; config?: any; organizationId?: string }) {
    return await this.db.dashboard_dashboards.create({
      data: {
        name: input.name,
        config: input.config,
        organizationId: input.organizationId,
      },
    });
  }

  async listDashboards(input: { organizationId?: string }) {
    const where: any = {};
    if (input.organizationId) where.organizationId = input.organizationId;
    return await this.db.dashboard_dashboards.findMany({ where });
  }

  async getDashboard(id: string) {
    return await this.db.dashboard_dashboards.findUnique({ where: { id } });
  }

  async updateDashboard(id: string, input: { name?: string; config?: any }) {
    const dashboard = await this.getDashboard(id);
    if (!dashboard) throw new NotFoundError('Dashboard', id);
    return await this.db.dashboard_dashboards.update({ where: { id }, data: input });
  }

  async deleteDashboard(id: string) {
    const dashboard = await this.getDashboard(id);
    if (!dashboard) throw new NotFoundError('Dashboard', id);
    await this.db.dashboard_dashboards.delete({ where: { id } });
  }

  /**
   * Record dashboard view (from dashboard-analytics)
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
        await (container as any).item(existing.id, tenantId).replace({
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
        await (container.items as any).create(analytics, { partitionKey: tenantId } as any);
      }
    } catch (error: any) {
      throw new Error(`Failed to record dashboard view: ${error.message}`);
    }
  }

  /**
   * Get widget cache (from dashboard-analytics)
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
      return null;
    }
  }

  /**
   * Set widget cache (from dashboard-analytics)
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

      await (container.items as any).create(cache, { partitionKey: tenantId } as any);
    } catch (error: any) {
      throw new Error(`Failed to set widget cache: ${error.message}`);
    }
  }
}
