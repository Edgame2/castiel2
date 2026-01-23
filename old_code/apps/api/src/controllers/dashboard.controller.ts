/**
 * Dashboard Controller
 * Handles all REST API operations for Dashboards and Widgets
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { DashboardService } from '../services/dashboard.service.js';
import { DashboardCacheService } from '../services/dashboard-cache.service.js';
import {
  DashboardType,
  CreateDashboardInput,
  UpdateDashboardInput,
  DashboardListOptions,
  DashboardListResult,
  DatePreset,
} from '../types/dashboard.types.js';
import {
  WidgetType,
  CreateWidgetInput,
  UpdateWidgetInput,
  BatchUpdatePositionsInput,
} from '../types/widget.types.js';
import { AuthUser } from '../types/auth.types.js';



/**
 * Dashboard Controller
 */
export class DashboardController {
  private service: DashboardService;
  private monitoring: IMonitoringProvider;

  constructor(monitoring: IMonitoringProvider, cacheService?: DashboardCacheService) {
    this.monitoring = monitoring;
    this.service = new DashboardService(monitoring, cacheService);
  }

  // ============================================================================
  // Dashboard CRUD
  // ============================================================================

  /**
   * POST /api/dashboards
   * Create a new dashboard
   */
  createDashboard = async (
    req: FastifyRequest<{ Body: CreateDashboardInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { name, description, icon, color, templateId, context, filters, settings } = req.body;

      if (!name) {
        reply.status(400).send({ error: 'Name is required' });
        return;
      }

      this.monitoring.trackEvent('dashboard.create.start', {
        tenantId,
        userId,
        name,
      });

      const dashboard = await this.service.createDashboard({
        tenantId,
        userId,
        name,
        description,
        icon,
        color,
        templateId,
        context,
        filters,
        settings,
      });

      const duration = Date.now() - startTime;
      this.monitoring.trackEvent('dashboard.create.completed', {
        dashboardId: dashboard.id,
        tenantId,
        duration,
      });

      this.monitoring.trackEvent('dashboard.created.api', {
        dashboardId: dashboard.id,
        tenantId,
        duration,
      });

      reply.status(201).send(dashboard);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      // Error already tracked via trackException below

      this.monitoring.trackException(error, {
        operation: 'dashboard.create',
        tenantId: req.auth?.tenantId,
      });
      reply.status(error.message?.includes('disabled') ? 403 : 500).send({
        error: error.message || 'Failed to create dashboard',
      });
    }
  };

  /**
   * GET /api/dashboards
   * List dashboards
   */
  listDashboards = async (
    req: FastifyRequest<{
      Querystring: {
        type?: string;
        isDefault?: string;
        isTemplate?: string;
        search?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      this.monitoring.trackEvent('dashboard.list.start', {
        tenantId,
        userId,
        query: JSON.stringify(req.query),
      });

      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { type, isDefault, isTemplate, search, limit, offset } = req.query;

      const options: DashboardListOptions = {
        filter: {
          tenantId,
          userId,
          dashboardType: type as DashboardType,
          isDefault: isDefault === 'true' ? true : isDefault === 'false' ? false : undefined,
          isTemplate: isTemplate === 'true' ? true : isTemplate === 'false' ? false : undefined,
          search,
        },
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      };

      // Add timeout protection
      const listPromise = this.service.listDashboards(options);
      const timeoutPromise = new Promise<DashboardListResult>((resolve) =>
        setTimeout(() => {
          this.monitoring.trackException(new Error('listDashboards timeout after 20s'), {
            operation: 'dashboard.list',
            tenantId,
            timeout: true,
          });
          resolve({ dashboards: [], total: 0, hasMore: false });
        }, 20000)
      );

      const result = await Promise.race([listPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      this.monitoring.trackEvent('dashboard.list.completed', {
        tenantId,
        userId,
        duration,
        count: result.dashboards.length,
      });

      this.monitoring.trackEvent('dashboard.list.api', {
        tenantId,
        count: result.dashboards.length,
        duration,
      });

      reply.send(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      // Error already tracked via trackException below

      this.monitoring.trackException(error, {
        operation: 'dashboard.list',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to list dashboards' });
    }
  };

  /**
   * GET /api/dashboards/merged
   * Get merged dashboard for user
   */
  getMergedDashboard = async (
    req: FastifyRequest<{
      Querystring: {
        dashboardId?: string;
        shardId?: string;
        datePreset?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { dashboardId, shardId, datePreset } = req.query;

      const context = shardId ? { shardId } : undefined;
      const filters = datePreset
        ? { dateRange: { preset: datePreset as DatePreset } }
        : undefined;

      const merged = await this.service.getMergedDashboard(
        userId,
        tenantId,
        dashboardId,
        context,
        filters
      );

      this.monitoring.trackEvent('dashboard.merged.api', {
        tenantId,
        dashboardId: merged.primaryDashboardId,
        widgetCount: merged.widgets.length,
        duration: Date.now() - startTime,
      });

      reply.send(merged);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.merged',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get merged dashboard' });
    }
  };

  /**
   * GET /api/dashboards/:id/full
   * Get dashboard with all widgets in a single optimized call
   */
  getDashboardWithWidgets = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const result = await this.service.getDashboardWithWidgets(id, tenantId, userId);

      if (!result) {
        reply.status(404).send({ error: 'Dashboard not found' });
        return;
      }

      this.monitoring.trackEvent('dashboard.getFull.api', {
        dashboardId: id,
        tenantId,
        widgetCount: result.widgets.length,
        duration: Date.now() - startTime,
      });

      reply.send(result);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }
      this.monitoring.trackException(error, {
        operation: 'dashboard.getFull',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get dashboard' });
    }
  };

  /**
   * GET /api/dashboards/:id
   * Get dashboard by ID
   */
  getDashboard = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const dashboard = await this.service.getDashboard(id, tenantId, userId);

      if (!dashboard) {
        reply.status(404).send({ error: 'Dashboard not found' });
        return;
      }

      this.monitoring.trackEvent('dashboard.get.api', {
        dashboardId: id,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.send(dashboard);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }
      this.monitoring.trackException(error, {
        operation: 'dashboard.get',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get dashboard' });
    }
  };

  /**
   * PATCH /api/dashboards/:id
   * Update dashboard
   */
  updateDashboard = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateDashboardInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const input: UpdateDashboardInput = req.body;

      const dashboard = await this.service.updateDashboard(id, tenantId, userId, input);

      if (!dashboard) {
        reply.status(404).send({ error: 'Dashboard not found' });
        return;
      }

      this.monitoring.trackEvent('dashboard.update.api', {
        dashboardId: id,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.send(dashboard);
    } catch (error: any) {
      if (error.message === 'Permission denied') {
        reply.status(403).send({ error: 'Permission denied' });
        return;
      }
      this.monitoring.trackException(error, {
        operation: 'dashboard.update',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to update dashboard' });
    }
  };

  /**
   * DELETE /api/dashboards/:id
   * Delete dashboard
   */
  deleteDashboard = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const result = await this.service.deleteDashboard(id, tenantId, userId);

      if (!result) {
        reply.status(404).send({ error: 'Dashboard not found' });
        return;
      }

      this.monitoring.trackEvent('dashboard.delete.api', {
        dashboardId: id,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'Permission denied') {
        reply.status(403).send({ error: 'Permission denied' });
        return;
      }
      this.monitoring.trackException(error, {
        operation: 'dashboard.delete',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to delete dashboard' });
    }
  };

  /**
   * POST /api/dashboards/:id/duplicate
   * Duplicate dashboard
   */
  duplicateDashboard = async (
    req: FastifyRequest<{ Params: { id: string }; Body: { name: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        reply.status(400).send({ error: 'Name is required' });
        return;
      }

      const dashboard = await this.service.duplicateDashboard(id, tenantId, userId, name);

      this.monitoring.trackEvent('dashboard.duplicate.api', {
        sourceDashboardId: id,
        newDashboardId: dashboard.id,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.status(201).send(dashboard);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.duplicate',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to duplicate dashboard' });
    }
  };

  /**
   * POST /api/dashboards/:id/set-default
   * Set dashboard as default
   */
  setAsDefault = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const dashboard = await this.service.setAsDefault(id, tenantId, userId);

      if (!dashboard) {
        reply.status(404).send({ error: 'Dashboard not found' });
        return;
      }

      this.monitoring.trackEvent('dashboard.setDefault.api', {
        dashboardId: id,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.send(dashboard);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.setDefault',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to set dashboard as default' });
    }
  };

  // ============================================================================
  // Widget CRUD
  // ============================================================================

  /**
   * GET /api/dashboards/:id/widgets
   * Get widgets for dashboard
   */
  getWidgets = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      // Verify dashboard access
      await this.service.getDashboard(id, tenantId, userId);

      const widgets = await this.service.getWidgetsByDashboard(id, tenantId);

      this.monitoring.trackEvent('widget.list.api', {
        dashboardId: id,
        count: widgets.length,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.send(widgets);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }
      this.monitoring.trackException(error, {
        operation: 'widget.list',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get widgets' });
    }
  };

  /**
   * POST /api/dashboards/:id/widgets
   * Create widget
   */
  createWidget = async (
    req: FastifyRequest<{ Params: { id: string }; Body: CreateWidgetInput }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id: dashboardId } = req.params;
      const {
        name,
        description,
        icon,
        widgetType,
        config,
        dataSource,
        position,
        size,
        refreshInterval,
      } = req.body;

      if (!name || !widgetType || !position || !size) {
        reply.status(400).send({ error: 'Name, widgetType, position, and size are required' });
        return;
      }

      const widget = await this.service.createWidget({
        dashboardId,
        tenantId,
        userId,
        name,
        description,
        icon,
        widgetType,
        config,
        dataSource: dataSource || {
          type: 'predefined',
          useContext: false,
          useDateFilter: false,
          allowUserFilters: true,
        },
        position,
        size,
        refreshInterval,
      });

      this.monitoring.trackEvent('widget.create.api', {
        widgetId: widget.id,
        dashboardId,
        widgetType,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.status(201).send(widget);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'widget.create',
        tenantId: req.auth?.tenantId,
      });
      reply.status(error.message?.includes('Maximum') ? 400 : 500).send({
        error: error.message || 'Failed to create widget',
      });
    }
  };

  /**
   * PATCH /api/dashboards/:id/widgets/:widgetId
   * Update widget
   */
  updateWidget = async (
    req: FastifyRequest<{
      Params: { id: string; widgetId: string };
      Body: UpdateWidgetInput;
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { widgetId } = req.params;
      const input: UpdateWidgetInput = req.body;

      const widget = await this.service.updateWidget(widgetId, tenantId, userId, input);

      if (!widget) {
        reply.status(404).send({ error: 'Widget not found' });
        return;
      }

      this.monitoring.trackEvent('widget.update.api', {
        widgetId,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.send(widget);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'widget.update',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to update widget' });
    }
  };

  /**
   * DELETE /api/dashboards/:id/widgets/:widgetId
   * Delete widget
   */
  deleteWidget = async (
    req: FastifyRequest<{ Params: { id: string; widgetId: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { widgetId } = req.params;
      const result = await this.service.deleteWidget(widgetId, tenantId, userId);

      if (!result) {
        reply.status(404).send({ error: 'Widget not found' });
        return;
      }

      this.monitoring.trackEvent('widget.delete.api', {
        widgetId,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.status(204).send();
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'widget.delete',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to delete widget' });
    }
  };

  /**
   * PATCH /api/dashboards/:id/widgets/reorder
   * Batch update widget positions
   */
  reorderWidgets = async (
    req: FastifyRequest<{
      Params: { id: string };
      Body: BatchUpdatePositionsInput;
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id: dashboardId } = req.params;
      const { positions } = req.body;

      if (!positions || !Array.isArray(positions)) {
        reply.status(400).send({ error: 'Positions array is required' });
        return;
      }

      const widgets = await this.service.batchUpdatePositions(
        dashboardId,
        tenantId,
        userId,
        { positions }
      );

      this.monitoring.trackEvent('widget.reorder.api', {
        dashboardId,
        count: positions.length,
        tenantId,
        duration: Date.now() - startTime,
      });

      reply.send(widgets);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'widget.reorder',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to reorder widgets' });
    }
  };

  // ============================================================================
  // User Overrides
  // ============================================================================

  /**
   * POST /api/dashboards/:id/widgets/:widgetId/hide
   * Hide inherited widget
   */
  hideWidget = async (
    req: FastifyRequest<{
      Params: { id: string; widgetId: string };
      Body: { sourceDashboardId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id: dashboardId, widgetId } = req.params;
      const { sourceDashboardId } = req.body;

      await this.service.hideWidget(userId, tenantId, dashboardId, widgetId, sourceDashboardId);
      reply.status(204).send();
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'widget.hide',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to hide widget' });
    }
  };

  /**
   * POST /api/dashboards/:id/widgets/:widgetId/show
   * Show hidden inherited widget
   */
  showWidget = async (
    req: FastifyRequest<{
      Params: { id: string; widgetId: string };
      Body: { sourceDashboardId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id: dashboardId, widgetId } = req.params;
      const { sourceDashboardId } = req.body;

      await this.service.showWidget(userId, tenantId, dashboardId, widgetId, sourceDashboardId);
      reply.status(204).send();
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'widget.show',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to show widget' });
    }
  };

  // ============================================================================
  // Version History
  // ============================================================================

  // ============================================================================
  // Stats & Activity
  // ============================================================================

  /**
   * GET /api/dashboard/stats
   * Get dashboard stats
   */
  getStats = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const { tenantId } = (req.auth as any) || {};
      if (!tenantId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const stats = await this.service.getStats(tenantId);
      reply.send(stats);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.stats',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get stats' });
    }
  };

  /**
   * GET /api/dashboard/activity
   * Get dashboard activity
   */
  getActivity = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const { tenantId } = (req.auth as any) || {};
      if (!tenantId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const activity = await this.service.getActivity(tenantId);
      reply.send(activity);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.activity',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get activity' });
    }
  };

  /**
   * GET /api/dashboard/recent-shards
   * Get recent shards
   */
  getRecentShards = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const { tenantId } = (req.auth as any) || {};
      if (!tenantId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const recent = await this.service.getRecentShards(tenantId);
      reply.send(recent);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.recentShards',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get recent shards' });
    }
  };

  // ============================================================================
  // Version History
  // ============================================================================

  /**
   * GET /api/dashboards/:id/versions
   * Get dashboard version history
   */
  getVersions = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const versions = await this.service.getDashboardVersions(id, tenantId);

      reply.send(versions);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.versions',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get versions' });
    }
  };

  /**
   * POST /api/dashboards/:id/versions/:version/rollback
   * Rollback to specific version
   */
  rollbackToVersion = async (
    req: FastifyRequest<{ Params: { id: string; version: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { id, version } = req.params;
      const targetVersion = parseInt(version, 10);

      if (isNaN(targetVersion)) {
        reply.status(400).send({ error: 'Invalid version number' });
        return;
      }

      const dashboard = await this.service.rollbackToVersion(id, tenantId, userId, targetVersion);

      if (!dashboard) {
        reply.status(404).send({ error: 'Dashboard or version not found' });
        return;
      }

      reply.send(dashboard);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.rollback',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to rollback' });
    }
  };

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * GET /api/v1/dashboards/config
   * Get tenant dashboard configuration
   */
  getTenantDashboardConfig = async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = (req.auth as any) || {};
      if (!tenantId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const config = await this.service.getEffectiveConfig(tenantId);
      reply.send(config);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dashboard.config.get',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get dashboard config' });
    }
  };

  /**
   * GET /api/tenant/fiscal-year
   * Get tenant fiscal year config
   */
  getFiscalYearConfig = async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId } = (req.auth as any) || {};
      if (!tenantId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const config = await this.service.getFiscalYearConfig(tenantId);
      reply.send(config);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'fiscalYear.get',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to get fiscal year config' });
    }
  };

  /**
   * PATCH /api/tenant/fiscal-year
   * Update tenant fiscal year config
   */
  updateFiscalYearConfig = async (
    req: FastifyRequest<{ Body: { fiscalYearStart: { month: number; day: number } } }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { tenantId, id: userId } = (req.auth as any) || {};
      if (!tenantId || !userId) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const { fiscalYearStart } = req.body;

      if (!fiscalYearStart || !fiscalYearStart.month || !fiscalYearStart.day) {
        reply.status(400).send({ error: 'fiscalYearStart with month and day is required' });
        return;
      }

      if (fiscalYearStart.month < 1 || fiscalYearStart.month > 12) {
        reply.status(400).send({ error: 'Month must be between 1 and 12' });
        return;
      }

      if (fiscalYearStart.day < 1 || fiscalYearStart.day > 31) {
        reply.status(400).send({ error: 'Day must be between 1 and 31' });
        return;
      }

      await this.service.saveFiscalYearConfig(tenantId, fiscalYearStart, userId);
      const config = await this.service.getFiscalYearConfig(tenantId);

      reply.send(config);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'fiscalYear.update',
        tenantId: req.auth?.tenantId,
      });
      reply.status(500).send({ error: 'Failed to update fiscal year config' });
    }
  };
}

