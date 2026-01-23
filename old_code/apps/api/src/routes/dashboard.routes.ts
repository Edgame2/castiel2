/**
 * Dashboard Routes
 * API routes for dashboard and widget management
 */

import type { FastifyInstance } from 'fastify';
import { MonitoringService } from '@castiel/monitoring';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { DashboardCacheService } from '../services/dashboard-cache.service.js';
import { CacheService } from '../services/cache.service.js';
import { CacheSubscriberService } from '../services/cache-subscriber.service.js';
import { requireAuth } from '../middleware/authorization.js';

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // Get monitoring singleton
  const monitoring = MonitoringService.getInstance() || MonitoringService.initialize({
    enabled: false,
    provider: 'mock',
  });

  // Initialize cache service if Redis is available
  let dashboardCacheService: DashboardCacheService | undefined;
  const cacheService = (fastify as any).cache as CacheService | undefined;
  const cacheSubscriber = (fastify as any).cacheSubscriber as CacheSubscriberService | undefined;

  if (cacheService && cacheSubscriber) {
    dashboardCacheService = new DashboardCacheService(
      cacheService,
      cacheSubscriber,
      monitoring
    );
    fastify.log.info('✅ Dashboard cache service initialized with Redis');
  } else {
    fastify.log.warn('⚠️  Dashboard cache service unavailable (Redis not connected)');
  }

  const controller = new DashboardController(monitoring, dashboardCacheService);

  // ============================================================================
  // Dashboard Stats & Activity Routes (for homepage)
  // ============================================================================

  // Get dashboard stats
  fastify.get(
    '/dashboard/stats',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboard'],
        summary: 'Get dashboard statistics',
        response: {
          200: {
            type: 'object',
            properties: {
              totalShards: { type: 'number' },
              publicShards: { type: 'number' },
              privateShards: { type: 'number' },
              totalUsers: { type: 'number' },
              recentActivity: {
                type: 'object',
                properties: {
                  shardsCreatedToday: { type: 'number' },
                  shardsUpdatedToday: { type: 'number' },
                },
              },
              trends: {
                type: 'object',
                properties: {
                  shards: { type: 'number' },
                  users: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    controller.getStats
  );

  // Get recent activity
  fastify.get(
    '/dashboard/activity',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboard'],
        summary: 'Get recent activity feed',
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    avatar: { type: 'string' },
                  },
                },
                timestamp: { type: 'string' },
                metadata: { type: 'object' },
              },
            },
          },
        },
      },
    },
    controller.getActivity
  );

  // Get recent shards
  fastify.get(
    '/dashboard/recent-shards',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboard'],
        summary: 'Get recently modified shards',
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                type: { type: 'string' },
                typeName: { type: 'string' },
                status: { type: 'string' },
                updatedAt: { type: 'string' },
                updatedBy: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.getRecentShards
  );

  // ============================================================================
  // Dashboard Routes
  // ============================================================================

  // Get tenant dashboard config
  fastify.get(
    '/dashboards/config',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Get tenant dashboard configuration',
        response: {
          200: {
            type: 'object',
            properties: {
              dashboardsEnabled: { type: 'boolean' },
              features: { type: 'object' },
              limits: { type: 'object' },
            },
          },
        },
      },
    },
    controller.getTenantDashboardConfig
  );

  // List dashboards
  fastify.get(
    '/dashboards',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'List dashboards',
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['system', 'tenant', 'user'] },
            isDefault: { type: 'string', enum: ['true', 'false'] },
            isTemplate: { type: 'string', enum: ['true', 'false'] },
            search: { type: 'string' },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              dashboards: { type: 'array' },
              total: { type: 'number' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
    },
    controller.listDashboards
  );

  // Get merged dashboard
  fastify.get(
    '/dashboards/merged',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Get merged dashboard for user',
        querystring: {
          type: 'object',
          properties: {
            dashboardId: { type: 'string' },
            shardId: { type: 'string' },
            datePreset: { type: 'string' },
          },
        },
      },
    },
    controller.getMergedDashboard
  );

  // Create dashboard
  fastify.post(
    '/dashboards',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Create a new dashboard',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            color: { type: 'string' },
            templateId: { type: 'string' },
            context: { type: 'object' },
            filters: { type: 'object' },
            settings: { type: 'object' },
          },
        },
      },
    },
    controller.createDashboard
  );

  // Get dashboard by ID
  fastify.get(
    '/dashboards/:id',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Get dashboard by ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.getDashboard
  );

  // Get dashboard with widgets (full)
  fastify.get(
    '/dashboards/:id/full',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Get dashboard by ID with all widgets included',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.getDashboardWithWidgets
  );

  // Update dashboard
  fastify.patch(
    '/dashboards/:id',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Update dashboard',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            color: { type: 'string' },
            isDefault: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            context: { type: 'object' },
            filters: { type: 'object' },
            settings: { type: 'object' },
            permissions: { type: 'object' },
            layout: { type: 'object' },
          },
        },
      },
    },
    controller.updateDashboard
  );

  // Delete dashboard
  fastify.delete(
    '/dashboards/:id',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Delete dashboard',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.deleteDashboard
  );

  // Duplicate dashboard
  fastify.post(
    '/dashboards/:id/duplicate',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Duplicate dashboard',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
          },
        },
      },
    },
    controller.duplicateDashboard
  );

  // Set as default
  fastify.post(
    '/dashboards/:id/set-default',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Set dashboard as default',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.setAsDefault
  );

  // ============================================================================
  // Widget Routes
  // ============================================================================

  // Get widgets for dashboard
  fastify.get(
    '/dashboards/:id/widgets',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['widgets'],
        summary: 'Get widgets for dashboard',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.getWidgets
  );

  // Create widget
  fastify.post(
    '/dashboards/:id/widgets',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['widgets'],
        summary: 'Create widget',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'widgetType', 'position', 'size'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            widgetType: { type: 'string' },
            config: { type: 'object' },
            dataSource: { type: 'object' },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
            },
            size: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            refreshInterval: { type: 'number' },
          },
        },
      },
    },
    controller.createWidget
  );

  // Update widget
  fastify.patch(
    '/dashboards/:id/widgets/:widgetId',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['widgets'],
        summary: 'Update widget',
        params: {
          type: 'object',
          required: ['id', 'widgetId'],
          properties: {
            id: { type: 'string' },
            widgetId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            config: { type: 'object' },
            dataSource: { type: 'object' },
            position: { type: 'object' },
            size: { type: 'object' },
            refreshInterval: { type: 'number' },
          },
        },
      },
    },
    controller.updateWidget
  );

  // Delete widget
  fastify.delete(
    '/dashboards/:id/widgets/:widgetId',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['widgets'],
        summary: 'Delete widget',
        params: {
          type: 'object',
          required: ['id', 'widgetId'],
          properties: {
            id: { type: 'string' },
            widgetId: { type: 'string' },
          },
        },
      },
    },
    controller.deleteWidget
  );

  // Reorder widgets
  fastify.patch(
    '/dashboards/:id/widgets/reorder',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['widgets'],
        summary: 'Batch update widget positions',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['positions'],
          properties: {
            positions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  widgetId: { type: 'string' },
                  position: { type: 'object' },
                  size: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    controller.reorderWidgets
  );

  // Hide inherited widget
  fastify.post(
    '/dashboards/:id/widgets/:widgetId/hide',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['widgets'],
        summary: 'Hide inherited widget',
        params: {
          type: 'object',
          required: ['id', 'widgetId'],
          properties: {
            id: { type: 'string' },
            widgetId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['sourceDashboardId'],
          properties: {
            sourceDashboardId: { type: 'string' },
          },
        },
      },
    },
    controller.hideWidget
  );

  // Show hidden inherited widget
  fastify.post(
    '/dashboards/:id/widgets/:widgetId/show',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['widgets'],
        summary: 'Show hidden inherited widget',
        params: {
          type: 'object',
          required: ['id', 'widgetId'],
          properties: {
            id: { type: 'string' },
            widgetId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['sourceDashboardId'],
          properties: {
            sourceDashboardId: { type: 'string' },
          },
        },
      },
    },
    controller.showWidget
  );

  // ============================================================================
  // Version Routes
  // ============================================================================

  // Get dashboard versions
  fastify.get(
    '/dashboards/:id/versions',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Get dashboard version history',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    controller.getVersions
  );

  // Rollback to version
  fastify.post(
    '/dashboards/:id/versions/:version/rollback',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['dashboards'],
        summary: 'Rollback to specific version',
        params: {
          type: 'object',
          required: ['id', 'version'],
          properties: {
            id: { type: 'string' },
            version: { type: 'string' },
          },
        },
      },
    },
    controller.rollbackToVersion
  );

  // ============================================================================
  // Configuration Routes
  // ============================================================================

  // Get fiscal year config
  fastify.get(
    '/tenant/fiscal-year',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['configuration'],
        summary: 'Get tenant fiscal year configuration',
      },
    },
    controller.getFiscalYearConfig
  );

  // Update fiscal year config
  fastify.patch(
    '/tenant/fiscal-year',
    {
      // Authentication handled by global hook
      schema: {
        tags: ['configuration'],
        summary: 'Update tenant fiscal year configuration',
        body: {
          type: 'object',
          required: ['fiscalYearStart'],
          properties: {
            fiscalYearStart: {
              type: 'object',
              required: ['month', 'day'],
              properties: {
                month: { type: 'number', minimum: 1, maximum: 12 },
                day: { type: 'number', minimum: 1, maximum: 31 },
              },
            },
          },
        },
      },
    },
    controller.updateFiscalYearConfig
  );
}

