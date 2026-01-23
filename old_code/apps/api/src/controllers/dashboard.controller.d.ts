/**
 * Dashboard Controller
 * Handles all REST API operations for Dashboards and Widgets
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { DashboardCacheService } from '../services/dashboard-cache.service.js';
import { CreateDashboardInput, UpdateDashboardInput } from '../types/dashboard.types.js';
import { CreateWidgetInput, UpdateWidgetInput, BatchUpdatePositionsInput } from '../types/widget.types.js';
/**
 * Dashboard Controller
 */
export declare class DashboardController {
    private service;
    private monitoring;
    constructor(monitoring: IMonitoringProvider, cacheService?: DashboardCacheService);
    /**
     * POST /api/dashboards
     * Create a new dashboard
     */
    createDashboard: (req: FastifyRequest<{
        Body: CreateDashboardInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboards
     * List dashboards
     */
    listDashboards: (req: FastifyRequest<{
        Querystring: {
            type?: string;
            isDefault?: string;
            isTemplate?: string;
            search?: string;
            limit?: string;
            offset?: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboards/merged
     * Get merged dashboard for user
     */
    getMergedDashboard: (req: FastifyRequest<{
        Querystring: {
            dashboardId?: string;
            shardId?: string;
            datePreset?: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboards/:id/full
     * Get dashboard with all widgets in a single optimized call
     */
    getDashboardWithWidgets: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboards/:id
     * Get dashboard by ID
     */
    getDashboard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/dashboards/:id
     * Update dashboard
     */
    updateDashboard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: UpdateDashboardInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/dashboards/:id
     * Delete dashboard
     */
    deleteDashboard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/dashboards/:id/duplicate
     * Duplicate dashboard
     */
    duplicateDashboard: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: {
            name: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/dashboards/:id/set-default
     * Set dashboard as default
     */
    setAsDefault: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboards/:id/widgets
     * Get widgets for dashboard
     */
    getWidgets: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/dashboards/:id/widgets
     * Create widget
     */
    createWidget: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: CreateWidgetInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/dashboards/:id/widgets/:widgetId
     * Update widget
     */
    updateWidget: (req: FastifyRequest<{
        Params: {
            id: string;
            widgetId: string;
        };
        Body: UpdateWidgetInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/dashboards/:id/widgets/:widgetId
     * Delete widget
     */
    deleteWidget: (req: FastifyRequest<{
        Params: {
            id: string;
            widgetId: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/dashboards/:id/widgets/reorder
     * Batch update widget positions
     */
    reorderWidgets: (req: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: BatchUpdatePositionsInput;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/dashboards/:id/widgets/:widgetId/hide
     * Hide inherited widget
     */
    hideWidget: (req: FastifyRequest<{
        Params: {
            id: string;
            widgetId: string;
        };
        Body: {
            sourceDashboardId: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/dashboards/:id/widgets/:widgetId/show
     * Show hidden inherited widget
     */
    showWidget: (req: FastifyRequest<{
        Params: {
            id: string;
            widgetId: string;
        };
        Body: {
            sourceDashboardId: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboard/stats
     * Get dashboard stats
     */
    getStats: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboard/activity
     * Get dashboard activity
     */
    getActivity: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboard/recent-shards
     * Get recent shards
     */
    getRecentShards: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/dashboards/:id/versions
     * Get dashboard version history
     */
    getVersions: (req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/dashboards/:id/versions/:version/rollback
     * Rollback to specific version
     */
    rollbackToVersion: (req: FastifyRequest<{
        Params: {
            id: string;
            version: string;
        };
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/dashboards/config
     * Get tenant dashboard configuration
     */
    getTenantDashboardConfig: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/tenant/fiscal-year
     * Get tenant fiscal year config
     */
    getFiscalYearConfig: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/tenant/fiscal-year
     * Update tenant fiscal year config
     */
    updateFiscalYearConfig: (req: FastifyRequest<{
        Body: {
            fiscalYearStart: {
                month: number;
                day: number;
            };
        };
    }>, reply: FastifyReply) => Promise<void>;
}
//# sourceMappingURL=dashboard.controller.d.ts.map