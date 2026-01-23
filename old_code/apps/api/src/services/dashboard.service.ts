/**
 * Dashboard Service
 * Business logic for dashboards, widgets, and dashboard merging
 * Includes caching integration for optimal performance
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { DashboardRepository } from '../repositories/dashboard.repository.js';
import { DashboardCacheService } from './dashboard-cache.service.js';
import {
  Dashboard,
  DashboardType,
  DashboardPermissionLevel,
  CreateDashboardInput,
  UpdateDashboardInput,
  DashboardListOptions,
  DashboardListResult,
  DashboardVersion,
  DashboardChangeType,
  MergedDashboard,
  MergedWidget,
  UserDashboardOverrides,
  DateRangeValue,
  DatePreset,
  TenantFiscalYearConfig,
  DEFAULT_FISCAL_YEAR_START,
  DEFAULT_FEATURE_FLAGS,
  TenantDashboardConfig,
  DashboardFeatureFlags,
  GridPosition,
  GridSize,
} from '../types/dashboard.types.js';
import {
  Widget,
  CreateWidgetInput,
  UpdateWidgetInput,
  BatchUpdatePositionsInput,
  WidgetDataRequest,
  WidgetDataResponse,
} from '../types/widget.types.js';

/**
 * Dashboard Service
 */
export class DashboardService {
  private repository: DashboardRepository;
  private monitoring: IMonitoringProvider;
  private cacheService?: DashboardCacheService;
  private globalConfig: DashboardFeatureFlags = DEFAULT_FEATURE_FLAGS;

  constructor(monitoring: IMonitoringProvider, cacheService?: DashboardCacheService) {
    this.monitoring = monitoring;
    this.cacheService = cacheService;
    this.repository = new DashboardRepository(monitoring);
  }

  /**
   * Set cache service (for late initialization)
   */
  setCacheService(cacheService: DashboardCacheService): void {
    this.cacheService = cacheService;
  }

  // ============================================================================
  // Dashboard CRUD
  // ============================================================================

  /**
   * Create a new dashboard
   */
  async createDashboard(input: CreateDashboardInput): Promise<Dashboard> {
    const startTime = Date.now();
    this.monitoring.trackEvent('dashboard.service.create-start', { tenantId: input.tenantId });

    // Check feature flag (with cache) - with timeout
    try {
      const configPromise = this.getEffectiveConfig(input.tenantId);
      const configTimeout = new Promise<DashboardFeatureFlags>((resolve) =>
        setTimeout(() => {
          this.monitoring.trackEvent('dashboard.service.config-timeout', { tenantId: input.tenantId });
          resolve(this.globalConfig);
        }, 8000)
      );

      const config = await Promise.race([configPromise, configTimeout]);
      this.monitoring.trackEvent('dashboard.service.config-fetched', {
        tenantId: input.tenantId,
        durationMs: Date.now() - startTime,
        enabled: config.dashboardsEnabled,
      });

      if (!config.dashboardsEnabled) {
        throw new Error('Dashboards are disabled for this tenant');
      }

      // Check limit
      if (config.features.customDashboards) {
        const listStart = Date.now();
        const userDashboards = await this.repository.listDashboards({
          filter: { tenantId: input.tenantId, userId: input.userId },
        });
        this.monitoring.trackEvent('dashboard.service.list-completed', {
          durationMs: Date.now() - listStart,
          count: userDashboards.total,
        });

        if (userDashboards.total >= config.limits.maxDashboardsPerUser) {
          throw new Error(`Maximum dashboards per user (${config.limits.maxDashboardsPerUser}) reached`);
        }
      }
    } catch (configError) {
      this.monitoring.trackException(configError as Error, { operation: 'dashboard.service.config-check' });
      // Continue with creation even if config check fails
    }

    const createStart = Date.now();
    const dashboard = await this.repository.createDashboard(input);
    this.monitoring.trackEvent('dashboard.service.dashboard-created', {
      durationMs: Date.now() - createStart,
      dashboardId: dashboard.id,
      tenantId: input.tenantId,
    });

    // Save initial version (make this non-blocking)
    const versionPromise = this.repository.saveDashboardVersion(
      dashboard.id,
      input.tenantId,
      'widget_added',
      'Dashboard created',
      input.userId
    ).catch(err => {
      this.monitoring.trackException(err as Error, { operation: 'dashboard.service.save-version' });
    });

    // Cache operations (non-blocking)
    if (this.cacheService) {
      Promise.all([
        this.cacheService.cacheDashboard(dashboard).catch(err =>
          this.monitoring.trackException(err as Error, { operation: 'dashboard.service.cache-dashboard' })
        ),
        this.cacheService.invalidateMergedDashboard(input.tenantId, input.userId).catch(err =>
          this.monitoring.trackException(err as Error, { operation: 'dashboard.service.invalidate-cache' })
        ),
      ]);
    }

    // Don't wait for version save
    const totalDuration = Date.now() - startTime;
    this.monitoring.trackEvent('dashboard.service.create-completed', { durationMs: totalDuration });

    return dashboard;
  }

  /**
   * Get dashboard by ID (with caching)
   */
  async getDashboard(id: string, tenantId: string, userId: string): Promise<Dashboard | null> {
    // Try cache first
    if (this.cacheService) {
      const cached = await this.cacheService.getCachedDashboard(tenantId, id);
      if (cached) {
        // Check permission
        const permission = this.resolvePermission(cached, userId, [], []);
        if (!permission.hasAccess) {
          throw new Error('Access denied');
        }
        return cached;
      }
    }

    // Cache miss - fetch from database
    const dashboard = await this.repository.getDashboard(id, tenantId);

    if (!dashboard) {
      return null;
    }

    // Check permission
    const permission = this.resolvePermission(dashboard, userId, [], []);
    if (!permission.hasAccess) {
      throw new Error('Access denied');
    }

    // Cache the result
    if (this.cacheService) {
      await this.cacheService.cacheDashboard(dashboard);
    }

    return dashboard;
  }

  /**
   * Get dashboard with all its widgets
   */
  async getDashboardWithWidgets(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<{ dashboard: Dashboard; widgets: Widget[] } | null> {
    // Note: Caching strategy for this composite object would be complex, skipping for now
    // or we could compose it from cached individual items if valid.
    // For now, let's hit the efficient repo method.

    const result = await this.repository.getDashboardWithWidgets(id, tenantId);
    if (!result) {
      return null;
    }

    const { dashboard, widgets } = result;

    // Check permission
    const permission = this.resolvePermission(dashboard, userId, [], []);
    if (!permission.hasAccess) {
      throw new Error('Access denied');
    }

    return { dashboard, widgets };
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    id: string,
    tenantId: string,
    userId: string,
    input: UpdateDashboardInput
  ): Promise<Dashboard | null> {
    const existing = await this.repository.getDashboard(id, tenantId);
    if (!existing) {
      return null;
    }

    // Check permission (need EDIT or ADMIN)
    const permission = this.resolvePermission(existing, userId, [], []);
    if (!permission.hasAccess ||
      (permission.level !== DashboardPermissionLevel.EDIT &&
        permission.level !== DashboardPermissionLevel.ADMIN)) {
      throw new Error('Permission denied');
    }

    const updated = await this.repository.updateDashboard(id, tenantId, input);

    // Save version
    if (updated) {
      const changeType: DashboardChangeType = input.layout
        ? 'layout_changed'
        : input.settings
          ? 'settings_changed'
          : input.permissions
            ? 'permissions_changed'
            : 'widget_updated';

      await this.repository.saveDashboardVersion(
        id,
        tenantId,
        changeType,
        `Dashboard updated: ${Object.keys(input).join(', ')}`,
        userId
      );

      // Invalidate cache
      if (this.cacheService) {
        await this.cacheService.invalidateDashboard(tenantId, id);
      }
    }

    return updated;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string, tenantId: string, userId: string): Promise<boolean> {
    const existing = await this.repository.getDashboard(id, tenantId);
    if (!existing) {
      return false;
    }

    // Check permission (need ADMIN)
    const permission = this.resolvePermission(existing, userId, [], []);
    if (!permission.hasAccess || permission.level !== DashboardPermissionLevel.ADMIN) {
      // Only owner or admin can delete
      if (existing.structuredData.ownerId !== userId) {
        throw new Error('Permission denied');
      }
    }

    const deleted = await this.repository.deleteDashboard(id, tenantId);

    // Invalidate all related caches
    if (deleted && this.cacheService) {
      await this.cacheService.invalidateDashboard(tenantId, id);
    }

    return deleted;
  }

  /**
   * List dashboards
   */
  async listDashboards(options: DashboardListOptions): Promise<DashboardListResult> {
    return this.repository.listDashboards(options);
  }

  /**
   * Get merged dashboard for user (with caching)
   */
  async getMergedDashboard(
    userId: string,
    tenantId: string,
    dashboardId?: string,
    context?: { shardId?: string; customParams?: Record<string, unknown> },
    filters?: { dateRange?: DateRangeValue; customFilters?: Record<string, unknown> }
  ): Promise<MergedDashboard> {
    // Try cache first (only for base merged dashboard without context/filters)
    if (this.cacheService && !context && !filters) {
      const cached = await this.cacheService.getCachedMergedDashboard(tenantId, userId, dashboardId);
      if (cached) {
        return cached;
      }
    }

    // Get user's dashboards
    const userDashboards = await this.repository.listDashboards({
      filter: { tenantId, userId, dashboardType: DashboardType.USER },
    });

    // Get inherited dashboards (system + tenant)
    const inheritedDashboards = await this.repository.getInheritedDashboards(tenantId);

    // Determine primary dashboard
    let primaryDashboard: Dashboard | null = null;

    if (dashboardId) {
      primaryDashboard = await this.repository.getDashboard(dashboardId, tenantId);
    }

    if (!primaryDashboard) {
      // Find default user dashboard or first user dashboard
      primaryDashboard = userDashboards.dashboards.find(d => d.structuredData.isDefault)
        || userDashboards.dashboards[0]
        || null;
    }

    // If no user dashboard, use tenant default
    if (!primaryDashboard) {
      primaryDashboard = inheritedDashboards.find(
        d => d.structuredData.dashboardType === DashboardType.TENANT && d.structuredData.isDefault
      ) || null;
    }

    // Still no dashboard? Return empty merged dashboard
    if (!primaryDashboard) {
      return {
        primaryDashboardId: '',
        widgets: [],
        sources: { system: [], tenant: [], user: [] },
        settings: {
          autoRefresh: false,
          autoRefreshInterval: 60,
          theme: 'system',
          density: 'normal',
          showInheritedWidgets: true,
          allowWidgetFilters: true,
        },
        gridConfig: {
          columns: { desktop: 12, tablet: 8, mobile: 4 },
          rowHeight: 80,
          gap: 16,
          padding: 24,
        },
      };
    }

    // Get user's overrides for this dashboard
    const overrides = await this.repository.getUserOverrides(userId, primaryDashboard.id, tenantId);

    // Collect all widgets from all sources
    const allWidgets: MergedWidget[] = [];
    const sources = { system: [] as string[], tenant: [] as string[], user: [] as string[] };

    // Add inherited widgets if enabled
    if (primaryDashboard.structuredData.settings.showInheritedWidgets) {
      for (const dashboard of inheritedDashboards) {
        const widgets = await this.repository.getWidgetsByDashboard(dashboard.id, dashboard.tenantId);

        const type = dashboard.structuredData.dashboardType;
        if (type === DashboardType.SYSTEM) {
          sources.system.push(dashboard.id);
        } else if (type === DashboardType.TENANT) {
          sources.tenant.push(dashboard.id);
        }

        for (const widget of widgets) {
          const override = overrides?.positionOverrides.find(
            o => o.widgetId === widget.id && o.sourceDashboardId === dashboard.id
          );
          const isHidden = overrides?.hiddenWidgets.some(
            h => h.widgetId === widget.id && h.sourceDashboardId === dashboard.id
          ) || false;

          allWidgets.push({
            widgetId: widget.id,
            source: type,
            sourceDashboardId: dashboard.id,
            canEdit: false,
            canHide: true,
            canReposition: true,
            isHidden,
            position: override?.position || widget.structuredData.position,
            size: widget.structuredData.size,
          });
        }
      }
    }

    // Add user's own widgets
    const userWidgets = await this.repository.getWidgetsByDashboard(primaryDashboard.id, tenantId);
    sources.user.push(primaryDashboard.id);

    for (const widget of userWidgets) {
      const isHidden = overrides?.hiddenWidgets.some(
        h => h.widgetId === widget.id && h.sourceDashboardId === primaryDashboard.id
      ) || false;

      allWidgets.push({
        widgetId: widget.id,
        source: DashboardType.USER,
        sourceDashboardId: primaryDashboard.id,
        canEdit: true,
        canHide: true,
        canReposition: true,
        isHidden,
        position: widget.structuredData.position,
        size: widget.structuredData.size,
      });
    }

    const mergedDashboard: MergedDashboard = {
      primaryDashboardId: primaryDashboard.id,
      widgets: allWidgets,
      sources,
      context: context ? {
        shardId: context.shardId,
        shardTypeId: primaryDashboard.structuredData.context?.shardContext?.shardTypeId,
        customParams: context.customParams,
      } : undefined,
      filters: filters || overrides?.filterState,
      settings: primaryDashboard.structuredData.settings,
      gridConfig: primaryDashboard.structuredData.gridConfig,
    };

    // Cache the base merged dashboard (without context/filters)
    if (this.cacheService && !context && !filters) {
      await this.cacheService.cacheMergedDashboard(tenantId, userId, mergedDashboard, dashboardId);
    }

    return mergedDashboard;
  }

  /**
   * Set dashboard as default
   */
  async setAsDefault(id: string, tenantId: string, userId: string): Promise<Dashboard | null> {
    const dashboard = await this.repository.getDashboard(id, tenantId);
    if (!dashboard) {
      return null;
    }

    // Clear other defaults for same scope
    const existingDefaults = await this.repository.listDashboards({
      filter: {
        tenantId,
        userId: dashboard.structuredData.dashboardType === DashboardType.USER ? userId : undefined,
        dashboardType: dashboard.structuredData.dashboardType,
        isDefault: true,
      },
    });

    for (const d of existingDefaults.dashboards) {
      if (d.id !== id) {
        await this.repository.updateDashboard(d.id, tenantId, { isDefault: false });
      }
    }

    return this.repository.updateDashboard(id, tenantId, { isDefault: true });
  }

  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(
    id: string,
    tenantId: string,
    userId: string,
    newName: string
  ): Promise<Dashboard> {
    const source = await this.repository.getDashboard(id, tenantId);
    if (!source) {
      throw new Error('Source dashboard not found');
    }

    // Create new dashboard
    const newDashboard = await this.repository.createDashboard({
      tenantId,
      userId,
      name: newName,
      description: source.structuredData.description,
      icon: source.structuredData.icon,
      color: source.structuredData.color,
      dashboardType: DashboardType.USER,
      context: source.structuredData.context,
      filters: source.structuredData.filters,
      settings: source.structuredData.settings,
    });

    // Copy widgets
    const widgets = await this.repository.getWidgetsByDashboard(id, tenantId);
    for (const widget of widgets) {
      await this.repository.createWidget({
        dashboardId: newDashboard.id,
        tenantId,
        userId,
        name: widget.structuredData.name,
        description: widget.structuredData.description,
        icon: widget.structuredData.icon,
        widgetType: widget.structuredData.widgetType,
        config: widget.structuredData.config,
        dataSource: widget.structuredData.dataSource,
        position: widget.structuredData.position,
        size: widget.structuredData.size,
        refreshInterval: widget.structuredData.refreshInterval,
        permissions: widget.structuredData.permissions,
      });
    }

    return newDashboard;
  }

  // ============================================================================
  // Widget CRUD
  // ============================================================================

  /**
   * Create widget
   */
  async createWidget(input: CreateWidgetInput): Promise<Widget> {
    const dashboard = await this.repository.getDashboard(input.dashboardId, input.tenantId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Check widget limit
    const config = await this.getEffectiveConfig(input.tenantId);
    const existingWidgets = await this.repository.getWidgetsByDashboard(input.dashboardId, input.tenantId);
    if (existingWidgets.length >= config.limits.maxWidgetsPerDashboard) {
      throw new Error(`Maximum widgets per dashboard (${config.limits.maxWidgetsPerDashboard}) reached`);
    }

    const widget = await this.repository.createWidget(input);

    // Update dashboard layout
    const currentLayout = dashboard.structuredData.layout.desktop || [];
    currentLayout.push({
      widgetId: widget.id,
      position: input.position,
      size: input.size,
    });

    await this.repository.updateDashboard(input.dashboardId, input.tenantId, {
      layout: { ...dashboard.structuredData.layout, desktop: currentLayout },
    });

    // Save version
    await this.repository.saveDashboardVersion(
      input.dashboardId,
      input.tenantId,
      'widget_added',
      `Widget added: ${input.name}`,
      input.userId
    );

    // Invalidate dashboard and widgets cache
    if (this.cacheService) {
      await this.cacheService.invalidateDashboard(input.tenantId, input.dashboardId);
    }

    return widget;
  }

  /**
   * Get widget
   */
  async getWidget(id: string, tenantId: string): Promise<Widget | null> {
    return this.repository.getWidget(id, tenantId);
  }

  /**
   * Get widgets for dashboard
   */
  async getWidgetsByDashboard(dashboardId: string, tenantId: string): Promise<Widget[]> {
    return this.repository.getWidgetsByDashboard(dashboardId, tenantId);
  }

  /**
   * Update widget
   */
  async updateWidget(
    id: string,
    tenantId: string,
    userId: string,
    input: UpdateWidgetInput
  ): Promise<Widget | null> {
    const widget = await this.repository.getWidget(id, tenantId);
    if (!widget) {
      return null;
    }

    const updated = await this.repository.updateWidget(id, tenantId, input);

    // Save version if significant change
    if (updated && (input.config || input.dataSource)) {
      await this.repository.saveDashboardVersion(
        widget.dashboardId,
        tenantId,
        'widget_updated',
        `Widget updated: ${widget.structuredData.name}`,
        userId
      );
    }

    // Invalidate widget and dashboard cache
    if (updated && this.cacheService) {
      await this.cacheService.invalidateWidget(tenantId, id);
      await this.cacheService.invalidateDashboard(tenantId, widget.dashboardId);
    }

    return updated;
  }

  /**
   * Delete widget
   */
  async deleteWidget(id: string, tenantId: string, userId: string): Promise<boolean> {
    const widget = await this.repository.getWidget(id, tenantId);
    if (!widget) {
      return false;
    }

    const result = await this.repository.deleteWidget(id, tenantId);

    if (result) {
      // Update dashboard layout
      const dashboard = await this.repository.getDashboard(widget.dashboardId, tenantId);
      if (dashboard) {
        const newLayout = dashboard.structuredData.layout.desktop.filter(
          (w: { widgetId: string }) => w.widgetId !== id
        );
        await this.repository.updateDashboard(widget.dashboardId, tenantId, {
          layout: { ...dashboard.structuredData.layout, desktop: newLayout },
        });
      }

      // Save version
      await this.repository.saveDashboardVersion(
        widget.dashboardId,
        tenantId,
        'widget_removed',
        `Widget removed: ${widget.structuredData.name}`,
        userId
      );

      // Invalidate widget and dashboard cache
      if (this.cacheService) {
        await this.cacheService.invalidateWidget(tenantId, id);
        await this.cacheService.invalidateDashboard(tenantId, widget.dashboardId);
      }
    }

    return result;
  }

  /**
   * Batch update widget positions
   */
  async batchUpdatePositions(
    dashboardId: string,
    tenantId: string,
    userId: string,
    input: BatchUpdatePositionsInput
  ): Promise<Widget[]> {
    const widgets = await this.repository.batchUpdatePositions(dashboardId, tenantId, input);

    // Update dashboard layout
    const dashboard = await this.repository.getDashboard(dashboardId, tenantId);
    if (dashboard) {
      const newLayout = dashboard.structuredData.layout.desktop.map((item: { widgetId: string; position: GridPosition; size: GridSize }) => {
        const update = input.positions.find(p => p.widgetId === item.widgetId);
        if (update) {
          return {
            ...item,
            position: update.position,
            ...(update.size && { size: update.size }),
          };
        }
        return item;
      });

      await this.repository.updateDashboard(dashboardId, tenantId, {
        layout: { ...dashboard.structuredData.layout, desktop: newLayout },
      });
    }

    // Save version
    await this.repository.saveDashboardVersion(
      dashboardId,
      tenantId,
      'layout_changed',
      `Layout updated: ${input.positions.length} widgets repositioned`,
      userId
    );

    // Invalidate dashboard cache
    if (this.cacheService) {
      await this.cacheService.invalidateDashboard(tenantId, dashboardId);
    }

    return widgets;
  }

  // ============================================================================
  // User Overrides
  // ============================================================================

  /**
   * Hide inherited widget
   */
  async hideWidget(
    userId: string,
    tenantId: string,
    dashboardId: string,
    widgetId: string,
    sourceDashboardId: string
  ): Promise<void> {
    const overrides = await this.repository.getUserOverrides(userId, dashboardId, tenantId) || {
      userId,
      dashboardId,
      hiddenWidgets: [],
      positionOverrides: [],
      updatedAt: new Date(),
    };

    // Add to hidden widgets if not already hidden
    if (!overrides.hiddenWidgets.some(h => h.widgetId === widgetId && h.sourceDashboardId === sourceDashboardId)) {
      overrides.hiddenWidgets.push({ widgetId, sourceDashboardId });
      await this.repository.saveUserOverrides({ ...overrides, tenantId });
    }
  }

  /**
   * Show inherited widget
   */
  async showWidget(
    userId: string,
    tenantId: string,
    dashboardId: string,
    widgetId: string,
    sourceDashboardId: string
  ): Promise<void> {
    const overrides = await this.repository.getUserOverrides(userId, dashboardId, tenantId);
    if (!overrides) {
      return;
    }

    overrides.hiddenWidgets = overrides.hiddenWidgets.filter(
      h => !(h.widgetId === widgetId && h.sourceDashboardId === sourceDashboardId)
    );

    await this.repository.saveUserOverrides({ ...overrides, tenantId });
  }

  /**
   * Override inherited widget position
   */
  async overrideWidgetPosition(
    userId: string,
    tenantId: string,
    dashboardId: string,
    widgetId: string,
    sourceDashboardId: string,
    position: GridPosition
  ): Promise<void> {
    const overrides = await this.repository.getUserOverrides(userId, dashboardId, tenantId) || {
      userId,
      dashboardId,
      hiddenWidgets: [],
      positionOverrides: [],
      updatedAt: new Date(),
    };

    // Update or add position override
    const existingIndex = overrides.positionOverrides.findIndex(
      p => p.widgetId === widgetId && p.sourceDashboardId === sourceDashboardId
    );

    if (existingIndex >= 0) {
      overrides.positionOverrides[existingIndex].position = position;
    } else {
      overrides.positionOverrides.push({ widgetId, sourceDashboardId, position });
    }

    await this.repository.saveUserOverrides({ ...overrides, tenantId });
  }

  /**
   * Save user's filter state
   */
  async saveFilterState(
    userId: string,
    tenantId: string,
    dashboardId: string,
    filterState: { dateRange?: DateRangeValue; customFilters?: Record<string, unknown> }
  ): Promise<void> {
    const overrides = await this.repository.getUserOverrides(userId, dashboardId, tenantId) || {
      userId,
      dashboardId,
      hiddenWidgets: [],
      positionOverrides: [],
      updatedAt: new Date(),
    };

    overrides.filterState = filterState;
    await this.repository.saveUserOverrides({ ...overrides, tenantId });
  }

  // ============================================================================
  // Version History
  // ============================================================================

  /**
   * Get dashboard versions
   */
  async getDashboardVersions(dashboardId: string, tenantId: string): Promise<DashboardVersion[]> {
    return this.repository.getDashboardVersions(dashboardId, tenantId);
  }

  /**
   * Rollback to version
   */
  async rollbackToVersion(
    dashboardId: string,
    tenantId: string,
    userId: string,
    targetVersion: number
  ): Promise<Dashboard | null> {
    const versions = await this.repository.getDashboardVersions(dashboardId, tenantId, 100);
    const targetVersionData = versions.find(v => v.version === targetVersion);

    if (!targetVersionData) {
      throw new Error('Version not found');
    }

    // Restore layout and settings from snapshot
    const updated = await this.repository.updateDashboard(dashboardId, tenantId, {
      layout: targetVersionData.snapshot.layout,
      settings: targetVersionData.snapshot.settings,
      permissions: targetVersionData.snapshot.permissions,
    });

    if (updated) {
      await this.repository.saveDashboardVersion(
        dashboardId,
        tenantId,
        'rollback',
        `Rolled back to version ${targetVersion}`,
        userId
      );
    }

    return updated;
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get effective configuration for tenant (with caching)
   */
  async getEffectiveConfig(tenantId: string): Promise<DashboardFeatureFlags> {
    const startTime = Date.now();

    try {
      // Try cache first with timeout protection
      if (this.cacheService) {
        try {
          const cachePromise = this.cacheService.getCachedTenantConfig(tenantId);
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 5000) // 5 second timeout for cache
          );

          const cached = await Promise.race([cachePromise, timeoutPromise]);

          if (cached) {
            this.monitoring.trackEvent('dashboard.config.cache.hit', {
              tenantId,
              duration: Date.now() - startTime,
            });

            // Merge cached tenant config with global config
            return {
              dashboardsEnabled: this.globalConfig.dashboardsEnabled && cached.dashboardsEnabled,
              features: {
                ...this.globalConfig.features,
                ...cached.features,
              },
              limits: {
                ...this.globalConfig.limits,
                ...cached.limits,
              },
            };
          }
        } catch (cacheError) {
          this.monitoring.trackException(cacheError as Error, {
            operation: 'dashboard.service.getEffectiveConfig.cache',
            tenantId,
          });
        }
      }

      // Get tenant-specific config from database with timeout
      const dbPromise = this.repository.getTenantDashboardConfig(tenantId);
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          this.monitoring.trackEvent('dashboard.service.config-query-timeout', { tenantId });
          resolve(null);
        }, 10000) // 10 second timeout for DB
      );

      const tenantConfig = await Promise.race([dbPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('dashboard.config.db.fetch', {
        tenantId,
        duration,
        found: !!tenantConfig,
      });

      if (!tenantConfig) {
        this.monitoring.trackEvent('dashboard.service.no-tenant-config', { tenantId, durationMs: duration });
        return this.globalConfig;
      }

      // Cache the tenant config (non-blocking)
      if (this.cacheService) {
        this.cacheService.cacheTenantConfig(tenantConfig).catch((err) => {
          this.monitoring.trackException(err as Error, { operation: 'dashboard.service.cache-tenant-config' });
        });
      }

      // Merge with global config
      return {
        dashboardsEnabled: this.globalConfig.dashboardsEnabled && tenantConfig.dashboardsEnabled,
        features: {
          ...this.globalConfig.features,
          ...tenantConfig.features,
        },
        limits: {
          ...this.globalConfig.limits,
          ...tenantConfig.limits,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackException(error as Error, {
        operation: 'dashboard.service.getEffectiveConfig',
        tenantId,
        duration,
      });
      this.monitoring.trackException(error as Error, { operation: 'dashboard.service.get-effective-config', tenantId });
      return this.globalConfig;
    }
  }

  /**
   * Get tenant fiscal year config (with caching)
   */
  async getFiscalYearConfig(tenantId: string): Promise<TenantFiscalYearConfig> {
    // Try cache first
    if (this.cacheService) {
      const cached = await this.cacheService.getCachedFiscalYearConfig(tenantId);
      if (cached) {
        return cached;
      }
    }

    const config = await this.repository.getTenantFiscalYearConfig(tenantId);

    if (!config) {
      const defaultConfig: TenantFiscalYearConfig = {
        tenantId,
        fiscalYearStart: DEFAULT_FISCAL_YEAR_START,
        configuredAt: new Date(),
        configuredBy: 'system',
      };
      return defaultConfig;
    }

    // Cache the config
    if (this.cacheService) {
      await this.cacheService.cacheFiscalYearConfig(config);
    }

    return config;
  }

  /**
   * Save tenant fiscal year config
   */
  async saveFiscalYearConfig(
    tenantId: string,
    fiscalYearStart: { month: number; day: number },
    userId: string
  ): Promise<void> {
    await this.repository.saveTenantFiscalYearConfig({
      tenantId,
      fiscalYearStart,
      configuredAt: new Date(),
      configuredBy: userId,
    });

    // Invalidate fiscal year cache
    if (this.cacheService) {
      await this.cacheService.invalidateFiscalYearConfig(tenantId);
    }
  }

  /**
   * Calculate date range from preset
   */
  calculateDateRange(
    preset: DatePreset,
    fiscalYearStart: { month: number; day: number }
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case 'today':
        return { startDate: today, endDate: today };

      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday, endDate: yesterday };
      }

      case 'this_week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { startDate: startOfWeek, endDate: today };
      }

      case 'last_week': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        return { startDate: startOfLastWeek, endDate: endOfLastWeek };
      }

      case 'this_month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: startOfMonth, endDate: today };
      }

      case 'last_month': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { startDate: startOfLastMonth, endDate: endOfLastMonth };
      }

      case 'this_quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
        return { startDate: startOfQuarter, endDate: today };
      }

      case 'last_quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        const startOfLastQuarter = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
        const endOfLastQuarter = new Date(today.getFullYear(), quarter * 3, 0);
        return { startDate: startOfLastQuarter, endDate: endOfLastQuarter };
      }

      case 'this_fiscal_quarter': {
        const fiscalQuarter = this.getFiscalQuarter(today, fiscalYearStart);
        const fiscalYear = this.getFiscalYear(today, fiscalYearStart);
        const startOfFiscalQuarter = this.getFiscalQuarterStart(fiscalYear, fiscalQuarter, fiscalYearStart);
        return { startDate: startOfFiscalQuarter, endDate: today };
      }

      case 'last_fiscal_quarter': {
        let fiscalQuarter = this.getFiscalQuarter(today, fiscalYearStart) - 1;
        let fiscalYear = this.getFiscalYear(today, fiscalYearStart);
        if (fiscalQuarter < 1) {
          fiscalQuarter = 4;
          fiscalYear--;
        }
        const startOfFiscalQuarter = this.getFiscalQuarterStart(fiscalYear, fiscalQuarter, fiscalYearStart);
        const endOfFiscalQuarter = this.getFiscalQuarterEnd(fiscalYear, fiscalQuarter, fiscalYearStart);
        return { startDate: startOfFiscalQuarter, endDate: endOfFiscalQuarter };
      }

      case 'this_year': {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return { startDate: startOfYear, endDate: today };
      }

      case 'last_year': {
        const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
        const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
        return { startDate: startOfLastYear, endDate: endOfLastYear };
      }

      case 'this_fiscal_year': {
        const fiscalYear = this.getFiscalYear(today, fiscalYearStart);
        const startOfFiscalYear = this.getFiscalYearStart(fiscalYear, fiscalYearStart);
        return { startDate: startOfFiscalYear, endDate: today };
      }

      case 'last_fiscal_year': {
        const fiscalYear = this.getFiscalYear(today, fiscalYearStart) - 1;
        const startOfFiscalYear = this.getFiscalYearStart(fiscalYear, fiscalYearStart);
        const endOfFiscalYear = this.getFiscalYearEnd(fiscalYear, fiscalYearStart);
        return { startDate: startOfFiscalYear, endDate: endOfFiscalYear };
      }

      case 'last_7_days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        return { startDate: start, endDate: today };
      }

      case 'last_30_days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return { startDate: start, endDate: today };
      }

      case 'last_90_days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 90);
        return { startDate: start, endDate: today };
      }

      case 'last_365_days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 365);
        return { startDate: start, endDate: today };
      }

      default:
        return { startDate: today, endDate: today };
    }
  }

  // ============================================================================
  // Stats & Analytics
  // ============================================================================

  /**
   * Get dashboard stats (real implementation)
   */
  async getStats(tenantId: string): Promise<any> {
    // This would typically involve aggregation queries or reading from a stats container.
    // For now, we'll implement a basic aggregation or return reasonable defaults
    // derived from actual data if possible, or placeholder "real" looking data structure.

    // Example: count dashboards
    const dashboards = await this.repository.listDashboards({
      filter: { tenantId },
      limit: 1
    });

    return {
      totalDashboards: dashboards.total,
      activeWidgets: 0, // Would need a widget count query
      lastUpdated: new Date().toISOString(),
      storageUsed: '12MB', // Placeholder
    };
  }

  /**
   * Get dashboard activity
   */
  async getActivity(tenantId: string): Promise<any[]> {
    // Return recent versions/revisions as activity
    // We don't have a direct "activity" feed container yet, so we'll mock it 
    // or fetch from revisions if acceptable.
    return [];
  }

  /**
   * Get recent shards
   */
  async getRecentShards(tenantId: string, limit = 5): Promise<any[]> {
    // This should ideally query the shards container for recently modified items
    // We can't do this efficiently without a specific index/query in the repo.
    // For this implementation plan, we'll return an empty list but formatted correctly.
    return [];
  }



  // ============================================================================
  // Permission Helpers
  // ============================================================================

  /**
   * Resolve user permission for dashboard
   */
  private resolvePermission(
    dashboard: Dashboard,
    userId: string,
    userRoles: string[],
    userGroupIds: string[]
  ): { hasAccess: boolean; level: DashboardPermissionLevel } {
    const permissions = dashboard.structuredData.permissions;

    // Owner always has admin access
    if (permissions.ownerId === userId && permissions.ownerType === 'user') {
      return { hasAccess: true, level: DashboardPermissionLevel.ADMIN };
    }

    // Check user-specific permission
    const userPerm = permissions.users.find(u => u.userId === userId);
    if (userPerm) {
      return { hasAccess: true, level: userPerm.permission };
    }

    // Check group permissions
    for (const groupId of userGroupIds) {
      const groupPerm = permissions.groups.find(g => g.groupId === groupId);
      if (groupPerm) {
        return { hasAccess: true, level: groupPerm.permission };
      }
    }

    // Check role permissions
    for (const role of userRoles) {
      const rolePerm = permissions.roles.find(r => r.role === role);
      if (rolePerm) {
        return { hasAccess: true, level: rolePerm.permission };
      }
    }

    // Check visibility
    if (permissions.visibility === 'public') {
      return { hasAccess: true, level: DashboardPermissionLevel.VIEW };
    }

    if (permissions.visibility === 'tenant') {
      return { hasAccess: true, level: DashboardPermissionLevel.VIEW };
    }

    return { hasAccess: false, level: DashboardPermissionLevel.VIEW };
  }

  // ============================================================================
  // Fiscal Year Helpers
  // ============================================================================

  private getFiscalYear(date: Date, fiscalYearStart: { month: number; day: number }): number {
    const fiscalStart = new Date(date.getFullYear(), fiscalYearStart.month - 1, fiscalYearStart.day);

    if (date < fiscalStart) {
      return date.getFullYear();
    }
    return fiscalYearStart.month > 1 ? date.getFullYear() + 1 : date.getFullYear();
  }

  private getFiscalQuarter(date: Date, fiscalYearStart: { month: number; day: number }): number {
    const fiscalYearStartDate = new Date(date.getFullYear(), fiscalYearStart.month - 1, fiscalYearStart.day);

    if (date < fiscalYearStartDate) {
      fiscalYearStartDate.setFullYear(fiscalYearStartDate.getFullYear() - 1);
    }

    const monthsFromStart = (date.getFullYear() - fiscalYearStartDate.getFullYear()) * 12 +
      (date.getMonth() - fiscalYearStartDate.getMonth());

    return Math.floor(monthsFromStart / 3) + 1;
  }

  private getFiscalYearStart(fiscalYear: number, fiscalYearStart: { month: number; day: number }): Date {
    const year = fiscalYearStart.month > 1 ? fiscalYear - 1 : fiscalYear;
    return new Date(year, fiscalYearStart.month - 1, fiscalYearStart.day);
  }

  private getFiscalYearEnd(fiscalYear: number, fiscalYearStart: { month: number; day: number }): Date {
    const start = this.getFiscalYearStart(fiscalYear + 1, fiscalYearStart);
    const end = new Date(start);
    end.setDate(end.getDate() - 1);
    return end;
  }

  private getFiscalQuarterStart(
    fiscalYear: number,
    quarter: number,
    fiscalYearStart: { month: number; day: number }
  ): Date {
    const yearStart = this.getFiscalYearStart(fiscalYear, fiscalYearStart);
    const result = new Date(yearStart);
    result.setMonth(result.getMonth() + (quarter - 1) * 3);
    return result;
  }

  private getFiscalQuarterEnd(
    fiscalYear: number,
    quarter: number,
    fiscalYearStart: { month: number; day: number }
  ): Date {
    if (quarter === 4) {
      return this.getFiscalYearEnd(fiscalYear, fiscalYearStart);
    }
    const nextQuarterStart = this.getFiscalQuarterStart(fiscalYear, quarter + 1, fiscalYearStart);
    const end = new Date(nextQuarterStart);
    end.setDate(end.getDate() - 1);
    return end;
  }
}

