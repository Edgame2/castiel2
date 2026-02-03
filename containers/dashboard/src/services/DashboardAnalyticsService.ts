/**
 * Dashboard Analytics Service (merged from dashboard-analytics container).
 * Advanced dashboard and widget analytics.
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

export interface ManagerWidget {
  id: string;
  type: string;
  title?: string;
  data: Record<string, unknown>;
}

export interface ManagerDashboardResponse {
  dashboardType: 'manager';
  widgets: ManagerWidget[];
}

export interface ExecutiveDashboardResponse {
  dashboardType: 'executive';
  widgets: ManagerWidget[];
}

export interface BoardDashboardResponse {
  dashboardType: 'board';
  widgets: ManagerWidget[];
}

export interface PrioritizedOpportunity {
  opportunityId: string;
  revenueAtRisk?: number;
  riskScore?: number;
  earlyWarningScore?: number;
  suggestedAction?: string;
  rankScore?: number;
}

export interface PrioritizedManagerResponse {
  opportunities: PrioritizedOpportunity[];
  suggestedAction?: string | null;
}

export class DashboardAnalyticsService {
  private config: ReturnType<typeof loadConfig>;
  private dashboardClient: ServiceClient;
  private analyticsServiceClient: ServiceClient;
  private cacheServiceClient: ServiceClient;
  private riskAnalyticsClient: ServiceClient | null;
  private forecastingClient: ServiceClient | null;

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

    this.riskAnalyticsClient = this.config.services.risk_analytics?.url
      ? new ServiceClient({ baseURL: this.config.services.risk_analytics.url, timeout: 15000, retries: 2 })
      : null;

    this.forecastingClient = this.config.services.forecasting?.url
      ? new ServiceClient({ baseURL: this.config.services.forecasting.url, timeout: 15000, retries: 2 })
      : null;
  }

  async getManagerDashboard(tenantId: string, authHeader?: string): Promise<ManagerDashboardResponse> {
    const widgets: ManagerWidget[] = [];
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (authHeader) headers['Authorization'] = authHeader;

    if (this.riskAnalyticsClient) {
      try {
        const r = await this.riskAnalyticsClient.get<{ totalRevenueAtRisk?: number; opportunityCount?: number }>(
          '/api/v1/risk-analysis/tenant/revenue-at-risk',
          { headers }
        );
        widgets.push({
          id: 'revenue-at-risk',
          type: 'revenue-at-risk',
          title: 'Revenue at Risk',
          data: { totalRevenueAtRisk: r?.totalRevenueAtRisk ?? 0, opportunityCount: r?.opportunityCount ?? 0 },
        });
      } catch (e) {
        log.warn('getManagerDashboard: risk-analytics revenue-at-risk failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'revenue-at-risk', type: 'revenue-at-risk', title: 'Revenue at Risk', data: { totalRevenueAtRisk: 0, opportunityCount: 0 } });
      }
    } else {
      widgets.push({ id: 'revenue-at-risk', type: 'revenue-at-risk', title: 'Revenue at Risk', data: { totalRevenueAtRisk: 0, opportunityCount: 0 } });
    }

    if (this.forecastingClient) {
      try {
        const f = await this.forecastingClient.get<{ totalRevenue?: number; totalRiskAdjusted?: number; opportunityCount?: number }>(
          '/api/v1/forecasts/tenant',
          { headers }
        );
        widgets.push({
          id: 'tenant-forecast',
          type: 'forecast-summary',
          title: 'Tenant Forecast',
          data: {
            totalRevenue: f?.totalRevenue ?? 0,
            totalRiskAdjusted: f?.totalRiskAdjusted ?? 0,
            opportunityCount: f?.opportunityCount ?? 0,
          },
        });
      } catch (e) {
        log.warn('getManagerDashboard: forecasting tenant failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'tenant-forecast', type: 'forecast-summary', title: 'Tenant Forecast', data: { totalRevenue: 0, totalRiskAdjusted: 0, opportunityCount: 0 } });
      }
    } else {
      widgets.push({ id: 'tenant-forecast', type: 'forecast-summary', title: 'Tenant Forecast', data: { totalRevenue: 0, totalRiskAdjusted: 0, opportunityCount: 0 } });
    }

    if (this.riskAnalyticsClient) {
      try {
        const pri = await this.riskAnalyticsClient.get<{ opportunities?: { opportunityId?: string }[] }>(
          '/api/v1/risk-analysis/tenant/prioritized-opportunities',
          { headers }
        );
        const oppId = pri?.opportunities?.[0]?.opportunityId;
        let signals: unknown[] = [];
        if (oppId) {
          const ew = await this.riskAnalyticsClient.get<unknown[]>(
            `/api/v1/risk-analysis/opportunities/${encodeURIComponent(oppId)}/early-warnings`,
            { headers }
          );
          signals = Array.isArray(ew) ? ew : [];
        }
        widgets.push({ id: 'early-warnings', type: 'early_warning_list', title: 'Early warnings', data: { signals } });
      } catch (e) {
        log.warn('getManagerDashboard: early-warning_list failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'early-warnings', type: 'early_warning_list', title: 'Early warnings', data: { signals: [] } });
      }
    } else {
      widgets.push({ id: 'early-warnings', type: 'early_warning_list', title: 'Early warnings', data: { signals: [] } });
    }

    const period = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;
    if (this.forecastingClient) {
      try {
        const sc = await this.forecastingClient.get<{ period?: string; p10?: number; p50?: number; p90?: number; scenarios?: unknown[] }>(
          `/api/v1/forecasts/${encodeURIComponent(period)}/scenarios`,
          { headers }
        );
        widgets.push({
          id: 'scenario-forecast',
          type: 'scenario_forecast',
          title: 'Scenario forecast',
          data: { period: sc?.period ?? period, p10: sc?.p10 ?? 0, p50: sc?.p50 ?? 0, p90: sc?.p90 ?? 0, scenarios: sc?.scenarios ?? [] },
        });
      } catch (e) {
        log.warn('getManagerDashboard: scenario_forecast failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'scenario-forecast', type: 'scenario_forecast', title: 'Scenario forecast', data: { period, p10: 0, p50: 0, p90: 0, scenarios: [] } });
      }
    } else {
      widgets.push({ id: 'scenario-forecast', type: 'scenario_forecast', title: 'Scenario forecast', data: { period, p10: 0, p50: 0, p90: 0, scenarios: [] } });
    }

    if (this.riskAnalyticsClient) {
      try {
        const ci = await this.riskAnalyticsClient.get<{
          totalOpportunitiesWithCompetitors?: number;
          totalMentions?: number;
          topCompetitorsByMentions?: unknown[];
          recentMentionCount?: number;
          winLoss?: { wins?: number; losses?: number; winRate?: number };
        }>('/api/v1/competitive-intelligence/dashboard', { headers });
        widgets.push({
          id: 'competitive-intel',
          type: 'competitive_win_loss',
          title: 'Competitive Intelligence',
          data: {
            totalOpportunitiesWithCompetitors: ci?.totalOpportunitiesWithCompetitors ?? 0,
            totalMentions: ci?.totalMentions ?? 0,
            topCompetitorsByMentions: ci?.topCompetitorsByMentions ?? [],
            recentMentionCount: ci?.recentMentionCount ?? 0,
            winLoss: ci?.winLoss ?? { wins: 0, losses: 0, winRate: 0 },
          },
        });
      } catch (e) {
        log.warn('getManagerDashboard: competitive-intelligence failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({
          id: 'competitive-intel',
          type: 'competitive_win_loss',
          title: 'Competitive Intelligence',
          data: { totalOpportunitiesWithCompetitors: 0, totalMentions: 0, topCompetitorsByMentions: [], recentMentionCount: 0, winLoss: { wins: 0, losses: 0, winRate: 0 } },
        });
      }
    } else {
      widgets.push({
        id: 'competitive-intel',
        type: 'competitive_win_loss',
        title: 'Competitive Intelligence',
        data: { totalOpportunitiesWithCompetitors: 0, totalMentions: 0, topCompetitorsByMentions: [], recentMentionCount: 0, winLoss: { wins: 0, losses: 0, winRate: 0 } },
      });
    }

    if (this.riskAnalyticsClient) {
      try {
        const tar = await this.riskAnalyticsClient.get<{ reasons?: { reason: string; count: number; suggestedMitigation?: string }[] }>(
          '/api/v1/risk-analysis/tenant/top-at-risk-reasons',
          { headers }
        );
        widgets.push({
          id: 'top-at-risk-reasons',
          type: 'top_at_risk_reasons',
          title: 'Top at-risk reasons',
          data: { reasons: tar?.reasons ?? [] },
        });
      } catch (e) {
        log.warn('getManagerDashboard: top-at-risk-reasons failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'top-at-risk-reasons', type: 'top_at_risk_reasons', title: 'Top at-risk reasons', data: { reasons: [] } });
      }
    } else {
      widgets.push({ id: 'top-at-risk-reasons', type: 'top_at_risk_reasons', title: 'Top at-risk reasons', data: { reasons: [] } });
    }

    return { dashboardType: 'manager', widgets };
  }

  async getPrioritizedOpportunities(tenantId: string, authHeader?: string): Promise<PrioritizedManagerResponse> {
    if (!this.riskAnalyticsClient) {
      return { opportunities: [], suggestedAction: null };
    }
    try {
      const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
      if (authHeader) headers['Authorization'] = authHeader;
      const r = await this.riskAnalyticsClient.get<PrioritizedManagerResponse>(
        '/api/v1/risk-analysis/tenant/prioritized-opportunities',
        { headers }
      );
      return { opportunities: r?.opportunities ?? [], suggestedAction: r?.suggestedAction ?? null };
    } catch (e) {
      log.warn('getPrioritizedOpportunities: risk-analytics call failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
      return { opportunities: [], suggestedAction: null };
    }
  }

  async getExecutiveDashboard(tenantId: string, authHeader?: string): Promise<ExecutiveDashboardResponse> {
    const widgets: ManagerWidget[] = [];
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (authHeader) headers['Authorization'] = authHeader;

    if (this.riskAnalyticsClient) {
      try {
        const r = await this.riskAnalyticsClient.get<{ totalRevenueAtRisk?: number; opportunityCount?: number }>(
          '/api/v1/risk-analysis/tenant/revenue-at-risk',
          { headers }
        );
        widgets.push({
          id: 'revenue-at-risk',
          type: 'revenue-at-risk',
          title: 'Revenue at Risk',
          data: { totalRevenueAtRisk: r?.totalRevenueAtRisk ?? 0, opportunityCount: r?.opportunityCount ?? 0 },
        });
      } catch (e) {
        log.warn('getExecutiveDashboard: risk-analytics revenue-at-risk failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'revenue-at-risk', type: 'revenue-at-risk', title: 'Revenue at Risk', data: { totalRevenueAtRisk: 0, opportunityCount: 0 } });
      }
      try {
        const ci = await this.riskAnalyticsClient.get<{ totalOpportunitiesWithCompetitors?: number; totalMentions?: number; topCompetitorsByMentions?: unknown[]; recentMentionCount?: number; winLoss?: { wins?: number; losses?: number; winRate?: number } }>(
          '/api/v1/competitive-intelligence/dashboard',
          { headers }
        );
        widgets.push({
          id: 'competitive-intel',
          type: 'competitive_win_loss',
          title: 'Competitive Intelligence',
          data: {
            totalOpportunitiesWithCompetitors: ci?.totalOpportunitiesWithCompetitors ?? 0,
            totalMentions: ci?.totalMentions ?? 0,
            topCompetitorsByMentions: ci?.topCompetitorsByMentions ?? [],
            recentMentionCount: ci?.recentMentionCount ?? 0,
            winLoss: ci?.winLoss ?? { wins: 0, losses: 0, winRate: 0 },
          },
        });
      } catch (e) {
        log.warn('getExecutiveDashboard: risk-analytics competitive-intel failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'competitive-intel', type: 'competitive_win_loss', title: 'Competitive Intelligence', data: { totalOpportunitiesWithCompetitors: 0, totalMentions: 0, topCompetitorsByMentions: [], recentMentionCount: 0, winLoss: { wins: 0, losses: 0, winRate: 0 } } });
      }
      widgets.push({ id: 'risk-heatmap', type: 'risk_heatmap', title: 'Risk by Segment', data: { segments: [], totalAtRisk: 0 } });
      try {
        const tar = await this.riskAnalyticsClient.get<{ reasons?: { reason: string; count: number; suggestedMitigation?: string }[] }>(
          '/api/v1/risk-analysis/tenant/top-at-risk-reasons',
          { headers }
        );
        widgets.push({ id: 'top-at-risk-reasons', type: 'top_at_risk_reasons', title: 'Top at-risk reasons', data: { reasons: tar?.reasons ?? [] } });
      } catch (e) {
        log.warn('getExecutiveDashboard: top-at-risk-reasons failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'top-at-risk-reasons', type: 'top_at_risk_reasons', title: 'Top at-risk reasons', data: { reasons: [] } });
      }
    } else {
      widgets.push({ id: 'revenue-at-risk', type: 'revenue-at-risk', title: 'Revenue at Risk', data: { totalRevenueAtRisk: 0, opportunityCount: 0 } });
      widgets.push({ id: 'competitive-intel', type: 'competitive_win_loss', title: 'Competitive Intelligence', data: { totalOpportunitiesWithCompetitors: 0, totalMentions: 0, topCompetitorsByMentions: [], recentMentionCount: 0, winLoss: { wins: 0, losses: 0, winRate: 0 } } });
      widgets.push({ id: 'risk-heatmap', type: 'risk_heatmap', title: 'Risk by Segment', data: { segments: [], totalAtRisk: 0 } });
      widgets.push({ id: 'top-at-risk-reasons', type: 'top_at_risk_reasons', title: 'Top at-risk reasons', data: { reasons: [] } });
    }

    if (this.forecastingClient) {
      try {
        const f = await this.forecastingClient.get<{ totalRevenue?: number; totalRiskAdjusted?: number; opportunityCount?: number }>(
          '/api/v1/forecasts/tenant',
          { headers }
        );
        widgets.push({
          id: 'tenant-forecast',
          type: 'forecast-summary',
          title: 'Tenant Forecast',
          data: { totalRevenue: f?.totalRevenue ?? 0, totalRiskAdjusted: f?.totalRiskAdjusted ?? 0, opportunityCount: f?.opportunityCount ?? 0 },
        });
      } catch (e) {
        log.warn('getExecutiveDashboard: forecasting failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'tenant-forecast', type: 'forecast-summary', title: 'Tenant Forecast', data: { totalRevenue: 0, totalRiskAdjusted: 0, opportunityCount: 0 } });
      }
    } else {
      widgets.push({ id: 'tenant-forecast', type: 'forecast-summary', title: 'Tenant Forecast', data: { totalRevenue: 0, totalRiskAdjusted: 0, opportunityCount: 0 } });
    }

    widgets.push({ id: 'industry-benchmark', type: 'industry_benchmark', title: 'Industry Benchmark', data: { p10: 0, p50: 0, p90: 0 } });

    return { dashboardType: 'executive', widgets };
  }

  async getBoardDashboard(tenantId: string, authHeader?: string): Promise<BoardDashboardResponse> {
    const widgets: ManagerWidget[] = [];
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (authHeader) headers['Authorization'] = authHeader;

    if (this.riskAnalyticsClient) {
      try {
        const r = await this.riskAnalyticsClient.get<{ totalRevenueAtRisk?: number; opportunityCount?: number }>(
          '/api/v1/risk-analysis/tenant/revenue-at-risk',
          { headers }
        );
        widgets.push({
          id: 'revenue-at-risk',
          type: 'revenue-at-risk',
          title: 'Revenue at Risk',
          data: { totalRevenueAtRisk: r?.totalRevenueAtRisk ?? 0, opportunityCount: r?.opportunityCount ?? 0 },
        });
      } catch (e) {
        log.warn('getBoardDashboard: risk-analytics revenue-at-risk failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'revenue-at-risk', type: 'revenue-at-risk', title: 'Revenue at Risk', data: { totalRevenueAtRisk: 0, opportunityCount: 0 } });
      }
      try {
        const ci = await this.riskAnalyticsClient.get<{ winLoss?: { wins?: number; losses?: number; winRate?: number } }>(
          '/api/v1/competitive-intelligence/dashboard',
          { headers }
        );
        widgets.push({
          id: 'competitive-intel',
          type: 'competitive_win_loss',
          title: 'Competitive Win/Loss',
          data: { winLoss: ci?.winLoss ?? { wins: 0, losses: 0, winRate: 0 } },
        });
      } catch (e) {
        log.warn('getBoardDashboard: risk-analytics competitive-intel failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'competitive-intel', type: 'competitive_win_loss', title: 'Competitive Win/Loss', data: { winLoss: { wins: 0, losses: 0, winRate: 0 } } });
      }
    } else {
      widgets.push({ id: 'revenue-at-risk', type: 'revenue-at-risk', title: 'Revenue at Risk', data: { totalRevenueAtRisk: 0, opportunityCount: 0 } });
      widgets.push({ id: 'competitive-intel', type: 'competitive_win_loss', title: 'Competitive Win/Loss', data: { winLoss: { wins: 0, losses: 0, winRate: 0 } } });
    }

    if (this.forecastingClient) {
      try {
        const f = await this.forecastingClient.get<{ totalRevenue?: number; totalRiskAdjusted?: number; opportunityCount?: number }>(
          '/api/v1/forecasts/tenant',
          { headers }
        );
        widgets.push({
          id: 'tenant-forecast',
          type: 'forecast-summary',
          title: 'Forecast',
          data: { totalRevenue: f?.totalRevenue ?? 0, totalRiskAdjusted: f?.totalRiskAdjusted ?? 0, opportunityCount: f?.opportunityCount ?? 0 },
        });
      } catch (e) {
        log.warn('getBoardDashboard: forecasting failed', { error: e instanceof Error ? e.message : String(e), service: 'dashboard' });
        widgets.push({ id: 'tenant-forecast', type: 'forecast-summary', title: 'Forecast', data: { totalRevenue: 0, totalRiskAdjusted: 0, opportunityCount: 0 } });
      }
    } else {
      widgets.push({ id: 'tenant-forecast', type: 'forecast-summary', title: 'Forecast', data: { totalRevenue: 0, totalRiskAdjusted: 0, opportunityCount: 0 } });
    }

    return { dashboardType: 'board', widgets };
  }

  async recordView(tenantId: string, dashboardId: string, widgetId?: string): Promise<void> {
    try {
      const container = getContainer('dashboard_admin_data');

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
        const existing = resources[0];
        await container.item(existing.id, tenantId).replace({
          ...existing,
          viewCount: existing.viewCount + 1,
          lastViewed: new Date(),
          updatedAt: new Date(),
        });
      } else {
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
        await (container.items as any).create(analytics, { partitionKey: tenantId });
      }
    } catch (error: any) {
      log.error('Failed to record dashboard view', error instanceof Error ? error : undefined, {
        tenantId,
        dashboardId,
        widgetId,
        service: 'dashboard',
      });
    }
  }

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
      log.error('Failed to get widget cache', error instanceof Error ? error : undefined, {
        tenantId,
        widgetId,
        service: 'dashboard',
      });
      return null;
    }
  }

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

      await (container.items as any).create(cache, { partitionKey: tenantId });
    } catch (error: any) {
      log.error('Failed to set widget cache', error instanceof Error ? error : undefined, {
        tenantId,
        widgetId,
        service: 'dashboard',
      });
    }
  }
}
